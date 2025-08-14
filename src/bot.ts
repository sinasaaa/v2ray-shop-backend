// ===== FINAL MULTI-PANEL CODE (Section: src/bot.ts) =====

// (تمام بخش‌های IMPORTS و ... مثل قبل)
// ...
// We no longer need the 'fs' and 'path' imports for updateEnvFile
import { Telegraf, Context, Markup, session } from 'telegraf';
import { message } from 'telegraf/filters';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { testPanelConnection } from './utils/api';

const prisma = new PrismaClient();
// ... (MyContext, BOT_TOKEN, ADMIN_IDS, isAdmin, bot.use(session) all remain the same)
// ...

// We no longer need the updateEnvFile function.

// --- /start command ---
bot.start(async (ctx) => {
    // ... existing start logic remains the same ...
});

// --- Admin Logic ---
bot.hears('⚙️ تنظیمات پنل', async (ctx) => {
    if (!isAdmin(ctx)) return;
    
    // Check if the admin already has panel settings
    const existingPanel = await prisma.panel.findUnique({
        where: { userId: ctx.from.id }
    });

    if (existingPanel) {
        await ctx.reply(
            `شما قبلاً تنظیمات پنل را ثبت کرده‌اید:\n` +
            `آدرس: ${existingPanel.url}\n` +
            `برای تغییر، مراحل زیر را دنبال کنید.`
        );
    }

    ctx.session.scene = 'set_panel_url';
    ctx.session.panelData = {};
    ctx.reply('لطفا آدرس کامل پنل را وارد کنید (شامل بخش تصادفی آخر):');
});

// (Other bot.hears logic remains the same)

// --- Scene Management ---
bot.on(message('text'), async (ctx) => {
    if (!isAdmin(ctx) || !ctx.session.scene || ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text.trim();
    const scene = ctx.session.scene;

    // ... (Add Plan Scene Logic remains the same) ...

    // --- Set Panel Scene Logic (Now interacts with DB) ---
    if (scene.startsWith('set_panel_')) {
        switch (scene) {
            case 'set_panel_url':
                // ... same logic to get url and user ...
                break;
            case 'set_panel_pass':
                ctx.session.panelData.pass = text;
                await ctx.reply('در حال تست اتصال به پنل، لطفا صبر کنید...');

                const { url, user, pass } = ctx.session.panelData;
                const isConnected = await testPanelConnection(url, user, pass);

                if (isConnected) {
                    // --- DATABASE INTERACTION ---
                    // Instead of writing to .env, we write to the database
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

// (The rest of the file remains the same)
