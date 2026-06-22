import sys
import json
from collections import defaultdict
from pymongo import MongoClient

# Base fallback recommendations if no real data is found
FALLBACK_SUGGESTIONS = [
    {"crop": "Tomato", "confidence": "80.0", "count": 0},
    {"crop": "Onion", "confidence": "70.0", "count": 0},
    {"crop": "Potato", "confidence": "65.0", "count": 0},
    {"crop": "Chili", "confidence": "55.0", "count": 0}
]

def analyze_market_basket(target_crop):
    target = target_crop.lower().strip()
    
    # 1. Connect to MongoDB
    try:
        client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=2000)
        db = client["rythu_sethu"]
        
        # 2. Fetch completed orders
        # We only look at orders that were successfully completed or confirmed
        orders_cursor = db.orders.find({
            "status": {"$in": ["delivered", "confirmed", "in_transit"]}
        }, {"customer": 1, "crop": 1, "productSnapshot.name": 1})
        
        orders = list(orders_cursor)
        
    except Exception as e:
        # If DB connection fails, return fallback
        return {
            "targetCrop": target_crop,
            "totalBaskets": 0,
            "suggestions": FALLBACK_SUGGESTIONS,
            "status": "db_error",
            "message": str(e)
        }

    # If no orders exist yet in the DB, return fallback
    if not orders:
        return {
            "targetCrop": target_crop,
            "totalBaskets": 0,
            "suggestions": FALLBACK_SUGGESTIONS,
            "status": "fallback",
            "message": "Insufficient data"
        }

    # 3. Form "Baskets" based on Customer ID
    # In real APRIORI, baskets are formed by Transaction ID, but since Rythu Sethu orders 
    # are single-crop, we group all historical purchases by the same customer as their "basket".
    baskets = defaultdict(set)
    
    # We need to map crop IDs to crop names because the Order only stores the crop ObjectId
    crop_ids = {o["crop"] for o in orders if "crop" in o}
    crop_map = {}
    if crop_ids:
        crops_cursor = db.crops.find({"_id": {"$in": list(crop_ids)}}, {"name": 1})
        for c in crops_cursor:
            crop_map[c["_id"]] = c.get("name", "").lower().strip()

    for o in orders:
        if "customer" not in o:
            continue
        cid = str(o["customer"])
        
        crop_name = None
        if "crop" in o and o["crop"] in crop_map:
            crop_name = crop_map[o["crop"]]
        elif "productSnapshot" in o and "name" in o["productSnapshot"]:
            crop_name = o["productSnapshot"]["name"].lower().strip()
            
        if crop_name:
            baskets[cid].add(crop_name)

    # 4. Statistical Co-occurrence (Apriori Support/Confidence)
    co_occurrences = defaultdict(int)
    target_count = 0

    for basket in baskets.values():
        if target in basket:
            target_count += 1
            for item in basket:
                if item != target:
                    co_occurrences[item] += 1

    # 5. Calculate Confidence & Format Output
    suggestions = []
    if target_count > 0:
        for item, count in co_occurrences.items():
            confidence = (count / target_count) * 100
            # Only recommend if confidence > 5%
            if confidence > 5:
                suggestions.append({
                    "crop": item.capitalize(),
                    "confidence": f"{confidence:.1f}",
                    "count": count
                })
        
        # Sort by highest confidence
        suggestions.sort(key=lambda x: float(x["confidence"]), reverse=True)
    
    # 6. Safety Fallback: If target crop has no real correlations yet
    if len(suggestions) == 0:
        suggestions = FALLBACK_SUGGESTIONS
        status_msg = "fallback"
    else:
        status_msg = "real_time_ml"

    # Limit to top 4 recommendations
    return {
        "targetCrop": target_crop,
        "totalBaskets": target_count,
        "suggestions": suggestions[:4],
        "status": status_msg
    }

if __name__ == "__main__":
    target_crop = sys.argv[1] if len(sys.argv) > 1 else "Tomato"
    try:
        result = analyze_market_basket(target_crop)
        print(json.dumps(result))
    except Exception as e:
        # Guarantee JSON output even on fatal crash
        print(json.dumps({
            "targetCrop": target_crop,
            "totalBaskets": 0,
            "suggestions": FALLBACK_SUGGESTIONS,
            "error": str(e)
        }))
