@echo off
title Acquisition 开发服务器
echo ========================================
echo   Acquisition 虚拟实验平台 - 开发模式
echo ========================================
echo.

:: 检查后端依赖
if not exist "backend\node_modules" (
    echo [后端] 正在安装依赖...
    cd backend
    call npm install
    cd ..
)

:: 检查前端依赖
if not exist "frontend\node_modules" (
    echo [前端] 正在安装依赖...
    cd frontend
    call npm install
    cd ..
)

echo [后端] 启动 API 服务 (http://localhost:5550)
start "Acquisition-Backend" cmd /c "cd /d %cd%\backend && title 后端服务 && echo 后端服务运行中... && node app.js"

echo [前端] 启动开发服务器 (http://localhost:5173)
start "Acquisition-Frontend" cmd /c "cd /d %cd%\frontend && title 前端开发服务器 && npm run dev"

echo.
echo 后端服务: http://localhost:5550
echo 前端开发: http://localhost:5173
echo.
echo 提示：关闭对应窗口即可停止相应服务。
echo 按任意键关闭此窗口（不会停止后台服务）...
pause > nul
