import jwt from 'jsonwebtoken'; 

const auth = (req, res, next) => {
    try {
        // 添加头信息校验
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '认证头格式错误，应为 Bearer <token>' });
        }
        
        const token = authHeader.split(' ')[1];
        console.log('接收到的认证头:', authHeader); 
        console.log('接收到的Token:', token); 
        
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
        };
        next();
    } catch (err) {
        console.error('JWT验证失败:', err.message);
        return res.status(401).json({ 
            error: '身份验证失败',
            detail: err.message
        });
    }
};
export default auth;