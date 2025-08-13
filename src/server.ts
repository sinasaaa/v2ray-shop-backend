// ===== MAIN APP STARTER =====
import dotenv from 'dotenv';
import logger from './utils/logger';
import { startBot } from './bot';

// Load environment variables
dotenv.config();

logger.info('Application starting...');

// Start the Telegram bot
startBot();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
