// app.js - Luna for Android (PWA): wires the pixel Luna, the player and all the screens together
import { Scene } from "./scene.js";
import { Behavior, MOODS, ACTIVE, EVENT_DUR } from "./behavior.js";
import { Player } from "./player.js";
import { kv } from "./store.js";
import { I } from "./icons.js";
import * as W from "./wear.js";
import * as B from "./brain.js";
import { THEMES } from "./scene1.js";
import * as N from "./native.js";
import * as V from "./voice.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const nowS = () => performance.now() / 1000;

const player = new Player(), beh = new Behavior(nowS()), chat = new B.Chat(), reminders = new B.Reminders(), scene = new Scene(), pscene = new Scene();
let wear = W.cleanWear(kv.get("wear", W.makeWear("sailor")));
const cfg = { get: (k, d) => kv.get(k, d), set: (k, v) => kv.set(k, v) };
beh.glasses = cfg.get("glasses", false); beh.headphones = cfg.get("headphones", true);
beh.bedtime = +cfg.get("bedtime", 22); beh.wake = +cfg.get("wake", 6);
const stage = $("#stage"), sctx = stage.getContext("2d"), img = sctx.createImageData(stage.width, stage.height);

// ------------------------------------------------------------------ helpers
let toastT = 0;
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => e.classList.add("hidden"), 2600); }
function say(text, secs = 5) { beh.say(text, nowS(), secs); }
function logMsg(who, text) {
  const d = document.createElement("div"); d.className = "msg " + who; d.textContent = text; const l = $("#log"); l.appendChild(d); l.scrollTop = l.scrollHeight;
  while (l.children.length > 80) l.firstChild.remove();
}
let voiceOn = cfg.get("voice", false);
function luna(text, opts = {}) {
  logMsg("luna", text); say(text, opts.secs || Math.max(4, Math.min(10, text.length / 14)));
  if (voiceOn) V.speak(text, { start: () => beh.speaking = true, end: () => beh.speaking = false, error: m => toast(m) });
}
function applyLook() {
  const se = cfg.get("season_on", true) ? W.seasonName(new Date(), cfg.get("hemi", "south") === "south") : null;
  beh.season = se; beh.theme = se ? W.SEASON_THEME[se] : cfg.get("theme", "night");
  if (se && W.HOLIDAY_OUTFIT[se] && cfg.get("season_on", true)) {
    const tag = `${se}-${new Date().getFullYear()}`;
    if (cfg.get("last_holiday", "") !== tag) { cfg.set("last_holiday", tag); wearPreset(W.HOLIDAY_OUTFIT[se], false); setTimeout(() => luna(W.HOLIDAY_LINE[se]), 1500); }
  }
}
function saveWear() { cfg.set("wear", wear); beh.wear = wear; renderWardrobe(false); drawPreview(); pushArt(); }
function wearPreset(name, announce = true) {
  wear = W.makeWear(name, wear.acc.filter(a => !["santa hat", "witch hat"].includes(a)), wear); saveWear(); beh.startEvent("twirl", nowS());
  if (announce) say(`Ta-da! My ${name} look!`, 3);
}
function wearSet(slot, name) {
  if (slot === "hair" || slot === "style") { wear[slot] = name; saveWear(); say(`New ${slot === "hair" ? "hair colour" : "hairstyle"}: ${name}!`, 2.5); return; }
  wear[slot] = name; if (slot === "top" || slot === "bottom") wear.dress = null; saveWear(); say(`Wearing my ${name}!`, 2.5);
}
function wearToggle(name, on) {
  if (name === "glasses" || name === "headphones") { const v = on === undefined ? !beh[name] : on; beh[name] = v; cfg.set(name, v); renderWardrobe(false); drawPreview(); return; }
  const has = wear.acc.includes(name), want = on === undefined ? !has : on;
  if (want && !has) wear.acc.push(name); else if (has && !want) wear.acc = wear.acc.filter(a => a !== name);
  saveWear();
}
beh.wear = wear;
const artC = document.createElement("canvas"); artC.width = artC.height = 112;
function pushArt() {
  if (!N.isNative) return;
  const mk = (eyes, mouth, v) => {
    const s = { bg: "#120e26", glow: "#2b2745", v, cx: 94, t: 1, sw: 1.2, sway: 0, amp: 0, bounce: 0, moving: false, mood: "idle", pose: "idle", sit: 0, walk_dir: 0, walk_phase: 0, blink: false, gaze: [0, 0], arms: "down", parts: [], hour: 12, minute: 0, expr: { eyes, brows: "up", mouth, blush: 0.8 }, wear, theme: "night", season: null, weather: "mild", glasses: beh.glasses, headphones: beh.headphones, speaking: false, lift: 0, lean: 0, look: [0, 0] };
    const p = pscene.render(s), c = artC.getContext("2d"), im = c.createImageData(112, 112);
    for (let y = 0; y < 112; y++) for (let x = 0; x < 112; x++) { const k = ((32 + y) * p.w + 132 + x) * 4, o = (y * 112 + x) * 4; im.data[o] = p.a[k]; im.data[o + 1] = p.a[k + 1]; im.data[o + 2] = p.a[k + 2]; im.data[o + 3] = 255; }
    c.putImageData(im, 0, 0); return artC.toDataURL("image/png").split(",")[1];
  };
  N.sendArt(mk("happy", "smile", 0), mk("happy", "sing", 1));
}

// ------------------------------------------------------------------ tabs
const TABS = [["room", "Room", I.room], ["lib", "Library", I.lib], ["lyrics", "Lyrics", I.lyrics], ["chat", "Chat", I.chat], ["wardrobe", "Wardrobe", I.hanger]];
let tab = "room";
$("#nav").innerHTML = TABS.map(([id, label, ic]) => `<button data-t="${id}">${ic}<span>${label}</span></button>`).join("");
function go(id) {
  tab = id; $$(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + id)); $$("#nav button").forEach(b => b.classList.toggle("on", b.dataset.t === id));
  if (id === "lib") renderLib(); if (id === "lyrics") loadLyrics(); if (id === "wardrobe") { renderWardrobe(true); drawPreview(); }
  if (id === "chat") { const l = $("#log"); l.scrollTop = l.scrollHeight; }
}
$("#nav").onclick = e => { const b = e.target.closest("button"); if (b) go(b.dataset.t); };
$("#btn-settings").innerHTML = I.gear; $("#btn-mic").innerHTML = I.mic; $("#btn-send").innerHTML = I.send;
$("#mini-prev").innerHTML = I.prev; $("#mini-next").innerHTML = I.next; $("#mini-like").innerHTML = I.heartO;
$("#now-close").innerHTML = I.down; $("#now-menu").innerHTML = I.more; $("#now-shuf").innerHTML = I.shuffle; $("#now-prev").innerHTML = I.prev; $("#now-next").innerHTML = I.next;
$("#now-rep").innerHTML = I.repeat; $("#now-like").innerHTML = I.heartO; $("#now-pl").innerHTML = I.plus; $("#vol-ico").innerHTML = I.vol; $("#set-close").innerHTML = I.down;

