/**
 * useMarketAudio — Immersive Indian Market Audio Engine
 *
 * States:
 *  "ambient"  → cycling random crops, 3 overlapping vendor voices every 10s
 *  "focused"  → hovered on one product, that crop announced clearly on loop
 *
 * Exported:
 *  { isActive, toggle, focusCrop, blurCrop }
 */
import { useRef, useCallback, useEffect, useState } from "react";
import { playTTS, stopTTS } from "../utils/voiceParser";

// ── Full Indian language templates (Multiple variations for realistic slangs) ────────
const TEMPLATES = {
  en: [
    (n, p, u) => `Fresh ${n}! Only ${p} rupees per ${u}. Get it now!`,
    (n, p, u) => `Hey! Farm fresh ${n} arriving! Just ${p} per ${u}.`,
    (n, p, u) => `Top quality ${n}! Selling fast at ${p} rupees for one ${u}.`
  ],
  te: [
    (n, p, u) => `అరేయ్, తాజా ${n} వచ్చాయి! ఒక్కో ${u} కు కేవలం ${p} రూపాయలు. ఇప్పుడే తీసుకోండి!`,
    (n, p, u) => `చూడండి బాబూ, భలే ${n}! ${p} రూపాయలకే ${u} ఇస్తున్నాం.`,
    (n, p, u) => `కొత్త పంట ${n}! రేటు కేవలం ${p} రూపాయలు ${u} కి.`
  ],
  hi: [
    (n, p, u) => `अरे भाई, ताज़ा ${n}! सिर्फ ${p} रुपये प्रति ${u}. अभी ले जाओ!`,
    (n, p, u) => `सस्ते और अच्छे ${n}! एक ${u} का दाम सिर्फ ${p} रुपये।`,
    (n, p, u) => `आइए आइए! खेत से सीधे ${n}, केवल ${p} रुपये में ${u}।`
  ],
  kn: [
    (n, p, u) => `ಅಣ್ಣಾ, ತಾಜಾ ${n} ಬಂತು! ${u} ಗೆ ಕೇವಲ ${p} ರೂಪಾಯಿ. ಈಗ ತೆಗೆದುಕೊಳ್ಳಿ!`,
    (n, p, u) => `ನೋಡಿ ಸ್ವಾಮಿ, ಒಳ್ಳೆ ${n}! ಕೇವಲ ${p} ರೂಪಾಯಿಗೆ ಒಂದು ${u}.`,
    (n, p, u) => `ಬನ್ನಿ ಬನ್ನಿ! ತಾಜಾ ${n}, ${p} ರೂಪಾಯಿಗೆ ${u}.`
  ],
  ta: [
    (n, p, u) => `ஐயா, புதிய ${n}! ${u} க்கு வெறும் ${p} ரூபாய். இப்பொழுதே வாங்குங்கள்!`,
    (n, p, u) => `பாருங்கள், நல்ல ${n}! ${u} ஒன்றுக்கு ${p} ரூபாய் மட்டுமே.`,
    (n, p, u) => `வாருங்கள்! வயல்வெளி ${n}, ${p} ரூபாய்க்கு ${u}.`
  ],
  ml: [
    (n, p, u) => `ചേട്ടാ, പുതിയ ${n}! ${u} ന് ${p} രൂപ മാത്രം. ഇപ്പോൾ വാങ്ങൂ!`,
    (n, p, u) => `നല്ല നാടൻ ${n}! ഒരു ${u} ന് ${p} രൂപ മാത്രം.`,
  ],
  mr: [
    (n, p, u) => `अरे दादा, ताजे ${n}! फक्त ${p} रुपये प्रति ${u}. आत्ताच घ्या!`,
    (n, p, u) => `चला चला! उत्तम ${n}, ${p} रुपयांना ${u}.`
  ],
  gu: [
    (n, p, u) => `અરે ભાઈ, તાજા ${n}! ${u} ને ${p} રૂ. જ. હમણાં લઈ જાઓ!`,
  ],
  bn: [
    (n, p, u) => `ও দাদা, তাজা ${n}! মাত্র ${p} টাকা প্রতি ${u}. এখনই নিন!`,
  ],
  pa: [
    (n, p, u) => `ਓਏ ਭਾਜੀ, ਤਾਜ਼ਾ ${n}! ਸਿਰਫ਼ ${p} ਰੁਪਏ ਪ੍ਰਤੀ ${u}. ਹੁਣੇ ਲਓ!`,
  ],
  or: [
    (n, p, u) => `ଆରେ ଭାଇ, ତାଜା ${n}! ମାତ୍ର ${p} ଟଙ୍କା ପ୍ରତି ${u}. ଏବେ ନିଅ!`,
  ],
  ur: [
    (n, p, u) => `ارے بھائی، تازہ ${n}! صرف ${p} روپے فی ${u}. ابھی لے جائیں!`,
  ],
};

