// ===== FINAL CORRECTED CODE (Section: src/bot.ts) =====

// ===== IMPORTS & DEPENDENCIES =====
import { Telegraf, Context, Markup, session } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { testPanelConnection } from './utils/api';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ===== TYPES & INTERFACES =====
interface MyContext extends Context {
    session: {
        scene?: 'add_plan_title' | 'add_plan_description' | 'add_plan_price' | 'add_plan_duration' | 'add_plan_datalimit' |
                'set_panel_url' | 'set_panel_user' | 'set_panel_pass';
        planData?: any;
        panelData?: any;
    };
}

// ===== CONFIGURATION & CONSTANTS =====
const BOT_TOKEN = process.env.BOT_TOKEN || '';
if (!BOT_TOKEN) {
    logger.error('BOT_TOKEN is not defined!');
    process.exit(1);
}
const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => parseInt(id.trim(), 10));

// ===== UTILITY FUNCTIONS =====
const isAdmin = (ctx: Context): boolean => {
    return ctx.from ? ADMIN_IDS.includes(ctx.from.id) : false;
};

const updateEnvFile = (key: string, value: string) => {
    // Correctly determine the path to the .env file in the project root
    const envFilePath = path.resolve(__dirname, '..', '..', '.env');
    let envFileContent = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf-8') : '';

    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    const newEntry = `${key}=${value}`;

    if (keyRegex.test(envFileContent)) {
        envFileContent = envFileContent.replace(keyRegex, newEntry);
    } else {
        envFileContent += `\n${newEntry}`;
    }
    fs.writeFileSync(envFilePath, envFileContent.trim());
};


// ===== BOT INITIALIZATION =====
export const bot = new Telegraf<MyContext>(BOT_TOKEN);
bot.use(session({ defaultSession: () => ({ scene: undefined, planData: {}, panelData: {} }) }));


// ===== CORE BOT LOGIC =====

// --- 1. /start command ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    logger.info(`User ${userId} started the bot.`);

    await prisma.user.upsert({
        where: { id: userId },
        update: { firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username },
        create: { id: userId, firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username },
    });
    
    ctx.session.scene = undefined;

    if (isAdmin(ctx)) {
        // Admin Menu
        const adminKeyboard = Markup.keyboard([
            ['➕ افزودن پلن', '📋 لیست پلن‌ها'],
            ['⚙️ تنظیمات پنل', '📊 آمار فروش'],
            ['👥 لیست کاربران']
        ]).resize();
        await ctx.reply('سلام ادمین! به پنل مدیریت خوش آمدید.', adminKeyboard);
    } else {
        // Customer Menu
        const customerKeyboard = Markup.keyboard([
            ['🛍️ خرید سرویس', '💳 سرویس‌های من'],
            ['📞 پشتیبانی', '👤 پروفایل']
        ]).resize();
        await ctx.reply('سلام! به فروشگاه ما خوش آمدید.', customerKeyboard);
    }
});


// --- 2. Admin Logic ---

// This is the listener for the button we were missing
bot.hears('⚙️ تنظیمات پنل', (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.scene = 'set_panel_url';
    ctx.session.panelData = {}; // Reset previous data
    ctx.reply('لطفا آدرس کامل پنل را وارد کنید (مثال: http://1.2.3.4:2053):');
});

bot.hears('➕ افزودن پلن', (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.scene = 'add_plan_title';
    ctx.session.planData = {};
    ctx.reply('لطفا عنوان پلن را وارد کنید:');
});


// --- 3. Customer Logic ---
bot.hears('🛍️ خرید سرویس', async (ctx) => {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    if (plans.length === 0) {
        return ctx.reply('متاسفانه در حال حاضر هیچ پلن فعالی وجود ندارد.');
    }
    const inlineKeyboard = plans.map(plan => [
        Markup.button.callback(`${plan.title} - ${plan.price.toLocaleString()} تومان`, `buy_plan_${plan.id}`)
    ]);
    await ctx.reply('لطفا یکی از پلن‌های زیر را انتخاب کنید:', Markup.inlineKeyboard(inlineKeyboard));
});

