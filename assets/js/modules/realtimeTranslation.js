/**
 * 실시간 번역 모듈
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
     * 실시간 번역 활성화/비활성화
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            this.hasError = false;
            this.ui.updateTranslationProgress('번역 대기 중...');
        } else {
            this.hasError = false;
            // Stop 시에는 번역 결과를 유지하고 상태만 초기화
            this.ui.updateTranslationProgress('번역 중지됨');
        }
    }

    /**
     * 새로운 텍스트 번역 요청
     */
    async translateNewText(text) {
        if (!this.isEnabled || this.hasError) {
            return;
        }

        try {
            // 번역 상태 업데이트
            this.ui.updateTranslationProgress('번역 중...');

            // 번역 실행
            const result = await this.translationModule.translateText(text);

            if (result.success) {
                // 성공: 번역 결과 추가
                this.addTranslationResult(text, result.translatedText);
                this.ui.updateTranslationProgress('번역 완료');
                
                // 잠시 후 상태 초기화
                setTimeout(() => {
                    if (this.isEnabled && !this.hasError) {
                        this.ui.updateTranslationProgress('번역 대기 중...');
                    }
                }, 1000);
            } else {
                // 실패: 오류 처리
                this.handleTranslationError(result.error);
            }
        } catch (error) {
            this.handleTranslationError(error.message);
        }
    }

    /**
     * 번역 결과를 UI에 추가
     */
    addTranslationResult(originalText, translatedText, resultId = null) {
        const elements = this.ui.getElements();
        
        // 번역 결과 아이템 생성
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item translation-result';
        
        // 연결을 위한 ID 설정
        if (resultId) {
            resultDiv.setAttribute('data-translation-for', resultId);
        }
        
        const textSpan = document.createElement('span');
        textSpan.className = 'result-text';
        textSpan.textContent = translatedText;
        
        // 현재 저장된 글씨 크기 적용
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
     * 번역 오류 처리
     */
    handleTranslationError(errorMessage) {
        this.hasError = true;
        this.isEnabled = false;
        
        // 오류 메시지 표시
        this.addErrorMessage(errorMessage);
        this.ui.updateTranslationProgress('번역 오류 발생');
        
        console.error('실시간 번역 오류:', errorMessage);
    }

    /**
     * 오류 메시지를 UI에 추가
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
     * 번역 결과 초기화 (Reset 시에만 호출)
     */
    clearTranslations() {
        const elements = this.ui.getElements();
        elements.realtimeTranslations.innerHTML = '';
        this.ui.updateTranslationProgress('번역 대기 중...');
        this.currentIndex = 0;
    }

    /**
     * 현재 상태 반환
     */
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            hasError: this.hasError,
            currentIndex: this.currentIndex
        };
    }

    /**
     * 초기화
     */
    reset() {
        this.isEnabled = false;
        this.hasError = false;
        this.clearTranslations();
    }
}

// 모듈 내보내기
window.RealtimeTranslationModule = RealtimeTranslationModule;