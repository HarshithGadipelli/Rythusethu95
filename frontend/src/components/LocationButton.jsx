/**
 * LocationButton — One-click address auto-fill using browser geolocation.
 * Props:
 *   onLocation  ({ address, lat, lng }) => void  — called with resolved data
 *   label       string  (optional button label)
 *   compact     bool    (icon-only mode)
 *   style       object  (optional overrides)
 */
import React, { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

export default function LocationButton({ onLocation, label, compact = false, style = {} }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await res.json();
          // Build a clean human-readable address
          const a = data.address || {};
          const parts = [
            a.house_number,
            a.road || a.neighbourhood,
            a.suburb || a.village || a.town,
            a.city || a.county,
            a.state,
            a.postcode,
          ].filter(Boolean);
          address = parts.length > 0 ? parts.join(", ") : data.display_name || address;
        } catch {}
        setLoading(false);
        onLocation({ address, lat, lng });
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          alert(
            "📍 Location permission denied.\n\nTo enable:\n1. Click the 🔒 lock icon in your browser address bar\n2. Set Location to 'Allow'\n3. Try again"
          );
        } else {
          alert("Could not detect location. Please type your address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title="Use my current location"
        style={{
          width: 40, height: 40,
          borderRadius: "50%",
          border: "none",
          background: loading ? "#f1f5f9" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: loading ? "not-allowed" : "pointer",
          flexShrink: 0,
          boxShadow: "0 3px 10px rgba(59,130,246,0.3)",
          transition: "all 0.2s",
          ...style,
        }}
      >
        {loading
          ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          : <LocateFixed size={18} />
        }
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.55rem 1rem",
        borderRadius: "100px",
        border: "1.5px solid #3b82f6",
        background: loading ? "#f1f5f9" : "rgba(59,130,246,0.08)",
        color: "#2563eb",
        fontWeight: 600,
        fontSize: "0.85rem",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {loading
        ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Detecting...</>
        : <><LocateFixed size={15} /> {label || "Use My Location"}</>
      }
    </button>
  );
}
