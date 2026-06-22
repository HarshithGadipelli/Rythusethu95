import express from "express";
import { 
  suggestCrop, 
  predictDemand, 
  getMarketDemand,
  analyzeNutrition, 
  farmerSuggestions,
  routeOptimize,
  marketBasketAnalysis,
  predictYield,
  predictPriceTrends,
  predictDeliveryETA,
  analyzeSentiment,
  retrainEnsemble
} from "../controllers/mlController.js";

const router = express.Router();

router.post("/crop-suggest", suggestCrop);
router.post("/demand-predict", predictDemand);
router.get("/market-demand", getMarketDemand);
router.post("/nutrition", analyzeNutrition);
router.post("/farmer-suggest", farmerSuggestions);
router.post("/demand/request", async (req, res) => {
  try {
    const { crop, userId } = req.body;
    if (!crop) return res.status(400).json({ error: "Crop required" });
    const CropRequest = (await import("../models/CropRequest.js")).default;
    const newReq = await CropRequest.create({ cropName: crop, requestedBy: userId });
    res.json(newReq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/route-optimize", routeOptimize);
router.post("/market-basket", marketBasketAnalysis);

router.post("/predict-yield", predictYield);
router.post("/price-trends", predictPriceTrends);
router.post("/predict-eta", predictDeliveryETA);
router.post("/analyze-sentiment", analyzeSentiment);
router.post("/retrain", retrainEnsemble);

export default router;