// ------------------------------------------------------------------ menus
function showMenu(title, items) {
  const m = $("#menu"); m.innerHTML = (title ? `<div class="mh">${esc(title)}</div>` : "") + items.map((it, i) => `<button data-i="${i}" class="${it.danger ? "danger" : ""}">${esc(it.label)}</button>`).join("");
  m.classList.remove("hidden");
  m.onclick = e => { const b = e.target.closest("button"); if (!b) return; m.classList.add("hidden"); items[+b.dataset.i].fn(); };
  setTimeout(() => { const off = e => { if (!m.contains(e.target)) { m.classList.add("hidden"); document.removeEventListener("pointerdown", off, true); } }; document.addEventListener("pointerdown", off, true); }, 0);
}
function songMenu(s) {
  const items = [{ label: player.isLiked(s.id) ? "Unlike" : "Like", fn: () => { player.toggleLike(s.id); renderLib(); } }];
  items.push({ label: "Add to playlist...", fn: () => playlistPicker(s) });
  items.push({ label: "Lyrics", fn: () => { if (player.current !== s) player.playSong(s.id, [s.id], "Now playing"); go("lyrics"); } });
  items.push({ label: "Remove from library", danger: true, fn: async () => { if (player.current === s) player.stop(); await player.remove(s.id); renderLib(); toast("Removed"); } });
  showMenu(`${s.title} - ${s.artist}`, items);
}
function playlistPicker(s) {
  const names = Object.keys(player.playlists), items = names.map(n => ({ label: n, fn: () => { toast(player.addToPlaylist(n, s.id) ? `Added to ${n}` : "Already there"); } }));
  items.push({ label: "+ New playlist", fn: () => { const n = (prompt("Playlist name") || "").trim(); if (n) { player.newPlaylist(n); player.addToPlaylist(n, s.id); toast(`Created ${n}`); renderLib(); } } });
  showMenu("Add to playlist", items);
}

// ------------------------------------------------------------------ library
const LIBS = ["Home", "Songs", "Artists", "Albums", "Genres", "Liked", "Playlists", "Most played", "Recent"];
let lib = { view: "Home", detail: null, sort: "title", q: "" };
$("#libtabs").innerHTML = LIBS.map(n => `<button class="chip" data-v="${n}">${n}</button>`).join("");
$("#libtabs").onclick = e => { const b = e.target.closest("button"); if (b) { lib.view = b.dataset.v; lib.detail = null; $("#q").value = ""; lib.q = ""; renderLib(); } };
$("#q").oninput = e => { lib.q = e.target.value; renderLib(); };
const initial = s => (s || "?").trim().charAt(0).toUpperCase();
const hue = s => { let h = 0; for (const c of s || "") h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
function coverEl(s, cls = "") {
  const u = s && player.coverUrl(s);
  return u ? `<div class="cover ${cls}" style="background-image:url(${u})"></div>` : `<div class="cover ${cls}" style="background:linear-gradient(135deg,hsl(${hue(s && s.album)} 55% 38%),hsl(${(hue(s && s.album) + 50) % 360} 60% 45%))">${esc(initial(s && s.title))}</div>`;
}
function songRow(s, list, name) {
  return `<div class="song ${player.current === s ? "now" : ""}" data-id="${s.id}" data-list="${esc(name)}"><div>${coverEl(s)}</div><div class="grow"><div class="t">${esc(s.title)}</div><div class="sub">${esc(s.artist)}${s.dur ? " · " + fmt(s.dur) : ""}</div></div>${player.isLiked(s.id) ? `<span class="icon on" style="width:28px">${I.heart}</span>` : ""}<button class="icon more" data-more="${s.id}">${I.more}</button></div>`;
}
let rowLists = {};
function songList(list, name) { rowLists[name] = list.map(s => s.id); return list.map(s => songRow(s, list, name)).join("") || `<div class="empty">Nothing here yet.</div>`; }
const SORTS = { title: (a, b) => a.title.localeCompare(b.title), artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title), album: (a, b) => a.album.localeCompare(b.album) || (a.track || 0) - (b.track || 0), year: (a, b) => (b.year || 0) - (a.year || 0), length: (a, b) => (b.dur || 0) - (a.dur || 0) };
function tiles(groups, kind) {
  return `<div class="grid">${groups.map(g => `<button class="tile" data-kind="${kind}" data-name="${esc(g.name)}">${coverEl(g.list[0])}<div class="t">${esc(g.name)}</div><div class="sub">${g.list.length} song${g.list.length === 1 ? "" : "s"}</div></button>`).join("")}</div>`;
}
function renderLib() {
  if (tab !== "lib") return;
  $$("#libtabs .chip").forEach(c => c.classList.toggle("on", c.dataset.v === lib.view && !lib.q));
  const L = $("#liblist"), P = player;
  if (!P.songs.length) { L.innerHTML = `<div class="empty">No songs yet.<br>Tap <b>+ Add songs</b> and pick music from your phone.<br>I'll remember them next time.</div>`; return; }
  if (lib.q) { const r = P.find(lib.q); L.innerHTML = `<div class="h2">${r.length} result${r.length === 1 ? "" : "s"}</div>` + songList(r, "Search"); return; }
  if (lib.detail) {
    const d = lib.detail, back = `<button class="back" data-back>&lsaquo; ${esc(lib.view)}</button>`;
    L.innerHTML = back + `<div class="row" style="margin:6px 0 10px"><div class="grow"><div class="title big" style="text-align:left">${esc(d.name)}</div><div class="sub">${d.list.length} songs - only this list plays</div></div><button class="pill" data-playall>Play</button><button class="pill ghost" data-shufall>Shuffle</button></div>` + songList(d.list, d.name) + (d.kind === "playlist" ? `<div style="margin-top:14px"><button class="pill ghost danger" data-delpl>Delete playlist</button></div>` : ""); return;
  }
  let html = "";
  switch (lib.view) {
    case "Home": {
      html = `<div class="row wrap" style="padding:10px 0"><button class="pill" data-shuffleall>Shuffle all</button><button class="pill ghost" data-newpl>+ New playlist</button></div>`;
      const rec = P.recents().slice(0, 5), top = P.mostPlayed().slice(0, 5);
      if (rec.length) html += `<div class="h2">Recently played</div>` + songList(rec, "Recent");
      if (top.length) html += `<div class="h2">Most played</div>` + songList(top, "Most played");
      html += `<div class="h2">Albums</div>` + tiles(P.albums().slice(0, 6), "album");
      if (P.liked.size) html += `<div class="h2">Liked songs</div><button class="chip" data-v="Liked">${P.liked.size} liked - open</button>`; break;
    }
    case "Songs": html = `<div class="row" style="padding:6px 0"><span class="sub">Sort by</span>${Object.keys(SORTS).map(k => `<button class="chip small ${lib.sort === k ? "on" : ""}" data-sort="${k}">${k}</button>`).join("")}</div>` + songList([...P.songs].sort(SORTS[lib.sort]), "All songs"); break;
    case "Artists": html = tiles(P.artists(), "artist"); break;
    case "Albums": html = tiles(P.albums(), "album"); break;
    case "Genres": html = tiles(P.genres(), "genre"); break;
    case "Liked": html = songList(P.songs.filter(s => P.liked.has(s.id)), "Liked songs"); break;
    case "Most played": html = songList(P.mostPlayed(), "Most played"); break;
    case "Recent": html = songList(P.recents(), "Recently played"); break;
    case "Playlists": html = `<div style="padding:8px 0"><button class="pill" data-newpl>+ New playlist</button></div>` + (Object.keys(P.playlists).length ? tiles(Object.entries(P.playlists).map(([name, ids]) => ({ name, list: ids.map(i => P.byId.get(i)).filter(Boolean) })), "playlist") : `<div class="empty">No playlists yet.</div>`); break;
  }
  L.innerHTML = html;
}
$("#liblist").onclick = e => {
  const t = e.target;
  const more = t.closest("[data-more]"); if (more) { e.stopPropagation(); return songMenu(player.byId.get(more.dataset.more)); }
  const row = t.closest(".song"); if (row) { const name = row.dataset.list, ids = rowLists[name] || [row.dataset.id]; player.playSong(row.dataset.id, ids, name); beh.manual = null; return; }
  const tile = t.closest(".tile");
  if (tile) { const k = tile.dataset.kind, n = tile.dataset.name, P = player; let g; if (k === "artist") g = P.findGroup(P.artists(), n); else if (k === "album") g = P.findGroup(P.albums(), n); else if (k === "genre") g = P.findGroup(P.genres(), n); else g = { name: n, list: (P.playlists[n] || []).map(i => P.byId.get(i)).filter(Boolean) }; if (g) { lib.detail = { ...g, kind: k }; renderLib(); $("#tab-lib").scrollTop = 0; } return; }
  if (t.closest("[data-back]")) { lib.detail = null; return renderLib(); }
  if (t.closest("[data-playall]")) return player.playIds(lib.detail.list.map(s => s.id), lib.detail.name, null, false);
  if (t.closest("[data-shufall]")) { player.setShuffle(true); return player.playIds(lib.detail.list.map(s => s.id), lib.detail.name, null, true); }
  if (t.closest("[data-shuffleall]")) { player.setShuffle(true); return player.playIds(player.songs.map(s => s.id), "All songs", null, true); }
  if (t.closest("[data-newpl]")) { const n = (prompt("Playlist name") || "").trim(); if (n) toast(player.newPlaylist(n) ? `Created ${n}` : "That name is taken"); return renderLib(); }
  if (t.closest("[data-delpl]")) { if (confirm("Delete this playlist?")) { player.deletePlaylist(lib.detail.name); lib.detail = null; renderLib(); } return; }
  const sortb = t.closest("[data-sort]"); if (sortb) { lib.sort = sortb.dataset.sort; return renderLib(); }
  const v = t.closest("[data-v]"); if (v) { lib.view = v.dataset.v; renderLib(); }
};
// scanning the phone's own music (Android app only)
async function scanPhone() {
  toast("Looking for music on your phone...");
  let list; try { list = await N.scanMusic(); } catch (e) { return toast("I need the music permission to look. Please allow it."); }
  const have = new Set(player.songs.map(s => s.name + "|" + s.size)), todo = list.filter(x => !have.has(x.name + "|" + x.size));
  if (!todo.length) return toast(list.length ? "Everything is already in Luna." : "I couldn't find any music files.");
  say("Ooh, so much music! Give me a moment...", 6); let ok = 0;
  for (let i = 0; i < todo.length; i++) {
    toast(`Adding ${i + 1}/${todo.length}`);
    try { const f = await N.fileFor(todo[i]); await player.addFiles([f], null, true); ok++; } catch (e) { }
  }
  player.sortSongs(); player.emit(); player.fillDurations(); renderLib();
  luna(`I added ${ok} song${ok === 1 ? "" : "s"} from your phone!`);
}
$("#btn-scan").onclick = $("#p-scan").onclick = () => { if (!$("#sheet-settings").classList.contains("hidden")) closeSettings(); scanPhone(); };
if (N.isNative) $("#btn-scan").classList.remove("hidden");
// importing songs
const fileIn = $("#file");
$("#btn-add").onclick = $("#set-add").onclick = () => fileIn.click();
fileIn.onchange = async () => {
  const files = [...fileIn.files]; fileIn.value = ""; if (!files.length) return;
  say("Ooh, new music! Let me look...", 4);
  const r = await player.addFiles(files, (n, t) => toast(`Adding songs ${n}/${t}`));
  toast(`Added! ${r.dup ? r.dup + " already there. " : ""}`); luna(`I've got ${player.songs.length} song${player.songs.length === 1 ? "" : "s"} now. Want me to play something?`); renderLib();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
};

