@echo off
setlocal
cd /d "%~dp0"
set "OIKOMU_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "OIKOMU_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Node.js is required. See README.md.
    pause
    exit /b 1
  )
)
echo Updating J1 matches. This can take a few minutes.
"%OIKOMU_NODE%" "scripts\collect-j1.mjs" %*
set "OIKOMU_UPDATE_EXIT=%ERRORLEVEL%"
if "%OIKOMU_UPDATE_EXIT%"=="0" echo Update complete. Reload the app. Rebuild if using production preview.
if /I not "%~2"=="--no-pause" pause
exit /b %OIKOMU_UPDATE_EXIT%
