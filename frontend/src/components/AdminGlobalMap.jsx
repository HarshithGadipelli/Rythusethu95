import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import { BASE_URL } from "../api/api";

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
  agent: createCustomIcon("🚚", "#3b82f6"), // Blue truck
  pickup: createCustomIcon("🌾", "#22c55e"), // Green marker for pickup
  delivery: createCustomIcon("🏠", "#eab308"), // Yellow marker for delivery
};

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

export default function AdminGlobalMap({ activeDeliveries }) {
  const [liveAgents, setLiveAgents] = useState({});

  useEffect(() => {
    const socket = io(BASE_URL);
    socket.emit("join_admin_map");

    socket.on("agent_location_changed", (data) => {
      setLiveAgents(prev => ({
        ...prev,
        [data.agentId]: { lat: data.lat, lng: data.lng, timestamp: data.timestamp }
      }));
    });

    return () => {
      socket.emit("leave_admin_map");
      socket.disconnect();
    };
  }, []);

  const markers = [];
  const polylines = [];

  activeDeliveries.forEach(d => {
    // Only map active in_transit or picked_up deliveries to save performance
    if (d.status !== "in_transit" && d.status !== "picked_up") return;

    const pickupLat = d.pickupLatitude || d.order?.crop?.latitude;
    const pickupLng = d.pickupLongitude || d.order?.crop?.longitude;
    const deliveryLat = d.deliveryLatitude;
    const deliveryLng = d.deliveryLongitude;

    const agentId = d.agent?._id || d.agent;
    const currentAgentPos = liveAgents[agentId] || (d.agentLatitude && d.agentLongitude ? { lat: d.agentLatitude, lng: d.agentLongitude } : null);

    if (pickupLat && pickupLng) {
      markers.push({ id: `pickup-${d._id}`, lat: pickupLat, lng: pickupLng, type: "pickup", label: `Pickup: ${d.order?.crop?.name || "Order"} (${d.trackingCode})` });
    }

    if (deliveryLat && deliveryLng) {
      markers.push({ id: `delivery-${d._id}`, lat: deliveryLat, lng: deliveryLng, type: "delivery", label: `Drop-off: ${d.deliveryLocation}` });
    }

    if (currentAgentPos) {
      markers.push({ id: `agent-${agentId}`, lat: currentAgentPos.lat, lng: currentAgentPos.lng, type: "agent", label: `Agent: ${d.agent?.name || "Driver"}` });
      
      // Draw simple line connecting them
      if (pickupLat && deliveryLat) {
         polylines.push([
           [pickupLat, pickupLng],
           [currentAgentPos.lat, currentAgentPos.lng],
           [deliveryLat, deliveryLng]
         ]);
      }
    }
  });

  return (
    <div style={{ height: "600px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", zIndex: 0 }}>
      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {polylines.map((path, i) => (
           <Polyline key={i} positions={path} color="#3b82f6" weight={3} opacity={0.6} dashArray="5, 10" />
        ))}

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
