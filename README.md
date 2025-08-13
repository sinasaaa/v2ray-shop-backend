# V2Ray Shop Backend

This is the backend server for the V2Ray Shop Telegram Mini App. It handles user management, plans, orders, and integration with a V2Ray panel.

## Features

- **Telegram Bot Integration:** Uses Telegraf.js to interact with users.
- **REST API:** Provides endpoints for the Mini App frontend.
- **Database Management:** Uses Prisma ORM with PostgreSQL.
- **V2Ray Panel Integration:** (Conceptual) API for creating users.

## Setup

This project is designed to be deployed using the provided `installer.sh` script.

### Environment Variables

The following variables are required in the `.env` file:

- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET`: A secret key for signing tokens.
- `PORT`: The port the server will run on.
- `BOT_TOKEN`: Your Telegram bot token from BotFather.
- `WEB_APP_URL`: The public URL of your Mini App.
- `PANEL_URL`: The URL of your V2Ray admin panel.
- `PANEL_USERNAME`: Username for the V2Ray panel.
- `PANEL_PASSWORD`: Password for the V2Ray panel.
