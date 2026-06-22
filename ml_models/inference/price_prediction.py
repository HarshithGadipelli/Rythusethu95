import sys
import json
import os
import pandas as pd
import joblib
from pymongo import MongoClient

# Connect to MongoDB
try:
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["rythu_sethu"]
except:
    db = None

# Base market prices (₹ per kg) for Indian crops
BASE_PRICES = {
    "rice": {"min": 25, "max": 60, "avg": 40},
    "wheat": {"min": 22, "max": 45, "avg": 30},
    "maize": {"min": 15, "max": 35, "avg": 22},
    "tomato": {"min": 15, "max": 80, "avg": 35},
    "onion": {"min": 15, "max": 70, "avg": 30},
    "potato": {"min": 12, "max": 40, "avg": 22},
    "chilli": {"min": 40, "max": 200, "avg": 80},
    "turmeric": {"min": 60, "max": 180, "avg": 100},
    "ginger": {"min": 50, "max": 150, "avg": 80},
    "banana": {"min": 20, "max": 60, "avg": 35},
    "mango": {"min": 40, "max": 200, "avg": 80},
    "papaya": {"min": 15, "max": 50, "avg": 30},
    "coconut": {"min": 15, "max": 40, "avg": 25},
    "cotton": {"min": 45, "max": 75, "avg": 58},
    "sugarcane": {"min": 3, "max": 5, "avg": 3.5},
    "groundnut": {"min": 45, "max": 90, "avg": 60},
    "soybean": {"min": 35, "max": 70, "avg": 50},
    "mustard": {"min": 40, "max": 80, "avg": 55},
    "sunflower": {"min": 35, "max": 70, "avg": 50},
    "brinjal": {"min": 15, "max": 60, "avg": 30},
    "okra": {"min": 20, "max": 70, "avg": 35},
    "cauliflower": {"min": 15, "max": 60, "avg": 30},
    "cabbage": {"min": 10, "max": 40, "avg": 20},
    "carrot": {"min": 20, "max": 60, "avg": 35},
    "spinach": {"min": 15, "max": 50, "avg": 25},
    "green peas": {"min": 30, "max": 100, "avg": 55},
    "cucumber": {"min": 10, "max": 40, "avg": 20},
    "watermelon": {"min": 8, "max": 25, "avg": 15},
}

# Seasonal multiplier
SEASON_MULTIPLIER = {
    "kharif": {"rice": 0.9, "tomato": 1.2, "onion": 1.3, "default": 1.0},
    "rabi": {"wheat": 0.9, "potato": 0.85, "tomato": 0.8, "default": 1.0},
    "zaid": {"watermelon": 0.8, "cucumber": 0.85, "default": 1.1},
    "perennial": {"default": 1.0}
}

def get_platform_prices(crop_name):
    """Get current prices from the platform."""
    if db is None:
        return []
    try:
        crops = db.crops.find(
            {"name": {"$regex": crop_name, "$options": "i"}},
            {"price": 1, "quantity": 1}
        )
        prices = [c["price"] for c in crops if "price" in c]
        return prices
    except:
        return []

def get_supply_count(crop_name):
    """Count how many farmers are selling this crop."""
    if db is None:
        return 0
    try:
        return db.crops.count_documents({"name": {"$regex": crop_name, "$options": "i"}, "isAvailable": True})
    except:
        return 0

def get_supply_tons(crop_name):
    """Calculate actual total supply in tons."""
    if db is None:
        return 1.0
    try:
        pipeline = [
            {"$match": {"name": {"$regex": crop_name, "$options": "i"}, "isAvailable": True}},
            {"$group": {"_id": None, "totalKg": {"$sum": "$quantity"}}}
        ]
        result = list(db.crops.aggregate(pipeline))
        if result and len(result) > 0:
            return result[0].get("totalKg", 0) / 1000.0
        return 1.0
    except:
        return 1.0

def get_demand_score(crop_name):
    """Get demand based on order volume."""
    if db is None:
        return 5
    try:
        count = db.orders.count_documents({})
        return min(count + 5, 10)
    except:
        return 5

