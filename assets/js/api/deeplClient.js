/**
 * DeepL Translation Client
 * Direct API calls to DeepL using API key from proxy
 */
class DeeplClient {
    constructor() {
        this.apiUrl = 'https://api-free.deepl.com/v2/translate';
    }

    /**
     * Translate text using proxy translation endpoint
     * @param {Array<string>} text - Array of text to translate
     * @param {string} target_lang - Target language (default: 'KO')
     * @param {string} source_lang - Source language (optional, auto-detect)
     * @returns {Promise<Object>} Translation result
     */
    async translate(text, target_lang = 'KO', source_lang = null) {
        if (!text || !Array.isArray(text) || text.length === 0) {
            throw new Error('Text is required and must be an array');
        }

        try {
            // Use translation proxy to avoid CORS issues
            const body = {
                text: text,
                target_lang: target_lang
            };

            if (source_lang) {
                body.source_lang = source_lang;
            }

            const response = await fetch('https://api-proxy.ygna.blog/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin,
                    'Referer': window.location.href
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Translation request failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ DeepL translation completed via proxy');
            return result;

        } catch (error) {
            console.error('DeepL translation error:', error);
            throw error;
        }
    }

    /**
     * Translate with retry logic
     * @private
     */
    async translateWithRetry(text, target_lang, source_lang, apiKey, attempt = 1) {
        try {
            const body = {
                text: text,
                target_lang: target_lang
            };

            if (source_lang) {
                body.source_lang = source_lang;
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                // Retry on rate limit or server errors (max 2 attempts)
                if ((response.status === 429 || response.status >= 500) && attempt < 2) {
                    console.log(`Retrying DeepL translation attempt ${attempt + 1}`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                    return this.translateWithRetry(text, target_lang, source_lang, apiKey, attempt + 1);
                }

                // Handle specific DeepL errors
                if (response.status === 429) {
                    throw new Error('Too many requests. Please try again later.');
                }
                if (response.status === 456) {
                    throw new Error('Translation quota exceeded.');
                }
                if (response.status === 403) {
                    throw new Error('Invalid API key.');
                }

                throw new Error(`${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.translations || !data.translations[0]) {
                throw new Error('No translation result received');
            }

            console.log(`✅ DeepL translation completed (attempt ${attempt})`);
            return data;

        } catch (error) {
            console.error(`DeepL translation attempt ${attempt} failed:`, error);
            if (attempt >= 2) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * Get supported languages
     * @returns {Promise<Object>} Supported languages
     */
    async getSupportedLanguages() {
        try {
            const apiKey = await window.apiProxyClient.getApiKey('deepl');

            const response = await fetch('https://api-free.deepl.com/v2/languages', {
                method: 'GET',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get supported languages: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Failed to get supported languages:', error);
            throw error;
        }
    }
}

// Create singleton instance
window.deeplClient = new DeeplClient();