-- ============================================================
-- 班级管理优化迁移脚本
-- 目标：将班级从「名称匹配」(users.class_name) 改为「ID 匹配」(classes.id + users.class_id)
-- 适用数据库：acquisition (MySQL 8.x)
-- 执行方式：mysql -u root -p acquisition < 2026-08-16-class-management.sql
-- ============================================================

-- 1. 创建班级表 classes
CREATE TABLE IF NOT EXISTS classes (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '班级名称',
  teacher_id INT NULL COMMENT '负责教师ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY teacher_id (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 2. users 表添加 class_id 字段
ALTER TABLE users ADD COLUMN class_id INT NULL COMMENT '班级ID' AFTER class_name;

-- 3. 将教师已有的班级名称迁移到 classes 表
--    （每个教师一个班级，取教师 users.class_name 去重）
INSERT INTO classes (name, teacher_id)
SELECT DISTINCT class_name, id FROM users
WHERE role = 'teacher'
  AND class_name IS NOT NULL
  AND class_name NOT IN ('no_class', 'default_class');

-- 4. 根据 class_name 回填所有用户的 class_id
UPDATE users u
JOIN classes c ON u.class_name = c.name
SET u.class_id = c.id;

-- 5. discussion_topics 表添加 class_id 字段
--    （NULL 表示综合讨论区，非 NULL 表示对应班级讨论区）
ALTER TABLE discussion_topics ADD COLUMN class_id INT NULL COMMENT '班级ID，NULL表示综合讨论区' AFTER class_name;

-- 6. 迁移讨论话题的 class_name 到 class_id
UPDATE discussion_topics t
JOIN classes c ON t.class_name = c.name
SET t.class_id = c.id
WHERE t.class_name != 'public';

-- ============================================================
-- 说明：
--   * 迁移后 users.class_name 字段仍保留（兼容旧数据展示），
--     但所有业务逻辑一律使用 class_id 关联 classes 表。
--   * 新注册学生 class_id 默认为 NULL（未加入班级）。
--   * 教师首次添加学生/修改班级名时，若尚无班级会自动创建。
-- ============================================================