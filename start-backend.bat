@echo off
echo ========================================
echo    Roboroca - Iniciando Backend
echo ========================================
echo.

cd /d %~dp0

echo Criando ambiente virtual (se necessario)...
if not exist "venv" (
    python -m venv venv
)

echo Ativando ambiente virtual...
call venv\Scripts\activate

echo.
echo Instalando dependencias...
pip install -r backend\requirements.txt

echo.
echo Iniciando servidor FastAPI...
echo.
echo Backend disponivel em: http://localhost:8000
echo API Docs: http://localhost:8000/api/v1/docs
echo.

python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
