@echo off
echo ===================================================
echo     Rythu Sethu - One-Click Installer & Runner
echo ===================================================
echo.

echo [1/5] Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo [2/5] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo [3/5] Installing Python ML Dependencies...
cd ml_models
pip install -r requirements.txt
cd ..

echo [4/5] Training Machine Learning Models locally...
echo (This will take a few seconds and generate the .pkl files)
cd ml_models\training
python train_model.py
cd ..\..

echo [5/5] Booting up the Rythu Sethu Platform!
echo Starting Backend Server...
start cmd /k "cd backend && npm run dev"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Success! The application is booting up.
echo Ensure MongoDB is running on your machine.
echo ===================================================
pause
