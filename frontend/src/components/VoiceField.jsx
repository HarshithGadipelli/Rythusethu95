import React, { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader } from "lucide-react";
import { useLang } from "../context/LangContext";
import { LANG_MAP } from "../utils/useVoiceInput";
import { parseSpokenNumber, playTTS, stopTTS } from "../utils/voiceParser";

export default function VoiceField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
  step,
  autoListenMode = false,
  speakValueOnly = false // if true, only speaks value not label
}) {
  const { lang, t } = useLang();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const handlePlayTTS = (text) => {
    playTTS(text, lang, { rate: 0.9 }).then(() => {
      if (autoListenMode) {
        startDictation();
      }
    });
  };

  const handleSpeakClick = () => {
    const textToSpeak = speakValueOnly 
      ? `${value || t("empty")}`
      : `${label}. ${value ? t("currentValueIs") + ' ' + value : t("fieldIsEmpty")}`;
    handlePlayTTS(textToSpeak);
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t("unsupportedBrowser") || "Voice input is not supported in your browser. Please use Chrome.");
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = LANG_MAP[lang] || "en-IN";

    recognition.onstart = () => {
      setListening(true);
      setInterim("");
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setInterim(interimTranscript);
      if (finalTranscript) {
        if (type === "number") {
          const parsedStr = parseSpokenNumber(finalTranscript);
          const num = parseFloat(parsedStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            onChange(num);
          } else {
            onChange(finalTranscript.trim());
          }
        } else {
          onChange(finalTranscript.trim());
        }
        setInterim("");
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        const errMsg = t("micError") || "🎤 Microphone access was denied.\n\nTo enable it:\n1. Click the 🔒 lock icon in the browser address bar\n2. Set Microphone to 'Allow'\n3. Reload the page";
        alert(errMsg);
      }
      setListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      recognition.start();
    } catch(e) {
      console.error(e);
      setListening(false);
    }
  };

  return (
    <div className="form-group" style={{ position: "relative", marginBottom: "1.5rem" }}>
      {label && (
        <label className="field-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{label} {required && <span style={{color:"red"}}>*</span>}</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              type="button" 
              onClick={handleSpeakClick}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yellow-wheat)", padding: "4px" }}
              title="Read Aloud"
            >
              <Volume2 size={16} />
            </button>
            <button 
              type="button" 
              onClick={listening ? () => stopTTS() : startDictation}
              style={{ background: "none", border: "none", cursor: "pointer", color: listening ? "var(--red-error)" : "var(--green-light)", padding: "4px" }}
              title="Dictate"
            >
              {listening ? <Loader size={16} className="spin" /> : <Mic size={16} />}
            </button>
          </div>
        </label>
      )}

      <div style={{ position: "relative" }}>
        <input 
          type={type}
          className={`rs-input ${listening ? 'listening-pulse' : ''}`}
          value={interim || value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          min={min}
          step={step}
          style={{
            borderColor: listening ? "var(--green-mid)" : "var(--green-pale)",
            boxShadow: listening ? "0 0 8px var(--green-mid)" : "none"
          }}
        />
        {listening && (
          <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--green-mid)" }}>
            Listening...
          </span>
        )}
      </div>
    </div>
  );
}
