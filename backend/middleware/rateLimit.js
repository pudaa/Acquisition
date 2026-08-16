// ============ 简单内存限流中间件（单实例部署适用） ============
// 多实例/分布式部署时可替换为 Redis 等共享存储实现，接口保持不变。

const buckets = new Map(); // key -> { count, resetAt }
let sweepTimer = null;

function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// 创建限流中间件
// windowMs: 时间窗口（毫秒）；max: 窗口内最大请求数；keyPrefix: 标识区分不同接口
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, keyPrefix = 'rl' } = {}) {
  if (!sweepTimer) {
    sweepTimer = setInterval(sweep, windowMs).unref();
  }

  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `请求过于频繁，请 ${retryAfter} 秒后重试` });
    }

    next();
  };
}