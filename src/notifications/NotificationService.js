const nodemailer = require('nodemailer');
const axios = require('axios');

class NotificationService {
  constructor(config) {
    this.config = config;
    this.emailTransporter = null;
  }

  async initEmail() {
    if (!this.config.email?.enabled) return;
    
    const testAccount = await nodemailer.createTestAccount();
    this.emailTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('✅ Email notifier initialized');
  }

  async notify(product, price, stats) {
    const notifications = [];
    
    if (this.config.email?.enabled) {
      notifications.push(this.sendEmail(product, price, stats));
    }
    
    if (this.config.discord?.enabled && this.config.discord.webhookUrl) {
      notifications.push(this.sendDiscord(product, price, stats));
    }
    
    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      notifications.push(this.sendSlack(product, price, stats));
    }
    
    if (this.config.telegram?.enabled && this.config.telegram.botToken && this.config.telegram.chatId) {
      notifications.push(this.sendTelegram(product, price, stats));
    }

    await Promise.all(notifications);
  }

  async sendEmail(product, price, stats) {
    if (!this.emailTransporter) await this.initEmail();

    const isLowest = stats.isLowestEver;
    const changePercent = stats.changePercent;
    
    let subject = `Price Alert: ${product.name}`;
    if (isLowest) subject = `🔥 LOWEST EVER: ${product.name}`;
    else if (changePercent < 0) subject = `📉 Price Drop: ${product.name}`;

    const html = `
      <h2>${subject}</h2>
      <p><strong>Product:</strong> ${product.name}</p>
      <p><strong>Current Price:</strong> ${product.currency}${price.toFixed(2)}</p>
      <p><strong>Target Price:</strong> ${product.currency}${product.targetPrice.toFixed(2)}</p>
      <p><strong>Previous Price:</strong> ${product.currency}${stats.previous?.toFixed(2) || 'N/A'}</p>
      <p><strong>Change:</strong> ${stats.changePercent}%</p>
      <p><strong>Lowest Ever:</strong> ${product.currency}${stats.lowest?.price?.toFixed(2) || 'N/A'}</p>
      <p><strong>Status:</strong> ${isLowest ? '🔥 LOWEST EVER!' : 'Below target!'}</p>
      <hr>
      <p><a href="${product.url}" target="_blank">View Product</a></p>
    `;

    const info = await this.emailTransporter.sendMail({
      from: '"Price Tracker" <tracker@example.com>',
      to: this.config.email.to,
      subject,
      html,
    });

    console.log(`✅ Email sent! Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  async sendDiscord(product, price, stats) {
    const isLowest = stats.isLowestEver;
    const color = isLowest ? 16711680 : 65280;
    
    const embed = {
      embeds: [{
        title: isLowest ? `🔥 LOWEST EVER: ${product.name}` : `Price Alert: ${product.name}`,
        color,
        fields: [
          { name: 'Current Price', value: `${product.currency}${price.toFixed(2)}`, inline: true },
          { name: 'Target Price', value: `${product.currency}${product.targetPrice.toFixed(2)}`, inline: true },
          { name: 'Change', value: `${stats.changePercent}%`, inline: true },
          { name: 'Lowest Ever', value: `${product.currency}${stats.lowest?.price?.toFixed(2) || 'N/A'}`, inline: true },
        ],
        url: product.url,
        timestamp: new Date().toISOString()
      }]
    };

    await axios.post(this.config.discord.webhookUrl, embed);
    console.log('✅ Discord notification sent');
  }

  async sendSlack(product, price, stats) {
    const isLowest = stats.isLowestEver;
    const emoji = isLowest ? ':fire:' : ':arrow_down:';
    
    const payload = {
      text: isLowest ? `🔥 LOWEST EVER PRICE: ${product.name}` : `Price Alert: ${product.name}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} ${product.name}` }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Current Price:*\n${product.currency}${price.toFixed(2)}` },
            { type: 'mrkdwn', text: `*Target:*\n${product.currency}${product.targetPrice.toFixed(2)}` },
            { type: 'mrkdwn', text: `*Change:*\n${stats.changePercent}%` },
            { type: 'mrkdwn', text: `*Lowest Ever:*\n${product.currency}${stats.lowest?.price?.toFixed(2) || 'N/A'}` }
          ]
        },
        { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'View Product' }, url: product.url }] }
      ]
    };

    await axios.post(this.config.slack.webhookUrl, payload);
    console.log('✅ Slack notification sent');
  }

  async sendTelegram(product, price, stats) {
    const isLowest = stats.isLowestEver;
    const emoji = isLowest ? '🔥' : '📉';
    
    const text = `${emoji} *Price Alert: ${product.name}*

Current: ${product.currency}${price.toFixed(2)}
Target: ${product.currency}${product.targetPrice.toFixed(2)}
Change: ${stats.changePercent}%
${isLowest ? '\n🔥 LOWEST EVER!' : ''}

[View Product](${product.url})`;

    await axios.post(`https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`, {
      chat_id: this.config.telegram.chatId,
      text,
      parse_mode: 'Markdown'
    });
    console.log('✅ Telegram notification sent');
  }
}

module.exports = NotificationService;