// ── Crop names by language ───────────────────────────────────────────────────
const CROP_NAMES = {
  tomato:      { en:"Tomato",     te:"టమోటా",    hi:"टमाटर",  kn:"ಟೊಮೆಟೊ",  ta:"தக்காளி",  ml:"തക്കാളി",  mr:"टोमॅटो",  gu:"ટામેટાં", bn:"টমেটো",  pa:"ਟਮਾਟਰ", or:"ଟମାଟୋ", ur:"ٹماٹر" },
  potato:      { en:"Potato",     te:"బంగాళదుంప", hi:"आलू",   kn:"ಆಲೂಗಡ್ಡೆ", ta:"உருளை",    ml:"ഉരുളക്കിഴങ്ങ്", mr:"बटाटा", gu:"બટાકા", bn:"আলু",   pa:"ਆਲੂ",  or:"ଆଳୁ",  ur:"آلو" },
  onion:       { en:"Onion",      te:"ఉల్లిపాయ", hi:"प्याज",  kn:"ಈರುಳ್ಳಿ",  ta:"வெங்காயம்",ml:"ഉള്ളി",   mr:"कांदा",  gu:"ડુંગળી",bn:"পেঁয়াজ",pa:"ਪਿਆਜ਼",or:"ପିଆଜ", ur:"پیاز"},
  rice:        { en:"Rice",       te:"బియ్యం",   hi:"चावल",  kn:"ಅಕ್ಕಿ",    ta:"அரிசி",    ml:"അരി",     mr:"तांदूळ", gu:"ચોખા",  bn:"চাল",   pa:"ਚੌਲ",  or:"ଚାଉଳ",ur:"چاول"},
  wheat:       { en:"Wheat",      te:"గోధుమలు",  hi:"गेहूं",  kn:"ಗೋಧಿ",    ta:"கோதுமை",   ml:"ഗോതമ്പ്", mr:"गहू",    gu:"ઘઉં",   bn:"গম",    pa:"ਕਣਕ", or:"ଗହମ", ur:"گندم"},
  mango:       { en:"Mango",      te:"మామిడి",   hi:"आम",    kn:"ಮಾವಿನ",   ta:"மாம்பழம்", ml:"മാമ്പഴം",mr:"आंबा",   gu:"કેરી",  bn:"আম",    pa:"ਅੰਬ", or:"ଆମ୍ବ",ur:"آم"},
  banana:      { en:"Banana",     te:"అరటిపండు", hi:"केला",  kn:"ಬಾಳೆ",    ta:"வாழைப்பழம்",ml:"വാഴപ്പഴം",mr:"केळी",   gu:"કેળા",  bn:"কলা",   pa:"ਕੇਲਾ",or:"କଦଳୀ",ur:"کیلا"},
  chili:       { en:"Chili",      te:"మిరపకాయ",  hi:"मिर्च",  kn:"ಮೆಣಸು",   ta:"மிளகாய்",  ml:"മുളക്",   mr:"मिरची",  gu:"મરચું",  bn:"মরিচ",  pa:"ਮਿਰਚ",or:"ମରିଚ",ur:"مرچ"},
  brinjal:     { en:"Brinjal",    te:"వంకాయ",    hi:"बैंगन",  kn:"ಬದನೆ",    ta:"கத்தரிக்காய்",ml:"വഴുതന",mr:"वांगे",  gu:"રીંગણ", bn:"বেগুন", pa:"ਬੈਂਗਣ",or:"ବାଇଗଣ",ur:"بینگن"},
  spinach:     { en:"Spinach",    te:"పాలకూర",   hi:"पालक",   kn:"ಪಾಲಕ",    ta:"கீரை",     ml:"ചീര",     mr:"पालक",   gu:"પાલક",  bn:"পালং",  pa:"ਪਾਲਕ",or:"ପାଳଙ୍ଗ",ur:"پالک"},
  cauliflower: { en:"Cauliflower",te:"కాలీఫ్లవర్",hi:"फूल गोभी",kn:"ಹೂಕೋಸು",ta:"காலிஃப்ளவர்",ml:"കോളിഫ്ലവർ",mr:"फुलकोबी",gu:"ફ્લાવર", bn:"ফুলকপি",pa:"ਗੋਭੀ",or:"ଫୁଲ ଗୋଭି",ur:"گوبھی"},
  carrot:      { en:"Carrot",     te:"గాజర్",    hi:"गाजर",   kn:"ಗಜ್ಜರಿ",  ta:"கேரட்",   ml:"കക്ഷി",   mr:"गाजर",   gu:"ગાજર",  bn:"গাজর",  pa:"ਗਾਜਰ",or:"ଗାଜର",ur:"گاجر"},
  okra:        { en:"Okra",       te:"బెండకాయ",  hi:"भिंडी",  kn:"ಬೆಂಡೆ",   ta:"வெண்டை",   ml:"ഓക്ര",    mr:"भेंडी",  gu:"ભીંડા", bn:"ঢেঁড়স", pa:"ਭਿੰਡੀ",or:"ଭେଣ୍ଡି",ur:"بھنڈی"},
  garlic:      { en:"Garlic",     te:"వెల్లుల్లి", hi:"लहसुन", kn:"ಬೆಳ್ಳುಳ್ಳಿ",ta:"பூண்டு",  ml:"വെളുത്തുള്ളി",mr:"लसूण",  gu:"લસણ",   bn:"রসুন",  pa:"ਲਸਣ", or:"ଲଶୁଣ", ur:"لہسن"},
  ginger:      { en:"Ginger",     te:"అల్లం",    hi:"अदरक",   kn:"ಶುಂಠಿ",   ta:"இஞ்சி",   ml:"ഇഞ്ചി",   mr:"आले",    gu:"આદું",  bn:"আদা",   pa:"ਅਦਰਕ",or:"ଅଦା",  ur:"ادرک"},
  coconut:     { en:"Coconut",    te:"కొబ్బరి",  hi:"नारियल", kn:"ತೆಂಗಿನ",  ta:"தேங்காய்", ml:"തേങ്ങ",   mr:"नारळ",   gu:"નારિયેળ",bn:"নারকেল",pa:"ਨਾਰੀਅਲ",or:"ନଡ଼ିଆ",ur:"ناریل"},
};

