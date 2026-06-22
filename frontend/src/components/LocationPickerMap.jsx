import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LocationMarker = ({ position, setPosition, setAddress }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const d = await r.json();
        setAddress(d.display_name || `${lat}, ${lng}`);
      } catch (err) {
        setAddress(`${lat}, ${lng}`);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

export default function LocationPickerMap({ onSelect, initialLat = 20.5937, initialLng = 78.9629 }) {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("");

  const handleConfirm = () => {
    if (position) {
      onSelect({ lat: position[0], lng: position[1], address });
    }
  };

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid #e2e8f0" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer center={[initialLat, initialLng]} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationMarker position={position} setPosition={setPosition} setAddress={setAddress} />
        </MapContainer>
      </div>
      <div style={{ padding: "10px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-dark)", flex: 1, paddingRight: "10px" }}>
          <strong>Selected:</strong> {address || "Click on the map to drop a pin"}
        </div>
        <button 
          onClick={handleConfirm}
          disabled={!position}
          style={{
            padding: "8px 16px", background: position ? "var(--green-mid)" : "#cbd5e1",
            color: "white", border: "none", borderRadius: "4px", cursor: position ? "pointer" : "not-allowed"
          }}
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
