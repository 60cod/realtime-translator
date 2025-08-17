/**
 * 번역 모듈
 */
class TranslationModule {
    constructor() {
        this.isTranslating = false;
    }

    /**
     * API 키 상태 확인 (Netlify Function 사용시 항상 true)
     */
    hasApiKey() {
        return true; // Netlify Function이 서버에서 API 키 관리
    }

    /**
     * Netlify Function을 통한 텍스트 번역
     */
    async translateText(text, targetLang = 'KO') {
        if (!text || !text.trim()) {
            throw new Error('번역할 텍스트가 없습니다.');
        }

        this.isTranslating = true;

        try {
            const response = await fetch('https://60-realtime-translator.netlify.app/.netlify/functions/deepl-translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: [text.trim()],
                    target_lang: targetLang
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`번역 오류: ${response.status} - ${errorData.error || 'API 호출 실패'}`);
            }

            const data = await response.json();

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