import sys
import json
import pickle
import os
import pandas as pd

def predict_demand(crop_encoded, month, historical_sales, market_price):
    try:
        model_path = os.path.join(os.path.dirname(__file__), "../models/demand_model.pkl")
        if not os.path.exists(model_path):
            return {"error": "demand_model.pkl not found. Please train the model first."}
            
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            
        # Create a dataframe for the input
        input_data = pd.DataFrame([{
            'crop_encoded': crop_encoded,
            'month': month,
            'historical_sales': historical_sales,
            'market_price': market_price
        }])
        
        prediction = model.predict(input_data)[0]
        
        return {
            "crop_encoded": crop_encoded,
            "month": month,
            "predicted_demand": round(float(prediction), 2),
            "recommendation": "High demand expected" if prediction > 150 else "Moderate demand" if prediction > 80 else "Low demand"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        # Expected args: crop_encoded month historical_sales market_price
        if len(sys.argv) < 5:
            print(json.dumps({"error": "Missing arguments. Usage: python demand_prediction.py <crop_encoded> <month> <historical_sales> <market_price>"}))
            sys.exit(1)
            
        crop_encoded = int(sys.argv[1])
        month = int(sys.argv[2])
        historical_sales = float(sys.argv[3])
        market_price = float(sys.argv[4])
        
        result = predict_demand(crop_encoded, month, historical_sales, market_price)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
