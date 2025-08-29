/**
 * 노트 저장소 모듈
 * 로컬 스토리지를 통한 노트 데이터 관리
 */
class NoteStorageModule {
    constructor() {
        this.storageKey = 'translationNotes';
        this.version = '1.0';
        this.maxNotes = 1000; // 최대 노트 개수 제한
        
        this.initialize();
    }

    /**
     * 저장소 초기화
     */
    initialize() {
        // 기존 데이터 마이그레이션 검사
        this.migrateDataIfNeeded();
        
        // 저장소 정합성 검사
        this.validateStorage();
    }

    /**
     * 새 노트 추가
     */
    addNote(originalText, translatedText, tags = []) {
        const notes = this.getAllNotes();
        
        // 중복 검사 (동일한 원문과 번역이 있는지)
        const duplicate = notes.find(note => 
            note.original === originalText && note.translation === translatedText
        );
        
        if (duplicate) {
            // 중복된 노트는 타임스탬프만 업데이트
            duplicate.timestamp = new Date().toISOString();
            this.saveNotes(notes);
            return duplicate;
        }

        // 최대 노트 개수 제한
        if (notes.length >= this.maxNotes) {
            // 가장 오래된 노트 삭제
            notes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            notes.shift();
        }

        // 새 노트 생성
        const newNote = {
            id: this.generateNoteId(),
            timestamp: new Date().toISOString(),
            original: originalText.trim(),
            translation: translatedText.trim(),
            tags: Array.isArray(tags) ? tags : [],
            version: this.version
        };

        notes.push(newNote);
        this.saveNotes(notes);
        
        return newNote;
    }

    /**
     * 모든 노트 가져오기
     */
    getAllNotes() {
        try {
            const notesData = localStorage.getItem(this.storageKey);
            if (!notesData) {
                return [];
            }

            const parsedData = JSON.parse(notesData);
            
            // 데이터 구조 검증
            if (!Array.isArray(parsedData)) {
                console.warn('잘못된 노트 데이터 구조, 초기화합니다.');
                return [];
            }

            // 각 노트 검증 및 정리
            return parsedData
                .filter(note => this.validateNote(note))
                .map(note => this.normalizeNote(note));
                
        } catch (error) {
            console.error('노트 데이터 로드 실패:', error);
            return [];
        }
    }

    /**
     * 특정 노트 가져오기
     */
    getNote(noteId) {
        const notes = this.getAllNotes();
        return notes.find(note => note.id === noteId) || null;
    }

    /**
     * 노트 삭제
     */
    deleteNote(noteId) {
        const notes = this.getAllNotes();
        const filteredNotes = notes.filter(note => note.id !== noteId);
        
        if (filteredNotes.length < notes.length) {
            this.saveNotes(filteredNotes);
            return true;
        }
        
        return false;
    }

