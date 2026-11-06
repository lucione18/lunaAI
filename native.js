// native.js - talks to the Android app shell (permissions, music scan, other apps' music, floating island, mic)
import { classify } from "./behavior.js";
const cap = window.Capacitor;
const P = cap && cap.Plugins && cap.Plugins.LunaNative;
export const isNative = !!(P && cap.isNativePlatform && cap.isNativePlatform());
export const ext = { has: false, playing: false, title: "", artist: "", pkg: "", level: 0, beat: false, bpm: 0, energy: 0, beats: 0, lastBeat: 0, viz: false, ownPkg: "" };
let listeners = [];
export function onExt(fn) { listeners.push(fn); }
export const status = { listener: false, overlay: false, mic: false, audio: false, island: false, viz: false };

export async function refreshStatus() {
  if (!isNative) return status;
  try { Object.assign(status, await P.status()); ext.ownPkg = status.pkg || ext.ownPkg; } catch (e) { }
  return status;
}
if (isNative) {
  P.addListener("media", m => { ext.has = !!m.title || m.playing; ext.playing = !!m.playing; ext.title = m.title || ""; ext.artist = m.artist || ""; ext.pkg = m.pkg || ""; listeners.forEach(f => f()); });
  P.addListener("level", m => { ext.viz = true; ext.level = m.level || 0; ext.bpm = m.bpm || 0; ext.energy = m.energy || 0; if (m.beat) { ext.beat = true; ext.beats++; ext.lastBeat = performance.now() / 1000; } });
  refreshStatus();
}
// what Luna "hears" from other apps, in the same shape as player.listen()
let ph = -1;
export function externalAudio(now) {
  if (!isNative || !ext.has || ext.pkg === ext.ownPkg) return null;
  const out = { playing: true, paused: !ext.playing, index: [...ext.title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) & 0xffff, title: ext.title, level: 0, beat: false, mood: null, external: true };
  if (!ext.playing) return out;
  const live = ext.viz && now - ext.lastBeat < 3;
  if (live) { out.level = ext.level; out.beat = ext.beat; ext.beat = false; out.mood = ext.beats >= 6 && ext.bpm ? classify(ext.bpm, ext.energy) : "happy"; }
  else { const ps = now * 105 / 60, last = ph; ph = Math.floor(ps); out.level = Math.pow(Math.max(0, Math.cos(ps * 2 * Math.PI)), 2); out.beat = ph > last && last >= 0; out.mood = "happy"; }
  return out;
}
export const control = a => { if (isNative) P.control({ action: a }).catch(() => { }); };

// ---- music on the phone (needs the music permission)
export async function scanMusic() { const r = await P.scanMusic(); return r.songs || []; }
export const fileFor = s => { const url = cap.convertFileSrc(s.uri); return fetch(url).then(r => r.blob()).then(b => new File([b], s.name, { type: b.type || "audio/mpeg" })); };
// ---- permissions and settings screens
export const setNow = (title, artist, playing) => { if (isNative) P.setNow({ title: title || "", artist: artist || "", playing: !!playing }).catch(() => { }); };
export const onControl = fn => { if (isNative) P.addListener("control", m => fn(m.action)); };
// ask for everything once, the first time the app opens
export async function askAllOnce(kv) {
  if (!isNative || kv.get("asked", false)) return; kv.set("asked", true);
  for (const m of ["requestAudio", "requestNotif", "requestMic"]) { try { await P[m](); } catch (e) { } }
  await refreshStatus();
}
export const askMic = async () => { try { return (await P.requestMic()).granted; } catch (e) { return false; } };
export const openListenerSettings = () => P.openListenerSettings();
export const openOverlaySettings = () => P.openOverlaySettings();
export const setIsland = async on => { await P.setIsland({ enabled: on }); await refreshStatus(); };
export async function sendArt(idle, sing) { if (isNative) { try { await P.setArt({ idle, sing }); } catch (e) { } } }
export function setForeground(v) { }
// ---- speech to text through Android (the web version of this does not exist inside the app)
export function listen(onText, onEnd) {
  const h = [];
  P.addListener("speech", m => { if (m.text) onText(m.text); if (m.done) { onEnd(); } }).then(x => h.push(x));
  P.startSpeech().catch(() => onEnd());
  return () => { P.stopSpeech().catch(() => { }); };
}
