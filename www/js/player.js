// player.js - library, queue, playback, likes/playlists, and the real-beat listener
import { kv, songDB } from "./store.js";
import { readTags } from "./tags.js";
import { classify, genreMood } from "./behavior.js";
import * as N from "./native.js";

export class BeatTracker {
  constructor() { this.reset(); }
  reset() {
    this.prev = null; this.fluxAvg = 0; this.lastBeat = 0; this.intervals = []; this.bpm = 0; this.energy = 0; this.level = 0;
    this.peak = 0.05; this.t0 = 0; this.eAcc = 0; this.eN = 0; this.beat = false; this.beats = 0;
  }
  feed(freq, now) {                     // freq: Uint8Array from analyser.getByteFrequencyData (fft 1024 -> bin ~ 21.5Hz at 44.1k)
    const n = freq.length, low = Math.min(n, 14);
    let flux = 0, lo = 0, all = 0;
    for (let i = 1; i < low; i++) { const v = freq[i] / 255; lo += v; if (this.prev) { const d = v - this.prev[i]; if (d > 0) flux += d; } }
    for (let i = 1; i < n; i++) all += freq[i] / 255;
    lo /= (low - 1); all /= (n - 1);
    this.prev = Float32Array.from({ length: low }, (_, i) => freq[i] / 255);
    this.peak = Math.max(this.peak * 0.995, lo, 0.05);
    this.level += (Math.min(1, lo / this.peak) - this.level) * 0.5;
    this.eAcc += all; this.eN++;
    this.energy = this.eN ? this.eAcc / this.eN * 1.9 : 0;   // rough loudness 0..1
    this.fluxAvg = this.fluxAvg * 0.94 + flux * 0.06;
    this.beat = false;
    if (flux > this.fluxAvg * 1.6 + 0.12 && now - this.lastBeat > 0.26) {
      if (this.lastBeat) {
        let iv = now - this.lastBeat; while (iv < 0.4) iv *= 2; while (iv > 0.9) iv /= 2;
        this.intervals.push(iv); if (this.intervals.length > 24) this.intervals.shift();
        const s = [...this.intervals].sort((a, b) => a - b); this.bpm = 60 / s[s.length >> 1];
      }
      this.lastBeat = now; this.beat = true; this.beats++;
    }
    return this.beat;
  }
  mood() { return this.beats >= 6 && this.bpm ? classify(this.bpm, this.energy) : null; }
}

