@echo off
echo ========================================
echo   WhatsApp Bot India - Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo ========================================
echo.

cd /d "%~dp0.."
npm start
