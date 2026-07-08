@echo off
REM ===== First-time setup: installs dependencies and prepares the database =====
echo ============================================
echo   Bow ^& Tie - First time setup
echo ============================================
echo.

echo [1/5] Installing backend dependencies...
pushd "%~dp0backend"
call npm install || goto :error

echo [2/5] Generating database client...
call npm run prisma:generate || goto :error

echo [3/5] Creating the database...
call npm run prisma:push || goto :error

echo [4/5] Seeding products and demo accounts...
call npm run seed || goto :error
popd

echo [5/5] Installing frontend dependencies...
pushd "%~dp0frontend"
call npm install || goto :error
popd

echo.
echo ============================================
echo   Setup complete! Now double-click start.bat
echo ============================================
pause
exit /b 0

:error
echo.
echo *** Something went wrong. Scroll up to read the error. ***
pause
exit /b 1
