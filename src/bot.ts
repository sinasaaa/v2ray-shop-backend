// ===== FINAL MODIFIED CODE (Section: src/bot.ts) =====

// ===== IMPORTS & DEPENDENCIES =====
import { Telegraf, Context, Markup, session } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { testPanelConnection } from './utils/api'; // Import our new test function
import fs from 'fs'; // Import File System module to write to .env
import path from 'path'; // Import Path module for correct file path

const prisma = new PrismaClient();

// ===== TYPES & INTERFACES =====
interface MyContext extends Context {
    session: {
        // We expand the scene types
        scene?: 'add_plan_title' | 'add_plan_description' | 'add_plan_price' | 'add_plan_duration' | 'add_plan_datalimit' |
                'set_panel_url' | 'set_panel_user' | 'set_panel_pass';
        planData?: any;
        panelData?: any; // Add a new property for panel data
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

// Function to update the .env file
const updateEnvFile = (key: string, value: string) => {
    const envFilePath = path.resolve(__dirname, '../../.env'); // Go up two directories to find .env
    let envFileContent = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf-8') : '';

    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    if (envFileContent.match(keyRegex)) {
        // Key exists, update it
        envFileContent = envFileContent.replace(keyRegex, `${key}=${value}`);
    } else {
        // Key does not exist, append it
        envFileContent += `\n${key}=${value}`;
    }
    fs.writeFileSync(envFilePath, envFileContent.trim());
};

// ===== BOT INITIALIZATION =====
export const bot = new Telegraf<MyContext>(BOT_TOKEN);

bot.use(session({
    defaultSession: () => ({
        scene: undefined,
        planData: {},
        panelData: {},
    })
}));

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
        // Admin Menu with new button
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

// Start "Add Plan" scene
bot.hears('➕ افزودن پلن', (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.scene = 'add_plan_title';
    ctx.session.planData = {};
    ctx.reply('لطفا عنوان پلن را وارد کنید:');
});

// Start "Set Panel" scene
bot.hears('⚙️ تنظیمات پنل', (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.scene = 'set_panel_url';
    ctx.session.panelData = {};
    ctx.reply('لطفا آدرس کامل پنل را وارد کنید (مثال: http://1.2.3.4:2053):');
});

// --- 3. Customer Logic (Remains the same) ---
bot.hears('🛍️ خرید سرویس', async (ctx) => { /* ... existing code ... */ });
bot.action(/buy_plan_(\d+)/, async (ctx) => { /* ... existing code ... */ });

// --- 4. Scene Management ---
bot.on(message('text'), async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.scene) return;

    const text = ctx.message.text.trim();
    const scene = ctx.session.scene;

    // --- Add Plan Scene Logic ---
    if (scene.startsWith('add_plan_')) {
        switch (scene) {
            case 'add_plan_title':
                ctx.session.planData.title = text;
                ctx.session.scene = 'add_plan_description';
                ctx.reply('عالی! حالا توضیحات پلن را وارد کنید:');
                break;
            // ... other plan cases ...
            case 'add_plan_datalimit':
                const dataLimitGB = parseInt(text, 10);
                const dataLimitBytes = BigInt(dataLimitGB) * BigInt(1024 * 1024 * 1024);
                
                await prisma.plan.create({ /* ... existing code ... */ });
                
                await ctx.reply('✅ پلن با موفقیت اضافه شد!');
                ctx.session.scene = undefined;
                break;
        }
    }

    // --- Set Panel Scene Logic ---
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
                    // Save credentials to .env file
                    updateEnvFile('PANEL_URL', url);
                    updateEnvFile('PANEL_USERNAME', user);
                    updateEnvFile('PANEL_PASSWORD', pass);

                    await ctx.reply('✅ اتصال با موفقیت برقرار شد و اطلاعات پنل ذخیره شد!\nلطفا ربات را ری‌استارت کنید تا تغییرات اعمال شوند.');
                } else {
                    await ctx.reply('❌ اتصال به پنل با این مشخصات ناموفق بود. لطفا دوباره تلاش کنید.\nبرای شروع مجدد، روی دکمه "تنظیمات پنل" کلیک کنید.');
                }
                
                // Reset the scene
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
