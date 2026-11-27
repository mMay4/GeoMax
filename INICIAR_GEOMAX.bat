@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Debes instalar Node.js 20.19 o superior.
 pause
 exit /b 1
)
if not exist "node_modules\vite" (
 echo Instala dependencias con npm ci.
 pause
 exit /b 1
)
echo Iniciando GeoMax API y geovisor. Abre http://localhost:5173
call npm run dev
pause
