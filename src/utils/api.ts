import axios from 'axios';
import logger from './logger';

// These should be configured via environment variables
const PANEL_URL = process.env.PANEL_URL || 'http://127.0.0.1:2053';
const PANEL_USERNAME = process.env.PANEL_USERNAME || 'admin';
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'admin';

let sessionCookie = '';

async function getSessionCookie(): Promise<string> {
    if (sessionCookie) {
        return sessionCookie;
    }

    try {
        const response = await axios.post(`${PANEL_URL}/login`, {
            username: PANEL_USERNAME,
            password: PANEL_PASSWORD,
        });
        const cookie = response.headers['set-cookie']?.[0];
        if (!cookie) {
            throw new Error('Login failed: No session cookie received.');
        }
        sessionCookie = cookie;
        logger.info('Successfully logged into V2Ray panel.');
        return sessionCookie;
    } catch (error) {
        logger.error('Failed to log into V2Ray panel:', error);
        throw new Error('Could not connect to V2Ray panel.');
    }
}

// A conceptual function to create a user (inbound client)
export async function createV2RayUser(email: string, dataLimitBytes: bigint, expireDays: number): Promise<string> {
    const cookie = await getSessionCookie();
    
    const now = new Date();
    const expireTime = now.setDate(now.getDate() + expireDays);

    const clientData = {
        id: 1, // The ID of the inbound you want to add the client to
        settings: JSON.stringify({
            clients: [
                {
                    email: email,
                    totalGB: Number(dataLimitBytes / BigInt(1024 * 1024 * 1024)),
                    expiryTime: expireTime,
                    enable: true,
                },
            ],
        }),
    };

    try {
        // This is a conceptual API endpoint. You need to check the exact endpoint for your panel.
        // For 3x-ui it might be something like '/panel/api/inbounds/addClient'
        const response = await axios.post(`${PANEL_URL}/panel/api/inbounds/addClient`, clientData, {
            headers: { 'Cookie': cookie },
        });

        // You need to extract the actual config link from the response
        const configLink = response.data.configLink; // This is a placeholder
        if (!configLink) {
             throw new Error('Config link not found in panel response.');
        }
        logger.info(`Successfully created V2Ray user: ${email}`);
        return configLink;
    } catch (error) {
        logger.error(`Failed to create V2Ray user ${email}:`, error);
        throw new Error('API call to V2Ray panel failed.');
    }
}
