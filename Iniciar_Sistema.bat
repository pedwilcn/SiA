@echo off
cd /d "%~dp0"
start "" cmd /c "cd server && npm run dev"
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
cd client && npm run dev
