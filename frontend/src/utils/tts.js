/**
 * playTTS — Text-to-Speech utility for Rythu Sethu
 * Handles the Chrome bug where getVoices() returns empty on first call.
 */

import { LANG_MAP } from "./useVoiceInput";

function speakWithVoice(text, langCode) {
  const synth = window.speechSynthesis;
  synth.cancel(); // stop any ongoing speech first

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = LANG_MAP[langCode] || "en-IN";
  utterance.rate  = 1.0;
  utterance.pitch = 1.0;

  const voices = synth.getVoices();
  if (voices.length > 0) {
    // Try to find a premium voice for the target language
    const matchLang    = utterance.lang.split("-")[0];
    const langVoices   = voices.filter(v => v.lang.startsWith(matchLang) || v.lang.startsWith(utterance.lang));
    const premiumVoice = langVoices.find(v =>
      v.name.includes("Google") ||
      v.name.includes("Online") ||
      v.name.includes("Premium") ||
      v.name.includes("Enhanced")
    );
    if (premiumVoice || langVoices.length > 0) {
      utterance.voice = premiumVoice || langVoices[0];
    }
  }

  synth.speak(utterance);

  // Chrome has a bug where long utterances get cut off — this heartbeat fixes it
  const heartbeat = setInterval(() => {
    if (!synth.speaking) {
      clearInterval(heartbeat);
    } else {
      synth.pause();
      synth.resume();
    }
  }, 10000);

  utterance.onend = () => clearInterval(heartbeat);
  utterance.onerror = () => clearInterval(heartbeat);
}

export function playTTS(text, langCode = "en") {
  if (!("speechSynthesis" in window)) {
    console.warn("Text-to-Speech not supported in this browser.");
    return;
  }
  if (!text) return;

  const synth = window.speechSynthesis;

  // Chrome loads voices asynchronously — wait for them if not ready
  const voices = synth.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet — wait for the voiceschanged event
    const onVoicesChanged = () => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      speakWithVoice(text, langCode);
    };
    synth.addEventListener("voiceschanged", onVoicesChanged);
    // Fallback in case event never fires (some browsers don't fire it)
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      speakWithVoice(text, langCode);
    }, 1000);
  } else {
    speakWithVoice(text, langCode);
  }
}
