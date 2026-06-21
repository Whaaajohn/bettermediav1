@echo off
setlocal
cd /d "%~dp0"

echo Starting Better Media in Docker...
docker compose up --build --force-recreate -d

if errorlevel 1 (
  echo.
  echo Better Media could not start. Make sure Docker Desktop is running.
  pause
  exit /b 1
)

echo.
echo Better Media is starting at http://localhost:5174
echo Admin panel: http://localhost:5175/admin
timeout /t 5 /nobreak >nul
start "" "http://localhost:5174"
endlocal
