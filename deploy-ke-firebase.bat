@echo off
title Deploy Laporan Arus Kas ke Firebase Hosting
color 0b
cd /d "D:\Laporan-Arus-Kas"

echo ========================================================
echo    DEPLOY WEB LAPORAN ARUS KAS KE FIREBASE HOSTING
echo ========================================================
echo.

echo [1/3] Memeriksa Login Akun Firebase Google...
call npx.cmd -y firebase-tools@latest login
if %ERRORLEVEL% NEQ 0 (
    echo Gagal login ke Firebase. Pastikan browser sudah mengizinkan login.
    pause
    exit /b
)

echo.
echo [2/3] Mengompilasi Kode Aplikasi (Build Production)...
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo Gagal mengompilasi kode.
    pause
    exit /b
)

echo.
echo [3/3] Mengunggah Web ke Firebase Hosting Google...
call npx.cmd -y firebase-tools@latest deploy --only hosting --project cash-flow-321b5
if %ERRORLEVEL% NEQ 0 (
    echo Gagal mengunggah ke Firebase.
    pause
    exit /b
)

echo.
echo ========================================================
echo   SUKSES! Web Anda kini online 24 jam di Firebase!
echo ========================================================
echo.
pause
