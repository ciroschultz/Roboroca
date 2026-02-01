@echo off
echo ========================================
echo    Roboroca - Iniciando Frontend
echo ========================================
echo.
cd frontend
echo Instalando dependencias...
call npm install
echo.
echo Iniciando servidor Next.js...
echo.
echo Frontend disponivel em: http://localhost:3000
echo.
call npm run dev
