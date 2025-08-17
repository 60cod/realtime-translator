// DeepL Translation API Netlify Function
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error("DEEPL_API_KEY environment variable is not set.");
}

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { text, target_lang = 'KO' } = JSON.parse(event.body || '{}');
    
    // Basic validation
    if (!text || !Array.isArray(text) || text.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required and must be an array' })
      };
    }

    // Call DeepL API with retry logic
    const translationResult = await translateWithRetry(text, target_lang);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(translationResult)
    };

  } catch (error) {
    console.error('Translation error:', error);
    
    // Handle specific DeepL errors
    if (error.message.includes('429')) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' })
      };
    }
    
    if (error.message.includes('456')) {
      return {
        statusCode: 456,
        headers,
        body: JSON.stringify({ error: 'Translation quota exceeded.' })
      };
    }
    
    if (error.message.includes('403')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid API key.' })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Translation service error. Please try again later.'
      })
    };
  }
};

// Simple retry function
async function translateWithRetry(text, target_lang, attempt = 1) {
  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        target_lang
      }),
    });

    if (!response.ok) {
      // Retry on rate limit or server errors (max 2 attempts)
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        console.log(`Retrying translation attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return translateWithRetry(text, target_lang, attempt + 1);
      }
      
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.translations || !data.translations[0]) {
      throw new Error('No translation result received');
    }

    return data;

  } catch (error) {
    console.error(`Translation attempt ${attempt} failed:`, error);
    throw error;
  }
}