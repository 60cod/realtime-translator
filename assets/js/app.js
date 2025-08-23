/**
 * 메인 애플리케이션 클래스
 */
class SpeechRecognitionApp {
    constructor() {
        this.speechModule = null;
        this.translationModule = null;
        this.uiModule = null;
        this.textSelectionModule = null;
        this.realtimeTranslationModule = null;

        this.initialize();
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        try {
            //Utils.log.info('애플리케이션 초기화 시작');
            Utils.performance.start('app-init');

            // 브라우저 지원 확인
            const support = Utils.checkBrowserSupport();
            //Utils.log.info('브라우저 지원 상태:', support);

            // 모듈 초기화
            await this.initializeModules();

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 초기 상태 설정
            this.setupInitialState();

            Utils.performance.end('app-init');
            //Utils.log.info('애플리케이션 초기화 완료');
        } catch (error) {
            Utils.log.error('애플리케이션 초기화 실패:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * 모듈 초기화
     */
    async initializeModules() {
        // UI 모듈 초기화
        this.uiModule = new UIModule();

        // 음성 인식 모듈 초기화 (AssemblyAI)
        this.speechModule = new AssemblyAISpeechRecognitionModule();
        const speechSupport = await this.speechModule.initializeRecognition();
        
        if (!speechSupport.supported) {
            console.error('Speech recognition not supported:', speechSupport.error);
            this.handleSpeechNotSupported(speechSupport.error);
        } else {
            this.speechModule.configure();
        }

        // 번역 모듈 초기화
        this.translationModule = new TranslationModule();

        // 텍스트 선택 모듈 초기화
        this.textSelectionModule = new TextSelectionModule(this.uiModule);

        // 실시간 번역 모듈 초기화
        this.realtimeTranslationModule = new RealtimeTranslationModule(this.translationModule, this.uiModule);

        //Utils.log.info('모든 모듈 초기화 완료');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        const elements = this.uiModule.getElements();

        // 음성 인식 버튼 이벤트
        elements.startBtn.addEventListener('click', () => this.startRecognition());
        elements.stopBtn.addEventListener('click', () => this.stopRecognition());
        elements.clearBtn.addEventListener('click', () => this.clearAll());

        // 실시간 번역 토글 이벤트
        elements.realtimeTranslationToggle.addEventListener('change', (e) => {
            this.toggleRealtimeTranslation(e.target.checked);
        });


        // 음성 인식 이벤트 콜백 설정
        this.speechModule.setEventListeners({
            onStart: () => this.onRecognitionStart(),
            onEnd: () => this.onRecognitionEnd(),
            onError: (event) => this.onRecognitionError(event),
            onResult: (result) => this.onRecognitionResult(result)
        });

        // 텍스트 선택 콜백 설정
        this.textSelectionModule.setTextSelectedCallback((text) => this.onTextSelected(text));

        //Utils.log.debug('이벤트 리스너 설정 완료');
    }

    /**
     * 초기 상태 설정
     */
    setupInitialState() {
        // 음성 인식 상태 업데이트
        if (this.speechModule) {
            const speechStatus = this.speechModule.getStatus();
            this.uiModule.updateSpeechRecognitionStatus(speechStatus.isSupported);
        }

        //Utils.log.debug('초기 상태 설정 완료');
    }

    /**
     * 음성 인식 시작
     */
    async startRecognition() {
        try {
            // Utils.log.info('음성 인식 시작');
            await this.speechModule.start();
            
            // 토글 스위치 상태에 따라 실시간 번역 활성화
            const elements = this.uiModule.getElements();
            const isToggleOn = elements.realtimeTranslationToggle.checked;
            this.realtimeTranslationModule.setEnabled(isToggleOn);
        } catch (error) {
            Utils.log.error('음성 인식 시작 실패:', error);
            this.uiModule.updateStatus('음성 인식 시작 실패: ' + error.message);
            this.uiModule.updateButtonStates(false);
        }
    }

    /**
     * 음성 인식 중지
     */
    async stopRecognition() {
        try {
            // Utils.log.info('음성 인식 중지');
            await this.speechModule.stop();
            
            // 실시간 번역 비활성화
            this.realtimeTranslationModule.setEnabled(false);
        } catch (error) {
            Utils.log.error('음성 인식 중지 실패:', error);
            this.uiModule.updateButtonStates(true);
        }
    }

    /**
     * 전체 초기화
     */
    clearAll() {
        //Utils.log.info('전체 초기화');
        this.speechModule.reset();
        this.translationModule.reset();
        this.textSelectionModule.reset();
        this.realtimeTranslationModule.reset();
        this.uiModule.clearAll();
    }

    /**
     * 실시간 번역 토글
     */
    toggleRealtimeTranslation(isEnabled) {
        // 음성 인식 중일 때만 실시간 번역 상태 변경
        const speechStatus = this.speechModule.getStatus();
        if (speechStatus.isRecognizing) {
            this.realtimeTranslationModule.setEnabled(isEnabled);
            
            if (isEnabled) {
                this.uiModule.updateTranslationProgress('번역 대기 중...');
            } else {
                this.uiModule.updateTranslationProgress('실시간 번역 비활성화됨');
            }
        }
    }


    /**
     * 텍스트 선택 이벤트 처리
     */
    async onTextSelected(text) {
        //Utils.log.info('텍스트 선택됨:', text);
        
        this.uiModule.displaySelectedText(text);

        // 번역 시작
        this.uiModule.initializeTranslationResult();
        this.uiModule.getElements().translationStatus.textContent = '번역 중...';

        Utils.performance.start('translation');
        const result = await this.translationModule.translateText(text);
        Utils.performance.end('translation');

        this.uiModule.displayTranslationResult(result);
    }

    /**
     * 음성 인식 시작 이벤트
     */
    onRecognitionStart() {
        //Utils.log.debug('음성 인식 시작됨');
        this.uiModule.updateButtonStates(true);
        this.uiModule.updateStatus('🎤 음성 인식 중... 영어로 말씀하세요', true);
    }

    /**
     * 음성 인식 종료 이벤트
     */
    onRecognitionEnd() {
        //Utils.log.debug('음성 인식 종료됨');
        this.uiModule.updateButtonStates(false);
        this.uiModule.updateStatus('대기 중...');
    }

    /**
     * 음성 인식 오류 이벤트
     */
    onRecognitionError(event) {
        Utils.log.error('음성 인식 오류:', event.error);
        this.uiModule.updateButtonStates(false);
        this.uiModule.updateStatus('오류: ' + event.error);
    }

    /**
     * 음성 인식 결과 이벤트
     */
    onRecognitionResult(result) {
        //Utils.log.debug('음성 인식 결과:', result);

        // 임시 결과 업데이트
        this.uiModule.updateInterimResults(result.interimTranscript);

        // 최종 결과 처리
        if (result.finalTranscript) {
            const trimmedText = result.finalTranscript.trim();
            const lastTrimmedText = result.lastFinalText.trim();

            // 중복 방지
            if (trimmedText && trimmedText !== lastTrimmedText) {
                const resultId = this.uiModule.addFinalResult(trimmedText);
                this.speechModule.updateLastFinalText(trimmedText);
                
                // 토글 스위치가 켜져있을 때만 실시간 번역 트리거
                const elements = this.uiModule.getElements();
                if (elements.realtimeTranslationToggle.checked) {
                    this.realtimeTranslationModule.translateNewText(trimmedText, resultId);
                }
                
                //Utils.log.info('새로운 음성 인식 결과 추가:', trimmedText);
            }
        }
    }

    /**
     * 초기화 오류 처리
     */
    handleInitializationError(error) {
        const errorMessage = Utils.formatError(error, '애플리케이션 초기화 실패');
        
        // 기본 UI 요소가 있다면 오류 표시
        const statusElement = Utils.safeGetElement('status');
        if (statusElement) {
            statusElement.textContent = errorMessage;
        }

        console.error(errorMessage);
    }

    /**
     * 음성 인식 지원되지 않음 처리
     */
    handleSpeechNotSupported(error) {
        const errorMessage = `음성 인식을 사용할 수 없습니다: ${error}`;
        
        if (this.uiModule) {
            this.uiModule.updateStatus(errorMessage);
            this.uiModule.updateSpeechRecognitionStatus(false);
        }
        
        console.error(errorMessage);
    }

    /**
     * 애플리케이션 상태 가져오기
     */
    getStatus() {
        return {
            speech: this.speechModule?.getStatus(),
            translation: this.translationModule?.getStatus(),
            initialized: !!(this.speechModule && this.translationModule && this.uiModule)
        };
    }
}

// DOM이 로드되면 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    //Utils.log.info('DOM 로드 완료, 애플리케이션 시작');
    window.app = new SpeechRecognitionApp();
});

// 전역 접근을 위한 내보내기
window.SpeechRecognitionApp = SpeechRecognitionApp;