    /**
     * 모든 노트 삭제
     */
    clearAllNotes() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('노트 전체 삭제 실패:', error);
            return false;
        }
    }

    /**
     * 노트 검색
     */
    searchNotes(query) {
        if (!query || typeof query !== 'string') {
            return this.getAllNotes();
        }

        const searchTerm = query.toLowerCase().trim();
        const notes = this.getAllNotes();

        return notes.filter(note => 
            note.original.toLowerCase().includes(searchTerm) ||
            note.translation.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * 날짜 범위로 노트 필터링
     */
    getNotesByDateRange(startDate, endDate) {
        const notes = this.getAllNotes();
        
        return notes.filter(note => {
            const noteDate = new Date(note.timestamp);
            return noteDate >= startDate && noteDate <= endDate;
        });
    }

    /**
     * 노트 통계 가져오기
     */
    getNotesStats() {
        const notes = this.getAllNotes();
        
        if (notes.length === 0) {
            return {
                total: 0,
                oldestDate: null,
                newestDate: null,
                averageLength: { original: 0, translation: 0 }
            };
        }

        const timestamps = notes.map(note => new Date(note.timestamp));
        const originalLengths = notes.map(note => note.original.length);
        const translationLengths = notes.map(note => note.translation.length);

        return {
            total: notes.length,
            oldestDate: new Date(Math.min(...timestamps)),
            newestDate: new Date(Math.max(...timestamps)),
            averageLength: {
                original: originalLengths.reduce((sum, len) => sum + len, 0) / notes.length,
                translation: translationLengths.reduce((sum, len) => sum + len, 0) / notes.length
            },
            storageSize: this.getStorageSize()
        };
    }

    /**
     * 저장소 크기 계산 (KB)
     */
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? (new Blob([data]).size / 1024).toFixed(2) : '0';
        } catch (error) {
            return 'N/A';
        }
    }

    /**
     * 노트를 로컬 스토리지에 저장
     */
    saveNotes(notes) {
        try {
            const dataToSave = JSON.stringify(notes);
            localStorage.setItem(this.storageKey, dataToSave);
            return true;
        } catch (error) {
            console.error('노트 저장 실패:', error);
            
            // 저장소 용량 초과 시 오래된 노트 삭제 후 재시도
            if (error.name === 'QuotaExceededError') {
                this.cleanupOldNotes();
                try {
                    const dataToSave = JSON.stringify(notes);
                    localStorage.setItem(this.storageKey, dataToSave);
                    return true;
                } catch (retryError) {
                    console.error('재시도 후에도 노트 저장 실패:', retryError);
                    return false;
                }
            }
            
            return false;
        }
    }

    /**
     * 고유한 노트 ID 생성
     */
    generateNoteId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `note_${timestamp}_${random}`;
    }

    /**
     * 노트 데이터 검증
     */
    validateNote(note) {
        return (
            note &&
            typeof note.id === 'string' &&
            typeof note.original === 'string' &&
            typeof note.translation === 'string' &&
            typeof note.timestamp === 'string' &&
            note.original.trim().length > 0 &&
            note.translation.trim().length > 0
        );
    }

    /**
     * 노트 데이터 정규화
     */
    normalizeNote(note) {
        return {
            id: note.id,
            timestamp: note.timestamp,
            original: note.original.trim(),
            translation: note.translation.trim(),
            tags: Array.isArray(note.tags) ? note.tags : [],
            version: note.version || this.version
        };
    }

    /**
     * 데이터 마이그레이션
     */
    migrateDataIfNeeded() {
        // 향후 데이터 구조 변경 시 마이그레이션 로직 구현
        const notes = this.getAllNotes();
        let needsMigration = false;

        const migratedNotes = notes.map(note => {
            // 버전 정보가 없는 경우 추가
            if (!note.version) {
                note.version = '1.0';
                needsMigration = true;
            }
            
            // tags 필드가 없는 경우 추가
            if (!Array.isArray(note.tags)) {
                note.tags = [];
                needsMigration = true;
            }
            
            return note;
        });

        if (needsMigration) {
            console.log('노트 데이터 마이그레이션 실행');
            this.saveNotes(migratedNotes);
        }
    }

    /**
     * 저장소 정합성 검사
     */
    validateStorage() {
        try {
            const notes = this.getAllNotes();
            const validNotes = notes.filter(note => this.validateNote(note));
            
            if (validNotes.length < notes.length) {
                console.warn(`${notes.length - validNotes.length}개의 잘못된 노트가 발견되어 정리합니다.`);
                this.saveNotes(validNotes);
            }
        } catch (error) {
            console.error('저장소 정합성 검사 실패:', error);
        }
    }

    /**
     * 오래된 노트 정리 (저장소 용량 부족 시)
     */
    cleanupOldNotes() {
        const notes = this.getAllNotes();
        
        // 가장 오래된 20% 삭제
        const deleteCount = Math.max(1, Math.floor(notes.length * 0.2));
        notes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const remainingNotes = notes.slice(deleteCount);
        this.saveNotes(remainingNotes);
        
        console.warn(`저장소 용량 부족으로 ${deleteCount}개의 오래된 노트를 삭제했습니다.`);
    }

    /**
     * 노트 데이터 내보내기 (JSON)
     */
    exportNotesToJSON() {
        const notes = this.getAllNotes();
        const exportData = {
            version: this.version,
            exportDate: new Date().toISOString(),
            totalNotes: notes.length,
            notes: notes
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 노트 데이터 가져오기 (JSON)
     */
    importNotesFromJSON(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.notes || !Array.isArray(importData.notes)) {
                throw new Error('올바르지 않은 데이터 형식입니다.');
            }
            
            const existingNotes = this.getAllNotes();
            const validImportNotes = importData.notes.filter(note => this.validateNote(note));
            
            // ID 중복 방지
            const importedNotes = validImportNotes.map(note => ({
                ...note,
                id: this.generateNoteId() // 새 ID 생성
            }));
            
            const mergedNotes = [...existingNotes, ...importedNotes];
            this.saveNotes(mergedNotes);
            
            return {
                success: true,
                imported: importedNotes.length,
                skipped: importData.notes.length - validImportNotes.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 전역으로 내보내기
window.NoteStorageModule = NoteStorageModule;