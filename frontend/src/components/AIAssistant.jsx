import { BASE_URL } from '../api/api';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { useLang } from "../context/LangContext";
import { LANG_MAP } from "../utils/useVoiceInput";
import { playTTS } from "../utils/voiceParser";

export default function AIAssistant() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const [voicePersona, setVoicePersona] = useState({ pitch: 1, rate: 0.9, lang: "en-IN" });

  useEffect(() => {
    // Pick a random male/female persona for this session
    setVoicePersona({
      pitch: Math.random() > 0.5 ? 1.2 : 0.8,
      rate: 0.9,
    });
  }, []);

  const speak = (text, autoListenAfter = false) => {
    try {
      playTTS(text.replace(/[#*`_]/g, ''), lang, { pitch: voicePersona.pitch, rate: voicePersona.rate }).then(() => {
        if (autoListenAfter || text.includes("?")) {
          setTimeout(() => {
            if (!isListening) toggleListen();
          }, 500);
        }
      });
    } catch (e) {
      console.warn("Speech synthesis failed", e);
    }
  };

  // Ambient Noise for assistant
  useEffect(() => {
    let ctx, oscillator, gainNode;
    if (isOpen) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        oscillator = ctx.createOscillator();
        gainNode = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 432; // Calming frequency
        gainNode.gain.value = 0.01; // Very quiet
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
      } catch (e) {}
    }
    return () => {
      if (oscillator) {
        try { oscillator.stop(); ctx.close(); } catch(e){}
      }
    };
  }, [isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message based on role
  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      const LOCALIZED_TIPS = {
        en: {
          welcome: `Hi ${user.name?.split(' ')[0]}! I'm your AI Assistant. `,
          farmerTip: "Daily Tip: Keep your soil moisture balanced during the early growth of rice.",
          farmerPrompt: "Tell me what crop you'd like to list today. (e.g., 'I want to sell 50kg of tomatoes').",
          customerTip: "Nutritional Tip: Fresh tomatoes are rich in lycopene, great for heart health!",
          customerPrompt: "What fresh produce are you looking for today? (e.g., 'Show me fresh organic apples').",
          agentTip: "Delivery Tip: Take the shortest route between Zone A and B to maximize fuel efficiency.",
          agentPrompt: "Ready for your deliveries today?",
          adminTip: "Platform Tip: High trust scores correlate directly with increased sales volume.",
          adminPrompt: "How can I help you manage the platform today?",
        },
        te: {
          welcome: `నమస్కారం ${user.name?.split(' ')[0]}! నేను మీ AI అసిస్టెంట్. `,
          farmerTip: "రోజువారీ సలహా: వరి పెరుగుదలకు నేల తేమను సమతుల్యంగా ఉంచండి.",
          farmerPrompt: "ఈరోజు ఏ పంటను అమ్మాలనుకుంటున్నారు? (ఉదాహరణకు, 'నేను 50కిలోల టమోటాలు అమ్మాలి').",
          customerTip: "పోషకాహార సలహా: తాజా టమోటాల్లో లైకోపీన్ ఉంటుంది, ఇది గుండెకు చాలా మంచిది!",
          customerPrompt: "ఈరోజు మీకు ఏ తాజా కూరగాయలు కావాలి?",
          agentTip: "డెలివరీ సలహా: ఇంధనాన్ని ఆదా చేయడానికి చిన్న మార్గాన్ని ఎంచుకోండి.",
          agentPrompt: "ఈరోజు డెలివరీకి సిద్ధమా?",
          adminTip: "ప్లాట్‌ఫారమ్ సలహా: నమ్మకమైన స్కోర్‌లు పెరిగితే అమ్మకాలు పెరుగుతాయి.",
          adminPrompt: "నేను మీకు ఎలా సహాయపడగలను?",
        },
        hi: {
          welcome: `नमस्ते ${user.name?.split(' ')[0]}! मैं आपका AI सहायक हूँ। `,
          farmerTip: "दैनिक सुझाव: चावल के विकास के दौरान मिट्टी की नमी को संतुलित रखें।",
          farmerPrompt: "आज आप कौन सी फसल बेचना चाहते हैं?",
          customerTip: "पोषण संबंधी सुझाव: ताज़े टमाटर लाइकोपीन से भरपूर होते हैं, जो दिल के लिए बहुत अच्छे हैं!",
          customerPrompt: "आज आप क्या खरीदना चाहते हैं?",
          agentTip: "डिलीवरी टिप: ईंधन बचाने के लिए सबसे छोटा मार्ग चुनें।",
          agentPrompt: "क्या आप आज की डिलीवरी के लिए तैयार हैं?",
          adminTip: "प्लेटफ़ॉर्म टिप: उच्च ट्रस्ट स्कोर सीधे बिक्री की मात्रा को बढ़ाते हैं।",
          adminPrompt: "मैं आज प्लेटफ़ॉर्म को प्रबंधित करने में आपकी कैसे मदद कर सकता हूँ?",
        },
        kn: {
          welcome: `ನಮಸ್ಕಾರ ${user.name?.split(' ')[0]}! ನಾನು ನಿಮ್ಮ AI ಸಹಾಯಕ. `,
          farmerTip: "ದೈನಂದಿನ ಸಲಹೆ: ಭತ್ತದ ಬೆಳೆಯುವಿಕೆಗೆ ಮಣ್ಣಿನ ತೇವಾಂಶವನ್ನು ಸಮತೋಲನದಲ್ಲಿಡಿ.",
          farmerPrompt: "ಇಂದು ಯಾವ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
          customerTip: "ಪೌಷ್ಟಿಕಾಂಶದ ಸಲಹೆ: ತಾಜಾ ಟೊಮೆಟೊಗಳು ಹೃದಯಕ್ಕೆ ತುಂಬಾ ಒಳ್ಳೆಯದು!",
          customerPrompt: "ಇಂದು ನಿಮಗೆ ಯಾವ ತಾಜಾ ತರಕಾರಿಗಳು ಬೇಕು?",
          agentTip: "ವಿತರಣಾ ಸಲಹೆ: ಇಂಧನ ಉಳಿಸಲು ಚಿಕ್ಕ ಮಾರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
          agentPrompt: "ವಿತರಣೆಗೆ ಸಿದ್ಧರಿದ್ದೀರಾ?",
          adminTip: "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಸಲಹೆ: ಹೆಚ್ಚಿನ ನಂಬಿಕೆಯ ಅಂಕಗಳು ಮಾರಾಟವನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ.",
          adminPrompt: "ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        },
        ta: {
          welcome: `வணக்கம் ${user.name?.split(' ')[0]}! நான் உங்கள் AI உதவியாளர். `,
          farmerTip: "தினசரி குறிப்பு: நெல் வளரும் போது மண்ணின் ஈரப்பதத்தை சீராக வைக்கவும்.",
          farmerPrompt: "இன்று நீங்கள் எந்த பயிரை விற்க விரும்புகிறீர்கள்?",
          customerTip: "ஊட்டச்சத்து குறிப்பு: புதிய தக்காளிகள் இதயத்திற்கு மிகவும் நல்லது!",
          customerPrompt: "இன்று உங்களுக்கு என்ன புதிய காய்கறிகள் வேண்டும்?",
          agentTip: "விநியோக குறிப்பு: எரிபொருளை சேமிக்க குறுகிய வழியை தேர்ந்தெடுக்கவும்.",
          agentPrompt: "விநியோகத்திற்கு தயாரா?",
          adminTip: "மேம்பாட்டு குறிப்பு: அதிக நம்பிக்கை புள்ளிகள் விற்பனையை அதிகரிக்கும்.",
          adminPrompt: "நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        }
      };

      const fallbackLang = LOCALIZED_TIPS[lang] ? lang : "en";
      const l10n = LOCALIZED_TIPS[fallbackLang];

      let welcomeMsg = l10n.welcome;
      let tip = "";

      if (user.role === "farmer") {
        tip = l10n.farmerTip;
        welcomeMsg += l10n.farmerPrompt;
      } else if (user.role === "agent") {
        tip = l10n.agentTip;
        welcomeMsg += l10n.agentPrompt;
      } else if (user.role === "admin") {
        tip = l10n.adminTip;
        welcomeMsg += l10n.adminPrompt;
      } else {
        tip = l10n.customerTip;
        welcomeMsg += l10n.customerPrompt;
      }

      setMessages([
        { role: "assistant", text: tip, logId: "tip" },
        { role: "assistant", text: welcomeMsg, logId: null }
      ]);
      
      speak(`${tip} . ${welcomeMsg}`);
    }
  }, [isOpen, user, location.pathname, messages.length]);

  if (!user) return null; // Only show if logged in

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t("unsupportedBrowser") || "Speech recognition is not supported in this browser.");
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Listen continuously
    recognition.interimResults = true;
    
    // Map lang context to speech locale
    recognition.lang = LANG_MAP[lang] || "en-IN";

    recognition.onstart = () => {
      // Start 15-second silence timer
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      resetSilenceTimer(); // reset silence timeout since user is speaking
      let current = "";
      let finalResult = "";
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalResult += event.results[i][0].transcript;
        } else {
          current += event.results[i][0].transcript;
        }
      }
      
      setTranscript(prev => finalResult ? finalResult : current);
      
      // If the user finished a sentence, process it immediately
      if (finalResult.trim()) {
        clearTimeout(silenceTimerRef.current);
        recognition.stop();
        handleProcessText(finalResult.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        const errMsg = t("micError") || "🎤 Microphone access was denied.\n\nTo enable it:\n1. Click the 🔒 lock icon in the browser address bar\n2. Set Microphone to 'Allow'\n3. Reload the page";
        alert(errMsg);
      }
      if (event.error !== 'no-speech') {
        setIsListening(false);
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      clearTimeout(silenceTimerRef.current);
      // Fallback process if stopped and transcript exists
      setTranscript(t => {
        if (t.trim()) handleProcessText(t.trim());
        return t;
      });
    };

    return recognition;
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      // Silence detected! 
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      
      // Find the last assistant message and repeat it
      setMessages(prev => {
        const lastMsg = [...prev].reverse().find(m => m.role === 'assistant');
        if (lastMsg) {
          // Speak it again and restart listening automatically
          const repeatPrefix = {
            en: "I didn't catch that. ",
            te: "నాకు అర్థం కాలేదు. ",
            hi: "मुझे समझ नहीं आया। ",
            kn: "ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ",
            ta: "எனக்கு புரியவில்லை. "
          }[lang] || "I didn't catch that. ";
          speak(repeatPrefix + lastMsg.text, true);
        }
        return prev;
      });
    }, 12000); // 12 seconds of silence triggers a repeat
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      }
    }
  };

  const handleProcessText = async (textToProcess) => {
    if (!textToProcess) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", text: textToProcess }]);
    setTranscript("");
    setLoading(true);

    // Determine context based on URL
    let contextStr = "general";
    if (location.pathname.includes("/farmer")) contextStr = "omnipresent_farmer";
    else if (location.pathname.includes("/marketplace")) contextStr = "marketplace_search";

    try {
      if (contextStr !== "general") {
        const parseRes = await fetch(`${BASE_URL}/api/ai/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToProcess, context: contextStr })
        });
        const parseData = await parseRes.json();
        
        if (parseData.data) {
          const { intent, targetTab, aiAnswer, reply } = parseData.data;

          // 1. Omnipresent: Handle Navigation
          if (intent === "navigate_tab" && targetTab) {
            window.dispatchEvent(new CustomEvent("ai_navigate", { detail: { targetTab } }));
            
            const navReplies = {
              en: `Taking you to the ${targetTab} tab.`,
              te: `మిమ్మల్ని ${targetTab} విభాగానికి తీసుకువెళుతున్నాను.`,
              hi: `आपको ${targetTab} टैब पर ले जा रहा हूँ।`,
              kn: `ನಿಮ್ಮನ್ನು ${targetTab} ಟ್ಯಾಬ್‌ಗೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ.`,
              ta: `உங்களை ${targetTab} பகுதிக்கு அழைத்துச் செல்கிறேன்.`
            };
            let navReply = navReplies[lang] || navReplies.en;
            
            setMessages(prev => [...prev, { role: "assistant", text: navReply, logId: null }]);
            speak(navReply);
            setLoading(false);
            return;
          }
          
          // 2. Omnipresent: Handle Add Crop (Start Wizard)
          if (intent === "add_crop") {
            window.dispatchEvent(new CustomEvent("ai_start_wizard"));
            
            const startReplies = {
              en: "Sure! Let me start the crop listing wizard for you. What crop do you want to list?",
              te: "తప్పకుండా! మీ కోసం పంట జాబితా విధానాన్ని ప్రారంభిస్తున్నాను. మీరు ఏ పంటను అమ్మాలనుకుంటున్నారు?",
              hi: "ज़रूर! मैं आपके लिए फसल लिस्टिंग शुरू कर रहा हूँ। आप कौन सी फसल बेचना चाहते हैं?",
              kn: "ಖಂಡಿತ! ನಿಮಗಾಗಿ ಬೆಳೆ ಪಟ್ಟಿಯನ್ನು ಪ್ರಾರಂಭಿಸುತ್ತಿದ್ದೇನೆ. ನೀವು ಯಾವ ಬೆಳೆಯನ್ನು ಮಾರಾಟ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
              ta: "நிச்சயமாக! உங்களுக்கான பயிர் பட்டியலை தொடங்குகிறேன். நீங்கள் என்ன பயிரை விற்க விரும்புகிறீர்கள்?"
            };
            let startReply = startReplies[lang] || startReplies.en;
            
            setMessages(prev => [...prev, { role: "assistant", text: startReply, logId: null }]);
            speak(startReply);
            // Auto listen immediately for the crop name
            setTimeout(() => { if (!isListening) toggleListen(); }, 3500);
            setLoading(false);
            return;
          }

          // 3. Omnipresent: Handle Farming Doubts
          if (intent === "farming_doubt" && aiAnswer) {
            setMessages(prev => [...prev, { role: "assistant", text: aiAnswer, logId: null }]);
            speak(aiAnswer);
            setLoading(false);
            return;
          }

          // Legacy / Fallback Conversational replies
          if (reply) {
            setMessages(prev => [...prev, { role: "assistant", text: reply, logId: null }]);
            speak(reply);
            if (reply.includes("?")) {
              setTimeout(() => { if (!isListening) toggleListen(); }, 2500);
            }
            setLoading(false);
            return;
          }
          
          // Legacy Marketplace autofill
          if (contextStr === "marketplace_search") {
            if (parseData.data.intent === "place_order" && parseData.data.searchQuery) {
              window.dispatchEvent(new CustomEvent("ai_place_order", { 
                detail: { searchQuery: parseData.data.searchQuery } 
              }));
              
              const orderReplies = {
                en: `Opening the order screen for ${parseData.data.searchQuery}.`,
                te: `${parseData.data.searchQuery} కోసం ఆర్డర్ స్క్రీన్‌ను తెరుస్తున్నాను.`,
                hi: `${parseData.data.searchQuery} के लिए ऑर्डर स्क्रीन खोल रहा हूँ।`,
                kn: `${parseData.data.searchQuery} ಗಾಗಿ ಆರ್ಡರ್ ಪರದೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,
                ta: `${parseData.data.searchQuery} க்கான ஆர்டர் திரையை திறக்கிறேன்.`
              };
              let oReply = orderReplies[lang] || orderReplies.en;
              
              setMessages(prev => [...prev, { role: "assistant", text: oReply, logId: null }]);
              speak(oReply);
              setLoading(false);
              return;
            } else {
              window.dispatchEvent(new CustomEvent("ai_autofill", { 
                detail: { context: contextStr, parsedData: parseData.data } 
              }));
              let mReply = `Searching the marketplace for: ${parseData.data.searchQuery || parseData.data.category || 'crops'}`;
              setMessages(prev => [...prev, { role: "assistant", text: mReply, logId: null }]);
              speak(mReply);
              setLoading(false);
              return;
            }
          }
        }
      }

      // If no actionable intent or it's a general question, use the RAG Chat endpoint
      const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToProcess, role: user.role, userId: user._id, lang })
      });
      const chatData = await chatRes.json();
      
      if (chatData.response) {
        setMessages(prev => [...prev, { role: "assistant", text: chatData.response, logId: chatData.logId }]);
        speak(chatData.response);
      } else {
        const errorMsg = "I couldn't quite understand that. Could you try rephrasing?";
        setMessages(prev => [...prev, { role: "assistant", text: errorMsg }]);
        speak(errorMsg);
      }
    } catch (error) {
      console.error(error);
      const errMsg = "Oops, my connection to the AI engine failed. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", text: errMsg }]);
      speak(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (logId, score) => {
    if (!logId) return;
    try {
      await fetch(`${BASE_URL}/api/ai/rate/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
      });
      // Visually update the message to show it was rated
      setMessages(prev => prev.map(m => m.logId === logId ? { ...m, rated: score } : m));
    } catch (e) {
      console.error("Failed to rate AI");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && transcript.trim() && !isListening) {
      handleProcessText(transcript.trim());
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed", bottom: "30px", right: "30px", zIndex: 9999,
          width: "60px", height: "60px", borderRadius: "50%",
          background: "linear-gradient(135deg, var(--green-mid), var(--green-deep))",
          color: "white", border: "none", boxShadow: "0 10px 25px rgba(22, 163, 74, 0.4)",
          display: isOpen ? "none" : "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer"
        }}
      >
        <Sparkles size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: "fixed", bottom: "30px", right: "30px", zIndex: 10000,
              width: "350px", height: "500px", background: "white",
              borderRadius: "24px", boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              border: "1px solid rgba(22, 163, 74, 0.1)"
            }}
          >
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, var(--green-mid), var(--green-deep))", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} />
                <span style={{ fontWeight: 700, fontFamily: "Outfit, sans-serif", fontSize: "1.1rem" }}>Rythu AI Assistant</span>
              </div>
              <button onClick={() => { window.speechSynthesis.cancel(); setIsOpen(false); }} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "#f8fafc" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "0.75rem 1rem", borderRadius: "16px",
                    background: msg.role === "user" ? "var(--green-mid)" : "white",
                    color: msg.role === "user" ? "white" : "var(--text-dark)",
                    boxShadow: msg.role === "user" ? "none" : "0 2px 10px rgba(0,0,0,0.03)",
                    border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                    borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                    borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "16px",
                    fontSize: "0.9rem", lineHeight: 1.5,
                    display: "flex", flexDirection: "column", gap: "0.5rem"
                  }}>
                    <span>{msg.text}</span>
                    {msg.role === "assistant" && msg.logId && !msg.rated && (
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Helpful?</span>
                        <button onClick={() => handleRate(msg.logId, 5)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>👍</button>
                        <button onClick={() => handleRate(msg.logId, 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>👎</button>
                      </div>
                    )}
                    {msg.role === "assistant" && msg.rated && (
                      <span style={{ fontSize: "0.75rem", color: "var(--green-light)", marginTop: "0.25rem" }}>Thanks for the feedback!</span>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "white", padding: "0.75rem 1rem", borderRadius: "16px", borderBottomLeftRadius: "4px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--green-mid)" }}>
                    <Loader2 size={16} className="lucide-spin" style={{ animation: "spin 2s linear infinite" }} /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: "1rem", background: "white", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button 
                onClick={toggleListen}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                  background: isListening ? "#fee2e2" : "#f1f5f9",
                  color: isListening ? "#ef4444" : "var(--text-mid)",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <input 
                type="text" 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Type or speak..."}
                style={{
                  flex: 1, padding: "0.6rem 1rem", borderRadius: "100px",
                  border: "1px solid #e2e8f0", outline: "none", fontSize: "0.9rem",
                  background: isListening ? "#f8fafc" : "white"
                }}
                disabled={isListening}
              />
              
              <button 
                onClick={() => handleProcessText(transcript.trim())}
                disabled={!transcript.trim() || isListening}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                  background: transcript.trim() && !isListening ? "var(--green-mid)" : "#f1f5f9",
                  color: transcript.trim() && !isListening ? "white" : "#cbd5e1",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <Send size={18} />
              </button>
            </div>
            
            {/* Spinning keyframes added inline for Loader2 */}
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