const shuffleArr = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export class Player extends EventTarget {
  constructor() {
    super();
    this.songs = []; this.byId = new Map(); this.urls = new Map();
    this.audio = new Audio(); this.audio.preload = "auto"; this.audio.crossOrigin = "anonymous";
    this.queue = []; this.qi = -1; this.queueName = "All songs";
    this.shuffle = kv.get("shuffle", false); this.repeat = kv.get("repeat", "off");
    this.liked = new Set(kv.get("liked", [])); this.playlists = kv.get("playlists", {}); this.stats = kv.get("stats", {}); this.recent = kv.get("recent", []);
    this.volume = kv.get("volume", 0.8); this.audio.volume = this.volume;
    this.ctx = null; this.analyser = null; this.freq = null; this.tracker = new BeatTracker();
    this.moodOverride = null; this.tagMood = null; this.playing = false; this.paused = false; this.listenT = 0; this.listenId = null;
    const a = this.audio;
    a.addEventListener("ended", () => this.next(true));
    a.addEventListener("play", () => { this.paused = false; this.playing = true; this.emit(); });
    a.addEventListener("pause", () => { if (!a.ended && this.playing) { this.paused = true; this.emit(); } });
    a.addEventListener("timeupdate", () => { this.tickStats(); const n = Date.now(); if (n - (this._rs || 0) > 2000) { this._rs = n; this.saveResume(); } });
    a.addEventListener("pause", () => this.saveResume());
    try { addEventListener("pagehide", () => this.saveResume()); document.addEventListener("visibilitychange", () => { if (document.hidden) this.saveResume(); }); } catch (e) { }
    a.addEventListener("error", () => { if (this.playing) this.dispatchEvent(new CustomEvent("error", { detail: "I couldn't play that file." })); });
    this.setupMediaSession();
  }
  emit() { this.dispatchEvent(new Event("change")); this.updateSession(); }
  // remember the song, queue and position so listening can continue later
  saveResume() {
    const s = this.current; if (!s || !this.playing) return;
    const t = this.audio.currentTime; if (!isFinite(t)) return;
    kv.set("resume", { id: s.id, t, queue: this.queue, qi: this.qi, base: this.baseQueue || this.queue, name: this.queueName });
  }
  restoreResume() {
    const r = kv.get("resume", null); if (!r || !this.byId.has(r.id) || this.current) return false;
    const q = (r.queue || []).filter(id => this.byId.has(id)); const qi = q.indexOf(r.id); if (qi < 0) return false;
    this.queue = q; this.qi = qi; this.baseQueue = (r.base || q).filter(id => this.byId.has(id)); this.queueName = r.name || "Now playing";
    const s = this.current; this.tagMood = genreMood(s.genre);
    this.audio.src = this.audioUrl(s); const t = r.t || 0;
    this.audio.addEventListener("loadedmetadata", () => { try { this.audio.currentTime = Math.min(t, (this.audio.duration || t) - 0.5); } catch (e) { } }, { once: true });
    this.playing = true; this.paused = true; this.listenId = s.id; this.listenT = 0; this._lt = t;
    this.emit(); return true;
  }
  // songs from the phone are played straight from where they are (no copy); only picked files are stored in the app
  audioUrl(s) {
    let u = this.urls.get(s.id) || {};
    if (!u.audio) { u.audio = s.uri && N.isNative ? N.urlFor(s.uri) : URL.createObjectURL(s.blob); this.urls.set(s.id, u); }
    return u.audio;
  }
  get current() { return this.queue[this.qi] !== undefined ? this.byId.get(this.queue[this.qi]) : null; }
  async load() {
    const recs = await songDB.all(); this.songs = []; this.byId.clear();
    for (const r of recs) this.addRecord(r);
    this.sortSongs(); this.emit();
  }
  addRecord(r) {
    const t = { id: r.id, name: r.name, ...r.meta, hasCover: !!r.cover };
    t.blob = r.blob; t.uri = r.uri || ""; t.cover = r.cover; this.songs.push(t); this.byId.set(t.id, t);
  }
  sortSongs() { this.songs.sort((a, b) => a.title.localeCompare(b.title)); }
  async addFiles(files, progress, quiet = false, uris = null) {
    let n = 0, dup = 0;
    const have = new Set(this.songs.map(s => s.name + "|" + s.size));
    for (const f of files) {
      progress && progress(++n, files.length);
      if (!(f.type.startsWith("audio") || /\.(mp3|m4a|aac|flac|ogg|opus|wav|wma|oga)$/i.test(f.name))) continue;
      if (have.has(f.name + "|" + f.size)) { dup++; continue; }
      const meta = await readTags(f); const cover = meta.cover; delete meta.cover;
      meta.size = f.size; meta.dur = 0;
      const id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const uri = uris && uris.get(f); const rec = { id, name: f.name, blob: uri ? null : f, uri: uri || "", cover, meta }; await songDB.put(rec); this.addRecord(rec); have.add(f.name + "|" + f.size);
      if (n % 5 === 0 && !quiet) await new Promise(r => setTimeout(r, 0));
    }
    if (!quiet) { this.sortSongs(); this.emit(); this.fillDurations(); }
    return { dup };
  }
  async fillDurations() {
    for (const s of this.songs) {
      if (s.dur) continue;
      await new Promise(res => {
        const a = new Audio(), own = !(s.uri && N.isNative), u = own ? URL.createObjectURL(s.blob) : N.urlFor(s.uri); a.preload = "metadata";
        const done = () => { s.dur = isFinite(a.duration) ? a.duration : 0; if (own) URL.revokeObjectURL(u); res(); };
        a.onloadedmetadata = done; a.onerror = done; setTimeout(done, 4000); a.src = u;
      });
      songDB.put({ id: s.id, name: s.name, blob: s.blob, uri: s.uri || "", cover: s.cover, meta: this.metaOf(s) });
    }
    this.emit();
  }
  // how much space the app uses for copied songs, and turning copies into references (frees the space)
  copiedBytes() { return this.songs.reduce((a, s) => a + (s.blob ? (s.size || s.blob.size || 0) : 0), 0); }
  async slim(list) {
    const map = new Map(list.map(x => [x.name + "|" + x.size, x.uri])); let freed = 0, n = 0;
    for (const s of this.songs) {
      if (!s.blob) continue; const uri = map.get(s.name + "|" + (s.size || s.blob.size)); if (!uri) continue;
      freed += s.size || s.blob.size || 0; n++; s.uri = uri; s.blob = null; const u = this.urls.get(s.id); if (u && u.audio && u.audio.startsWith("blob:")) { try { URL.revokeObjectURL(u.audio); } catch (e) { } this.urls.delete(s.id); }
      await songDB.put({ id: s.id, name: s.name, blob: null, uri, cover: s.cover, meta: this.metaOf(s) });
    }
    this.emit(); return { freed, n };
  }
  metaOf(s) { const { title, artist, album, genre, year, track, dur, size, lyrics } = s; return { title, artist, album, genre, year, track, dur, size, lyrics }; }
  async remove(id) { await songDB.del(id); this.songs = this.songs.filter(s => s.id !== id); this.byId.delete(id); const u = this.urls.get(id); if (u) { URL.revokeObjectURL(u.cover); this.urls.delete(id); } this.emit(); }
  coverUrl(s) { if (!s || !s.cover) return null; let u = this.urls.get(s.id); if (!u) { u = { cover: URL.createObjectURL(s.cover) }; this.urls.set(s.id, u); } return u.cover; }
  // ---- playback
  ensureAudioGraph() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      const src = this.ctx.createMediaElementSource(this.audio); this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0.2;
      src.connect(this.analyser); this.analyser.connect(this.ctx.destination); this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) { this.ctx = null; }
  }
  setQueue(ids, name, start = 0, shuffle = this.shuffle) {
    this.queueName = name; this.baseQueue = [...ids];
    this.queue = shuffle ? shuffleArr(ids) : [...ids];
    if (shuffle && start !== undefined && ids[start] !== undefined) { const id = ids[start]; this.queue = [id, ...this.queue.filter(x => x !== id)]; this.qi = 0; } else this.qi = start;
  }
  playIds(ids, name, startId = null, shuffle = this.shuffle) {
    if (!ids.length) return false;
    const idx = startId ? Math.max(0, ids.indexOf(startId)) : 0;
    this.setQueue(ids, name, shuffle && !startId ? 0 : idx, shuffle); this.startCurrent(); return true;
  }
  playSong(id, listIds, name) { const ids = listIds && listIds.includes(id) ? listIds : [id]; this.setQueue(ids, name || "Now playing", ids.indexOf(id)); this.startCurrent(); }
  async startCurrent() {
    const s = this.current; if (!s) return;
    this.ensureAudioGraph(); this.tracker.reset(); this.tagMood = genreMood(s.genre);
    this.audio.src = this.audioUrl(s); this.playing = true; this.paused = false; this.listenId = s.id; this.listenT = 0;
    this.stats[s.id] = this.stats[s.id] || { plays: 0, secs: 0, last: 0 }; this.stats[s.id].plays++; this.stats[s.id].last = Date.now();
    this.recent = [s.id, ...this.recent.filter(x => x !== s.id)].slice(0, 50); kv.set("recent", this.recent); kv.set("stats", this.stats);
    try { await this.audio.play(); } catch (e) { this.paused = true; }
    this.emit();
    this.dispatchEvent(new CustomEvent("songstart", { detail: s }));
  }
  tickStats() {
    const a = this.audio; if (!this.playing || this.paused || !this.listenId) return;
    const t = a.currentTime, d = t - (this._lt || 0); this._lt = t;
    if (d > 0 && d < 2 && this.stats[this.listenId]) { this.stats[this.listenId].secs += d; this._sv = (this._sv || 0) + d; if (this._sv > 15) { this._sv = 0; kv.set("stats", this.stats); } }
  }
  toggle() {
    if (!this.current) { if (this.songs.length) this.playIds(this.songs.map(s => s.id), "All songs"); return; }
    if (this.audio.paused) { this.ensureAudioGraph(); this.audio.play(); } else this.audio.pause();
  }
  pause() { if (this.playing && !this.audio.paused) this.audio.pause(); }
  resume() { if (this.current && this.audio.paused) { this.ensureAudioGraph(); this.audio.play(); } }
  stop() { kv.set("resume", null); this.audio.pause(); this.audio.removeAttribute("src"); this.playing = false; this.paused = false; this.emit(); }
  next(auto = false) {
    if (!this.queue.length) return;
    if (auto && this.repeat === "one") { this.audio.currentTime = 0; this.audio.play(); return; }
    if (this.qi + 1 < this.queue.length) this.qi++;
    else if (this.repeat === "all" || !auto) { if (this.shuffle) this.queue = shuffleArr(this.baseQueue || this.queue); this.qi = 0; }
    else { this.playing = false; this.paused = false; this.audio.pause(); this.emit(); return; }
    this.startCurrent();
  }
  prev() {
    if (this.audio.currentTime > 4) { this.audio.currentTime = 0; return; }
    if (this.qi > 0) this.qi--; else if (this.repeat === "all") this.qi = this.queue.length - 1; else { this.audio.currentTime = 0; return; }
    this.startCurrent();
  }
  seek(frac) { if (isFinite(this.audio.duration)) this.audio.currentTime = frac * this.audio.duration; }
  setVolume(v) { const old = this.volume; this.volume = Math.max(0, Math.min(1, v)); this.audio.volume = this.volume; kv.set("volume", this.volume); this.dispatchEvent(new CustomEvent("volume", { detail: [this.volume, old] })); }
  setShuffle(on) {
    this.shuffle = on; kv.set("shuffle", on);
    if (this.baseQueue && this.queue.length) { const cur = this.queue[this.qi]; this.queue = on ? [cur, ...shuffleArr(this.baseQueue.filter(x => x !== cur))] : [...this.baseQueue]; this.qi = on ? 0 : Math.max(0, this.queue.indexOf(cur)); }
    this.emit();
  }
  setRepeat(m) { this.repeat = m; kv.set("repeat", m); this.emit(); }
  // ---- likes, playlists
  isLiked(id) { return this.liked.has(id); }
  toggleLike(id = this.current && this.current.id) { if (!id) return false; if (this.liked.has(id)) this.liked.delete(id); else this.liked.add(id); kv.set("liked", [...this.liked]); this.emit(); return this.liked.has(id); }
  newPlaylist(name) { if (!name || this.playlists[name]) return false; this.playlists[name] = []; kv.set("playlists", this.playlists); this.emit(); return true; }
  addToPlaylist(name, id) { const p = this.playlists[name]; if (!p || p.includes(id)) return false; p.push(id); kv.set("playlists", this.playlists); this.emit(); return true; }
  removeFromPlaylist(name, id) { this.playlists[name] = (this.playlists[name] || []).filter(x => x !== id); kv.set("playlists", this.playlists); this.emit(); }
  deletePlaylist(name) { delete this.playlists[name]; kv.set("playlists", this.playlists); this.emit(); }
  // ---- views and search
  artists() { return this.group("artist"); }
  albums() { return this.group("album"); }
  genres() { return this.group("genre", "Unknown genre"); }
  group(key, none) {
    const m = new Map(); for (const s of this.songs) { const k = s[key] || none || "Unknown"; if (!m.has(k)) m.set(k, []); m.get(k).push(s); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, list]) => ({ name, list: key === "album" ? list.sort((a, b) => (a.track || 99) - (b.track || 99) || a.title.localeCompare(b.title)) : list }));
  }
  mostPlayed() { return this.songs.filter(s => this.stats[s.id]).sort((a, b) => this.stats[b.id].secs - this.stats[a.id].secs); }
  recents() { return this.recent.map(i => this.byId.get(i)).filter(Boolean); }
  favorite() { const m = this.mostPlayed()[0]; return m || null; }
  find(q) {
    q = norm(q); if (!q) return [];
    const sc = s => { const t = norm(s.title), ar = norm(s.artist), al = norm(s.album), all = `${t} ${ar} ${al}`; if (t === q) return 100; if (t.startsWith(q)) return 80; if (t.includes(q)) return 60; if (all.includes(q)) return 40; return q.split(" ").every(w => all.includes(w)) ? 20 : 0; };
    return this.songs.map(s => [sc(s), s]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  }
  findGroup(list, q) { q = norm(q); return list.find(g => norm(g.name) === q) || list.find(g => norm(g.name).includes(q)); }
  // ---- what Luna listens to (called every frame)
  listen(now) {
    const out = { playing: this.playing, paused: this.paused || (this.audio.paused && this.playing), index: this.qi + (this.queue[this.qi] ? this.queue[this.qi].length : 0) * 0, title: this.current ? this.current.title : "", level: 0, beat: false, mood: null };
    out.index = this.current ? this.songs.indexOf(this.current) : -1;
    if (!this.playing || out.paused) return out;
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freq);
      const b = this.tracker.feed(this.freq, now); out.level = this.tracker.level; out.beat = b;
      out.mood = this.moodOverride || this.tagMood || this.tracker.mood() || "happy";
    } else {                                  // no audio analysis: fake a steady pulse so she still dances
      const bpm = 105, ph = now * bpm / 60, last = this._ph ?? -1; this._ph = Math.floor(ph);
      out.level = Math.pow(Math.max(0, Math.cos(ph * 2 * Math.PI)), 2); out.beat = this._ph > last && last >= 0; out.mood = this.moodOverride || this.tagMood || "happy";
    }
    return out;
  }
  // ---- Media Session (lock screen / notification controls)
  setupMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { } };
    h("play", () => this.resume()); h("pause", () => this.pause()); h("previoustrack", () => this.prev()); h("nexttrack", () => this.next());
    h("seekto", d => { if (d.seekTime != null) this.audio.currentTime = d.seekTime; });
  }
  updateSession() {
    if (!("mediaSession" in navigator)) return;
    const s = this.current; if (!s) return;
    try {
      const cu = this.coverUrl(s);
      navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: s.artist, album: s.album, artwork: cu ? [{ src: cu, sizes: "512x512", type: s.cover.type }] : [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
      navigator.mediaSession.playbackState = this.audio.paused ? "paused" : "playing";
    } catch (e) { }
  }
}
