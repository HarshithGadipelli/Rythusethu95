import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn("Failed to initialize GoogleGenerativeAI:", error.message);
}

export const getGeminiCropSuggestion = async (weatherLive, soil, location) => {
  if (!genAI) return null;
  try {
    const prompt = `You are an expert Indian agricultural AI. 
Given the current weather (Temperature: ${weatherLive.temp}°C, Humidity: ${weatherLive.hum}%, Rainfall: ${weatherLive.rain}mm), 
soil type (${soil}), and location (${location || "India"}).

Suggest the best crop to plant right now. Return EXACTLY and ONLY valid JSON in this structure:
{
  "recommended_crop": "Crop Name",
  "confidence": 92,
  "category": "vegetable",
  "water_requirement": "high/medium/low",
  "growth_duration_days": 90,
  "scoring_breakdown": {
    "temperature_match": 95,
    "humidity_match": 85,
    "rainfall_match": 80
  },
  "weather_risk": "Low/Medium/High",
  "risk_details": ["risk 1", "risk 2"],
  "alternatives": [
    {"name": "Alt 1", "confidence": 85, "season": "rabi"},
    {"name": "Alt 2", "confidence": 80, "season": "kharif"}
  ],
  "farming_tips": ["tip 1", "tip 2", "tip 3"],
  "note": "A friendly concluding note for the farmer."
}

Do not include markdown blocks like \`\`\`json or \`\`\`. Just output raw JSON.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(prompt);
    
    let text = response.response.text().trim();
    if (text.startsWith("```json")) text = text.slice(7);
    if (text.startsWith("```")) text = text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini crop suggestion error:", error);
    return null; // Fallback to our existing logic
  }
};

export const getGeminiFarmerTips = async (crop, soil, location, stage) => {
  if (!genAI) return null;
  try {
    const prompt = `You are an expert Indian agricultural AI advising a farmer.
The farmer is growing ${crop} in ${soil} soil at location: ${location || "Unknown"}.
The current stage of the crop lifecycle is: ${stage || "sowing"}.

Provide highly actionable, practical farming advice specific to this crop, soil, and growth stage.
Return EXACTLY and ONLY valid JSON in this structure:
{
  "crop": "${crop}",
  "soil_type": "${soil}",
  "location_considered": "${location || "Unknown"}",
  "current_stage": "${stage || "sowing"}",
  "is_suitable": true,
  "suggestions": [
    "stage specific actionable tip 1",
    "stage specific actionable tip 2",
    "general weather tip",
    "soil specific tip"
  ],
  "quick_actions": [
    { "label": "Update Crop Stage", "action": "update_stage" },
    { "label": "Get Price Recommendation", "action": "price_trends" }
  ]
}

Do not include markdown blocks like \`\`\`json or \`\`\`. Just output raw JSON.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(prompt);

    let text = response.response.text().trim();
    if (text.startsWith("```json")) text = text.slice(7);
    if (text.startsWith("```")) text = text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini farmer tips error:", error);
    return null;
  }
};
