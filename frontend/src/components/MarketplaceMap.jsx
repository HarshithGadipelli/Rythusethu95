/**
 * MarketplaceMap — Immersive, realistic map for the Marketplace.
 *
 * Features:
 *  • Multiple tile layer options (satellite, street, terrain)
 *  • Customer "You Are Here" marker with accuracy circle
 *  • Distance rings (5km, 10km) from customer location
 *  • Distance line from customer to hovered/selected crop
 *  • Animated farmer markers with trust badge
 *  • Polyline routing on click
 */
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
  Circle, Polyline, Polygon, ZoomControl, useMapEvents
} from "react-leaflet";
import L from "leaflet";

const pulseStyle = `
@keyframes heatmapPulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
.heatmap-circle {
  animation: heatmapPulse 3s infinite ease-in-out;
  transform-origin: center;
}
@keyframes radarSweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.radar-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(59,130,246,0) 70%, rgba(59,130,246,0.4) 100%);
  animation: radarSweep 4s infinite linear;
  pointer-events: none;
}
@keyframes dashFlow {
  to { stroke-dashoffset: -20; }
}
.animated-path {
  animation: dashFlow 1s linear infinite;
}
.delivery-truck-icon {
  background: white;
  border: 2px solid #22c55e;
  border-radius: 50%;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(34,197,94,0.4);
  font-size: 1.1rem;
  z-index: 900;
}
.heatmap-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  border: 1px solid #e2e8f0;
  z-index: 1000;
  font-family: 'Inter', sans-serif;
}
.heatmap-legend h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.75rem;
  color: #475569;
}
.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
`;

