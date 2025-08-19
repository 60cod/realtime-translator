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

        // Generate complete WebSocket URL with embedded auth
        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sampleRate=16000&formatTurns=true&token=${encodeURIComponent(apiKey)}`;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                wsUrl: wsUrl
            })
        };

    } catch (error) {
        console.error('Error getting API key:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};