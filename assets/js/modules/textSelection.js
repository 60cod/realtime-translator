/**
 * 텍스트 선택 및 팝업 모듈
 */
class TextSelectionModule {
    constructor(uiModule) {
        this.ui = uiModule;
        this.selectedText = '';
        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        const elements = this.ui.getElements();

        // 전체 document에서 mouseup 감지하되, finalResults 관련 텍스트만 처리
        document.addEventListener('mouseup', (event) => {
            this.handleTextSelection(event);
        });

        // 드래그 취소 감지 (selectionchange 이벤트)
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            // 선택이 없어지면 팝업 버튼 숨기기
            if (selection.toString().trim() === '') {
                this.hidePopupBtn();
            }
        });

        // 팝업 버튼 클릭 이벤트
        elements.popupBtn.addEventListener('click', () => {
            if (this.selectedText) {
                this.onTextSelected(this.selectedText);
                this.hidePopupBtn();
                window.getSelection().removeAllRanges();
            }
        });

        // 선택된 텍스트 복사 버튼
        elements.copySelectedBtn.addEventListener('click', () => {
            const text = elements.selectedTextContent.textContent;
            if (text) {
                this.ui.copyToClipboard(text, elements.copySelectedBtn);
            }
        });
    }

    /**
     * 텍스트 선택 처리
     */
    handleTextSelection(event) {
        const selection = window.getSelection();
        const selectionText = selection.toString().trim();
        
        if (selectionText && selectionText.length > 3) {
            // Selection이 finalResults 영역과 관련이 있는지 확인
            if (this.isSelectionInFinalResults(selection)) {
                const cleanedText = this.cleanSelectedText(selectionText);
                
                if (cleanedText && cleanedText.length > 3) {
                    this.showPopupBtn(event.pageX, event.pageY, cleanedText);
                }
            }
        }
    }

    /**
     * 선택된 텍스트가 finalResults 영역과 관련이 있는지 확인
     */
    isSelectionInFinalResults(selection) {
        if (selection.rangeCount === 0) return false;
        
        const elements = this.ui.getElements();
        const range = selection.getRangeAt(0);
        
        // startContainer와 endContainer 모두 finalResults 내부에 있어야 함
        const startInFinal = this.isNodeInFinalResults(range.startContainer, elements.finalResults);
        const endInFinal = this.isNodeInFinalResults(range.endContainer, elements.finalResults);
        
        return startInFinal && endInFinal;
    }

    /**
     * 노드가 finalResults 영역 내부에 있는지 확인
     */
    isNodeInFinalResults(node, finalResults) {
        let currentNode = node;
        
        // 텍스트 노드인 경우 부모를 확인
        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentNode = currentNode.parentNode;
        }
        
        // finalResults 영역에 포함되는지 확인
        return finalResults.contains(currentNode);
    }

    /**
     * 복사 버튼 텍스트 제거
     */
    cleanSelectedText(text) {
        return text
            .replace(/복사/g, '')
            .replace(/완료!/g, '')
            .replace(/실패/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 팝업 버튼 표시
     */
    showPopupBtn(pageX, pageY, text) {
        const elements = this.ui.getElements();
        this.selectedText = text;
        elements.popupBtn.style.display = 'block';
        elements.popupBtn.style.left = pageX + 'px';
        elements.popupBtn.style.top = (pageY - 50) + 'px';
    }

    /**
     * 팝업 버튼 숨기기
     */
    hidePopupBtn() {
        const elements = this.ui.getElements();
        elements.popupBtn.style.display = 'none';
        this.selectedText = '';
    }

    /**
     * 텍스트 선택 콜백 설정
     */
    setTextSelectedCallback(callback) {
        this.onTextSelected = callback;
    }

    /**
     * 초기화
     */
    reset() {
        this.hidePopupBtn();
        this.selectedText = '';
    }
}

// 모듈 내보내기
window.TextSelectionModule = TextSelectionModule;