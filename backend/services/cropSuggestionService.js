// Advanced Crop Suggestion Service — Pure Node.js ML fallback
// No Python dependency required. Uses weighted scoring with environmental factors.

const CROP_DATABASE = [
  // Kharif (Monsoon Jun-Oct)
  { name: "Rice", season: "kharif", idealTemp: [22, 32], idealHum: [60, 95], idealRain: [100, 300], bestSoil: ["clay", "loamy"], category: "grain", waterNeed: "high", growDays: 120 },
  { name: "Maize", season: "kharif", idealTemp: [21, 30], idealHum: [50, 80], idealRain: [50, 100], bestSoil: ["loamy", "sandy"], category: "grain", waterNeed: "medium", growDays: 90 },
  { name: "Cotton", season: "kharif", idealTemp: [25, 35], idealHum: [40, 70], idealRain: [50, 100], bestSoil: ["black", "clay"], category: "fiber", waterNeed: "medium", growDays: 150 },
  { name: "Groundnut", season: "kharif", idealTemp: [25, 30], idealHum: [50, 70], idealRain: [50, 75], bestSoil: ["sandy", "loamy"], category: "oilseed", waterNeed: "low", growDays: 100 },
  { name: "Soybean", season: "kharif", idealTemp: [20, 30], idealHum: [60, 80], idealRain: [60, 100], bestSoil: ["loamy", "clay"], category: "pulse", waterNeed: "medium", growDays: 100 },
  { name: "Sugarcane", season: "kharif", idealTemp: [20, 35], idealHum: [60, 85], idealRain: [75, 150], bestSoil: ["loamy"], category: "cash", waterNeed: "high", growDays: 365 },
  { name: "Turmeric", season: "kharif", idealTemp: [25, 30], idealHum: [70, 90], idealRain: [100, 200], bestSoil: ["loamy", "clay"], category: "spice", waterNeed: "high", growDays: 240 },
  { name: "Chili", season: "kharif", idealTemp: [20, 30], idealHum: [60, 80], idealRain: [50, 100], bestSoil: ["loamy", "sandy"], category: "spice", waterNeed: "medium", growDays: 120 },
  { name: "Okra", season: "kharif", idealTemp: [25, 35], idealHum: [60, 80], idealRain: [40, 80], bestSoil: ["loamy"], category: "vegetable", waterNeed: "medium", growDays: 60 },
  
  // Rabi (Winter Nov-Mar)
  { name: "Wheat", season: "rabi", idealTemp: [10, 25], idealHum: [40, 65], idealRain: [25, 75], bestSoil: ["loamy", "clay"], category: "grain", waterNeed: "medium", growDays: 120 },
  { name: "Mustard", season: "rabi", idealTemp: [10, 25], idealHum: [40, 60], idealRain: [20, 40], bestSoil: ["loamy"], category: "oilseed", waterNeed: "low", growDays: 110 },
  { name: "Peas", season: "rabi", idealTemp: [10, 20], idealHum: [50, 70], idealRain: [30, 50], bestSoil: ["loamy", "sandy"], category: "pulse", waterNeed: "low", growDays: 90 },
  { name: "Barley", season: "rabi", idealTemp: [12, 25], idealHum: [30, 60], idealRain: [25, 50], bestSoil: ["loamy"], category: "grain", waterNeed: "low", growDays: 100 },
  { name: "Chickpea", season: "rabi", idealTemp: [15, 30], idealHum: [30, 50], idealRain: [20, 40], bestSoil: ["loamy", "clay"], category: "pulse", waterNeed: "low", growDays: 100 },
  { name: "Potato", season: "rabi", idealTemp: [15, 25], idealHum: [60, 80], idealRain: [30, 60], bestSoil: ["loamy", "sandy"], category: "vegetable", waterNeed: "medium", growDays: 90 },
  { name: "Onion", season: "rabi", idealTemp: [15, 25], idealHum: [50, 70], idealRain: [30, 50], bestSoil: ["loamy"], category: "vegetable", waterNeed: "medium", growDays: 120 },
  { name: "Garlic", season: "rabi", idealTemp: [12, 24], idealHum: [40, 65], idealRain: [20, 40], bestSoil: ["loamy", "sandy"], category: "spice", waterNeed: "low", growDays: 140 },
  { name: "Carrot", season: "rabi", idealTemp: [10, 20], idealHum: [50, 70], idealRain: [25, 50], bestSoil: ["sandy", "loamy"], category: "vegetable", waterNeed: "medium", growDays: 75 },
  
  // Zaid (Summer Apr-May)
  { name: "Watermelon", season: "zaid", idealTemp: [25, 35], idealHum: [50, 70], idealRain: [0, 30], bestSoil: ["sandy", "loamy"], category: "fruit", waterNeed: "high", growDays: 80 },
  { name: "Cucumber", season: "zaid", idealTemp: [20, 35], idealHum: [50, 70], idealRain: [0, 30], bestSoil: ["loamy", "sandy"], category: "vegetable", waterNeed: "medium", growDays: 55 },
  { name: "Bitter Gourd", season: "zaid", idealTemp: [25, 35], idealHum: [50, 70], idealRain: [0, 25], bestSoil: ["loamy"], category: "vegetable", waterNeed: "medium", growDays: 55 },
  { name: "Muskmelon", season: "zaid", idealTemp: [24, 35], idealHum: [50, 65], idealRain: [0, 20], bestSoil: ["sandy"], category: "fruit", waterNeed: "medium", growDays: 85 },
  
  // Perennial / All-season
  { name: "Tomato", season: "perennial", idealTemp: [18, 30], idealHum: [50, 80], idealRain: [30, 60], bestSoil: ["loamy", "sandy"], category: "vegetable", waterNeed: "medium", growDays: 75 },
  { name: "Banana", season: "perennial", idealTemp: [20, 35], idealHum: [60, 90], idealRain: [80, 200], bestSoil: ["loamy"], category: "fruit", waterNeed: "high", growDays: 300 },
  { name: "Mango", season: "perennial", idealTemp: [24, 35], idealHum: [50, 80], idealRain: [50, 120], bestSoil: ["loamy", "sandy"], category: "fruit", waterNeed: "medium", growDays: 365 },
  { name: "Brinjal", season: "perennial", idealTemp: [20, 30], idealHum: [50, 75], idealRain: [30, 60], bestSoil: ["loamy"], category: "vegetable", waterNeed: "medium", growDays: 70 },
  { name: "Spinach", season: "perennial", idealTemp: [10, 25], idealHum: [50, 70], idealRain: [20, 40], bestSoil: ["loamy", "clay"], category: "vegetable", waterNeed: "medium", growDays: 40 },
  { name: "Cabbage", season: "perennial", idealTemp: [12, 22], idealHum: [60, 80], idealRain: [30, 60], bestSoil: ["loamy", "clay"], category: "vegetable", waterNeed: "medium", growDays: 80 },
];

