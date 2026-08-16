import jwt from 'jsonwebtoken'; 

const auth = (req, res, next) => {
    try {
        // 添加头信息校验
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '认证头格式错误，应为 Bearer <token>' });
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: '令牌不能为空' });
        }

const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { 
            id: decoded.userId,
            role: decoded.role,
            realname: decoded.realname,
            username: decoded.username,
            class_name: decoded.class_name,
            class_id: decoded.class_id ?? null,
        };
        next();
    } catch (err) {
        console.error('JWT验证失败:', err.message);
        return res.status(401).json({ 
            error: '身份验证失败'
        });
    }
};

// 角色校验中间件：用法 requireRole('teacher') 或 requireRole('teacher', 'student')
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: '权限不足' });
    }
    next();
};

export default auth;