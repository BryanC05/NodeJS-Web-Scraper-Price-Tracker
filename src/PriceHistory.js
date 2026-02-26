const DatabaseManager = require('./database');

class PriceHistory {
  constructor(dbPath = './data/prices.db') {
    this.db = new DatabaseManager(dbPath);
  }

  record(productId, price, currency = '$') {
    return this.db.insertPrice(productId, price, currency);
  }

  getHistory(productId, limit = 100) {
    return this.db.getPrices(productId, limit);
  }

  getLatest(productId) {
    return this.db.getLatestPrice(productId);
  }

  getLowest(productId) {
    return this.db.getLowestPrice(productId);
  }

  getRange(productId, days) {
    return this.db.getPriceRange(productId, days);
  }

  getStats(productId) {
    const latest = this.getLatest(productId);
    const lowest = this.getLowest(productId);
    const history = this.getHistory(productId, 2);
    
    let previousPrice = null;
    let change = 0;
    let changePercent = 0;
    
    if (history.length >= 2) {
      previousPrice = history[1].price;
      change = latest.price - previousPrice;
      changePercent = previousPrice ? ((change / previousPrice) * 100).toFixed(2) : 0;
    }

    return {
      current: latest,
      lowest,
      previous: previousPrice,
      change,
      changePercent: parseFloat(changePercent),
      isLowestEver: lowest && latest && latest.price === lowest.price
    };
  }

  getAllStats() {
    return this.db.getAllProductsWithStats();
  }

  close() {
    this.db.close();
  }
}

module.exports = PriceHistory;