// ------------------------------------------------------------------ player UI
function setIcon(sel, svg, on) { const e = $(sel); if (e._s !== svg) { e.innerHTML = svg; e._s = svg; } if (on !== undefined) e.classList.toggle("on", on); }
function setCover(el, s, ch) { const u = s && player.coverUrl(s); el.style.backgroundImage = u ? `url(${u})` : ""; el.style.background = u ? "" : `linear-gradient(135deg,hsl(${hue(s && s.album)} 55% 38%),hsl(${(hue(s && s.album) + 50) % 360} 60% 45%))`; if (u) el.style.backgroundImage = `url(${u})`; el.textContent = u ? "" : (s ? initial(s.title) : ch); }
let lastSong = null;
function refreshPlayerUI() {
  const s = player.current, playing = player.playing && !player.audio.paused;
  setIcon("#mini-play", playing ? I.pause : I.play); setIcon("#now-play", playing ? I.pause : I.play);
  setIcon("#now-shuf", I.shuffle, player.shuffle); setIcon("#now-rep", I.repeat, player.repeat !== "off"); $("#now-rep").title = "Repeat " + player.repeat;
  const liked = s && player.isLiked(s.id); setIcon("#mini-like", liked ? I.heart : I.heartO, !!liked); setIcon("#now-like", liked ? I.heart : I.heartO, !!liked);
  if (s !== lastSong) {
    lastSong = s; const t = s ? s.title : "Nothing playing", sub = s ? `${s.artist} · ${s.album}` : "Add songs in Library";
    $("#mini-title").textContent = $("#nc-title").textContent = $("#now-title").textContent = t; $("#mini-sub").textContent = $("#nc-sub").textContent = $("#now-sub").textContent = sub;
    setCover($("#mini-cover"), s, "♪"); setCover($("#nc-cover"), s, "♪"); setCover($("#now-art"), s, "♪"); $("#now-q").textContent = player.queueName;
    if (tab === "lyrics") loadLyrics(); if (tab === "lib") renderLib();
  }
  $("#now-rep").dataset.mode = player.repeat;
}
player.addEventListener("change", refreshPlayerUI);
player.addEventListener("error", e => toast(e.detail));
player.addEventListener("songstart", () => { beh.pendingLine = true; });
player.addEventListener("volume", e => { const [v, o] = e.detail; beh.reactVolume(v, o, nowS()); $("#now-vol").value = v * 100; });
beh.onSongStart = now => {
  const s = player.current, fav = player.favorite();
  if (fav && s && fav.id === s.id && (player.stats[s.id].plays >= 3)) beh.say("Ooh, one of your favourites!", now, 3.5); else beh.say("Ooh, a new song!", now, 2.5);
};
beh.onWake = now => { if (beh.isNight()) return beh.say("*yawn* ...is it morning already?", now, 4); luna(chat.greet(), { secs: 10 }); if (cfg.get("city", "")) fetchWeather(cfg.get("city", ""), false); };
$("#mini-play").onclick = $("#now-play").onclick = () => { if (extActive()) return N.control(N.ext.playing ? "pause" : "play"); player.toggle(); };
$("#mini-prev").onclick = $("#now-prev").onclick = () => { if (extActive()) return N.control("prev"); player.prev(); };
$("#mini-next").onclick = $("#now-next").onclick = () => { if (extActive()) return N.control("next"); player.next(); };
$("#mini-like").onclick = $("#now-like").onclick = () => { if (player.current) { const l = player.toggleLike(); toast(l ? "Added to liked songs" : "Removed from liked"); if (l) beh.startEvent("love", nowS()); } };
$("#now-shuf").onclick = () => { player.setShuffle(!player.shuffle); toast("Shuffle " + (player.shuffle ? "on" : "off")); };
$("#now-rep").onclick = () => { const m = { off: "all", all: "one", one: "off" }[player.repeat]; player.setRepeat(m); toast("Repeat " + m); };
$("#now-pl").onclick = () => player.current && playlistPicker(player.current);
$("#now-menu").onclick = () => player.current && songMenu(player.current);
$("#mini-open").onclick = () => { $("#sheet-now").classList.remove("hidden"); };
$("#now-close").onclick = () => $("#sheet-now").classList.add("hidden");
$("#now-vol").oninput = e => player.setVolume(e.target.value / 100);
let seeking = false; const seek = $("#now-seek");
seek.oninput = () => { seeking = true; }; seek.onchange = () => { player.seek(seek.value / 1000); seeking = false; };
$("#mprog").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); player.seek((e.clientX - r.left) / r.width); };

