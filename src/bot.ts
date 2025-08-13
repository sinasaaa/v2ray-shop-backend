import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';

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

bot.on(message('web_app_data'), (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data.read().toString());
    logger.info(`Received data from web app: ${JSON.stringify(data)}`);
    
    // Here you would typically trigger the order creation process
    // For now, we just acknowledge
    ctx.reply(`درخواست شما برای پلن ${data.planTitle} دریافت شد. منتظر بمانید...`);
  } catch (error) {
    logger.error('Failed to parse web_app_data', error);
    ctx.reply('خطایی در پردازش درخواست شما رخ داد.');
  }
});

export const startBot = () => {
  bot.launch();
  logger.info('🤖 Telegram Bot has been started successfully.');
};
