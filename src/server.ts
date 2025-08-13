// ===== MAIN APP STARTER (Corrected) =====
import dotenv from 'dotenv';
import logger from './utils/logger';
// Import both startBot and the bot instance itself
import { startBot, bot } from './bot';

// Load environment variables
dotenv.config();

logger.info('Application starting...');

// Start the Telegram bot
startBot();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