// Gaussian scoring function: e^(-((x - μ)^2) / (2σ^2))
function gaussianScore(value, idealMin, idealMax) {
  const mu = (idealMin + idealMax) / 2;
  const sigma = (idealMax - idealMin) / 2 || 1;
  if (value >= idealMin && value <= idealMax) return 1.0;
  const deviation = value < idealMin ? idealMin - value : value - idealMax;
  return Math.exp(-(deviation * deviation) / (2 * sigma * sigma));
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 9) return "kharif";
  if (month >= 10 || month <= 2) return "rabi";
  return "zaid";
}

export const suggestAdvancedCrop = async (temp, hum, rain) => {
  const t = parseFloat(temp);
  const h = parseFloat(hum);
  const r = parseFloat(rain);
  const currentSeason = getCurrentSeason();
  
  // Score each crop
  const scored = CROP_DATABASE.map(crop => {
    const tempScore = gaussianScore(t, crop.idealTemp[0], crop.idealTemp[1]);
    const humScore = gaussianScore(h, crop.idealHum[0], crop.idealHum[1]);
    const rainScore = gaussianScore(r, crop.idealRain[0], crop.idealRain[1]);
    
    // Season bonus: 25% boost for matching season, 10% for perennial
    let seasonBonus = 0;
    if (crop.season === currentSeason) seasonBonus = 0.25;
    else if (crop.season === "perennial") seasonBonus = 0.10;
    
    // Weighted composite: Temp 35%, Humidity 30%, Rain 25%, Season 10%
    const rawScore = (tempScore * 0.35) + (humScore * 0.30) + (rainScore * 0.25) + (seasonBonus * 0.10);
    const confidence = Math.round(rawScore * 100);
    
    return {
      name: crop.name,
      confidence,
      tempScore: Math.round(tempScore * 100),
      humScore: Math.round(humScore * 100),
      rainScore: Math.round(rainScore * 100),
      season: crop.season,
      category: crop.category,
      waterNeed: crop.waterNeed,
      growDays: crop.growDays,
      bestSoil: crop.bestSoil,
    };
  });
  
  // Sort by confidence descending
  scored.sort((a, b) => b.confidence - a.confidence);
  
  const top = scored[0];
  const alternatives = scored.slice(1, 5).map(c => ({
    name: c.name,
    confidence: c.confidence,
    season: c.season,
    category: c.category,
  }));

  // Weather risk assessment
  let weatherRisk = "Low";
  let riskDetails = [];
  if (t > 38) { weatherRisk = "High"; riskDetails.push("Extreme heat may damage crops"); }
  if (t < 8) { weatherRisk = "High"; riskDetails.push("Frost risk — protect seedlings"); }
  if (r > 200) { weatherRisk = "Medium"; riskDetails.push("Heavy rainfall — ensure drainage"); }
  if (h > 90) { riskDetails.push("High humidity — monitor for fungal diseases"); if (weatherRisk === "Low") weatherRisk = "Medium"; }
  if (h < 25) { riskDetails.push("Very dry air — ensure irrigation"); if (weatherRisk === "Low") weatherRisk = "Medium"; }
  
  return {
    recommended_crop: top.name,
    confidence: top.confidence,
    category: top.category,
    water_requirement: top.waterNeed,
    growth_duration_days: top.growDays,
    best_soil_types: top.bestSoil,
    scoring_breakdown: {
      temperature_match: top.tempScore,
      humidity_match: top.humScore,
      rainfall_match: top.rainScore,
    },
    alternatives,
    seasonality_enforced: currentSeason,
    weather_risk: weatherRisk,
    risk_details: riskDetails,
    farming_tips: [
      `${top.name} grows best in ${top.bestSoil.join(" or ")} soil with ${top.waterNeed} water needs.`,
      `Expected growth cycle: ~${top.growDays} days from sowing to harvest.`,
      `Current season (${currentSeason}) ${top.season === currentSeason || top.season === "perennial" ? "is ideal" : "may not be optimal"} for ${top.name}.`,
      r < 10 ? `Low rainfall detected. Plan drip irrigation for water-efficient cultivation.` : `Adequate moisture available. Monitor drainage to prevent waterlogging.`,
    ],
    note: `AI recommendation based on real-time weather (${t}°C, ${h}% humidity, ${r}mm rain) and ${currentSeason} season analysis.`,
  };
};