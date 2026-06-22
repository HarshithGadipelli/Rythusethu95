import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createCustomIcon = (emoji, color) => {
  return L.divIcon({
    className: "custom-map-icon",
    html: `<div style="
      display: flex; justify-content: center; align-items: center;
      width: 30px; height: 30px; background: ${color};
      border: 2px solid white; border-radius: 50%;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 1rem;
    ">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const ICONS = {
  agent: createCustomIcon("🛵", "#3b82f6"), // Blue
  pickup: createCustomIcon("📦", "#eab308"), // Yellow
  delivery: createCustomIcon("📍", "#22c55e"), // Green
};

// Component to dynamically adjust map bounds to fit all markers
const MapBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

export default function RouteMap({ routeData, agentPos }) {
  const [routeLine, setRouteLine] = useState([]);

  useEffect(() => {
    if (!routeData || !routeData.optimizedRoute || routeData.optimizedRoute.length === 0) return;

    const coords = [];
    if (agentPos) {
      coords.push(`${agentPos.lng},${agentPos.lat}`);
    }
    routeData.optimizedRoute.forEach(stop => {
      coords.push(`${stop.longitude},${stop.latitude}`);
    });

    if (coords.length < 2) return;

    const fetchOSRMRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coords.join(";")}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
          const decoded = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteLine(decoded);
        }
      } catch (err) {
        console.error("Failed to fetch OSRM route", err);
      }
    };

    fetchOSRMRoute();
  }, [routeData, agentPos]);

  if (!routeData || !routeData.optimizedRoute || routeData.optimizedRoute.length === 0) return null;

  const markers = [];
  if (agentPos) {
    markers.push({
      id: "agent", lat: agentPos.lat, lng: agentPos.lng, type: "agent", label: "You (Current Location)"
    });
  }

  routeData.optimizedRoute.forEach((stop, index) => {
    markers.push({
      id: `stop-${index}`,
      lat: stop.latitude,
      lng: stop.longitude,
      type: stop.action === "Pickup" ? "pickup" : "delivery",
      label: `${index + 1}. ${stop.action} at ${stop.location}`
    });
  });

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", zIndex: 0 }}>
      <MapContainer center={agentPos || [20.5937, 78.9629]} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {routeLine.length > 0 && <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.8} />}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={ICONS[m.type]}>
            <Popup>
              <strong>{m.label}</strong>
            </Popup>
          </Marker>
        ))}

        <MapBounds points={markers} />
      </MapContainer>
    </div>
  );
}
