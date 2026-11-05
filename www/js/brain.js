// brain.js - chat rules, reminders, weather, lyrics lookup, optional Claude chat
import { DATA, ACTIONS } from "./brain_data.js";
import { kv } from "./store.js";
export { DATA };
const pick = a => a[Math.floor(Math.random() * a.length)];

export const dayOfYear = d => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
export const dailyQuote = (d = new Date()) => DATA.DAILY[(dayOfYear(d) + d.getFullYear()) % DATA.DAILY.length];
export const motivation = () => pick([...DATA.MOTIVATION, ...DATA.DAILY]);
export function timeText() { const n = new Date(); let h = n.getHours() % 12 || 12; return `It's ${h}:${String(n.getMinutes()).padStart(2, "0")} ${n.getHours() < 12 ? "AM" : "PM"}.`; }
export function dateText() { const n = new Date(); return `Today is ${n.toLocaleDateString("en-GB", { weekday: "long" })}, ${n.getDate()} ${n.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.`; }
export function parseAction(text) {
  const t = text.toLowerCase().trim();
  if (["play game", "play a game", "play games", "play video games"].includes(t)) return ["act", "game"];
  if (/\b(time|what time|clock)\b/.test(t) && !t.includes("play")) return ["say", timeText()];
  if (/\b(date|day is it|what day|today)\b/.test(t) && !t.includes("play") && !t.includes("quote")) return ["say", dateText()];
  if (t.includes("daily quote") || t.includes("quote of the day") || t === "quote" || t === "daily") return ["quote", dailyQuote()];
  if (/motivat|inspire|quote|cheer me/.test(t)) return ["quote", motivation()];
  if (/^(play |pause|next|volume|mood)/.test(t)) return null;
  for (const [re, act] of ACTIONS) if (re.test(t)) return ["act", act];
  return null;
}