// ------------------------------------------------------------------ lyrics
let ly = { id: null, synced: [], plain: "", cur: -2, src: "" };
const myLyr = id => cfg.get("mylyr." + id, "");
async function loadLyrics(force = false) {
  const s = player.current, body = $("#ly-body"); $("#ly-editor").classList.add("hidden"); body.classList.remove("hidden");
  if (!s) { $("#ly-title").textContent = "Lyrics"; $("#ly-sub").textContent = ""; body.className = "lyrics"; body.innerHTML = `<p class="hint">Play a song and its lyrics show up here.</p>`; ly = { id: null, synced: [], plain: "", cur: -2 }; return; }
  if (!force && ly.id === s.id && (ly.synced.length || ly.plain)) return;
  $("#ly-title").textContent = s.title; $("#ly-sub").textContent = s.artist;
  ly = { id: s.id, synced: [], plain: "", cur: -2, src: "" };
  const mine = myLyr(s.id), embedded = s.lyrics || "";
  const own = mine || embedded;
  if (own) { const syn = B.parseLrc(own); if (syn.length >= 2) ly.synced = syn; else ly.plain = own; ly.src = mine ? "yours" : "in the song file"; renderLyrics(); return; }
  body.className = "lyrics"; body.innerHTML = `<p class="hint">Looking for lyrics...</p>`;
  const r = await B.findLyrics(s.artist, s.title, s.album, s.dur);
  if (ly.id !== s.id) return;
  if (r === undefined) { body.innerHTML = `<p class="hint">I'm offline, so I couldn't look. You can add your own with the button above.</p>`; return; }
  if (!r) { body.innerHTML = `<p class="hint">I couldn't find lyrics for this one. Tap "Add my own" to type or paste them.</p>`; return; }
  if (r.synced && r.synced.length) ly.synced = r.synced; else ly.plain = r.plain; ly.src = "online"; renderLyrics();
}
function renderLyrics() {
  const body = $("#ly-body");
  if (ly.synced.length) { body.className = "lyrics"; body.innerHTML = ly.synced.map((l, i) => `<p data-i="${i}">${esc(l[1] || "♪")}</p>`).join(""); body.onclick = e => { const p = e.target.closest("p"); if (p) player.audio.currentTime = ly.synced[+p.dataset.i][0]; }; }
  else { body.className = "lyrics plain"; body.textContent = ly.plain; body.onclick = null; }
  $("#ly-sub").textContent = `${player.current.artist} · lyrics ${ly.src}`; ly.cur = -2;
}
function followLyrics() {
  if (tab !== "lyrics" || !ly.synced.length || !player.playing) return;
  const i = B.currentLine(ly.synced, player.audio.currentTime); if (i === ly.cur) return; ly.cur = i;
  const ps = $$("#ly-body p"); ps.forEach((p, k) => { p.classList.toggle("cur", k === i); p.classList.toggle("past", k < i); });
  if (ps[i]) ps[i].scrollIntoView({ block: "center", behavior: "smooth" });
}
$("#ly-edit").onclick = () => { if (!player.current) return toast("Play a song first"); $("#ly-text").value = myLyr(player.current.id) || (ly.plain || ly.synced.map(l => l[1]).join("\n")); $("#ly-editor").classList.remove("hidden"); $("#ly-body").classList.add("hidden"); };
$("#ly-cancel").onclick = () => { $("#ly-editor").classList.add("hidden"); $("#ly-body").classList.remove("hidden"); };
$("#ly-save").onclick = () => { cfg.set("mylyr." + player.current.id, $("#ly-text").value.trim()); toast("Saved your lyrics"); loadLyrics(true); };
$("#ly-clear").onclick = () => { cfg.set("mylyr." + player.current.id, ""); loadLyrics(true); };
$("#ly-find").onclick = async () => { if (!player.current) return; const s = player.current; cfg.set("mylyr." + s.id, ""); try { localStorage.removeItem("luna.lyr." + `${s.artist}|${s.title}`.toLowerCase()); } catch (e) { } s.lyrics = ""; ly.id = null; loadLyrics(true); };

// ------------------------------------------------------------------ weather
async function fetchWeather(city, speak = true) {
  try { const w = await B.getWeather(city); beh.weather = w; const c = $("#wchip"); c.textContent = `${Math.round(w.temp)}° ${w.desc}`; c.classList.remove("hidden"); if (speak) { luna(B.weatherText(w)); } }
  catch (e) { if (speak) luna(String(e.message || "I couldn't get the weather right now.").startsWith("I ") ? e.message : "I couldn't get the weather. Am I offline?"); }
}

