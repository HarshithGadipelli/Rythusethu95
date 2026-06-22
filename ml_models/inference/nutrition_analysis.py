import sys
import json
import os

def analyze_nutrition(crop_name):
    try:
        data_path = os.path.join(os.path.dirname(__file__), "../data/nutrition_data.json")
        if not os.path.exists(data_path):
            return {"error": "nutrition_data.json not found."}
            
        with open(data_path, "r") as f:
            nutrition_db = json.load(f)
            
        crop_key = crop_name.lower().strip()
        
        if crop_key in nutrition_db:
            return {
                "crop": crop_name,
                "nutrition_facts": nutrition_db[crop_key],
                "source": "USDA / NIN Database Reference"
            }
        else:
            # Provide a generic fallback for unknown crops
            return {
                "crop": crop_name,
                "nutrition_facts": {
                    "calories": "Varies",
                    "protein": "Varies",
                    "carbs": "Varies",
                    "fat": "Varies",
                    "fiber": "Varies",
                    "key_vitamins": ["General Nutrients"],
                    "health_benefits": "Generally healthy fresh agricultural produce."
                },
                "source": "Fallback"
            }
            
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        crop = sys.argv[1] if len(sys.argv) > 1 else "tomato"
        result = analyze_nutrition(crop)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
