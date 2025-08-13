const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.mysqlPool = null;
    this.sqliteDb = null;
    this.initializeConnections();
  }

  async initializeConnections() {
    try {
      // MySQL Connection Pool
      this.mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'erp_pos_system',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      });

      // Test MySQL connection
      const connection = await this.mysqlPool.getConnection();
      console.log('MySQL connected successfully');
      connection.release();

      // SQLite Connection for offline sync
      const sqlitePath = process.env.SQLITE_PATH || './data/offline.db';
      const dbDir = path.dirname(sqlitePath);
      
      // Ensure directory exists
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          console.error('SQLite connection error:', err);
        } else {
          console.log('SQLite connected successfully');
        }
      });

    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async executeQuery(query, params = []) {
    try {
      const [rows] = await this.mysqlPool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('MySQL query error:', error);
      throw error;
    }
  }

  async executeSQLiteQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async beginTransaction() {
    const connection = await this.mysqlPool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection) {
    await connection.commit();
    connection.release();
  }

  async rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
  }

  async closeConnections() {
    if (this.mysqlPool) {
      await this.mysqlPool.end();
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}

module.exports = new DatabaseManager();
