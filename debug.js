const puppeteer = require('puppeteer');

(async () => {
    console.log("1. Launching Browser...");
    // We use headless: false so you can WATCH what happens
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log("2. Going to Google...");
        // Try a known safe site
        await page.goto('https://www.google.com');
        console.log("✅ Google loaded successfully!");
        
        console.log("3. Going to Scrape Site...");
        // Try the scraper site with HTTPS
        await page.goto('https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html');
        console.log("✅ Scrape site loaded successfully!");

    } catch (error) {
        console.error("❌ ERROR HAPPENED HERE:");
        console.error(error);
    } finally {
        await browser.close();
    }
})();