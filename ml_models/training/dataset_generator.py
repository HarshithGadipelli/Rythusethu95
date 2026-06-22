import random
import datetime
from pymongo import MongoClient

print("Rythu Sethu ML Dataset Generator")
print("Connecting to MongoDB...")

try:
    client = MongoClient("mongodb://127.0.0.1:27017/")
    db = client["rythu_sethu"]
    
    # Drop existing dataset to start fresh
    db.ml_price_history.drop()
    print("Dropped old ml_price_history collection.")
    
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    exit(1)

n_samples = 50000
crops = ["Tomato", "Rice", "Wheat", "Onion", "Potato", "Cotton"]
seasons = ["kharif", "rabi", "zaid"]
base_prices = {"Tomato": 40, "Rice": 50, "Wheat": 30, "Onion": 35, "Potato": 25, "Cotton": 60}

print(f"Generating {n_samples} historical agricultural records...")

records = []
for i in range(n_samples):
    crop = random.choice(crops)
    season = random.choice(seasons)
    supply_tons = random.uniform(1.0, 100.0)
    demand_score = random.uniform(1.0, 10.0)
    temp_c = random.uniform(15.0, 45.0)
    humidity_pct = random.uniform(20.0, 95.0)
    
    # Calculate synthetic optimal price
    base = base_prices[crop]
    supply_factor = 1.0 + (50 - supply_tons) / 100
    demand_factor = 1.0 + (demand_score - 5) / 10
    weather_factor = 1.2 if (temp_c > 38 or humidity_pct < 30) else 1.0
    
    optimal_price = base * supply_factor * demand_factor * weather_factor
    optimal_price += random.gauss(0, 5) # Noise
    optimal_price = max(optimal_price, 5.0)
    
    record = {
        "crop": crop,
        "season": season,
        "supply_tons": round(supply_tons, 2),
        "demand_score": round(demand_score, 2),
        "weather_temp_c": round(temp_c, 2),
        "weather_humidity_pct": round(humidity_pct, 2),
        "optimal_price": round(optimal_price, 2),
        "timestamp": datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 1000))
    }
    records.append(record)

print("Inserting into MongoDB...")
db.ml_price_history.insert_many(records)
print(f"Successfully inserted {len(records)} records into rythu_sethu.ml_price_history!")
