@echo off
if /i not "%~1"=="--inner-run" (
  start "" "%ComSpec%" /k call "%~f0" --inner-run
  exit /b
)

echo test-stay-open is running
echo this window should remain open