def predict_price(crop_name, season="kharif", quantity=100):
    crop_lower = crop_name.lower().strip()
    base = BASE_PRICES.get(crop_lower, {"min": 20, "max": 80, "avg": 40})
    
    # Get platform data
    platform_prices = get_platform_prices(crop_name)
    supply_count = get_supply_count(crop_name)
    demand_score = get_demand_score(crop_name)
    
    # Calculate platform average price
    if platform_prices:
        platform_avg = sum(platform_prices) / len(platform_prices)
    else:
        platform_avg = base["avg"]
        
    optimal_price = None
    used_ml = False
    
    # TRY ML MODEL FIRST
    try:
        model_path = os.path.join(os.path.dirname(__file__), "../models/price_model.pkl")
        columns_path = os.path.join(os.path.dirname(__file__), "../models/model_columns.pkl")
        
        if os.path.exists(model_path) and os.path.exists(columns_path):
            model = joblib.load(model_path)
            model_columns = joblib.load(columns_path)
            
            # Create a dataframe for the input
            # Capitalize crop name to match dataset generator (e.g., 'Tomato', 'Rice')
            formatted_crop = crop_name.capitalize()
            
            input_data = pd.DataFrame([{
                "crop": formatted_crop,
                "season": season.lower(),
                "supply_tons": float(get_supply_tons(crop_name)),
                "demand_score": float(demand_score),
                "weather_temp_c": 30.0, # Default temp
                "weather_humidity_pct": 60.0 # Default humidity
            }])
            
            # One hot encode
            input_encoded = pd.get_dummies(input_data, columns=["crop", "season"])
            
            # Reindex to ensure it matches the trained model features
            input_encoded = input_encoded.reindex(columns=model_columns, fill_value=0)
            
            # Predict
            ml_prediction = model.predict(input_encoded)[0]
            optimal_price = round(ml_prediction, 2)
            used_ml = True
            
    except Exception as e:
        # Silently fail and use fallback
        pass

    # FALLBACK LOGIC
    if optimal_price is None:
        # Season multiplier
        season_data = SEASON_MULTIPLIER.get(season, {"default": 1.0})
        multiplier = season_data.get(crop_lower, season_data["default"])
        
        # Supply-demand adjustment
        supply_factor = 1.0
        if supply_count > 5:
            supply_factor = 0.9  # More supply = lower price
        elif supply_count <= 1:
            supply_factor = 1.15  # Low supply = higher price
        
        demand_factor = 1.0 + (demand_score - 5) * 0.03  # ±3% per point above/below 5
        
        # Quantity discount
        qty_factor = 1.0
        if quantity >= 500:
            qty_factor = 0.92
        elif quantity >= 200:
            qty_factor = 0.95
        elif quantity >= 100:
            qty_factor = 0.98
        
        # Final price calculation
        optimal_price = platform_avg * multiplier * supply_factor * demand_factor * qty_factor
        optimal_price = round(max(optimal_price, base["min"]), 2)
    
    # Price range
    low_price = round(optimal_price * 0.85, 2)
    high_price = round(optimal_price * 1.15, 2)
    
    return {
        "crop": crop_name,
        "season": season,
        "quantity": quantity,
        "optimal_price": optimal_price,
        "price_range": {"low": low_price, "high": high_price},
        "market_base": {"min": base["min"], "max": base["max"], "avg": base["avg"]},
        "platform_avg": round(platform_avg, 2),
        "supply_on_platform": supply_count,
        "demand_score": demand_score,
        "used_ml_model": used_ml,
        "recommendation": (
            f"Sell at ₹{optimal_price}/kg for best results. "
            f"{'High demand — consider increasing quantity.' if demand_score >= 7 else 'Moderate demand.'} "
            f"{'Low competition on platform.' if supply_count <= 2 else f'{supply_count} sellers competing.'}"
        )
    }

if __name__ == "__main__":
    try:
        crop = sys.argv[1] if len(sys.argv) > 1 else "Tomato"
        season = sys.argv[2] if len(sys.argv) > 2 else "kharif"
        quantity = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        result = predict_price(crop, season, quantity)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
