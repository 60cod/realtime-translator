/**
 * API Proxy Client
 * Handles secure API key retrieval from api-proxy service
 */
class ApiProxyClient {
    constructor() {
        this.proxyBaseUrl = 'https://api-proxy.ygna.blog/api/keys';
        this.cache = new Map();
        this.cacheTTL = 50 * 60 * 1000; // 50 minutes (keys expire in 1 hour)
    }

    /**
     * Get API key for specified service
     * @param {string} service - Service name (assemblyai, deepl)
     * @returns {Promise<string>} API key
     */
    async getApiKey(service) {
        // Check cache first
        const cached = this.cache.get(service);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            return cached.apiKey;
        }

        try {
            const response = await fetch(`${this.proxyBaseUrl}/${service}`, {
                method: 'GET',
                headers: {
                    'Origin': window.location.origin,
                    'Referer': window.location.href
                }
            });

            if (!response.ok) {
                throw new Error(`API key request failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the API key
            this.cache.set(service, {
                apiKey: data.apiKey,
                timestamp: Date.now()
            });

            console.log(`✅ API Key cached for service: ${service}`);
            return data.apiKey;

        } catch (error) {
            console.error(`Failed to get API key for ${service}:`, error);
            throw new Error(`API key retrieval failed: ${error.message}`);
        }
    }

    /**
     * Clear cached API key for service
     * @param {string} service - Service name
     */
    clearCache(service) {
        if (service) {
            this.cache.delete(service);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Check if API key is cached and valid
     * @param {string} service - Service name
     * @returns {boolean} True if cached and valid
     */
    hasCachedKey(service) {
        const cached = this.cache.get(service);
        return cached && (Date.now() - cached.timestamp) < this.cacheTTL;
    }
}

// Create singleton instance
window.apiProxyClient = new ApiProxyClient();