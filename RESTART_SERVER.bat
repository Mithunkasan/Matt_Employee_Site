@echo off
echo Stopping dev server...
taskkill /F /IM node.exe 2>nul
timeout /t 2
echo.
echo Clearing Next.js cache...
rmdir /s /q .next 2>nul
echo.
echo Starting dev server...
start cmd /k npm run dev
echo.
echo Dev server is restarting in a new window!
pause