// ------------------------------------------------------------------ commands
const HELP = `MUSIC: play <song> | pause | resume | next | previous | volume up/down/40 | like | shuffle on/off | repeat off/all/one
LIBRARY: show artists/albums/songs/liked | play album <name> | play artist <name> | play playlist <name> | new playlist <name> | add this to <playlist>
LYRICS: lyrics | add lyrics
TIMERS: pause the song in 10 min | play <song> in 5 min | remind me to <x> at 18:30 | note <text> | clear notes
INFO: weather | weather in <city> | city <name> | time | date | quote | motivate me | space fact | joke
CHAT: good morning | how are you | call me <name> | remember that <thing> | what do you remember | forget <thing>
DO: sit | walk | dance | laptop | game | read | phone | call | snack | sleep | sing | free
EMOTES: laugh | cry | angry | blush | twirl | wave | trip | cover ears | fan | shiver | umbrella
LOOK: wardrobe | dye hair blue | ponytail / bob / twin tails | outfit casual/school/cozy... | wear jeans / boots / beanie | glasses on/off | headphones on/off | theme night/sunset/forest/sakura
OTHER: mood hype/happy/chill/sad/intense/auto | talk on/off`;
function quickPlay(q, name) {
  const P = player, r = P.find(q); if (!r.length) { luna(`I couldn't find "${q}" in your songs.`); return false; }
  P.playSong(r[0].id, r.map(s => s.id), name || `Search: ${q}`); luna(`Playing ${r[0].title}${r[0].artist.startsWith("Unknown") ? "" : " by " + r[0].artist}!`); return true;
}
function runCommand(text, silent = false) {
  const P = player, t = text.trim(), low = t.toLowerCase().replace(/[!?.]+$/, "").trim(), now = nowS();
  const reply = (x, o) => luna(x, o);
  if (!low) return;
  if (low === "help" || low === "commands") return logMsg("luna", HELP);
  const cmdWord = /^(play|pause|resume|stop|next|skip|previous|prev|back|volume|mood|show|sort|note|city|outfit|wear|put|theme|sing|wardrobe|settings|remember|forget|take|dye|hair|weather|time|date|quote|joke|space|sit|walk|dance|laptop|game|read|phone|snack|sleep|stand|free|laugh|cry|angry|blush|twirl|wave|trip|fan|shiver|umbrella|help|like|shuffle|repeat|lyrics|add|new|clear|remind|glasses|headphones|talk|ponytail|twin|bob|call|what|call me)\b/.test(low);
  if (chat.pending && !cmdWord) return chatReply(t);
  const r = B.parseReminder(low);
  if (r) { reminders.add(r); renderNotes(); return reply(`Okay! I'll ${r.text.toLowerCase()} ${B.whenText(r.at)}. I stuck a note up so I don't forget.`); }
  let m = /^(?:sticky note|note|write (?:a )?(?:sticky )?note|stick a note)[: ]+(.+)/.exec(low);
  if (m) { reminders.add({ kind: "note", arg: m[1], at: null, text: m[1][0].toUpperCase() + m[1].slice(1) }); renderNotes(); return reply("Noted! It's on the wall."); }
  if (["clear notes", "clear sticky notes", "remove notes", "delete notes"].includes(low)) { reminders.clear(); renderNotes(); return reply("All sticky notes cleared."); }
  // music
  if (["pause", "stop"].includes(low)) { low === "stop" ? P.stop() : P.pause(); return reply("Okay, paused."); }
  if (["resume", "play", "continue", "unpause"].includes(low)) { if (P.current) P.resume(); else P.playIds(P.songs.map(s => s.id), "All songs"); return reply("Here we go!"); }
  if (["next", "skip", "next song"].includes(low)) { P.next(); return reply("Next one!"); }
  if (["previous", "prev", "back", "go back", "previous song"].includes(low)) { P.prev(); return reply("Going back."); }
  if (/^(like|love this|like this|like this song)$/.test(low)) { if (P.current) { P.toggleLike(P.current.id); beh.startEvent("love", now); } return reply(P.current ? "Added to your liked songs!" : "Play something first!"); }
  m = /^volume\s*(up|down|\d+)?%?$/.exec(low) || /^(?:set )?volume (?:to )?(\d+)/.exec(low);
  if (m) { let v = P.volume; const a = m[1]; if (a === "up") v += 0.15; else if (a === "down") v -= 0.15; else if (a) v = +a / 100; P.setVolume(v); return reply(`Volume ${Math.round(P.volume * 100)}%.`); }
  m = /^shuffle(?: (on|off))?$/.exec(low); if (m) { P.setShuffle(m[1] ? m[1] === "on" : !P.shuffle); return reply(`Shuffle ${P.shuffle ? "on" : "off"}.`); }
  m = /^repeat(?: (off|all|one))?$/.exec(low); if (m) { P.setRepeat(m[1] || { off: "all", all: "one", one: "off" }[P.repeat]); return reply(`Repeat ${P.repeat}.`); }
  m = /^shuffle (?:album|artist|playlist)\s+(.+)/.exec(low);
  if (m) { P.setShuffle(true); low2play(m[1], true); return; }
  m = /^play (?:the )?(album|artist|playlist|genre)\s+(.+)/.exec(low);
  if (m) return low2play(m[2], false, m[1]);
  m = /^play (?:song |track )?(.+)/.exec(low);
  if (m && !/\bin\s+\d/.test(low)) { const n = parseInt(m[1]); if (/^\d+$/.test(m[1].trim()) && P.songs[n - 1]) { const s = [...P.songs][n - 1]; P.playSong(s.id, P.songs.map(x => x.id), "All songs"); return reply(`Playing ${s.title}!`); } return quickPlay(m[1]); }
  m = /^(?:new playlist|create playlist|make a playlist)\s+(.+)/.exec(low); if (m) { const n = t.replace(/^(?:new playlist|create playlist|make a playlist)\s+/i, ""); return reply(P.newPlaylist(n) ? `Playlist "${n}" created.` : "That playlist already exists."); }
  m = /^add (?:this|it|this song)(?: to)?\s+(.+)/.exec(low); if (m) { const n = Object.keys(P.playlists).find(k => k.toLowerCase() === m[1].replace(/^(?:the )?playlist\s+/, "").trim()); if (!P.current) return reply("Play a song first."); if (!n) return reply("I don't have that playlist. Say 'new playlist <name>' first."); return reply(P.addToPlaylist(n, P.current.id) ? `Added to ${n}.` : "It's already there.") }
  m = /^(?:show|view|open|go to)\s+(?:my\s+)?(home|artists?|albums?|genres?|songs?|all songs|most played|recent(?:ly played)?|favou?rites?|liked(?: songs)?|likes|playlists?|library)/.exec(low);
  if (m || ["list", "songs", "library", "home"].includes(low)) { const w = m ? m[1] : low; lib.view = w.startsWith("artist") ? "Artists" : w.startsWith("album") ? "Albums" : w.startsWith("genre") ? "Genres" : w.startsWith("most") || w.startsWith("fav") ? "Most played" : w.startsWith("recent") ? "Recent" : w.startsWith("like") ? "Liked" : w.startsWith("playlist") ? "Playlists" : w === "home" ? "Home" : "Songs"; lib.detail = null; go("lib"); return; }
  if (low === "lyrics" || low === "show lyrics") { go("lyrics"); return; }
  if (/^(add|my) lyrics$/.test(low)) { go("lyrics"); $("#ly-edit").click(); return; }
  if (/^(wardrobe|closet|outfits|open wardrobe)$/.test(low)) { go("wardrobe"); return; }
  if (low === "settings") { openSettings(); return; }
  m = /^mood\s+(hype|happy|chill|sad|intense|auto)/.exec(low); if (m) { P.moodOverride = m[1] === "auto" ? null : m[1]; return reply(m[1] === "auto" ? "I'll feel the music myself." : `Okay, ${m[1]} mood!`); }
  m = /^talk\s+(on|off)/.exec(low); if (m) { voiceOn = m[1] === "on"; cfg.set("voice", voiceOn); return reply(voiceOn ? "I'll read my replies out loud." : "Okay, I'll stay quiet."); }
  // info
  m = /^(?:weather|forecast)(?: in (.+))?$/.exec(low) || /^what'?s the weather(?: in (.+))?/.exec(low);
  if (m) { const city = m[1] || cfg.get("city", ""); if (!city) return reply("Which city? Say 'city <name>' and I'll remember it."); return fetchWeather(city); }
  m = /^city\s+(.+)/.exec(t.toLowerCase()); if (m) { const c = t.replace(/^city\s+/i, ""); cfg.set("city", c); reply(`Okay, I'll use ${c}.`); return fetchWeather(c, true); }
  m = /^(?:call me|my name is)\s+(.+)/.exec(t.toLowerCase()); if (m) { const n = t.replace(/^(?:call me|my name is)\s+/i, ""); cfg.set("name", n); return reply(`Nice to meet you, ${n}!`); }
  if (/^(space fact|fun fact|tell me a space fact|fact)$/.test(low)) return reply(pick(B.DATA.SPACE_FACTS));
  m = /^remember (?:that )?(.+)/.exec(t.toLowerCase()); if (m) { chat.remember(t.replace(/^remember (?:that )?/i, "")); return reply("Got it, I'll remember that."); }
  if (/^what do you remember/.test(low)) return reply(chat.memory.length ? "I remember: " + chat.memory.slice(-8).join("; ") + "." : "Nothing yet. Tell me things with 'remember that ...'.");
  m = /^forget\s+(.+)/.exec(low); if (m) { const n = chat.forget(m[1]); return reply(n ? `Forgot ${n} thing${n > 1 ? "s" : ""}.` : "I didn't have that one."); }
  // look
  m = /^(?:theme|room)\s+(\w+)/.exec(low); if (m && THEMES[m[1]]) { cfg.set("theme", m[1]); cfg.set("season_on", false); applyLook(); return reply(`Okay, ${m[1]} room!`); }
  m = /^glasses\s*(on|off)?$/.exec(low); if (m) { wearToggle("glasses", m[1] ? m[1] === "on" : undefined); return reply(beh.glasses ? "Glasses on!" : "Glasses off."); }
  m = /^headphones\s*(on|off)?$/.exec(low); if (m) { wearToggle("headphones", m[1] ? m[1] === "on" : undefined); return reply(beh.headphones ? "Headphones on!" : "Headphones off."); }
  m = /^outfit(?:\s+(.+))?$/.exec(low);
  if (m) { if (!m[1]) { wearPreset(pick(Object.keys(W.PRESETS))); return; } const k = Object.keys(W.PRESETS).find(p => m[1].includes(p)); if (k) { wearPreset(k); return; } return reply("I don't know that outfit. Try: " + Object.keys(W.PRESETS).join(", ") + "."); }
  m = /^(?:take off|remove)\s+(?:my |the |her )?(.+)/.exec(low); if (m) { const f = W.findItem(m[1]); if (f && f[0] === "acc") { wearToggle(f[1], false); return reply(`Took off the ${f[1]}.`); } if (m[1].includes("glasses")) { wearToggle("glasses", false); return; } }
  if (/^(wear|put on|dye|hair|ponytail|twin|bob|change)\b/.test(low) || /\b(hair|ponytail|bob|pigtails|twin tails)\b/.test(low)) {
    const f = W.findItem(low); if (f) { if (f[0] === "acc") { wearToggle(f[1], true); return reply(`Wearing my ${f[1]}!`); } wearSet(f[0], f[1]); return; }
    if (/^(wear|put on)\b/.test(low)) return reply("I don't have that. Open my wardrobe to see everything.");
  }
  // actions and quotes
  const pa = B.parseAction(low);
  if (pa) {
    if (pa[0] === "say" || pa[0] === "quote") return reply(pa[1]);
    const act = pa[1]; if (act === "sing") { beh.sing_until = now + 12; beh.manual = null; beh.event = null; return reply("La la la~ here goes a little song!"); }
    if (act === "bed") { beh.setManual("bed", now); return reply(B.DATA.ACT_REPLIES.bed); }
    beh.setManual(act, now); if (act === "wave" || act === "ears") { } return reply(B.DATA.ACT_REPLIES[act] || "Okay!");
  }
  chatReply(t);
}
function low2play(name, shuf, kind) {
  const P = player, q = name.trim(); let g = null, label = "";
  const tryK = (k, list) => { if (!g && (!kind || kind === k)) { const f = P.findGroup(list, q); if (f) { g = f; label = k; } } };
  tryK("album", P.albums()); tryK("artist", P.artists()); tryK("genre", P.genres());
  if (!g && (!kind || kind === "playlist")) { const n = Object.keys(P.playlists).find(k => k.toLowerCase().includes(q)); if (n) { g = { name: n, list: P.playlists[n].map(i => P.byId.get(i)).filter(Boolean) }; label = "playlist"; } }
  if (!g || !g.list.length) return luna(`I couldn't find ${kind || "anything"} called "${q}".`);
  P.playIds(g.list.map(s => s.id), g.name, null, !!shuf); luna(`${shuf ? "Shuffling" : "Playing"} the ${label} ${g.name}. Only those songs will play.`);
}
async function chatReply(text) {
  const r = chat.reply(text);
  if (r === "__ASK__") { const ctx = player.current ? `They are listening to ${player.current.title} by ${player.current.artist}.` : ""; const a = await chat.askClaude(text, ctx); return luna(a); }
  if (r === "__PLAY_CHILL__") { const c = player.songs.filter(s => B.DATA && ["classical", "ambient", "lofi", "jazz", "acoustic", "piano", "chill", "folk", "instrumental"].some(k => (s.genre || "").toLowerCase().includes(k))); const l = c.length ? c : player.songs; if (l.length) { player.moodOverride = "chill"; player.playIds(l.map(s => s.id), "Chill"); return luna("Here's something calm for you."); } return luna("Add some songs and I'll play something calm!"); }
  if (r.startsWith("__BLUSH__")) { beh.startEvent("blush", nowS()); return luna(r.slice(9)); }
  if (r.startsWith("__LAUGH__")) { beh.startEvent("laugh", nowS()); return luna(r.slice(9)); }
  luna(r);
}
$("#chatform").onsubmit = e => { e.preventDefault(); const v = $("#chatin").value.trim(); if (!v) return; $("#chatin").value = ""; logMsg("me", v); runCommand(v); };
$("#quick").innerHTML = ["Weather", "Quote", "Joke", "Space fact", "Time", "Help", "Notes"].map(x => `<button class="chip">${x}</button>`).join("");
$("#quick").onclick = e => { const b = e.target.closest("button"); if (!b) return; const x = b.textContent; logMsg("me", x); runCommand(x === "Notes" ? "what do you remember" : x.toLowerCase()); };
// microphone
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $("#btn-mic");
  if (N.isNative) {
    let stopFn = null;
    mic.onclick = async () => {
      if (stopFn) { stopFn(); return; }
      if (!(await N.askMic())) return toast("I need the microphone permission to hear you.");
      mic.classList.add("on");
      stopFn = N.listen(v => { logMsg("me", v); runCommand(v); }, () => { stopFn = null; mic.classList.remove("on"); });
    };
    return;
  }
  if (!SR) { mic.classList.add("hidden"); return; }
  let rec = null;
  mic.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = navigator.language || "en-US"; rec.interimResults = false; mic.classList.add("on");
    rec.onresult = e => { const v = e.results[0][0].transcript; logMsg("me", v); runCommand(v); };
    rec.onend = rec.onerror = () => { rec = null; mic.classList.remove("on"); }; try { rec.start(); } catch (e) { rec = null; }
  };
})();

