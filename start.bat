@echo off
REM ===== Starts the backend API and the frontend site in two windows =====
echo Starting Bow ^& Tie...
echo.
echo Opening two windows (Backend + Frontend). Keep BOTH open while using the site.
echo.

start "Bow & Tie - Backend API (keep open)" /D "%~dp0backend" cmd /k npm run dev
start "Bow & Tie - Frontend Site (keep open)" /D "%~dp0frontend" cmd /k npm run dev

echo.
echo Wait about 10 seconds, then open your browser to:
echo.
echo     http://localhost:5173
echo.
echo (If port 5173 is busy, check the Frontend window for the real address.)
echo.
pause
