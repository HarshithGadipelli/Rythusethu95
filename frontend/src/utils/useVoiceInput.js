import { useState, useCallback, useRef } from "react";
import { useLang } from "../context/LangContext";
import { BASE_URL } from "../api/api";

export const LANG_MAP = {
  en: "en-IN", te: "te-IN", hi: "hi-IN", kn: "kn-IN", ta: "ta-IN",
  ml: "ml-IN", mr: "mr-IN", gu: "gu-IN", bn: "bn-IN", pa: "pa-IN",
  or: "or-IN", as: "as-IN", ur: "ur-PK",
};

export function useVoiceInput(lang = "en") {
  const [listening, setListening] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [interim, setInterim] = useState("");
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const onResultRef = useRef(null);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    clearTimeout(silenceTimerRef.current);
    setListening(false);
    setActiveField(null);
  }, []);

  const startListening = useCallback(async (onResult, options = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onResultRef.current = onResult;
      setActiveField(options.fieldId || "default");
      setInterim("Listening...");
      setListening(true);
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Silence detection setup
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.minDecibels = -60;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkSilence = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;

        if (avg > 10) { // Speech detected
          clearTimeout(silenceTimerRef.current);
          setInterim("Recording...");
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorder.state === "recording") mediaRecorder.stop();
          }, 2500); // Stop after 2.5s of silence
        }
        
        if (mediaRecorder.state === "recording") {
          requestAnimationFrame(checkSilence);
        }
      };

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setInterim("Processing AI Audio...");
        setListening(false);
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        try {
          const res = await fetch(`${BASE_URL}/api/ai/stt`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.transcript && onResultRef.current) {
            onResultRef.current(data.transcript);
          }
        } catch (err) {
          console.error("STT Error:", err);
          alert("Audio processing failed. Please try again.");
        }
        
        setInterim("");
        setActiveField(null);
      };

      mediaRecorder.start(200); // Collect data chunks every 200ms
      checkSilence();

      // Fallback: stop after 15 seconds max to prevent infinite recording
      setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, 15000);

    } catch (err) {
      console.error("Microphone Error:", err);
      alert("Microphone access denied or not supported.");
      setListening(false);
      setActiveField(null);
    }
  }, []);

  return { listening, activeField, interim, startListening, stopListening };
}
