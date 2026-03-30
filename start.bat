@echo off
setlocal

echo Starting backend in the background...
pushd backend
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
)
start /b "" cmd /c "python app.py"
popd

echo Starting frontend...
pushd frontend
echo.
echo Open your app at: http://localhost:5173
echo (API is proxied to http://localhost:5001)
echo.
start "" http://localhost:5173
call npm run dev
popd

echo.
echo Frontend stopped. If backend is still running, close this window or stop python manually.
