# 📉 Node.js Web Scraper & Price Tracker

A fully automated bot that monitors product prices on e-commerce websites. It runs on a schedule, scrapes the latest price using a headless browser (Puppeteer), and sends an email notification via SMTP when the price drops below your target.

## 🚀 Features

* **Headless Browsing:** Uses Puppeteer (Chrome) to render dynamic JavaScript-heavy websites (like Amazon/eBay).
* **Automated Scheduling:** Checks prices automatically at set intervals (e.g., every 30 minutes) using `node-cron`.
* **Email Alerts:** Sends HTML-formatted email notifications using `nodemailer` when a deal is found.
* **Anti-Bot Evasion:** Sets custom User-Agents to mimic real human browsing behavior.

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Browser Automation:** Puppeteer
* **Scheduling:** node-cron
* **Email Service:** Nodemailer

## ⚙️ Installation

1.  **Clone the repository** (or create your folder):
    ```bash
    git clone [https://github.com/yourusername/price-tracker.git](https://github.com/yourusername/price-tracker.git)
    cd price-tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## 🏃 Usage

1.  **Configure the Target:**
    Open `tracker.js` and edit the configuration variables at the top:
    ```javascript
    const URL = '[https://books.toscrape.com/](https://books.toscrape.com/)...'; // The item to track
    const TARGET_PRICE = 50.00; // Your desired price
    const selector = '.price_color'; // The CSS class/ID of the price
    ```

2.  **Run the Tracker:**
    ```bash
    node tracker.js
    ```

3.  **Visual Debugging:**
    If the scraper fails to find the element, change the headless mode in `tracker.js` to see what the bot sees:
    ```javascript
    const browser = await puppeteer.launch({ headless: false });
    ```

## 🐛 Troubleshooting

* **`Waiting for selector failed`**: The CSS selector is wrong, or the website layout changed. Use "Inspect Element" in your browser to find the new class or ID.
* **`net::ERR_BLOCKED_BY_CLIENT`**: Ensure you are using `https://` instead of `http://`.
* **Bot Detection**: If a site blocks you, try increasing the timeout or rotating User-Agent strings.

-----

#### 1\. Quotes to Scrape (Text Scraping)

A sandbox site made specifically for testing scrapers.

  * **Goal:** Scrape the text of the first quote.
  * **URL:** `https://quotes.toscrape.com/`
  * **Selector:** `.text`
  * **Expected Output:** "The world as we have created it is a process of our thinking..."

#### 2\. Wikipedia (Static Data)

Wikipedia is very stable and great for testing. Let's track the "Born" date of Elon Musk.

  * **Goal:** Scrape a specific data point from an infobox.
  * **URL:** `https://en.wikipedia.org/wiki/Elon_Musk`
  * **Selector:** `.bday`
  * **Expected Output:** "1971-06-28"

#### 3\. eBay (Real E-commerce)

eBay is often easier to scrape than Amazon, but it is still a real site with dynamic classes.

  * **Goal:** Scrape the main price of a camera.
  * **URL:** (Search for any item, e.g., "Sony a7iii", and click a listing)
  * **Selector:** `.x-price-primary` (Note: This changes occasionally. You might need `.x-price-approx__price` depending on the listing type).

### How to use these:

1.  Open your `tracker.js`.
2.  Update the `URL` variable.
3.  Update the `selector` variable inside the `checkPrice` function.
4.  Run `node tracker.js`.
