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

%PYTHON_CMD% "%~dp0configure_deerflow_ollama.py" %*
set "EXIT_CODE=%errorlevel%"

:finish
echo.
pause
exit /b %EXIT_CODE%
