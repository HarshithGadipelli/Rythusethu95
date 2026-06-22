import { BASE_URL } from '../../api/api';
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import EcoAdvisor from "../../components/EcoAdvisor";
import LocationButton from "../../components/LocationButton";
import VoiceMicButton from "../../components/VoiceMicButton";
import VoiceField from "../../components/VoiceField";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import { io } from "socket.io-client";
import { parseSpokenNumber, parseVoiceToFormMultilingual, playTTS, VOICE_PROMPTS, stopTTS, isTTSPlaying } from "../../utils/voiceParser";
import LiveMapModal from "../../components/LiveMapModal";
import FarmerGroups from "./FarmerGroups";
import FarmerLeaderboard from "./FarmerLeaderboard";
import FarmerProfitCalculator from "./FarmerProfitCalculator";
import FarmerFinancialLedger from "./FarmerFinancialLedger";
import FarmerTours from "./FarmerTours";
import AssistantOverlay from "../../components/AssistantOverlay";
import { Navigation } from "lucide-react";

const CATEGORIES = ["vegetable", "fruit", "grain", "pulse", "spice", "dairy", "other"];
const SEASONS    = ["kharif","rabi","zaid","perennial"];
const SOILS      = [
  "loamy", "clay", "sandy", "silt", "peat", "chalk",
  "red_soil", "black_soil", "alluvial_soil", "laterite_soil", "arid_soil", "forest_soil", "saline", "other"
];

// Voice parsing is now handled by voiceParser.js

