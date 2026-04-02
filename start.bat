@echo off
REM ============================================================
REM  LLM Society Simulator — Windows Startup
REM ============================================================
echo.
echo   LLM Society Simulator
echo   ------------------------------
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

REM Check .env
if not exist "%BACKEND%\.env" (
    copy "%BACKEND%\.env.example" "%BACKEND%\.env"
    echo [!] Utworzono backend\.env — wpisz swoj GROQ_API_KEY
    echo     https://console.groq.com
    echo.
    pause
    exit /b 1
)

echo [*] Uruchamianie backendu...
start "LLM Society Backend" cmd /k "cd /d %BACKEND% && pip install -r requirements.txt && uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 >nul

echo [*] Uruchamianie frontendu...
start "LLM Society Frontend" cmd /k "cd /d %FRONTEND% && npm install && npm run dev"

echo.
echo [+] Gotowe! Otwiera przegladarka...
timeout /t 5 >nul
start http://localhost:5173
echo.
echo API docs: http://localhost:8000/docs
pause