// ------------------------------------------------------------------ sticky notes and reminders
function renderNotes() { $("#notes").innerHTML = reminders.items.slice(-3).map(r => `<div class="sticky">${esc(r.text)}${r.at ? ` <small>(${B.whenText(r.at)})</small>` : ""}</div>`).join(""); }
function checkReminders() {
  for (const r of reminders.due()) {
    const P = player;
    if (r.kind === "pause") { P.pause(); luna("Pausing like you asked!"); } else if (r.kind === "stop") { P.stop(); luna("Stopping the music, as planned."); }
    else if (r.kind === "resume") { P.resume(); luna("Resuming!"); } else if (r.kind === "next") { P.next(); luna("Next song, as planned!"); }
    else if (r.kind === "play") quickPlay(r.arg); else { luna(`Reminder: ${r.text}`, { secs: 12 }); beh.startEvent("wave", nowS()); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { } try { if (Notification.permission === "granted") new Notification("Luna", { body: r.text }); } catch (e) { } }
    renderNotes();
  }
}

// ------------------------------------------------------------------ wardrobe
const CATS = [["Outfits", "preset"], ["Tops", "top"], ["Bottoms", "bottom"], ["Dresses", "dress"], ["Shoes", "shoes"], ["Socks", "socks"], ["Accessories", "acc"], ["Hair colour", "hair"], ["Hairstyle", "style"]];
let wcat = "preset";
$("#wcats").innerHTML = CATS.map(([n, k]) => `<button class="chip" data-k="${k}">${n}</button>`).join("");
$("#wcats").onclick = e => { const b = e.target.closest("button"); if (b) { wcat = b.dataset.k; renderWardrobe(true); } };
function swatch(slot, name) {
  if (slot === "preset") { const w = W.makeWear(name), it = W.DRESSES[w.dress] || W.TOPS[w.top], b = !w.dress ? W.BOTTOMS[w.bottom] : null; return [it.c, b ? b.c : it.d]; }
  if (slot === "hair") return [W.HAIR[name][0], W.HAIR[name][1]]; if (slot === "style") return ["#ff9fd3", "#e06aa8"];
  if (slot === "acc") return name === "glasses" ? ["#4a3a7a", "#6a5fb0"] : ["#ffb3d9", "#7a5af0"];
  const it = ({ top: W.TOPS, bottom: W.BOTTOMS, dress: W.DRESSES, shoes: W.SHOES, socks: W.SOCKS }[slot] || {})[name]; return it ? [it.c, it.d] : ["#3a3550", "#26223a"];
}
function renderWardrobe(rebuildChips) {
  if (tab !== "wardrobe") return;
  $$("#wcats .chip").forEach(c => c.classList.toggle("on", c.dataset.k === wcat));
  const names = wcat === "preset" ? Object.keys(W.PRESETS) : wcat === "acc" ? ["glasses", "headphones", ...W.ACCESSORIES.filter(a => a !== "glasses" && a !== "headphones")] : wcat === "hair" ? Object.keys(W.HAIR) : wcat === "style" ? W.STYLES : Object.keys({ top: W.TOPS, bottom: W.BOTTOMS, dress: W.DRESSES, shoes: W.SHOES, socks: W.SOCKS }[wcat]);
  const sel = n => wcat === "acc" ? (n === "glasses" ? beh.glasses : n === "headphones" ? beh.headphones : wear.acc.includes(n)) : wcat === "preset" ? false : wcat === "hair" ? wear.hair === n : wcat === "style" ? wear.style === n : wear[wcat] === n || (n === "none" && !wear[wcat]);
  $("#wgrid").innerHTML = names.map(n => { const [a, b] = swatch(wcat, n); return `<button class="wtile ${sel(n) ? "on" : ""}" data-n="${esc(n)}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${esc(n)}</button>`; }).join("");
}
$("#wgrid").onclick = e => { const b = e.target.closest(".wtile"); if (!b) return; const n = b.dataset.n; if (wcat === "preset") wearPreset(n); else if (wcat === "acc") wearToggle(n); else wearSet(wcat, n); };
$("#w-random").onclick = () => wearPreset(pick(Object.keys(W.PRESETS)));
const pctx = $("#wcanvas").getContext("2d"), pimg = pctx.createImageData(160, 184);
function drawPreview() {
  if (tab !== "wardrobe") return;
  const s = { bg: "#1d1b2e", glow: "#2b2745", v: 0, cx: 94, t: nowS(), sw: 1.2, sway: 0.8, amp: 0, bounce: 0, moving: false, mood: "idle", pose: "idle", sit: 0, walk_dir: 0, walk_phase: 0, blink: false, gaze: [0, 0], arms: "down", parts: [], hour: 12, minute: 0, expr: { eyes: "open", brows: "neutral", mouth: "smile", blush: 0.6 }, wear, theme: beh.theme, season: null, weather: "mild", glasses: beh.glasses, headphones: beh.headphones, speaking: false, lift: 0, lean: 0, look: [0, 0] };
  const p = pscene.render(s), W2 = p.w, d = pimg.data;
  for (let y = 0; y < 184; y++) { const si = ((y + 20) * W2 + 108) * 4; for (let x = 0; x < 160; x++) { const k = si + x * 4, o = (y * 160 + x) * 4; d[o] = p.a[k]; d[o + 1] = p.a[k + 1]; d[o + 2] = p.a[k + 2]; d[o + 3] = 255; } }
  pctx.putImageData(pimg, 0, 0);
}

