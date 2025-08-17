/**
 * 음성 인식 모듈
 */
class SpeechRecognitionModule {
    constructor() {
        this.recognition = null;
        this.isRecognizing = false;
        this.lastFinalText = '';
        
        this.initializeRecognition();
    }

    /**
     * 음성 인식 초기화
     */
    initializeRecognition() {
        // Web Speech API 지원 확인
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            return { supported: true, type: 'webkit' };
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            return { supported: true, type: 'standard' };
        } else {
            return { supported: false };
        }
    }

    /**
     * 음성 인식 설정
     */
    configure() {
        if (!this.recognition) return false;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        console.log('Speech recognition configured:', {
            continuous: this.recognition.continuous,
            interimResults: this.recognition.interimResults,
            lang: this.recognition.lang
        });

        return true;
    }

    /**
     * 음성 인식 시작
     */
    start() {
        if (!this.recognition) {
            throw new Error('음성 인식이 지원되지 않습니다.');
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start recognition:', error);
            throw error;
        }
    }

    /**
     * 음성 인식 중지
     */
    stop() {
        if (!this.recognition) return false;

        try {
            this.recognition.stop();
            return true;
        } catch (error) {
            console.error('Failed to stop recognition:', error);
            throw error;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setEventListeners(callbacks) {
        if (!this.recognition) return false;

        this.recognition.onstart = () => {
            this.isRecognizing = true;
            if (callbacks.onStart) callbacks.onStart();
        };

        this.recognition.onend = () => {
            this.isRecognizing = false;
            if (callbacks.onEnd) callbacks.onEnd();
        };

        this.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            this.isRecognizing = false;
            if (callbacks.onError) callbacks.onError(event);
        };

        this.recognition.onresult = (event) => {
            const result = this.processResults(event);
            if (callbacks.onResult) callbacks.onResult(result);
        };

        return true;
    }

    /**
     * 음성 인식 결과 처리
     */
    processResults(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;
            const isFinal = event.results[i].isFinal;

            if (isFinal) {
                finalTranscript = transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        return {
            finalTranscript,
            interimTranscript,
            lastFinalText: this.lastFinalText
        };
    }

    /**
     * 마지막 최종 텍스트 업데이트
     */
    updateLastFinalText(text) {
        this.lastFinalText = text;
    }

    /**
     * 초기화
     */
    reset() {
        this.lastFinalText = '';
        this.isRecognizing = false;
    }

    /**
     * 상태 확인
     */
    getStatus() {
        return {
            isSupported: !!this.recognition,
            isRecognizing: this.isRecognizing,
            lastFinalText: this.lastFinalText
        };
    }
}

// 모듈 내보내기
window.SpeechRecognitionModule = SpeechRecognitionModule;