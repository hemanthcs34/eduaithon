@echo off
cd /d "%~dp0"
call .venv\Scripts\activate
cd backend
echo Starting Backend Server on port 8001...
python -m uvicorn app.main:app --reload --port 8001
pause