// ------------------------------------------------------------------ settings
const themeSel = $("#s-theme"); themeSel.innerHTML = ["night", "sunset", "forest", "sakura"].map(t => `<option>${t}</option>`).join("");
function openSettings() {
  $("#s-name").value = cfg.get("name", ""); $("#s-city").value = cfg.get("city", ""); $("#s-hemi").value = cfg.get("hemi", "south"); themeSel.value = cfg.get("theme", "night");
  $("#s-season").checked = cfg.get("season_on", true); $("#s-voice").checked = voiceOn; $("#s-bed").value = beh.bedtime; $("#s-wake").value = beh.wake; $("#s-key").value = cfg.get("ai_key", "");
  $("#set-info").textContent = `${player.songs.length} songs saved on this phone.`;
  $("#s-vengine").value = cfg.get("voice_engine", "system"); fillVoices(); $("#s-vrate").value = Math.round(+cfg.get("voice_rate", 1) * 100); $("#s-vpitch").value = Math.round(+cfg.get("voice_pitch", 1.15) * 100);
  $("#s-elkey").value = cfg.get("el_key", ""); $("#s-elvoice").value = cfg.get("el_voice", ""); renderNative();
  $("#sheet-settings").classList.remove("hidden");
}
function fillVoices() {
  const vs = V.systemVoices(), sel = $("#s-vname"), cur = cfg.get("voice_name", "");
  sel.innerHTML = `<option value="">Automatic (best available)</option>` + vs.map(v => `<option value="${esc(v.name)}">${esc(v.name)}</option>`).join(""); sel.value = cur;
}
try { speechSynthesis.onvoiceschanged = () => { if (!$("#sheet-settings").classList.contains("hidden")) fillVoices(); }; } catch (e) { }
async function renderNative() {
  $("#native-box").classList.toggle("hidden", !N.isNative); if (!N.isNative) return;
  const st = await N.refreshStatus(), set = (id, ok, yes, no, btn) => { $("#p-" + id).textContent = ok ? yes : no; const b = $("#p-" + id + "b"); if (b) b.classList.toggle("hidden", ok && !btn); };
  $("#p-audio").textContent = st.audio ? "Allowed. Tap Scan phone to add your songs." : "Allow it when asked, then Luna finds your songs.";
  set("mic", st.mic, "Allowed", "Needed for the mic button"); set("listener", st.listener, "On. Luna dances to Spotify, YouTube and more.", "Off. Opens a settings page, switch Luna on there. Samsung: if it is greyed out, go to Settings > Apps > Luna > ⋮ (top right) > Allow restricted settings, then try again.");
  set("overlay", st.overlay, "Allowed", "Needed to float over other apps"); $("#s-island").checked = !!st.island;
}
$("#p-micb").onclick = async () => { await N.askMic(); renderNative(); };
$("#p-listenerb").onclick = () => { N.openListenerSettings(); };
$("#p-overlayb").onclick = () => { N.openOverlaySettings(); };
$("#s-island").onchange = async e => { await N.setIsland(e.target.checked); pushArt(); renderNative(); };
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#sheet-settings").classList.contains("hidden")) renderNative(); });
$("#v-test").onclick = () => { saveVoice(); V.speak("Hi! This is how I sound. Do you like it?", { start: () => beh.speaking = true, end: () => beh.speaking = false, error: m => toast(m) }); };
function saveVoice() {
  cfg.set("voice_engine", $("#s-vengine").value); cfg.set("voice_name", $("#s-vname").value); cfg.set("voice_rate", $("#s-vrate").value / 100); cfg.set("voice_pitch", $("#s-vpitch").value / 100);
  cfg.set("el_key", $("#s-elkey").value.trim()); cfg.set("el_voice", $("#s-elvoice").value.trim());
}
function closeSettings() {
  cfg.set("name", $("#s-name").value.trim()); const city = $("#s-city").value.trim(), oc = cfg.get("city", ""); cfg.set("city", city); cfg.set("hemi", $("#s-hemi").value); cfg.set("theme", themeSel.value);
  cfg.set("season_on", $("#s-season").checked); voiceOn = $("#s-voice").checked; cfg.set("voice", voiceOn);
  beh.bedtime = +$("#s-bed").value || 22; beh.wake = +$("#s-wake").value || 6; cfg.set("bedtime", beh.bedtime); cfg.set("wake", beh.wake); cfg.set("ai_key", $("#s-key").value.trim());
  saveVoice(); applyLook(); $("#sheet-settings").classList.add("hidden"); if (city && city !== oc) fetchWeather(city, false);
}
$("#btn-settings").onclick = openSettings; $("#set-close").onclick = closeSettings;
$("#set-clear").onclick = async () => { if (!confirm("Remove every song from Luna on this phone? Your files stay where they are.")) return; player.stop(); await player.clear?.(); for (const s of [...player.songs]) await player.remove(s.id); toast("Library cleared"); $("#set-info").textContent = "0 songs saved on this phone."; };
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; const b = document.createElement("button"); b.className = "pill"; b.textContent = "Install Luna on this phone"; b.onclick = async () => { installEvt.prompt(); installEvt = null; b.remove(); }; $("#set-info").after(b); });

