import { db } from '../config/db.js';

export class Class {
  // 根据 ID 查找班级
  static async findById(id) {
    const sql = 'SELECT * FROM classes WHERE id = ?';
    const rows = await db.query(sql, [id]);
    return rows[0];
  }

  // 根据教师 ID 查找班级
  static async findByTeacher(teacherId) {
    const sql = 'SELECT * FROM classes WHERE teacher_id = ?';
    const rows = await db.query(sql, [teacherId]);
    return rows[0];
  }

  // 创建班级
  static async create(name, teacherId) {
    const sql = 'INSERT INTO classes (name, teacher_id) VALUES (?, ?)';
    const result = await db.query(sql, [name, teacherId]);
    return result.insertId;
  }

  // 更新班级名称
  static async updateName(id, name) {
    const sql = 'UPDATE classes SET name = ? WHERE id = ?';
    return await db.query(sql, [name, id]);
  }

  // 删除班级（同时清空班级内学生的 class_id）
  static async delete(id) {
    await db.query('UPDATE users SET class_id = NULL WHERE class_id = ?', [id]);
    const sql = 'DELETE FROM classes WHERE id = ?';
    return await db.query(sql, [id]);
  }

  // 获取班级内学生列表
  static async findStudents(classId) {
    const sql = 'SELECT id, username, realname, avatar_url FROM users WHERE role = "student" AND class_id = ?';
    return await db.query(sql, [classId]);
  }

  // 获取班级内所有用户（含教师）
  static async findMembers(classId) {
    const sql = 'SELECT id, username, realname, role FROM users WHERE class_id = ?';
    return await db.query(sql, [classId]);
  }
}