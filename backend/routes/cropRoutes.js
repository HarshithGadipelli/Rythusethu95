import express from "express";
import Crop from "../models/Crop.js";
import Farmer from "../models/Farmer.js";
import upload from "../middleware/upload.js";
import { addCrop } from "../controllers/farmerController.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Add crop with image
router.post("/add", upload.single("image"), addCrop);

// Update Crop Lifecycle Stage
router.put("/:id/stage", upload.single("image"), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    const { lifecycleStage, notes } = req.body;
    let imageUrl = "";
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;

    crop.lifecycleStage = lifecycleStage;
    crop.lifecycleUpdates.push({
      stage: lifecycleStage,
      notes,
      imageUrl,
      timestamp: new Date()
    });

    await crop.save();

    let aiSuggestion = "Keep monitoring soil moisture.";
    if (lifecycleStage === "flowering") aiSuggestion = "Apply potassium-rich fertilizers to boost yield.";
    if (lifecycleStage === "harvesting") aiSuggestion = "Ensure dry weather for harvest to prevent mold.";

    // Emit event
    const io = req.app?.get?.("io");
    if (io) io.emit("crop_updated", crop);

    res.json({ message: "Stage updated successfully", crop, aiSuggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────
// Advanced Search Endpoint
// ──────────────────────────────────────────────
// GET /crops/search?q=tomato&category=vegetable&isOrganic=true&isPesticideFree=true
//                   &minPrice=10&maxPrice=100&maxDistance=25&lat=17.385&lng=78.487
//                   &sortBy=price_asc&page=1&limit=20
// ──────────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const {
      q,
      category,
      isOrganic,
      isPesticideFree,
      minPrice,
      maxPrice,
      maxDistance,
      lat,
      lng,
      sortBy,
      page = 1,
      limit = 50
    } = req.query;

    // Build MongoDB query
    const query = { isAvailable: { $ne: false }, isLive: { $ne: false }, quantity: { $gt: 0 } };

    // Case-insensitive text search on name + description
    if (q && q.trim()) {
      const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
        { category: { $regex: escapedQ, $options: "i" } },
        { location: { $regex: escapedQ, $options: "i" } }
      ];
    }

    // Category filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Organic filter
    if (isOrganic === "true") {
      query.isOrganic = true;
    }

    // Pesticide-free filter
    if (isPesticideFree === "true") {
      query.$or = query.$or || [];
      // Override the $or to include pesticide-free as an AND condition
      query.isPesticideFree = true;
    }

    // If both organic and pesticide-free are requested, use $or to match either
    if (isOrganic === "true" && isPesticideFree === "true") {
      delete query.isOrganic;
      delete query.isPesticideFree;
      // Text search $or already exists, add organic conditions as $and
      const organicCondition = { $or: [{ isOrganic: true }, { isPesticideFree: true }] };
      if (query.$or && query.$or.length > 0) {
        // Preserve text search, add organic as separate condition
        const textOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: textOr },
          organicCondition
        ];
      } else {
        query.$or = [{ isOrganic: true }, { isPesticideFree: true }];
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default: newest first
    if (sortBy === "price_asc") sortOption = { price: 1 };
    else if (sortBy === "price_desc") sortOption = { price: -1 };
    else if (sortBy === "rating") sortOption = { rating: -1 };
    else if (sortBy === "trust_score") sortOption = { createdAt: -1 }; // will sort in-memory after populating farmer
    else if (sortBy === "distance") sortOption = { createdAt: -1 }; // will sort in-memory by distance

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch crops
    let crops = await Crop.find(query)
      .populate("farmer", "name email location latitude longitude")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Crop.countDocuments(query);

    // ─── Post-query: Distance filtering & sorting ───
    const customerLat = lat ? Number(lat) : null;
    const customerLng = lng ? Number(lng) : null;

    if (customerLat && customerLng) {
      // Compute distance for each crop
      crops = crops.map(c => {
        const cropObj = c.toObject();
        const cLat = cropObj.latitude || cropObj.farmer?.latitude;
        const cLng = cropObj.longitude || cropObj.farmer?.longitude;
        
        if (cLat && cLng) {
          cropObj.distance = haversineDistance(customerLat, customerLng, cLat, cLng);
        } else {
          cropObj.distance = null;
        }
        return cropObj;
      });

      // Filter by max distance
      if (maxDistance) {
        const maxDist = Number(maxDistance);
        crops = crops.filter(c => c.distance !== null && c.distance <= maxDist);
      }

      // Sort by distance if requested
      if (sortBy === "distance") {
        crops.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    // ─── Post-query: Trust score sorting ───
    if (sortBy === "trust_score") {
      // Get all unique farmer IDs
      const farmerIds = [...new Set(crops.map(c => {
        const fid = c.farmer?._id || c.farmer;
        return fid?.toString();
      }).filter(Boolean))];

      // Fetch trust scores from Farmer model
      const farmers = await Farmer.find({ user: { $in: farmerIds } });
      const trustMap = {};
      for (const f of farmers) {
        trustMap[f.user.toString()] = f.trustScore || 0;
      }

      crops.sort((a, b) => {
        const aFid = (a.farmer?._id || a.farmer)?.toString();
        const bFid = (b.farmer?._id || b.farmer)?.toString();
        return (trustMap[bFid] || 0) - (trustMap[aFid] || 0);
      });
    }

    // ─── Enrich with trust scores ───
    const farmerIds = [...new Set(crops.map(c => {
      const fid = c.farmer?._id || c.farmer;
      return fid?.toString();
    }).filter(Boolean))];

    const farmers = await Farmer.find({ user: { $in: farmerIds } });
    const trustMap = {};
    
    const GRADES = [
      { min: 90, grade: "Platinum", emoji: "🏆", label: "Exceptional" },
      { min: 75, grade: "Gold",     emoji: "🥇", label: "Highly Trusted" },
      { min: 60, grade: "Silver",   emoji: "🥈", label: "Trusted" },
      { min: 40, grade: "Bronze",   emoji: "🥉", label: "Building Trust" },
      { min: 0,  grade: "New",      emoji: "🌱", label: "Getting Started" },
    ];

    for (const f of farmers) {
      const score = f.trustScore || 0;
      const gradeInfo = GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1];
      trustMap[f.user.toString()] = {
        score,
        grade: gradeInfo.grade,
        emoji: gradeInfo.emoji,
        label: gradeInfo.label
      };
    }

    // Attach trust scores to crops
    const enrichedCrops = crops.map(c => {
      const cropObj = c.toObject ? c.toObject() : c;
      const fid = (cropObj.farmer?._id || cropObj.farmer)?.toString();
      cropObj.farmerTrust = trustMap[fid] || { score: 0, grade: "New", emoji: "🌱", label: "Getting Started" };
      return cropObj;
    });

    res.json({
      crops: enrichedCrops,
      total: maxDistance ? enrichedCrops.length : total,
      page: Number(page),
      totalPages: Math.ceil((maxDistance ? enrichedCrops.length : total) / Number(limit))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// Search Suggestions Endpoint
// ──────────────────────────────────────────────
// GET /crops/suggestions?q=tom
// Returns matching crop names for autocomplete
router.get("/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Find distinct crops matching the query in name OR category
    const crops = await Crop.find(
      {
        $or: [
          { name: { $regex: escapedQ, $options: "i" } },
          { category: { $regex: escapedQ, $options: "i" } }
        ],
        isAvailable: { $ne: false },
        isLive: { $ne: false },
        quantity: { $gt: 0 }
      },
      { name: 1, category: 1, isOrganic: 1, isPesticideFree: 1, price: 1, location: 1 }
    ).populate("farmer", "trustScore").limit(20);

    // Generate advanced smart suggestions
    const suggestions = [];
    const seenNames = new Set();
    const seenCategories = new Set();

    for (const crop of crops) {
      const lowerName = crop.name.toLowerCase();
      
      // Advanced AI-style Category Suggestion
      if (crop.category && !seenCategories.has(crop.category.toLowerCase()) && crop.category.toLowerCase().includes(q.toLowerCase())) {
        seenCategories.add(crop.category.toLowerCase());
        suggestions.push({
          text: `Explore all ${crop.category}s`,
          type: "category",
          searchQuery: crop.category
        });
      }

      // Basic name suggestion
      if (!seenNames.has(lowerName)) {
        seenNames.add(lowerName);
        suggestions.push({
          text: crop.name,
          type: "name",
          category: crop.category
        });

        // Top Rated / High Trust Suggestion
        if (crop.farmer && crop.farmer.trustScore >= 75) {
          suggestions.push({
            text: `${crop.name} – From Top Rated Farmers 🏆`,
            type: "trust",
            searchQuery: crop.name
          });
        }

        // Organic variant
        if (crop.isOrganic) {
          suggestions.push({
            text: `${crop.name} – 100% Certified Organic 🌿`,
            type: "organic",
            filter: { isOrganic: true },
            searchQuery: crop.name
          });
        }

        // Pesticide-free variant
        if (crop.isPesticideFree && !crop.isOrganic) {
          suggestions.push({
            text: `${crop.name} – Pesticide Free 🛡️`,
            type: "pesticide_free",
            filter: { isPesticideFree: true },
            searchQuery: crop.name
          });
        }

        // Smart Budget Suggestions
        if (crop.price <= 100) {
          suggestions.push({
            text: `${crop.name} – Under ₹100 Deals 💰`,
            type: "budget",
            filter: { maxPrice: 100 },
            searchQuery: crop.name
          });
        }
      }
    }

    res.json(suggestions.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get all crops
router.get("/", async (req, res) => {
  try {
    const crops = await Crop.find({ isLive: { $ne: false } }).populate("farmer", "name email location latitude longitude").sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Seasonal Crops based on current month
router.get("/seasonal/current", async (req, res) => {
  try {
    const currentMonth = new Date().getMonth(); // 0-11
    let currentSeason = "kharif";
    if (currentMonth >= 5 && currentMonth <= 9) currentSeason = "kharif"; // Jun - Oct
    else if (currentMonth >= 10 || currentMonth <= 2) currentSeason = "rabi"; // Nov - Mar
    else currentSeason = "zaid"; // Apr - May

    const seasonalMap = {
      kharif: ["rice", "maize", "cotton", "groundnut", "tomato", "chili", "okra"],
      rabi: ["wheat", "barley", "mustard", "peas", "potato", "onion", "carrot", "garlic", "spinach"],
      zaid: ["watermelon", "cucumber", "bitter gourd", "pumpkin", "mango"]
    };

    const allowedCrops = seasonalMap[currentSeason].map(name => new RegExp(name, "i"));

    const crops = await Crop.find({ 
      isLive: { $ne: false },
      $or: allowedCrops.map(regex => ({ name: regex }))
    }).populate("farmer", "name email location latitude longitude").sort({ createdAt: -1 });
    
    res.json(crops);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single crop
router.get("/:id", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id).populate("farmer", "name email location");
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update crop availability
router.put("/:id/availability", async (req, res) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, { isAvailable: req.body.isAvailable }, { new: true });
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle crop live/offline status
router.put("/:id/live", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    crop.isLive = req.body.isLive !== undefined ? req.body.isLive : !crop.isLive;
    await crop.save();
    const io = req.app?.get?.("io");
    if (io) io.emit("crop_updated", crop);
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete crop
router.delete("/:id", async (req, res) => {
  try {
    await Crop.findByIdAndDelete(req.params.id);
    res.json({ message: "Crop removed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update crop price
router.put("/:id/price", async (req, res) => {
  try {
    const { price } = req.body;
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });
    
    crop.price = price;
    await crop.save();
    
    const io = req.app?.get?.("io");
    if (io) io.emit("crop_price_updated", { cropId: crop._id, price: crop.price, name: crop.name });
    
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update entire crop details
router.put("/:id", async (req, res) => {
  try {
    const { name, category, quantity, unit, price } = req.body;
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    if (name) crop.name = name;
    if (category) crop.category = category;
    if (quantity !== undefined) crop.quantity = quantity;
    if (unit) crop.unit = unit;
    if (price !== undefined) crop.price = price;

    await crop.save();
    res.json(crop);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// Update crop lifecycle stage
router.put("/:id/stage", upload.single("image"), async (req, res) => {
  try {
    const { lifecycleStage, notes } = req.body;
    const crop = await Crop.findById(req.params.id).populate("farmer");
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    crop.lifecycleStage = lifecycleStage;
    
    // Add to lifecycleUpdates array with optional image proof
    const updateEntry = {
      stage: lifecycleStage,
      notes: notes || "",
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
      timestamp: new Date()
    };
    if (!crop.lifecycleUpdates) crop.lifecycleUpdates = [];
    crop.lifecycleUpdates.push(updateEntry);

    await crop.save();

    // Notify Admin
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        user: admin._id,
        title: "Crop Lifecycle Updated",
        message: `Farmer ${crop.farmer?.name || "Unknown"} updated their ${crop.name} crop to stage: ${lifecycleStage}.`,
        type: "system"
      });
    }

    // AI Suggestion
    let aiSuggestion = "";
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `A farmer is growing ${crop.name} and the crop has just entered the "${lifecycleStage}" stage. Give a one sentence specific farming suggestion for this stage. If it is "harvesting" or "post_harvest", suggest eco-friendly alternatives to stubble burning like turning it into hay bales.`;
      const result = await model.generateContent(prompt);
      aiSuggestion = result.response.text();
    } else {
      if (lifecycleStage === "post_harvest") aiSuggestion = "Instead of burning stubble, consider turning it into hay bales to prevent pollution.";
      else if (lifecycleStage === "vegetative") aiSuggestion = "Apply nitrogen-rich fertilizer to support rapid growth.";
      else aiSuggestion = "Monitor for pests and ensure adequate watering.";
    }

    res.json({ crop, aiSuggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Farm Tour Video
router.put("/:id/tour", upload.single("video"), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    if (req.file) {
      crop.farmTourVideo = `/uploads/${req.file.filename}`;
      await crop.save();
    }

    res.json(crop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Haversine Distance (km) ──
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Request Organic Certification ──
router.post("/:id/request-certification", upload.single("document"), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id).populate("farmer");
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    crop.certificationStatus = "pending";
    if (req.file) {
      crop.certificationDocument = `/uploads/${req.file.filename}`;
    }
    await crop.save();

    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        user: admin._id,
        title: "🌾 Organic Certification Request",
        message: `Farmer ${crop.farmer?.name || "Unknown"} requested organic certification for ${crop.name}.`,
        type: "system",
        priority: "high",
        metadata: { cropId: crop._id }
      });
    }

    res.json(crop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Review Certification ──
router.post("/:id/review-certification", async (req, res) => {
  try {
    const { status, notifyOfficials } = req.body; 
    const crop = await Crop.findById(req.params.id).populate("farmer");
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    crop.certificationStatus = status;
    if (status === "approved") {
      crop.isOrganic = true;
      crop.isPesticideFree = true;
    } else {
      crop.isOrganic = false;
    }
    await crop.save();

    await Notification.create({
      user: crop.farmer._id,
      title: status === "approved" ? "✅ Certification Approved" : "❌ Certification Rejected",
      message: `Your organic certification for ${crop.name} was ${status}.`,
      type: "system",
      priority: "high"
    });

    res.json(crop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Transfer Pre-booked Crop to Live Sale ──
router.put("/:id/transfer-to-sale", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    crop.isPrebooking = false;
    crop.lifecycleStage = "ready";
    
    // Add timeline update
    crop.lifecycleUpdates.push({
      stage: "ready",
      notes: "Transferred from pre-booking to live sale",
      timestamp: new Date()
    });

    await crop.save();
    res.json({ success: true, message: "Crop transferred to live sale successfully", crop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;