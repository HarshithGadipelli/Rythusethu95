import sys
import json
import pickle
import os
import pandas as pd

def predict_season(temperature, humidity, rainfall, ph):
    try:
        model_path = os.path.join(os.path.dirname(__file__), "../models/seasonal_model.pkl")
        if not os.path.exists(model_path):
            return {"error": "seasonal_model.pkl not found. Please train the model first."}
            
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            
        input_data = pd.DataFrame([{
            'temperature': temperature,
            'humidity': humidity,
            'rainfall': rainfall,
            'ph': ph
        }])
        
        prediction = model.predict(input_data)[0]
        probabilities = model.predict_proba(input_data)[0]
        classes = model.classes_
        
        confidence = dict(zip(classes, [round(float(p)*100, 2) for p in probabilities]))
        
        return {
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "ph": ph,
            "predicted_season": str(prediction),
            "confidence_scores": confidence
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Missing arguments. Usage: python seasonal_prediction.py <temperature> <humidity> <rainfall> <ph>"}))
            sys.exit(1)
            
        temp = float(sys.argv[1])
        hum = float(sys.argv[2])
        rain = float(sys.argv[3])
        ph = float(sys.argv[4])
        
        result = predict_season(temp, hum, rain, ph)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
