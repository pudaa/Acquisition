@echo off
cd /d "%~dp0"
echo 正在安装依赖...
call npm install > nul 2>&1
if errorlevel 1 (
    echo [错误] 依赖安装失败
    goto error
)
echo 依赖安装成功！
echo 启动后端服务...
call node app.js
if errorlevel 1 (
    echo [错误] 服务启动失败
    goto error
)
echo 服务已正常启动，按任意键关闭窗口...
pause
exit /b 0

:error
echo 详细错误原因：
echo 1. 检查数据库配置（.env文件）
echo 2. 确认MySQL服务已启动
echo 3. 查看端口占用情况（netstat -ano | findstr :5550）
pause
exit /b 1