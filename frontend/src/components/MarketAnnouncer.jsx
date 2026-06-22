// MarketAnnouncer — Plays realistic human-like marketplace voice announcements
// Uses Web Speech Synthesis with gender-toggling and natural Indian voices.

import { useEffect, useRef, useState } from "react";
import { useLang } from "../context/LangContext";
import { playTTS, stopTTS } from "../utils/voiceParser";

const MARKET_ANNOUNCEMENTS = {
  en: [
    { text: "Tomatoes, fresh tomatoes! Only twenty rupees a kilo! Come on over!", gender: "female" },
    { text: "Onions and potatoes straight from the farm! Brother, look here!", gender: "male" },
    { text: "Fresh green vegetables! Very cheap! Coriander, mint, take them all!", gender: "female" },
    { text: "Sweet mangoes, straight from the tree! Madam, come buy fresh!", gender: "male" },
  ],
  te: [
    { text: "టమాటాలు, తాజా టమాటాలు! పది రూపాయలకు కిలో! రండి రండి!", gender: "female" },
    { text: "తోట నుండి నేరుగా తెచ్చిన ఉల్లిపాయలు, బంగాళదుంపలు! అన్నగారు ఇటు చూడండి!", gender: "male" },
    { text: "తాజా ఆకుకూరలు! చౌక చౌక! కొత్తిమీర, పుదీనా తీసుకోండి!", gender: "female" },
    { text: "తీయనైన మామిడిపండ్లు! చెట్టు నుండి కోసినవి! అమ్మగారు ఇటు రండి!", gender: "male" },
  ],
  hi: [
    { text: "टमाटर ले लो, ताजे टमाटर! बीस रुपये किलो! आ जाओ भाई!", gender: "female" },
    { text: "खेत से सीधे ताज़े प्याज़ और आलू! बाबूजी यहाँ देखिये!", gender: "male" },
    { text: "ताज़ी हरी सब्ज़ियाँ! एकदम सस्ती! धनिया, पुदीना ले लो!", gender: "female" },
    { text: "मीठे आम, सीधे पेड़ से! बहनजी यहाँ आइये!", gender: "male" },
  ],
  kn: [
    { text: "ಟೊಮೇಟೊ, ತಾಜಾ ಟೊಮೇಟೊ! ಕೆಜಿಗೆ ಹತ್ತು ರೂಪಾಯಿ! ಬನ್ನಿ ಬನ್ನಿ!", gender: "female" },
    { text: "ಹೊಲದಿಂದ ನೇರವಾಗಿ ತಂದ ಈರುಳ್ಳಿ, ಆಲೂಗಡ್ಡೆ! ಅಣ್ಣಾ ಇಲ್ಲಿ ನೋಡಿ!", gender: "male" },
    { text: "ತಾಜಾ ಸೊಪ್ಪುಗಳು! ಅಗ್ಗ ಅಗ್ಗ! ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು, ಪುದೀನ ತೆಗೆದುಕೊಳ್ಳಿ!", gender: "female" },
    { text: "ಸಿಹಿ ಮಾವಿನಹಣ್ಣುಗಳು, ಮರದಿಂದ ತಂದವು! ಅಮ್ಮ ಇಲ್ಲಿ ಬನ್ನಿ!", gender: "male" },
  ],
  ta: [
    { text: "தக்காளி, புதிய தக்காளி! பத்து ரூபாய்க்கு ஒரு கிலோ! வாங்க வாங்க!", gender: "female" },
    { text: "தோட்டத்திலிருந்து நேரடியாக கொண்டுவரப்பட்ட வெங்காயம், உருளைக்கிழங்கு! அண்ணா இங்கே பாருங்கள்!", gender: "male" },
    { text: "புதிய கீரைகள்! மலிவான மலிவான! கொத்தமல்லி, புதினா எடுத்துக்கொள்ளுங்கள்!", gender: "female" },
    { text: "இனிமையான மாம்பழங்கள், மரத்திலிருந்து பறிக்கப்பட்டவை! அம்மா இங்கே வாங்க!", gender: "male" },
  ],
};

function speakAnnouncement(text, lang, preferGender) {
  // Simulate energetic hawker shouts with pitch and volume variations!
  // Female vendors: higher pitch (faster playback rate with no pitch correction)
  // Male vendors: lower pitch (slower playback rate)
  
  const pitch = preferGender === "female" ? 1.25 : 0.85;
  const volume = Math.random() * 0.5 + 0.5; // Simulate spatial distance (some vendors near, some far)
  
  return playTTS(text, lang, { pitch, volume });
}

export default function MarketAnnouncer() {
  const { lang } = useLang();
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const handleToggle = () => setIsActive(prev => !prev);
    window.addEventListener("market_announcer_toggle", handleToggle);
    return () => window.removeEventListener("market_announcer_toggle", handleToggle);
  }, []);

  useEffect(() => {
    // Notify Navbar about state
    window.dispatchEvent(new CustomEvent("market_audio_state", { detail: { isActive } }));
    
    if (isActive) {
      // Only play announcements in the user's selected language
      const allAnnouncements = [];
      const activeLang = MARKET_ANNOUNCEMENTS[lang] ? lang : "en";
      
      MARKET_ANNOUNCEMENTS[activeLang].forEach(ann => {
        allAnnouncements.push({ ...ann, langCode: activeLang });
      });
      
      // Shuffle the announcements to mix languages naturally
      for (let i = allAnnouncements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allAnnouncements[i], allAnnouncements[j]] = [allAnnouncements[j], allAnnouncements[i]];
      }
      
      let timeoutId = null;
      
      const playNext = async () => {
        if (allAnnouncements.length === 0 || !isActive) return;
        
        let spoken = false;
        let attempts = 0;
        
        while (!spoken && attempts < allAnnouncements.length) {
          const ann = allAnnouncements[indexRef.current % allAnnouncements.length];
          spoken = await speakAnnouncement(ann.text, ann.langCode, ann.gender);
          indexRef.current++;
          attempts++;
        }
        
        // Schedule next play with random interval (8 to 22 seconds) for organic realism
        if (isActive) {
          const nextInterval = Math.floor(Math.random() * 14000) + 8000;
          timeoutId = setTimeout(playNext, nextInterval);
        }
      };
      
      playNext(); // Play immediately
      
      // Dynamic Spatial Audio: Change voices when user scrolls (simulating walking past stalls)
      let lastScrollY = window.scrollY;
      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        // If scrolled more than 500px, simulate walking past a new vendor
        if (Math.abs(currentScrollY - lastScrollY) > 500) {
          lastScrollY = currentScrollY;
          stopTTS(); // Stop current vendor
          if (timeoutId) clearTimeout(timeoutId);
          playNext(); // Start next vendor
        }
      };
      
      window.addEventListener("scroll", handleScroll, { passive: true });
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener("scroll", handleScroll);
        stopTTS();
      };
      
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current); // fallback
      stopTTS();
    }
  }, [isActive, lang]);

  return null; // This is a headless audio component
}
