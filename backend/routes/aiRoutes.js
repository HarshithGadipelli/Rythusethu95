import express from "express";
import { parseIntent } from "../controllers/aiController.js";
import AILog from "../models/AILog.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Delivery from "../models/Delivery.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as googleTTS from "google-tts-api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.post("/parse", parseIntent);

// --- Free Google Translate API Bridge ---
const translateToEnglish = async (text) => {
  try {
    const hasNativeChars = /[^\x00-\x7F]/.test(text);
    if (!hasNativeChars) return text;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const json = await response.json();
    let translatedText = "";
    if (json && json[0]) {
      json[0].forEach(chunk => { if (chunk[0]) translatedText += chunk[0]; });
    }
    return translatedText || text;
  } catch (err) { return text; }
};

const translateFromEnglish = async (text, targetLang) => {
  try {
    if (!targetLang || targetLang === "en") return text;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const json = await response.json();
    let translatedText = "";
    if (json && json[0]) {
      json[0].forEach(chunk => { if (chunk[0]) translatedText += chunk[0]; });
    }
    return translatedText || text;
  } catch (err) { return text; }
};

// Advanced AI Chat with RAG Context
router.post("/chat", async (req, res) => {
  try {
    const { prompt, role, userId } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    // 1. RAG System: Fetch past 5-star responses for similar roles as context
    const pastContexts = await AILog.find({ role, satisfactionScore: 5 })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("prompt response");

    let contextString = "";
    if (pastContexts.length > 0) {
      contextString = "Here are some highly rated examples of past interactions you should learn from:\n";
      pastContexts.forEach(c => {
        contextString += `User: ${c.prompt}\nYou: ${c.response}\n\n`;
      });
    }

    // 2. Contextual Memory: Fetch the last 3 chats of this specific user
    let userHistory = [];
    if (userId && userId.length === 24) {
      userHistory = await AILog.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("prompt response");
    }
    
    let memoryString = "";
    if (userHistory.length > 0) {
      memoryString = "Here is the recent conversation history with this user:\n";
      userHistory.reverse().forEach(h => {
        memoryString += `User: ${h.prompt}\nYou: ${h.response}\n\n`;
      });
    }

    // 3. System-Wide Context: Fetch real-time DB stats to inform the AI
    const Crop = (await import("../models/Crop.js")).default;
    const Order = (await import("../models/Order.js")).default;
    
    let systemContextString = "";
    try {
      const activeCrops = await Crop.find().select("name price quantity isOrganic").limit(10);
      const today = new Date();
      today.setHours(0,0,0,0);
      const ordersToday = await Order.countDocuments({ createdAt: { $gte: today } });
      
      systemContextString = `
      Current Marketplace Data Context:
      - Orders placed today: ${ordersToday}
      - Top Available Crops: ${activeCrops.map(c => `${c.name} (₹${c.price}, ${c.quantity} left${c.isOrganic ? ', Organic' : ''})`).join(" | ")}
      - Provide real-time dynamic answers based on this context. Keep answers brief unless details are requested.
      `;
    } catch (err) {
      console.warn("Failed to fetch system context for AI", err);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponseText = "";

    const handleOfflineHeuristics = async (originalText, lang) => {
      const englishText = await translateToEnglish(originalText);
      const lower = englishText.toLowerCase();
      
      let reply = "";
      
      if (lower.includes("harvest") && lower.includes("potato")) {
        reply = "Potatoes are generally ready to harvest 90-120 days after planting, when the foliage begins to die back and turn yellow. Stop watering them 2 weeks before harvest!";
      } else if (lower.includes("harvest") && lower.includes("tomato")) {
        reply = "Tomatoes are ready to pick when they are firm and fully colored. Harvesting regularly encourages the plant to produce more fruit.";
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("sell")) {
        reply = "Current market trends show strong demand for fresh organic vegetables. Tomatoes are currently selling at ₹30-40/kg in nearby markets. Would you like to add a crop to the marketplace?";
      } else if (lower.includes("pesticide") || lower.includes("disease") || lower.includes("pest") || lower.includes("white")) {
        reply = "For common pests like whiteflies or aphids, I highly recommend organic Neem oil spray (10ml per liter of water) applied early morning. Always use organic methods to keep your 'Organic' badge!";
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        reply = "Namaskaram! 🙏 I am your Rythu Sethu Assistant. I am running in local offline mode, but I can still answer basic questions about crops, prices, pests, and the marketplace!";
      } else if (lower.includes("weather") || lower.includes("rain")) {
        reply = "Based on local agricultural patterns, expect mild showers this week. Ensure your harvested crops are covered!";
      } else {
        reply = `I heard: '${englishText}'. I am running in offline mode without a cloud API key. I suggest checking the marketplace for live prices or clicking the 'Start Guided Assistant' button to add a crop!`;
      }
      
      if (lang && lang !== "en") {
        return await translateFromEnglish(reply, lang);
      }
      return reply;
    };

    if (apiKey && apiKey.trim() !== "" && apiKey.startsWith("AIzaSy")) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const finalPrompt = `
      You are the Rythu Sethu 4.0 Advanced AI Assistant. You are deeply integrated into the system and know real-time data.
      You help farmers optimize crop yields, customers find the best prices, and agents optimize deliveries.
      
      User Role: ${role || "User"}
      
      ${systemContextString}
      ${contextString}
      ${memoryString}
      
      User Query: "${prompt}"
      
      Provide a helpful, precise, and friendly answer. Do not use markdown code blocks unless providing code.
      `;

      try {
        const result = await model.generateContent(finalPrompt);
        aiResponseText = result.response.text();
      } catch (geminiError) {
        console.warn("Gemini API failed:", geminiError.message);
        aiResponseText = await handleOfflineHeuristics(prompt, req.body.lang);
      }
    } else {
      // Complete offline fallback execution!
      aiResponseText = await handleOfflineHeuristics(prompt, req.body.lang);
      
      const log = new AILog({ user: userId, role: role || "guest", context: "offline", prompt, response: aiResponseText });
      await log.save();
      
      return res.json({ response: aiResponseText, logId: log._id });
    }

    // Log the interaction
    const logEntry = await AILog.create({
      ...(userId && userId.length === 24 ? { user: userId } : {}),
      role,
      prompt,
      response: aiResponseText,
      contextUsed: pastContexts.map(c => c._id)
    });

    res.json({ response: aiResponseText, logId: logEntry._id });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Rate an AI interaction (Self-Learning Loop)
router.put("/rate/:logId", async (req, res) => {
  try {
    const { score, feedback } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: "Invalid score" });

    const log = await AILog.findByIdAndUpdate(req.params.logId, {
      satisfactionScore: score,
      feedback
    }, { new: true });

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Delivery Photos via Gemini Vision
router.post("/verify-delivery", async (req, res) => {
  try {
    const { deliveryId } = req.body;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) return res.status(404).json({ error: "Delivery not found" });
    if (!delivery.pickupPhoto || !delivery.deliveryPhoto) {
      return res.status(400).json({ error: "Both pickup and delivery photos are required for verification" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Gemini API Key is missing. Cannot perform AI vision check." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Function to read file and convert to generative AI part
    function fileToGenerativePart(filePath, mimeType) {
      return {
        inlineData: {
          data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
          mimeType
        },
      };
    }

    const pickupPath = path.join(__dirname, "..", "public", delivery.pickupPhoto);
    const deliveryPath = path.join(__dirname, "..", "public", delivery.deliveryPhoto);

    if (!fs.existsSync(pickupPath) || !fs.existsSync(deliveryPath)) {
      return res.status(404).json({ error: "Image files not found on server" });
    }

    // Determine mime types based on extension
    const getMimeType = (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.png') return 'image/png';
      if (ext === '.webp') return 'image/webp';
      if (ext === '.heic') return 'image/heic';
      return 'image/jpeg';
    };

    const imageParts = [
      fileToGenerativePart(pickupPath, getMimeType(pickupPath)),
      fileToGenerativePart(deliveryPath, getMimeType(deliveryPath)),
    ];

    const prompt = `
    You are an AI authenticity verification system for an agricultural supply chain. 
    I am providing you with two images: 
    Image 1: The product picked up by the delivery agent at the farm.
    Image 2: The product about to be delivered to the market/customer by the agent.
    
    Task: Carefully examine both images. Are they showing the exact same agricultural product (same type, roughly same quantity, same packaging if visible, same quality)? Is there any sign of tampering or swapping (e.g. they picked up premium organic tomatoes but are delivering cheap rotten tomatoes, or different crop entirely)?
    
    Output your answer strictly in JSON format without any markdown wrappers or backticks. The JSON must have:
    {
      "isMatch": true or false,
      "reasoning": "A short explanation of your decision"
    }
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim().replace(/^```json/i, "").replace(/```$/, "").trim();
    
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      aiAnalysis = { isMatch: false, reasoning: "AI analysis failed to output valid JSON format." };
    }

    delivery.aiVerificationResult = aiAnalysis.isMatch ? "match" : "mismatch";
    delivery.aiVerificationNotes = aiAnalysis.reasoning;
    await delivery.save();

    res.json({
      success: true,
      result: delivery.aiVerificationResult,
      notes: delivery.aiVerificationNotes
    });

  } catch (error) {
    console.error("AI Delivery Verification Error:", error);
    res.status(500).json({ error: "Failed to process AI image verification." });
  }
});

// AI Recipe Suggestions
router.post("/recipe-suggest", async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: "No ingredients provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Gemini API Key is missing. Offline mode active." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert culinary AI Chef. 
      The following fresh ingredients are currently available in our marketplace: ${ingredients.join(", ")}.
      Suggest 2 quick, delicious recipes that prominently feature a combination of some of these available ingredients.
      Keep the formatting clean and easy to read.
    `;

    const result = await model.generateContent(prompt);
    res.json({ recipe: result.response.text() });
  } catch (error) {
    console.error("AI Recipe Suggest Error:", error);
    res.status(500).json({ error: "Failed to generate recipe suggestions." });
  }
});

// AI Pest Detection
router.post("/pest-detect", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Gemini API Key is missing. Offline mode active." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Ensure the base64 string is correctly formatted
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
    You are an expert agricultural botanist and plant pathologist. 
    Analyze this image of a crop/leaf.
    
    1. Identify if there is a pest, disease, or nutrient deficiency.
    2. Determine the severity (Low, Moderate, High, Severe).
    3. Provide actionable, organic, and accessible remedies that a local farmer can apply immediately.
    
    Respond strictly in JSON format without markdown wrapping. Structure:
    {
      "disease": "Name of the issue or 'Healthy'",
      "severity": "Severity Level",
      "remedy": "Detailed organic treatment instructions"
    }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const responseText = result.response.text().trim().replace(/^```json/i, "").replace(/```$/, "").trim();
    const aiAnalysis = JSON.parse(responseText);

    res.json(aiAnalysis);
  } catch (error) {
    console.error("AI Pest Detect Error:", error);
    res.status(500).json({ error: "Failed to analyze image." });
  }
});

// Parse Registration Voice Input
router.post("/parse-registration", async (req, res) => {
  try {
    const { transcript, lang } = req.body;
    if (!transcript) return res.status(400).json({ error: "No transcript provided" });

    const apiKey = process.env.GEMINI_API_KEY;
    
    // OFFLINE REGISTRATION FALLBACK
    if (!apiKey || apiKey.trim() === "" || !apiKey.startsWith("AIzaSy")) {
      const englishText = await translateToEnglish(transcript);
      const lower = englishText.toLowerCase();
      
      let parsedData = {
        name: null,
        phone: null,
        farmLocation: null,
        farmSize: null,
        experience: null,
        soilType: null
      };

      // Extract Name (assuming "my name is X" or "I am X")
      const nameMatch = lower.match(/(?:my name is|i am|this is)\s+([a-zA-Z\s]+?)(?:\s+(?:my|and|from|phone|number|i have)|$)/i);
      if (nameMatch) parsedData.name = nameMatch[1].trim();

      // Extract Phone (any 10 digit sequence)
      const phoneMatch = englishText.replace(/\s+/g, '').match(/(\d{10})/);
      if (phoneMatch) parsedData.phone = phoneMatch[1];

      // Extract Location (e.g. "from Hyderabad", "in Warangal")
      const locMatch = lower.match(/(?:from|in|at)\s+([a-zA-Z]+)/i);
      if (locMatch && !["my", "the"].includes(locMatch[1])) parsedData.farmLocation = locMatch[1].trim();

      // Extract Farm Size (e.g. "5 acres", "10 hecatres")
      const sizeMatch = lower.match(/(\d+)\s*(acres|acre|hectares|hectare)/i);
      if (sizeMatch) parsedData.farmSize = parseInt(sizeMatch[1]);

      return res.json(parsedData);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an AI assistant helping a farmer register on an agricultural platform.
    The user spoke the following in ${lang || "their local language"}:
    "${transcript}"
    
    Extract the following details if present:
    - name (string)
    - phone (string, 10 digits)
    - farmLocation (string)
    - farmSize (number in acres)
    - experience (number in years)
    - soilType (string: loamy, clay, sandy, silt, peat, chalk, other)
    
    Return EXACTLY and ONLY valid JSON matching these keys. Do not include markdown wrappers.
    If a field is not mentioned, leave it null.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/^```json/i, "").replace(/```$/, "").trim();
    
    const parsedData = JSON.parse(responseText);
    res.json(parsedData);
  } catch (error) {
    console.error("AI Parse Registration Error:", error);
    res.status(500).json({ error: "Failed to parse registration audio." });
  }
});

// AI Crop Quality Analysis (Vision)
router.post("/analyze-quality", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Gemini API Key is missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
    You are an expert agricultural AI quality inspector.
    Analyze this image of a harvested crop.
    Determine its quality grade as "A", "B", or "C".
    - A: Excellent clarity, highly fresh, fully matured, no blemishes.
    - B: Good quality, minor cosmetic imperfections, acceptable freshness.
    - C: Standard quality, visible defects or aging.
    
    Provide a short explanation of your decision.
    
    Respond strictly in JSON format without markdown wrapping. Structure:
    {
      "grade": "A or B or C",
      "suggestion": "Detailed explanation of the grade and quality"
    }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const responseText = result.response.text().trim().replace(/^```json/i, "").replace(/```$/, "").trim();
    const aiAnalysis = JSON.parse(responseText);

    res.json(aiAnalysis);
  } catch (error) {
    console.error("AI Quality Analyze Error:", error);
    res.status(500).json({ error: "Failed to analyze crop quality." });
  }
});

// --- Advanced STT & TTS Integrations ---

// Multer config for in-memory audio storage
const upload = multer({ storage: multer.memoryStorage() });

// 1. Text-To-Speech (TTS) using google-tts-api (Bypasses browser limits/cors issues)
router.post("/tts", async (req, res) => {
  try {
    const { text, lang = "en" } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    // google-tts-api only accepts base language codes (e.g. "en", "te", "hi")
    // NOT locale codes like "en-IN", "te-IN" etc.
    const safeLang = lang.split("-")[0] || "en";

    // Use google-tts-api to fetch base64 chunks
    // This allows limitless speech length and extreme cross-browser compatibility
    const base64Audio = await googleTTS.getAudioBase64(text, {
      lang: safeLang,
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    res.json({ audioContent: base64Audio });
  } catch (err) {
    console.error("TTS Error:", err);

    // Fallback: try with just "en" if the original language failed
    try {
      const base64Audio = await googleTTS.getAudioBase64(req.body.text, {
        lang: "en",
        slow: false,
        host: "https://translate.google.com",
        timeout: 10000,
      });
      return res.json({ audioContent: base64Audio });
    } catch (fallbackErr) {
      console.error("TTS Fallback also failed:", fallbackErr);
    }

    res.status(500).json({ error: "Failed to generate TTS" });
  }
});

// 2. Speech-To-Text (STT) using Gemini Audio Understanding (Super accurate)
router.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file provided" });

    // Ensure we have Gemini configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "No Gemini API Key" });

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash as it inherently supports audio parsing perfectly
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype || "audio/webm",
      },
    };

    const prompt = "Please transcribe this audio exactly. Do not add any extra commentary. Just transcribe the speech in its original language.";

    const result = await model.generateContent([prompt, audioPart]);
    const transcription = result.response.text().trim();

    res.json({ transcript: transcription });
  } catch (err) {
    console.error("STT Error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

export default router;
