import Crop from "../models/Crop.js";
import User from "../models/User.js";
import Farmer from "../models/Farmer.js";
export const addCrop = async (req, res) => {
  try {
    // Check if farmer is verified
    const farmerId = req.body.farmer;
    if (farmerId) {
      const farmer = await User.findById(farmerId);
      if (farmer && farmer.role === "farmer" && !farmer.isVerified) {
        return res.status(403).json({ 
          error: "Your account is pending verification. Only verified farmers can list crops on the marketplace. Please wait for admin approval." 
        });
      }
    }

    const cropData = { ...req.body };
    if (req.file) {
      cropData.image = `/uploads/${req.file.filename}`;
    }
    
    // Parse booleans from FormData
    if (cropData.isPrebooking === 'true' || cropData.isPrebooking === true) cropData.isPrebooking = true;
    else cropData.isPrebooking = false;

    if (cropData.isOrganic === 'true' || cropData.isOrganic === true) cropData.isOrganic = true;
    else cropData.isOrganic = false;

    if (cropData.isPesticideFree === 'true' || cropData.isPesticideFree === true) cropData.isPesticideFree = true;
    else cropData.isPesticideFree = false;

    const crop = await Crop.create(cropData);
    
    // Emit real-time event
    const io = req.app?.get?.("io");
    if (io) io.emit("crop_added", crop);
    
    res.json(crop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyCrops = async (req, res) => {
  const crops = await Crop.find({ farmer: req.user._id });
  res.json(crops);
};

export const getTrustLeaderboard = async (req, res) => {
  try {
    const topFarmers = await Farmer.find()
      .sort({ trustScore: -1 })
      .limit(10)
      .populate("user", "name location phone");
    res.json(topFarmers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};