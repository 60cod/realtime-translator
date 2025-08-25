/**
 * 번역 모듈
 */
class TranslationModule {
    constructor() {
        this.isTranslating = false;
    }

    /**
     * API 키 상태 확인 (API Proxy 클라이언트 사용)
     */
    hasApiKey() {
        return window.deeplClient && window.apiProxyClient;
    }

    /**
     * DeepL 클라이언트를 통한 직접 텍스트 번역
     */
    async translateText(text, targetLang = 'KO') {
        if (!text || !text.trim()) {
            throw new Error('번역할 텍스트가 없습니다.');
        }

        if (!this.hasApiKey()) {
            throw new Error('API 클라이언트가 초기화되지 않았습니다.');
        }

        this.isTranslating = true;

        try {
            // DeepL 클라이언트를 통해 직접 번역
            const data = await window.deeplClient.translate([text.trim()], targetLang);

            if (data.translations && data.translations.length > 0) {
                return {
                    success: true,
                    translatedText: data.translations[0].text,
                    originalText: text,
                    targetLang,
                    detectedLanguage: data.translations[0].detected_source_language
                };
            } else {
                throw new Error('번역 결과가 없습니다.');
            }
        } catch (error) {
            console.error('번역 오류:', error);
            return {
                success: false,
                error: error.message,
                originalText: text
            };
        } finally {
            this.isTranslating = false;
        }
    }

    /**
     * 번역 상태 확인
     */
    getStatus() {
        return {
            hasApiKey: this.hasApiKey(),
            isTranslating: this.isTranslating
        };
    }

    /**
     * 초기화
     */
    reset() {
        this.isTranslating = false;
    }
}

// 모듈 내보내기
window.TranslationModule = TranslationModule;