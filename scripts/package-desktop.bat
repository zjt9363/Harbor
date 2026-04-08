@echo off
setlocal
cd /d "%~dp0.."

taskkill /f /im Harbor.exe >nul 2>nul

if exist "release\desktop" (
  del /f /q "release\desktop\*.exe" 2>nul
  del /f /q "release\desktop\*.blockmap" 2>nul
  del /f /q "release\desktop\builder-debug.yml" 2>nul
  if exist "release\desktop\win-unpacked" rmdir /s /q "release\desktop\win-unpacked"
)

call npm run dist:desktop:win
endlocal
