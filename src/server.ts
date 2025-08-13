import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';
import { startBot } from './bot';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Simple logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ===== API Routes =====

// Get all active plans
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    res.json(plans);
  } catch (error) {
    logger.error('Failed to fetch plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new order (this would be the first step before payment)
app.post('/api/orders', async (req, res) => {
  // In a real app, you must validate the user's Telegram data here for security
  const { userId, planId, firstName, lastName, username } = req.body;

  if (!userId || !planId) {
    return res.status(400).json({ message: 'userId and planId are required.' });
  }

  try {
    // Upsert user: create if not exists, update if exists
    await prisma.user.upsert({
      where: { id: userId },
      update: { firstName, lastName, username },
      create: { id: userId, firstName, lastName, username },
    });
    
    const order = await prisma.order.create({
      data: { userId, planId },
    });
    
    logger.info(`Created new order ${order.id} for user ${userId}`);
    // In the next step, you would generate a payment link for this orderId
    res.status(201).json({ message: 'Order created successfully', orderId: order.id });
  } catch (error) {
    logger.error('Failed to create order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Webhook for payment gateway to call after a successful payment
// POST /api/payment/webhook
// This is a placeholder and needs to be adapted to your payment provider
app.post('/api/payment/webhook', async (req, res) => {
    const { orderId, status } = req.body;
    
    if (status === 'success') {
        logger.info(`Payment successful for order ${orderId}. Creating V2Ray config...`);
        // TODO: Call the function to create config and send it to the user
        // await createAndDeliverConfig(orderId);
    }
    
    res.sendStatus(200); // Always respond 200 OK to webhooks
});


// ===== Server Initialization =====
app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  startBot();
});