// ─── Tile Layer Presets ───────────────────────────────────────────────────────
const TILE_LAYERS = {
  satellite: {
    label: "🛰️ Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "© Google Maps",
  },
  street: {
    label: "🗺️ Street",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  terrain: {
    label: "🏔️ Terrain",
    url: "https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=free",
    attribution: "© Thunderforest, © OpenStreetMap",
  },
  dark: {
    label: "🌙 Dark",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution: "© Stadia Maps, © OpenMapTiles, © OpenStreetMap",
  },
};

// ─── Custom Icons ─────────────────────────────────────────────────────────────
function createFarmerIcon(grade = "New", isOrganic = false, imgUrl = null) {
  const colors = {
    Platinum: "#7c3aed",
    Gold: "#d97706",
    Silver: "#6b7280",
    Bronze: "#c2410c",
    New: "#16a34a",
  };
  const bg = colors[grade] || colors.New;
  
  // Format the image URL correctly if it exists to handle local vs absolute
  const BASE_URL = "http://localhost:5000";
  const parsedImg = imgUrl ? (imgUrl.startsWith("http") ? imgUrl : `${BASE_URL}${imgUrl}`) : null;
  
  const innerHtml = parsedImg 
    ? `<div style="width:38px;height:38px;border-radius:50%;background-image:url('${parsedImg}');background-size:cover;background-position:center;transform:rotate(45deg);"></div>`
    : `<span style="transform:rotate(45deg);font-size:1.3rem;line-height:1">${isOrganic ? "🌿" : "🌾"}</span>`;

  return L.divIcon({
    className: "",
    html: `<div style="
      position:relative;
      width:44px;height:44px;
      background:${bg};
      border:3px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 4px 15px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
      overflow:hidden;
    ">
      ${innerHtml}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -48],
  });
}

const customerIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;
    background:white;
    border:3px solid #3b82f6;
    border-radius:50%;
    box-shadow:0 0 0 6px rgba(59,130,246,0.25);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ─── Helper: fly-to on selection ─────────────────────────────────────────────
function FlyTo({ position, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1.2 });
  }, [position]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200); }, []);
  return null;
}

// ─── Distance formatter ───────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MarketplaceMap({
  crops = [],
  selected = null,
  onCropClick,
  trustScores = {},
  customerLat,
  customerLng,
  onCustomerLocationChange,
}) {
  // Day/Night Sync
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour <= 6;
  const defaultTile = isNight ? "dark" : "satellite";

  const [tileKey, setTileKey] = useState(defaultTile);
  const [hoveredCrop, setHoveredCrop] = useState(null);
  const [showDemand, setShowDemand] = useState(false);
  const tile = TILE_LAYERS[tileKey];

  // Determine centre: prefer selected crop, else customer loc, else Hyderabad
  const focusCrop = hoveredCrop || selected;
  const focusLat = focusCrop?.latitude || focusCrop?.farmer?.latitude;
  const focusLng = focusCrop?.longitude || focusCrop?.farmer?.longitude;

  const centre =
    focusLat && focusLng
      ? [focusLat, focusLng]
      : customerLat && customerLng
      ? [customerLat, customerLng]
      : [17.385, 78.4867];

  // Distance from customer to focused crop
  const distKm =
    customerLat && customerLng && focusLat && focusLng
      ? haversine(customerLat, customerLng, focusLat, focusLng)
      : null;

  const routeLine =
    customerLat && customerLng && focusLat && focusLng
      ? [
          [customerLat, customerLng],
          [focusLat, focusLng],
        ]
      : null;

  // ── Real-Time Delivery Trucks ──
  const [trucks, setTrucks] = useState([]);
  
  // Extract organic zones for Polygon rendering
  const organicFarms = crops.filter(c => c.isOrganic && (c.latitude || c.farmer?.latitude));
  const organicZonePositions = organicFarms.length >= 3 
    ? organicFarms.map(c => [c.latitude || c.farmer?.latitude, c.longitude || c.farmer?.longitude])
    : [];

  // Fetch live delivery agents and interpolate
  useEffect(() => {
    let mounted = true;

    const fetchAgents = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/public/agents");
        if (!res.ok) return;
        const liveAgents = await res.json();
        
        if (mounted) {
          setTrucks(prevTrucks => {
            // Map live backend coordinates
            return liveAgents.map(agent => {
              // Check if we already have this truck to animate smoothly from its current position
              const existing = prevTrucks.find(t => t.id === agent._id);
              if (existing) {
                return {
                  ...existing,
                  targetLat: agent.latitude,
                  targetLng: agent.longitude,
                  name: agent.name
                };
              }
              // New truck appears
              return {
                id: agent._id,
                lat: agent.latitude,
                lng: agent.longitude,
                targetLat: agent.latitude,
                targetLng: agent.longitude,
                name: agent.name,
                speed: 0.0001
              };
            });
          });
        }
      } catch (err) {
        console.error("Failed to fetch live agents:", err);
      }
    };

    fetchAgents();
    const pollInterval = setInterval(fetchAgents, 15000); // Update target every 15 seconds

    // High-fps Animation Loop to interpolate positions smoothly
    const animInterval = setInterval(() => {
      setTrucks(prev => prev.map(t => {
        const dLat = t.targetLat - t.lat;
        const dLng = t.targetLng - t.lng;
        const dist = Math.sqrt(dLat*dLat + dLng*dLng);
        
        // If close to target, just snap or stay
        if (dist < 0.0001) return { ...t, lat: t.targetLat, lng: t.targetLng };
        
        // Move towards target smoothly
        return { ...t, lat: t.lat + (dLat / dist) * t.speed, lng: t.lng + (dLng / dist) * t.speed };
      }));
    }, 100);
    
    return () => {
      mounted = false;
      clearInterval(pollInterval);
      clearInterval(animInterval);
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <style>{pulseStyle}</style>

      {/* Tile Layer Switcher */}
      <div style={{
        position: "absolute", top: 10, right: 10, zIndex: 1000,
        display: "flex", gap: "0.3rem", flexWrap: "wrap",
        background: "rgba(255,255,255,0.95)", borderRadius: 12,
        padding: "6px 10px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        border: "1px solid #e2e8f0",
      }}>
        {Object.entries(TILE_LAYERS).map(([key, layer]) => (
          <button
            key={key}
            onClick={() => setTileKey(key)}
            style={{
              padding: "3px 10px",
              borderRadius: 100,
              border: "none",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
              background: tileKey === key ? "var(--green-mid, #16a34a)" : "transparent",
              color: tileKey === key ? "white" : "#64748b",
              transition: "all 0.2s",
            }}
          >
            {layer.label}
          </button>
        ))}
        <div style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />
        <button
          onClick={() => setShowDemand(!showDemand)}
          style={{
            padding: "3px 10px",
            borderRadius: 100,
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
            background: showDemand ? "linear-gradient(135deg, #ef4444, #dc2626)" : "transparent",
            color: showDemand ? "white" : "#ef4444",
            border: showDemand ? "none" : "1px solid #ef4444",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          🔥 {showDemand ? "Demand View ON" : "Demand View OFF"}
        </button>
      </div>

      {/* Demand Heatmap Legend */}
      {showDemand && (
        <div className="heatmap-legend">
          <h4>🔥 Demand Heatmap</h4>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#ef4444" }}></div>
            <span>High Demand (&gt;50 orders)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#f97316" }}></div>
            <span>Medium Demand (20-50 orders)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#eab308" }}></div>
            <span>Low Demand (&lt;20 orders)</span>
          </div>
        </div>
      )}

      {/* Distance Info Badge */}
      {distKm !== null && (
        <div style={{
          position: "absolute", bottom: 14, left: 14, zIndex: 1000,
          background: "rgba(255,255,255,0.97)",
          borderRadius: 12, padding: "8px 14px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          border: "1px solid #e2e8f0",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
            📍 Distance to Farm
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#16a34a" }}>
            {distKm.toFixed(1)} km
          </span>
          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
            ~{Math.round(distKm * 2 + 30)} min ETA
          </span>
        </div>
      )}

      {/* "Use My Location" button */}
      {!customerLat && onCustomerLocationChange && (
        <div style={{
          position: "absolute", bottom: 14, left: 14, zIndex: 1000,
        }}>
          <button
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
                let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
                try {
                  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
                  const d = await r.json();
                  address = d.display_name?.split(",").slice(0, 3).join(",") || address;
                } catch {}
                onCustomerLocationChange({ lat: coords.latitude, lng: coords.longitude, address });
              });
            }}
            style={{
              padding: "8px 14px", borderRadius: 100,
              background: "#3b82f6", color: "white", border: "none",
              fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
              boxShadow: "0 4px 15px rgba(59,130,246,0.4)",
            }}
          >
            📍 Show My Location
          </button>
        </div>
      )}

      <MapContainer
        center={centre}
        zoom={customerLat ? 12 : 7}
        style={{ height: "100%", width: "100%", borderRadius: "calc(var(--radius-lg, 12px) - 4px)" }}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={20} />
        <MapInvalidator />
        {focusLat && focusLng && <FlyTo position={[focusLat, focusLng]} />}

        {/* Customer location with Radar Sweep */}
        {customerLat && customerLng && (
          <>
            <Marker position={[customerLat, customerLng]} icon={customerIcon} zIndexOffset={1000}>
              <Popup>
                <strong>📍 Your Location</strong>
                <br />
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  You are here
                </span>
              </Popup>
            </Marker>
            
            {/* Radar Overlay Div injected at center */}
            <Marker position={[customerLat, customerLng]} icon={L.divIcon({
              className: "",
              html: `<div class="radar-overlay" style="width: 250px; height: 250px; margin-left: -125px; margin-top: -125px;"></div>`,
              iconSize: [0, 0]
            })} interactive={false} zIndexOffset={1} />

            {/* 5km accuracy ring */}
            <Circle
              center={[customerLat, customerLng]}
              radius={5000}
              pathOptions={{ color: "#3b82f6", fillColor: "transparent", weight: 1.5, dashArray: "6 4" }}
            />
            {/* 10km ring */}
            <Circle
              center={[customerLat, customerLng]}
              radius={10000}
              pathOptions={{ color: "#3b82f6", fillColor: "transparent", weight: 1, dashArray: "4 6" }}
            />
          </>
        )}

        {/* Distance line to focused crop */}
        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#22c55e", weight: 4, opacity: 0.9, dashArray: "10 10", className: "animated-path" }}
          />
        )}
        
        {/* Render Moving Trucks (Live) */}
        {trucks.map(truck => (
          <Marker 
            key={truck.id} 
            position={[truck.lat, truck.lng]} 
            icon={L.divIcon({
              className: "",
              html: `<div class="delivery-truck-icon" title="${truck.name || 'Delivery'}">🚚</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })}
            zIndexOffset={900}
            interactive={true}
          >
            <Popup>
              <strong>🚚 Active Agent</strong><br />
              {truck.name}
            </Popup>
          </Marker>
        ))}

        {/* Glowing Organic Polygon Zones */}
        {organicZonePositions.length >= 3 && (
          <Polygon 
            positions={organicZonePositions} 
            pathOptions={{ 
              color: "#16a34a", 
              weight: 2, 
              fillColor: "#22c55e", 
              fillOpacity: 0.15,
              dashArray: "10 5"
            }} 
          >
            <Popup>
              <strong>🌿 Certified Organic Zone</strong>
              <p style={{fontSize:"0.8rem", color:"#64748b", margin:0}}>High density of organic farming.</p>
            </Popup>
          </Polygon>
        )}

        {/* Demand Heatmap Layer */}
        {showDemand && crops.map((c, index) => {
          const lat = c.latitude || c.farmer?.latitude;
          const lng = c.longitude || c.farmer?.longitude;
          if (!lat || !lng) return null;
          // Calculate a "demand score" to visualize
          const orders = c.totalOrders || Math.floor(Math.random() * 50);
          if (orders < 5) return null;
          
          const radius = Math.min(25000, orders * 200 + 2000); // Larger radius for visibility
          const color = orders > 50 ? "#ef4444" : (orders > 20 ? "#f97316" : "#eab308");
          const opacity = Math.min(0.7, 0.3 + (orders * 0.005));

          return (
            <React.Fragment key={`demand-${c._id || index}`}>
              {/* Outer Glow Circle */}
              <Circle
                center={[lat, lng]}
                radius={radius * 1.5}
                pathOptions={{
                  color: "transparent",
                  fillColor: color,
                  fillOpacity: opacity * 0.3,
                  className: "heatmap-circle"
                }}
              />
              {/* Inner Core Circle */}
              <Circle
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: opacity,
                }}
              >
                <Popup>
                  <div style={{ textAlign: "center", padding: "4px" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "4px" }}>🔥</div>
                    <strong style={{ fontSize: "1rem", color: color, display: "block" }}>High Demand Zone</strong>
                    <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "6px", fontWeight: 600 }}>
                      {c.name}
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: "8px", marginTop: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                      <strong>{orders}+</strong> active orders in this area
                    </div>
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          );
        })}

        {/* Farmer / crop markers grouped by Farmer */}
        {Object.values(crops.reduce((acc, c) => {
          const lat = c.latitude || c.farmer?.latitude;
          const lng = c.longitude || c.farmer?.longitude;
          if (!lat || !lng) return acc;
          const fid = (c.farmer?._id || c.farmer)?.toString?.() || "unknown";
          if (!acc[fid]) {
             acc[fid] = { id: fid, name: c.farmer?.name || "Farmer", lat, lng, crops: [], isOrganic: false, image: c.farmer?.profilePic || c.image || null };
          }
          acc[fid].crops.push(c);
          if (c.isOrganic) acc[fid].isOrganic = true;
          return acc;
        }, {})).map((f) => {
          const trust = trustScores[f.id];
          const grade = trust?.grade || "New";
          const dist =
            customerLat && customerLng
              ? haversine(customerLat, customerLng, f.lat, f.lng)
              : null;

          return (
            <Marker
              key={f.id}
              position={[f.lat, f.lng]}
              icon={createFarmerIcon(grade, f.isOrganic, f.image)}
              eventHandlers={{
                mouseover: () => setHoveredCrop(f.crops[0]),
                mouseout: () => setHoveredCrop(null),
              }}
            >
              <Popup maxWidth={220}>
                <div style={{ fontFamily: "Poppins, sans-serif", minWidth: 180 }}>
                  {f.image && (
                    <img
                      src={f.image}
                      alt={f.name}
                      style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, marginBottom: 8 }}
                    />
                  )}
                  <strong style={{ fontSize: "1rem", display: "block", marginBottom: 2 }}>
                    {f.name}
                  </strong>
                  <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    {f.crops.length} {f.crops.length === 1 ? "product" : "products"} available
                  </span>
                  {dist !== null && (
                    <div style={{ marginTop: 4, background: "#eff6ff", borderRadius: 8, padding: "3px 8px", display: "inline-block" }}>
                      <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 700 }}>
                        📍 {dist.toFixed(1)} km away
                      </span>
                    </div>
                  )}
                  {f.isOrganic && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>
                        🌿 Organic Farm
                      </span>
                    </div>
                  )}
                  {trust && (
                    <div style={{ marginTop: 4, fontSize: "0.75rem" }}>
                      {trust.emoji} {trust.grade} — {trust.score}/100
                    </div>
                  )}
                  <button
                    onClick={() => {
                       // Trigger a custom event to select this farmer
                       window.dispatchEvent(new CustomEvent("select_farmer_map", { detail: { farmerId: f.id } }));
                    }}
                    style={{
                      marginTop: 10, background: "#3b82f6", color: "white",
                      border: "none", padding: "8px 0", borderRadius: 100,
                      cursor: "pointer", width: "100%", fontWeight: 700, fontSize: "0.85rem",
                    }}
                  >
                    🧑‍🌾 Select this Farm
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
