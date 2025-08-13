// ===== FINAL MODIFIED CODE: src/bot.ts =====

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';

// --- Type Definitions ---
// We define the shape of the data we expect from our Mini App.
interface MiniAppData {
  planId: string;
  planTitle: string;
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is not defined in .env file!');
  process.exit(1);
}

const WEB_APP_URL = process.env.WEB_APP_URL || '';

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  logger.info(`User ${ctx.from.id} started the bot.`);
  ctx.reply(
    'سلام! به فروشگاه کانفیگ خوش آمدید. برای مشاهده و خرید پلن‌ها، روی دکمه زیر کلیک کنید.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 ورود به فروشگاه', web_app: { url: WEB_APP_URL } }],
        ],
      },
    }
  );
});

// This is the final corrected section
bot.on(message('web_app_data'), (ctx) => {
  if (ctx.webAppData) {
    try {
      // Tell TypeScript to trust us: "Treat the result of json() AS MiniAppData"
      const data = ctx.webAppData.data.json() as MiniAppData;
      
      // Now TypeScript knows that data.planTitle is a string and allows access.
      logger.info(`Received data from web app: ${JSON.stringify(data)}`);
      ctx.reply(`درخواست شما برای پلن "${data.planTitle}" دریافت شد. منتظر بمانید...`);

    } catch (error) {
      logger.error('Failed to parse web_app_data', error);
      ctx.reply('خطایی در پردازش درخواست شما رخ داد.');
    }
  } else {
    logger.warn('Received a message of type web_app_data but the data was undefined.');
  }
});

export const startBot = () => {
  bot.launch();
  logger.info('🤖 Telegram Bot has been started successfully.');
};
