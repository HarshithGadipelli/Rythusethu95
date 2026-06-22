# Rythusethu95

## Getting Started

Because Rythu Sethu is a heavy, production-grade application featuring native Machine Learning `.pkl` files and complex Node modules, these heavy binaries are ignored via `.gitignore` to keep the repository lightning-fast.

**When you clone this repository, you must generate the dependencies and ML models locally!**

### 🚀 One-Click Installation (Windows)
We have provided a fully automated setup script. Simply double-click it!
1. Clone the repository: `git clone https://github.com/HarshithGadipelli/Rythusethu95.git`
2. Open the cloned folder.
3. **Double-click `setup_and_run.bat`**

This script will automatically:
- Install all Node modules for the Frontend and Backend.
- Install Python requirements (`pip install -r requirements.txt`).
- Execute the Python ML training scripts to mathematically generate the required `.pkl` model files locally.
- Boot up the servers.

### Manual Installation
If you prefer to run it manually or are on Mac/Linux:
1. **Backend**: `cd backend`, copy `.env.example` to `.env`, and run `npm install` then `npm run dev`.
2. **Frontend**: `cd frontend` and run `npm install` then `npm run dev`.
3. **Machine Learning**: `cd ml_models`, run `pip install -r requirements.txt`, then `cd training` and run `python train_model.py`. Ensure you have MongoDB running locally.95