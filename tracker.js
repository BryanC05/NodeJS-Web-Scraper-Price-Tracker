const cron = require('node-cron');
const fs = require('fs');

const ProductManager = require('./src/ProductManager');
const PriceHistory = require('./src/PriceHistory');
const Scraper = require('./src/Scraper');
const NotificationService = require('./src/notifications/NotificationService');

class PriceTracker {
  constructor() {
    this.settings = this.loadSettings();
    this.productManager = new ProductManager('./config/products.json');
    this.priceHistory = new PriceHistory(this.settings.database.path);
    this.scraper = new Scraper(this.settings);
    this.notifier = new NotificationService(this.settings.notifications);
  }

  loadSettings() {
    const data = fs.readFileSync('./config/settings.json', 'utf8');
    return JSON.parse(data);
  }

  async checkProduct(product) {
    console.log(`\n🔍 Checking: ${product.name}`);
    console.log(`   URL: ${product.url}`);

    try {
      const result = await this.scraper.scrape(product);
      console.log(`   💰 Current Price: ${product.currency}${result.price.toFixed(2)}`);

      this.priceHistory.record(product.id, result.price, product.currency);
      const stats = this.priceHistory.getStats(product.id);

      console.log(`   📊 Previous: ${product.currency}${stats.previous?.toFixed(2) || 'N/A'}`);
      console.log(`   📈 Change: ${stats.changePercent}%`);
      console.log(`   📉 Lowest Ever: ${product.currency}${stats.lowest?.price?.toFixed(2) || 'N/A'}`);

      const shouldNotify = this.shouldNotify(product, result.price, stats);
      
      if (shouldNotify) {
        console.log(`   🚨 Triggering notification!`);
        await this.notifier.notify(product, result.price, stats);
      } else {
        console.log(`   ✓ No alert triggered`);
      }

      return { success: true, price: result.price, stats };

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  shouldNotify(product, currentPrice, stats) {
    if (currentPrice < product.targetPrice) {
      const dropPercent = Math.abs(stats.changePercent);
      
      if (dropPercent >= (product.dropThreshold || this.settings.alerting.dropThreshold)) {
        return true;
      }

      if (product.notifyOnLowestEver && stats.isLowestEver) {
        return true;
      }
    }

    if (this.settings.alerting.notifyOnAnyChange && stats.previous && stats.changePercent !== 0) {
      return true;
    }

    return false;
  }

  async checkAllProducts() {
    const products = this.productManager.getEnabled();
    console.log(`\n📦 Checking ${products.length} product(s)...\n`);

    const results = await Promise.all(
      products.map(product => this.checkProduct(product))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Completed: ${successful} success, ${failed} failed`);
  }

  start() {
    console.log('🚀 Price Tracker Started');
    console.log(`📅 Schedule: ${this.settings.scheduler.checkInterval}`);
    console.log(`📦 Products: ${this.productManager.getEnabled().length} enabled\n`);

    if (this.settings.scheduler.runOnStartup) {
      this.checkAllProducts();
    }

    cron.schedule(this.settings.scheduler.checkInterval, () => {
      this.checkAllProducts();
    });
  }

  stop() {
    this.priceHistory.close();
  }
}

const tracker = new PriceTracker();
tracker.start();

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  tracker.stop();
  process.exit(0);
});
