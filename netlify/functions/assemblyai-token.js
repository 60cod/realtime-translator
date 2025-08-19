/**
 * Netlify Function: AssemblyAI Token Generator
 * Generates temporary tokens for secure client-side AssemblyAI access
 */

exports.handler = async (event, context) => {
    // CORS headers for browser requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get API key from environment variables
        const apiKey = process.env.ASSEMBLYAI_API_KEY;
        
        if (!apiKey) {
            console.error('API Key environment variable not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Generate temporary token using AssemblyAI REST API
        const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                expires_in: 3600 // 1 hour expiry
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API token generation failed:', response.status, errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: 'Token generation failed' })
            };
        }

        const tokenData = await response.json();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                token: tokenData.token,
                expires_in: tokenData.expires_in
            })
        };

    } catch (error) {
        console.error('Error generating API token:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};