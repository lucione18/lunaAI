
// voice.js - Luna Kokoro voice + phone voice fallback

import { kv } from "./store.js";

let audioEl = null;
let audioUrl = null;
let activeController = null;

// IMPORTANT: Replace this with your actual Cloudflare Worker URL.
const KOKORO_URL =
  "https://luna-voice-api.mashishithato1.workers.dev/";

export function systemVoices() {
  try {
    return (speechSynthesis.getVoices() || [])
      .filter(v => /^en/i.test(v.lang))
      .sort((a, b) => score(b) - score(a));
  } catch (e) {
    return [];
  }
}

const score = v =>
  (/network|neural|natural|online|enhanced/i.test(v.name) ? 4 : 0) +
  (/female|woman|girl|aria|jenny|samantha|zira|sonia|libby|emma|-f-|#female|x-tpf|x-iol/i.test(v.name) ? 2 : 0) +
  (v.localService ? 0 : 1);

export function stop() {
  try {
    speechSynthesis.cancel();
  } catch (e) {}

  if (activeController) {
    activeController.abort();
    activeController = null;
  }

  if (audioEl) {
    audioEl.pause();
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl.onplay = null;
    audioEl.src = "";
    audioEl = null;
  }

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
}

function systemSpeak(text, cb) {
  if (!("speechSynthesis" in window)) {
    cb.end?.();
    return;
  }

  try {
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const name = kv.get("voice_name", "");
    const vs = systemVoices();

    const v = vs.find(x => x.name === name) || vs[0];

    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }

    u.pitch = +kv.get("voice_pitch", 1.15);
    u.rate = +kv.get("voice_rate", 1.0);

    u.onstart = () => cb.start?.();
    u.onend = () => cb.end?.();
    u.onerror = () => cb.end?.();

    speechSynthesis.speak(u);

  } catch (e) {
    cb.end?.();
  }
}

async function kokoroSpeak(text, cb) {
  const controller = new AbortController();
  activeController = controller;

  const voice = kv.get("kokoro_voice", "af_bella");

  try {
    // Submit speech generation request
    const response = await fetch(`${KOKORO_URL}/speak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        text,
        voice
      })
    });

    if (!response.ok) {
      throw new Error("Kokoro request failed: " + response.status);
    }

    const job = await response.json();

    if (!job.uuid) {
      throw new Error("No speech job ID received.");
    }

    // Wait for Kokoro to generate the audio
    let audioBlob = null;

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (controller.signal.aborted) {
        return false;
      }

      const result = await fetch(
        `${KOKORO_URL}/result?uuid=${encodeURIComponent(job.uuid)}`,
        { signal: controller.signal }
      );

      if (result.status === 202) {
        continue;
      }

      if (!result.ok) {
        throw new Error("Audio generation failed.");
      }

      const contentType = result.headers.get("content-type") || "";

      if (!contentType.includes("audio/")) {
        throw new Error("Invalid audio response.");
      }

      audioBlob = await result.blob();
      break;
    }

    if (!audioBlob) {
      throw new Error("Kokoro took too long to respond.");
    }

    if (controller.signal.aborted) return false;

    // Play generated speech
    audioUrl = URL.createObjectURL(audioBlob);
    audioEl = new Audio(audioUrl);

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        audioUrl = null;
      }

      audioEl = null;
      cb.end?.();
    };

    audioEl.onplay = () => cb.start?.();
    audioEl.onended = finish;
    audioEl.onerror = finish;

    await audioEl.play();

    return true;

  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }
}

export async function speak(text, cb = {}) {
  stop();

  text = String(text || "").slice(0, 500);

  if (!text.trim()) {
    cb.end?.();
    return;
  }

  const engine = kv.get("voice_engine", "system");

  if (engine === "kokoro") {
    try {
      await kokoroSpeak(text, cb);
      return;

    } catch (e) {
      if (e.name === "AbortError") return;

      console.warn("Kokoro failed:", e);

      cb.error?.(
        "Kokoro couldn't generate speech. Using the phone voice instead."
      );
    }
  }

  systemSpeak(text, cb);
}