bot.action(/buy_plan_(\d+)/, async (ctx) => {
    // ... same as before
    const planId = parseInt(ctx.match[1], 10);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return ctx.answerCbQuery('خطا: پلن مورد نظر یافت نشد!', { show_alert: true });
    await ctx.editMessageText(`شما پلن "${plan.title}" را انتخاب کردید. در حال انتقال به درگاه پرداخت...`);
});


// --- 4. General Text Message Handler (Scene Management) ---
bot.on(message('text'), async (ctx) => {
    // Ignore if not an admin in a scene, or if the text is a command/button
    if (!isAdmin(ctx) || !ctx.session.scene || ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text.trim();
    const scene = ctx.session.scene;

    // --- Scene: Adding a Plan ---
    if (scene.startsWith('add_plan_')) {
        switch (scene) {
            case 'add_plan_title':
                ctx.session.planData.title = text;
                ctx.session.scene = 'add_plan_description';
                ctx.reply('عالی! حالا توضیحات پلن را وارد کنید:');
                break;
            case 'add_plan_description':
                ctx.session.planData.description = text;
                ctx.session.scene = 'add_plan_price';
                ctx.reply('بسیار خب. قیمت پلن را به تومان (فقط عدد) وارد کنید:');
                break;
            case 'add_plan_price':
                ctx.session.planData.price = parseFloat(text);
                ctx.session.scene = 'add_plan_duration';
                ctx.reply('مدت زمان پلن را به روز (فقط عدد) وارد کنید: (مثلا: 30)');
                break;
            case 'add_plan_duration':
                ctx.session.planData.duration = parseInt(text, 10);
                ctx.session.scene = 'add_plan_datalimit';
                ctx.reply('حجم پلن را به گیگابایت (GB - فقط عدد) وارد کنید: (مثلا: 50)');
                break;
            case 'add_plan_datalimit':
                const dataLimitGB = parseInt(text, 10);
                const dataLimitBytes = BigInt(dataLimitGB) * BigInt(1024 * 1024 * 1024);
                
                await prisma.plan.create({
                    data: {
                        title: ctx.session.planData.title,
                        description: ctx.session.planData.description,
                        price: ctx.session.planData.price,
                        duration: ctx.session.planData.duration,
                        dataLimit: dataLimitBytes,
                    }
                });
                await ctx.reply('✅ پلن با موفقیت اضافه شد!');
                ctx.session.scene = undefined;
                break;
        }
    } 
    // --- Scene: Setting Panel Credentials ---
    else if (scene.startsWith('set_panel_')) {
        switch (scene) {
            case 'set_panel_url':
                ctx.session.panelData.url = text;
                ctx.session.scene = 'set_panel_user';
                ctx.reply('آدرس ثبت شد. حالا نام کاربری ادمین پنل را وارد کنید:');
                break;
            case 'set_panel_user':
                ctx.session.panelData.user = text;
                ctx.session.scene = 'set_panel_pass';
                ctx.reply('نام کاربری ثبت شد. حالا رمز عبور ادمین پنل را وارد کنید:');
                break;
            case 'set_panel_pass':
                ctx.session.panelData.pass = text;
                await ctx.reply('در حال تست اتصال به پنل، لطفا صبر کنید...');

                const { url, user, pass } = ctx.session.panelData;
                const isConnected = await testPanelConnection(url, user, pass);

                if (isConnected) {
                    updateEnvFile('PANEL_URL', url);
                    updateEnvFile('PANEL_USERNAME', user);
                    updateEnvFile('PANEL_PASSWORD', pass);
                    await ctx.reply('✅ اتصال با موفقیت برقرار شد و اطلاعات پنل ذخیره شد!\n\n**مهم:** لطفا ربات را یک بار ری‌استارت کنید تا از تنظیمات جدید استفاده کند.');
                } else {
                    await ctx.reply('❌ اتصال به پنل با این مشخصات ناموفق بود. لطفا دوباره با کلیک روی دکمه "تنظیمات پنل" تلاش کنید.');
                }
                
                ctx.session.scene = undefined;
                break;
        }
    }
});


// ===== ERROR HANDLING & STARTUP =====
bot.catch((err, ctx) => {
    logger.error(`Error for ${ctx.updateType}`, err);
});

export const startBot = () => {
    bot.launch();
    logger.info('🤖 Telegram Bot (Pure) has been started successfully.');
};
