-- ============================================================
-- 性能优化索引迁移脚本
-- 目标：为高频查询补齐缺失索引，消除全表扫描
-- 适用数据库：acquisition (MySQL 8.x)
-- 执行方式：mysql -u root -p acquisition < 2026-08-16-performance-indexes.sql
-- 注意：本脚本幂等（重复执行不报错），可在业务低峰期执行
-- ============================================================

-- 1. experiment_attempts：答题率/趋势/行为分析高频按 (user_id) 查最近记录
--    （save-progress 的 "查询最后一次尝试" 与 practice-rate 子查询依赖）
ALTER TABLE experiment_attempts ADD INDEX idx_user_exp (user_id, exp_id, attempt_id) ,
  ALGORITHM=INPLACE, LOCK=NONE;

-- 2. experiment_attempts：进度趋势按 start_time 过滤
ALTER TABLE experiment_attempts ADD INDEX idx_start_time (start_time),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 3. experiment_attempts：唯一键（可选，启用后 save-progress 可升级为单条 upsert）
--    先清理重复尝试（每个用户/实验仅保留最新一次），再建唯一索引
--    ★ 方案设计说明（重要，2026-08-17 实战验证）：
--      * 不能用非等值自连接（a1.attempt_id < a2.attempt_id）找重复行：
--        组内有 k 条记录会产生 k*(k-1)/2 条候选行，组合级膨胀。
--        实测 53.7 万行（仅 17 组）场景：自连接执行 11+ 小时不结束，且
--        触发 1114 临时表空间满、1205 锁等待超时。
--      * 多表 DELETE（DELETE a1 FROM t a1 JOIN t a2 ...）不支持 LIMIT，
--        无法分批，单事务删除海量行会长时间持有行锁导致 1205。
--      * 正确做法（已实测成功）：
--        ① 物化每组保留行清单（GROUP BY 取 MAX(attempt_id)，等值聚合无膨胀）
--        ② 单表 DELETE + EXISTS 子查询 + LIMIT 5000 分批（每批短事务）
--        ③ 执行前先检查僵尸事务：SELECT * FROM information_schema.innodb_trx，
--           残留的自连接 DELETE 事务（RUNNING、rows_locked 巨大）需先 KILL。
--    建议在业务低峰期执行；脚本可重复执行（重复时无重复行则删除 0 行）。

-- 3.1 物化每组保留的最大 attempt_id（永久表，供存储过程循环引用）
DROP TABLE IF EXISTS tmp_keep_ids;
CREATE TABLE tmp_keep_ids (
  user_id INT NOT NULL,
  exp_id  INT NOT NULL,
  keep_id INT NOT NULL,
  PRIMARY KEY (user_id, exp_id)
) AS
SELECT user_id, exp_id, MAX(attempt_id) AS keep_id
FROM experiment_attempts
GROUP BY user_id, exp_id;

-- 3.2 单表 DELETE + EXISTS 子查询，每批 5000 行（短事务，锁短暂）
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_dedupe_attempts $$
CREATE PROCEDURE sp_dedupe_attempts()
BEGIN
  DECLARE affected INT DEFAULT 1;
  WHILE affected > 0 DO
    DELETE FROM experiment_attempts t
    WHERE EXISTS (
      SELECT 1 FROM tmp_keep_ids k
      WHERE k.user_id = t.user_id AND k.exp_id = t.exp_id
        AND t.attempt_id < k.keep_id
    )
    LIMIT 5000;
    SET affected = ROW_COUNT();
  END WHILE;
END $$
DELIMITER ;

CALL sp_dedupe_attempts();
DROP PROCEDURE sp_dedupe_attempts;
DROP TABLE tmp_keep_ids;

ALTER TABLE experiment_attempts ADD UNIQUE INDEX uq_user_exp (user_id, exp_id),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 4. practice_records：答题率查询（MAX(created_at) 子查询 + 归属过滤）
ALTER TABLE practice_records ADD INDEX idx_user_exp_q (user_id, exp_id, question_id, created_at),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 5. user_experiments：按实验查学生进度（/experiments/:id/students）
ALTER TABLE user_experiments ADD INDEX idx_exp (exp_id, user_id, progress),
  ALGORITHM=INPLACE, LOCK=NONE;

-- 6. questions：随机取题按 (exp_id, difficulty) 过滤
ALTER TABLE questions ADD INDEX idx_exp_diff (exp_id, difficulty),
  ALGORITHM=INPLACE, LOCK=NONE;

-- ============================================================
-- 说明：
--   * 第 3 步为可选优化，未执行前 save-progress 保持"查最后一次尝试再更新"的
--     逻辑不变（功能不受影响）；执行后未来可切换为 ON DUPLICATE KEY UPDATE。
--   * 所有 ALTER 均使用 INPLACE + LOCK=NONE，不阻塞线上读写。
-- ============================================================