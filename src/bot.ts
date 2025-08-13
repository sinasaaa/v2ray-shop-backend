// ===== IMPORTS & DEPENDENCIES =====
import { Telegraf, Context, Markup, session } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===== TYPES & INTERFACES =====
// Define a custom context type that includes the session
interface MyContext extends Context {
    session: {
        scene?: 'add_plan_title' | 'add_plan_description' | 'add_plan_price' | 'add_plan_duration' | 'add_plan_datalimit';
        planData?: any;
    };
}

// ===== CONFIGURATION & CONSTANTS =====
const BOT_TOKEN = process.env.BOT_TOKEN || '';
if (!BOT_TOKEN) {
    logger.error('BOT_TOKEN is not defined!');
    process.exit(1);
}

// خواندن آیدی ادمین‌ها از فایل .env
const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => parseInt(id.trim(), 10));

// ===== UTILITY FUNCTIONS =====
const isAdmin = (ctx: Context): boolean => {
    return ctx.from ? ADMIN_IDS.includes(ctx.from.id) : false;
};

// ===== BOT INITIALIZATION =====
export const bot = new Telegraf<MyContext>(BOT_TOKEN);

// Use session middleware
bot.use(session());

// ===== CORE BOT LOGIC =====

// --- 1. /start command ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    logger.info(`User ${userId} started the bot.`);

    // Upsert user in the database
    await prisma.user.upsert({
        where: { id: userId },
        update: { firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username },
        create: { id: userId, firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username },
    });
    
    // Reset any ongoing scene
    ctx.session.scene = undefined;

    if (isAdmin(ctx)) {
        // Admin Menu
        const adminKeyboard = Markup.keyboard([
            ['➕ افزودن پلن', '📋 لیست پلن‌ها'],
            ['📊 آمار فروش', '👥 لیست کاربران']
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

// --- 3. Customer Logic ---

// Show available plans
bot.hears('🛍️ خرید سرویس', async (ctx) => {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    if (plans.length === 0) {
        return ctx.reply('متاسفانه در حال حاضر هیچ پلن فعالی وجود ندارد.');
    }

    const inlineKeyboard = plans.map(plan => [
        Markup.button.callback(
            `${plan.title} - ${plan.price.toLocaleString()} تومان`,
            `buy_plan_${plan.id}`
        )
    ]);

    await ctx.reply('لطفا یکی از پلن‌های زیر را انتخاب کنید:', Markup.inlineKeyboard(inlineKeyboard));
});

// Handle plan purchase callback
bot.action(/buy_plan_(\d+)/, async (ctx) => {
    const planId = parseInt(ctx.match[1], 10);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!plan) {
        return ctx.answerCbQuery('خطا: پلن مورد نظر یافت نشد!', { show_alert: true });
    }
    
    // Here you would integrate with a payment gateway
    // For now, we simulate a successful purchase
    await ctx.editMessageText(`شما پلن "${plan.title}" را انتخاب کردید. در حال انتقال به درگاه پرداخت...`);
    // TODO: Create an order, generate payment link, and send it to the user.
});


// --- 4. Scene Management for Adding a Plan (Admin) ---
bot.on(message('text'), async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.scene) return;

    const text = ctx.message.text;

    switch (ctx.session.scene) {
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
            
            // Create plan in the database
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
            // Reset the scene
            ctx.session.scene = undefined;
            break;
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
