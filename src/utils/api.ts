// ===== FINAL CORRECTED CODE (Section: src/utils/api.ts) =====

import axios from 'axios';
import logger from './logger';
import { URLSearchParams } from 'url'; // Import URLSearchParams for form data

// This function now perfectly mimics the browser's login request.
export async function testPanelConnection(panelBaseUrl: string, user: string, pass: string): Promise<boolean> {
    // Construct the correct, full login URL from the base URL provided by the user.
    // The base URL should be like: https://panel2.wikicity.ir:2053/TOFTr6aum2
    const loginUrl = `${panelBaseUrl}/login`;

    // Create data in 'application/x-www-form-urlencoded' format.
    const formData = new URLSearchParams();
    formData.append('username', user);
    formData.append('password', pass);

    try {
        const response = await axios.post(loginUrl, formData, {
            timeout: 7000, // Increased timeout just in case
            headers: {
                // Set the correct Content-Type header
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Look for the specific 'x-ui' cookie.
        const cookie = response.headers['set-cookie']?.[0];
        if (cookie && cookie.startsWith('x-ui=')) {
            logger.info(`Successfully connected to panel at ${panelBaseUrl}`);
            return true;
        }
        
        logger.warn(`Login to panel at ${panelBaseUrl} seemed successful (status ${response.status}) but no 'x-ui' cookie was found.`);
        return false;

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            logger.error(`Failed to connect to panel at ${loginUrl}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
        } else {
            logger.error(`An unexpected error occurred while connecting to panel at ${loginUrl}:`, error);
        }
        return false;
    }
}

// The rest of the file (getLivePanelSession, etc.) can be updated later in the same way.
// For now, we focus on making the test connection work.
