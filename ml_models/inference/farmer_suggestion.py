import sys
import json
import os
import joblib

def recommend_crop(n, p, k, temp, hum, ph, rain):
    try:
        model_path = os.path.join(os.path.dirname(__file__), "../models/crop_model.pkl")
        if not os.path.exists(model_path):
            return {"error": "Trained ML model not found. Please run train_crop_model.py first."}
        
        model = joblib.load(model_path)
        
        # Predict
        prediction = model.predict([[n, p, k, temp, hum, ph, rain]])
        crop = prediction[0]
        
        # Probability
        probabilities = model.predict_proba([[n, p, k, temp, hum, ph, rain]])[0]
        confidence = round(max(probabilities) * 100, 2)
        
        return {
            "recommended_crop": crop,
            "confidence": confidence,
            "input_features": {
                "N": n, "P": p, "K": k, 
                "temperature": temp, "humidity": hum, 
                "ph": ph, "rainfall": rain
            },
            "note": "Real ML prediction using RandomForestClassifier"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        # Defaults if not provided
        n = float(sys.argv[1]) if len(sys.argv) > 1 else 90
        p = float(sys.argv[2]) if len(sys.argv) > 2 else 42
        k = float(sys.argv[3]) if len(sys.argv) > 3 else 43
        temp = float(sys.argv[4]) if len(sys.argv) > 4 else 20.8
        hum = float(sys.argv[5]) if len(sys.argv) > 5 else 82.0
        ph = float(sys.argv[6]) if len(sys.argv) > 6 else 6.5
        rain = float(sys.argv[7]) if len(sys.argv) > 7 else 202.9
        
        result = recommend_crop(n, p, k, temp, hum, ph, rain)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
