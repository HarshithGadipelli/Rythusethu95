import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getNutritionAnalysis = async (crop) => {
  const lower = crop.toLowerCase().trim();
  
  // 1. Try loading from the advanced local ML Dataset
  try {
    const dataPath = path.join(__dirname, '../../ml_models/data/nutrition_data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const nutritionDB = JSON.parse(rawData);
      
      if (nutritionDB[lower]) {
        const data = nutritionDB[lower];
        return {
          crop,
          calories: isNaN(parseFloat(data.calories)) ? 0 : parseFloat(data.calories),
          protein: parseFloat(data.protein) || 0,
          carbs: parseFloat(data.carbs) || 0,
          fat: parseFloat(data.fat) || 0,
          fiber: parseFloat(data.fiber) || 0,
          vitamins: data.key_vitamins || [],
          benefits: [data.health_benefits],
          bestNutrient: {
            name: (data.key_vitamins && data.key_vitamins.length > 0) ? data.key_vitamins[0] : "Nutrients",
            dailyValuePercentage: data.top_nutrient_dv_percent || 100,
            highlightMessage: `Rich source of ${data.key_vitamins?.[0] || 'essential vitamins'}`
          },
          source: "local_dataset"
        };
      }
    }
  } catch (err) {
    console.error("Error reading local nutrition DB:", err.message);
  }

  // 2. Fallback to Gemini AI for unseen crops (Advanced dynamic generation)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are an expert nutritionist. Provide a nutritional breakdown for 100g of raw "${crop}".
        Return EXACTLY and ONLY valid JSON matching this exact structure, no markdown blocks:
        {
          "calories": 50,
          "protein": 1.5,
          "carbs": 10.0,
          "fat": 0.5,
          "fiber": 2.0,
          "vitamins": ["Vitamin C", "Vitamin A", "Potassium"],
          "benefits": ["Improves immunity", "Good for skin"],
          "bestNutrient": {
            "name": "Vitamin C",
            "dailyValuePercentage": 25,
            "highlightMessage": "Excellent source of Vitamin C (25% DV)"
          }
        }`;
      
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json/i, "").replace(/```$/, "").trim();
      const aiData = JSON.parse(text);
      
      return {
        crop,
        ...aiData,
        source: "ai_generated"
      };
    } catch (err) {
      console.warn("Gemini Nutrition Fallback Failed:", err.message);
    }
  }

  // 3. Absolute failsafe static fallback
  return {
    crop,
    calories: 50, protein: 1.5, carbs: 10, fat: 0.5, fiber: 2, 
    vitamins: ["Vitamin A", "Vitamin C", "Iron"], 
    benefits: ["Immunity Boost", "General Wellness"],
    bestNutrient: {
      name: "Vitamin C",
      dailyValuePercentage: 15,
      highlightMessage: "Good source of Vitamin C (15% DV)"
    },
    source: "static_fallback"
  };
};