// ------------------------------------------------------------------ room: actions and touch
const ACTS = [["Dance", "dance"], ["Sing", "sing"], ["Snack", "snack"], ["Sleep", "bed"], ["Laptop", "laptop"], ["Game", "game"], ["Read", "read"], ["Phone", "phone"], ["Call", "call"], ["Walk", "walk"], ["Wave", "wave"], ["Twirl", "twirl"], ["Laugh", "laugh"], ["Blush", "blush"], ["Cry", "cry"], ["Angry", "angry"], ["Trip", "stumble"], ["Free", "free"]];
$("#actions").innerHTML = ACTS.map(([l, a]) => `<button class="chip" data-a="${a}">${l}</button>`).join("");
$("#actions").onclick = e => { const b = e.target.closest("button"); if (b) runCommand(b.dataset.a === "stumble" ? "trip" : b.dataset.a); };
const L = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 190, (e.clientY - r.top) / r.height * 110]; };
let drag = null, lastTap = 0;
stage.addEventListener("pointerdown", e => {
  const [x, y] = L(e), now = nowS(); beh.pointer_t = now; stage.setPointerCapture(e.pointerId);
  drag = { x0: e.clientX, y0: e.clientY, lx: x, ly: y, moved: false, near: Math.abs(x - beh.cx) < 26 && y > 14 && y < 100 };
});
stage.addEventListener("pointermove", e => {
  const [x, y] = L(e), now = nowS(); beh.pointer_t = now;
  const hd = scene.head || [94, 18]; beh.pointer_rel = [x - hd[0], y - (hd[1] + 31)];
  if (!drag || !drag.near) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
  drag.moved = true; beh.held = true; beh.drag_x = Math.max(beh.world[0], Math.min(beh.world[1], x)); beh.drag_lift = Math.max(0, (drag.ly - y) * 0.9 + 4);
});
function endDrag(e) {
  if (!drag) return; const now = nowS(), [x, y] = L(e);
  if (drag.moved) { beh.held = false; say(pick(["Whee!", "Put me down gently!", "Heehee, that was fun!"]), 2.5); }
  else if (drag.near) { if (now - lastTap < 0.35) beh.startEvent("twirl", now); else beh.startEvent(pick(["wave", "blush", "laugh", "twirl", "love"]), now); lastTap = now; }
  else furniture(x, y);
  drag = null;
}
stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", () => { beh.held = false; drag = null; });
function furniture(x, y) {
  const now = nowS();
  if (x > 3 && x < 34 && y > 55 && y < 93) return runCommand("game");
  if (x > 146 && y > 66) return runCommand("laptop");
  if (x > 68 && x < 119 && y > 62 && y < 94) return runCommand("sleep");
  if (x > 117 && x < 138 && y > 76 && y < 94) return runCommand("snack");
  if (x > 84 && x < 114 && y > 8 && y < 38) { return beh.weather ? luna(B.weatherText(beh.weather)) : (cfg.get("city", "") ? fetchWeather(cfg.get("city", "")) : luna("Set your city in Settings and I'll tell you the weather.")); }
  if (x > 4 && x < 24 && y > 4 && y < 24) return luna(B.timeText());
}

// music from other apps (Spotify, YouTube...) shown in the player bar
let extShown = false;
function syncExternalUI(audio) {
  const on = !!(audio && audio.external);
  if (on) {
    extShown = true; const t = N.ext.title || "Playing", sub = (N.ext.artist || "Another app") + " · from another app";
    $("#mini-title").textContent = $("#nc-title").textContent = t; $("#mini-sub").textContent = $("#nc-sub").textContent = sub;
    setIcon("#mini-play", N.ext.playing ? I.pause : I.play); setCover($("#mini-cover"), null, "♪"); setCover($("#nc-cover"), null, "♪");
  } else if (extShown) { extShown = false; lastSong = undefined; refreshPlayerUI(); }
}
const extActive = () => N.isNative && !player.playing && N.ext.has && N.ext.pkg !== N.ext.ownPkg;
// ------------------------------------------------------------------ main loop
let last = nowS(), frame = 0, remT = 0;
function loop() {
  const now = nowS(), dt = Math.min(0.1, now - last); last = now; frame++;
  let audio = player.listen(now); beh.volume = player.volume;
  if (N.isNative && !player.playing) { const x = N.externalAudio(now); if (x) audio = x; }
  beh.update(now, dt, audio, null);
  const s = beh.sceneState(now), p = scene.render(s);
  img.data.set(p.a); sctx.putImageData(img, 0, 0);
  const [bt, until] = beh.bubble, bub = $("#bubble"); if (bt && now < until) { if (bub.textContent !== bt) bub.textContent = bt; bub.classList.remove("hidden"); } else bub.classList.add("hidden");
  if (frame % 6 === 0) {
    const a = player.audio, d = a.duration, c = a.currentTime;
    if (isFinite(d) && d > 0) { $("#mprog-fill").style.width = (c / d * 100) + "%"; if (!seeking) seek.value = c / d * 1000; $("#now-t0").textContent = fmt(c); $("#now-t1").textContent = fmt(d); }
    else { $("#mprog-fill").style.width = "0"; }
    syncExternalUI(audio);
    const mood = $("#nc-mood"); if (player.playing && !audio.paused) { const bpm = player.tracker.bpm; mood.textContent = `Mood: ${beh.mood}${bpm ? " · ~" + Math.round(bpm) + " BPM" : ""}`; } else mood.textContent = "";
  }
  if (tab === "lyrics" && frame % 4 === 0) followLyrics();
  if (tab === "wardrobe" && frame % 20 === 0) drawPreview();
  if (now - remT > 1) { remT = now; checkReminders(); }
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------------ start
(async function init() {
  applyLook(); pushArt(); go("room"); renderNotes(); refreshPlayerUI(); $("#now-vol").value = player.volume * 100;
  await player.load(); player.restoreResume(); refreshPlayerUI();
  logMsg("luna", `Hi${cfg.get("name", "") ? " " + cfg.get("name", "") : ""}! I'm Luna. ${player.songs.length ? "Tap a song and I'll dance to it." : "Add some songs from your phone in the Library tab and I'll dance to them."} Type 'help' to see what I can do.`);
  if (N.isNative) {
    N.onControl(act => { if (act === "next") player.next(); else if (act === "prev") player.prev(); else if (act === "pause") player.pause(); else if (act === "play") player.resume(); else player.toggle(); });
    let lastNow = "";
    player.addEventListener("change", () => { const s = player.current, p = !!(s && player.playing && !player.audio.paused), k = (s ? s.id : "") + p; if (k === lastNow) return; lastNow = k; N.setNow(s ? (s.title || s.name) : "", s ? s.artist : "", p); });
    player.audio.addEventListener("pause", () => player.dispatchEvent(new Event("change")));
    N.askAllOnce(kv).then(() => { if (!kv.get("tipped", false)) { kv.set("tipped", true); toast("Open Settings > Phone powers to finish: Notification access and Display over other apps"); } });
  }
  if (cfg.get("city", "")) fetchWeather(cfg.get("city", ""), false);
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { } }
  if (window.__lunaTest) window.__luna = { beh, player, scene, runCommand, go, wearPreset, B };
  requestAnimationFrame(loop);
})();
