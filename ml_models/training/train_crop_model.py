import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from pymongo import MongoClient
import joblib
import os

print("Starting training process for Crop Recommendation Model...")

def fetch_and_augment_crop_data(target_rows=55000):
    np.random.seed(42)
    
    # Base scientific ideal conditions: [N, P, K, Temp(C), Humidity(%), pH, Rainfall(mm)]
    ideal_conditions = {
        'Rice':     [80, 40, 40, 25, 80, 6.0, 200],
        'Maize':    [100, 50, 50, 28, 60, 6.5, 100],
        'Cotton':   [120, 40, 40, 30, 70, 6.5, 150],
        'Tomato':   [100, 60, 60, 25, 65, 6.2, 80],
        'Onion':    [80, 50, 60, 22, 60, 6.8, 60],
        'Potato':   [120, 80, 100, 18, 70, 5.5, 75],
        'Chilli':   [100, 50, 50, 28, 60, 6.5, 100],
        'Turmeric': [120, 60, 80, 25, 75, 6.0, 150],
        'Ginger':   [100, 60, 60, 24, 75, 6.0, 150],
        'Banana':   [150, 50, 150, 28, 80, 6.5, 180],
        'Mango':    [100, 40, 100, 30, 50, 6.0, 90]
    }
    
    print("Connecting to live MongoDB to sync crop classes...")
    try:
        client = MongoClient("mongodb://127.0.0.1:27017/")
        db = client["rythu_sethu"]
        live_crops = list(db.crops.find({}))
        print(f"Found {len(live_crops)} real crop listings.")
        
        # Dynamically learn new crops from the real database!
        for crop in live_crops:
            c_name = crop.get('name', '')
            if c_name and c_name not in ideal_conditions:
                # Assign a generic baseline for newly discovered live crops
                ideal_conditions[c_name] = [90, 50, 50, 26, 65, 6.5, 100]
                print(f"Learned new crop from live database: {c_name}")
                
    except Exception as e:
        print(f"MongoDB connection failed: {e}. Falling back to default scientific baseline.")

    data = []
    samples_per_crop = max(5000, target_rows // len(ideal_conditions))
    
    print(f"Generating augmented data points for {len(ideal_conditions)} distinct live crop classes...")
    for crop, conditions in ideal_conditions.items():
        for _ in range(samples_per_crop):
            data.append({
                'N': max(0, int(np.random.normal(conditions[0], 0.5))),
                'P': max(0, int(np.random.normal(conditions[1], 0.5))),
                'K': max(0, int(np.random.normal(conditions[2], 0.5))),
                'temperature': np.random.normal(conditions[3], 0.2),
                'humidity': np.random.normal(conditions[4], 0.5),
                'ph': max(0, min(14, np.random.normal(conditions[5], 0.05))),
                'rainfall': max(0, np.random.normal(conditions[6], 1.0)),
                'label': crop
            })
            
    return pd.DataFrame(data)

df = fetch_and_augment_crop_data()

# 2. Split Data
X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train Model
print("Training RandomForestClassifier...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 4. Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# 5. Save Model
model_path = os.path.join(os.path.dirname(__file__), "../models/crop_model.pkl")
joblib.dump(model, model_path)
print(f"Model saved successfully at {model_path}")