// ---- reminders ("pause the song in 10 min", "remind me to stretch at 18:30")
const UNIT = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600 };
const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, "half a": 0.5, "half an": 0.5 };
const DELAY = /\b(?:in|after|within)\s+(?:the\s+next\s+)?(half an?|an?|\d+(?:\.\d+)?|one|two|three|four|five|ten|fifteen|twenty|thirty)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|h|m|s)\b/;
const CLOCK = /\bat\s+(\d{1,2})(?:\s*[:h.]\s*(\d{2})(?:\s*(am|pm))?|\s*(am|pm))\b/;
export function parseWhen(text) {
  const t = text.toLowerCase().trim(); let m = DELAY.exec(t);
  if (m) { let n = NUMW[m[1]]; if (n === undefined) n = parseFloat(m[1]); return [Date.now() / 1000 + n * UNIT[m[2]], (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).trim()]; }
  m = CLOCK.exec(t);
  if (m) {
    let h = parseInt(m[1]), mi = parseInt(m[2] || "0"); const ap = m[3] || m[4];
    if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0;
    if (h < 24 && mi < 60) { const now = new Date(), w = new Date(); w.setHours(h, mi, 0, 0); if (w <= now) w.setDate(w.getDate() + 1); return [w.getTime() / 1000, (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).trim()]; }
  }
  return [null, t];
}
export function parseReminder(text) {
  let [at, rest] = parseWhen(text); if (at === null) return null;
  rest = rest.replace(/\s+/g, " ").replace(/^[ ,.]+|[ ,.]+$/g, "").replace(/^(please |luna,? )+/, "");
  let m = /^(pause|stop|resume|skip|next)\b/.exec(rest);
  if (m) { const k = m[1] === "skip" ? "next" : m[1]; return { kind: k, arg: "", at, text: { pause: "Pause the song", stop: "Stop the music", resume: "Resume the music", next: "Next song" }[k] }; }
  m = /^play\s+(.+)/.exec(rest); if (m) return { kind: "play", arg: m[1].trim(), at, text: `Play ${m[1].trim()}` };
  m = /^(?:remind me (?:to |about )?|note:? ?|write (?:a )?(?:sticky )?note:? ?)(.+)/.exec(rest);
  if (m) { const x = m[1].trim(); return { kind: "note", arg: x, at, text: x[0].toUpperCase() + x.slice(1) }; }
  return null;
}
export class Reminders {
  constructor() { this.items = kv.get("reminders", []).filter(i => i.at == null || i.at > Date.now() / 1000 - 3600); this.nextId = Math.max(0, ...this.items.map(i => i.id)) + 1; }
  add(r) { r.id = this.nextId++; this.items.push(r); this.save(); return r; }
  due() { const now = Date.now() / 1000, out = this.items.filter(i => i.at && i.at <= now && !i.done); if (out.length) { this.items = this.items.filter(i => !out.includes(i)); this.save(); } return out; }
  remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); }
  clear() { this.items = []; this.save(); }
  save() { kv.set("reminders", this.items); }
}
export function whenText(at) {
  const s = at - Date.now() / 1000;
  if (s < 90) return `in ${Math.round(s)} seconds`; if (s < 5400) return `in ${Math.round(s / 60)} minutes`;
  return "at " + new Date(at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---- weather (Open-Meteo, free, no key)
export function weatherKind(code, temp) {
  if ([95, 96, 99].includes(code)) return "storm"; if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if (temp != null && temp >= 30) return "hot"; if (temp != null && temp <= 8) return "cold"; return "mild";
}
export async function getWeather(city) {
  const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
  if (!g.results || !g.results.length) throw new Error(`I couldn't find a place called ${city}.`);
  const r = g.results[0];
  const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&timezone=auto&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max`)).json();
  const c = w.current, d = w.daily;
  const out = { temp: c.temperature_2m, feels: c.apparent_temperature, hum: c.relative_humidity_2m, code: c.weather_code, wind: c.wind_speed_10m, hi: d.temperature_2m_max[0], lo: d.temperature_2m_min[0], rain: d.precipitation_probability_max[0], place: r.name, desc: DATA.WCODE[c.weather_code] || "mixed weather", lat: r.latitude };
  out.kind = weatherKind(out.code, out.feels); return out;
}
export function weatherText(w) {
  const s = `In ${w.place} it's ${Math.round(w.temp)} degrees with ${w.desc}, feels like ${Math.round(w.feels)}. Today's range is ${Math.round(w.lo)} to ${Math.round(w.hi)}, with a ${w.rain} percent chance of rain.`;
  return s + ({ hot: " Wow, it's hot! Stay cool and drink water.", cold: " Brr, it's cold. Wear something warm!", rain: " Don't forget your umbrella!", storm: " Stormy out there. Stay safe inside!", snow: " Snow! How magical." }[w.kind] || "");
}

// ---- lyrics (LRCLIB, free) ----
const STAMP = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g;
export function parseLrc(text) {
  const out = [];
  for (const line of (text || "").split(/\r?\n/)) {
    const stamps = [...line.matchAll(STAMP)]; if (!stamps.length) continue;
    const words = line.replace(STAMP, "").trim();
    for (const m of stamps) out.push([parseInt(m[1]) * 60 + parseFloat(m[2].replace(":", ".")), words]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
export function currentLine(lines, pos) {
  let lo = 0, hi = lines.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (lines[mid][0] <= pos + 0.15) lo = mid + 1; else hi = mid; } return lo - 1;
}
export async function findLyrics(artist, title, album, dur) {
  if (!title) return null;
  const key = `lyr.${(artist + "|" + title).toLowerCase()}`, cached = kv.get(key, null);
  if (cached) { if (cached.none) { if (Date.now() - cached.none < 864e5) return null; } else return cached; }
  let hit = null;
  try {
    const q = new URLSearchParams({ track_name: title, artist_name: artist }); if (album && !album.startsWith("Unknown")) q.set("album_name", album); if (dur) q.set("duration", Math.round(dur));
    let r = await fetch("https://lrclib.net/api/get?" + q);
    if (r.ok) hit = await r.json();
    else { r = await fetch("https://lrclib.net/api/search?q=" + encodeURIComponent(`${artist} ${title}`.trim())); const res = r.ok ? await r.json() : []; hit = res.find(x => x.syncedLyrics) || res[0] || null; }
  } catch (e) { return undefined; }     // offline: don't cache
  if (!hit || !(hit.syncedLyrics || hit.plainLyrics)) { kv.set(key, { none: Date.now() }); return null; }
  const synced = parseLrc(hit.syncedLyrics || ""), out = { synced, plain: hit.plainLyrics || synced.map(x => x[1]).join("\n") };
  kv.set(key, out); return out;
}

// ---- chat
export class Chat {
  constructor() { this.pending = null; this.history = []; this.memory = kv.get("memory", []); }
  who() { return kv.get("name", "") || "friend"; }
  greet() {
    const h = new Date().getHours(), part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    this.pending = h < 12 ? "sleep" : "day";
    return h < 12 ? `${part}, ${this.who()}! Did you sleep well?` : `${part}, ${this.who()}! How's your day going?`;
  }
  reply(text) {
    const t = text.toLowerCase().trim(), pend = this.pending; this.pending = null;
    const pos = /\b(yes|yeah|yep|good|great|well|fine|nice|amazing|awesome|happy|okay|ok|better)\b/.test(t);
    const neg = /\b(no|nope|bad|badly|terrible|awful|tired|exhausted|rough|sad|stressed|not)\b/.test(t);
    if (pend === "sleep") { if (neg) { this.pending = "mood"; return "Aww, I'm sorry. Maybe some soft music and a glass of water will help. Want me to play something chill?"; } if (pos) return "Yay! A good sleep makes everything better. Let's make today a great one!"; }
    if (pend === "day") { if (neg) return "Oh no, I'm sorry. I'm right here with you. Want a chill song, or a little motivation?"; if (pos) return "That's wonderful! Let's keep the good energy going. Want some music?"; }
    if (pend === "mood" && /\b(yes|yeah|yep|sure|please|ok|okay)\b/.test(t)) return "__PLAY_CHILL__";
    if (/\b(good ?morning)\b/.test(t)) return new Date().getHours() < 12 ? this.greet() : "It's not morning anymore, silly! But hello!";
    if (/\b(good ?afternoon|good ?evening)\b/.test(t)) { this.pending = "day"; return `Hi ${this.who()}! How's your day going?`; }
    if (/\b(good ?night|going to bed|off to sleep|sleep now)\b/.test(t)) return `Good night, ${this.who()}! Sweet dreams. I'll be dreaming of music too.`;
    if (/\b(how are you|how're you|how r u|hows it going)\b/.test(t)) { this.pending = "back"; return "I'm doing great, thanks for asking! The music makes me happy. How about you?"; }
    if (pend === "back") return !neg ? "I'm glad you told me! Thanks for chatting with me." : "Oh, I hope it gets better soon. I'm here for you.";
    if (/\b(hello|hi|hey|hiya|sup|yo)\b/.test(t)) return pick([`Hi ${this.who()}!`, `Hello hello, ${this.who()}!`, "Heyyy! Good to see you!"]);
    if (/\b(thanks|thank you|thx)\b/.test(t)) return pick(["You're welcome!", "Anytime!", "Happy to help!"]);
    if (/\b(i love you|love you|you're cute|you are cute|so cute|pretty)\b/.test(t)) return "__BLUSH__Eeep! You're making me blush... thank you!";
    if (/\b(who are you|your name|what are you)\b/.test(t)) return "I'm Luna, your little music buddy! I play songs, tell you the weather, and keep you company.";
    if (/\b(joke|funny|make me laugh)\b/.test(t)) return "__LAUGH__" + pick(DATA.JOKES);
    if (/\b(bored|boring)\b/.test(t)) return "Bored? Let's fix that! I can tell you a space fact, a joke, or play some music.";
    if (/\b(tired|sleepy|exhausted)\b/.test(t)) return "You sound tired. Rest is important. Want me to play something calm?";
    if (/\b(sad|lonely|down|depressed|upset)\b/.test(t)) return "I'm sorry you feel that way. I'm here with you. Take a deep breath. Want a gentle song or a kind quote?";
    if (/\b(hungry|snack|food)\b/.test(t)) return "Snack time sounds great! I'll grab one too.";
    if (/\b(bye|goodbye|see you|cya)\b/.test(t)) return `Bye bye, ${this.who()}! Come back soon!`;
    if (this.aiReady()) return "__ASK__";
    return pick(["Hmm, tell me more!", "Ooh, interesting! I'm still learning to chat, but I'm listening.", "I like talking with you! Try asking about the weather, space or a joke.", "Mm-hm! Want me to play something?"]);
  }
  aiReady() { return !!(kv.get("ai_key", "") || "").trim(); }
  remember(f) { f = f.trim().replace(/\.$/, "").slice(0, 160); if (f && !this.memory.some(x => x.toLowerCase() === f.toLowerCase())) { this.memory.push(f); this.memory = this.memory.slice(-60); kv.set("memory", this.memory); return true; } return false; }
  forget(text) { const t = text.toLowerCase().trim(), keep = this.memory.filter(f => !f.toLowerCase().includes(t)), n = this.memory.length - keep.length; this.memory = keep; kv.set("memory", keep); return n; }
  async askClaude(text, ctx = "") {
    const key = (kv.get("ai_key", "") || "").trim(), facts = this.memory.slice(-30).join("; ") || "nothing yet";
    const sys = "You are Luna, a cheerful, gentle, high-energy-but-soft pixel-art anime girl who lives on the user's phone and plays their music. You wear headphones and love music. " +
      `The user's name is ${kv.get("name", "") || "unknown"}. Right now it is ${new Date().toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}. ${ctx} Things you remember about the user: ${facts}. ` +
      "Reply in one or two short, warm sentences. No emoji, no markdown. Stay in character. If the user tells you something lasting about themselves (likes, plans, people, preferences) add at the very end of your reply the tag [[remember: short fact]]. Never mention the tag.";
    this.history.push({ role: "user", content: text }); this.history = this.history.slice(-10);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: kv.get("ai_model", "") || "claude-haiku-5-5", max_tokens: 220, system: sys, messages: this.history }) });
      if (!r.ok) throw new Error(r.status);
      let out = ((await r.json()).content[0].text || "").trim();
      for (const m of out.matchAll(/\[\[remember:\s*(.+?)\]\]/gi)) this.remember(m[1]);
      out = out.replace(/\[\[remember:[\s\S]*?\]\]/gi, "").trim(); this.history.push({ role: "assistant", content: out }); return out;
    } catch (e) { return "Oops, my thoughts got tangled. Say that again?"; }
  }
}
