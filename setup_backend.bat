@echo off
echo Setting up CourseTwin Backend...

cd /d "%~dp0"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate

echo Installing dependencies...
pip install -r backend/requirements.txt

echo Setup complete!
pause
