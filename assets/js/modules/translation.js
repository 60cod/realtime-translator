/**
 * 번역 모듈
 */
class TranslationModule {
    constructor() {
        this.apiKey = localStorage.getItem('deepLApiKey');
        this.isTranslating = false;
    }

    /**
     * API 키 설정
     */
    setApiKey(key) {
        if (key && key.trim()) {
            this.apiKey = key.trim();
            localStorage.setItem('deepLApiKey', this.apiKey);
            return true;
        }
        return false;
    }

    /**
     * API 키 상태 확인
     */
    hasApiKey() {
        return !!this.apiKey;
    }

    /**
     * API 키 가져오기
     */
    getApiKey() {
        return this.apiKey;
    }

    /**
     * DeepL API로 텍스트 번역
     */
    async translateText(text, targetLang = 'KO') {
        if (!this.apiKey) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        if (!text || !text.trim()) {
            throw new Error('번역할 텍스트가 없습니다.');
        }

        this.isTranslating = true;

        try {
            const response = await fetch('https://api-free.deepl.com/v2/translate', {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: [text.trim()],
                    target_lang: targetLang
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`DeepL API 오류: ${response.status} - ${errorData.message || 'API 호출 실패'}`);
            }

            const data = await response.json();
            console.log('번역 응답:', data);

            if (data.translations && data.translations.length > 0) {
                return {
                    success: true,
                    translatedText: data.translations[0].text,
                    originalText: text,
                    targetLang
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
            isTranslating: this.isTranslating,
            apiKey: this.apiKey
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