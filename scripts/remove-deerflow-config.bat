@echo off
setlocal
cd /d "%~dp0.."

set "DEERFLOW_DIR=%CD%\services\deer-flow"
set "CONFIG_YML=%DEERFLOW_DIR%\config.yml"
set "CONFIG_YAML=%DEERFLOW_DIR%\config.yaml"
set "ENV_FILE=%DEERFLOW_DIR%\.env"

echo DeerFlow config cleanup
echo.
echo Target directory:
echo   %DEERFLOW_DIR%
echo.
echo Files that may be removed:
if exist "%CONFIG_YML%" (
  echo   [FOUND] %CONFIG_YML%
) else (
  echo   [MISS ] %CONFIG_YML%
)

if exist "%CONFIG_YAML%" (
  echo   [FOUND] %CONFIG_YAML%
) else (
  echo   [MISS ] %CONFIG_YAML%
)

if exist "%ENV_FILE%" (
  echo   [FOUND] %ENV_FILE%
) else (
  echo   [MISS ] %ENV_FILE%
)

echo.
set /p "CONFIRM=Type Y and press Enter to delete these files: "
if /i not "%CONFIRM%"=="Y" (
  echo.
  echo Cancelled.
  echo.
  pause
  exit /b 0
)

set "REMOVED=0"

if exist "%CONFIG_YML%" (
  del /f /q "%CONFIG_YML%"
  echo Removed: %CONFIG_YML%
  set "REMOVED=1"
)

if exist "%CONFIG_YAML%" (
  del /f /q "%CONFIG_YAML%"
  echo Removed: %CONFIG_YAML%
  set "REMOVED=1"
)

if exist "%ENV_FILE%" (
  del /f /q "%ENV_FILE%"
  echo Removed: %ENV_FILE%
  set "REMOVED=1"
)

echo.
if "%REMOVED%"=="0" (
  echo No matching files were found.
) else (
  echo Done.
)

echo.
pause
exit /b 0
