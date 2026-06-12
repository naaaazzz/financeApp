@echo off
echo ============================================
echo  ADB Logcat Crash Log Checker
echo  Package: com.nazhoz.incomeexpensetracker
echo ============================================
echo.

echo --- Connected Devices ---
adb devices
echo.

echo --- Clearing logcat buffer ---
adb logcat -c
echo Cleared. Now launching the app...
echo.

echo --- Starting app ---
adb shell am start -n com.nazhoz.incomeexpensetracker/.MainActivity
echo.

echo --- Waiting 5 seconds for crash ---
timeout /t 5 /nobreak >nul
echo.

echo --- Capturing crash logs ---
echo.
echo ===== FATAL / AndroidRuntime =====
adb logcat -d -s AndroidRuntime:E
echo.
echo ===== ReactNativeJS Errors =====
adb logcat -d -s ReactNativeJS:E
echo.
echo ===== ReactNative Errors =====
adb logcat -d -s ReactNative:E
echo.
echo ===== All FATAL logs =====
adb logcat -d *:F
echo.
echo ============================================
echo  Done! Check the output above for crash info
echo ============================================
pause
