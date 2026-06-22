import { BASE_URL } from '../../api/api';
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useCart } from "../../context/CartContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import { io } from "socket.io-client";
import { parseSpokenNumber, playTTS } from "../../utils/voiceParser";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Map as MapIcon, List, ShoppingBag, Truck, PackageCheck, Package, Users, Zap, Filter, X, MapPin, Leaf, Shield, ArrowUpDown, ChevronDown, ChevronUp, Star, Sparkles, LocateFixed, DollarSign, SlidersHorizontal, Navigation, Volume2, VolumeX } from "lucide-react";
import LiveMapModal from "../../components/LiveMapModal";
import PaymentModal from "../../components/PaymentModal";
import useMarketAudio from "../../hooks/useMarketAudio";
import MarketplaceMap from "../../components/MarketplaceMap";
import LocationButton from "../../components/LocationButton";
import VoiceMicButton from "../../components/VoiceMicButton";



// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const farmerIcon = L.divIcon({
  className: "custom-farmer-icon",
  html: `<div style="
    display: flex;
    justify-content: center;
    align-items: center;
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #2d7a4f, #1b4d3e);
    border: 2px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  ">
    <div style="
      transform: rotate(45deg);
      font-size: 1.25rem;
    ">🌾</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Haversine distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FlyToMarker({ crop }) {
  const map = useMap();
  useEffect(() => {
    const lat = crop?.latitude || crop?.farmer?.latitude;
    const lng = crop?.longitude || crop?.farmer?.longitude;
    if (lat && lng) {
      map.flyTo([lat, lng], 12, { duration: 1.2 });
    }
  }, [crop]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

// ─── Trust Score Badge Component ───
function TrustBadge({ trust, size = "sm" }) {
  if (!trust) return null;
  
  const gradeColors = {
    Platinum: { bg: "linear-gradient(135deg, #7c3aed, #a855f7)", text: "#fff", border: "#c084fc", glow: "rgba(124, 58, 237, 0.3)" },
    Gold:     { bg: "linear-gradient(135deg, #d97706, #f59e0b)", text: "#fff", border: "#fbbf24", glow: "rgba(217, 119, 6, 0.3)" },
    Silver:   { bg: "linear-gradient(135deg, #6b7280, #9ca3af)", text: "#fff", border: "#d1d5db", glow: "rgba(107, 114, 128, 0.2)" },
    Bronze:   { bg: "linear-gradient(135deg, #c2410c, #ea580c)", text: "#fff", border: "#fb923c", glow: "rgba(194, 65, 12, 0.3)" },
    New:      { bg: "linear-gradient(135deg, #16a34a, #22c55e)", text: "#fff", border: "#4ade80", glow: "rgba(22, 163, 74, 0.2)" },
  };

  const colors = gradeColors[trust.grade] || gradeColors.New;
  const isSmall = size === "sm";

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: isSmall ? "0.3rem" : "0.5rem",
      background: colors.bg,
      color: colors.text,
      padding: isSmall ? "0.2rem 0.6rem" : "0.35rem 0.85rem",
      borderRadius: "100px",
      fontSize: isSmall ? "0.7rem" : "0.8rem",
      fontWeight: 700,
      border: `1px solid ${colors.border}`,
      boxShadow: `0 2px 8px ${colors.glow}`,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap"
    }} title={`Trust Score: ${trust.score}/100 — ${trust.label}`}>
      <span>{trust.emoji}</span>
      <span>{trust.score}</span>
      {!isSmall && <span style={{ opacity: 0.85, fontSize: "0.7rem" }}>/ 100</span>}
    </div>
  );
}

// ─── Distance Badge ───
function DistanceBadge({ distance }) {
  if (distance === null || distance === undefined) return null;
  const rounded = Math.round(distance * 10) / 10;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
      background: "rgba(59, 130, 246, 0.1)",
      color: "#2563eb",
      padding: "0.2rem 0.55rem",
      borderRadius: "100px",
      fontSize: "0.72rem",
      fontWeight: 600,
      border: "1px solid rgba(59, 130, 246, 0.2)"
    }}>
      <MapPin size={11} /> {rounded} km
    </span>
  );
}

import CustomerOrders from "./CustomerOrders";
import CustomerGroups from "./CustomerGroups";
import RythuSethuAnimation from "../../components/RythuSethuAnimation";
import FarmTourModal from "../../components/FarmTourModal";

// Helper to get current active agricultural season in India based on month
const getCurrentIndianSeason = () => {
  const month = new Date().getMonth() + 1; // 1 to 12
  // Zaid (Summer): March (3) to June (6)
  if (month >= 3 && month <= 6) return "Summer (Zaid)";
  // Kharif (Monsoon): July (7) to October (10)
  if (month >= 7 && month <= 10) return "Monsoon (Kharif)";
  // Rabi (Winter): November (11) to February (2)
  return "Winter (Rabi)";
};

// Returns accurate seasonal crops based on actual Indian weather patterns
const getSeasonalCrops = () => {
  const season = getCurrentIndianSeason();
  if (season === "Summer (Zaid)") return ["watermelon", "cucumber", "mango", "papaya", "tomato", "chili", "okra"];
  if (season === "Monsoon (Kharif)") return ["rice", "maize", "cotton", "groundnut", "sugarcane", "brinjal", "turmeric", "ginger"];
  return ["wheat", "mustard", "potato", "onion", "cabbage", "cauliflower", "spinach", "carrot", "peas", "garlic", "apple"];
};

// Helper for dynamic image URLs (handles both farmer uploads and ML placeholders)
const getImgSrc = (img) => {
  if (!img) return null;
  return img.startsWith("http") ? img : `${BASE_URL}${img}`;
};

export default function Marketplace() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { addToCart, setIsCartOpen } = useCart();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);

  const [mainTab, setMainTab] = useState("shop"); // "shop", "orders", "groups"

  const [crops, setCrops] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [orderAddr, setOrderAddr] = useState("");
  const [orderLat, setOrderLat] = useState(null);
  const [orderLng, setOrderLng] = useState(null);
  const [deliveryType, setDeliveryType] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [nutritionData, setNutrition] = useState(null);
  const [nutLoading, setNutLoading] = useState(false);
  const [priceTrends, setPriceTrends] = useState(null);
  const [basketSuggestions, setBasketSuggestions] = useState([]);
  const [basketLoading, setBasketLoading] = useState(false);
  const [basketDataDriven, setBasketDataDriven] = useState(false);
  const [viewTab, setViewTab] = useState("list");
  const [showBill, setShowBill] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showFarmTour, setShowFarmTour] = useState(null);
  const [festivalConfig, setFestivalConfig] = useState(null);

  // ─── Advanced Search State ───
  const [showFilters, setShowFilters] = useState(false);
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterPesticideFree, setFilterPesticideFree] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMaxDistance, setFilterMaxDistance] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [customerLat, setCustomerLat] = useState(null);
  const [customerLng, setCustomerLng] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trustScores, setTrustScores] = useState({});
  const [trustScoreDetail, setTrustScoreDetail] = useState(null);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const searchRef = useRef(null);
  const suggestionsTimeoutRef = useRef(null);

  // ── Immersive Market Audio ──────────────────────────────────────────────
  const { isActive: audioActive, toggle: toggleAudio, focusCrop, blurCrop } = useMarketAudio(crops, lang);

  // Allow Navbar speaker button to toggle audio via custom event
  useEffect(() => {
    const handler = () => toggleAudio();
    window.addEventListener("market_announcer_toggle", handler);
    return () => window.removeEventListener("market_announcer_toggle", handler);
  }, [toggleAudio]);

  // Sync audioActive state back to Navbar so button icon stays in sync
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("market_audio_state", { detail: { isActive: audioActive } }));
  }, [audioActive]);

  const CATS = ["all","vegetable","fruit","grain","pulse","spice","dairy","other"];
  const DELIVERY_BASE = 30;
  const DELIVERY_PER_KM = 5;

  const DISTANCE_OPTIONS = [
    { label: "Any", value: "" },
    { label: "5 km", value: "5" },
    { label: "10 km", value: "10" },
    { label: "25 km", value: "25" },
    { label: "50 km", value: "50" },
    { label: "100 km", value: "100" },
  ];

  const SORT_OPTIONS = [
    { label: "⏰ Newest First", value: "newest" },
    { label: "💰 Price: Low → High", value: "price_asc" },
    { label: "💸 Price: High → Low", value: "price_desc" },
    { label: "📍 Distance: Nearest", value: "distance" },
    { label: "🛡️ Trust Score", value: "trust_score" },
    { label: "⭐ Rating", value: "rating" },
  ];

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filterOrganic) count++;
    if (filterPesticideFree) count++;
    if (filterMinPrice) count++;
    if (filterMaxPrice) count++;
    if (filterMaxDistance) count++;
    if (sortBy !== "newest") count++;
    setActiveFilterCount(count);
  }, [filterOrganic, filterPesticideFree, filterMinPrice, filterMaxPrice, filterMaxDistance, sortBy]);

  useEffect(() => { 
    fetchCrops();
    fetchFestivalConfig();
    if (user) fetchMyOrders();
    const socket = io(BASE_URL);
    socket.on("order_created", () => fetchCrops());
    socket.on("order_updated", () => { if (user) fetchMyOrders(); });
    socket.on("festival_activated", (cfg) => {
      if (cfg.isFestivalActive) setFestivalConfig(cfg);
      else setFestivalConfig(null);
    });

    // AI Autofill Listener
    const handleAIAutofill = (e) => {
      if (e.detail.context === "marketplace_search" && e.detail.parsedData) {
        const pd = e.detail.parsedData;
        if (pd.searchQuery) setSearch(pd.searchQuery);
        if (pd.category) setCategory(pd.category);
        setViewTab("list"); // Ensure they see the results
      }
    };
    window.addEventListener("ai_autofill", handleAIAutofill);

    return () => {
      socket.disconnect();
      window.removeEventListener("ai_autofill", handleAIAutofill);
    };
  }, []);

  // ─── Advanced filtering (client-side on the fetched crops) ───
  useEffect(() => {
    let f = [...crops];

    // Category filter
    if (category !== "all") f = f.filter(c => c.category === category);

    // Case-insensitive search (supports mixed case / capital letters)
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      f = f.filter(c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.category?.toLowerCase().includes(searchLower) ||
        c.location?.toLowerCase().includes(searchLower)
      );
    }

    // Organic filter
    if (filterOrganic) {
      f = f.filter(c => c.isOrganic);
    }

    // Pesticide-free filter
    if (filterPesticideFree) {
      f = f.filter(c => c.isPesticideFree || c.isOrganic);
    }

    // Price range filter
    if (filterMinPrice) {
      f = f.filter(c => c.price >= Number(filterMinPrice));
    }
    if (filterMaxPrice) {
      f = f.filter(c => c.price <= Number(filterMaxPrice));
    }

    // Distance filter (requires customer location)
    if (filterMaxDistance && customerLat && customerLng) {
      const maxDist = Number(filterMaxDistance);
      f = f.filter(c => {
        const cLat = c.latitude || c.farmer?.latitude;
        const cLng = c.longitude || c.farmer?.longitude;
        const dist = haversineDistance(customerLat, customerLng, cLat, cLng);
        return dist !== null && dist <= maxDist;
      });
    }

    // Sorting
    if (sortBy === "price_asc") {
      f.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      f.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "distance" && customerLat && customerLng) {
      f.sort((a, b) => {
        const dA = haversineDistance(customerLat, customerLng, a.latitude || a.farmer?.latitude, a.longitude || a.farmer?.longitude);
        const dB = haversineDistance(customerLat, customerLng, b.latitude || b.farmer?.latitude, b.longitude || b.farmer?.longitude);
        if (dA === null) return 1;
        if (dB === null) return -1;
        return dA - dB;
      });
    } else if (sortBy === "trust_score") {
      f.sort((a, b) => {
        const aFid = (a.farmer?._id || a.farmer)?.toString?.() || "";
        const bFid = (b.farmer?._id || b.farmer)?.toString?.() || "";
        return (trustScores[bFid]?.score || 0) - (trustScores[aFid]?.score || 0);
      });
    } else if (sortBy === "rating") {
      f.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFiltered(f);
  }, [crops, search, category, filterOrganic, filterPesticideFree, filterMinPrice, filterMaxPrice, filterMaxDistance, sortBy, customerLat, customerLng, trustScores]);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const res = await API.get("/crops");
      const available = res.data.filter(c => c.isAvailable !== false && c.quantity > 0);
      setCrops(available);
      setFiltered(available);

      // Fetch trust scores for all farmers in the crops
      const farmerIds = [...new Set(available.map(c => {
        const fid = c.farmer?._id || c.farmer;
        return typeof fid === "object" ? fid?.toString?.() : fid;
      }).filter(Boolean))];

      if (farmerIds.length > 0) {
        try {
          const tsRes = await API.post("/farmer/trust-scores-batch", { farmerIds });
          setTrustScores(tsRes.data);
        } catch {}
      }
    } catch {} finally { setLoading(false); }
  };

  const fetchFestivalConfig = async () => {
    try {
      const res = await API.get("/public/festival");
      if (res.data && res.data.isFestivalActive) {
        setFestivalConfig(res.data);
      }
    } catch {}
  };

  const fetchMyOrders = async () => {
    try {
      const res = await API.get(`/orders/customer/${user._id}`);
      setMyOrders(res.data);
    } catch {}
  };

  // ─── Fetch search suggestions ───
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await API.get(`/crops/suggestions?q=${encodeURIComponent(query)}`);
      setSuggestions(res.data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  // Debounced suggestion fetching
  const handleSearchChange = (val) => {
    setSearch(val);
    if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    suggestionsTimeoutRef.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const applySuggestion = (sug) => {
    setSearch(sug.searchQuery || sug.text);
    if (sug.filter) {
      if (sug.filter.isOrganic) setFilterOrganic(true);
      if (sug.filter.isPesticideFree) setFilterPesticideFree(true);
      if (sug.filter.maxPrice) setFilterMaxPrice(String(sug.filter.maxPrice));
    }
    setShowSuggestions(false);
  };

  // ─── Detect customer location ───
  const detectCustomerLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setCustomerLat(coords.latitude);
      setCustomerLng(coords.longitude);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setLocationName(d.address?.city || d.address?.town || d.address?.village || d.display_name?.split(",")[0] || `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
      } catch { 
        setLocationName(`${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
      }
      setLocationLoading(false);
    }, () => { alert("Could not get location"); setLocationLoading(false); });
  };

  // ─── Reset all filters ───
  const resetFilters = () => {
    setFilterOrganic(false);
    setFilterPesticideFree(false);
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMaxDistance("");
    setSortBy("newest");
    setSearch("");
    setCategory("all");
  };

  // Calculate delivery distance and charges
  const cropLat = selected?.latitude || selected?.farmer?.latitude;
  const cropLng = selected?.longitude || selected?.farmer?.longitude;
  const deliveryDistance = selected ? haversineDistance(
    cropLat, cropLng, orderLat, orderLng
  ) || 0 : 0;
  const deliveryCharges = deliveryType === "farm_pickup" ? 0 : Math.round(DELIVERY_BASE + (deliveryDistance * DELIVERY_PER_KM));
  const selectedPrice = selected ? (festivalConfig ? Math.round(selected.price * (1 - festivalConfig.discountPercentage / 100)) : selected.price) : 0;
  const subtotal = selected ? selectedPrice * orderQty : 0;
  const totalBeforeDiscount = subtotal + deliveryCharges;
  const maxPoints = Math.min(user?.rewardPoints || 0, totalBeforeDiscount);
  const pointsDiscount = usePoints ? maxPoints : 0;
  const totalAmount = totalBeforeDiscount - pointsDiscount;

  const openCrop = async (crop) => {
    setSelected(crop);
    setShowModal(true);
    setNutrition(null);
    setPriceTrends(null);
    setBasketSuggestions([]);
    setOrderQty(1);
    setDeliveryType("standard");
    setUsePoints(false);
    setShowBill(null);
    setMsg({ type:"", text:"" });
    
    setNutLoading(true);
    setBasketLoading(true);
    
    try {
      const res = await API.post("/ml/nutrition", { crop: crop.name });
      setNutrition(res.data);
    } catch {} finally { setNutLoading(false); }

    try {
      const res = await API.post("/ml/market-basket", { crop: crop.name });
      setBasketSuggestions(res.data.suggestions || []);
      setBasketDataDriven((res.data.totalBaskets || 0) > 0);
    } catch {} finally { setBasketLoading(false); }

    try {
      const res = await API.post("/ml/price-trends", { crop: crop.name });
      setPriceTrends(res.data);
    } catch {}
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setOrderLat(coords.latitude);
      setOrderLng(coords.longitude);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setOrderAddr(d.display_name || `${coords.latitude}, ${coords.longitude}`);
      } catch { 
        setOrderAddr(`${coords.latitude}, ${coords.longitude}`);
      }
    }, () => { alert("Could not get location"); });
  };

  // ─── View Trust Score Detail Modal ───
  const viewTrustScore = async (farmerId) => {
    try {
      const res = await API.get(`/farmer/trust-score/${farmerId}`);
      setTrustScoreDetail(res.data);
    } catch {}
  };

  const placeOrder = () => {
    if (!user) { setMsg({ type:"error", text:"Please login to place an order." }); return; }
    if (orderQty < 1) { setMsg({ type:"error", text:"Quantity must be at least 1." }); return; }
    if (deliveryType !== "farm_pickup" && !orderAddr) { setMsg({ type:"error", text:"Please enter your delivery address." }); return; }
    setOrdering(true); setMsg({ type:"", text:"" });
    
    // Open the new sleek Payment Modal instead of Razorpay directly
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (method) => {
    setShowPaymentModal(false);
    if (method === "cod") {
      await createPlatformOrder("cod", "pending");
    } else {
      await createPlatformOrder(method, "paid");
    }
  };

  const createPlatformOrder = async (payMode, payStatus) => {
    const orderData = {
      crop: selected._id,
      customer: user._id,
      farmer: selected.farmer?._id || selected.farmer,
      quantity: orderQty,
      totalAmount,
      subtotal,
      deliveryCharges,
      pointsUsed: pointsDiscount,
      deliveryDistance: Math.round(deliveryDistance * 10) / 10,
      deliveryType,
      paymentMode: payMode,
      paymentStatus: payStatus,
      deliveryAddress: deliveryType === "farm_pickup" ? "Farm Pickup" : orderAddr,
      deliveryLatitude: orderLat,
      deliveryLongitude: orderLng,
    };

    const res = await API.post("/orders/create", orderData);
    setShowBill({
      billNumber: res.data.billNumber,
      cropName: selected.name,
      quantity: orderQty,
      unit: selected.unit || "kg",
      unitPrice: selectedPrice,
      subtotal,
      deliveryType,
      deliveryCharges,
      pointsUsed: pointsDiscount,
      deliveryDistance: Math.round(deliveryDistance * 10) / 10,
      totalAmount,
      paymentMode: payMode,
      farmerName: selected.farmer?.name || "Farmer",
      farmerLocation: selected.location || "",
      customerName: user.name,
      deliveryAddress: deliveryType === "farm_pickup" ? "Farm Pickup" : orderAddr,
      date: new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })
    });
    setMsg({ type:"success", text:`✅ Order placed successfully!` });
    fetchCrops();
    if (user) fetchMyOrders();
    setOrdering(false);
  };

  const mapLocations = filtered.filter(c => {
    const lat = c.latitude || c.farmer?.latitude;
    const lng = c.longitude || c.farmer?.longitude;
    return lat !== undefined && lat !== null && lng !== undefined && lng !== null;
  });

  // Helper: get distance for a crop
  const getCropDistance = (crop) => {
    if (!customerLat || !customerLng) return null;
    const cLat = crop.latitude || crop.farmer?.latitude;
    const cLng = crop.longitude || crop.farmer?.longitude;
    return haversineDistance(customerLat, customerLng, cLat, cLng);
  };

  // Helper: get trust score for a crop's farmer
  const getCropTrust = (crop) => {
    const fid = (crop.farmer?._id || crop.farmer)?.toString?.() || "";
    return trustScores[fid] || null;
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // ─── Quick Filter Chips ───
  const QuickFilterChips = () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setFilterOrganic(!filterOrganic); setShowFilters(true); }}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600,
          border: filterOrganic ? "1.5px solid #16a34a" : "1px solid #e2e8f0",
          background: filterOrganic ? "rgba(22, 163, 74, 0.1)" : "white",
          color: filterOrganic ? "#16a34a" : "var(--text-mid)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
          transition: "all 0.2s"
        }}>
        <Leaf size={13} /> Organic
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setFilterPesticideFree(!filterPesticideFree); setShowFilters(true); }}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600,
          border: filterPesticideFree ? "1.5px solid #059669" : "1px solid #e2e8f0",
          background: filterPesticideFree ? "rgba(5, 150, 105, 0.1)" : "white",
          color: filterPesticideFree ? "#059669" : "var(--text-mid)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
          transition: "all 0.2s"
        }}>
        <Shield size={13} /> Pesticide Free
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (!customerLat) detectCustomerLocation();
          setFilterMaxDistance(filterMaxDistance ? "" : "10");
          setShowFilters(true);
        }}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600,
          border: filterMaxDistance ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
          background: filterMaxDistance ? "rgba(37, 99, 235, 0.1)" : "white",
          color: filterMaxDistance ? "#2563eb" : "var(--text-mid)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
          transition: "all 0.2s"
        }}>
        <MapPin size={13} /> {filterMaxDistance ? `Within ${filterMaxDistance} km` : "Near Me"}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (sortBy === "price_asc") setSortBy("price_desc");
          else setSortBy("price_asc");
        }}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600,
          border: (sortBy === "price_asc" || sortBy === "price_desc") ? "1.5px solid #d97706" : "1px solid #e2e8f0",
          background: (sortBy === "price_asc" || sortBy === "price_desc") ? "rgba(217, 119, 6, 0.1)" : "white",
          color: (sortBy === "price_asc" || sortBy === "price_desc") ? "#d97706" : "var(--text-mid)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
          transition: "all 0.2s"
        }}>
        <ArrowUpDown size={13} /> {sortBy === "price_desc" ? "Price: High → Low" : sortBy === "price_asc" ? "Price: Low → High" : "Sort by Price"}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setSortBy(sortBy === "trust_score" ? "newest" : "trust_score")}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "100px", fontSize: "0.82rem", fontWeight: 600,
          border: sortBy === "trust_score" ? "1.5px solid #7c3aed" : "1px solid #e2e8f0",
          background: sortBy === "trust_score" ? "rgba(124, 58, 237, 0.1)" : "white",
          color: sortBy === "trust_score" ? "#7c3aed" : "var(--text-mid)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
          transition: "all 0.2s"
        }}>
        <Shield size={13} /> Trust Score
      </motion.button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-wrapper" style={{ maxWidth:"100%", padding:"1.5rem" }}>
      {/* ─── MAIN TABS NAVIGATION ─── */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
        <button 
          onClick={() => setMainTab("shop")}
          style={{
            background: "none", border: "none", fontSize: "1.1rem", fontWeight: 700,
            color: mainTab === "shop" ? "var(--green-mid)" : "var(--text-mid)", cursor: "pointer",
            borderBottom: mainTab === "shop" ? "3px solid var(--green-mid)" : "3px solid transparent",
            padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem"
          }}>
          <ShoppingBag size={18} /> Marketplace
        </button>
        <button 
          onClick={() => setMainTab("orders")}
          style={{
            background: "none", border: "none", fontSize: "1.1rem", fontWeight: 700,
            color: mainTab === "orders" ? "var(--green-mid)" : "var(--text-mid)", cursor: "pointer",
            borderBottom: mainTab === "orders" ? "3px solid var(--green-mid)" : "3px solid transparent",
            padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem"
          }}>
          <Package size={18} /> My Orders
        </button>
        <button 
          onClick={() => setMainTab("groups")}
          style={{
            background: "none", border: "none", fontSize: "1.1rem", fontWeight: 700,
            color: mainTab === "groups" ? "var(--green-mid)" : "var(--text-mid)", cursor: "pointer",
            borderBottom: mainTab === "groups" ? "3px solid var(--green-mid)" : "3px solid transparent",
            padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem"
          }}>
          <Users size={18} /> Bulk Buying Groups
        </button>
      </div>

      {mainTab === "orders" ? (
        <CustomerOrders orders={myOrders} fetchOrders={fetchMyOrders} />
      ) : mainTab === "groups" ? (
        <CustomerGroups crops={crops} />
      ) : (
        <>
          {/* Premium Hero Banner */}
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        className="marketplace-hero-banner" style={{
        backgroundImage: `linear-gradient(135deg, rgba(22, 163, 74, 0.85), rgba(5, 150, 105, 0.95)), url('https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=1200&q=80')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "var(--radius-lg)",
        padding: "3.5rem 2.5rem",
        marginBottom: "2.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        boxShadow: "0 15px 35px -5px rgba(22, 163, 74, 0.2)",
        position: "relative",
        overflow: "hidden"
      }}>
        <motion.span 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ 
          background: "rgba(255, 255, 255, 0.2)", 
          color: "white", 
          padding: "0.4rem 1rem", 
          borderRadius: "100px", 
          fontSize: "0.85rem", 
          fontWeight: 700, 
          textTransform: "uppercase", 
          letterSpacing: "0.1em", 
          marginBottom: "1rem", 
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <Zap size={16} fill="white" /> {t("tagline")}
        </motion.span>
        <motion.h2 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: "white", fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem", fontFamily: "'Outfit', sans-serif" }}>
          Freshness Delivered.
        </motion.h2>
        <motion.p 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", maxWidth: "600px", margin: 0, lineHeight: 1.6 }}>
          Explore high-quality organic crops directly sourced from local farmers. Search by budget, distance, or trust score!
        </motion.p>

        {/* Location Detector in Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={detectCustomerLocation}
            disabled={locationLoading}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.6rem 1.2rem", borderRadius: "100px",
              background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "white", fontWeight: 700, fontSize: "0.88rem",
              cursor: "pointer", transition: "all 0.2s"
            }}>
            <LocateFixed size={16} className={locationLoading ? "spin-anim" : ""} />
            {locationLoading ? "Detecting..." : customerLat ? `📍 ${locationName}` : "📍 Detect My Location"}
          </button>
          {customerLat && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>
              ✅ Location set — distance filters enabled
            </span>
          )}
        </motion.div>
      </motion.div>

      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem", color:"var(--text-dark)", backgroundImage:"none", WebkitTextFillColor:"var(--text-dark)", textShadow:"none" }}>
            🛒 {t("marketplace")}
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:"0.95rem", marginBottom: "0.5rem" }}>{filtered.length} fresh products from local farmers</p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Link to="/farm-tours" className="btn-secondary" style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              🎥 Farm Tours
            </Link>
            <Link to="/curated-boxes" className="btn-secondary" style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              📦 Curated Boxes
            </Link>
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          {user && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`btn-secondary`} onClick={() => setShowOrders(!showOrders)} style={{ background:"white", color:"var(--text-dark)", borderColor:"#e2e8f0" }}>
              <PackageCheck size={18} style={{ marginRight:4 }} /> {t("myOrders")} ({myOrders.length})
            </motion.button>
          )}
          <div className="tab-bar" style={{ margin:0, background:"white", border:"1px solid #e2e8f0", padding:4, borderRadius:12 }}>
            <motion.button whileTap={{ scale: 0.95 }} className={`tab-btn ${viewTab==="list"?"active":""}`} onClick={() => setViewTab("list")} style={viewTab==="list"?{background:"var(--green-mid)", color:"white"}:{color:"var(--text-mid)"}}>
              <List size={16} style={{marginRight:4}} /> List
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className={`tab-btn ${viewTab==="map"?"active":""}`} onClick={() => setViewTab("map")} style={viewTab==="map"?{background:"var(--green-mid)", color:"white"}:{color:"var(--text-mid)"}}>
              <MapIcon size={16} style={{marginRight:4}} /> Map
            </motion.button>
          </div>
        </div>
      </div>

      {/* My Orders Panel */}
      <AnimatePresence>
        {showOrders && user && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card mb-3" style={{ overflowY:"auto", background:"white", borderColor:"#e2e8f0", borderRadius:"var(--radius-lg)" }}>
            <h3 className="section-title" style={{ fontSize:"1.1rem", color:"var(--text-dark)", marginBottom:"1rem" }}>📦 {t("myOrders")}</h3>
            {myOrders.length === 0 ? (
              <p style={{ color:"var(--text-muted)", fontSize:"0.95rem" }}>No orders yet.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {myOrders.map(o => (
                  <div key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1rem", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"var(--radius-md)" }}>
                    <div>
                      <span style={{ color:"var(--text-dark)", fontWeight:700, fontSize:"1rem", display:"block" }}>{o.crop?.name || "Order"}</span>
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>{o.quantity} {o.crop?.unit||"kg"} • {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div style={{ display:"flex", gap:"1rem", alignItems:"center" }}>
                      <span style={{ color:"var(--green-mid)", fontWeight:800, fontSize:"1.1rem" }}>₹{(o.totalAmount||0).toLocaleString()}</span>
                      <span className={`badge ${o.status==="delivered"?"badge-green":o.status==="cancelled"?"badge-red":"badge-yellow"}`}>{o.status?.replace("_"," ")}</span>
                      {(o.status === "in_transit" || o.status === "picked_up") && (
                        <button className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "flex", gap: "0.3rem" }} onClick={() => setTrackingOrder(o)}>
                          <Navigation size={14} /> Track
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* SEARCH + FILTER SECTION (Enhanced)             */}
      {/* ═══════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
        
        {/* Search Bar + Filter Toggle */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 300, position: "relative" }} ref={searchRef}>
            <AutoSuggestInput 
              value={search} 
              onChange={handleSearchChange}
              onSpeak={() => startListening((transcript) => {
                setSearch(transcript);
              }, { fieldId: "search", append: false })}
              listening={listening && activeField === "search"}
              interim={interim}
              placeholder="🔍 Search crops, vegetables, grains... (case insensitive)" 
              fieldType="default"
              style={{
                width: "100%", padding: "1.2rem 1.2rem 1.2rem 3rem", fontSize: "1.1rem",
                borderRadius: "100px", border: "1px solid #e2e8f0", background: "white",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)", outline: "none", transition: "all 0.3s"
              }}
            />

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                    background: "white", border: "1px solid #e2e8f0",
                    borderRadius: "16px", marginTop: "0.5rem",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                    overflow: "hidden", maxHeight: "320px", overflowY: "auto"
                  }}>
                  <div style={{ padding: "0.5rem" }}>
                    {suggestions.map((sug, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ background: "#f0fdf4" }}
                        onClick={() => applySuggestion(sug)}
                        style={{
                          padding: "0.7rem 1rem",
                          cursor: "pointer",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          transition: "all 0.15s"
                        }}>
                        <span style={{ fontSize: "1.1rem" }}>
                          {sug.type === "organic" ? "🌿" : sug.type === "pesticide_free" ? "🛡️" : sug.type === "budget" ? "💰" : "🔍"}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: "0.92rem" }}>{sug.text}</div>
                          {sug.type !== "name" && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {sug.type === "organic" ? "Certified organic products" : sug.type === "pesticide_free" ? "Chemical-free products" : sug.type === "budget" ? "Budget-friendly option" : ""}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sound Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleAudio}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.9rem 1.4rem", borderRadius: "100px",
              background: audioActive ? "var(--green-mid)" : "white",
              color: audioActive ? "white" : "var(--text-dark)",
              border: audioActive ? "none" : "1px solid #e2e8f0",
              fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
              boxShadow: audioActive ? "0 8px 20px rgba(22, 163, 74, 0.3)" : "0 2px 10px rgba(0,0,0,0.04)",
              transition: "all 0.25s"
            }}>
            {audioActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {audioActive ? t("Market Sounds: ON") || "Market Sounds: ON" : t("Market Sounds: OFF") || "Market Sounds: OFF"}
          </motion.button>

          {/* Filter Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.9rem 1.4rem", borderRadius: "100px",
              background: showFilters || activeFilterCount > 0 ? "var(--green-mid)" : "white",
              color: showFilters || activeFilterCount > 0 ? "white" : "var(--text-dark)",
              border: showFilters || activeFilterCount > 0 ? "none" : "1px solid #e2e8f0",
              fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
              boxShadow: showFilters || activeFilterCount > 0 ? "0 8px 20px rgba(22, 163, 74, 0.3)" : "0 2px 10px rgba(0,0,0,0.04)",
              transition: "all 0.25s", position: "relative"
            }}>
            <SlidersHorizontal size={18} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                background: showFilters ? "white" : "var(--green-mid)",
                color: showFilters ? "var(--green-mid)" : "white",
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 800
              }}>
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </motion.button>
        </div>

        {/* Quick Filter Chips */}
        <QuickFilterChips />

        {/* ─── Advanced Filters Panel ─── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}>
              <div style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "1.75rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-dark)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <SlidersHorizontal size={18} /> Advanced Filters
                  </h3>
                  <button onClick={resetFilters} style={{
                    padding: "0.4rem 1rem", borderRadius: "100px",
                    background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.35rem"
                  }}>
                    <X size={14} /> Reset All
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  
                  {/* Quality Filters */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-mid)", display: "block", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      🌿 Quality
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.92rem", color: "var(--text-dark)" }}>
                        <input type="checkbox" checked={filterOrganic} onChange={(e) => setFilterOrganic(e.target.checked)} 
                          style={{ width: 18, height: 18, accentColor: "#16a34a" }} />
                        <Leaf size={15} color="#16a34a" /> Organic Certified
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.92rem", color: "var(--text-dark)" }}>
                        <input type="checkbox" checked={filterPesticideFree} onChange={(e) => setFilterPesticideFree(e.target.checked)} 
                          style={{ width: 18, height: 18, accentColor: "#059669" }} />
                        <Shield size={15} color="#059669" /> Pesticide Free
                      </label>
                    </div>
                  </div>

                  {/* Budget / Price Range */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-mid)", display: "block", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      💰 Budget Range (₹)
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                        style={{
                          flex: 1, padding: "0.6rem 0.8rem", borderRadius: "10px",
                          border: "1px solid #e2e8f0", fontSize: "0.9rem",
                          outline: "none", background: "#f8fafc"
                        }}
                      />
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>—</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                        style={{
                          flex: 1, padding: "0.6rem 0.8rem", borderRadius: "10px",
                          border: "1px solid #e2e8f0", fontSize: "0.9rem",
                          outline: "none", background: "#f8fafc"
                        }}
                      />
                    </div>
                  </div>

                  {/* Distance Filter */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-mid)", display: "block", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      📍 Max Distance
                    </label>
                    <select
                      value={filterMaxDistance}
                      onChange={(e) => {
                        setFilterMaxDistance(e.target.value);
                        if (e.target.value && !customerLat) detectCustomerLocation();
                      }}
                      style={{
                        width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px",
                        border: "1px solid #e2e8f0", fontSize: "0.9rem",
                        outline: "none", background: "#f8fafc", cursor: "pointer"
                      }}>
                      {DISTANCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {filterMaxDistance && !customerLat && (
                      <p style={{ fontSize: "0.75rem", color: "#d97706", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        ⚠️ Enable location to use distance filter
                      </p>
                    )}
                  </div>

                  {/* Sort By */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-mid)", display: "block", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      📊 Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px",
                        border: "1px solid #e2e8f0", fontSize: "0.9rem",
                        outline: "none", background: "#f8fafc", cursor: "pointer"
                      }}>
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active filters summary */}
                {activeFilterCount > 0 && (
                  <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Sparkles size={14} color="#16a34a" />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#16a34a" }}>
                      {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active — Showing {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Horizontal Category Pill Scroll */}
        <div style={{ display:"flex", gap:"0.75rem", overflowX:"auto", paddingBottom:"0.5rem", flexShrink:0, maxWidth:"100%" }} className="no-scrollbar">
          {CATS.map(c => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={c} onClick={() => setCategory(c)} style={{
              padding:"0.6rem 1.2rem", borderRadius:"100px",
              border: category===c ? "none" : "1px solid #e2e8f0",
              background: category===c ? "var(--green-mid)" : "white",
              color: category===c ? "white" : "var(--text-mid)",
              fontSize:"0.95rem", fontWeight:700, cursor:"pointer", transition:"all 0.2s",
              whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:"0.5rem",
              boxShadow: category===c ? "0 8px 20px rgba(22, 163, 74, 0.3)" : "0 2px 10px rgba(0,0,0,0.02)"
            }}>
              {c === "all" ? `🌾 ${t("allItems")}` : c === "vegetable" ? `🥦 ${t("veggies")}` : c === "fruit" ? `🍎 ${t("fruits")}` : c === "grain" ? `🌾 ${t("grains")}` : t(c)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dynamic Nutritional Tips Widget */}
      {category !== "all" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card mb-3" 
          style={{ 
            background: "linear-gradient(135deg, rgba(22, 163, 74, 0.05), rgba(59, 130, 246, 0.05))", 
            border: "1px solid rgba(22, 163, 74, 0.2)",
            padding: "1rem 1.5rem"
          }}>
          <h4 style={{ color: "var(--green-deep)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🥗 Nutritional Tip for {category.charAt(0).toUpperCase() + category.slice(1)}s
          </h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0, fontStyle: "italic" }}>
            {category === "vegetable" && "Rich in essential vitamins, minerals, and dietary fiber! Eating dark leafy greens boosts your immune system."}
            {category === "fruit" && "Packed with natural antioxidants! Eating seasonal fruits helps maintain healthy skin and hydration."}
            {category === "grain" && "Excellent source of complex carbohydrates and energy! Whole grains reduce the risk of heart disease."}
            {category === "pulse" && "High in plant-based protein! Pulses are great for muscle building and stabilizing blood sugar levels."}
            {category === "spice" && "Boosts metabolism and reduces inflammation! Turmeric and ginger have powerful medicinal properties."}
            {category === "dairy" && "Rich in calcium and probiotics! Excellent for bone strength and maintaining a healthy gut microbiome."}
            {category === "other" && "Explore diverse agricultural products straight from local farms for a balanced lifestyle."}
          </p>
        </motion.div>
      )}

      {/* Seasonal Specials Section (ML / Data-driven Logic) */}
      {filtered.some(c => c.name && getSeasonalCrops().includes(c.name.toLowerCase().trim())) && search === "" && category === "all" && viewTab === "list" && (
        <div className="mb-3">
          <h3 className="section-title mb-1">🌤️ {t("seasonalSpecials")}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Freshly harvested {getCurrentIndianSeason()} crops highly recommended for this month.</p>
          <div className="scroll-x no-scrollbar" style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
            {filtered
              .filter(c => c.name && getSeasonalCrops().includes(c.name.toLowerCase().trim()))
              .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0)) // Sort by highest trust / demand
              .slice(0, 5)
              .map(c => (
              <div key={c._id} className="crop-card" onClick={() => openCrop(c)} style={{ minWidth: 260, cursor: "pointer", flexShrink: 0, border: "1px solid var(--green-pale)" }}>
                <div className="crop-img-wrap" style={{ height: 140 }}>
                  {c.image ? <img src={getImgSrc(c.image)} alt={c.name} /> : <div className="crop-img-fallback">🌿</div>}
                  {c.isPrebooking && <span className="organic-badge" style={{ background: "var(--yellow-wheat)", color: "black", border: "none", marginBottom: "0.2rem" }}>⏳ Pre-Book</span>}
                  {c.lifecycleStage && <span className="organic-badge" style={{ background: "#fef3c7", color: "#d97706", border: "none", textTransform: "capitalize", marginBottom: "0.2rem" }}>🌱 {c.lifecycleStage.replace("_", " ")}</span>}
                  {c.isOrganic && <span className="organic-badge">🌿 Organic</span>}
                </div>
                <div className="crop-info" style={{ padding: "1rem" }}>
                  <div className="flex-between">
                    <h3 className="crop-title" style={{ fontSize: "1.1rem" }}>{c.name}</h3>
                    <span className="crop-price">₹{c.price}/{c.unit||"kg"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
                    <TrustBadge trust={getCropTrust(c)} />
                    <DistanceBadge distance={getCropDistance(c)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {viewTab === "map" ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="marketplace-layout">
          <div className="marketplace-sidebar" style={{ background:"white", border:"1px solid #e2e8f0", borderRadius:"var(--radius-lg)" }}>
            {loading ? (
              <div className="loader-wrapper"><div className="loader"></div></div>
            ) : filtered.length === 0 ? (
              <div className="glass-card text-center" style={{ padding:"2rem", border:"none", boxShadow:"none" }}>
                <p style={{ fontSize:"2.5rem" }}>🌿</p>
                <p style={{ color:"var(--text-muted)", marginTop:"0.75rem" }}>{t("noData")}</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", padding:"1rem" }}>
                {filtered.map(c => {
                  const trust = getCropTrust(c);
                  const dist = getCropDistance(c);
                  return (
                    <motion.div whileHover={{ scale: 1.02 }} key={c._id} onClick={() => setSelected(c)} style={{
                      display:"flex", gap:"0.75rem", alignItems:"center", padding:"0.85rem",
                      background: selected?._id === c._id ? "var(--green-pale)" : "white",
                      border: selected?._id === c._id ? "1.5px solid var(--green-light)" : "1px solid #e2e8f0",
                      borderRadius:"var(--radius-md)", cursor:"pointer", transition:"all 0.2s"
                    }}>
                      <div style={{ width:56, height:56, borderRadius:8, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                        {c.image ? <img src={getImgSrc(c.image)} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{fontSize: "0.6rem", color:"var(--text-muted)", textAlign: "center"}}>No Image</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexWrap: "wrap" }}>
                          <h4 style={{ color:"var(--text-dark)", fontSize:"0.95rem", fontWeight:700 }}>{c.name}</h4>
                          {c.isOrganic && <span className="organic-tag" style={{ fontSize:"0.6rem", padding:"2px 6px" }}>🌿 Organic</span>}
                          {c.isPesticideFree && !c.isOrganic && <span className="organic-tag" style={{ fontSize:"0.6rem", padding:"2px 6px", background: "#ecfdf5", color: "#059669" }}>🛡️ PF</span>}
                        </div>
                        <div style={{ color:"var(--green-mid)", fontWeight:700, fontSize:"1rem" }}>₹{c.price}/{c.unit||"kg"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}>
                          <span style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{c.quantity} {c.unit||"kg"} left</span>
                          {trust && <TrustBadge trust={trust} size="sm" />}
                          {dist !== null && <DistanceBadge distance={dist} />}
                        </div>
                      </div>
                      <button className="btn-primary" style={{ width:"auto", padding:"0.5rem 0.85rem", fontSize:"0.8rem", flexShrink:0, borderRadius:"100px" }} onClick={(e) => { e.stopPropagation(); openCrop(c); }}>{t("buy")}</button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="marketplace-map-panel">
            <div className="map-container" style={{ border: "3px solid rgba(22,163,74,0.25)", boxShadow: "0 8px 40px rgba(22,163,74,0.12)", borderRadius: "var(--radius-lg)" }}>
              <MarketplaceMap
                crops={mapLocations}
                selected={selected}
                onCropClick={openCrop}
                trustScores={trustScores}
                customerLat={customerLat}
                customerLng={customerLng}
                onCustomerLocationChange={({ lat, lng, address }) => {
                  setCustomerLat(lat);
                  setCustomerLng(lng);
                  if (address) setLocationName(address);
                }}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        /* ── GRID LIST VIEW ── */
        loading ? (
          <div className="loader-wrapper"><div className="loader"></div><p className="loader-text" style={{color:"var(--text-muted)"}}>{t("loading")}</p></div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center" style={{ padding:"4rem", background:"white" }}>
            <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🌱</div>
            <h3 style={{ color:"var(--text-dark)", fontSize:"1.5rem" }}>{t("noData")}</h3>
            <p style={{ color:"var(--text-muted)", marginTop:"0.5rem" }}>Try adjusting your search or filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} style={{
                marginTop: "1rem", padding: "0.6rem 1.5rem", borderRadius: "100px",
                background: "var(--green-mid)", color: "white", border: "none",
                fontWeight: 700, cursor: "pointer", fontSize: "0.9rem"
              }}>
                Reset Filters
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid-auto">
            {filtered.map(c => {
              const trust = getCropTrust(c);
              const dist = getCropDistance(c);
              return (
                <motion.div
                  variants={itemVariants}
                  className="crop-card"
                  key={c._id}
                  onClick={() => openCrop(c)}
                  onMouseEnter={() => focusCrop(c)}
                  onMouseLeave={() => blurCrop()}
                  style={{ outline: audioActive ? "1px solid transparent" : undefined, transition: "outline 0.3s" }}
                >
                  {c.image
                    ? <img src={getImgSrc(c.image)} alt={c.name} />
                    : <div style={{ height:180, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                        No Image Available
                      </div>
                  }
                  <div className="crop-card-body">
                    <div className="flex-between">
                      <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {c.name}
                        <button className="tts-btn" onClick={(e) => { e.stopPropagation(); playTTS(`${c.name}. ${c.quantity} ${c.unit||"kg"} available at ${c.price} rupees per ${c.unit||"kg"}`, lang); }}><Volume2 size={16}/></button>
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        {c.isOrganic && <span className="organic-tag">🌿</span>}
                        {c.isPesticideFree && !c.isOrganic && <span className="organic-tag" style={{ background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" }}>🛡️</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
                      <div>
                        {festivalConfig ? (
                          <>
                            <div style={{ color:"var(--text-muted)", fontSize:"0.8rem", textDecoration:"line-through" }}>₹{c.price}/{c.unit}</div>
                            <div style={{ fontSize:"1.2rem", fontWeight:700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              ₹{Math.round(c.price * (1 - festivalConfig.discountPercentage / 100))}/{c.unit}
                              <span style={{ fontSize: "0.7rem", background: "var(--red-error)", color: "white", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>-{festivalConfig.discountPercentage}%</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize:"1.2rem", fontWeight:700, color: "var(--text-muted)" }}>₹{c.price}/{c.unit}</div>
                        )}
                      </div>
                      {dist !== null && <DistanceBadge distance={dist} />}
                    </div>
                    <div className="flex-between">
                      <div className="crop-qty" style={{ margin: 0 }}>{c.quantity} {c.unit||"kg"} left</div>
                      <div style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.2rem", animation: "pulse 2s infinite" }}>
                        <span style={{ fontSize: "0.9rem" }}>🔥</span> {(c._id.charCodeAt(c._id.length-1) % 12) + 3} looking
                      </div>
                    </div>
                    
                    {/* Trust Score + Distance Row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      {trust && <TrustBadge trust={trust} size="sm" />}
                    </div>
                    
                    {c.farmer && <p style={{ fontSize:"0.8rem", color:"var(--text-muted)", margin:"0.3rem 0 0.5rem", display:"flex", alignItems:"center", gap:"0.3rem" }}>👨‍🌾 {c.farmer.name} {c.farmer.farmName ? `• 🏡 ${c.farmer.farmName}` : ""}</p>}
                    {c.location && <p style={{ fontSize:"0.8rem", color:"var(--text-muted)", margin:"0.3rem 0 0.5rem", display:"flex", alignItems:"center", gap:"0.3rem" }}><MapIcon size={14}/> {c.location.substring(0,35)}...</p>}
                    
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); openCrop(c); }} style={{ fontSize:"0.85rem", padding:"0.6rem", borderRadius:"100px", flex: 1, background: c.isPrebooking ? "var(--yellow-wheat)" : "", color: c.isPrebooking ? "#000" : "" }}>
                        <ShoppingBag size={16} /> {c.isPrebooking ? "Pre-book" : t("buy")}
                      </button>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); addToCart(c, 1, c.isPrebooking || false); }} style={{ fontSize:"0.85rem", padding:"0.6rem", borderRadius:"100px", flex: 1 }}>
                        🛒 Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )
      )}

      {/* ── ORDER MODAL ── */}
      {showModal && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setMsg({ type:"", text:"" }); setShowBill(null); setTrustScoreDetail(null); } }}>
          <div className="glass-card-dark" style={{ maxWidth:600, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>

            {/* ── BILL VIEW ── */}
            {showBill ? (
              <div>
                <div className="bill-receipt">
                  <div className="bill-header">
                    <h3>🌾 Rythu Sethu — Order Bill</h3>
                    <p>Bill #{showBill.billNumber}</p>
                    <p>{showBill.date}</p>
                  </div>
                  <div className="bill-row"><span className="label">Customer</span><span>{showBill.customerName}</span></div>
                  <div className="bill-row"><span className="label">Farmer</span><span>{showBill.farmerName}</span></div>
                  <div className="bill-row"><span className="label">{deliveryType === "farm_pickup" ? "Pickup" : "Delivery"} Address</span><span>{showBill.deliveryAddress?.substring(0,40)}</span></div>
                  <div style={{ borderTop:"1px dashed rgba(82,183,136,0.3)", margin:"0.75rem 0" }}></div>
                  <div className="bill-row"><span className="label">{showBill.cropName} × {showBill.quantity} {showBill.unit}</span><span>₹{showBill.unitPrice}/{showBill.unit}</span></div>
                  <div className="bill-row"><span className="label">Subtotal</span><span>₹{showBill.subtotal.toLocaleString()}</span></div>
                  {showBill.deliveryType === "farm_pickup" ? (
                    <div className="bill-row"><span className="label">Delivery</span><span className="free">🏡 Farm Pickup — FREE</span></div>
                  ) : (
                    <div className="bill-row"><span className="label">Delivery ({showBill.deliveryDistance} km)</span><span>₹{showBill.deliveryCharges}</span></div>
                  )}
                  {showBill.pointsUsed > 0 && (
                    <div className="bill-row"><span className="label" style={{ color: "var(--green-mid)" }}>Rewards Discount</span><span style={{ color: "var(--green-mid)" }}>-₹{showBill.pointsUsed}</span></div>
                  )}
                  <div className="bill-row total"><span>Total</span><span>₹{showBill.totalAmount.toLocaleString()}</span></div>
                  <div className="bill-row"><span className="label">Payment</span><span className="badge badge-blue">{showBill.paymentMode?.toUpperCase()}</span></div>
                </div>
                <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem" }}>
                  <button className="btn-secondary" onClick={() => window.print()} style={{ flex:1 }}>🖨️ Print Bill</button>
                  <button className="btn-primary" onClick={() => { setShowModal(false); setShowBill(null); setMsg({ type:"", text:"" }); }} style={{ flex:1 }}>✅ Done</button>
                </div>
              </div>
            ) : (
              <>
                {/* Crop Header */}
                <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", alignItems:"flex-start" }}>
                  {selected.image
                    ? <img src={getImgSrc(selected.image)} alt={selected.name} style={{ width:100, height:100, objectFit:"cover", borderRadius:12, flexShrink:0 }} />
                    : <div style={{ width:100, height:100, borderRadius:12, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", color: "var(--text-muted)", flexShrink:0, textAlign: "center", padding: "0.5rem" }}>No Image</div>
                  }
                  <div>
                    <h2 style={{ color: "var(--text-dark)", fontSize:"1.4rem", fontWeight:700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {selected.name}
                      <button className="tts-btn" onClick={(e) => { e.stopPropagation(); playTTS(`Crop: ${selected.name}. Price is ${selected.price} rupees per ${selected.unit||"kg"}. Quantity available: ${selected.quantity} ${selected.unit||"kg"}`, lang); }}><Volume2 size={20}/></button>
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                      {selected.isPrebooking && <span className="organic-tag mb-1" style={{ background: "var(--yellow-wheat)", color: "#000", border: "none" }}>⏳ Pre-Booking</span>}
                      {selected.isOrganic && <span className="organic-tag mb-1">🌿 Certified Organic</span>}
                      {selected.isPesticideFree && !selected.isOrganic && <span className="organic-tag mb-1" style={{ background: "#ecfdf5", color: "#059669" }}>🛡️ Pesticide Free</span>}
                      {selected.qualityGrade && (
                        <span className="organic-tag mb-1" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--green-mid)", color: "var(--green-deep)" }}>
                          ✨ Grade {selected.qualityGrade} (AI Verified)
                        </span>
                      )}
                    </div>
                    {festivalConfig ? (
                      <>
                        <div style={{ color:"var(--text-muted)", fontSize:"0.9rem", textDecoration:"line-through", marginTop:"0.4rem" }}>₹{selected.price}/{selected.unit||"kg"}</div>
                        <div style={{ color:"var(--yellow-wheat)", fontSize:"1.3rem", fontWeight:800 }}>
                          ₹{selectedPrice}/{selected.unit||"kg"}
                          <span style={{ fontSize: "0.8rem", background: "var(--red-error)", color: "white", padding: "0.1rem 0.4rem", borderRadius: "4px", marginLeft: "0.5rem", verticalAlign: "middle" }}>-{festivalConfig.discountPercentage}% OFF</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ color:"var(--yellow-wheat)", fontSize:"1.3rem", fontWeight:800, marginTop:"0.4rem" }}>₹{selected.price}/{selected.unit||"kg"}</div>
                    )}
                    <div style={{ color: "var(--text-muted)", fontSize:"0.82rem", marginTop:"0.25rem" }}>
                      📦 {selected.quantity} {selected.unit||"kg"} {selected.isPrebooking ? "available for pre-order" : "in stock"} • {selected.category}
                    </div>
                    {selected.farmer && <div style={{ color:"var(--text-muted)", fontSize:"0.75rem", marginTop:"0.2rem" }}>👨‍🌾 {selected.farmer.name} {selected.farmer.farmName ? `• 🏡 ${selected.farmer.farmName}` : ""}</div>}
                    {selected.farmLocation && selected.farmLocation !== selected.location && (
                      <div style={{ color:"var(--text-muted)", fontSize:"0.75rem", marginTop:"0.2rem" }}>
                        🌱 <strong style={{ color: "var(--text-dark)" }}>Farm:</strong> {selected.farmLocation.substring(0,50)}
                      </div>
                    )}
                    {selected.location && (
                      <div style={{ color:"var(--text-muted)", fontSize:"0.75rem", marginTop:"0.2rem" }}>
                        📍 <strong style={{ color: "var(--text-dark)" }}>Product Location:</strong> {selected.location.substring(0,50)}
                      </div>
                    )}
                    
                    {/* Farmer Trust Score in Modal */}
                    {(() => {
                      const trust = getCropTrust(selected);
                      const dist = getCropDistance(selected);
                      return (trust || dist !== null) ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          {trust && (
                            <div 
                              onClick={(e) => { e.stopPropagation(); viewTrustScore(selected.farmer?._id || selected.farmer); }}
                              style={{ cursor: "pointer" }}
                              title="Click to see trust score breakdown">
                              <TrustBadge trust={trust} size="md" />
                            </div>
                          )}
                          {dist !== null && <DistanceBadge distance={dist} />}
                        </div>
                      ) : null;
                    })()}
                    
                    {(selected.farmTourUrl || selected.farmTourVideo) && (
                      <div style={{ marginTop: "1rem" }}>
                        <button onClick={() => setShowFarmTour(selected.farmTourVideo || selected.farmTourUrl)} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", display: "inline-flex", gap: "0.4rem", alignItems: "center", border: "1px solid var(--green-mid)", color: "var(--green-mid)", background: "rgba(22, 163, 74, 0.05)", textDecoration: "none" }}>
                          🎥 Take Virtual Farm Tour
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Trends */}
                {priceTrends && (
                  <div style={{ marginBottom: "1.5rem", padding: "1rem", background: priceTrends.status === "High Demand" ? "rgba(220, 38, 38, 0.05)" : "rgba(34, 197, 94, 0.05)", borderRadius: "12px", border: `1px solid ${priceTrends.status === "High Demand" ? "rgba(220, 38, 38, 0.2)" : "rgba(34, 197, 94, 0.2)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", color: priceTrends.status === "High Demand" ? "#dc2626" : "var(--green-deep)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {priceTrends.status === "High Demand" ? "🔥 High Demand Surge" : "✅ Market Stable"}
                        </h4>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {priceTrends.status === "High Demand" ? `Prices expected to trend ${priceTrends.trend.toLowerCase()} due to high order volume.` : "Supply is currently meeting demand."}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Fair Market Price</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-dark)", textDecoration: priceTrends.status === "High Demand" ? "line-through" : "none" }}>₹{priceTrends.currentAveragePrice}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Trust Score Breakdown (if requested) ─── */}
                <AnimatePresence>
                  {trustScoreDetail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        padding: "1.25rem",
                        marginBottom: "1.25rem",
                        overflow: "hidden"
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4 style={{ color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Shield size={16} /> Trust Score Breakdown
                        </h4>
                        <button onClick={() => setTrustScoreDetail(null)} style={{
                          background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.2rem"
                        }}><X size={16} /></button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                        <div style={{
                          width: 60, height: 60, borderRadius: "50%",
                          background: `conic-gradient(${
                            trustScoreDetail.score >= 90 ? "#7c3aed" :
                            trustScoreDetail.score >= 75 ? "#d97706" :
                            trustScoreDetail.score >= 60 ? "#6b7280" :
                            trustScoreDetail.score >= 40 ? "#ea580c" : "#16a34a"
                          } ${trustScoreDetail.score * 3.6}deg, rgba(255,255,255,0.1) 0)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative"
                        }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: "50%",
                            background: "#1a2332",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, color: "white", fontSize: "1rem"
                          }}>
                            {trustScoreDetail.score}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}>
                            {trustScoreDetail.emoji} {trustScoreDetail.grade}
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{trustScoreDetail.label}</div>
                        </div>
                      </div>

                      {/* Parameter Bars */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {trustScoreDetail.breakdown && Object.entries(trustScoreDetail.breakdown).map(([key, val]) => {
                          const labels = {
                            verification: "✅ Verification",
                            rating: "⭐ Average Rating",
                            fulfillment: "📦 Order Fulfillment",
                            experience: "🌱 Experience",
                            organic: "🌿 Organic Ratio",
                            salesVolume: "📊 Sales Volume",
                            accountAge: "📅 Account Age"
                          };
                          const pct = (val.score / val.max) * 100;
                          return (
                            <div key={key}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                                <span style={{ fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 600 }}>{labels[key] || key}</span>
                                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{val.score}/{val.max}</span>
                              </div>
                              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  style={{
                                    height: "100%",
                                    borderRadius: 100,
                                    background: pct >= 80 ? "linear-gradient(90deg, #16a34a, #22c55e)" :
                                               pct >= 50 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                                               "linear-gradient(90deg, #dc2626, #ef4444)"
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selected.description && (
                  <p style={{ color: "var(--text-muted)", fontSize:"0.88rem", marginBottom:"1.25rem", lineHeight:1.6 }}>{selected.description}</p>
                )}

                {/* Nutrition Info */}
                {nutLoading ? (
                  <div style={{ textAlign:"center", padding:"1rem", color: "var(--text-muted)", fontSize:"0.85rem" }}>🔬 Fetching nutrition data...</div>
                ) : nutritionData && !nutritionData.error ? (
                  <div style={{ marginBottom:"1.25rem" }}>
                    <h4 className="section-title" style={{ fontSize:"1rem" }}>🥗 {t("nutritionInfo")} (per 100g)</h4>
                    <div className="nutrition-grid">
                      {[
                        { l:"Calories", v:`${nutritionData.calories} kcal` },
                        { l:"Carbs",    v:`${nutritionData.carbs}g` },
                        { l:"Protein",  v:`${nutritionData.protein}g` },
                        { l:"Fat",      v:`${nutritionData.fat}g` },
                        { l:"Fiber",    v:`${nutritionData.fiber}g` },
                      ].map((n,i) => (
                        <div key={i} className="nut-item">
                          <div className="nut-val">{n.v}</div>
                          <div className="nut-label">{n.l}</div>
                        </div>
                      ))}
                    </div>

                    {nutritionData.vitamins && nutritionData.vitamins.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <h5 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Rich in Vitamins & Minerals:</h5>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {nutritionData.vitamins.map((v, i) => (
                            <span key={i} style={{ background: "rgba(183, 228, 199, 0.2)", color: "var(--green-deep)", padding: "0.2rem 0.6rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600 }}>{v}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {nutritionData.benefits && nutritionData.benefits.length > 0 && (
                      <div style={{ marginTop: "1rem" }}>
                        <h5 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Health Benefits:</h5>
                        <ul style={{ paddingLeft: "1.2rem", margin: 0, color: "var(--text-mid)", fontSize: "0.82rem" }}>
                          {nutritionData.benefits.map((b, i) => <li key={i} style={{ marginBottom: "0.2rem" }}>{b}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Market Basket Analysis */}
                {basketLoading ? (
                  <div style={{ textAlign:"center", padding:"1rem", color: "var(--text-muted)", fontSize:"0.85rem" }}>🤖 Analyzing shopping patterns...</div>
                ) : basketSuggestions.length > 0 ? (
                  <div style={{ marginBottom: "1.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "1rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <h4 style={{ fontSize: "1rem", color: "var(--text-dark)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "space-between" }}>
                      <span>🛒 Frequently Bought Together</span>
                      <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "100px", background: basketDataDriven ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)", color: basketDataDriven ? "#86efac" : "#fcd34d", fontWeight: 600 }}>
                        {basketDataDriven ? "📊 Data-Driven" : "🔮 AI Suggested"}
                      </span>
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {basketSuggestions.map((sug, i) => (
                        <div key={i} style={{ 
                          background: "var(--green-mid)", color: "white", padding: "0.4rem 0.8rem", 
                          borderRadius: "100px", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem",
                          cursor: "pointer", transition: "opacity 0.2s"
                        }}
                        title={`Also buy: ${sug.crop}`}
                        >
                          {sug.crop} <span style={{ background: "rgba(0,0,0,0.2)", padding: "0.1rem 0.3rem", borderRadius: "4px", fontSize: "0.7rem" }}>{sug.confidence}% Match</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Order Form */}
                <div className="section-divider"><hr /><span>Place Order</span><hr /></div>
                {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

                {/* Delivery Type Selection */}
                <div className="form-group">
                  <label className="field-label">{t("deliveryOption")}</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                    <div className={`delivery-option ${deliveryType==="farm_pickup"?"selected":""}`} onClick={() => setDeliveryType("farm_pickup")}>
                      <h4>🏡 {t("buyAtFarm")}</h4>
                      <p>Pick up directly from farmer</p>
                      <div className="price" style={{ marginTop:"0.4rem" }}>FREE</div>
                    </div>
                    <div className={`delivery-option ${deliveryType==="standard"?"selected":""}`} onClick={() => setDeliveryType("standard")}>
                      <h4>🚚 {t("homeDelivery")}</h4>
                      <p>Delivered to your doorstep</p>
                      <div className="price" style={{ marginTop:"0.4rem" }}>
                        {deliveryDistance > 0 ? `₹${deliveryCharges} (${Math.round(deliveryDistance)}km) • ETA: ${Math.round(deliveryDistance * 2 + 30)} mins` : `₹${DELIVERY_BASE}+`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid-2 mt-2">
                  <div className="form-group">
                    <label className="field-label">Quantity ({selected.unit||"kg"})</label>
                    <div className="input-wrapper">
                      <input
                        className="rs-input"
                        type="number"
                        min={1}
                        max={selected.quantity}
                        value={listening && activeField === "orderQty" && interim ? interim : orderQty}
                        onChange={(e) => setOrderQty(Number(e.target.value))}
                        style={listening && activeField === "orderQty" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                      />
                      <button type="button" className={`mic-btn ${listening && activeField === "orderQty" ? "active" : ""}`} onClick={() => startListening((transcript) => {
                        const numStr = parseSpokenNumber(transcript);
                        const num = parseInt(numStr);
                        if (!isNaN(num)) setOrderQty(num);
                      }, { replace: true, fieldId: "orderQty" })}>🎤</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="field-label">{t("paymentMethod")}</label>
                    <select className="rs-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="cod">💵 {t("cashOnDelivery")}</option>
                      <option value="online">💳 {t("payOnline")}</option>
                    </select>
                  </div>
                </div>

                {/* Address (only for delivery) */}
                {deliveryType !== "farm_pickup" && (
                  <div className="form-group">
                    <label className="field-label">Delivery Address</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <input
                          className="rs-input"
                          placeholder="Type or speak your delivery address..."
                          value={listening && activeField === "orderAddr" && interim ? `${orderAddr} ${interim}...` : orderAddr}
                          onChange={(e) => setOrderAddr(e.target.value)}
                          style={listening && activeField === "orderAddr" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                        />
                        <VoiceMicButton
                          fieldId="orderAddr"
                          onResult={(t) => setOrderAddr(prev => prev ? prev + " " + t : t)}
                          startListening={startListening}
                          listening={listening}
                          activeField={activeField}
                        />
                      </div>
                      <LocationButton
                        compact
                        onLocation={({ address, lat, lng }) => {
                          setOrderAddr(address);
                          setOrderLat(lat);
                          setOrderLng(lng);
                        }}
                      />
                    </div>
                    {orderAddr && (
                      <p style={{ fontSize: "0.75rem", color: "var(--green-mid)", marginTop: "0.3rem" }}>
                        📍 {orderAddr}
                      </p>
                    )}
                  </div>
                )}

                {/* Points Discount */}
                {user && user.rewardPoints > 0 && (
                  <div className="form-group" style={{ background: "var(--green-pale)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--green-mid)" }}>
                    <div className="flex-between">
                      <div>
                        <span style={{ fontWeight: 700, color: "var(--green-deep)" }}>🏆 Use Reward Points</span>
                        <p style={{ fontSize: "0.8rem", color: "var(--green-mid)" }}>You have {user.rewardPoints} points available. (1 point = ₹1)</p>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} style={{ width: 20, height: 20 }} />
                        <span style={{ fontWeight: 600, color: "var(--green-deep)" }}>Apply</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Bill Preview */}
                <div className="bill-receipt" style={{ margin:"1rem 0" }}>
                  <div className="bill-row"><span className="label">{selected.name} × {orderQty} {selected.unit||"kg"}</span><span>₹{subtotal.toLocaleString()}</span></div>
                  {deliveryType === "farm_pickup" ? (
                    <div className="bill-row"><span className="label">Delivery</span><span className="free">🏡 Farm Pickup — FREE</span></div>
                  ) : (
                    <div className="bill-row"><span className="label">Delivery {deliveryDistance > 0 ? `(${Math.round(deliveryDistance)}km)` : ""}</span><span>₹{deliveryCharges}</span></div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="bill-row"><span className="label" style={{ color: "var(--green-mid)" }}>Rewards Discount</span><span style={{ color: "var(--green-mid)" }}>-₹{pointsDiscount}</span></div>
                  )}
                  <div className="bill-row total"><span>{t("total")}</span><span>₹{totalAmount.toLocaleString()}</span></div>
                </div>

                <div style={{ display:"flex", gap:"0.75rem", flexDirection: "column" }}>
                  <div style={{ display:"flex", gap:"0.75rem" }}>
                    <button className="btn-secondary" onClick={() => { setShowModal(false); setMsg({ type:"", text:"" }); setTrustScoreDetail(null); }}>Cancel</button>
                    <button className="btn-primary" onClick={placeOrder} disabled={ordering || selected.quantity < orderQty} style={{ flex:1, background: selected.isPrebooking ? "var(--yellow-wheat)" : "", color: selected.isPrebooking ? "#000" : "" }}>
                      {ordering ? t("loading") : selected.isPrebooking ? `⏳ Buy Now (Pre-order) — ₹${totalAmount.toLocaleString()}` : `⚡ Buy Now — ₹${totalAmount.toLocaleString()}`}
                    </button>
                  </div>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      addToCart(selected, orderQty, selected.isPrebooking || false);
                      setShowModal(false);
                      setIsCartOpen(true);
                    }} 
                    disabled={selected.quantity < orderQty} 
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    <ShoppingBag size={18} /> Add to Cart
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Close suggestions when clicking outside */}
      {showSuggestions && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowSuggestions(false)} />
      )}
      {trackingOrder && (
        <LiveMapModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
      {/* Bill is rendered inside the order modal above */}
      
      {showPaymentModal && (
        <PaymentModal 
          amount={totalAmount} 
          onClose={() => { setShowPaymentModal(false); setOrdering(false); }} 
          onSuccess={handlePaymentSuccess} 
        />
      )}

      {showFarmTour && (
        <FarmTourModal url={showFarmTour} onClose={() => setShowFarmTour(null)} />
      )}
      </>
      )}
    </motion.div>
  );
}
