/**
 * UI 관리 모듈
 */
class UIModule {
    constructor() {
        this.elements = this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * DOM 요소 초기화
     */
    initializeElements() {
        return {
            // 메인 컨트롤
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            clearBtn: document.getElementById('clearBtn'),
            status: document.getElementById('status'),

            // 결과 표시
            finalResults: document.getElementById('finalResults'),
            interimResults: document.getElementById('interimResults'),

            // 팝업 및 선택
            popupBtn: document.getElementById('popupBtn'),
            selectedTextArea: document.getElementById('selectedTextArea'),
            selectedTextContent: document.getElementById('selectedTextContent'),
            copySelectedBtn: document.getElementById('copySelectedBtn'),

            // 번역 결과
            translationResultArea: document.getElementById('translationResultArea'),
            translationResult: document.getElementById('translationResult'),
            translationStatus: document.getElementById('translationStatus'),

            // 설정 드롭다운
            settingsBtn: document.getElementById('settingsBtn'),
            settingsDropdown: document.getElementById('settingsDropdown'),
            dropdownDebugInfo: document.getElementById('dropdownDebugInfo'),
            dropdownDebugInfoStatus: document.getElementById('dropdownDebugInfoStatus'),

            // 실시간 번역
            translationProgress: document.getElementById('translationProgress'),
            realtimeTranslations: document.getElementById('realtimeTranslations'),
            realtimeTranslationToggle: document.getElementById('realtimeTranslationToggle'),

            // 글씨 크기 설정
            fontSizeSelect: document.getElementById('fontSizeSelect')
        };
    }

    /**
     * 기본 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 설정 드롭다운 토글
        this.elements.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettingsDropdown();
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!this.elements.settingsDropdown.contains(e.target) && 
                !this.elements.settingsBtn.contains(e.target)) {
                this.hideSettingsDropdown();
            }
        });

        // 드롭다운 내부 클릭 시 이벤트 전파 중단
        this.elements.settingsDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 글씨 크기 변경 이벤트
        this.elements.fontSizeSelect.addEventListener('change', (e) => {
            this.updateFontSize(e.target.value);
        });

        // 음성 인식 결과 클릭 이벤트 (번역 결과로 네비게이션)
        this.elements.finalResults.addEventListener('click', (e) => {
            if (e.target.classList.contains('result-text')) {
                const resultId = e.target.dataset.resultId;
                if (resultId) {
                    this.scrollToTranslationResult(resultId);
                }
            }
        });

        // 저장된 글씨 크기 설정 복원
        this.loadFontSizeSettings();
    }

    /**
     * 버튼 상태 업데이트
     */
    updateButtonStates(isRecognizing) {
        if (isRecognizing) {
            this.setButtonDisabled(this.elements.startBtn, true);
            this.setButtonDisabled(this.elements.stopBtn, false);
        } else {
            this.setButtonDisabled(this.elements.startBtn, false);
            this.setButtonDisabled(this.elements.stopBtn, true);
        }
    }

    /**
     * 버튼 비활성화/활성화
     */
    setButtonDisabled(button, disabled) {
        button.disabled = disabled;
        if (disabled) {
            button.classList.add('disabled-btn');
        } else {
            button.classList.remove('disabled-btn');
        }
    }

    /**
     * 상태 메시지 업데이트
     */
    updateStatus(message, isRecording = false) {
        this.elements.status.textContent = message;
        
        if (isRecording) {
            this.elements.status.classList.add('recording', 'status-blinking');
        } else {
            this.elements.status.classList.remove('recording', 'status-blinking');
        }
    }

    /**
     * 임시 결과 표시
     */
    updateInterimResults(text) {
        if (text) {
            this.elements.interimResults.textContent = '인식 중: ' + text;
        } else {
            this.elements.interimResults.textContent = '';
        }
    }

    /**
     * 최종 결과 추가
     */
    addFinalResult(text) {
        // 고유한 ID 생성
        const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'result-text';
        textSpan.textContent = text;
        textSpan.setAttribute('data-result-id', resultId);
        
        // 현재 저장된 글씨 크기 적용
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            textSpan.style.fontSize = savedFontSize + 'px';
        }
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '복사';
        copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);
        
