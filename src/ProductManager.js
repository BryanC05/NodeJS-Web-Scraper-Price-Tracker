const fs = require('fs');
const path = require('path');

class ProductManager {
  constructor(configPath = './config/products.json') {
    this.configPath = path.resolve(configPath);
    this.products = [];
    this.load();
  }

  load() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      this.products = JSON.parse(data);
      console.log(`📦 Loaded ${this.products.length} products from config`);
    } catch (error) {
      console.error('❌ Failed to load products config:', error.message);
      this.products = [];
    }
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.products, null, 2));
      console.log('✅ Products config saved');
    } catch (error) {
      console.error('❌ Failed to save products config:', error.message);
    }
  }

  getAll() {
    return this.products;
  }

  getEnabled() {
    return this.products.filter(p => p.enabled);
  }

  getById(id) {
    return this.products.find(p => p.id === id);
  }

  add(product) {
    const existing = this.products.find(p => p.id === product.id);
    if (existing) {
      throw new Error(`Product with id "${product.id}" already exists`);
    }
    this.products.push({
      id: product.id,
      name: product.name,
      url: product.url,
      selector: product.selector,
      targetPrice: product.targetPrice,
      currency: product.currency || '$',
      enabled: product.enabled !== false,
      dropThreshold: product.dropThreshold || 5,
      notifyOnLowestEver: product.notifyOnLowestEver !== false
    });
    this.save();
    return this.getById(product.id);
  }

  update(id, updates) {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Product with id "${id}" not found`);
    }
    this.products[index] = { ...this.products[index], ...updates };
    this.save();
    return this.products[index];
  }

  remove(id) {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Product with id "${id}" not found`);
    }
    const removed = this.products.splice(index, 1)[0];
    this.save();
    return removed;
  }

  enable(id) {
    return this.update(id, { enabled: true });
  }

  disable(id) {
    return this.update(id, { enabled: false });
  }
}

module.exports = ProductManager;
