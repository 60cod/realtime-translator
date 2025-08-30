/**
 * Real-time Translation Module
 */
class RealtimeTranslationModule {
    constructor(translationModule, uiModule) {
        this.translationModule = translationModule;
        this.ui = uiModule;
        this.isEnabled = false;
        this.hasError = false;
        this.translationQueue = [];
        this.currentIndex = 0;
    }

    /**
     * Enable/disable real-time translation
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            this.hasError = false;
            this.ui.updateTranslationProgress('번역 대기 중...');
        } else {
            this.hasError = false;
            // On stop: keep translation results and reset state only
            this.ui.updateTranslationProgress('번역 중지됨');
        }
    }

    /**
     * Request translation for new text
     */
    async translateNewText(text, resultId) {
        if (!this.isEnabled || this.hasError) {
            return;
        }

        // 1. Display original text immediately (while queue system processes)
        this.addTranslationPlaceholder(text, resultId);
        
        try {
            // 2. Update translation status
            this.ui.updateTranslationProgress('번역 중...');

            // 3. Execute translation (queue system handles automatically)
            const result = await this.translationModule.translateText(text);

            if (result.success) {
                // 4. Update on success
                this.updateTranslationResult(resultId, result.translatedText);
                this.ui.updateTranslationProgress('번역 완료');
                
                // Reset status after a moment
                setTimeout(() => {
                    if (this.isEnabled && !this.hasError) {
                        this.ui.updateTranslationProgress('번역 대기 중...');
                    }
                }, 1000);
            } else {
                // Handle failure
                this.handleTranslationError(result.error);
            }
        } catch (error) {
            // 429 errors are handled naturally here (retrying in queue)
            console.log('번역 처리 중...', error.message);
            this.ui.updateTranslationProgress('처리 중...');
        }
    }

    /**
     * Add translation result to UI (existing method, compatibility maintained)
     */
    addTranslationResult(originalText, translatedText, resultId) {
        const elements = this.ui.getElements();
        
        // Create translation result item
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item translation-result';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'translation-text';
        textSpan.textContent = translatedText;
        
        // Set ID for connection (directly to result-text)
        if (resultId) {
            textSpan.setAttribute('data-translation-for', resultId);
        }
        
        // Apply currently saved font size
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            textSpan.style.fontSize = savedFontSize + 'px';
        }
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '복사';
        copyBtn.onclick = () => this.ui.copyToClipboard(translatedText, copyBtn);
        
        resultDiv.appendChild(textSpan);
        resultDiv.appendChild(copyBtn);
        
        elements.realtimeTranslations.appendChild(resultDiv);
        elements.realtimeTranslations.scrollTop = elements.realtimeTranslations.scrollHeight;
    }

    /**
     * Display original text immediately (concurrent with translation request)
     */
    addTranslationPlaceholder(originalText, resultId) {
        const elements = this.ui.getElements();
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item translation-result';
        resultDiv.setAttribute('data-result-id', resultId);
        
        const textSpan = document.createElement('span');
        textSpan.className = 'translation-text';
        textSpan.textContent = '번역 중...';
        textSpan.setAttribute('data-translation-for', resultId);
        
        // Display original text (smaller font)
        const originalSpan = document.createElement('div');
        originalSpan.className = 'original-text';
        originalSpan.style.fontSize = '0.8em';
        originalSpan.style.color = '#666';
        originalSpan.style.marginBottom = '4px';
        originalSpan.textContent = originalText;
        
        // Apply currently saved font size
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            textSpan.style.fontSize = savedFontSize + 'px';
        }
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '복사';
        copyBtn.disabled = true; // Disabled until translation completes
        
        resultDiv.appendChild(originalSpan);
        resultDiv.appendChild(textSpan);
        resultDiv.appendChild(copyBtn);
        
        elements.realtimeTranslations.appendChild(resultDiv);
        elements.realtimeTranslations.scrollTop = elements.realtimeTranslations.scrollHeight;
    }

    /**
     * Update when translation completes
     */
    updateTranslationResult(resultId, translatedText) {
        const resultDiv = document.querySelector(`[data-result-id="${resultId}"]`);
        if (resultDiv) {
            const textSpan = resultDiv.querySelector('.translation-text');
            const copyBtn = resultDiv.querySelector('.copy-btn');
            
            textSpan.textContent = translatedText;
            copyBtn.disabled = false;
            copyBtn.onclick = () => this.ui.copyToClipboard(translatedText, copyBtn);
            
            // Completion animation
            resultDiv.style.backgroundColor = '#e8f5e8';
            setTimeout(() => {
                resultDiv.style.backgroundColor = '';
            }, 1000);
        }
    }

    /**
     * Handle translation errors
     */
    handleTranslationError(errorMessage) {
        this.hasError = true;
        this.isEnabled = false;
        
        // Display error message
        this.addErrorMessage(errorMessage);
        this.ui.updateTranslationProgress('번역 오류 발생');
        
        console.error('실시간 번역 오류:', errorMessage);
    }

    /**
     * Add error message to UI
     */
    addErrorMessage(errorMessage) {
        const elements = this.ui.getElements();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'result-item error-item';
        errorDiv.innerHTML = `
            <span class="result-text text-red-400">
                [번역 오류] ${errorMessage}
            </span>
        `;
        
        elements.realtimeTranslations.appendChild(errorDiv);
        elements.realtimeTranslations.scrollTop = elements.realtimeTranslations.scrollHeight;
    }

    /**
     * Clear translation results (called only on Reset)
     */
    clearTranslations() {
        const elements = this.ui.getElements();
        elements.realtimeTranslations.innerHTML = '';
        this.ui.updateTranslationProgress('번역 대기 중...');
        this.currentIndex = 0;
    }

    /**
     * Return current status
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasError: this.hasError,
            currentIndex: this.currentIndex
        };
    }

    /**
     * Reset/initialize
     */
    reset() {
        this.isEnabled = false;
        this.hasError = false;
        this.clearTranslations();
    }
}

// Export module
window.RealtimeTranslationModule = RealtimeTranslationModule;