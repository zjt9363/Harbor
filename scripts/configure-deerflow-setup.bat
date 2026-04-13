@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="
set "EXIT_CODE=0"

where python >nul 2>nul
if %errorlevel%==0 set "PYTHON_CMD=python"

if not defined PYTHON_CMD (
  where py >nul 2>nul
  if %errorlevel%==0 set "PYTHON_CMD=py -3"
)

if not defined PYTHON_CMD (
  echo [ERROR] Python 3 was not found. Please install Python 3 and try again.
  set "EXIT_CODE=1"
  goto :finish
)

echo Select task:
echo   1. Configure models
echo   2. Configure Telegram (IM)
echo   3. Exit
set "MENU_CHOICE="
set /p MENU_CHOICE=Enter choice (1-3): 

if "%MENU_CHOICE%"=="1" goto :models
if "%MENU_CHOICE%"=="2" goto :telegram
if "%MENU_CHOICE%"=="3" goto :finish

echo [ERROR] Invalid choice.
set "EXIT_CODE=1"
goto :finish

:models
echo.
echo [Models] Configure DeerFlow model list
%PYTHON_CMD% "%~dp0configure_deerflow_models.py" %*
if %errorlevel% neq 0 (
  set "EXIT_CODE=%errorlevel%"
  goto :finish
)
goto :finish

:telegram
echo.
echo [Telegram] Configure Telegram channel
set "TELEGRAM_BOT_TOKEN="
set /p TELEGRAM_BOT_TOKEN=Enter Telegram bot token: 
if not defined TELEGRAM_BOT_TOKEN (
  echo [WARN] No token provided. Skipping Telegram setup.
  goto :finish
)

%PYTHON_CMD% "%~dp0configure_deerflow_telegram.py" --token "%TELEGRAM_BOT_TOKEN%"
if %errorlevel% neq 0 (
  set "EXIT_CODE=%errorlevel%"
  goto :finish
)
goto :finish

:finish
echo.
pause
exit /b %EXIT_CODE%
