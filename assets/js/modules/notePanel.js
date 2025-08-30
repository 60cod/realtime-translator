/**
 * 노트 패널 관리 모듈
 * 우측에서 부드럽게 나오는 노트 패널을 관리합니다.
 */
class NotePanelModule {
    constructor(noteStorage) {
        this.noteStorage = noteStorage;
        this.panel = null;
        this.isVisible = false;
        this.currentFilter = '';
        
        this.initialize();
    }

    /**
     * 노트 패널 초기화
     */
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        this.loadNotes();
    }

    /**
     * 노트 패널 DOM 생성
     */
    createPanel() {
        // 패널 컨테이너 생성
        this.panel = document.createElement('div');
        this.panel.id = 'notePanel';
        this.panel.className = 'note-panel';
        
        this.panel.innerHTML = `
            <div class="note-panel-header">
                <div class="note-panel-title">
                    <h3>📝 노트</h3>
                    <button id="notePanelClose" class="note-panel-close">×</button>
                </div>
                <div class="note-panel-controls">
                    <input type="text" id="noteSearch" placeholder="노트 검색..." class="note-search">
                    <div class="note-actions">
                        <button id="downloadNotes" class="action-btn download-btn">📥 다운로드</button>
                        <button id="clearAllNotes" class="action-btn clear-btn">🗑️ 전체 삭제</button>
                    </div>
                </div>
            </div>
            <div class="note-panel-content">
                <div id="notesList" class="notes-list">
                    <div class="empty-notes">
                        <p>저장된 노트가 없습니다.</p>
                        <p class="empty-notes-hint">텍스트 위에 마우스를 올리고 화살표를 클릭하여 노트를 저장하세요.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 패널 닫기
        document.getElementById('notePanelClose').addEventListener('click', () => {
            this.hidePanel();
        });

        // 검색 기능
        document.getElementById('noteSearch').addEventListener('input', (e) => {
            this.filterNotes(e.target.value);
        });

        // 다운로드 기능
        document.getElementById('downloadNotes').addEventListener('click', () => {
            this.downloadNotes();
        });

        // 전체 삭제
        document.getElementById('clearAllNotes').addEventListener('click', () => {
            this.confirmClearAll();
        });

        // 패널 외부 클릭 시 닫기 (선택사항)
        document.addEventListener('click', (e) => {
            if (this.isVisible && 
                !this.panel.contains(e.target) && 
                !e.target.classList.contains('note-save-btn') &&
                !e.target.classList.contains('note-toggle-btn')) {
                // 노트 저장 버튼이나 토글 버튼이 아닌 경우에만 패널 닫기
            }
        });

        // ESC 키로 패널 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hidePanel();
            }
        });

        // 노트 액션 버튼 이벤트 위임
        document.getElementById('notesList').addEventListener('click', (e) => {
            const noteId = e.target.getAttribute('data-note-id');
            if (!noteId) return;

            if (e.target.classList.contains('copy-note-btn')) {
                this.copyNote(noteId);
            } else if (e.target.classList.contains('delete-note-btn')) {
                this.deleteNote(noteId);
            }
        });
    }

    /**
     * 패널 표시
     */
    showPanel() {
        this.panel.classList.add('visible');
        this.isVisible = true;
        this.loadNotes(); // 패널을 열 때마다 노트 새로고침
    }

    /**
     * 패널 숨기기
     */
    hidePanel() {
        this.panel.classList.remove('visible');
        this.isVisible = false;
    }

    /**
     * 패널 토글
     */
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 노트 추가
     */
    addNote(originalText, translatedText) {
        const note = this.noteStorage.addNote(originalText, translatedText);
        this.loadNotes();
        this.showPanel(); // 노트 추가 시 패널 자동으로 열기
        
        // 새로 추가된 노트를 하이라이트
        setTimeout(() => {
            const newNoteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (newNoteElement) {
                newNoteElement.classList.add('note-highlight');
                setTimeout(() => {
                    newNoteElement.classList.remove('note-highlight');
                }, 2000);
            }
        }, 100);
        
        return note;
    }

    /**
     * 노트 목록 로드
     */
    loadNotes() {
        const notes = this.noteStorage.getAllNotes();
        const notesList = document.getElementById('notesList');
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-notes">
                    <p>저장된 노트가 없습니다.</p>
                    <p class="empty-notes-hint">텍스트 위에 마우스를 올리고 화살표를 클릭하여 노트를 저장하세요.</p>
                </div>
            `;
            return;
        }

        // 최신순으로 정렬
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        notesList.innerHTML = notes.map(note => this.createNoteElement(note)).join('');
    }

    /**
     * 노트 요소 생성
     */
    createNoteElement(note) {
        const date = new Date(note.timestamp);
        const formatDate = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-content">
                    <div class="note-original">
                        ${this.escapeHtml(note.original)}
                    </div>
                    <div class="note-translation">
                        <strong>번역:</strong> ${this.escapeHtml(note.translation)}
                    </div>
                </div>
                <div class="note-footer">
                    <div class="note-timestamp">${formatDate}</div>
                    <div class="note-actions">
                        <button class="note-action-btn copy-note-btn" data-note-id="${note.id}" title="복사">📋</button>
                        <button class="note-action-btn delete-note-btn" data-note-id="${note.id}" title="삭제">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 노트 필터링
     */
    filterNotes(searchText) {
        this.currentFilter = searchText.toLowerCase();
        const notes = this.noteStorage.getAllNotes();
        
        if (!searchText) {
            this.loadNotes();
            return;
        }

        const filteredNotes = notes.filter(note => 
            note.original.toLowerCase().includes(this.currentFilter) ||
            note.translation.toLowerCase().includes(this.currentFilter)
        );

        const notesList = document.getElementById('notesList');
        
        if (filteredNotes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-notes">
                    <p>검색 결과가 없습니다.</p>
                    <p class="empty-notes-hint">"${this.escapeHtml(searchText)}"와 일치하는 노트를 찾을 수 없습니다.</p>
                </div>
            `;
            return;
        }

        // 최신순으로 정렬
        filteredNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        notesList.innerHTML = filteredNotes.map(note => this.createNoteElement(note)).join('');
    }

    /**
     * 노트 다운로드
     */
    downloadNotes() {
        const notes = this.noteStorage.getAllNotes();
        
        if (notes.length === 0) {
            alert('다운로드할 노트가 없습니다.');
            return;
        }

        // JSON 형태로 다운로드
        const dataStr = JSON.stringify(notes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `translation-notes-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 텍스트 형태로도 다운로드 옵션 제공
        setTimeout(() => {
            if (confirm('텍스트 파일(.txt)로도 다운로드하시겠습니까?')) {
                this.downloadNotesAsText();
            }
        }, 500);
    }

    /**
     * 노트를 텍스트 형태로 다운로드
     */
    downloadNotesAsText() {
        const notes = this.noteStorage.getAllNotes();
        
        // 최신순으로 정렬
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let textContent = '번역 노트\n';
        textContent += '=' .repeat(50) + '\n\n';
        
        notes.forEach((note, index) => {
            const date = new Date(note.timestamp).toLocaleString('ko-KR');
            textContent += `${index + 1}. ${date}\n`;
            textContent += `${note.original}\n`;
            textContent += `번역: ${note.translation}\n`;
            textContent += '-'.repeat(30) + '\n\n';
        });
        
        const dataBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `translation-notes-${new Date().toISOString().split('T')[0]}.txt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 전체 노트 삭제 확인
     */
    confirmClearAll() {
        const notes = this.noteStorage.getAllNotes();
        
        if (notes.length === 0) {
            alert('삭제할 노트가 없습니다.');
            return;
        }

        const confirmMsg = `정말로 모든 노트(${notes.length}개)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
        
        if (confirm(confirmMsg)) {
            this.noteStorage.clearAllNotes();
            this.loadNotes();
            
            // 성공 메시지
            setTimeout(() => {
                alert('모든 노트가 삭제되었습니다.');
            }, 100);
        }
    }

    /**
     * 개별 노트 삭제
     */
    deleteNote(noteId) {
        if (confirm('이 노트를 삭제하시겠습니까?')) {
            this.noteStorage.deleteNote(noteId);
            this.loadNotes();
        }
    }

    /**
     * 노트 복사
     */
    copyNote(noteId) {
        const note = this.noteStorage.getNote(noteId);
        if (!note) return;

        const copyText = `${note.original}\n번역: ${note.translation}`;
        
        navigator.clipboard.writeText(copyText).then(() => {
            // 복사 성공 피드백
            const copyBtn = document.querySelector(`[data-note-id="${noteId}"].copy-note-btn`);
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1000);
            }
        }).catch(() => {
            alert('복사에 실패했습니다.');
        });
    }

    /**
     * 노트 개수 가져오기
     */
    getNotesCount() {
        return this.noteStorage.getAllNotes().length;
    }

    /**
     * 패널 상태 가져오기
     */
    isOpen() {
        return this.isVisible;
    }
}

// 전역으로 내보내기
window.NotePanelModule = NotePanelModule;