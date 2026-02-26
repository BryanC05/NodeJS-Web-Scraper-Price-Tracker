const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath = './data/prices.db') {
    this.dbPath = path.resolve(dbPath);
    this.ensureDirectory();
    this.db = null;
    this.init();
  }

  ensureDirectory() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  init() {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.createTables();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT DEFAULT '$',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);
      CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp);
    `);
  }

  insertPrice(productId, price, currency = '$') {
    const stmt = this.db.prepare(
      'INSERT INTO prices (product_id, price, currency) VALUES (?, ?, ?)'
    );
    return stmt.run(productId, price, currency);
  }

  getPrices(productId, limit = 100) {
    const stmt = this.db.prepare(
      'SELECT * FROM prices WHERE product_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(productId, limit);
  }

  getLatestPrice(productId) {
    const stmt = this.db.prepare(
      'SELECT * FROM prices WHERE product_id = ? ORDER BY timestamp DESC LIMIT 1'
    );
    return stmt.get(productId);
  }

  getLowestPrice(productId) {
    const stmt = this.db.prepare(
      'SELECT * FROM prices WHERE product_id = ? ORDER BY price ASC LIMIT 1'
    );
    return stmt.get(productId);
  }

  getPriceRange(productId, days) {
    const stmt = this.db.prepare(`
      SELECT * FROM prices 
      WHERE product_id = ? 
      AND timestamp >= datetime('now', '-${days} days')
      ORDER BY timestamp ASC
    `);
    return stmt.all(productId);
  }

  getAllProductsWithStats() {
    const stmt = this.db.prepare(`
      SELECT 
        p.product_id,
        p.price as current_price,
        p.currency,
        p.timestamp as last_checked,
        (SELECT MIN(price) FROM prices WHERE product_id = p.product_id) as lowest_price,
        (SELECT MAX(price) FROM prices WHERE product_id = p.product_id) as highest_price,
        (SELECT COUNT(*) FROM prices WHERE product_id = p.product_id) as total_checks
      FROM prices p
      INNER JOIN (
        SELECT product_id, MAX(timestamp) as max_ts
        FROM prices
        GROUP BY product_id
      ) latest ON p.product_id = latest.product_id AND p.timestamp = latest.max_ts
    `);
    return stmt.all();
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;
