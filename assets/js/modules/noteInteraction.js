/**
 * 노트 상호작용 모듈
 * 텍스트 위 호버 시 나타나는 화살표 버튼과 노트 저장 기능을 관리
 */
class NoteInteractionModule {
    constructor(notePanel, noteStorage, uiModule) {
        this.notePanel = notePanel;
        this.noteStorage = noteStorage;
        this.uiModule = uiModule;
        
        this.saveButton = null;
        this.currentHoverTarget = null;
        this.hoverTimeout = null;
        this.isHoverActive = false;
        
        this.initialize();
    }

    /**
     * 상호작용 시스템 초기화
     */
    initialize() {
        this.createSaveButton();
        this.setupGlobalEventListeners();
    }

    /**
     * 저장 버튼 생성
     */
    createSaveButton() {
        this.saveButton = document.createElement('button');
        this.saveButton.className = 'note-save-btn';
        this.saveButton.innerHTML = '📌';
        this.saveButton.title = '노트에 저장';
        this.saveButton.style.display = 'none';
        
        // 버튼 클릭 이벤트
        this.saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveCurrentNote();
        });

        document.body.appendChild(this.saveButton);
    }

    /**
     * 전역 이벤트 리스너 설정
     */
    setupGlobalEventListeners() {
        // 스크롤 시 버튼 숨기기
        document.addEventListener('scroll', () => {
            if (this.isHoverActive) {
                this.hideSaveButton();
            }
        }, true);

        // 윈도우 리사이즈 시 버튼 위치 업데이트
        window.addEventListener('resize', () => {
            if (this.isHoverActive && this.currentHoverTarget) {
                this.updateButtonPosition();
            }
        });
    }

    /**
     * 텍스트 요소에 호버 이벤트 추가
     */
    addHoverToElement(element) {
        if (!element || element.hasAttribute('data-note-hover-enabled')) {
            return;
        }

        // 중복 추가 방지
        element.setAttribute('data-note-hover-enabled', 'true');

        // 마우스 진입 이벤트
        element.addEventListener('mouseenter', (e) => {
            this.handleMouseEnter(e.target);
        });

        // 마우스 이동 이벤트 (버튼 위치 업데이트)
        element.addEventListener('mousemove', (e) => {
            if (this.isHoverActive && this.currentHoverTarget === e.target) {
                this.updateButtonPosition();
            }
        });

        // 마우스 이탈 이벤트
        element.addEventListener('mouseleave', (e) => {
            this.handleMouseLeave(e.target);
        });

        // 저장 버튼 호버 처리
        this.saveButton.addEventListener('mouseenter', () => {
            this.clearHoverTimeout();
        });

        this.saveButton.addEventListener('mouseleave', () => {
            this.scheduleHideButton();
        });
    }

    /**
     * 마우스 진입 처리
     */
    handleMouseEnter(target) {
        // 이미 다른 요소에 활성화된 경우 먼저 숨기기
        if (this.isHoverActive && this.currentHoverTarget !== target) {
            this.hideSaveButton();
        }

        this.clearHoverTimeout();
        this.currentHoverTarget = target;

        // 약간의 지연 후 버튼 표시 (마우스가 빠르게 지나갈 때 방지)
        this.hoverTimeout = setTimeout(() => {
            if (this.currentHoverTarget === target) {
                this.showSaveButton(target);
            }
        }, 200);
    }

    /**
     * 마우스 이탈 처리
     */
    handleMouseLeave(target) {
        if (this.currentHoverTarget === target) {
            this.scheduleHideButton();
        }
    }

    /**
     * 저장 버튼 표시
     */
    showSaveButton(target) {
        if (!this.canSaveNote(target)) {
            return;
        }

        this.currentHoverTarget = target;
        this.isHoverActive = true;
        
        this.updateButtonPosition();
        this.saveButton.style.display = 'block';
        this.saveButton.classList.add('visible');

        // 접근성 개선
        target.setAttribute('aria-describedby', 'note-save-button');
    }

    /**
     * 저장 버튼 숨기기
     */
    hideSaveButton() {
        this.isHoverActive = false;
        this.saveButton.style.display = 'none';
        this.saveButton.classList.remove('visible');
        
        if (this.currentHoverTarget) {
            this.currentHoverTarget.removeAttribute('aria-describedby');
            this.currentHoverTarget = null;
        }
        
        this.clearHoverTimeout();
    }

    /**
     * 버튼 위치 업데이트
     */
    updateButtonPosition() {
        if (!this.currentHoverTarget) return;

        const rect = this.currentHoverTarget.getBoundingClientRect();
        const buttonSize = 32; // 버튼 크기
        const margin = 8; // 여백

        // 버튼을 텍스트 오른쪽에 위치
        const left = rect.right + margin;
        const top = rect.top + (rect.height - buttonSize) / 2;

        // 화면 경계 확인
        const maxLeft = window.innerWidth - buttonSize - margin;
        const maxTop = window.innerHeight - buttonSize - margin;

        this.saveButton.style.left = Math.min(left, maxLeft) + 'px';
        this.saveButton.style.top = Math.max(margin, Math.min(top, maxTop)) + 'px';
    }

    /**
     * 버튼 숨기기 예약
     */
    scheduleHideButton() {
        this.clearHoverTimeout();
        this.hoverTimeout = setTimeout(() => {
            this.hideSaveButton();
        }, 300); // 300ms 후 숨기기
    }

    /**
     * 호버 타이머 클리어
     */
    clearHoverTimeout() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }

    /**
     * 노트 저장 가능 여부 확인
     */
    canSaveNote(element) {
        // 텍스트가 있는 요소인지 확인
        const text = element.textContent?.trim();
        if (!text || text.length < 2) {
            return false;
        }

        // 저장할 수 있는 타입의 요소인지 확인
        const isValidElement = 
            element.classList.contains('result-text') ||
            element.classList.contains('translation-text') ||
            element.id === 'selectedTextContent' ||
            element.id === 'translationResult';

        return isValidElement;
    }

    /**
     * 현재 호버된 텍스트의 노트 저장
     */
    saveCurrentNote() {
        if (!this.currentHoverTarget) {
            return;
        }

        const noteData = this.extractNoteData(this.currentHoverTarget);
        
        if (!noteData) {
            this.showNotification('저장할 수 있는 텍스트를 찾을 수 없습니다.', 'error');
            return;
        }

        // 노트 저장
        const savedNote = this.noteStorage.addNote(noteData.original, noteData.translation);
        
        // 패널에 반영
        this.notePanel.addNote(noteData.original, noteData.translation);
        
        // 성공 피드백
        this.showSaveSuccess();
        this.showNotification('노트에 저장되었습니다!', 'success');
        
        // 버튼 숨기기
        this.hideSaveButton();
        
        return savedNote;
    }

    /**
     * 요소에서 노트 데이터 추출
     */
    extractNoteData(element) {
        let original = '';
        let translation = '';

        // result-text 요소인 경우
        if (element.classList.contains('result-text')) {
            original = element.textContent.trim();
            
            // 연결된 번역 결과 찾기
            const resultId = element.getAttribute('data-result-id');
            if (resultId) {
                const translationElement = document.querySelector(`[data-translation-for="${resultId}"]`);
                if (translationElement) {
                    translation = translationElement.textContent.trim();
                }
            }
            
            // 번역이 없는 경우 실시간 번역 영역에서 마지막 번역 가져오기
            if (!translation) {
                const lastTranslation = document.querySelector('#realtimeTranslations .result-item:last-child .translation-text');
                if (lastTranslation) {
                    translation = lastTranslation.textContent.trim();
                }
            }
        }
        
        // translation-text 요소인 경우
        else if (element.classList.contains('translation-text')) {
            translation = element.textContent.trim();
            
            // 연결된 원문 찾기
            const translationFor = element.getAttribute('data-translation-for');
            if (translationFor) {
                const originalElement = document.querySelector(`[data-result-id="${translationFor}"]`);
                if (originalElement) {
                    original = originalElement.textContent.trim();
                }
            }
        }
        
        // 선택된 텍스트 영역인 경우
        else if (element.id === 'selectedTextContent') {
            original = element.textContent.trim();
            const translationResult = document.getElementById('translationResult');
            if (translationResult && !translationResult.textContent.includes('[번역 오류]')) {
                translation = translationResult.textContent.trim();
            }
        }
        
        // 번역 결과 영역인 경우
        else if (element.id === 'translationResult') {
            translation = element.textContent.trim();
            const selectedTextContent = document.getElementById('selectedTextContent');
            if (selectedTextContent) {
                original = selectedTextContent.textContent.trim();
            }
        }

        // 유효성 검사
        if (!original || !translation || original === translation) {
            return null;
        }

        return { original, translation };
    }

    /**
     * 저장 성공 시각적 피드백
     */
    showSaveSuccess() {
        const originalButton = this.saveButton.innerHTML;
        this.saveButton.innerHTML = '✅';
        this.saveButton.classList.add('success');
        
        setTimeout(() => {
            this.saveButton.innerHTML = originalButton;
            this.saveButton.classList.remove('success');
        }, 1000);
    }

    /**
     * 알림 메시지 표시
     */
    showNotification(message, type = 'info') {
        // 기존 알림 제거
        const existingNotification = document.querySelector('.note-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = `note-notification ${type}`;
        notification.textContent = message;
        
        // 스타일 설정
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: '10001',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            opacity: '0',
            transform: 'translateY(-10px)',
            transition: 'all 0.3s ease'
        });

        // 타입별 색상
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
            notification.style.color = 'white';
        } else {
            notification.style.backgroundColor = '#374151';
            notification.style.color = '#d1d5db';
        }

        document.body.appendChild(notification);

        // 애니메이션 시작
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        // 자동 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * 기존 텍스트 요소들에 호버 추가
     */
    enableHoverForExistingElements() {
        // 기존 결과 텍스트들
        const resultTexts = document.querySelectorAll('.result-text');
        resultTexts.forEach(element => this.addHoverToElement(element));

        // 번역 텍스트들
        const translationTexts = document.querySelectorAll('.translation-text');
        translationTexts.forEach(element => this.addHoverToElement(element));

        // 선택된 텍스트 영역
        const selectedTextContent = document.getElementById('selectedTextContent');
        if (selectedTextContent) {
            this.addHoverToElement(selectedTextContent);
        }

        // 번역 결과 영역
        const translationResult = document.getElementById('translationResult');
        if (translationResult) {
            this.addHoverToElement(translationResult);
        }
    }

    /**
     * 새로 추가된 텍스트 요소에 호버 추가 (Mutation Observer 용)
     */
    observeNewElements() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 추가된 요소가 텍스트 요소인 경우
                        if (node.classList && (
                            node.classList.contains('result-text') ||
                            node.classList.contains('translation-text')
                        )) {
                            this.addHoverToElement(node);
                        }
                        
                        // 추가된 요소 내부의 텍스트 요소들 검사
                        const textElements = node.querySelectorAll?.('.result-text, .translation-text');
                        textElements?.forEach(element => this.addHoverToElement(element));
                    }
                });
            });
        });

        // 결과 영역들 감시
        const finalResults = document.getElementById('finalResults');
        const realtimeTranslations = document.getElementById('realtimeTranslations');
        
        if (finalResults) {
            observer.observe(finalResults, { childList: true, subtree: true });
        }
        if (realtimeTranslations) {
            observer.observe(realtimeTranslations, { childList: true, subtree: true });
        }
    }

    /**
     * 상호작용 시스템 활성화
     */
    enable() {
        this.enableHoverForExistingElements();
        this.observeNewElements();
    }

    /**
     * 상호작용 시스템 비활성화
     */
    disable() {
        this.hideSaveButton();
        // 옵저버 해제 등 추가 정리 작업
    }
}

// 전역으로 내보내기
window.NoteInteractionModule = NoteInteractionModule;