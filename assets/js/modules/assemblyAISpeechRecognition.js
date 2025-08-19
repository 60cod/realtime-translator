/**
 * AssemblyAI Speech Recognition Module
 * Replaces Web Speech API with AssemblyAI WebSocket API
 */
class AssemblyAISpeechRecognitionModule {
    constructor() {
        this.websocket = null;
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.isRecognizing = false;
        this.lastFinalText = '';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000;
        
        // Event callbacks
        this.callbacks = {
            onStart: null,
            onEnd: null,
            onError: null,
            onResult: null
        };

        // AssemblyAI configuration
        this.config = {
            sampleRate: 16000,
            channels: 1,
            audioBitsPerSecond: 128000,
            chunkInterval: 100, // 100ms chunks for low latency
            apiEndpoint: 'wss://api.assemblyai.com/v2/realtime/ws',
            tokenEndpoint: 'https://60-realtime-translator.netlify.app/.netlify/functions/assemblyai-token'
        };
    }

    /**
     * Initialize speech recognition
     */
    async initializeRecognition() {
        try {
            // Check browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return { supported: false, error: 'MediaDevices API not supported' };
            }

            if (!WebSocket) {
                return { supported: false, error: 'WebSocket not supported' };
            }

            // Check MediaRecorder support
            if (!MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm')) {
                return { supported: false, error: 'MediaRecorder not supported' };
            }

            // Check HTTPS (except localhost)
            const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
            if (!isSecure) {
                return { supported: false, error: 'HTTPS required for microphone access' };
            }

            return { supported: true, type: 'assemblyai' };
        } catch (error) {
            return { supported: false, error: error.message };
        }
    }

    /**
     * Configure speech recognition
     */
    configure() {
        // AssemblyAI doesn't require separate configuration (set during WebSocket connection)
        console.log('Speech recognition configured:', {
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
            chunkInterval: this.config.chunkInterval
        });
        return true;
    }

    /**
     * Get temporary token
     */
    async getTemporaryToken() {
        try {
            const response = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Token request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Failed to get temporary token:', error);
            throw new Error('토큰 획득 실패: ' + error.message);
        }
    }

    /**
     * Setup WebSocket connection
     */
    async connectWebSocket() {
        try {
            const token = await this.getTemporaryToken();
            const wsUrl = `${this.config.apiEndpoint}?sample_rate=${this.config.sampleRate}&token=${token}`;

            this.websocket = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                this.websocket.onopen = () => {
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };

                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket 연결 실패'));
                };

                this.websocket.onclose = (event) => {
                    this.handleWebSocketClose(event);
                };

                // Connection timeout
                setTimeout(() => {
                    if (this.websocket.readyState !== WebSocket.OPEN) {
                        reject(new Error('WebSocket 연결 타임아웃'));
                    }
                }, 10000);
            });
        } catch (error) {
            throw new Error('WebSocket 연결 실패: ' + error.message);
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.message_type) {
                case 'SessionBegins':
                    break;
                    
                case 'PartialTranscript':
                    if (data.text && this.callbacks.onResult) {
                        this.callbacks.onResult({
                            finalTranscript: '',
                            interimTranscript: data.text,
                            lastFinalText: this.lastFinalText,
                            confidence: data.confidence || 0.5
                        });
                    }
                    break;
                    
                case 'FinalTranscript':
                    if (data.text && this.callbacks.onResult) {
                        this.callbacks.onResult({
                            finalTranscript: data.text,
                            interimTranscript: '',
                            lastFinalText: this.lastFinalText,
                            confidence: data.confidence || 0.8
                        });
                    }
                    break;
                    
                case 'SessionTerminated':
                    break;
                    
                default:
                    console.log('Unknown message type:', data.message_type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket close
     */
    handleWebSocketClose(event) {
        if (this.isRecognizing && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            setTimeout(() => {
                this.reconnectWebSocket();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            this.cleanup();
            if (this.callbacks.onEnd) {
                this.callbacks.onEnd();
            }
        }
    }

    /**
     * Reconnect WebSocket
     */
    async reconnectWebSocket() {
        try {
            await this.connectWebSocket();
            if (this.mediaStream) {
                this.startAudioCapture();
            }
        } catch (error) {
            console.error('Reconnection failed:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError({ error: 'reconnection_failed', message: error.message });
            }
        }
    }

    /**
     * Start audio capture
     */
    async startAudioCapture() {
        try {
            // Request microphone permission
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.config.sampleRate,
                    channelCount: this.config.channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Setup MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType,
                audioBitsPerSecond: this.config.audioBitsPerSecond
            });

            // Handle data events
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(event.data);
                }
            };

            // Handle errors
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                if (this.callbacks.onError) {
                    this.callbacks.onError({ error: 'mediarecorder_error', message: event.error.message });
                }
            };

            // Start recording (small chunks for low latency)
            this.mediaRecorder.start(this.config.chunkInterval);
        } catch (error) {
            throw new Error('오디오 캡처 실패: ' + error.message);
        }
    }

    /**
     * Get supported MIME type
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'audio/webm'; // Fallback
    }

    /**
     * Start speech recognition
     */
    async start() {
        if (this.isRecognizing) {
            throw new Error('음성 인식이 이미 실행 중입니다.');
        }

        try {
            this.isRecognizing = true;
            
            // Connect WebSocket
            await this.connectWebSocket();
            
            // Start audio capture
            await this.startAudioCapture();
            
            if (this.callbacks.onStart) {
                this.callbacks.onStart();
            }

            return true;
        } catch (error) {
            this.isRecognizing = false;
            console.error('Failed to start recognition:', error);
            throw error;
        }
    }

    /**
     * Stop speech recognition
     */
    async stop() {
        if (!this.isRecognizing) {
            return false;
        }

        try {
            this.isRecognizing = false;
            this.cleanup();
            
            if (this.callbacks.onEnd) {
                this.callbacks.onEnd();
            }

            return true;
        } catch (error) {
            console.error('Failed to stop recognition:', error);
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Cleanup MediaRecorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Cleanup MediaStream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Cleanup WebSocket
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }
        this.websocket = null;
    }

    /**
     * Set event listeners
     */
    setEventListeners(callbacks) {
        this.callbacks = {
            onStart: callbacks.onStart || null,
            onEnd: callbacks.onEnd || null,
            onError: callbacks.onError || null,
            onResult: callbacks.onResult || null
        };
        return true;
    }

    /**
     * Update last final text
     */
    updateLastFinalText(text) {
        this.lastFinalText = text;
    }

    /**
     * Reset module
     */
    reset() {
        this.lastFinalText = '';
        this.isRecognizing = false;
        this.reconnectAttempts = 0;
        this.cleanup();
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            isSupported: true, // 초기화에서 이미 확인됨
            isRecognizing: this.isRecognizing,
            lastFinalText: this.lastFinalText,
            connectionState: this.websocket ? this.websocket.readyState : WebSocket.CLOSED
        };
    }
}

// Export module
window.AssemblyAISpeechRecognitionModule = AssemblyAISpeechRecognitionModule;