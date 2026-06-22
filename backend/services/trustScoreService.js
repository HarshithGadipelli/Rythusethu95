import Farmer from "../models/Farmer.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";

/**
 * Trust Score Calculation Service
 * 
 * Computes a farmer's trust score (0–100) from 10 weighted parameters:
 * 
 * | Parameter              | Weight | Max Points |
 * |------------------------|--------|------------|
 * | Verification Status    |  10%   |     10     |
 * | Average Rating         |  20%   |     20     |
 * | Order Fulfillment Rate |  15%   |     15     |
 * | Experience (years)     |   5%   |      5     |
 * | Organic Certification  |  10%   |     10     |
 * | Total Sales Volume     |  10%   |     10     |
 * | Account Age            |   5%   |      5     |
 * | Profile Completeness   |  10%   |     10     |
 * | Response Rate          |   5%   |      5     |
 * | Low Return Rate        |  10%   |     10     |
 */

// Grade thresholds
const GRADES = [
  { min: 90, grade: "Platinum", emoji: "🏆", label: "Exceptional" },
  { min: 75, grade: "Gold",     emoji: "🥇", label: "Highly Trusted" },
  { min: 60, grade: "Silver",   emoji: "🥈", label: "Trusted" },
  { min: 40, grade: "Bronze",   emoji: "🥉", label: "Building Trust" },
  { min: 0,  grade: "New",      emoji: "🌱", label: "Getting Started" },
];

function getGrade(score) {
  for (const g of GRADES) {
    if (score >= g.min) return g;
  }
  return GRADES[GRADES.length - 1];
}

/**
 * Calculate trust score for a farmer.
 * @param {string} farmerId - The farmer's User ID (not Farmer profile ID)
 * @returns {Object} { score, grade, emoji, label, breakdown }
 */
