// voice.js - Luna's voice: the phone's own text-to-speech (pick a natural voice)
import { kv } from "./store.js";
import * as N from "./native.js";
export function systemVoices() {
  try { return (speechSynthesis.getVoices() || []).filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)); } catch (e) { return []; }
}
const score = v => (/network|neural|natural|online|enhanced/i.test(v.name) ? 4 : 0) + (/female|woman|girl|aria|jenny|samantha|zira|sonia|libby|emma|-f-|#female|x-tpf|x-iol/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
export async function listVoices() {
  if (N.isNative) { const vs = await N.ttsVoices(); return vs.sort((a, b) => (b.network - a.network) || (b.quality - a.quality)).map(x => ({ name: x.name, label: x.name.replace(/^en-/i, "").replace(/-/g, " ") + (x.network ? " (online, natural)" : "") })); }
  return systemVoices().map(x => ({ name: x.name, label: x.name }));
}
export function stop() { if (N.isNative) N.ttsStop(); try { speechSynthesis.cancel(); } catch (e) { } }
function systemSpeak(text, cb) {
  if (N.isNative) return N.ttsSpeak(text, kv.get("voice_name", ""), +kv.get("voice_rate", 1.0), +kv.get("voice_pitch", 1.1), cb);
  if (!("speechSynthesis" in window)) return cb.end();
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), name = kv.get("voice_name", ""), vs = systemVoices();
    const v = vs.find(x => x.name === name) || vs[0]; if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = +kv.get("voice_pitch", 1.15); u.rate = +kv.get("voice_rate", 1.0);
    u.onstart = cb.start; u.onend = u.onerror = cb.end; speechSynthesis.speak(u);
  } catch (e) { cb.end(); }
}
export async function speak(text, cb) {
  stop(); text = text.slice(0, 320);
  systemSpeak(text, cb);
}
