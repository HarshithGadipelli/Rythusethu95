import { useRef } from "react";
import { useAutoSuggest } from "../utils/useAutoSuggest";
import { useLang } from "../context/LangContext";
import { LANG_MAP } from "../utils/useVoiceInput";
import { playTTS } from "../utils/voiceParser";

export default function AutoSuggestInput({
  value, onChange, onSpeak, onFocus, onTTS, listening, interim,
  placeholder, type = "text", label, fieldType = "default",
  className = "rs-input", disabled = false
}) {
  const {
    suggestions, selectedIndex, showSuggestions,
    updateSuggestions, handleKeyDown, selectSuggestion, closeSuggestions
  } = useAutoSuggest(fieldType);
  const wrapperRef = useRef(null);
  const { lang, t } = useLang();

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    updateSuggestions(val);
  };

  const handleSelect = (suggestion) => {
    selectSuggestion(suggestion, onChange);
  };

  return (
    <div className="form-group" style={{ position: "relative" }}>
      {label && (
        <label className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{label}</span>
          <button type="button" className="btn-icon" onClick={() => {
            const text = value ? `${label} ${t("isCurrentlySetTo")} ${value}` : `${t("pleaseEnter")} ${label}`;
            playTTS(text, lang, { rate: 0.95 });
          }} style={{ padding: 0 }} title="Read Aloud">🔊</button>
        </label>
      )}
      <div className="input-wrapper" ref={wrapperRef}>
        <input
          className={className}
          type={type}
          placeholder={placeholder}
          value={interim && listening ? `${value} ${interim}...` : value}
          onChange={handleChange}
          onFocus={onFocus}
          onKeyDown={(e) => handleKeyDown(e, handleSelect)}
          onBlur={closeSuggestions}
          disabled={disabled}
          autoComplete="off"
          style={interim && listening ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
        />
        {onSpeak && (
          <button
            type="button"
            className={`mic-btn ${listening ? "active" : ""}`}
            onClick={onSpeak}
            title={listening ? "Listening..." : "Speak"}
          >
            🎤
          </button>
        )}
        {onTTS && (
          <button
            type="button"
            className="tts-btn"
            onClick={onTTS}
            title="Read Aloud"
          >
            🔊
          </button>
        )}
      </div>

      {/* Auto-suggest dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="autosuggest-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`autosuggest-item ${i === selectedIndex ? "active" : ""}`}
              onMouseDown={() => handleSelect(s)}
            >
              <span className="autosuggest-icon">🔍</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
