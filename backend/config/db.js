import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  /**
   * 执行安全的SQL查询（防注入）
   * @param {string} sql - SQL语句，可使用?作为占位符
   * @param {Array} params - 参数化查询的值数组
   * @returns {Promise<Array>} 查询结果数组
   */
  async query(sql, params) {
    // 使用连接池执行预处理语句，
    const [rows] = await this.pool.execute(sql, params);
    // 返回结果集（SELECT返回数据数组，INSERT返回操作结果对象）
    console.log("查询结果：",rows);
    return rows;
  }

  /**
   * 执行安全的SQL更新（防注入）
   * @param {string} sql - SQL语句，可使用?作为占位符
   * @param {Array} params - 参数化查询的
   * 值数组
   * @returns {Promise<Object>} 操作结果对象
   */
  async update(sql, params) {
    // 使用连接池执行预处理语句
    const [result] = await this.pool.execute(sql, params);
    // 返回操作结果对象（包含affectedRows等信息）
    return result;
  }
  /**
   * 执行安全的SQL插入（防注入）
   * @param {string} sql - SQL语句，可使用?作为占位符
   * @param {Array} params - 参数化查询的值数组
   * @returns {Promise<Object>} 操作结果对象
   **/
  async insert(sql, params) {
    // 使用连接池执行预处理语句
    const [result] = await this.pool.execute(sql, params);
    // 返回操作结果对象（包含affectedRows等信息）
    return result;
  }
}

export const db = new Database();