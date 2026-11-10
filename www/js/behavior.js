// behavior.js - what Luna is doing, where she is and how she feels (port of luna_behavior.py)
import { CENTER, DESK_X, GAME_X, SLEEP_X, SNACK_X, BED_X0, pmod } from "./pix.js";
import { SEASON_THEME } from "./wear.js";

export const ACTIVE = ["hype", "happy", "chill", "sad", "intense"];
export const DEFAULT_BPM = { hype: 128, happy: 105, chill: 72, sad: 66, intense: 140 };
export const MOODS = {
  hype: { bg: "#3d1a5e", glow: "#7a2fa8", bounce: 16, sw: 6.0, sway: 9, arms: "up" },
  happy: { bg: "#2e2450", glow: "#5a3d8f", bounce: 9, sw: 3.5, sway: 6, arms: "wave" },
  chill: { bg: "#1b2540", glow: "#2f4a7a", bounce: 3, sw: 1.4, sway: 8, arms: "lap" },
  sad: { bg: "#1c1f33", glow: "#2c3a5c", bounce: 2, sw: 1.0, sway: 2, arms: "down" },
  intense: { bg: "#3a1822", glow: "#8a2a3a", bounce: 12, sw: 5.0, sway: 5, arms: "pump" },
  idle: { bg: "#1d1b2e", glow: "#2b2745", bounce: 0, sw: 1.2, sway: 3, arms: "down" },
  paused: { bg: "#1d1b2e", glow: "#2b2745", bounce: 0, sw: 1.2, sway: 3, arms: "down" },
};
export const MOOD_LINES = {
  hype: ["Ooh, this one's got energy!", "Okay, now we're dancing!", "I can't sit still to this!"],
  happy: ["Love this vibe!", "This one's so fun~", "Mm-hm, good pick!"],
  chill: ["Mmm... nice and calm.", "So relaxing...", "I could listen to this all day."],
  sad: ["This one hits right in the feels...", "So pretty... and a little sad.", "*sniff* ...I'm fine."],
  intense: ["Turn it up!", "Whoa, this is intense!", "Feel that power!"],
};
const GENRE_MOODS = [
  ["hype", ["edm", "electronic", "dance", "house", "techno", "trance", "dubstep", "drum", "bass", "hip hop", "hip-hop", "hiphop", "rap", "trap", "club", "remix", "amapiano", "gqom"]],
  ["intense", ["rock", "metal", "punk", "hardcore", "grunge", "industrial"]],
  ["chill", ["classical", "ambient", "lofi", "lo-fi", "jazz", "acoustic", "folk", "instrumental", "soundtrack", "new age", "piano", "chill", "sleep", "meditation"]],
  ["sad", ["blues", "sad", "emo", "ballad", "melancholy"]],
  ["happy", ["pop", "indie", "disco", "funk", "reggae", "country", "soul", "r&b", "rnb", "gospel", "k-pop", "kpop", "latin", "afro", "kwaito"]],
];
export function genreMood(genre) {
  const g = (genre || "").toLowerCase(); if (!g) return null;
  for (const [m, keys] of GENRE_MOODS) if (keys.some(k => g.includes(k))) return m;
  return null;
}
export function classify(bpm, energy) {
  if (bpm >= 118 && energy >= 0.10) return "hype";
  if (bpm >= 95 && energy >= 0.18) return "intense";
  if (energy < 0.08 || (bpm < 90 && energy < 0.12)) return "chill";
  if (bpm < 88) return "sad";
  return "happy";
}
const SITTING = ["sit", "laptop", "game", "read", "phone"];
export const EVENT_DUR = { cry: 4.0, laugh: 3.0, angry: 3.5, blush: 3.5, twirl: 1.6, wave: 3.0, stumble: 2.8, ears: 4.0, cupear: 4.0, love: 3.0, ouch: 1.4 };
const EVENT_POSE = { cry: "cry", laugh: "laugh", angry: "angry", blush: "blush", twirl: "twirl", wave: "wave", stumble: "stumble", ears: "ears", cupear: "cupear", love: "idle", ouch: "idle" };
const SNACKS = ["cookie", "donut", "cake"];
const POSE_EXPR = {
  read: { eyes: "open", brows: "soft", mouth: "smile", blush: 0.5 }, phone: { eyes: "open", brows: "neutral", mouth: "smile", blush: 0.6 },
  call: { eyes: "happy", brows: "up", mouth: "smile", blush: 0.7 }, snack: { eyes: "happy", brows: "up", mouth: "chew", blush: 0.8, puff: true },
  fan: { eyes: "sad", brows: "sad", mouth: "grimace", blush: 0.3, sweat: true }, shiver: { eyes: "squint", brows: "soft", mouth: "wobble", blush: 0.3 },
  sing: { eyes: "closed", brows: "up", mouth: "sing", blush: 0.8 }, bed: { eyes: "closed", brows: "soft", mouth: "smile", blush: 0.6 },
  umbrella: { eyes: "open", brows: "neutral", mouth: "smile", blush: 0.5 }, laptop: { eyes: "open", brows: "neutral", mouth: "smile", blush: 0.5 },
};
const EVENT_EXPR = {
  cry: { eyes: "cry", brows: "sad", mouth: "wobble", blush: 0.3 }, laugh: { eyes: "happy", brows: "up", mouth: "laugh", blush: 0.9 },
  angry: { eyes: "open", brows: "angry", mouth: "pout", blush: 0.6, puff: true, vein: true, steam: true },
  blush: { eyes: "closed", brows: "soft", mouth: "smile", blush: 1.0 }, twirl: { eyes: "star", brows: "up", mouth: "sing", blush: 0.9 },
  wave: { eyes: "happy", brows: "up", mouth: "smile", blush: 0.8 }, ears: { eyes: "squint", brows: "sad", mouth: "grimace", blush: 0.3 },
  cupear: { eyes: "open", brows: "soft", mouth: "o", blush: 0.5 }, love: { eyes: "love", brows: "up", mouth: "smile", blush: 0.95 },
  ouch: { eyes: "squint", brows: "sad", mouth: "o", blush: 0.4, sweat: true },
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function weighted(obj) {
  const ks = Object.keys(obj), tot = ks.reduce((s, k) => s + obj[k], 0); let r = Math.random() * tot;
  for (const k of ks) { r -= obj[k]; if (r <= 0) return k; } return ks[0];
}

export class Behavior {
  constructor(now) {
    this.mood = "idle"; this.cx = CENTER; this.tx = CENTER; this.sit = 0; this.pose = "idle";
    this.walk_phase = 0; this.walk_dir = 0; this.walk_retarget = 0;
    this.manual = null; this.manual_until = 0; this.auto_pose = "stand"; this.auto_until = 0;
    this.event = null; this.held = false; this.lift = 0; this.lean = 0; this.drag_x = CENTER; this.drag_lift = 0;
    this.look = [0, 0]; this.pointer_rel = [0, 0]; this.pointer_t = 0;
    this.snack = "cookie"; this.eat = 0; this.eating = false; this.weather = null;
    this.vol_react_at = now + 20; this.bounce = 0; this.env_s = 0;
    this.parts = []; this.next_spawn = 0; this.surprise_until = 0;
    this.bubble = ["", 0]; this.expr = { eyes: "open", brows: "neutral", mouth: "omega", blush: 0.5 };
    this.sing_until = 0; this.theme = "night"; this.season = null; this.wear = null;
    this.glasses = false; this.headphones = true; this.speaking = false;
    this.bedtime = 22; this.wake = 6; this.nowPlaying = { playing: false, paused: false, index: -1 };
    this.world = [48, 125]; this.walk_spots = [48, 62, 78, 94, 110, 126];
    this.onWake = null; this.onSongStart = null; this.prev = [-1, false, false];
    this.mood_override = null; this.volume = 0.7; this.beatQueue = 0; this.level = 0; this.analysisMood = null;
  }
  say(text, now, secs = 4.5) { this.bubble = [text, now + secs]; }
  spawn(kind, x, y, color, vx = null, vy = null, life = 1.6) {
    this.parts.push([x, y, vx ?? rnd(-4, 4), vy ?? rnd(-14, -8), life, kind, color]);
  }
  burst(kind, color, n = 6, spread = 18, y0 = 24, y1 = 60) {
    for (let i = 0; i < n; i++) this.spawn(kind, this.cx + rnd(-spread, spread), rnd(y0, y1), color, null, rnd(-12, -5), rnd(1.0, 1.8));
  }
  isNight() { const h = new Date().getHours(); return h >= this.bedtime || h < this.wake; }
  startEvent(kind, now) {
    this.event = { kind, start: now, end: now + EVENT_DUR[kind] };
    this.manual = null; this.auto_until = 0; this.surprise_until = 0;
    if (kind === "blush" || kind === "love") this.burst("heart", "#ff6fa8", 7, 16, 20, 50);
    else if (kind === "laugh") this.burst("note", "#ffe66b", 4, 18, 22, 50);
    else if (kind === "angry") this.burst("vein", "#ff4f6d", 2, 10, 24, 36);
    else if (kind === "twirl") this.burst("spark", "#ffffff", 8, 24, 30, 80);
    else if (kind === "ouch") this.burst("small", "#ffe66b", 3, 12, 26, 40);
  }
  setManual(act, now) {
    if (act in EVENT_DUR) this.startEvent(act, now);
    else if (act === "free") { this.manual = null; this.manual_until = 0; this.event = null; this.auto_until = 0; }
    else {
      this.manual = act; this.manual_until = now + (act === "bed" ? 900 : 90); this.event = null;
      if (act === "snack") { this.snack = pick(SNACKS); this.eat = 0; }
    }
  }
  reactVolume(v, old, now) {
    const P = this.nowPlaying;
    if (!(P.playing && !P.paused) || this.held || (this.event && now < this.event.end)) return;
    if (v >= 0.9 && old < 0.9) { this.startEvent("ears", now); this.say("Too loud!!", now, 3); }
    else if (v <= 0.08 && old > 0.08) { this.startEvent("cupear", now); this.say("Huh? I can't hear it...", now, 3); }
  }
  choosePose(now) {
    const P = this.nowPlaying;
    if (this.held) return "held";
    if (this.event) { if (now < this.event.end) return EVENT_POSE[this.event.kind]; this.event = null; }
    if (this.manual && now < this.manual_until) return this.manual;
    if (P.playing && !P.paused) {
      if (this.mood === "chill") return (P.index % 2) ? "read" : "laptop";
      return { hype: "dance", happy: "dance", intense: "dance", sad: "sit" }[this.mood] || "dance";
    }
    if (now < this.sing_until) return "sing";
    if (this.isNight()) return "bed";
    if (now > this.auto_until) {
      const wk = (this.weather && this.weather.kind) || "mild";
      const pool = { stand: 2, walk: 3, sit: 2, laptop: 2, game: 2, read: 2, phone: 1, call: 1, snack: 3, dance: 1 };
      if (wk === "hot") pool.fan = 5;
      else if (wk === "cold") { pool.shiver = 4; pool.read += 2; }
      else if (wk === "rain" || wk === "storm") { pool.read += 3; pool.sit += 2; }
      else if (wk === "snow") pool.shiver = 3;
      delete pool[this.auto_pose];
      this.auto_pose = weighted(pool);
      if (this.auto_pose === "snack") { this.snack = pick(SNACKS); this.eat = 0; }
      this.auto_until = now + rnd(14, 26);
    }
    return this.auto_pose;
  }
  move(want, now, dt) {
    const arrived = { stand: "idle", walk: "idle", free: "idle" }[want] || want;
    if (want === "held") {
      this.cx += (this.drag_x - this.cx) * Math.min(1, dt * 14); this.pose = "held"; this.sit = 0; this.walk_dir = 0; return;
    }
    let goal;
    if (want === "walk") {
      if (Math.abs(this.cx - this.tx) < 1 || now > this.walk_retarget) {
        const spots = this.walk_spots.filter(x => Math.abs(x - this.cx) > 6);
        this.tx = pick(spots.length ? spots : [94]); this.walk_retarget = now + 6;
      }
      goal = this.tx;
    } else if (want === "laptop") goal = DESK_X;
    else if (want === "game") goal = GAME_X;
    else if (want === "snack") goal = SNACK_X - 14;
    else if (want === "bed") goal = SLEEP_X;
    else if (["sit", "read", "phone"].includes(want)) { const [lo, hi] = this.world; goal = (lo <= this.cx && this.cx <= hi) ? this.cx : (lo + hi) / 2; }
    else if (want === "dance") goal = CENTER;
    else goal = this.cx;
    if (want === "bed" && Math.abs(this.cx - SLEEP_X) <= 0.8 && this.sit < 0.2) { this.pose = "bed"; this.sit = 0; this.walk_dir = 0; return; }
    if (want === "stumble") goal = this.cx;
    const dx = goal - this.cx;
    let tsit;
    if (Math.abs(dx) > 0.6) {
      this.cx += Math.sign(dx) * Math.min(Math.abs(dx), 21 * dt); this.walk_phase += dt * 11; this.walk_dir = Math.sign(dx); this.pose = "walk"; tsit = 0;
    } else {
      this.walk_dir = 0; this.pose = arrived; tsit = SITTING.includes(want) ? 1 : 0;
      if (want === "stumble" && this.event) { const prog = (now - this.event.start) / (this.event.end - this.event.start); tsit = prog > 0.45 ? 1 : 0; }
    }
    this.sit += (tsit - this.sit) * Math.min(1, dt * 6);
    this.lean = 0;
    if (this.pose === "stumble" && this.event) {
      const prog = (now - this.event.start) / (this.event.end - this.event.start);
      if (prog < 0.45) this.lean = 6 * Math.sin(Math.min(prog / 0.45, 1) * Math.PI / 2);
      else if (prog < 0.65) this.lean = 6 * (1 - (prog - 0.45) / 0.2);
    }
  }
  // audio: { playing, paused, index, title, level (0..1), beat (bool), mood }
  // ---- pet companion
  setPet(kind, color, name) {
    if (!kind) { this.pet = null; return; }
    const old = this.pet || {};
    this.pet = { kind, color: color | 0, name: name || "", x: old.x || 150, dir: old.dir || 1, state: "sit", hop: 0, heart: 0, goal: old.x || 150, until: 0 };
  }
  petTap(now) { if (!this.pet) return null; this.pet.heart = 1; this.pet.hop = 0.5; return this.pet; }
  updatePet(now, dt, beat, sleeping) {
    const p = this.pet; if (!p) return;
    if (p.hop > 0) p.hop = Math.max(0, p.hop - dt); if (p.heart > 0) p.heart = Math.max(0, p.heart - dt * 0.7);
    if (beat && this.pose === "dance" && p.state !== "sleep") p.hop = Math.max(p.hop, 0.35);
    const n = new Date(), late = n.getHours() >= 22 || n.getHours() < 6;
    if (sleeping || late) { if (p.state !== "sleep") { p.goal = 82; } if (Math.abs(p.x - p.goal) < 1.5 && p.goal === 82) p.state = "sleep"; }
    else if (p.state === "sleep") { p.state = "sit"; p.until = now + 1; }
    if (p.state !== "sleep" && now >= p.until && !(sleeping || late)) {
      p.until = now + 3 + Math.random() * 6;
      p.goal = Math.random() < 0.4 ? Math.max(30, Math.min(180, this.cx + (Math.random() < 0.5 ? -16 : 16))) : 30 + Math.random() * 150;
    }
    const dx = p.goal - p.x;
    if (Math.abs(dx) > 1.2) { p.state = p.state === "sleep" ? "walk" : "walk"; p.dir = dx > 0 ? 1 : -1; p.x += Math.sign(dx) * Math.min(Math.abs(dx), 13 * dt); }
    else if (p.state === "walk") p.state = "sit";
  }
  update(now, dt, audio, pointer) {
    const P = this.nowPlaying = audio;
    const [pi, pp, ppa] = this.prev;
    if (P.playing && !P.paused && (P.index !== pi || !pp)) { this.surprise_until = now + 0.8; this.bounce = 0.5; this.manual = null; if (this.onSongStart) this.onSongStart(now); }
    else if (P.playing && P.paused && !ppa) this.say("Paused... I'll be right here.", now);
    else if (P.playing && !P.paused && ppa) { this.say("Yay, we're back!", now); this.surprise_until = now + 0.6; }
    else if (!P.playing && pp) this.say("Stopped. Play something else?", now);
    this.prev = [P.index, P.playing, P.paused];
    if (!P.playing) this.mood = "idle"; else if (P.paused) this.mood = "paused"; else this.mood = this.mood_override || P.mood || "happy";
    if (this.pendingLine && this.mood in MOOD_LINES && now >= this.surprise_until && P.playing && !P.paused && P.mood) { this.say(pick(MOOD_LINES[this.mood]), now); this.pendingLine = false; }
    let v = 0, beat = false;
    if (P.playing && !P.paused && ACTIVE.includes(this.mood)) { v = P.level || 0; beat = !!P.beat; }
    else if (this.speaking || this.pose === "sing") v = 0.5 + 0.5 * Math.sin(now * 9);
    this.env_s += (v - this.env_s) * Math.min(1, dt * 18);
    this.updatePet(now, dt, beat, this.pose === "bed");
    const want = this.choosePose(now), prevPose = this.pose;
    this.move(want, now, dt);
    if (prevPose === "bed" && this.pose !== "bed" && this.onWake) this.onWake(now);
    if (this.pose === "snack") {
      this.eating = true; this.eat += dt / 9;
      if (this.eat >= 1) {
        this.eat = 0; this.eating = false; this.burst("heart", "#ff9fd3", 3, 10, 30, 50);
        this.say(pick(["Yummy!", "So good~", "More please!"]), now, 2.5);
        this.snack = SNACKS[(SNACKS.indexOf(this.snack) + 1) % 3];
        if (this.manual === "snack") this.manual = null; this.auto_until = 0;
      }
    } else this.eating = false;
    const tl = this.held ? Math.min(36, Math.max(0, this.drag_lift)) : 0;
    this.lift += (tl - this.lift) * Math.min(1, dt * 16);
    if (beat) { this.bounce = 1; this.beatFx(); }
    this.bounce *= Math.exp(-dt * 7);
    if (now > this.next_spawn) {
      if (this.mood === "chill") { this.spawn("note", this.cx + rnd(-20, 20), 24, "#9bd1ff", rnd(-2, 2), -6, 2.6); this.next_spawn = now + 1.3; }
      else if (this.mood === "paused" || this.pose === "bed") { this.spawn("z", this.pose !== "bed" ? this.cx : BED_X0 + 26, this.pose !== "bed" ? 26 : 58, "#cdb8ff", 3, -6, 2.4); this.next_spawn = now + 1.3; }
      else if (this.pose === "sing") { this.spawn("note", this.cx + rnd(-22, 22), rnd(20, 40), pick(["#ff9fd3", "#9bd1ff", "#ffe66b"]), null, -9, 1.8); this.next_spawn = now + 0.35; }
      else if (this.pose === "cry") this.next_spawn = now + 0.5;
      else this.next_spawn = now + 0.3;
    }
    for (const p of this.parts) { p[0] += p[2] * dt; p[1] += p[3] * dt; p[4] -= dt; }
    this.parts = this.parts.filter(p => p[4] > 0);
    const [lx, ly] = this.pointer_rel;
    let target = [Math.max(-1, Math.min(1, lx / 70)), Math.max(-1, Math.min(1, ly / 50))];
    if (this.pose === "bed" || this.held) target = [0, 0];
    this.look = [this.look[0] + (target[0] - this.look[0]) * Math.min(1, dt * 7), this.look[1] + (target[1] - this.look[1]) * Math.min(1, dt * 7)];
    this.expr = this.pickExpr(now);
  }
  beatFx() {
    const m = this.mood, x = this.cx + rnd(-26, 26), y = 22 + rnd(-6, 18); let kind, col;
    if (m === "hype") [kind, col] = pick([["spark", "#ffe66b"], ["note", "#34c4f2"], ["note", "#ff9fd3"], ["spark", "#ffffff"]]);
    else if (m === "happy" && Math.random() < 0.7) [kind, col] = pick([["note", "#34c4f2"], ["heart", "#ff6fa8"], ["note", "#ffe66b"]]);
    else if (m === "intense" && Math.random() < 0.8) [kind, col] = pick([["spark", "#ff8a3d"], ["note", "#ff5f6d"]]);
    else return;
    this.spawn(kind, x, y, col);
  }
  pickExpr(now) {
    const pose = this.pose, wk = (this.weather && this.weather.kind) || "mild";
    if (this.held) return { eyes: "surprised", brows: "up", mouth: "o", blush: 0.6 };
    if (this.event && now < this.event.end) {
      const k = this.event.kind;
      if (k === "stumble") { const prog = (now - this.event.start) / (this.event.end - this.event.start); return { eyes: prog < 0.45 ? "surprised" : "dizzy", brows: prog < 0.45 ? "up" : "soft", mouth: "o", blush: 0.5, sweat: prog > 0.45 }; }
      return { ...EVENT_EXPR[k] };
    }
    if (now < this.surprise_until) return { eyes: "surprised", brows: "up", mouth: "o", blush: 0.6 };
    const m = this.mood;
    if (m === "idle" && this.tired && !["bed", "dance"].includes(pose)) return { eyes: "sleepy", brows: "soft", mouth: pmod(now, 12) > 10 ? "sing" : "flat", blush: 0.4 };
    if (m === "idle") {
      let e = { ...(POSE_EXPR[pose] || { eyes: pmod(now, 9) > 7.8 ? "wink" : "open", brows: "neutral", mouth: "omega", blush: 0.5 }) };
      if (pose === "game") { const alt = Math.trunc(now / 4) % 2; e = { eyes: "open", brows: alt ? "angry" : "up", mouth: alt ? "grin" : "sing", blush: 0.5 }; }
      else if (pose === "sit") e = { eyes: Math.trunc(now / 5) % 3 === 0 ? "closed" : "open", brows: "soft", mouth: "smile", blush: 0.6 };
      if (wk === "hot" && ["idle", "walk", "sit", "laptop", "read", "phone", "game"].includes(pose)) e.sweat = true;
      if (wk === "cold" && ["idle", "walk", "sit"].includes(pose)) { e.eyes = "squint"; e.mouth = "wobble"; }
      return e;
    }
    if (m === "paused") return { eyes: "sleepy", brows: "soft", mouth: "flat", blush: 0.4 };
    if (m === "hype") return { eyes: pmod(now, 8) > 7.0 ? "wink" : "star", brows: "up", mouth: "sing", blush: 0.95 };
    if (m === "happy") return Math.trunc(now / 3.2) % 2 === 0 ? { eyes: "happy", brows: "up", mouth: "sing", blush: 0.8 } : { eyes: "open", brows: "neutral", mouth: "omega", blush: 0.7 };
    if (m === "chill") return { eyes: pmod(now, 12) > 10.2 ? "sleepy" : (pose !== "read" ? "closed" : "open"), brows: "soft", mouth: "smile", blush: 0.6 };
    if (m === "sad") return { eyes: "sad", brows: "sad", mouth: "frown", blush: 0.15 };
    return { eyes: "open", brows: "angry", mouth: "grin", blush: 0.3 };
  }
  sceneState(now) {
    const P = MOODS[this.mood], dance = this.pose === "dance", pose = this.pose;
    let gaze = [0, 0];
    if (["laptop", "read", "phone"].includes(pose)) gaze = [0, 1.6]; else if (pose === "game") gaze = [-1.8, 0.2];
    else if (pose === "cupear") gaze = [2.0, 0]; else if (this.walk_dir) gaze = [this.walk_dir * 1.6, 0];
    const active = (now - this.pointer_t) < 5 && pose !== "bed" && pose !== "held";
    if (active) gaze = [this.look[0] * 2.4, this.look[1] * 1.7];
    const n = new Date();
    return {
      bg: P.bg, glow: P.glow, v: this.env_s, cx: this.cx, t: now, sw: P.sw, sway: P.sway * 0.28,
      amp: P.bounce * (dance ? 0.3 : 0.08), bounce: this.bounce, moving: ACTIVE.includes(this.mood) && dance, mood: this.mood, pose, sit: this.sit,
      walk_dir: this.walk_dir, walk_phase: this.walk_phase, blink: (now % 3.6) < 0.12 || ((now + 1.7) % 5.3) < 0.1, gaze, arms: P.arms,
      parts: this.parts.map(p => [p[0], p[1], p[5], p[6]]), hour: n.getHours(), minute: n.getMinutes(), day: n.getDate(), month: n.getMonth(), decor: this.decor || [], pet: this.pet || null, expr: this.expr, wear: this.wear,
      theme: this.theme, season: this.season, weather: (this.weather && this.weather.kind) || "mild", glasses: this.glasses, headphones: this.headphones,
      speaking: this.speaking, lift: this.lift, lean: this.lean, look: active ? [...this.look] : [0, 0], snack: this.snack, eat: this.eat, eating: this.eating,
      ev: this.event ? (now - this.event.start) / (this.event.end - this.event.start) : 0,
    };
  }
}