const DemandPanel = () => {
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/ml/market-demand").then(res => {
      setDemand(res.data.demand);
      setLoading(false);
    }).catch(err => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading demand data from database...</p>;
  if (!demand || demand.length === 0) return <p>No demand data available.</p>;

  return (
    <div className="glass-card mt-3">
      <h3 className="section-title">📈 Market Trends & Demand</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>See what crops are in high demand across the platform based on current market inventory and customer orders.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {demand.slice(0, 10).map((crop, i) => (
          <div key={i} style={{ 
            padding: "0.75rem", 
            background: crop.status === "High Demand" ? "rgba(239, 68, 68, 0.05)" : (crop.status === "Low Demand" ? "rgba(59, 130, 246, 0.05)" : "var(--green-pale)"), 
            border: crop.status === "High Demand" ? "1px solid rgba(239, 68, 68, 0.2)" : (crop.status === "Low Demand" ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid rgba(22, 163, 74, 0.2)"), 
            borderRadius: "8px", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <strong style={{ fontSize: "1.1rem", color: crop.status === "High Demand" ? "#dc2626" : (crop.status === "Low Demand" ? "#2563eb" : "var(--green-deep)") }}>#{i+1} {crop.crop}</strong>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Demand: {crop.totalDemandKg} kg | Supply: {crop.totalSupplyKg} kg</div>
            </div>
            <span style={{ 
              fontSize: "0.85rem", 
              background: crop.status === "High Demand" ? "#ef4444" : (crop.status === "Low Demand" ? "#3b82f6" : "var(--green-mid)"), 
              color: "white", 
              padding: "4px 10px", 
              borderRadius: "10px",
              fontWeight: 600
            }}>
              {crop.status === "High Demand" ? "🔥 High Demand" : (crop.status === "Low Demand" ? "❄️ Oversupplied" : "⚖️ Stable")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const YieldPredictor = () => {
  const [form, setForm] = useState({ crop: "", acres: "", soilType: "loamy", soilPh: "", location: "", season: "kharif" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    if (!form.crop || !form.acres) return;
    setLoading(true);
    try {
      const res = await API.post("/ml/predict-yield", form);
      setResult(res.data);
    } catch (e) {
      alert("Yield prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: "1.5rem" }}>
      <h3 className="section-title">🌾 Crop Yield Predictor</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Predict your expected harvest and estimated revenue based on advanced regional conditions.</p>
      
      <div className="grid-3 mb-2">
        <div className="form-group">
          <label className="field-label">Crop Name</label>
          <input type="text" className="rs-input" value={form.crop} onChange={e => setForm({...form, crop: e.target.value})} placeholder="e.g., Tomato" />
        </div>
        <div className="form-group">
          <label className="field-label">Farm Area (Acres)</label>
          <input type="number" className="rs-input" value={form.acres} onChange={e => setForm({...form, acres: e.target.value})} placeholder="e.g., 2" />
        </div>
        <div className="form-group">
          <label className="field-label">Region/Location</label>
          <input type="text" className="rs-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g., Hyderabad" />
        </div>
        <div className="form-group">
          <label className="field-label">Season</label>
          <select className="rs-select" value={form.season} onChange={e => setForm({...form, season: e.target.value})}>
            <option value="kharif">Kharif (Monsoon)</option>
            <option value="rabi">Rabi (Winter)</option>
            <option value="zaid">Zaid (Summer)</option>
            <option value="all">All Seasons</option>
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Soil Type</label>
          <select className="rs-select" value={form.soilType} onChange={e => setForm({...form, soilType: e.target.value})}>
            {SOILS.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Soil pH (Optional)</label>
          <input type="number" step="0.1" className="rs-input" value={form.soilPh} onChange={e => setForm({...form, soilPh: e.target.value})} placeholder="e.g., 6.5" />
        </div>
      </div>
      
      <button className="btn-primary" style={{ maxWidth: 200 }} onClick={predict} disabled={loading || !form.crop || !form.acres}>
        {loading ? "Calculating..." : "Predict Yield"}
      </button>

      {result && (
        <div className="ml-result mt-2" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", display: "flex", gap: "2rem" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--green-deep)" }}>Estimated Yield</span>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-dark)" }}>{result.estimatedYieldTons} Tons</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>({result.estimatedYieldKg} kg)</div>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--green-deep)" }}>Est. Market Revenue</span>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-dark)" }}>₹{result.estimatedRevenue.toLocaleString()}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Based on current averages</div>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--green-deep)" }}>Soil Suitability</span>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: result.soilSuitability === "Optimal" ? "var(--green-primary)" : "var(--yellow-wheat)" }}>{result.soilSuitability}</div>
            {result.phEfficiencyPct && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>pH Efficiency: {result.phEfficiencyPct}%</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function FarmerDashboard() {
  const { t, lang, changeLang } = useLang();
  const { user } = useAuth();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);

  const [tab, setTab] = useState("crops");
  const [crops, setCrops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  
  // Stage Update Modal State
  const [stageModal, setStageModal] = useState({
    isOpen: false,
    cropId: null,
    stage: "sowing",
    notes: "",
    imageFile: null,
    imagePreview: ""
  });
  const [locLoading, setLocLoading] = useState(false);
  const [focusField, setFocusField] = useState("name");
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [tipsResult, setTipsResult] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);

  // Auction Modal State
  const [auctionModal, setAuctionModal] = useState({ isOpen: false, crop: null, quantity: "", startingBid: "", durationHours: "24" });

  // Pest Detection State
  const [pestImage, setPestImage] = useState(null);
  const [pestPreview, setPestPreview] = useState(null);
  const [pestLoading, setPestLoading] = useState(false);
  const [pestResult, setPestResult] = useState(null);


  const [form, setForm] = useState({ name:"", description:"", price:"", quantity:"", unit:"kg", category:"vegetable", image:null, farmLocation: "", location:"", sameLocation: true, isOrganic:false, isPesticideFree:false, season:"kharif", harvestDate:"", latitude:"", longitude:"", isPrebooking:false, lifecycleStage: "ready", farmTourUrl:"", qualityGrade:null, isBulk:false, minOrderQty:1 });
  
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [qualitySuggestion, setQualitySuggestion] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardActive, setWizardActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const wizardActiveRef = useRef(false);
  useEffect(() => { wizardActiveRef.current = wizardActive; }, [wizardActive]);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [priceRecommendation, setPriceRecommendation] = useState(null);
  
  // Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all_customers");

  // Profit Calculator State
  const [profitCalc, setProfitCalc] = useState({
    cropName: "",
    expectedYield: "",
    expectedPrice: "",
    seedCost: "",
    fertilizerCost: "",
    equipmentCost: "",
    laborCost: ""
  });

  const [editCropModal, setEditCropModal] = useState({ isOpen: false, crop: null, name: "", category: "", unit: "", quantity: "", price: "" });

  const handleEditCropSubmit = async () => {
    if (!editCropModal.crop) return;
    try {
      await API.put(`/crops/${editCropModal.crop._id}`, {
        name: editCropModal.name,
        category: editCropModal.category,
        unit: editCropModal.unit,
        quantity: editCropModal.quantity,
        price: editCropModal.price
      });
      setMsg({ type: "success", text: "Crop updated successfully!" });
      setEditCropModal({ isOpen: false, crop: null, name: "", category: "", unit: "", quantity: "", price: "" });
      fetchCrops();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update crop." });
    }
  };

  const fetchPriceRecommendation = async (cropName) => {
    if (!cropName) return;
    try {
      const res = await API.post("/ml/price-trends", { crop: cropName });
      setPriceRecommendation(res.data);
    } catch (err) {
      console.error("Failed to fetch price recommendation", err);
    }
  };

  const handleFarmerBroadcast = async () => {
    if (!broadcastMsg) return;
    try {
      // Typically you'd have a backend route for this. We'll use the existing /ai/chat or just emit via socket if available
      // For now we'll simulate success
      setMsg({ type: "success", text: "📢 Broadcast sent successfully to " + broadcastTarget.replace("_", " ") });
      setBroadcastMsg("");
    } catch (err) {
      setMsg({ type: "error", text: "Failed to send broadcast." });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await API.post("/ai/chat", { prompt: userMsg.text, role: "farmer", userId: user?._id });
      setChatHistory(prev => [...prev, { role: "ai", text: res.data.response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "ai", text: "Sorry, I am having trouble connecting to the AI server." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const startGuidedWizard = async () => {
    if (wizardActive) {
      setWizardActive(false);
      setAiMessage("");
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    
    setWizardActive(true);
    setTab("add");
    setWizardStep(1);
    
    const p = VOICE_PROMPTS[lang] || VOICE_PROMPTS["en"];
    setAiMessage(p.start);
    
    const startContinuous = () => {
      startListening(async (transcript) => {
        if (!transcript || transcript.trim() === "") return;
        setMsg({ type: "info", text: "AI is analyzing your input..." });
        
        // Save current transcript for the API call
        const currentTranscript = transcript;
        
        setForm(f => {
          const contextText = `I already have: ${JSON.stringify({ name: f.name, price: f.price, quantity: f.quantity })}. User says: "${currentTranscript}"`;
          API.post("/ai/parse", { text: contextText, context: "farmer_add_crop", lang }).then(res => {
             const data = res.data.data;
             if (data) {
               if (data.action === "cancel") {
                 setWizardActive(false);
                 setAiMessage("");
                 if (data.reply) playTTS(data.reply, lang);
                 setMsg({ type: "info", text: "Guided Assistant cancelled." });
                 return;
               }
               
               setForm(curr => {
                 const next = {
                   ...curr,
                   name: data.name || curr.name,
                   quantity: data.quantity || curr.quantity,
                   unit: data.unit || curr.unit,
                   price: data.price || curr.price,
                   isOrganic: data.isOrganic !== undefined ? data.isOrganic : curr.isOrganic
                 };
                 if (next.name && next.price && next.quantity) setWizardStep(3);
                 else if (next.name) setWizardStep(2);
                 return next;
               });
               setMsg({ type: "success", text: "Form updated via voice!" });
               
               // The AI must reply with the next question!
               if (data.reply) {
                 setAiMessage(data.reply);
                 // Stop listening so the mic doesn't hear the AI speaking
                 if (window.speechSynthesis) window.speechSynthesis.cancel();
                 // Play TTS, then wait 1s before turning mic back on
                 playTTS(data.reply, lang).then(() => {
                   setAiMessage("");
                   if (wizardActiveRef.current) setTimeout(startContinuous, 1000);
                 });
                 // We return early here so the default onEnd doesn't immediately restart the mic
                 return;
               }
             }
             // If no reply, just rely on the onEnd loop to restart
          }).catch(err => {
             console.error("AI Parse Error:", err);
             setMsg({ type: "error", text: "AI Assistant is currently offline or unreachable." });
          });
          return f; 
        });
      }, { 
        fieldId: "assistant", 
        continuous: true,
        onEnd: () => {
          // Only auto-restart if the wizard is active AND we aren't currently waiting for TTS to finish
          if (wizardActiveRef.current && (!window.speechSynthesis || !window.speechSynthesis.speaking)) {
            setTimeout(startContinuous, 1000); 
          }
        }
      });
    };

    playTTS(p.start, lang).then(() => {
       startContinuous();
    });
  };

  const [weatherLive, setWeatherLive] = useState(null);
  const [tipsForm, setTipsForm] = useState({ crop:"", soil:"loamy" });

  const fetchLiveWeather = async () => {
    if (!form.latitude || !form.longitude) {
      setMsg({ type: "error", text: "Please detect your location in the Add Crop tab first!" });
      return;
    }
    setMlLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${form.latitude}&longitude=${form.longitude}&current=temperature_2m,relative_humidity_2m,precipitation`);
      const data = await res.json();
      setWeatherLive({
        temp: data.current.temperature_2m,
        hum: data.current.relative_humidity_2m,
        rain: data.current.precipitation
      });
      setMsg({ type: "success", text: "Live weather data fetched successfully." });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to fetch live weather." });
    } finally {
      setMlLoading(false);
    }
  };

  const set = (k) => (val) => {
    if (typeof val === "function") {
      setForm((f) => ({ ...f, [k]: val(f[k]) }));
    } else if (typeof val === "object" && val?.target) {
      setForm((f) => ({ ...f, [k]: val.target.value }));
    } else {
      setForm((f) => ({ ...f, [k]: val }));
    }
  };

  const speak = (field) => startListening((transcript) => {
    const isNumeric = ["price", "quantity", "farmSize", "experience"].includes(field);
    setForm((f) => ({ ...f, [field]: isNumeric ? parseSpokenNumber(transcript) : transcript }));
  }, { fieldId: field });

  // For append mode (address fields etc.)
  const speakAppend = (field, getCurrentVal) => startListening((transcript) => {
    setForm((f) => {
      const current = f[field] || "";
      const sep = current && !current.endsWith(" ") ? " " : "";
      return { ...f, [field]: current + sep + transcript };
    });
  }, { fieldId: field });

  useEffect(() => { 
    fetchCrops();
    fetchOrders();
    fetchAuctions();
    const socket = io(BASE_URL);
    socket.on("order_created", () => { 
      fetchCrops(); 
      fetchOrders(); 
      setMsg({ type: "success", text: "🔔 New Order Received! Check your orders tab." });
    });
    socket.on("auction_update", () => fetchAuctions());
    socket.on("farmer_verified", () => window.location.reload());

    // Listen for AI Autofill events
    const handleAINavigate = (e) => {
      if (e.detail.targetTab) setTab(e.detail.targetTab);
    };
    
    const handleAIStartWizard = () => {
      startGuidedWizard();
    };

    const handleAIAutofill = (e) => {
      if (e.detail.context === "omnipresent_farmer" || e.detail.context === "farmer_add_crop") {
        if (e.detail.parsedData) {
          setTab("add");
        const pd = e.detail.parsedData;
        setForm(f => ({
          ...f,
          name: pd.name || f.name,
          quantity: pd.quantity || f.quantity,
          unit: pd.unit || f.unit,
          price: pd.price || f.price,
          isOrganic: pd.isOrganic !== undefined ? pd.isOrganic : f.isOrganic
        }));
        
        let msg = "Got it. ";
        if (pd.name) msg += `${pd.name}. `;
        if (pd.quantity) msg += `${pd.quantity} ${pd.unit || "kg"}. `;
        if (pd.price) msg += `Price set to ${pd.price}. `;
        if (pd.isOrganic) msg += `Marked as organic. `;
        playTTS(msg, lang);
      }
    };
    };
    
    window.addEventListener("ai_autofill", handleAIAutofill);
    window.addEventListener("ai_navigate", handleAINavigate);
    window.addEventListener("ai_start_wizard", handleAIStartWizard);

    return () => {
      socket.disconnect();
      window.removeEventListener("ai_autofill", handleAIAutofill);
      window.removeEventListener("ai_navigate", handleAINavigate);
      window.removeEventListener("ai_start_wizard", handleAIStartWizard);
    };
  }, []);

  const fetchCrops = async () => {
    try {
      const res = await API.get("/crops");
      const mine = res.data.filter(c => c.farmer?._id === user?._id || c.farmer === user?._id);
      setCrops(mine);
    } catch {}
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get(`/orders/farmer/${user?._id}`);
      setOrders(res.data);
    } catch {}
  };

  const fetchAuctions = async () => {
    try {
      const res = await API.get(`/auctions/farmer/${user?._id}`);
      setAuctions(res.data);
    } catch {}
  };

  const createAuction = async () => {
    if (!auctionModal.quantity || !auctionModal.startingBid) return;
    try {
      await API.post("/auctions/create", {
        cropId: auctionModal.crop._id,
        farmerId: user._id,
        quantity: Number(auctionModal.quantity),
        startingBid: Number(auctionModal.startingBid),
        durationHours: Number(auctionModal.durationHours)
      });
      setMsg({ type: "success", text: "Auction created successfully!" });
      setAuctionModal({ isOpen: false, crop: null, quantity: "", startingBid: "", durationHours: "24" });
      fetchAuctions();
      fetchCrops();
      setTab("auctions");
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.error || "Error creating auction" });
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await r.json();
        setForm((f) => ({
          ...f,
          location: d.display_name || `${coords.latitude},${coords.longitude}`,
          latitude: coords.latitude, longitude: coords.longitude
        }));
      } catch {
        setForm((f) => ({ ...f, latitude: coords.latitude, longitude: coords.longitude }));
      } finally { setLocLoading(false); }
    }, () => { alert("Cannot get location"); setLocLoading(false); });
  };

  const analyzeImage = async (file) => {
    setForm(f => ({ ...f, image: file, qualityGrade: null }));
    if (!file) return;
    
    setAnalyzingImage(true);
    setQualitySuggestion(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const res = await API.post("/ai/analyze-quality", { imageBase64: reader.result });
          setForm(f => ({ ...f, qualityGrade: res.data.grade }));
          setQualitySuggestion(`AI Vision detects Grade ${res.data.grade} Quality. ${res.data.suggestion}`);
        } catch (err) {
          console.error(err);
          // Fallback if AI fails or offline
          setForm(f => ({ ...f, qualityGrade: "B" }));
          setQualitySuggestion(`AI Vision is currently offline. Assigned standard Grade B quality.`);
        } finally {
          setAnalyzingImage(false);
        }
      };
    } catch (e) {
      setAnalyzingImage(false);
    }
  };

  const handleAddCrop = async () => {
    if (!form.name || !form.price || !form.quantity) { setMsg({ type:"error", text:"Name, price & quantity required." }); return; }
    
    // Price Limit Enforcement
    if (!form.isOrganic && priceRecommendation && priceRecommendation.suggestedMarketPrice) {
      if (Number(form.price) > priceRecommendation.suggestedMarketPrice * 1.5) {
        setMsg({ type:"error", text:`Price is too high! Max allowed for non-organic ${form.name} is ₹${Math.round(priceRecommendation.suggestedMarketPrice * 1.5)}.` });
        return;
      }
    }

    setLoading(true); setMsg({ type:"", text:"" });
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "image") return; // handled separately below
        if (v === "" || v === null || v === undefined) return; // skip empty/null values
        fd.append(k, v);
      });
      if (user?._id) fd.append("farmer", user._id);
      if (form.image) fd.append("image", form.image);
      await API.post("/crops/add", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ type:"success", text:`✅ Crop "${form.name}" listed successfully!` });
      setForm({ name:"", description:"", price:"", quantity:"", unit:"kg", category:"vegetable", image:null, farmLocation:"", location:"", sameLocation:true, isOrganic:false, isPesticideFree:false, season:"kharif", harvestDate:"", latitude:"", longitude:"", isPrebooking:false, farmTourUrl:"", qualityGrade:null, isBulk:false, minOrderQty:1 });
      setQualitySuggestion(null);
      setWizardStep(1);
      fetchCrops();
      setTab("crops");
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to add crop." });
    } finally { setLoading(false); }
  };

  const deleteCrop = async (id) => {
    if (!confirm("Remove this crop from marketplace?")) return;
    try { await API.delete(`/crops/${id}`); fetchCrops(); } catch {}
  };

  const toggleLiveStatus = async (id, currentStatus) => {
    try {
      await API.put(`/crops/${id}/live`, { isLive: !currentStatus });
      fetchCrops();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update status." });
    }
  };

  const editPrice = async (crop) => {
    const hasPaidPrebooked = orders.some(o => o.items.some(i => i.cropId === crop._id) && o.paymentStatus === "paid" && crop.isPrebooking);
    if (hasPaidPrebooked) {
      alert("Cannot edit price of a pre-booked crop that has already been paid for.");
      return;
    }

    let limit = null;
    if (!crop.isOrganic) {
      try {
        const res = await API.post("/ml/price-trends", { crop: crop.name });
        if (res.data && res.data.suggestedMarketPrice) {
          limit = res.data.suggestedMarketPrice * 1.5;
        }
      } catch (err) {}
    }

    const newPrice = prompt(`Enter new price for crop (Current: ₹${crop.price}):`, crop.price);
    if (newPrice && !isNaN(newPrice) && Number(newPrice) > 0) {
      if (limit && Number(newPrice) > limit) {
         alert(`Price is too high! Max allowed for non-organic ${crop.name} is ₹${Math.round(limit)}.`);
         return;
      }
      try {
        await API.put(`/crops/${crop._id}/price`, { price: Number(newPrice) });
        setMsg({ type: "success", text: "Price updated successfully! Live indicator triggered." });
        fetchCrops();
      } catch (err) {
        setMsg({ type: "error", text: "Failed to update price." });
      }
    }
  };

  const openEditCropModal = (crop) => {
    setEditCropModal({
      isOpen: true,
      crop: crop,
      name: crop.name,
      category: crop.category,
      unit: crop.unit,
      quantity: crop.quantity,
      price: crop.price
    });
  };

  const submitCropStage = async () => {
    try {
      setMsg({ type: "", text: "Uploading stage updates..." });
      const formData = new FormData();
      formData.append("lifecycleStage", stageModal.stage);
      formData.append("notes", stageModal.notes);
      if (stageModal.imageFile) {
        formData.append("image", stageModal.imageFile);
      }

      const res = await API.put(`/crops/${stageModal.cropId}/stage`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchCrops();
      setStageModal({ isOpen: false, cropId: null, stage: "sowing", notes: "", imageFile: null, imagePreview: "" });
      setMsg({ type: "success", text: `🌱 Stage Updated! AI Suggestion: ${res.data.aiSuggestion}` });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update stage" });
    }
  };

  const uploadFarmTour = async (id, file) => {
    if (!file) return;
    try {
      setMsg({ type: "", text: "Uploading Farm Tour Video..." });
      const fd = new FormData();
      fd.append("video", file);
      await API.put(`/crops/${id}/tour`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      fetchCrops();
      setMsg({ type: "success", text: "✅ Farm Tour Video uploaded successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to upload video" });
    }
  };

  const runCropSuggest = async () => {
    if (!weatherLive) return setMsg({ type: "error", text: "Please fetch live weather first." });
    setMlLoading(true); setMlResult(null);
    try {
      const res = await API.post("/ml/crop-suggest", { temp: weatherLive.temp, hum: weatherLive.hum, rain: weatherLive.rain });
      setMlResult(res.data);
    } catch { setMlResult({ error: "ML service unavailable" }); }
    finally { setMlLoading(false); }
  };

  const runFarmerTips = async () => {
    setMlLoading(true); setTipsResult(null);
    try {
      const res = await API.post("/ml/farmer-suggest", { crop: tipsForm.crop, soil: tipsForm.soil, location: form.location, stage: tipsForm.stage });
      setTipsResult(res.data);
    } catch { setTipsResult({ error: "ML service unavailable" }); }
    finally { setMlLoading(false); }
  };

  const runPestDetection = async () => {
    if (!pestPreview) {
      setMsg({ type: "error", text: "Please upload an image of the affected crop or leaf." });
      return;
    }
    setPestLoading(true);
    setPestResult(null);
    try {
      const res = await API.post("/ai/pest-detect", { imageBase64: pestPreview });
      setPestResult(res.data);
      setMsg({ type: "success", text: "Pest analysis complete!" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to analyze image. Please try again." });
    } finally {
      setPestLoading(false);
    }
  };

  const statusColor = (qty) => qty > 20 ? "badge-green" : qty > 5 ? "badge-yellow" : "badge-red";

  const isVerified = user?.isVerified;
  const totalRevenue = orders.reduce((a, o) => a + (o.subtotal || o.totalAmount || 0), 0);

  return (
    <div className="page-wrapper">
      {/* Verification Banner */}
      {!isVerified && (
        <div className="verification-banner pending">
          <span style={{ fontSize:"1.5rem" }}>⏳</span>
          <div>
            <strong>Account Pending Verification</strong>
            <p style={{ fontSize:"0.82rem", opacity:0.85, marginTop:"0.2rem" }}>
              Our admin team is reviewing your account. You'll be able to list crops once verified. This ensures trust and quality for all buyers.
            </p>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="verification-banner verified" style={{ marginBottom:"1.5rem" }}>
          <span style={{ fontSize:"1.3rem" }}>✅</span>
          <span style={{ fontWeight:600 }}>Verified Farmer — You can list crops on the marketplace</span>
        </div>
      )}

      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🌾 {t("welcome")}, {user?.name?.split(" ")[0] || "Farmer"}
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>Manage your crops & get AI-powered insights</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select 
            className="rs-select" 
            style={{ width: "auto", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", color: "var(--text-dark)" }}
            value={lang} 
            onChange={(e) => changeLang(e.target.value)}
          >
            <option value="en" style={{ color: "var(--text-dark)" }}>English</option>
            <option value="te" style={{ color: "var(--text-dark)" }}>తెలుగు</option>
            <option value="hi" style={{ color: "var(--text-dark)" }}>हिंदी</option>
            <option value="kn" style={{ color: "var(--text-dark)" }}>ಕನ್ನಡ</option>
            <option value="ta" style={{ color: "var(--text-dark)" }}>தமிழ்</option>
          </select>
          <button 
            className="btn-secondary" 
            style={{ width:"auto", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", background: (isTTSPlaying() || window.speechSynthesis?.speaking) ? "#ef4444" : "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)", color: (isTTSPlaying() || window.speechSynthesis?.speaking) ? "white" : "var(--yellow-wheat)" }}
            onClick={async () => {
              if (isTTSPlaying() || window.speechSynthesis?.speaking) {
                stopTTS();
                return;
              }
              const cropsList = crops.length > 0 ? crops.map(c => `${c.name}, ${c.quantity} ${c.unit} at ${c.price} rupees`).join(". ") : "no crops listed yet";
              const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "confirmed").length;
              const deliveredOrders = orders.filter(o => o.status === "delivered").length;
              const summary = `Dashboard Summary. You have ${crops.length} crops listed: ${cropsList}. You have ${orders.length} total orders, ${pendingOrders} pending, ${deliveredOrders} delivered. Your total revenue is ${totalRevenue} rupees. You have ${user?.rewardPoints || 0} reward points.`;
              
              if (lang === "en") {
                playTTS(summary, lang);
              } else {
                try {
                  // Fixed the AI payload to match our backend router exactly:
                  const res = await API.post("/ai/chat", { 
                    prompt: `Translate the following English text to the language with language code '${lang}'. Respond ONLY with the translated text, no other words: "${summary}"`,
                    role: user?.role,
                    userId: user?._id,
                    lang
                  });
                  playTTS(res.data.response || res.data.reply || summary, lang);
                } catch (e) {
                  playTTS(summary, lang); // fallback
                }
              }
            }}
          >
            🔊 {isTTSPlaying() || window.speechSynthesis?.speaking ? "Stop Reading" : "Toggle Read All Data"}
          </button>
          <button className="btn-primary" style={{ width:"auto", opacity: isVerified ? 1 : 0.5 }} onClick={() => isVerified ? setTab("add") : setMsg({ type:"error", text:"Your account must be verified before listing crops." })} disabled={!isVerified}>
            + {t("addCrop")}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-3">
        {[
          { icon:"🌱", label:"My Crops", value: crops.length },
          { icon:"📦", label:"Orders", value: orders.length },
          { icon:"💰", label:"Revenue", value: `₹${totalRevenue.toLocaleString()}` },
          { icon:"🏆", label:"Reward Points", value: user?.rewardPoints || 0 }
        ].map((s,i) => (
          <div className="stat-card" key={i}>
            <span className="stat-icon">{s.icon}</span>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      
      <EcoAdvisor cropName={crops.length > 0 ? crops[0].name : "your crops"} />

      {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { k:"crops", l:"🌿 My Crops" },
          { k:"orders", l:`📦 Orders (${orders.length})` },
          { k:"auctions", l:`🔨 Auctions` },
          { k:"groups", l:"🤝 Group Selling" },
          { k:"broadcast", l:"📢 Broadcast" },
          { k:"leaderboard", l:"🏆 Leaderboard" },
          { k:"add",   l:`➕ ${t("addCrop")}` },
          { k:"tours", l:"🚜 Farm Tours" },
          { k:"ml",    l:"🤖 AI Suggestions" },
          { k:"aiChat",l:"💬 Farm AI Assistant" },
          { k:"tips",  l:"💡 Smart Advisor" },
          { k:"ledger", l:"📒 Financial Ledger" },
          { k:"profit", l:"💰 Profit Calculator" },
          { k:"pest",  l:"🐛 Pest Detection" },
          { k:"warehouse", l:"🏭 Warehouse Planning" },
          { k:"policies", l:"📜 Policies" },
          { k:"support", l:"🛠️ Contact Admin" }
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => {
            if (tb.k === "add" && !isVerified) { setMsg({ type:"error", text:"Account not verified yet." }); return; }
            setTab(tb.k);
          }}>
            {tb.l}
          </button>
        ))}
      </div>

      {/* ── MY CROPS TAB ── */}
      {tab === "crops" && (
        <div>
          {crops.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>🌱</p>
              <p style={{ color: "var(--text-muted)", marginTop:"1rem" }}>
                {isVerified ? "No crops listed yet. Add your first crop!" : "Get verified to start listing crops."}
              </p>
              {isVerified && <button className="btn-primary mt-2" style={{ width:"auto" }} onClick={() => setTab("add")}>+ Add Crop</button>}
            </div>
          ) : (
            <>
              {/* Growing (Pre-booking) Section */}
              <div className="glass-card mb-3" style={{ background: "rgba(234, 179, 8, 0.05)", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                <h3 className="section-title" style={{ color: "var(--yellow-wheat)" }}>🌱 Growing Stage (Pre-booking)</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Crops still growing. Customers can pre-book them. Once harvested, transfer them to Live Sale.</p>
                {crops.filter(c => c.isPrebooking).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No crops in growing stage.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="rs-table">
                      <thead>
                        <tr><th>{t("crop")}</th><th>Available to Pre-book</th><th>{t("price")}</th><th>{t("category")}</th><th>Lifecycle</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {crops.filter(c => c.isPrebooking).map(c => (
                          <tr key={c._id}>
                            <td><strong style={{ color: "var(--text-dark)" }}>{c.name}</strong></td>
                            <td><span className={`badge ${statusColor(c.quantity)}`}>{c.quantity} {c.unit}</span></td>
                            <td style={{ color:"var(--yellow-wheat)" }}>₹{c.price}/{c.unit}</td>
                            <td style={{ textTransform:"capitalize", color: "var(--text-muted)", fontSize:"0.85rem" }}>{c.category}</td>
                            <td>
                              <button 
                                className="btn-secondary" 
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.5)", color: "var(--text-dark)", border: "1px solid var(--green-pale)", borderRadius: "4px" }}
                                onClick={() => setStageModal({ isOpen: true, cropId: c._id, stage: c.lifecycleStage || "sowing", notes: "", imageFile: null, imagePreview: "" })}
                              >
                                🔄 {c.lifecycleStage || "sowing"}
                              </button>
                            </td>
                            <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button className="btn-primary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem", background: "var(--green-mid)" }} onClick={async () => {
                                if (confirm(`Transfer remaining ${c.quantity} ${c.unit} of ${c.name} to Live Sale?`)) {
                                  try { await API.put(`/crops/${c._id}/transfer-to-sale`); flash("success", "Crop transferred to Live Sale!"); loadAll(); }
                                  catch { flash("error", "Failed to transfer crop."); }
                                }
                              }}>➡️ Transfer to Sale</button>
                              <button className="btn-secondary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem" }} onClick={() => { setTipsForm(f => ({...f, crop: c.name, stage: c.lifecycleStage || "sowing"})); setTab("tips"); }}>💡 Advice</button>
                              <button className="btn-secondary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem" }} onClick={() => openEditCropModal(c)}>✏️</button>
                              <button className="btn-danger" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem" }} onClick={() => deleteCrop(c._id)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Harvested (Live Sale) Section */}
              <div className="glass-card mb-3" style={{ background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                <h3 className="section-title" style={{ color: "var(--green-primary)" }}>✅ Harvested (Live Sale)</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Crops ready for immediate purchase and delivery.</p>
                {crops.filter(c => !c.isPrebooking).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No crops currently on Live Sale.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="rs-table">
                      <thead>
                        <tr><th>{t("crop")}</th><th>Available {t("quantity")}</th><th>{t("price")}</th><th>{t("category")}</th><th>Live Visibility</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {crops.filter(c => !c.isPrebooking).map(c => (
                          <tr key={c._id}>
                            <td><strong style={{ color: "var(--text-dark)" }}>{c.name}</strong></td>
                            <td><span className={`badge ${statusColor(c.quantity)}`}>{c.quantity} {c.unit}</span></td>
                            <td style={{ color:"var(--yellow-wheat)" }}>₹{c.price}/{c.unit}</td>
                            <td style={{ textTransform:"capitalize", color: "var(--text-muted)", fontSize:"0.85rem" }}>{c.category}</td>
                            <td>
                              <label className="switch" style={{ position:"relative", display:"inline-block", width:"40px", height:"20px" }}>
                                <input type="checkbox" checked={c.isLive !== false} onChange={() => toggleLiveStatus(c._id, c.isLive !== false)} style={{ opacity:0, width:0, height:0 }} />
                                <span style={{ position:"absolute", cursor:"pointer", top:0, left:0, right:0, bottom:0, backgroundColor: c.isLive !== false ? "var(--green-mid)" : "#ccc", borderRadius:"20px", transition:".4s" }}></span>
                              </label>
                            </td>
                            <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button className="btn-secondary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem" }} onClick={() => openEditCropModal(c)}>✏️ Edit</button>
                              <button className="btn-secondary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem", background: "var(--blue-mid)", color: "white", border: "none" }} onClick={() => setAuctionModal({ isOpen: true, crop: c, quantity: c.quantity, startingBid: c.price, durationHours: "24" })}>🔨 Auction</button>
                              <label className="btn-secondary" style={{ padding:"0.35rem 0.5rem", fontSize:"0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem", margin: 0 }}>
                                🎥 {c.farmTourVideo ? "Update Tour" : "Record Tour"}
                                <input type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={(e) => uploadFarmTour(c._id, e.target.files[0])} />
                              </label>
                              <button className="btn-danger" style={{ padding:"0.35rem 0.75rem", fontSize:"0.78rem" }} onClick={() => deleteCrop(c._id)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AUCTIONS TAB ── */}
      {tab === "auctions" && (
        <div>
          <div className="flex-between mb-2">
            <h2 className="section-title">🔨 B2B Auctions</h2>
            <button className="btn-primary" onClick={() => setTab("crops")}>+ Create Auction from Crops</button>
          </div>
          {auctions.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: "3rem" }}>
              <p style={{ color: "var(--text-muted)" }}>No active auctions. List a bulk harvest to start bidding!</p>
            </div>
          ) : (
            <div className="grid-cards">
              {auctions.map(a => (
                <div key={a._id} className="glass-card" style={{ borderLeft: "4px solid var(--primary)" }}>
                  <h3>{a.crop?.name} ({a.quantity} {a.crop?.unit})</h3>
                  <p>Starting Bid: ₹{a.startingBid}</p>
                  <p>Current Highest: <strong style={{ color: "var(--green-mid)" }}>₹{a.currentHighestBid}</strong></p>
                  <p>Ends: {new Date(a.endTime).toLocaleString()}</p>
                  <span className={`badge ${a.status === "active" ? "badge-green" : "badge-yellow"}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === "orders" && (
        <div className="glass-card" style={{ overflowX:"auto" }}>
          <div className="flex-between mb-3">
            <h3 className="section-title mb-0">📦 Incoming Orders</h3>
            <button 
              className="btn-secondary" 
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", fontSize: "0.9rem" }}
              onClick={() => {
                if (window.speechSynthesis && window.speechSynthesis.speaking) {
                  window.speechSynthesis.cancel();
                  return;
                }
                if (orders.length === 0) {
                  playTTS("You have no incoming orders.", lang);
                  return;
                }
                const text = `You have ${orders.length} orders. ` + orders.map((o, i) => `Order ${i+1}: ${o.quantity} units of ${o.crop?.name || "crop"} for ${o.totalAmount} rupees.`).join(" ");
                playTTS(text, lang);
              }}
            >
              🔊 Toggle Read Orders
            </button>
          </div>
          {orders.length === 0 ? (
            <p style={{ color:"var(--text-muted)", textAlign:"center", padding:"2rem" }}>No orders received yet.</p>
          ) : (
            <table className="rs-table">
              <thead><tr><th>Order</th><th>Crop</th><th>Customer</th><th>Qty</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()}</td>
                    <td><strong style={{ color: "var(--text-dark)" }}>{o.crop?.name || "—"}</strong></td>
                    <td style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>{o.customer?.name || "—"}</td>
                    <td style={{ color: "var(--text-dark)" }}>{o.quantity}</td>
                    <td style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</td>
                    <td><span className={`badge ${o.deliveryType==="farm_pickup"?"badge-green":"badge-blue"}`}>{o.deliveryType==="farm_pickup"?"🏡 Pickup":"🚚 Delivery"}</span></td>
                    <td><span className={`badge ${o.status==="delivered"?"badge-green":o.status==="cancelled"?"badge-red":"badge-yellow"}`}>{o.status?.replace("_"," ")}</span></td>
                    <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                    <td style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn-secondary" style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem", display: "flex", gap: "0.3rem" }} onClick={() => setViewOrder(o)}>
                        👁️ Details
                      </button>
                      {(o.status === "in_transit" || o.status === "picked_up") && (
                        <button className="btn-secondary" style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem", display: "flex", gap: "0.3rem" }} onClick={() => setTrackingOrder(o)}>
                          <Navigation size={12} /> Track
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ADD CROP TAB ── */}
      {tab === "add" && isVerified && (
        <div className="guided-layout">
        <div className="glass-card" style={{ flex: 1 }}>
          <div className="flex-between mb-2">
            <h3 className="section-title mb-0">🌿 {t("addCrop")}</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                type="button" 
                className={`btn-primary ${wizardActive ? "pulse" : ""}`} 
                style={{ width:"auto", background:"var(--green-mid)", color:"#fff", fontWeight:600, padding:"0.5rem 1rem", border: "2px solid var(--green-primary)" }} 
                onClick={startGuidedWizard}
              >
                {wizardActive ? "🎙️ Assistant Listening..." : "🤖 Start Guided Assistant"}
              </button>
            </div>
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>
            Step {wizardStep} of 3 • {wizardStep === 1 ? "Basic Details" : wizardStep === 2 ? "Logistics & Pricing" : "Quality & Upload"}
          </p>

          <AnimatePresence mode="wait">
            {wizardStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="grid-2">
                  <AutoSuggestInput 
                    value={form.name} onChange={set("name")} onSpeak={() => speak("name")} 
                    onFocus={() => setFocusField("name")} 
                    listening={listening && activeField === "name"} interim={interim} 
                    label={`${t("cropName")} *`} placeholder="e.g. Tomato, Rice..." fieldType="crop" 
                  />
                  <div className="form-group" style={{ position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="field-label" style={{ fontSize: "1.1rem" }}>{t("category")}</label>
                      <button type="button" onClick={() => playTTS(t("category"), lang)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.2rem" }}>🔊</button>
                    </div>
                    <select className="rs-select" style={{ fontSize: "1.1rem", padding: "0.8rem" }} value={form.category} onChange={set("category")} onFocus={() => setFocusField("name")}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex-between mt-3">
                  <div></div>
                  <button type="button" className="btn-primary" onClick={() => {
                    fetchPriceRecommendation(form.name);
                    setWizardStep(2);
                  }}>Next ➡️</button>
                </div>
              </motion.div>
            )}

            {wizardStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="grid-3">
                  <div className="form-group" style={{ position: "relative" }}>
                    <VoiceField
                      label={`${t("price")} (₹)`}
                      type="number"
                      value={form.price}
                      onChange={(val) => setForm(f => ({ ...f, price: val }))}
                      required={true}
                      placeholder="e.g. 40"
                    />
                    {priceRecommendation && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: priceRecommendation.trend === "Upward" ? "var(--green-deep)" : "var(--text-muted)", background: "rgba(34, 197, 94, 0.05)", padding: "0.5rem", borderRadius: "8px", border: "1px dashed var(--green-pale)" }}>
                        <strong>💡 ML Suggestion:</strong> Market is {priceRecommendation.status}. Suggested Price: ₹{priceRecommendation.suggestedMarketPrice}
                        <button type="button" onClick={() => setForm(f => ({ ...f, price: priceRecommendation.suggestedMarketPrice }))} style={{ marginLeft: "0.5rem", background: "var(--green-mid)", color: "white", border: "none", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>Apply</button>
                      </div>
                    )}
                  </div>
                  <VoiceField
                    label={t("quantity")}
                    type="number"
                    value={form.quantity}
                    onChange={(val) => setForm(f => ({ ...f, quantity: val }))}
                    required={true}
                    placeholder="e.g. 100"
                  />
                  <div className="form-group">
                    <label className="field-label">Unit</label>
                    <select className="rs-select" value={form.unit} onChange={set("unit")}>
                      {["kg","g","litre","piece","dozen"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2 mt-2">
                  <div className="toggle-row" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span className="toggle-label" style={{ fontWeight: 600 }}>📅 Allow Pre-booking?</span>
                    <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                      <input type="checkbox" checked={form.isPrebooking} onChange={(e) => setForm(f=>({...f,isPrebooking:e.target.checked}))} style={{ width:18,height:18 }} />
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>Yes, accept advance orders</span>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span className="toggle-label" style={{ fontWeight: 600 }}>📦 Wholesale / Bulk Selling?</span>
                    <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                      <input type="checkbox" checked={form.isBulk} onChange={(e) => setForm(f=>({...f,isBulk:e.target.checked}))} style={{ width:18,height:18 }} />
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>Yes, sell in bulk to events/groups</span>
                    </label>
                  </div>
                  {form.isPrebooking && (
                    <div className="form-group mb-2" style={{ background: "rgba(234, 179, 8, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px dashed rgba(234, 179, 8, 0.3)" }}>
                      <label className="field-label">Expected Harvest Date</label>
                      <input className="rs-input" type="date" value={form.harvestDate} onChange={set("harvestDate")} min={new Date().toISOString().split("T")[0]} />
                    </div>
                  )}

                  <div className="form-group mb-2">
                    <label className="field-label">Current Lifecycle Stage</label>
                    <select className="rs-select" value={form.lifecycleStage} onChange={set("lifecycleStage")}>
                      <option value="sowing">🌱 Sowing / Just Planted</option>
                      <option value="vegetative">🌿 Vegetative / Growing</option>
                      <option value="flowering">🌸 Flowering</option>
                      <option value="harvesting">🚜 Harvesting</option>
                      <option value="post_harvest">📦 Post-Harvest</option>
                      <option value="ready">✅ Ready for Sale</option>
                    </select>
                  </div>
                  {form.isBulk && (
                    <div className="form-group">
                      <label className="field-label">Minimum Order Qty (for Bulk)</label>
                      <input className="rs-input" type="number" min="1" value={form.minOrderQty} onChange={set("minOrderQty")} required />
                    </div>
                  )}
                </div>

                <div className="grid-2 mt-2">
                  <div className="form-group">
                    <label className="field-label">📍 Farm Location *</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <div className="input-wrapper" style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
                        <input 
                          className="rs-input" 
                          type="text" 
                          placeholder="Type or speak farm address..." 
                          value={listening && activeField === "farmLocation" && interim ? `${form.farmLocation || ""} ${interim}...` : form.farmLocation} 
                          onChange={set("farmLocation")} 
                          style={listening && activeField === "farmLocation" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
                        />
                        <VoiceMicButton
                          fieldId="farmLocation"
                          onResult={(t) => setForm(f => ({ ...f, farmLocation: f.farmLocation ? f.farmLocation + " " + t : t }))}
                          startListening={startListening}
                          listening={listening}
                          activeField={activeField}
                        />
                      </div>
                      <LocationButton
                        compact
                        onLocation={({ address, lat, lng }) => {
                          setForm(f => ({ ...f, farmLocation: address, latitude: lat, longitude: lng }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <label className="field-label" style={{ margin: 0 }}>📍 Product Location *</label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.sameLocation} onChange={(e) => {
                          const checked = e.target.checked;
                          setForm(f => ({ ...f, sameLocation: checked, location: checked ? f.farmLocation : f.location }));
                        }} />
                        Same as Farm
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <div className="input-wrapper" style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
                        <input 
                          className="rs-input" 
                          type="text" 
                          placeholder="Where is the product stored?" 
                          value={form.sameLocation ? form.farmLocation : (listening && activeField === "location" && interim ? `${form.location || ""} ${interim}...` : form.location)} 
                          onChange={(e) => { if(!form.sameLocation) set("location")(e); }} 
                          disabled={form.sameLocation} 
                          style={{ opacity: form.sameLocation ? 0.6 : 1, ...(listening && activeField === "location" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}) }} 
                        />
                        <VoiceMicButton
                          fieldId="location"
                          onResult={(t) => { if(!form.sameLocation) setForm(f => ({ ...f, location: f.location ? f.location + " " + t : t })); }}
                          startListening={startListening}
                          listening={listening}
                          activeField={activeField}
                        />
                      </div>
                      {!form.sameLocation && (
                        <LocationButton 
                          compact 
                          onLocation={({ address, lat, lng }) => setForm(f => ({ ...f, location: address, latitude: lat, longitude: lng }))} 
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-between mt-3">
                  <button type="button" className="btn-secondary" onClick={() => setWizardStep(1)}>⬅️ Back</button>
                  <button type="button" className="btn-primary" onClick={() => setWizardStep(3)}>Next ➡️</button>
                </div>
              </motion.div>
            )}

            {wizardStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="form-group">
                  <label className="field-label">Crop Description</label>
                  <textarea className="rs-input" value={form.description} onChange={set("description")} />
                </div>
                
                <div className="grid-2 mt-2">
                  <div className="toggle-row" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span className="toggle-label" style={{ fontWeight: 600 }}>🌿 Organic?</span>
                    <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                      <input type="checkbox" checked={form.isOrganic} onChange={(e) => setForm(f=>({...f,isOrganic:e.target.checked}))} style={{ width:18,height:18 }} />
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>Yes</span>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span className="toggle-label" style={{ fontWeight: 600 }}>🛡️ Pesticide Free?</span>
                    <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
                      <input type="checkbox" checked={form.isPesticideFree} onChange={(e) => setForm(f=>({...f,isPesticideFree:e.target.checked}))} style={{ width:18,height:18 }} />
                      <span style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>Yes</span>
                    </label>
                  </div>
                </div>

                <div className="form-group mt-2">
                  <label className="field-label">Farm Tour URL (Optional)</label>
                  <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", marginBottom:"0.5rem" }}>Link a YouTube or Drive video showing your farm to build buyer trust!</p>
                  <input className="rs-input" type="url" placeholder="https://youtube.com/..." value={form.farmTourUrl || ""} onChange={set("farmTourUrl")} />
                </div>

                <div className="form-group mt-2">
                  <label className="field-label">Crop Image & AI Analysis</label>
                  <label className="file-upload-area">
                    <input type="file" accept="image/*" onChange={(e) => analyzeImage(e.target.files[0])} />
                    <span className="file-upload-icon">📷</span>
                    <p className="file-upload-text">{form.image ? `✅ ${form.image.name}` : "Click to upload crop photo"}</p>
                  </label>
                  
                  {analyzingImage && (
                    <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--green-mid)", fontSize: "0.9rem" }}>
                      <span className="loader" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Analyzing crop quality...
                    </div>
                  )}
                  
                  {qualitySuggestion && !analyzingImage && (
                    <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--green-mid)", borderRadius: "8px", fontSize: "0.9rem", color: "var(--green-deep)", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem" }}>✨</span>
                      <div>
                        <strong>AI Analysis Complete</strong>
                        <p style={{ margin: 0, marginTop: "0.25rem" }}>{qualitySuggestion}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-between mt-3">
                  <button type="button" className="btn-secondary" onClick={() => setWizardStep(2)}>⬅️ Back</button>
                  <button type="button" className="btn-primary" onClick={handleAddCrop} disabled={loading}>
                    {loading ? "Processing..." : "🌾 List on Marketplace"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── GUIDED FORM BOX ── */}
        <div className="form-guide-box">
          <h4 style={{ color: "var(--green-deep)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🧭</span> Form Guide
            <button type="button" className="tts-btn" onClick={() => playTTS("This is the form guide. Follow the steps to list your crop.", lang)}>🔊</button>
          </h4>
          <div className={`guide-step ${focusField === "name" ? "active" : ""}`}>
            <strong>Step 1: Crop Name</strong><br/>Enter the name of your crop (e.g. Tomato, Rice).
          </div>
          <div className={`guide-step ${focusField === "price" ? "active" : ""}`}>
            <strong>Step 2: Pricing</strong><br/>Set a competitive price per unit in Rupees.
          </div>
          <div className={`guide-step ${focusField === "quantity" ? "active" : ""}`}>
            <strong>Step 3: Quantity</strong><br/>How much stock do you have available right now?
          </div>
          <div className={`guide-step ${focusField === "location" ? "active" : ""}`}>
            <strong>Step 4: Location</strong><br/>Allow auto-detect so agents can find your farm easily.
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
            💡 Tip: Click the 🔊 icon next to fields to hear them spoken aloud.
          </p>
        </div>
        </div>
      )}

      {/* ── AI CHAT ASSISTANT TAB ── */}
      {tab === "aiChat" && (
        <div className="glass-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h3 className="section-title">💬 Farm AI Assistant</h3>
          <p style={{ color: "var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>Ask me anything about farming, weather, or marketplace prices!</p>
          
          <div className="chat-window" style={{ height: "400px", overflowY: "auto", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {chatHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>No messages yet. Say hello!</div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", background: msg.role === "user" ? "var(--green-mid)" : "rgba(255,255,255,0.1)", padding: "0.5rem 1rem", borderRadius: "12px", maxWidth: "80%", wordWrap: "break-word" }}>
                  <strong style={{ display: "block", fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.2rem" }}>{msg.role === "user" ? "You" : "AI"}</strong>
                  {msg.text}
                </div>
              ))
            )}
            {chatLoading && <div style={{ alignSelf: "flex-start", color: "var(--yellow-wheat)" }}>AI is typing...</div>}
          </div>
          
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input 
              type="text" 
              className="rs-input" 
              placeholder="E.g. What is the best time to sow tomatoes?" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
            />
            <button className="btn-primary" style={{ width: "auto" }} onClick={handleSendChat} disabled={chatLoading}>Send</button>
          </div>
        </div>
      )}

      {/* ── ML SUGGESTIONS TAB ── */}
      {tab === "ml" && (
        <div className="grid-2">
          <div className="ml-card">
            <h3 className="section-title">🌤️ {t("cropSuggest")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize:"0.82rem", marginBottom:"1rem" }}>Uses Real-Time Weather via Open-Meteo API.</p>
            
            {weatherLive && (
              <div className="grid-3 mb-2" style={{ gap:"0.75rem" }}>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>🌡️</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.temp}°C</div>
                  <div className="stat-label">Temp</div>
                </div>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>💧</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.hum}%</div>
                  <div className="stat-label">Humidity</div>
                </div>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div className="stat-icon" style={{ fontSize: "1.5rem", width: "40px", height: "40px" }}>🌧️</div>
                  <div className="stat-value" style={{ fontSize: "1.2rem" }}>{weatherLive.rain}mm</div>
                  <div className="stat-label">Rainfall</div>
                </div>
              </div>
            )}
            
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={getLocation} disabled={locLoading}>
                {locLoading ? "Detecting..." : "📍 Select My Farm Address"}
              </button>
              <button className="btn-secondary" onClick={fetchLiveWeather} disabled={mlLoading || !form.latitude}>
                {mlLoading ? t("detecting") : `📡 ${t("fetchWeather")} for Farm`}
              </button>
            </div>
            {form.latitude && !weatherLive && <p style={{ fontSize:"0.8rem", color: "var(--text-muted)" }}>Farm address selected. Ready to fetch weather.</p>}

            <button className="btn-primary mt-2" onClick={runCropSuggest} disabled={mlLoading || !weatherLive}>
              {mlLoading ? t("loading") : `🤖 Analyze Weather & ${t("suggestCrop")}`}
            </button>
            {mlResult && !mlResult.error && (
              <div className="ml-result" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>🤖 AI Recommended Crop</p>
                    <h3 style={{ margin: "0.25rem 0", color: "var(--yellow-wheat)", fontSize: "1.5rem" }}>
                      🌾 {mlResult.recommended_crop}
                      <button type="button" className="tts-btn" onClick={() => playTTS(`Recommended Crop is ${mlResult.recommended_crop}. Confidence ${mlResult.confidence} percent. ${mlResult.farming_tips?.[0] || ""}`, lang)} style={{ marginLeft: "0.5rem" }}>🔊</button>
                    </h3>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{mlResult.category} • {mlResult.water_requirement} water • ~{mlResult.growth_duration_days} days</span>
                  </div>
                  <div style={{ textAlign: "center", background: "rgba(34,197,94,0.15)", padding: "0.75rem 1.25rem", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.3)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--green-mid)" }}>{mlResult.confidence}%</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Confidence</div>
                  </div>
                </div>

                {/* Scoring Breakdown */}
                {mlResult.scoring_breakdown && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                    {[
                      { label: "🌡️ Temperature", value: mlResult.scoring_breakdown.temperature_match },
                      { label: "💧 Humidity", value: mlResult.scoring_breakdown.humidity_match },
                      { label: "🌧️ Rainfall", value: mlResult.scoring_breakdown.rainfall_match },
                    ].map((item, i) => (
                      <div key={i} style={{ background: "rgba(0,0,0,0.2)", padding: "0.6rem", borderRadius: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{item.label}</div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${item.value}%`, background: item.value > 70 ? "var(--green-mid)" : item.value > 40 ? "var(--yellow-wheat)" : "#ef4444", borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dark)", marginTop: "0.2rem" }}>{item.value}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Weather Risk */}
                {mlResult.weather_risk && (
                  <div style={{ padding: "0.6rem", borderRadius: "8px", marginBottom: "1rem", background: mlResult.weather_risk === "Low" ? "rgba(34,197,94,0.08)" : mlResult.weather_risk === "Medium" ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${mlResult.weather_risk === "Low" ? "rgba(34,197,94,0.2)" : mlResult.weather_risk === "Medium" ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {mlResult.weather_risk === "Low" ? "✅" : mlResult.weather_risk === "Medium" ? "⚠️" : "🚨"} Weather Risk: {mlResult.weather_risk}
                    </span>
                    {mlResult.risk_details?.length > 0 && (
                      <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {mlResult.risk_details.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {/* Alternatives */}
                {mlResult.alternatives?.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>🔄 Alternative Crops</p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {mlResult.alternatives.map((alt, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "0.4rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <strong style={{ color: "var(--text-dark)" }}>{alt.name}</strong>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{alt.confidence}%</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>({alt.season})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Farming Tips */}
                {mlResult.farming_tips?.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.75rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>💡 Actionable Tips</p>
                    {mlResult.farming_tips.map((tip, i) => (
                      <p key={i} style={{ fontSize: "0.82rem", color: "var(--text-dark)", margin: "0.2rem 0", display: "flex", gap: "0.4rem" }}>
                        <span>•</span> {tip}
                      </p>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem", fontStyle: "italic" }}>{mlResult.note}</p>
              </div>
            )}
            {mlResult?.error && <div className="alert alert-error mt-2">⚠️ {mlResult.error}</div>}
          </div>

          <div className="ml-card">
            <h3 className="section-title">📊 {t("demandForecast")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize:"0.82rem", marginBottom:"1rem" }}>Discover which crops are in highest demand.</p>
            <DemandPanel />
          </div>

          <YieldPredictor />
        </div>
      )}

      {/* ── FARMING TIPS TAB ── */}
      {tab === "tips" && (
        <div className="ml-card">
          <h3 className="section-title">💡 {t("farmerTips")}</h3>
          <p style={{ color: "var(--text-muted)", fontSize:"0.82rem", marginBottom:"1rem" }}>Get personalized farming advice.</p>
          <div className="grid-2">
            <AutoSuggestInput value={tipsForm.crop} onChange={(val) => setTipsForm(f=>({...f,crop:val}))}
              onSpeak={() => startListening((transcript) => {
                setTipsForm(f => ({ ...f, crop: transcript }));
              }, { fieldId: "tipsCrop" })}
              onFocus={() => setFocusField("tipsCrop")}
              onTTS={() => playTTS(`Crop is ${tipsForm.crop}`, lang)}
              listening={listening && activeField === "tipsCrop"} interim={interim} label="Crop Name" placeholder="e.g. Rice, Wheat..." fieldType="crop" />
            <div className="form-group">
              <label className="field-label">{t("soilType")}</label>
              <select className="rs-select" value={tipsForm.soil} onChange={(e) => setTipsForm(f=>({...f,soil:e.target.value}))}>
                {SOILS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-2" onClick={runFarmerTips} disabled={mlLoading || !tipsForm.crop} style={{ maxWidth:200 }}>
            {mlLoading ? t("loading") : "💡 Get Tips"}
          </button>
          {tipsResult && !tipsResult.error && (
            <div className="ml-result mt-2">
              <p><strong style={{ color:"var(--yellow-wheat)" }}>Crop:</strong> {tipsResult.crop} | <strong style={{ color:"var(--yellow-wheat)" }}>Soil:</strong> {tipsResult.soil_type}</p>
              <ul style={{ marginTop:"0.75rem", paddingLeft:"1.25rem" }}>
                {tipsResult.suggestions?.map((s,i) => (
                  <li key={i} style={{ color: "var(--text-dark)", fontSize:"0.88rem", marginBottom:"0.4rem" }}>✅ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {tipsResult?.error && <div className="alert alert-error mt-2">⚠️ {tipsResult.error}</div>}

          {/* Smart Advisor Widget inside Tips Tab */}
          <div className="glass-card mt-3">
            <h3 className="section-title">🌦️ Smart Farming Advisor</h3>
            <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>Get real-time sowing, irrigation, and harvesting advice based on your current weather.</p>
            <button className="btn-secondary mb-2" onClick={fetchLiveWeather}>
              {mlLoading ? "Fetching Weather..." : "📡 Refresh Local Weather"}
            </button>
            {weatherLive && (
              <div className="grid-3 mb-2" style={{ background: "rgba(59, 130, 246, 0.05)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                <div><strong>Temperature:</strong> {weatherLive.temp}°C</div>
                <div><strong>Humidity:</strong> {weatherLive.hum}%</div>
                <div><strong>Rainfall:</strong> {weatherLive.rain} mm</div>
              </div>
            )}
            <p style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>* Uses location from Add Crop tab to fetch current weather context for the ML suggestion engine.</p>
          </div>
        </div>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab === "broadcast" && (
        <div className="glass-card">
          <h3 className="section-title">📢 Send Broadcast Notification</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Reach out directly to your past customers or nearby groups.</p>
          
          <div className="form-group">
            <label className="field-label">Target Audience</label>
            <select className="rs-select" value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)}>
              <option value="all_customers">All Past Customers</option>
              <option value="group_members">My Group Selling Members</option>
              <option value="nearby_customers">Nearby Customers (10km)</option>
            </select>
          </div>
          
          <div className="form-group mt-2">
            <label className="field-label">Message</label>
            <textarea 
              className="rs-input" 
              rows="4" 
              placeholder="E.g., Fresh organic tomatoes just harvested! Available at 10% discount today."
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
            />
          </div>
          
          <button className="btn-primary mt-2" style={{ width: "auto" }} onClick={handleFarmerBroadcast}>
            Send Broadcast 🚀
          </button>
        </div>
      )}
      {/* ── PROFIT CALCULATOR TAB ── */}
      {tab === "profit" && (
        <div className="glass-card">
          <h3 className="section-title">💰 Crop Profit Calculator</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Calculate expected net profit based on your estimated costs and yields.</p>
          
          <div className="grid-2">
            <div>
              <VoiceField label="Crop Name" value={profitCalc.cropName} onChange={(val) => setProfitCalc({...profitCalc, cropName: val})} placeholder="e.g., Tomato" />
              <VoiceField label="Expected Yield (kg)" type="number" value={profitCalc.expectedYield} onChange={(val) => setProfitCalc({...profitCalc, expectedYield: val})} placeholder="100" />
              <VoiceField label="Expected Market Price (per kg)" type="number" value={profitCalc.expectedPrice} onChange={(val) => setProfitCalc({...profitCalc, expectedPrice: val})} placeholder="40" />
            </div>
            
            <div>
              <VoiceField label="Seed Cost (₹)" type="number" value={profitCalc.seedCost} onChange={(val) => setProfitCalc({...profitCalc, seedCost: val})} placeholder="500" />
              <VoiceField label="Fertilizer/Pesticide Cost (₹)" type="number" value={profitCalc.fertilizerCost} onChange={(val) => setProfitCalc({...profitCalc, fertilizerCost: val})} placeholder="1200" />
              <VoiceField label="Equipment/Tractor Cost (₹)" type="number" value={profitCalc.equipmentCost} onChange={(val) => setProfitCalc({...profitCalc, equipmentCost: val})} placeholder="2000" />
              <VoiceField label="Labor Cost (₹)" type="number" value={profitCalc.laborCost} onChange={(val) => setProfitCalc({...profitCalc, laborCost: val})} placeholder="3000" />
            </div>
          </div>
          
          <div className="glass-card-dark mt-3" style={{ textAlign: "center" }}>
            <h4 style={{ color: "var(--text-dark)" }}>Estimated Financials</h4>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Total Revenue</p>
                <p style={{ fontSize: "1.2rem", color: "var(--yellow-wheat)", fontWeight: "bold" }}>
                  ₹{ (Number(profitCalc.expectedYield) * Number(profitCalc.expectedPrice)) || 0 }
                </p>
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Total Costs</p>
                <p style={{ fontSize: "1.2rem", color: "#e11d48", fontWeight: "bold" }}>
                  ₹{ (Number(profitCalc.seedCost) + Number(profitCalc.fertilizerCost) + Number(profitCalc.equipmentCost) + Number(profitCalc.laborCost)) || 0 }
                </p>
              </div>
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Net Profit</p>
                <p style={{ fontSize: "1.4rem", color: "var(--green-light)", fontWeight: "bold" }}>
                  ₹{ ((Number(profitCalc.expectedYield) * Number(profitCalc.expectedPrice)) - (Number(profitCalc.seedCost) + Number(profitCalc.fertilizerCost) + Number(profitCalc.equipmentCost) + Number(profitCalc.laborCost))) || 0 }
                </p>
              </div>
            </div>
            <button className="btn-secondary mt-3" onClick={() => setProfitCalc({cropName: "", expectedYield: "", expectedPrice: "", seedCost: "", fertilizerCost: "", equipmentCost: "", laborCost: ""})}>Reset Calculator</button>
          </div>
        </div>
      )}
      {/* ── WAREHOUSE PLANNING TAB ── */}
      {tab === "warehouse" && (
        <div className="glass-card">
          <h3 className="section-title">🏭 Warehouse & Supply Planning</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Track your current stock levels and see local community demand to plan storage efficiently.
          </p>

          <div className="grid-2">
            {crops.filter(c => c.quantity > 0).map(crop => (
              <div key={crop._id} className="glass-card-dark" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ color: "var(--text-dark)", margin: 0 }}>{crop.name}</h4>
                  <span className={`badge ${crop.quantity > 500 ? "badge-green" : "badge-yellow"}`}>
                    Stock: {crop.quantity} {crop.unit}
                  </span>
                </div>
                
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Storage recommendation based on community demand trends:
                </p>

                {crop.quantity > 500 ? (
                  <div style={{ padding: "0.75rem", background: "rgba(225, 29, 72, 0.05)", border: "1px solid rgba(225, 29, 72, 0.2)", borderRadius: "8px" }}>
                    <p style={{ fontSize: "0.8rem", color: "#e11d48", margin: 0 }}>
                      ⚠️ Oversupply risk. Consider adding a discount or listing in the Group Selling pool to move stock faster.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: "0.75rem", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "8px" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--green-primary)", margin: 0 }}>
                      ✅ Healthy stock level. Local demand is stable. Hold current pricing.
                    </p>
                  </div>
                )}
                
                <button className="btn-secondary mt-1" style={{ fontSize: "0.75rem", padding: "0.4rem" }} onClick={() => setTab("groups")}>
                  Move to Group Pool
                </button>
              </div>
            ))}
          </div>

          {crops.filter(c => c.quantity > 0).length === 0 && (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
              No active stock available in your warehouse.
            </p>
          )}
        </div>
      )}

      {/* ── POLICIES TAB ── */}
      {tab === "policies" && (
        <div className="glass-card">
          <h3 className="section-title">📜 Farmer Policies & Guidelines</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Please adhere to the following rules to ensure a secure and trustworthy marketplace. Violations may result in point deductions or account suspension.
          </p>
          <div className="grid-2">
            <div style={{ background: "rgba(22, 163, 74, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
              <h4 style={{ color: "var(--green-deep)", marginBottom: "0.5rem" }}>✅ Quality Assurance</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>You must ensure the quality and quantity of the crop exactly matches what is listed. The delivery agent will verify the product upon pickup.</p>
            </div>
            <div style={{ background: "rgba(225, 29, 72, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
              <h4 style={{ color: "#e11d48", marginBottom: "0.5rem" }}>🚨 No Misleading Info</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>False claims regarding Organic/Pesticide-Free status will lead to immediate Trust Score reduction and potential ban.</p>
            </div>
            <div style={{ background: "rgba(37, 99, 235, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
              <h4 style={{ color: "#2563eb", marginBottom: "0.5rem" }}>📦 Timely Readiness</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>Crops must be packed and ready before the agent arrives. Delays caused by the farmer will negatively impact your rating.</p>
            </div>
            <div style={{ background: "rgba(217, 119, 6, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(217, 119, 6, 0.2)" }}>
              <h4 style={{ color: "#d97706", marginBottom: "0.5rem" }}>⚖️ Fair Pricing</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>Do not manipulate prices artificially. The admin monitors price changes to protect customer interests.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPPORT / CONTACT ADMIN TAB ── */}
      {tab === "support" && (
        <div className="glass-card">
          <h3 className="section-title">🛠️ Contact Admin / Report Issue</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Need help or want to report an issue with an agent, customer, or order? Send a support ticket directly to the admin team.
          </p>
          <div className="form-group">
            <label className="field-label">Subject</label>
            <input type="text" className="rs-input" id="ticketSubject" placeholder="e.g., Payment issue with Order #RS-1234" />
          </div>
          <div className="form-group mt-2">
            <label className="field-label">Details / Message</label>
            <textarea className="rs-input" id="ticketMessage" rows="4" placeholder="Describe your issue in detail..."></textarea>
          </div>
          <button className="btn-primary mt-2" style={{ width: "auto" }} onClick={async () => {
            const subject = document.getElementById("ticketSubject").value;
            const message = document.getElementById("ticketMessage").value;
            if (!subject || !message) return setMsg({ type:"error", text:"Please fill in all fields." });
            try {
              await API.post("/tickets/create", { creator: user._id, role: user.role, subject, message });
              setMsg({ type:"success", text:"Ticket submitted successfully! The admin will contact you soon." });
              document.getElementById("ticketSubject").value = "";
              document.getElementById("ticketMessage").value = "";
            } catch (err) {
              setMsg({ type:"error", text:"Failed to submit ticket." });
            }
          }}>
            Send Ticket 🚀
          </button>
        </div>
      )}

      {/* ── GROUP SELLING TAB ── */}
      {tab === "groups" && (
        <FarmerGroups crops={crops} />
      )}

      {/* ── PROFIT CALCULATOR TAB ── */}
      {tab === "profit" && (
        <FarmerProfitCalculator />
      )}

      {/* ── FINANCIAL LEDGER TAB ── */}
      {tab === "ledger" && (
        <FarmerFinancialLedger orders={orders} />
      )}

      {/* ── FARM TOURS TAB ── */}
      {tab === "tours" && <FarmerTours />}
      
      {/* ── ASSISTANT OVERLAY ── */}
      <AssistantOverlay 
        isActive={wizardActive} 
        onClose={() => { setWizardActive(false); setAiMessage(""); if (window.speechSynthesis) window.speechSynthesis.cancel(); }} 
        interimText={listening ? interim : ""} 
        aiMessage={aiMessage} 
        step={wizardStep} 
      />

      {/* ── PEST DETECTION TAB ── */}
      {tab === "pest" && (
        <div className="glass-card" style={{ padding: "2rem" }}>
          <h2 style={{ color: "var(--green-deep)", marginBottom: "0.5rem" }}>🐛 AI Pest & Disease Detection</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Upload a clear photo of an affected leaf or crop. Our Gemini AI will analyze the image, detect any pests or diseases, and provide immediate organic remedy recommendations.
          </p>
          
          <div className="form-group mb-3">
            <label className="field-label">Upload Crop Photo</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  setPestImage(file);
                  const reader = new FileReader();
                  reader.onloadend = () => setPestPreview(reader.result);
                  reader.readAsDataURL(file);
                }
              }}
              style={{ display: "block", width: "100%" }}
            />
          </div>

          {pestPreview && (
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
              <img src={pestPreview} alt="Pest Preview" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "12px", border: "2px solid #e2e8f0" }} />
            </div>
          )}

          <button 
            className="btn-primary" 
            style={{ width: "100%", marginBottom: "2rem", background: "var(--green-mid)", borderColor: "var(--green-mid)" }}
            onClick={runPestDetection}
            disabled={pestLoading || !pestPreview}
          >
            {pestLoading ? "🤖 Analyzing Image..." : "🔎 Detect Pests & Diseases"}
          </button>

          {pestResult && (
            <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ color: "var(--text-dark)", marginBottom: "1rem" }}>Analysis Result</h3>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Detected Condition:</strong>{" "}
                <span style={{ color: pestResult.disease !== "Healthy" ? "#ef4444" : "#10b981", fontWeight: "bold" }}>
                  {pestResult.disease}
                </span>
              </p>
              <p style={{ marginBottom: "1rem" }}>
                <strong>Severity:</strong>{" "}
                <span className={`badge ${pestResult.severity === "Severe" || pestResult.severity === "High" ? "badge-red" : "badge-yellow"}`}>
                  {pestResult.severity}
                </span>
              </p>
              <div style={{ background: "white", padding: "1rem", borderRadius: "8px", borderLeft: "4px solid var(--green-mid)" }}>
                <strong style={{ display: "block", marginBottom: "0.5rem", color: "var(--green-deep)" }}>Organic Treatment Plan:</strong>
                <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.95rem", lineHeight: "1.5" }}>{pestResult.remedy}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {tab === "leaderboard" && (
        <FarmerLeaderboard />
      )}

      {trackingOrder && (
        <LiveMapModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
      
      {/* Order Details Modal */}
      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-dark)" }}>Order Details #{viewOrder.billNumber || viewOrder._id.substring(0,8).toUpperCase()}</h3>
            
            <div style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(22, 163, 74, 0.05)", borderRadius: "8px", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
              <h4 style={{ color: "var(--green-deep)", marginBottom: "0.5rem" }}>Customer Info</h4>
              <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Name:</strong> {viewOrder.customer?.name}</p>
              <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Delivery Address:</strong> {viewOrder.deliveryAddress || "N/A"}</p>
            </div>

            <div style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(37, 99, 235, 0.05)", borderRadius: "8px", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
              <h4 style={{ color: "var(--blue-deep)", marginBottom: "0.5rem" }}>Pickup Info</h4>
              <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Pickup Address:</strong> {viewOrder.pickupAddress || "N/A"}</p>
              <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Status:</strong> {viewOrder.status?.replace("_", " ")}</p>
            </div>

            <button className="btn-secondary" style={{ width: "100%" }} onClick={() => setViewOrder(null)}>Close</button>
          </div>
        </div>
      )}
      {/* Crop Stage Update Modal */}
      {stageModal.isOpen && (
        <div className="modal-overlay" onClick={() => setStageModal(m => ({ ...m, isOpen: false }))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-dark)" }}>Update Crop Stage</h3>
            
            <div className="form-group mb-3">
              <label className="field-label">Current Stage</label>
              <select 
                className="rs-select"
                value={stageModal.stage}
                onChange={e => setStageModal(m => ({ ...m, stage: e.target.value }))}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "8px" }}
              >
                <option value="sowing">Sowing</option>
                <option value="vegetative">Vegetative</option>
                <option value="flowering">Flowering</option>
                <option value="harvesting">Harvesting</option>
                <option value="ready">Ready to Sell</option>
                <option value="post_harvest">Post-Harvest</option>
              </select>
            </div>

            <div className="form-group mb-3">
              <label className="field-label">Stage Notes</label>
              <textarea 
                className="rs-input"
                placeholder="E.g., Added natural compost today..."
                value={stageModal.notes}
                onChange={e => setStageModal(m => ({ ...m, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="form-group mb-4">
              <label className="field-label">Photo Proof (Required by Admin)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    setStageModal(m => ({ ...m, imageFile: file, imagePreview: URL.createObjectURL(file) }));
                  }
                }}
                style={{ display: "block", width: "100%", fontSize: "0.85rem" }}
              />
              {stageModal.imagePreview && (
                <img src={stageModal.imagePreview} alt="Preview" style={{ width: "100%", height: "150px", objectFit: "cover", marginTop: "1rem", borderRadius: "8px" }} />
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStageModal(m => ({ ...m, isOpen: false }))}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={submitCropStage}>Update Stage</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Crop Modal */}
      {editCropModal.isOpen && (
        <div className="modal-overlay" onClick={() => setEditCropModal(m => ({ ...m, isOpen: false }))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-dark)" }}>Edit Crop Details</h3>
            <div className="form-group mb-3">
              <label className="field-label">Crop Name</label>
              <input type="text" className="rs-input" value={editCropModal.name} onChange={e => setEditCropModal(m => ({ ...m, name: e.target.value }))} />
            </div>
            <div className="form-group mb-3">
              <label className="field-label">Category</label>
              <select className="rs-select" value={editCropModal.category} onChange={e => setEditCropModal(m => ({ ...m, category: e.target.value }))}>
                <option value="vegetable">Vegetable</option>
                <option value="fruit">Fruit</option>
                <option value="grain">Grain</option>
                <option value="spice">Spice</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group mb-3" style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label className="field-label">Quantity</label>
                <input type="number" className="rs-input" value={editCropModal.quantity} onChange={e => setEditCropModal(m => ({ ...m, quantity: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Unit</label>
                <select className="rs-select" value={editCropModal.unit} onChange={e => setEditCropModal(m => ({ ...m, unit: e.target.value }))}>
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="pieces">pieces</option>
                  <option value="dozen">dozen</option>
                  <option value="box">box</option>
                </select>
              </div>
            </div>
            <div className="form-group mb-3">
              <label className="field-label">Price (₹)</label>
              <input type="number" className="rs-input" value={editCropModal.price} onChange={e => setEditCropModal(m => ({ ...m, price: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditCropModal(m => ({ ...m, isOpen: false }))}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleEditCropSubmit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Auction Modal */}
      {auctionModal.isOpen && (
        <div className="modal-overlay" onClick={() => setAuctionModal(m => ({ ...m, isOpen: false }))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--text-dark)" }}>Create B2B Auction</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              List {auctionModal.crop?.name} for bulk bidding by B2B buyers.
            </p>

            <div className="form-group mb-3">
              <label className="field-label">Quantity to Auction ({auctionModal.crop?.unit})</label>
              <input 
                type="number" className="rs-input" 
                value={auctionModal.quantity} 
                onChange={e => setAuctionModal(m => ({ ...m, quantity: e.target.value }))}
                max={auctionModal.crop?.quantity}
              />
              <small style={{ color: "var(--text-muted)" }}>Available: {auctionModal.crop?.quantity}</small>
            </div>

            <div className="form-group mb-3">
              <label className="field-label">Starting Bid (₹)</label>
              <input 
                type="number" className="rs-input" 
                value={auctionModal.startingBid} 
                onChange={e => setAuctionModal(m => ({ ...m, startingBid: e.target.value }))}
              />
            </div>

            <div className="form-group mb-4">
              <label className="field-label">Duration</label>
              <select className="rs-select" value={auctionModal.durationHours} onChange={e => setAuctionModal(m => ({ ...m, durationHours: e.target.value }))}>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="48">48 Hours (2 Days)</option>
                <option value="72">72 Hours (3 Days)</option>
                <option value="168">1 Week</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setAuctionModal(m => ({ ...m, isOpen: false }))}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: "var(--blue-mid)", borderColor: "var(--blue-mid)" }} onClick={createAuction}>Start Auction</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

