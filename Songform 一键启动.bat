@echo off
setlocal
set "PROJECT_DIR=C:\SongLyricsPoster"
set "APP_URL=http://127.0.0.1:5173/"

if not exist "%PROJECT_DIR%\package.json" (
  echo Project folder not found: %PROJECT_DIR%
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listen = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if (-not $listen) { Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c','npm run dev -- --host 127.0.0.1' -WorkingDirectory 'C:\SongLyricsPoster' -WindowStyle Minimized }"

echo Starting Songform...
for /l %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
  if not errorlevel 1 (
    start "" "%APP_URL%"
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)

echo Startup timed out. Check Node.js and project dependencies.
pause
