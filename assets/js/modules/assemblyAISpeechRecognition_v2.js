/**
 * AssemblyAI Speech Recognition Module v2
 * Uses AudioContext + PCM16 format for better compatibility
 */
class AssemblyAISpeechRecognitionModule {
    constructor() {
        this.websocket = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.processor = null;
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
            formatTurns: true
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

            // Check AudioContext support
            if (!window.AudioContext && !window.webkitAudioContext) {
                return { supported: false, error: 'AudioContext not supported' };
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
        console.log('AssemblyAI Speech recognition configured:', {
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
            formatTurns: this.config.formatTurns
        });
        return true;
    }

    /**
     * Get WebSocket URL from Netlify function
     */
    async getWebSocketUrl() {
        try {
            const response = await fetch('https://60-realtime-translator.netlify.app/.netlify/functions/assemblyai-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`WebSocket URL request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.wsUrl;
        } catch (error) {
            console.error('Failed to get WebSocket URL:', error);
            throw new Error('WebSocket URL 획득 실패: ' + error.message);
        }
    }

    /**
     * Setup WebSocket connection
     */
    async connectWebSocket() {
        try {
            // Get complete WebSocket URL from Netlify function
            const wsUrl = await this.getWebSocketUrl();
            console.log('🔗 Connecting to:', wsUrl);

            // Create WebSocket with pre-authenticated URL
            this.websocket = new WebSocket(wsUrl);

            if (!this.websocket) {
                throw new Error('Failed to create WebSocket connection');
            }

            return new Promise((resolve, reject) => {
                this.websocket.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };

                this.websocket.onerror = (error) => {
                    console.error('🔴 WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.websocket.onclose = (event) => {
                    console.log('🔴 WebSocket closed:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean,
                        timestamp: new Date().toISOString()
                    });
                    this.websocket = null;
                    this.handleWebSocketClose(event);
                };

                // Connection timeout
                setTimeout(() => {
                    if (this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);
            });
        } catch (error) {
            throw new Error('WebSocket connection failed: ' + error.message);
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 AssemblyAI Message:', data);
            
            switch (data.type) {
                case 'Begin':
                    console.log('✅ Session started:', data);
                    break;
                    
                case 'Turn':
                    console.log('🗣️ Turn received:', data.transcript, 'formatted:', data.turn_is_formatted, 'end_of_turn:', data.end_of_turn);
                    if (data.transcript && this.callbacks.onResult) {
                        const isFormatted = data.turn_is_formatted;
                        const isEndOfTurn = data.end_of_turn;
                        
                        if (isFormatted || isEndOfTurn) {
                            // Final transcript (formatted OR end of turn)
                            console.log('📝 Final transcript:', data.transcript);
                            this.callbacks.onResult({
                                finalTranscript: data.transcript,
                                interimTranscript: '',
                                lastFinalText: this.lastFinalText,
                                confidence: data.end_of_turn_confidence || 0.8
                            });
                        } else {
                            // Interim transcript
                            console.log('📄 Interim transcript:', data.transcript);
                            this.callbacks.onResult({
                                finalTranscript: '',
                                interimTranscript: data.transcript,
                                lastFinalText: this.lastFinalText,
                                confidence: 0.5
                            });
                        }
                    } else {
                        console.log('⚠️ No transcript or callback:', { 
                            hasTranscript: !!data.transcript, 
                            hasCallback: !!this.callbacks.onResult 
                        });
                    }
                    break;
                    
                case 'Termination':
                    console.log('🔚 Session terminated:', data);
                    break;
                    
                default:
                    console.log('❓ Unknown message type:', data.type, data);
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
            console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
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
     * Start audio capture with AudioContext (PCM16)
     */
    async startAudioCapture() {
        try {
            // Try tab audio capture first (Chrome only), fallback to microphone
            let audioStream;
            
            try {
                // Option 1: Capture tab audio directly (Chrome/Edge)
                console.log('🎵 Attempting tab audio capture...');
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: false,
                    audio: true
                });
                audioStream = displayStream;
                console.log('✅ Tab audio capture successful');
            } catch (error) {
                console.log('⚠️ Tab audio not available, using microphone:', error.message);
                
                // Option 2: Fallback to microphone with echo cancellation disabled
                audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: this.config.sampleRate,
                        channelCount: this.config.channels,
                        echoCancellation: false,  // Disable to capture speaker audio
                        noiseSuppression: true,   // Keep noise suppression for cleaner audio
                        autoGainControl: false    // Disable auto gain to preserve speaker audio levels
                    }
                });
            }
            
            this.mediaStream = audioStream;

            // Create AudioContext for PCM processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.config.sampleRate
            });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create ScriptProcessor for real-time audio processing
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            // Process audio data and convert to PCM16
            this.processor.onaudioprocess = (event) => {
                if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                    return;
                }

                const inputData = event.inputBuffer.getChannelData(0); // Float32Array
                const pcm16Buffer = this.convertFloat32ToInt16(inputData);
                
                console.log('🎤 Sending PCM16 audio:', pcm16Buffer.byteLength, 'bytes');
                this.websocket.send(pcm16Buffer);
            };

            console.log('✅ AudioContext capture started');

        } catch (error) {
            throw new Error('Audio capture failed: ' + error.message);
        }
    }

    /**
     * Convert Float32 audio to PCM16 format
     */
    convertFloat32ToInt16(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            let sample = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        }
        
        return buffer;
    }

    /**
     * Start speech recognition
     */
    async start() {
        if (this.isRecognizing) {
            throw new Error('Speech recognition already running');
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
        // Cleanup AudioContext and processor
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
            this.processor = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Cleanup MediaStream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Cleanup WebSocket
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Send termination message
            this.websocket.send(JSON.stringify({ type: 'Terminate' }));
            this.websocket.close();
        }
        this.websocket = null;

        console.log('Resources cleaned up');
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
            isSupported: true,
            isRecognizing: this.isRecognizing,
            lastFinalText: this.lastFinalText,
            connectionState: this.websocket ? this.websocket.readyState : WebSocket.CLOSED
        };
    }
}

// Export module
window.AssemblyAISpeechRecognitionModule = AssemblyAISpeechRecognitionModule;