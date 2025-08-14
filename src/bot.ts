// ===== FINAL CORRECTED CODE (Section: src/bot.ts) - PascalCase to camelCase fix =====

// (Imports and other initial setup remain the same)
import { Telegraf, Context, Markup, session } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';
import { PrismaClient, UserRole } from '@prisma/client';
import { testPanelConnection } from './utils/api';

const prisma = new PrismaClient();
// ... (Interfaces, Constants, etc. remain the same) ...

export const bot = new Telegraf<MyContext>(BOT_TOKEN);
bot.use(session({ defaultSession: () => ({ /* ... */ }) }));

// --- /start command ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userRole = isAdmin(ctx) ? UserRole.ADMIN : UserRole.STUDENT;

    // CORRECTED: prisma.user instead of prisma.User
    await prisma.user.upsert({
        where: { id: userId },
        update: { firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username, role: userRole },
        create: { id: userId, firstName: ctx.from.first_name, lastName: ctx.from.last_name, username: ctx.from.username, role: userRole },
    });
    
    // ... (rest of the start command is correct) ...
});

// --- Admin Logic ---
bot.hears('⚙️ تنظیمات پنل', async (ctx) => {
    if (!isAdmin(ctx)) return;
    
    // CORRECTED: prisma.panel instead of prisma.Panel
    const existingPanel = await prisma.panel.findUnique({
        where: { userId: ctx.from.id }
    });

    // ... (rest of the handler is correct) ...
});

bot.hears('📋 لیست پلن‌ها', async (ctx) => {
    if (!isAdmin(ctx)) return;
    // CORRECTED: prisma.plan instead of prisma.Plan
    const plans = await prisma.plan.findMany();
    if (plans.length === 0) return ctx.reply('هیچ پلنی یافت نشد.');
    const planList = plans.map(p => `🔹 ${p.title} - ${p.price} تومان - ${p.duration} روز - ${Number(p.dataLimit) / 1024**3} گیگ`).join('\n');
    await ctx.reply(`لیست پلن‌ها:\n\n${planList}`);
});

// ... (Other admin handlers) ...

// --- Customer Logic ---
bot.hears('🛍️ خرید سرویس', async (ctx) => {
    // CORRECTED: prisma.plan instead of prisma.Plan
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    // ... (rest of the handler is correct) ...
});

bot.action(/buy_plan_(\d+)/, async (ctx) => {
    const planId = parseInt(ctx.match[1], 10);
    // CORRECTED: prisma.plan instead of prisma.Plan
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    // ... (rest of the handler is correct) ...
});

// --- Scene Management ---
bot.on(message('text'), async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.scene || ctx.message.text.startsWith('/')) return;
    const scene = ctx.session.scene;

    // Scene: Adding a Plan
    if (scene.startsWith('add_plan_')) {
        switch (scene) {
            // ... (cases for adding plan) ...
            case 'add_plan_datalimit':
                // ...
                // CORRECTED: prisma.plan instead of prisma.Plan
                await prisma.plan.create({ data: { /* ... */ } });
                await ctx.reply('✅ پلن با موفقیت اضافه شد!');
                ctx.session.scene = undefined;
                break;
        }
    } 
    // Scene: Setting Panel Credentials
    else if (scene.startsWith('set_panel_')) {
        switch (scene) {
            // ... (cases for setting panel) ...
            case 'set_panel_pass':
                // ...
                const { url, user, pass } = ctx.session.panelData;
                const isConnected = await testPanelConnection(url, user, pass);

                if (isConnected) {
                    // CORRECTED: prisma.panel instead of prisma.Panel
                    await prisma.panel.upsert({
                        where: { userId: ctx.from.id },
                        update: { url, username: user, password: pass },
                        create: { userId: ctx.from.id, url, username: user, password: pass }
                    });
                    await ctx.reply('✅ اتصال با موفقیت برقرار شد و اطلاعات پنل در حساب شما ذخیره شد!');
                } else {
                    await ctx.reply('❌ اتصال به پنل با این مشخصات ناموفق بود. لطفا دوباره تلاش کنید.');
                }
                
                ctx.session.scene = undefined;
                break;
        }
    }
});

// (Error handling and startup remain the same)
// ...
