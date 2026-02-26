require('dotenv').config();
const axios = require('axios');
const { JSDOM } = require('jsdom');

const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_API_KEY;

class SearchService {
  constructor() {
    this.failedRequests = 0;
  }

  async scrapeWithScrapingBee(url) {
    if (this.failedRequests > 5) {
      return null;
    }
    
    try {
      const apiUrl = 'https://app.scrapingbee.com/api/v1/';
      const params = {
        api_key: SCRAPINGBEE_KEY,
        url: url,
        render_js: true,
      };
      
      const response = await axios.get(apiUrl, { params, timeout: 30000 });
      
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        return response.data;
      } else if (response.data && response.data.error) {
        this.failedRequests++;
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.status >= 500) {
        this.failedRequests++;
      }
      return null;
    }
  }

  async searchAll(query) {
    console.log(`🔍 Searching for "${query}"...`);
    
    let results = [];
    
    const sources = [
      { name: 'Tokopedia', fn: () => this.searchTokopedia(query) },
      { name: 'Shopee', fn: () => this.searchShopee(query) },
      { name: 'Bukalapak', fn: () => this.searchBukalapak(query) },
      { name: 'Lazada', fn: () => this.searchLazada(query) },
    ];
    
    for (const source of sources) {
      try {
        const r = await source.fn();
        if (r.length > 0) {
          console.log(`✅ ${source.name}: ${r.length} results`);
          results.push(...r);
        }
      } catch (e) {
        console.log(`❌ ${source.name}: failed`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    results.sort((a, b) => a.price - b.price);

    const prices = results.map(r => r.price).filter(p => p);
    const cheapest = results.length > 0 ? results[0] : null;
    
    const priceRanges = {};
    results.forEach(r => {
      const range = Math.floor(r.price / 50000) * 50000;
      priceRanges[range] = (priceRanges[range] || 0) + 1;
    });
    const standardRange = Object.entries(priceRanges)
      .sort((a, b) => b[1] - a[1])[0];
    const standardPrice = standardRange ? parseFloat(standardRange[0]) + 50000 : 0;

    const averagePrice = prices.length > 0 
      ? prices.reduce((a, b) => a + b, 0) / prices.length 
      : 0;

    return {
      query,
      totalResults: results.length,
      cheapest,
      standardPrice: Math.round(standardPrice),
      averagePrice: Math.round(averagePrice),
      results: results.slice(0, 20),
      isDemo: results.length === 0,
      currency: 'IDR'
    };
  }

  async searchTokopedia(query) {
    const results = [];
    console.log('Searching Tokopedia...');
    
    try {
      const url = `https://www.tokopedia.com/search?q=${encodeURIComponent(query)}`;
      const html = await this.scrapeWithScrapingBee(url);
      
      if (!html) return results;
      
      const doc = new JSDOM(html).window.document;
      const items = doc.querySelectorAll('[data-testid]');
      
      items.forEach(item => {
        const titleEl = item.querySelector('[class*="title"]');
        const priceEl = item.querySelector('[class*="price"]');
        const imageEl = item.querySelector('img');
        const linkEl = item.querySelector('a');
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const priceText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
        const price = priceText ? parseInt(priceText) : 0;
        const image = imageEl ? imageEl.src : '';
        const link = linkEl ? linkEl.href : '';
        
        if (title && price > 0 && title.length < 100) {
          results.push({ title, price, image, link, source: 'Tokopedia' });
        }
      });
      
    } catch (error) {
      console.log('Tokopedia error:', error.message);
    }
    
    return results.slice(0, 10);
  }

  async searchShopee(query) {
    const results = [];
    console.log('Searching Shopee...');
    
    try {
      const url = `https://shopee.co.id/search?keyword=${encodeURIComponent(query)}`;
      const html = await this.scrapeWithScrapingBee(url);
      
      if (!html) return results;
      
      const doc = new JSDOM(html).window.document;
      const items = doc.querySelectorAll('[data-testid], [class*="item"]');
      
      items.forEach(item => {
        const titleEl = item.querySelector('[class*="title"]');
        const priceEl = item.querySelector('[class*="price"]');
        const imageEl = item.querySelector('img');
        const linkEl = item.querySelector('a');
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const priceText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
        const price = priceText ? parseInt(priceText) : 0;
        const image = imageEl ? imageEl.src : '';
        const link = linkEl ? 'https://shopee.co.id' + linkEl.href : '';
        
        if (title && price > 0 && title.length < 100) {
          results.push({ title, price, image, link, source: 'Shopee' });
        }
      });
      
    } catch (error) {
      console.log('Shopee error:', error.message);
    }
    
    return results.slice(0, 10);
  }

  async searchBukalapak(query) {
    const results = [];
    console.log('Searching Bukalapak...');
    
    try {
      const url = `https://www.bukalapak.com/products?search[keywords]=${encodeURIComponent(query)}`;
      const html = await this.scrapeWithScrapingBee(url);
      
      if (!html) return results;
      
      const doc = new JSDOM(html).window.document;
      const items = doc.querySelectorAll('[class*="product"], [class*="card"]');
      
      items.forEach(item => {
        const titleEl = item.querySelector('[class*="title"]');
        const priceEl = item.querySelector('[class*="price"]');
        const imageEl = item.querySelector('img');
        const linkEl = item.querySelector('a');
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const priceText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
        const price = priceText ? parseInt(priceText) : 0;
        const image = imageEl ? imageEl.src : '';
        const link = linkEl ? linkEl.href : '';
        
        if (title && price > 0 && title.length < 100) {
          results.push({ title, price, image, link, source: 'Bukalapak' });
        }
      });
      
    } catch (error) {
      console.log('Bukalapak error:', error.message);
    }
    
    return results.slice(0, 10);
  }

  async searchLazada(query) {
    const results = [];
    console.log('Searching Lazada...');
    
    try {
      const url = `https://www.lazada.co.id/catalog/?q=${encodeURIComponent(query)}`;
      const html = await this.scrapeWithScrapingBee(url);
      
      if (!html) return results;
      
      const doc = new JSDOM(html).window.document;
      const items = doc.querySelectorAll('[data-testid="product-card"], [class*="product"]');
      
      items.forEach(item => {
        const titleEl = item.querySelector('[class*="title"]');
        const priceEl = item.querySelector('[class*="price"]');
        const imageEl = item.querySelector('img');
        const linkEl = item.querySelector('a');
        
        const title = titleEl ? titleEl.textContent.trim() : '';
        const priceText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
        const price = priceText ? parseInt(priceText) : 0;
        const image = imageEl ? imageEl.src : '';
        const link = linkEl ? linkEl.href : '';
        
        if (title && price > 0 && title.length < 100) {
          results.push({ title, price, image, link, source: 'Lazada' });
        }
      });
      
    } catch (error) {
      console.log('Lazada error:', error.message);
    }
    
    return results.slice(0, 10);
  }
}

module.exports = SearchService;
