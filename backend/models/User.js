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
    const sql = 'INSERT INTO users (username, password, realname, role, avatar_url, class_name) VALUES (?, ?, ?, "student", "default_avatar.jpg", "no_class")';
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

  // 根据班级查找学生
  static async findByClass(className) {
    let rows = []
    if(className != "no_class"){
      const sql = 'SELECT id, username, realname, avatar_url FROM users WHERE role = "student" AND class_name = ?';
      rows = await db.query(sql, [className]);
    }
    return rows;
  }

  // 修改学生的班级
  static async updateStudentClass(studentId, className) {
    // 判断学生是否已有班级（即学生的class_name不为no_class）
    const sql_s = 'SELECT class_name FROM users WHERE username = ? AND role = "student"';
    const result = await db.query(sql_s, [studentId]);
    if (result.length === 0) {
      return;
    }
    const currentClass = result[0].class_name;
    if (currentClass != 'no_class') {
      return;
    }

    const sql_u = 'UPDATE users SET class_name = ? WHERE username = ? AND role = "student"';
    return await db.query(sql_u, [className, studentId]);
  }

  // 将学生从班级移除
  static async removeStudentFromClass(studentId, className) {
    const sql = 'UPDATE users SET class_name = "no_class" WHERE username = ? AND class_name = ? AND role = "student"';
    return await db.query(sql, [studentId, className]);
  }

  // 修改教师的班级名
  static async updateTeacherClass(userId, newClassName) {
    const sql = 'UPDATE users SET class_name = ? WHERE id = ? AND role = "teacher"';
    return await db.query(sql, [newClassName, userId]);
  }

  // 批量更新指定班级的学生的 class_name
  static async updateStudentClassByOldClass(oldClassName, newClassName) {
    const sql = 'UPDATE users SET class_name = ? WHERE role = "student" AND class_name = ?';
    return await db.query(sql, [newClassName, oldClassName]);
  }

}