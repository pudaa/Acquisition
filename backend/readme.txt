教师端运行说明：

1. 确保已安装 Node.js 18+ 和 MySQL 8.0+
2. 解压后双击运行 start.bat
3. 服务将自动在 http://localhost:5550 运行
4. 按 Ctrl+C 停止服务

环境配置要求：
■ 数据库配置：修改 .env 文件
■ 端口配置：修改 PORT 环境变量
■ 需开启数据库远程访问权限

包含文件说明：
├─config/    - 数据库配置
├─routes/    - API路由
├─models/    - 数据模型
└─.env       - 环境配置模板