        resultDiv.appendChild(textSpan);
        resultDiv.appendChild(copyBtn);
        
        this.elements.finalResults.appendChild(resultDiv);
        this.elements.finalResults.scrollTop = this.elements.finalResults.scrollHeight;
        
        return resultId; // 연결을 위한 ID 반환
    }

    /**
     * 클립보드에 텍스트 복사
     */
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = '완료!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error('복사 실패:', err);
            const originalText = button.textContent;
            button.textContent = '실패';
            setTimeout(() => {
                button.textContent = originalText;
            }, 1000);
        }
    }

    /**
     * 설정 드롭다운 토글
     */
    toggleSettingsDropdown() {
        const isHidden = this.elements.settingsDropdown.classList.contains('hidden');
        if (isHidden) {
            this.elements.settingsDropdown.classList.remove('hidden');
        } else {
            this.elements.settingsDropdown.classList.add('hidden');
        }
    }

    /**
     * 설정 드롭다운 숨기기
     */
    hideSettingsDropdown() {
        this.elements.settingsDropdown.classList.add('hidden');
    }


    /**
     * 음성 인식 상태 업데이트
     */
    updateSpeechRecognitionStatus(isSupported) {
        if (isSupported) {
            this.elements.dropdownDebugInfo.textContent = '음성 인식이 지원됩니다.';
            this.elements.dropdownDebugInfoStatus.textContent = '설정됨';
            this.elements.dropdownDebugInfoStatus.className = 'text-sm text-green-400';
        } else {
            this.elements.dropdownDebugInfo.textContent = '❌ 음성 인식이 지원되지 않습니다.';
            this.elements.dropdownDebugInfoStatus.textContent = '미설정';
            this.elements.dropdownDebugInfoStatus.className = 'text-sm text-gray-400';
            this.setButtonDisabled(this.elements.startBtn, true);
        }
    }

    /**
     * 번역 결과 상태 설정
     */
    setTranslationResultStatus(status) {
        // 기존 border 클래스 제거
        this.elements.translationResult.className = 
            this.elements.translationResult.className.replace(/border-l-4 border-\w+-\d+/g, '');
        
        switch (status) {
            case 'success':
                this.elements.translationResult.className += ' border-l-4 border-green-500';
                break;
            case 'error':
                this.elements.translationResult.className += ' border-l-4 border-red-500';
                break;
            case 'loading':
                this.elements.translationResult.className += ' border-l-4 border-blue-500';
                break;
        }
    }

    /**
     * 번역 결과 영역 초기화
     */
    initializeTranslationResult() {
        this.elements.translationResult.textContent = '';
        this.elements.translationStatus.textContent = '';
        this.setTranslationResultStatus('loading');
    }

    /**
     * 선택된 텍스트 표시
     */
    displaySelectedText(text) {
        this.elements.selectedTextContent.textContent = text;
        this.elements.selectedTextArea.classList.remove('hidden');
    }

    /**
     * 번역 결과 표시
     */
    displayTranslationResult(result) {
        this.elements.translationResultArea.classList.remove('hidden');
        
        if (result.success) {
            this.elements.translationResult.textContent = result.translatedText;
            this.setTranslationResultStatus('success');
            this.elements.translationStatus.textContent = '완료';
            
            // 2초 후 상태 메시지 제거
            setTimeout(() => {
                this.elements.translationStatus.textContent = '';
            }, 2000);
        } else {
            this.elements.translationResult.textContent = `[번역 오류] ${result.error}`;
            this.setTranslationResultStatus('error');
            this.elements.translationStatus.textContent = '';
        }
    }

    /**
     * 실시간 번역 상태 업데이트
     */
    updateTranslationProgress(message) {
        this.elements.translationProgress.textContent = message;
    }

    /**
     * 전체 초기화 (Reset 버튼 클릭 시)
     */
    clearAll() {
        this.elements.finalResults.innerHTML = '';
        this.elements.interimResults.textContent = '';
        this.elements.selectedTextArea.classList.add('hidden');
        this.elements.translationResultArea.classList.add('hidden');
        this.elements.realtimeTranslations.innerHTML = '';
        this.updateTranslationProgress('번역 대기 중...');
        this.updateStatus('초기화 완료');
    }

    /**
     * 글씨 크기 업데이트
     */
    updateFontSize(fontSize) {
        const size = fontSize + 'px';
        
        // selectedTextContent 글씨 크기 변경
        if (this.elements.selectedTextContent) {
            this.elements.selectedTextContent.style.fontSize = size;
        }
        
        // translationResult 글씨 크기 변경
        if (this.elements.translationResult) {
            this.elements.translationResult.style.fontSize = size;
        }
        
        // 모든 result-text 요소의 글씨 크기 변경
        const resultTexts = document.querySelectorAll('.result-text');
        resultTexts.forEach(element => {
            element.style.fontSize = size;
        });
        
        // 로컬 스토리지에 저장
        localStorage.setItem('fontSize', fontSize);
        
        // select 요소 값 업데이트
        this.elements.fontSizeSelect.value = fontSize;
    }

    /**
     * 저장된 글씨 크기 설정 복원
     */
    loadFontSizeSettings() {
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            this.updateFontSize(savedFontSize);
        }
    }

    /**
     * 번역 결과로 스크롤 및 하이라이트 효과
     */
    scrollToTranslationResult(resultId) {
        const translationTextElement = document.querySelector(`[data-translation-for="${resultId}"]`);
        
        if (translationTextElement) {
            // 번역 결과의 부모 div로 스크롤
            const translationItem = translationTextElement.closest('.result-item');
            
            // finalResults의 클릭된 result-item 찾기
            const clickedResultText = document.querySelector(`[data-result-id="${resultId}"]`);
            const clickedResultItem = clickedResultText ? clickedResultText.closest('.result-item') : null;
            
            // 레이아웃 확인: 가로 배치인지 세로 배치인지
            const translationContainer = translationItem.closest('#realtimeTranslations');
            const finalResultsContainer = clickedResultItem ? clickedResultItem.closest('#finalResults') : null;
            
            const isVerticalLayout = finalResultsContainer && translationContainer ? 
                finalResultsContainer.getBoundingClientRect().top !== translationContainer.getBoundingClientRect().top : true;
            
            if (clickedResultItem && !isVerticalLayout) {
                // 클릭된 아이템의 finalResults 컨테이너 내에서의 실제 위치 (스크롤 고려)
                const clickedItemOffsetInContainer = clickedResultItem.offsetTop - finalResultsContainer.scrollTop;
                
                // 번역 아이템의 realtimeTranslations 컨테이너 내에서의 위치 (스크롤 고려)
                const translationItemOffsetInContainer = translationItem.offsetTop;
                
                // 목표: 번역 결과가 클릭된 아이템과 같은 상대적 위치에 오도록 스크롤
                const targetScrollTop = translationItemOffsetInContainer - clickedItemOffsetInContainer;
                
                // 부드러운 스크롤
                translationContainer.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: 'smooth'
                });
            } else {
                // 세로 배치 또는 모바일: 기본 스크롤 (중앙 정렬)
                translationItem.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            // 하이라이트 효과
            this.highlightTranslationResult(translationItem);
        } else {
            // 번역 결과가 없는 경우 알림
            this.showNotification('해당 번역 결과를 찾을 수 없습니다.');
        }
    }

    /**
     * 번역 결과 하이라이트 효과
     */
    highlightTranslationResult(element) {
        // 기존 하이라이트 클래스 제거 (다른 요소들)
        document.querySelectorAll('.translation-highlight').forEach(el => {
            el.classList.remove('translation-highlight');
        });
        
        // 하이라이트 효과 추가
        element.classList.add('translation-highlight');
        
        // 3초 후 하이라이트 제거
        setTimeout(() => {
            element.classList.remove('translation-highlight');
        }, 3000);
    }

    /**
     * 알림 메시지 표시
     */
    showNotification(message) {
        // 기존 알림이 있다면 제거
        const existingNotification = document.querySelector('.scroll-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 알림 요소 생성
        const notification = document.createElement('div');
        notification.className = 'scroll-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 페이드 인
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // 2초 후 페이드 아웃 및 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }

    /**
     * 요소 가져오기
     */
    getElements() {
        return this.elements;
    }
}

// 모듈 내보내기
window.UIModule = UIModule;