// ── BCP-47 locale map for voices ─────────────────────────────────────────────
const LOCALE_MAP = {
  en: "en-IN", te: "te-IN", hi: "hi-IN", kn: "kn-IN",
  ta: "ta-IN", ml: "ml-IN", mr: "mr-IN", gu: "gu-IN",
  bn: "bn-IN", pa: "pa-IN", or: "or-IN", ur: "ur-IN",
};

// ── Get translated crop name ──────────────────────────────────────────────────
export function getCropName(rawName, lang) {
  if (!rawName) return rawName;
  const key = rawName.toLowerCase().replace(/\s+/g, "");
  // direct match
  if (CROP_NAMES[key] && CROP_NAMES[key][lang]) return CROP_NAMES[key][lang];
  // partial match
  for (const k of Object.keys(CROP_NAMES)) {
    if (key.includes(k) || k.includes(key)) {
      if (CROP_NAMES[k][lang]) return CROP_NAMES[k][lang];
    }
  }
  return rawName; // fallback to original English name
}

// ── Pick best OS voice for the language ──────────────────────────────────────
let cachedVoices = [];
function getVoices() {
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis?.getVoices() || [];
  }
  return cachedVoices;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}
function pickVoice(locale, gender) {
  const voices = getVoices();
  let matches = voices.filter(v => 
    v.lang === locale || 
    v.lang.startsWith(locale.substring(0, 2)) || 
    v.lang.includes("IN")
  );

  if (matches.length > 0) {
    // Prioritize natural voices
    matches.sort((a, b) => {
      const aNatural = (a.name.toLowerCase().includes("natural") || a.name.toLowerCase().includes("online")) ? 1 : 0;
      const bNatural = (b.name.toLowerCase().includes("natural") || b.name.toLowerCase().includes("online")) ? 1 : 0;
      return bNatural - aNatural;
    });

    if (gender) {
      const isFemale = gender === "female";
      const isMale = gender === "male";
      
      const genderMatches = matches.filter(v => {
        const name = v.name.toLowerCase();
        const uri = v.voiceURI.toLowerCase();
        if (isFemale) {
           return name.includes("female") || name.includes("woman") || name.includes("girl") || uri.includes("female") || uri.includes("woman");
        } else if (isMale) {
           return (name.includes("male") && !name.includes("female")) || (name.includes("man") && !name.includes("woman")) || name.includes("boy") || (uri.includes("male") && !uri.includes("female"));
        }
        return false;
      });

      if (genderMatches.length > 0) {
        return genderMatches[Math.floor(Math.random() * genderMatches.length)]; // randomize if multiple exist for variation
      }
    }
    return matches[Math.floor(Math.random() * Math.min(3, matches.length))]; // Randomize among top voices for variation
  }
  return null;
}

