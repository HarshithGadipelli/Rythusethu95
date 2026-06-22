import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";
import { suggestAdvancedCrop } from "../services/cropSuggestionService.js";
import { predictAdvancedDemand } from "../services/demandPredictionService.js";
import { getNutritionAnalysis } from "../services/nutritionAnalysisService.js";
import { getDistance, optimizeDeliveryRoute } from "../services/deliveryRouteService.js";
import { getGeminiCropSuggestion, getGeminiFarmerTips } from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ML_MODELS_PATH = path.join(__dirname, "../../ml_models");

const runPythonScript = (scriptName, args) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [path.join(ML_MODELS_PATH, scriptName), ...args]);
    
    let dataString = "";
    pythonProcess.stdout.on("data", (data) => {
      dataString += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python Error: ${data}`);
    });
    
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
      } else {
        try {
          resolve(JSON.parse(dataString));
        } catch (err) {
          reject(new Error("Failed to parse python output: " + dataString));
        }
      }
    });
  });
};

export const suggestCrop = async (req, res) => {
  try {
    const { temp, hum, rain, soil, location } = req.body;
    if (temp === undefined || temp === null || hum === undefined || hum === null || rain === undefined || rain === null) return res.status(400).json({ error: "Missing temp, hum, or rain" });

    let result = await getGeminiCropSuggestion({ temp, hum, rain }, soil || "loamy", location || "India");
    if (!result) {
      result = await suggestAdvancedCrop(temp, hum, rain);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const predictDemand = async (req, res) => {
  try {
    const result = await predictAdvancedDemand(7);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const analyzeNutrition = async (req, res) => {
  try {
    const { crop } = req.body;
    if (!crop) return res.status(400).json({ error: "Missing crop" });
    const result = await getNutritionAnalysis(crop);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const farmerSuggestions = async (req, res) => {
  try {
    const { crop, soil, location, stage } = req.body;
    if (!crop || !soil) return res.status(400).json({ error: "Missing crop or soil" });
    
    let result = await getGeminiFarmerTips(crop, soil, location, stage);
    if (result) return res.json(result);
    
    const locNote = location ? ` based on your location: ${location}` : "";
    const isSuitable = ["loamy", "clay"].includes(soil.toLowerCase()) || crop.toLowerCase() === "rice";
    
    const stageAdvice = {
      sowing: ["Prepare seedbed 2 weeks before sowing.", "Treat seeds with fungicide."],
      growing: ["Apply nitrogen-rich fertilizer.", "Irrigate every 5-7 days."],
      flowering: ["Reduce nitrogen fertilizer.", "Ensure consistent irrigation."],
      harvesting: ["Harvest in early morning.", "Use clean tools."],
      post_harvest: ["Store in cool areas.", "Track inventory closely."]
    };

    const currentStage = stage || "sowing";
    const tips = stageAdvice[currentStage] || stageAdvice.sowing;
    const generalTips = [`Monitor local weather forecasts.`, `Soil test every season.`];
    
    res.json({
      crop, soil_type: soil, location_considered: location || "Unknown", current_stage: currentStage,
      is_suitable: isSuitable, suggestions: [...tips, ...generalTips],
      quick_actions: [{ label: "Update Stage", action: "update_stage" }]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const routeOptimize = async (req, res) => {
  try {
    const { agentLat, agentLng, orders } = req.body;
    if (!agentLat || !agentLng || !orders || orders.length === 0) return res.status(400).json({ error: "Missing data" });
    const { optimized, totalDistance } = await optimizeDeliveryRoute(agentLat, agentLng, orders);
    res.json({ optimizedRoute: optimized, totalDistance: totalDistance.toFixed(2) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const marketBasketAnalysis = async (req, res) => {
  try {
    const { crop, customerId } = req.body;
    if (!crop) return res.status(400).json({ error: "Crop required" });

    // Spawn the Python ML script to perform true statistical market basket analysis
    const resultJson = await runPythonScript("inference/market_basket.py", [crop]);
    
    // Parse the JSON output from the Python script
    const data = JSON.parse(resultJson);
    
    res.json(data);
  } catch (error) {
    console.error("Market Basket Python Error:", error);
    // Safe fallback if Python fails to execute
    res.json({
      targetCrop: req.body.crop,
      totalBaskets: 0,
      suggestions: [
        { crop: "Tomato", confidence: "80.0", count: 0 },
        { crop: "Onion", confidence: "70.0", count: 0 },
        { crop: "Potato", confidence: "65.0", count: 0 },
        { crop: "Chili", confidence: "55.0", count: 0 }
      ],
      status: "python_error"
    });
  }
};

// 1. Crop Yield Prediction (Advanced with Gemini Integration)
export const predictYield = async (req, res) => {
  try {
    const { crop, acres, soilType, soilPh } = req.body;
    if (!crop || !acres || !soilType) return res.status(400).json({ error: "Missing required fields" });

    const target = crop.toLowerCase();

    // Baseline fallback logic in case Gemini fails
    const yieldBaselines = {
      // Vegetables
      tomato: { base: 12000, idealPh: 6.5, price: 40 },
      potato: { base: 10000, idealPh: 5.5, price: 25 },
      onion: { base: 8000, idealPh: 6.0, price: 30 },
      cabbage: { base: 15000, idealPh: 6.5, price: 20 },
      cauliflower: { base: 12000, idealPh: 6.5, price: 30 },
      brinjal: { base: 9000, idealPh: 6.0, price: 35 },
      carrot: { base: 11000, idealPh: 6.0, price: 40 },
      spinach: { base: 4000, idealPh: 6.5, price: 50 },
      chili: { base: 2000, idealPh: 6.0, price: 80 },
      garlic: { base: 4000, idealPh: 6.5, price: 100 },
      // Grains & Pulses
      rice: { base: 2500, idealPh: 6.0, price: 60 },
      wheat: { base: 1500, idealPh: 6.5, price: 40 },
      maize: { base: 2800, idealPh: 6.0, price: 25 },
      corn: { base: 2800, idealPh: 6.0, price: 25 },
      soybean: { base: 1200, idealPh: 6.5, price: 45 },
      gram: { base: 900, idealPh: 6.0, price: 70 },
      // Fruits
      apple: { base: 6000, idealPh: 6.5, price: 120 },
      mango: { base: 5000, idealPh: 6.0, price: 80 },
      banana: { base: 15000, idealPh: 6.5, price: 30 },
      papaya: { base: 18000, idealPh: 6.0, price: 40 },
      orange: { base: 7000, idealPh: 6.5, price: 60 },
      grapes: { base: 8000, idealPh: 6.5, price: 90 },
      watermelon: { base: 20000, idealPh: 6.0, price: 15 },
      // Cash Crops
      cotton: { base: 500, idealPh: 6.2, price: 150 },
      sugarcane: { base: 35000, idealPh: 6.5, price: 5 },
      groundnut: { base: 1000, idealPh: 6.0, price: 80 }
    };
    const baseline = yieldBaselines[target] || { base: 5000, idealPh: 6.5, price: 45 };

    // Try using Gemini for advanced ML prediction
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are an expert Indian agricultural ML prediction model.
        Predict the harvest yield and revenue for:
        Crop: ${crop}
        Acres: ${acres}
        Soil Type: ${soilType}
        Soil pH: ${soilPh || 'Unknown'}
        
        Calculate realistic figures based on current Indian average yields.
        Return EXACTLY and ONLY JSON matching this structure:
        {
          "estimatedYieldKg": 12500,
          "estimatedYieldTons": "12.50",
          "estimatedRevenue": 450000,
          "soilSuitability": "Optimal/Average/Sub-optimal",
          "phEfficiencyPct": 95,
          "aiRecommendation": "Short tip to improve yield based on this data"
        }`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^```json/i, "").replace(/```$/, "").trim();
        const aiData = JSON.parse(text);
        
        return res.json({ crop, acres, soilType, soilPh: soilPh || baseline.idealPh, ...aiData });
      } catch (err) {
        console.warn("Gemini Yield Prediction Failed:", err.message);
      }
    }

    // Fallback static model
    let totalMultiplier = 1.0;
    if (["loamy", "clay"].includes(soilType.toLowerCase())) totalMultiplier = 1.15;
    else if (soilType.toLowerCase() === "saline") totalMultiplier = 0.70;

    const estimatedYieldKg = baseline.base * parseFloat(acres) * totalMultiplier;
    const pricePerKg = baseline.price;
    const estimatedRevenue = estimatedYieldKg * pricePerKg;

    res.json({
      crop, acres, soilType, soilPh: soilPh || baseline.idealPh,
      estimatedYieldKg: Math.round(estimatedYieldKg),
      estimatedYieldTons: (estimatedYieldKg / 1000).toFixed(2),
      estimatedRevenue: Math.round(estimatedRevenue),
      soilSuitability: totalMultiplier > 1 ? "Optimal" : "Average",
      phEfficiencyPct: 90,
      aiRecommendation: "Ensure regular irrigation during the growth phase."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Dynamic Price & Surge Demand Model (Advanced with Gemini)
export const predictPriceTrends = async (req, res) => {
  try {
    const { crop } = req.body;
    if (!crop) return res.status(400).json({ error: "Crop required" });
    const target = crop.toLowerCase();

    // Calculate Supply
    const cropsInDb = await Crop.find({ name: new RegExp(target, "i") });
    let totalSupply = 0;
    cropsInDb.forEach(c => {
      if (c.unit === "tons" || c.unit === "tonnes") totalSupply += (c.quantity * 1000);
      else totalSupply += c.quantity;
    });

    // Calculate Demand
    const recentOrders = await Order.find({ cropName: new RegExp(target, "i"), status: { $ne: "cancelled" } }).limit(200);
    let totalDemand = recentOrders.reduce((sum, o) => sum + o.quantity, 0);

    const currentBasePrice = cropsInDb.length > 0 ? cropsInDb[0].price : (target === "tomato" ? 40 : target === "onion" ? 30 : 50);

    // Try Gemini Advanced Market Predictor
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are an advanced agricultural market analysis AI.
        Crop: ${target}
        Platform Supply: ${totalSupply} kg
        Recent Platform Demand: ${totalDemand} kg
        Current Base Price: ₹${currentBasePrice}/kg
        
        Using real-world Indian market trends and the local supply/demand provided above, predict the optimal realistic surge price.
        High demand surge should be realistic (e.g., tomato price shouldn't go from 40 to 400 randomly, maybe to 60 or 70 if demand is high).
        
        Return EXACTLY and ONLY JSON matching this structure:
        {
          "status": "High Demand" or "Stable" or "Low Demand",
          "trend": "Upward" or "Neutral" or "Downward",
          "suggestedMarketPrice": 55,
          "mlInsights": {
            "demand_score": 8,
            "market_reason": "Brief explanation of why the price should change."
          }
        }`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/^```json/i, "").replace(/```$/, "").trim();
        const aiData = JSON.parse(text);
        
        return res.json({
          crop: target,
          totalSupplyKg: totalSupply,
          recentDemandKg: totalDemand,
          currentAveragePrice: Math.round(currentBasePrice),
          ...aiData
        });
      } catch (err) {
        console.warn("Gemini Price Prediction Failed:", err.message);
      }
    }

    // Static Fallback Logic
    const baseDemandRatio = totalSupply > 0 ? (totalDemand / totalSupply) : 2.0;
    const orderVelocity = Math.min(recentOrders.length / 50, 2.0);
    const marketMomentum = baseDemandRatio * orderVelocity;

    let status = "Stable";
    let surgeMultiplier = 1.0;
    let expectedTrend = "Neutral";
    const volatilityIndex = Math.min(marketMomentum * 0.15, 0.40);

    if (marketMomentum > 1.2) {
      status = "High Demand";
      surgeMultiplier = Math.min(1.0 + volatilityIndex, 1.8);
      expectedTrend = "Upward";
    } else if (marketMomentum < 0.4) {
      status = "Low Demand";
      surgeMultiplier = Math.max(0.7, 1.0 - (volatilityIndex * 1.5));
      expectedTrend = "Downward";
    }

    res.json({
      crop: target,
      totalSupplyKg: totalSupply,
      recentDemandKg: totalDemand,
      status,
      trend: expectedTrend,
      currentAveragePrice: Math.round(currentBasePrice),
      suggestedMarketPrice: Math.round(currentBasePrice * surgeMultiplier)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Smart ETA & Delay Risk Prediction
export const predictDeliveryETA = async (req, res) => {
  try {
    const { agentLat, agentLng, destLat, destLng, orderSizeKg } = req.body;
    if (!agentLat || !destLat) return res.status(400).json({ error: "Coordinates required" });

    const distanceKm = getDistance(parseFloat(agentLat), parseFloat(agentLng), parseFloat(destLat), parseFloat(destLng));
    
    let speedKmPerMin = 0.5;
    const currentHourDecimal = new Date().getHours() + (new Date().getMinutes() / 60);
    
    const calcGaussianPenalty = (x, mu, sigma, maxPenalty) => maxPenalty * Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
    const morningPenalty = calcGaussianPenalty(currentHourDecimal, 9.0, 1.5, 0.45);
    const eveningPenalty = calcGaussianPenalty(currentHourDecimal, 18.0, 2.0, 0.50);
    const trafficPenalty = Math.max(morningPenalty, eveningPenalty);

    speedKmPerMin *= (1 - trafficPenalty);
    const sizePenaltyMins = orderSizeKg > 500 ? 15 : orderSizeKg > 100 ? 5 : 0;
    const travelTimeMins = (distanceKm / speedKmPerMin) + sizePenaltyMins;
    
    let riskLevel = "Low";
    let riskReason = null;
    if (distanceKm > 50) { riskLevel = "High"; riskReason = "Long distance delivery."; }
    else if (trafficPenalty > 0.3) { riskLevel = "Medium"; riskReason = "High traffic density time."; }
    else if (orderSizeKg > 1000) { riskLevel = "Medium"; riskReason = "Heavy cargo logistics."; }

    res.json({
      distanceKm: distanceKm.toFixed(2), estimatedTimeMins: Math.ceil(travelTimeMins),
      trafficPenaltyPct: Math.round(trafficPenalty * 100), isRushHour: trafficPenalty > 0.15,
      riskLevel, riskReason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. NLP Review Sentiment Analysis
export const analyzeSentiment = async (req, res) => {
  try {
    const { reviewText } = req.body;
    if (!reviewText) return res.status(400).json({ error: "Review text required" });

    const text = reviewText.toLowerCase();
    const positiveWords = ["excellent", "good", "great", "fast", "fresh", "amazing", "quick", "polite", "helpful", "awesome", "perfect"];
    const negativeWords = ["bad", "slow", "late", "rotten", "rude", "poor", "terrible", "worst", "delayed", "expensive", "stale"];
    const toxicWords = ["scam", "fraud", "stole", "fake", "cheat", "abusive"];

    let score = 0; let toxicFlag = false;
    const words = text.split(/[\s,.-]+/);

    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.2;
      if (negativeWords.includes(word)) score -= 0.3;
      if (toxicWords.includes(word)) { score -= 0.8; toxicFlag = true; }
    });

    score = Math.max(-1, Math.min(1, score));
    let sentiment = "Neutral";
    if (score > 0.2) sentiment = "Positive";
    else if (score < -0.2) sentiment = "Negative";

    let recommendedTrustAdjustment = 0;
    if (score > 0.5) recommendedTrustAdjustment = 2;
    if (score < -0.3) recommendedTrustAdjustment = -2;
    if (toxicFlag) recommendedTrustAdjustment = -10;

    res.json({ score: score.toFixed(2), sentiment, isToxic: toxicFlag, recommendedTrustAdjustment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMarketDemand = async (req, res) => {
  try {
    const crops = await Crop.find({}).lean();
    const recentOrders = await Order.find({ status: { $ne: "cancelled" } }).populate("crop", "name").limit(500).lean();

    const cropMap = {};
    crops.forEach(c => {
      const name = c.name?.toLowerCase()?.trim();
      if (!name) return;
      if (!cropMap[name]) cropMap[name] = { crop: c.name, totalSupplyKg: 0, totalDemandKg: 0 };
      cropMap[name].totalSupplyKg += c.quantity || 0;
    });

    recentOrders.forEach(o => {
      const name = (o.crop?.name || o.productSnapshot?.name || "").toLowerCase().trim();
      if (!name) return;
      if (!cropMap[name]) cropMap[name] = { crop: name.charAt(0).toUpperCase() + name.slice(1), totalSupplyKg: 0, totalDemandKg: 0 };
      cropMap[name].totalDemandKg += o.quantity || 0;
    });

    const demand = Object.values(cropMap).map(c => {
      const ratio = c.totalSupplyKg > 0 ? c.totalDemandKg / c.totalSupplyKg : (c.totalDemandKg > 0 ? 2.0 : 0);
      let status = "Stable";
      if (ratio > 0.8) status = "High Demand";
      else if (ratio < 0.2 && c.totalSupplyKg > 10) status = "Low Demand";
      return { ...c, status };
    });

    demand.sort((a, b) => {
      const order = { "High Demand": 0, "Stable": 1, "Low Demand": 2 };
      return (order[a.status] || 1) - (order[b.status] || 1);
    });

    if (demand.length === 0) {
      const month = new Date().getMonth();
      const seasonal = month >= 5 && month <= 9 
        ? ["Rice", "Maize", "Cotton", "Groundnut", "Sugarcane", "Tomato", "Brinjal", "Chili", "Mango", "Cucumber", "Okra", "Papaya", "Garlic", "Ginger", "Turmeric"] 
        : ["Wheat", "Mustard", "Peas", "Potato", "Onion", "Carrot", "Cabbage", "Cauliflower", "Spinach", "Apple", "Grapes", "Orange", "Coriander", "Fenugreek", "Radish"];
      const defaults = seasonal.map((name, i) => ({
        crop: name, 
        totalSupplyKg: Math.round(50 + Math.random() * 500), 
        totalDemandKg: Math.round(30 + Math.random() * 800),
        status: i < 5 ? "High Demand" : i < 10 ? "Stable" : "Low Demand",
      }));
      return res.json({ demand: defaults });
    }

    res.json({ demand });
  } catch (error) {
    res.json({ demand: [] });
  }
};export const retrainEnsemble = async (req, res) => { 
  try {
    res.json({ success: true, message: 'Ensemble model retraining initiated. The system is compiling fresh data from MongoDB.' });
    
    const io = req.app.get("io");
    
    // Paths to the python scripts
    const pythonScripts = [
      { name: "Price Model", file: "train_model.py", progress: 25 },
      { name: "Demand Model", file: "train_demand_model.py", progress: 50 },
      { name: "Seasonal Model", file: "train_seasonal_model.py", progress: 75 },
      { name: "Crop Model", file: "train_crop_model.py", progress: 100 }
    ];
    
    const scriptsDir = path.join(__dirname, "../../ml_models/training");
    
    const runScript = (scriptObj) => {
      return new Promise((resolve, reject) => {
        if (io) io.emit("ml_retrain_progress", { progress: scriptObj.progress - 10, stage: `Training ${scriptObj.name}...` });
        
        const process = spawn('python', [scriptObj.file], { cwd: scriptsDir });
        
        process.stdout.on('data', (data) => {
          console.log(`[ML Training - ${scriptObj.name}]`, data.toString().trim());
        });
        
        process.stderr.on('data', (data) => {
          console.error(`[ML Error - ${scriptObj.name}]`, data.toString().trim());
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            if (io) io.emit("ml_retrain_progress", { progress: scriptObj.progress, stage: `${scriptObj.name} Trained Successfully` });
            resolve();
          } else {
            reject(new Error(`Script ${scriptObj.file} exited with code ${code}`));
          }
        });
      });
    };
    
    // Execute sequentially
    console.log("[ML Server] Starting live real-data retraining pipeline...");
    for (const script of pythonScripts) {
      await runScript(script);
    }
    
    console.log("[ML Server] Ensemble retraining complete.");
    if (io) {
      io.emit("ml_retrain_complete", { 
        success: true, 
        message: "Ensemble models successfully updated with latest MongoDB marketplace data.",
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error("Retrain Error:", error);
    const io = req.app.get("io");
    if (io) {
      io.emit("ml_retrain_complete", { 
        success: false, 
        message: "Failed to update models: " + error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
