@echo off
title Laporan Arus Kas - Server & Tunnel
cd /d "%~dp0"
echo ========================================================
echo   MENJALANKAN SISTEM LAPORAN ARUS KAS
echo ========================================================
echo.
echo 1. Memeriksa build production...
call npm.cmd run build
echo.
echo 2. Menjalankan Preview Server lokal...
start /b npx.cmd vite preview --host 0.0.0.0 --port 5173
timeout /t 3 >nul
echo.
echo 3. Mengaktifkan Cloudflare Tunnel untuk akses luar...
echo (Tunggu sebentar sampai muncul link https://....trycloudflare.com)
echo ========================================================
.\cloudflared.exe tunnel --url http://localhost:5173
pause
