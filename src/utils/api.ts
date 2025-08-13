// ===== MODIFIED CODE (Section: src/utils/api.ts) =====

import axios from 'axios';
import logger from './logger';

// This function now takes panel details as arguments to test the connection
export async function testPanelConnection(url: string, user: string, pass: string): Promise<boolean> {
    try {
        const response = await axios.post(`${url}/login`, {
            username: user,
            password: pass,
        }, { timeout: 5000 }); // Add a 5-second timeout

        // Check if the response headers contain the session cookie
        const cookie = response.headers['set-cookie']?.[0];
        if (cookie && cookie.includes('session=')) {
            logger.info(`Successfully connected to panel at ${url}`);
            return true;
        }
        logger.warn(`Login to panel at ${url} seemed successful but no session cookie was found.`);
        return false;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            logger.error(`Failed to connect to panel at ${url}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
        } else {
            logger.error(`An unexpected error occurred while connecting to panel at ${url}:`, error);
        }
        return false;
    }
}


// This function will now read from environment variables to be used by the app later
export async function getLivePanelSession(): Promise<string> {
    const PANEL_URL = process.env.PANEL_URL;
    const PANEL_USERNAME = process.env.PANEL_USERNAME;
    const PANEL_PASSWORD = process.env.PANEL_PASSWORD;

    if (!PANEL_URL || !PANEL_USERNAME || !PANEL_PASSWORD) {
        throw new Error('Panel credentials are not configured in .env file.');
    }
    
    try {
        const response = await axios.post(`${PANEL_URL}/login`, {
            username: PANEL_USERNAME,
            password: PANEL_PASSWORD,
        });
        const cookie = response.headers['set-cookie']?.[0];
        if (!cookie) throw new Error('Login failed: No session cookie received.');
        return cookie;
    } catch (error) {
        logger.error('Failed to get live panel session:', error);
        throw new Error('Could not connect to V2Ray panel with stored credentials.');
    }
}

// TODO: You still need to implement the createV2RayUser function using getLivePanelSession
// export async function createV2RayUser(...) { ... }
