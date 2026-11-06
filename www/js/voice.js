// voice.js - Luna's voice: the phone's voices (pick a natural one) or ElevenLabs for a much more human sound
import { kv } from "./store.js";
let audioEl = null;
export function systemVoices() {
  try { return (speechSynthesis.getVoices() || []).filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)); } catch (e) { return []; }
}
const score = v => (/network|neural|natural|online|enhanced/i.test(v.name) ? 4 : 0) + (/female|woman|girl|aria|jenny|samantha|zira|sonia|libby|emma|-f-|#female|x-tpf|x-iol/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
export function stop() { try { speechSynthesis.cancel(); } catch (e) { } if (audioEl) { audioEl.pause(); audioEl = null; } }
function systemSpeak(text, cb) {
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
  const key = (kv.get("el_key", "") || "").trim();
  if (kv.get("voice_engine", "system") === "eleven" && key) {
    try {
      const id = (kv.get("el_voice", "") || "21m00Tcm4TlvDq8ikWAM").trim();
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_64`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 } }),
      });
      if (!r.ok) throw new Error(r.status);
      const url = URL.createObjectURL(await r.blob()); audioEl = new Audio(url);
      audioEl.onplay = cb.start; audioEl.onended = audioEl.onerror = () => { URL.revokeObjectURL(url); cb.end(); };
      await audioEl.play(); return;
    } catch (e) { cb.error && cb.error("ElevenLabs didn't answer, using the phone voice."); }
  }
  systemSpeak(text, cb);
}
