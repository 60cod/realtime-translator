/**
 * DeepL Translation Client
 * Direct API calls to DeepL using API key from proxy
 */
class DeeplClient {
    constructor() {
        this.pendingQueue = [];
        this.isProcessing = false;
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

        return new Promise((resolve, reject) => {
            // Add to pending queue
            this.pendingQueue.push({
                text: text[0], // Single text item
                target_lang,
                source_lang,
                resolve,
                reject,
                id: Date.now() + Math.random()
            });
            
            // Start processing
            this.processQueue();
        });
    }

    /**
     * Process pending translation queue with batching
     * @private
     */
    async processQueue() {
        if (this.isProcessing || this.pendingQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.pendingQueue.length > 0) {
            // Get batch of requests with same target language (max 10)
            const firstRequest = this.pendingQueue[0];
            const batch = this.pendingQueue.splice(0, Math.min(10, this.pendingQueue.length))
                .filter(req => req.target_lang === firstRequest.target_lang);
            
            // Put back requests with different target language
            const differentLang = this.pendingQueue.filter(req => req.target_lang !== firstRequest.target_lang);
            this.pendingQueue = differentLang.concat(this.pendingQueue);

            try {
                const result = await this.executeBatchTranslation(batch);
                this.handleBatchSuccess(batch, result);
                
                // Short delay between batches
                await this.delay(200);
                
            } catch (error) {
                // Check if error is retryable (429 or 500+)
                const isRetryable = this.isRetryableError(error);
                
                if (isRetryable) {
                    // On 429/500+ error: put batch back to front of queue + 1 second delay
                    this.pendingQueue.unshift(...batch);
                    console.log(`⏳ ${error.message} - retrying batch of ${batch.length} items in 2 seconds...`);
                    await this.delay(1000); // 1 second delay
                    continue;
                } else {
                    // Other errors: reject all requests in batch
                    batch.forEach(req => req.reject(error));
                }
            }
        }

        this.isProcessing = false;
    }

    /**
     * Execute batch translation
     * @private
     */
    async executeBatchTranslation(batch) {
        const textArray = batch.map(req => req.text);
        const target_lang = batch[0].target_lang;
        const source_lang = batch[0].source_lang;

        const body = {
            text: textArray,
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
            const error = new Error(`Translation request failed: ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }

        const result = await response.json();
        return result;
    }

    /**
     * Handle successful batch translation
     * @private
     */
    handleBatchSuccess(batch, result) {
        if (result.translations && result.translations.length === batch.length) {
            // Map each translation to corresponding request
            batch.forEach((request, index) => {
                const translation = result.translations[index];
                request.resolve({
                    translations: [{
                        text: translation.text,
                        detected_source_language: translation.detected_source_language
                    }]
                });
            });
        } else {
            // Fallback: reject all if response structure is unexpected
            const error = new Error('Unexpected response structure from translation API');
            batch.forEach(req => req.reject(error));
        }
    }

    /**
     * Delay utility function
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if error is retryable (429 or 500+)
     * @private
     */
    isRetryableError(error) {
        // Check by status code first (most reliable)
        if (error.statusCode) {
            return error.statusCode === 429 || error.statusCode >= 500;
        }
        
        // Fallback: check error message
        return error.message.includes('429') || 
               error.message.includes('500') || 
               error.message.includes('502') || 
               error.message.includes('503') || 
               error.message.includes('504');
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