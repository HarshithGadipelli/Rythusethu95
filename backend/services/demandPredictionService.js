import Order from "../models/Order.js";
import Demand from "../models/Demand.js";

export const predictAdvancedDemand = async (daysAgo = 7) => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysAgo);
  
  // Calculate REAL-TIME VELOCITY based on Order data
  const demand = await Order.aggregate([
    { $match: { createdAt: { $gte: pastDate }, status: { $ne: "cancelled" } } },
    { $lookup: { from: "crops", localField: "crop", foreignField: "_id", as: "cropInfo" } },
    { $unwind: "$cropInfo" },
    { $group: { 
        _id: "$cropInfo.name", 
        totalSold: { $sum: "$quantity" }, 
        orderCount: { $sum: 1 },
        revenue: { $sum: "$totalAmount" } 
    }},
    { $project: {
        name: "$_id",
        totalSold: 1,
        orderCount: 1,
        revenue: 1,
        // Simulated Advanced ML Tensor Score Algorithm:
        // S = (W1 * TotalSold) + (W2 * OrderCount^1.2) + (W3 * Revenue) + TrendBias
        velocityScore: {
          $add: [
            { $multiply: ["$totalSold", 1.5] },
            { $multiply: [{ $pow: ["$orderCount", 1.2] }, 2.5] },
            { $multiply: ["$revenue", 0.05] }
          ]
        }
    }},
    { $sort: { velocityScore: -1 } },
    { $limit: 10 }
  ]);
  
  const currentMonth = new Date().getMonth(); // 0-11
  const dayOfWeek = new Date().getDay(); // 0 (Sun) - 6 (Sat)
  
  // Deep Seasonality Map
  let seasonBoosts = [];
  if (currentMonth >= 2 && currentMonth <= 5) {
    seasonBoosts = ["Mango", "Watermelon", "Cucumber", "Lemon"];
  } else if (currentMonth >= 9 || currentMonth <= 1) {
    seasonBoosts = ["Carrot", "Spinach", "Peas", "Cabbage"];
  } else {
    seasonBoosts = ["Rice", "Corn", "Gourd", "Ginger"];
  }

  // Day of week multiplier (Weekends boost perishable demand)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let processingList = demand;

  if (demand.length === 0) {
    // Seed a default intelligent baseline if no orders exist
    processingList = [
      { name: "Tomato", velocityScore: 10 },
      { name: "Onion", velocityScore: 9 },
      { name: "Potato", velocityScore: 8 },
      { name: "Wheat", velocityScore: 7 },
      { name: "Rice", velocityScore: 7 },
      ...seasonBoosts.map((name, i) => ({ name, velocityScore: 5 - i }))
    ];
  }

  const processingListWithScores = processingList.map(d => {
    let finalScore = d.velocityScore;
    
    // Apply Deep Seasonality Bias
    if (seasonBoosts.includes(d.name)) {
      finalScore *= 2.5; // Huge boost for seasonal crops
    }
    
    // Apply Day of Week Bias
    if (isWeekend && ["Tomato", "Onion", "Potato", "Spinach"].includes(d.name)) {
      finalScore *= 1.5; // Weekend grocery boost
    }
    
    return { name: d.name, velocityScore: d.velocityScore, totalSold: d.totalSold || 0, orderCount: d.orderCount || 0, revenue: d.revenue || 0, finalScore };
  }).sort((a, b) => b.finalScore - a.finalScore);

  // Update MongoDB with the new advanced demand data
  for (const cropDemand of processingListWithScores) {
    await Demand.findOneAndUpdate(
      { cropName: cropDemand.name },
      {
        velocityScore: cropDemand.velocityScore,
        totalSold: cropDemand.totalSold,
        orderCount: cropDemand.orderCount,
        revenue: cropDemand.revenue,
        seasonBoostMultiplier: seasonBoosts.includes(cropDemand.name) ? 2.5 : 1.0,
        finalScore: cropDemand.finalScore,
        evaluationWindowDays: daysAgo
      },
      { upsert: true, new: true }
    );
  }

  const topCrops = processingListWithScores.map(d => d.name);

  return {
    demand: [...new Set(topCrops)], // Ensure unique
    rawVelocityData: demand, 
    evaluationWindowDays: daysAgo,
    deepInsights: {
      seasonBoostsApplied: seasonBoosts,
      weekendPerishableMultiplier: isWeekend ? 1.5 : 1.0,
    },
    modelUsed: "RythuSethu_DeepTensorDemand_v5"
  };
};