// ── Speak a single utterance ──────────────────────────────────────────────────
function speak(text, lang, { rate = 0.88, filterType, filterFreq, volume = 1.0, gender } = {}) {
  if (!text) return Promise.resolve(false);
  try {
    return playTTS(text, lang, { rate, filterType, filterFreq, volume, gender });
  } catch (e) {
    console.warn("TTS failed:", e);
    return Promise.resolve(false);
  }
}

// ── Vendor personas (Simulating Gender/Age via Audio EQ Filters) ──────────────
const VENDORS = [
  // Vendor 1: "Sharp/Loud" (Highpass filter mimics a sharp, carrying voice)
  { rate: 1.05, filterType: "highpass", filterFreq: 600, volume: 1.0,  delay: 0 }, 
  // Vendor 2: "Deep/Muffled" (Lowpass filter mimics an older, deep distant voice)
  { rate: 0.95, filterType: "lowpass", filterFreq: 400, volume: 0.85, delay: 2000 },   
  // Vendor 3: "Megaphone/Radio" (Bandpass filter mimics a megaphone shout)
  { rate: 1.10, filterType: "bandpass", filterFreq: 1200, volume: 0.65, delay: 4500 }, 
];

// ── Chime ─────────────────────────────────────────────────────────────────────
let _audioCtx = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function chime(freq = 523, vol = 0.08) {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
  } catch {}
}

// ── Ambient audio element ─────────────────────────────────────────────────────
let _ambientEl = null;
function getAmbient() {
  if (!_ambientEl) {
    _ambientEl = new Audio("/flute.mp3");
    _ambientEl.loop = true;
    _ambientEl.volume = 0.15;
  }
  return _ambientEl;
}

