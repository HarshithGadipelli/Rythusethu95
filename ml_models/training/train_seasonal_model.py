import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from pymongo import MongoClient
import pickle
import os

def fetch_and_augment_seasonal_data(target_rows=50000):
    np.random.seed(100)
    data = []
    
    print("Connecting to live MongoDB...")
    try:
        client = MongoClient("mongodb://127.0.0.1:27017/")
        db = client["rythu_sethu"]
        
        # Extract live crops to deduce current seasons
        live_crops = list(db.crops.find({}))
        print(f"Found {len(live_crops)} real crops in live database.")
        
        for crop in live_crops:
            created_at = crop.get('createdAt')
            month = created_at.month if created_at else np.random.randint(1, 13)
            
            # Approximate real-world weather when crop was listed
            if month in [7, 8, 9, 10]: # Kharif
                season = 'Kharif'
                temp = np.random.uniform(28, 40)
                rainfall = np.random.uniform(200, 500)
            elif month in [11, 12, 1, 2]: # Rabi
                season = 'Rabi'
                temp = np.random.uniform(10, 24)
                rainfall = np.random.uniform(0, 100)
            elif month in [3, 4, 5, 6]: # Zaid
                season = 'Zaid'
                temp = np.random.uniform(32, 45)
                rainfall = np.random.uniform(0, 50)
            else:
                season = 'Perennial'
                temp = np.random.uniform(20, 35)
                rainfall = np.random.uniform(50, 150)
                
            data.append({
                'temperature': temp,
                'humidity': np.random.uniform(40, 90),
                'rainfall': rainfall,
                'ph': np.random.uniform(5.5, 8.5),
                'target_season': season
            })
            
    except Exception as e:
        print(f"MongoDB connection failed: {e}. Falling back to pure synthetic.")
        
    real_rows = len(data)
    padding_needed = target_rows - real_rows
    
    if padding_needed > 0:
        print(f"Cold Start Detected: Augmenting {real_rows} real rows with {padding_needed} synthetic rows...")
        for _ in range(padding_needed):
            temp = np.random.uniform(10, 45)
            humidity = np.random.uniform(20, 100)
            rainfall = np.random.uniform(0, 500)
            ph = np.random.uniform(5.5, 8.5)
            
            if rainfall > 200 and temp > 25: season = 'Kharif'
            elif temp < 25 and rainfall < 100: season = 'Rabi'
            elif temp > 30 and rainfall < 50: season = 'Zaid'
            else: season = 'Perennial'
                
            data.append({
                'temperature': temp,
                'humidity': humidity,
                'rainfall': rainfall,
                'ph': ph,
                'target_season': season
            })
            
    return pd.DataFrame(data)

if __name__ == "__main__":
    print("Generating Live Augmented Seasonal Dataset...")
    df = fetch_and_augment_seasonal_data()
    
    X = df.drop('target_season', axis=1)
    y = df['target_season']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=100)
    
    print("Training Seasonal Prediction Model (RandomForestClassifier)...")
    model = RandomForestClassifier(n_estimators=100, random_state=100)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model Accuracy Score: {score:.4f}")
    
    model_path = os.path.join(os.path.dirname(__file__), "../models/seasonal_model.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"Seasonal Model saved to {model_path}")
