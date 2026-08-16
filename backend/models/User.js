import { db } from '../config/db.js';
import bcrypt from 'bcryptjs';

export class User {
  // 根据学号查找用户
  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const users = await db.query(sql, [username]);
    return users[0];
  }

  // 验证密码
  static async validatePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // 注册新用户
  // 修改注册方法
  static async register(username, password, realname) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password, realname, role, avatar_url, class_name, class_id) VALUES (?, ?, ?, "student", "default_avatar.jpg", "no_class", NULL)';
    const result = await db.query(sql, [username, hashedPassword, realname]);
    if (result.affectedRows !== 1) {
      throw new Error('用户插入失败');
    }
    return this.findByUsername(username);
  }

  // 通过学号和姓名查找用户
  static async findByCredentials(username, realname) {
    const sql = 'SELECT * FROM users WHERE username = ? AND realname = ?';
    const users = await db.query(sql, [username, realname]);
    return users[0];
  }

  // 姓名查询方法
  static async findByRealname(realname) {
    const sql = 'SELECT * FROM users WHERE realname = ?';
    const users = await db.query(sql, [realname]);
    return users[0];
  }

  // 密码找回验证
  static async retrievePassword(username, realname) {
    const user = await this.findByCredentials(username, realname);
    if (!user) {
      throw new Error('用户不存在或姓名不匹配');
    }
    
    // 生成8位随机密码（包含字母和数字）
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新数据库中的密码
    const updateSql = 'UPDATE users SET password = ? WHERE username = ?';
    await db.query(updateSql, [hashedPassword, username]);
    
    return newPassword; // 返回明文新密码用于通知用户
  }

  // 更新用户信息
  static async updateProfile(userId, { realname, avatar }) {
    const sql = 'UPDATE users SET realname = ?, avatar_url = ? WHERE id = ?';
    await db.query(sql, [realname, avatar, userId]);
  }

  // 更新用户密码
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    await db.query(sql, [hashedPassword, userId]);
  }

  // 根据班级 ID 查找学生
  static async findByClassId(classId) {
    if (!classId) return [];
    const sql = 'SELECT id, username, realname, avatar_url FROM users WHERE role = "student" AND class_id = ?';
    return await db.query(sql, [classId]);
  }

  // 修改学生的班级（按班级 ID）
  static async updateStudentClass(studentId, classId) {
    // 判断学生是否已有班级（即学生的 class_id 不为 NULL）
    const sql_s = 'SELECT class_id FROM users WHERE username = ? AND role = "student"';
    const result = await db.query(sql_s, [studentId]);
    if (result.length === 0) {
      return;
    }
    const currentClassId = result[0].class_id;
    if (currentClassId != null) {
      return;
    }

    const sql_u = 'UPDATE users SET class_id = ? WHERE username = ? AND role = "student"';
    return await db.query(sql_u, [classId, studentId]);
  }

  // 将学生从班级移除（按班级 ID）
  static async removeStudentFromClass(studentId, classId) {
    const sql = 'UPDATE users SET class_id = NULL WHERE username = ? AND class_id = ? AND role = "student"';
    return await db.query(sql, [studentId, classId]);
  }

}