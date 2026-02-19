@echo off
echo Installing Biometric Bridge to Startup...
copy "f:\Antigravity\start_bridge_hidden.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"
echo.
echo Done! The Bridge will now start automatically when you log in.
pause
