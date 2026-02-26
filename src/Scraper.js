const puppeteer = require('puppeteer');
const fs = require('fs');

class Scraper {
  constructor(settings) {
    this.settings = settings;
    this.userAgents = [];
    this.loadUserAgents();
  }

  loadUserAgents() {
    try {
      const data = fs.readFileSync('./config/user-agents.json', 'utf8');
      this.userAgents = JSON.parse(data);
    } catch (error) {
      console.warn('⚠️ Could not load user agents, using default');
      this.userAgents = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'];
    }
  }

  getRandomUserAgent() {
    if (!this.settings.browser.userAgentRotation) {
      return this.userAgents[0];
    }
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  getRandomDelay() {
    if (!this.settings.browser.randomDelay?.enabled) return 0;
    const { minMs, maxMs } = this.settings.browser.randomDelay;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  }

  async launchBrowser() {
    const args = ['--no-sandbox', '--disable-setuid-sandbox'];
    
    if (this.settings.proxy?.enabled) {
      args.push(`--proxy-server=http://${this.settings.proxy.host}:${this.settings.proxy.port}`);
    }

    return puppeteer.launch({
      headless: this.settings.browser.headless,
      args,
      executablePath: '/Users/user/.cache/puppeteer/chrome/mac-146.0.7680.31/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    });
  }

  async setupPage(browser) {
    const page = await browser.newPage();
    
    await page.setUserAgent(this.getRandomUserAgent());
    await page.setViewport({ width: 1920, height: 1080 });

    if (this.settings.proxy?.enabled && this.settings.proxy.username) {
      await page.authenticate({
        username: this.settings.proxy.username,
        password: this.settings.proxy.password,
      });
    }

    return page;
  }

  async scrape(product) {
    const delay = this.getRandomDelay();
    if (delay > 0) {
      console.log(`   ⏳ Waiting ${delay}ms before scraping...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const browser = await this.launchBrowser();
    
    try {
      const page = await this.setupPage(browser);
      
      await page.goto(product.url, { 
        waitUntil: 'networkidle2',
        timeout: this.settings.browser.timeout || 30000 
      });

      await page.waitForSelector(product.selector);

      const priceString = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerText : null;
      }, product.selector);

      if (!priceString) {
        throw new Error(`Could not find price element with selector: ${product.selector}`);
      }

      const price = parseFloat(priceString.replace(/[^0-9.]/g, ''));
      
      return {
        price,
        raw: priceString,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }
}

module.exports = Scraper;