// ════════════════════════════════════════════════════════════════════════════
// The hook
// ════════════════════════════════════════════════════════════════════════════
export default function useMarketAudio(crops, lang) {
  const [isActive, setIsActive] = useState(false);
  const modeRef    = useRef("ambient"); // "ambient" | "focused"
  const timerRef   = useRef(null);
  const focusTimer = useRef(null);
  const cropsRef   = useRef(crops);
  const langRef    = useRef(lang);
  const focusedRef = useRef(null);

  // Keep refs synced
  useEffect(() => { cropsRef.current = crops; }, [crops]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // ── Build announcement text ─────────────────────────────────────────────
  function buildText(crop, vendorIdx = 0) {
    const l = langRef.current || "en";
    const name = getCropName(crop.name, l);
    const unit = crop.unit || "kg";
    
    // Format the number strictly in the target language so Google TTS reads it natively
    const localPrice = new Intl.NumberFormat(l, { useGrouping: false }).format(crop.price);

    const templates = TEMPLATES[l] || TEMPLATES.en;
    // Pick a random slang template from the array to keep the market dynamic
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    // Add organic marker for vendor 0 (main voice) if organic
    if (vendorIdx === 0 && crop.isOrganic && l === "en") {
      return `Premium organic ${name}! Farm fresh, just ${localPrice} rupees per ${unit}. Limited stock!`;
    }

    return randomTemplate(name, localPrice, unit);
  }

  // ── Announce multiple vendors for one crop ──────────────────────────────
  async function announceAmbient() {
    const crops = cropsRef.current;
    if (!crops || crops.length === 0) return;

    // Pick 3 different crops for a realistic market feel
    const shuffled = [...crops].sort(() => Math.random() - 0.5).slice(0, VENDORS.length);

    // Small chime at start
    chime(523 + Math.random() * 200, 0.06);

    // Speak sequentially instead of all at once to prevent overlapping
    for (let i = 0; i < shuffled.length; i++) {
      if (modeRef.current !== "ambient") break;
      const crop = shuffled[i];
      const vendor = VENDORS[i];
      const text = buildText(crop, i);
      
      await speak(text, langRef.current, { 
        rate: vendor.rate, 
        filterType: vendor.filterType, 
        filterFreq: vendor.filterFreq, 
        volume: vendor.volume 
      });
      
      // Wait a tiny natural pause between vendors
      if (modeRef.current === "ambient") {
        await new Promise(res => setTimeout(res, 600));
      }
    }
  }

  // ── Announce focused crop ───────────────────────────────────────────────
  function announceFocused(crop) {
    if (!crop) return;
    stopTTS();
    chime(660, 0.1); // higher pitched attention chime
    setTimeout(() => {
      if (modeRef.current !== "focused") return;
      const text = buildText(crop, 0);
      // Focused crop gets a clean, slightly amplified voice with no distortion filters
      speak(text, langRef.current, { rate: 1.0, volume: 1.0 });
    }, 400);
  }

  // ── Start ambient loop ──────────────────────────────────────────────────
  function startAmbientLoop() {
    if (timerRef.current) clearInterval(timerRef.current);
    announceAmbient();
    timerRef.current = setInterval(() => {
      if (modeRef.current === "ambient") announceAmbient();
    }, 12000);
  }

  // ── Master toggle ──────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev;
      if (next) {
        getAmbient().play().catch(() => {});
        modeRef.current = "ambient";
        startAmbientLoop();
      } else {
        clearInterval(timerRef.current);
        clearTimeout(focusTimer.current);
        stopTTS();
        getAmbient().pause();
      }
      return next;
    });
  }, []);

  // ── focusCrop: called on mouseenter ────────────────────────────────────
  const focusCrop = useCallback((crop) => {
    if (!isActive) return;
    clearTimeout(focusTimer.current);
    modeRef.current = "focused";
    focusedRef.current = crop;
    stopTTS();
    getAmbient().volume = 0.015; // fade ambient music
    announceFocused(crop);
    // Repeat focused announcement every 8s while hovered
    focusTimer.current = setInterval(() => {
      if (modeRef.current === "focused" && focusedRef.current) {
        announceFocused(focusedRef.current);
      }
    }, 8000);
  }, [isActive]);

  // ── blurCrop: called on mouseleave ─────────────────────────────────────
  const blurCrop = useCallback(() => {
    if (!isActive) return;
    clearInterval(focusTimer.current);
    focusedRef.current = null;
    // Small delay before resuming ambient (feels natural)
    setTimeout(() => {
      if (modeRef.current !== "focused") return; // already changed
      modeRef.current = "ambient";
      stopTTS();
      getAmbient().volume = 0.04;
      startAmbientLoop();
    }, 1500);
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(focusTimer.current);
      stopTTS();
      getAmbient().pause();
    };
  }, []);

  // Re-trigger ambient when language changes
  useEffect(() => {
    if (isActive && modeRef.current === "ambient") {
      stopTTS();
      setTimeout(announceAmbient, 300);
    }
  }, [lang, isActive]);

  return { isActive, toggle, focusCrop, blurCrop };
}
