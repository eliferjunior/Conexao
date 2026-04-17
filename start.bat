@echo off
rem Konektra — atalho para subir o app no Windows.
rem Uso: start.bat [porta]  (padrão: 8080)
setlocal
cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  echo.
  echo   Konektra em http://localhost:%PORT%/   ^(Ctrl+C para parar^)
  start "" "http://localhost:%PORT%/"
  node scripts\serve.mjs %PORT%
  exit /b
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  echo.
  echo   Konektra em http://localhost:%PORT%/   ^(Ctrl+C para parar^)
  start "" "http://localhost:%PORT%/"
  python -m http.server %PORT%
  exit /b
)

echo Instale Node.js ^(^>=20^) ou Python 3 e rode este script novamente.
exit /b 1
