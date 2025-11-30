const puppeteer = require('puppeteer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// --- CONFIGURATION ---
// We use the HTTPS link that we know works
const URL = 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html'; 

// The book is £51.77, so we set a higher threshold to trigger the alert immediately for testing
const TARGET_PRICE = 60.00; 

const CHECK_INTERVAL = '*/30 * * * *'; // Every 30 mins

// --- EMAIL CONFIGURATION ---
async function sendEmail(price) {
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
            user: testAccount.user, 
            pass: testAccount.pass, 
        },
    });

    let info = await transporter.sendMail({
        from: '"Price Tracker" <tracker@example.com>',
        to: "your_email@example.com",
        subject: "🚨 Price Drop Alert!",
        text: `The price is now ${price}! Buy it here: ${URL}`,
    });

    console.log("✅ Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

// --- SCRAPING LOGIC ---
async function checkPrice() {
    console.log('⏳ Checking price...');
    
    // Launch browser (headless: false so you can see it working)
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto(URL, { waitUntil: 'networkidle2' });

        // Selector for books.toscrape.com
        const selector = '.price_color'; 
        
        await page.waitForSelector(selector);

        // Get the text (e.g., "£51.77")
        let priceString = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            return element ? element.innerText : null;
        }, selector);

        if (!priceString) throw new Error("Could not find price element");

        // Clean the data: Remove "£" and any other non-number characters
        const price = parseFloat(priceString.replace(/[^0-9.]/g, ''));

        console.log(`🔎 Found Price: ${price}`);

        if (price < TARGET_PRICE) {
            console.log("📉 It's cheap! Sending email...");
            await sendEmail(price);
        } else {
            console.log("💰 Still too expensive.");
        }

    } catch (error) {
        console.error("❌ Error scraping:", error.message);
    } finally {
        await browser.close();
    }
}

// --- SCHEDULER ---
console.log("🚀 Price Tracker Started...");
checkPrice(); // Run once immediately to test

// Schedule the job
cron.schedule(CHECK_INTERVAL, () => {
    checkPrice();
});