export async function calculateTrustScore(farmerId) {
  // Fetch farmer profile and user
  const user = await User.findById(farmerId);
  const farmer = await Farmer.findOne({ user: farmerId });

  if (!user || !farmer) {
    return {
      score: 0,
      grade: "New",
      emoji: "🌱",
      label: "Getting Started",
      breakdown: {}
    };
  }

  const breakdown = {};

  // ─── 1. Verification Status (10 pts) ───
  // Both verified = 10, one verified = 5, none = 0
  let verificationScore = 0;
  if (farmer.verified && farmer.aadhaarVerified) {
    verificationScore = 10;
  } else if (farmer.verified || farmer.aadhaarVerified || user.isVerified) {
    verificationScore = 5;
  }
  breakdown.verification = {
    score: verificationScore,
    max: 10,
    details: {
      farmVerified: farmer.verified,
      aadhaarVerified: farmer.aadhaarVerified,
      accountVerified: user.isVerified
    }
  };

  // ─── 2. Average Rating (20 pts) ───
  // Rating is 0–5 scale → normalized to 0–20
  const rating = farmer.rating || 0;
  const ratingScore = Math.round((rating / 5) * 20 * 10) / 10;
  breakdown.rating = {
    score: ratingScore,
    max: 20,
    details: { averageRating: rating }
  };

  // ─── 3. Order Fulfillment Rate (15 pts) ───
  // (delivered orders / total non-pending orders) × 15
  const allOrders = await Order.find({ farmer: farmerId });
  const totalOrders = allOrders.length;
  const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;
  const cancelledOrders = allOrders.filter(o => o.status === "cancelled").length;
  const completedOrders = deliveredOrders + cancelledOrders; // only count resolved orders
  
  let fulfillmentScore = 0;
  if (completedOrders > 0) {
    fulfillmentScore = Math.round((deliveredOrders / completedOrders) * 15 * 10) / 10;
  } else if (totalOrders > 0) {
    // Has pending/in-progress orders but none completed yet — give partial credit
    fulfillmentScore = 7.5;
  }
  breakdown.fulfillment = {
    score: fulfillmentScore,
    max: 15,
    details: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      fulfillmentRate: completedOrders > 0 ? Math.round((deliveredOrders / completedOrders) * 100) : null
    }
  };

  // ─── 4. Experience (5 pts) ───
  // Capped at 10 years → min(experience/10, 1) × 5
  const experience = farmer.experience || 0;
  const experienceScore = Math.round(Math.min(experience / 10, 1) * 5 * 10) / 10;
  breakdown.experience = {
    score: experienceScore,
    max: 5,
    details: { years: experience }
  };

  // ─── 5. Organic Certification Ratio (10 pts) ───
  // (organic crops / total crops listed) × 10
  const allCrops = await Crop.find({ farmer: farmerId });
  const totalCrops = allCrops.length;
  const organicCrops = allCrops.filter(c => c.isOrganic).length;
  const pesticideFreeCrops = allCrops.filter(c => c.isPesticideFree).length;

  let organicScore = 0;
  if (totalCrops > 0) {
    const organicRatio = Math.max(organicCrops, pesticideFreeCrops) / totalCrops;
    organicScore = Math.round(organicRatio * 10 * 10) / 10;
  }
  breakdown.organic = {
    score: organicScore,
    max: 10,
    details: {
      totalCrops,
      organicCrops,
      pesticideFreeCrops,
      organicPercentage: totalCrops > 0 ? Math.round((organicCrops / totalCrops) * 100) : 0
    }
  };

  // ─── 6. Total Sales Volume (10 pts) ───
  // Capped at 100 orders → min(totalSales/100, 1) × 10
  const salesCount = farmer.totalSales || deliveredOrders;
  const salesScore = Math.round(Math.min(salesCount / 100, 1) * 10 * 10) / 10;
  breakdown.salesVolume = {
    score: salesScore,
    max: 10,
    details: { totalSales: salesCount }
  };

  // ─── 7. Account Age (5 pts) ───
  // Capped at 24 months → min(months/24, 1) × 5
  const accountCreated = user.createdAt || new Date();
  const monthsActive = Math.max(0, (Date.now() - new Date(accountCreated).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const ageScore = Math.round(Math.min(monthsActive / 24, 1) * 5 * 10) / 10;
  breakdown.accountAge = {
    score: ageScore,
    max: 5,
    details: {
      monthsActive: Math.round(monthsActive),
      createdAt: accountCreated
    }
  };

  // ─── 8. Profile Completeness (10 pts) ───
  const profileCompletenessScore = Math.round((farmer.profileCompleteness || 50) / 100 * 10 * 10) / 10;
  breakdown.profileCompleteness = {
    score: profileCompletenessScore,
    max: 10,
    details: { completeness: farmer.profileCompleteness || 50 }
  };

  // ─── 9. Response Rate (5 pts) ───
  const responseRateScore = Math.round((farmer.responseRate || 80) / 100 * 5 * 10) / 10;
  breakdown.responseRate = {
    score: responseRateScore,
    max: 5,
    details: { responseRate: farmer.responseRate || 80 }
  };

  // ─── 10. Low Return Rate (10 pts) ───
  // If return rate is 0%, gets 10 pts. If return rate is 20% or more, gets 0 pts.
  const returnRate = farmer.returnRate || 0;
  const returnRateScore = Math.round(Math.max(0, (20 - returnRate) / 20) * 10 * 10) / 10;
  breakdown.returnRate = {
    score: returnRateScore,
    max: 10,
    details: { returnRate }
  };

  // ─── Total Score ───
  const totalScore = Math.round(
    verificationScore + ratingScore + fulfillmentScore +
    experienceScore + organicScore + salesScore + ageScore +
    profileCompletenessScore + responseRateScore + returnRateScore
  );

  const gradeInfo = getGrade(totalScore);

  // Cache the score in the Farmer model
  await Farmer.findOneAndUpdate(
    { user: farmerId },
    { trustScore: totalScore, trustGrade: gradeInfo.grade }
  );

  return {
    score: totalScore,
    grade: gradeInfo.grade,
    emoji: gradeInfo.emoji,
    label: gradeInfo.label,
    breakdown
  };
}

/**
 * Get cached trust score from the Farmer model (fast, for listing pages).
 * Falls back to 0 / "New" if not yet computed.
 */
export async function getCachedTrustScore(farmerId) {
  const farmer = await Farmer.findOne({ user: farmerId });
  if (!farmer) return { score: 0, grade: "New", emoji: "🌱", label: "Getting Started" };

  const gradeInfo = getGrade(farmer.trustScore || 0);
  return {
    score: farmer.trustScore || 0,
    grade: gradeInfo.grade,
    emoji: gradeInfo.emoji,
    label: gradeInfo.label
  };
}
