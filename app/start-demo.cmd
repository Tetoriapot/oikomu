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
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Run npm ci in this folder. See README.md.
  pause
  exit /b 1
)
"%OIKOMU_NODE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5187
