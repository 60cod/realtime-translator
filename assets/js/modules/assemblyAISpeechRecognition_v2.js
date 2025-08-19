/**
 * AssemblyAI Speech Recognition Module v2
 * Production-ready version with AudioContext + PCM16 format
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
        this.audioSourceType = null; // 'tab' or 'microphone'
        
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
            formatTurns: true,
            bufferSize: 4096,
            connectionTimeout: 10000
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

            // Check HTTPS requirement
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
        console.log('Speech recognition configured:', {
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
            throw new Error('WebSocket URL acquisition failed: ' + error.message);
        }
    }

    /**
     * Setup WebSocket connection
     */
    async connectWebSocket() {
        try {
            const wsUrl = await this.getWebSocketUrl();
            this.websocket = new WebSocket(wsUrl);

            if (!this.websocket) {
                throw new Error('Failed to create WebSocket connection');
            }

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, this.config.connectionTimeout);

                this.websocket.onopen = () => {
                    clearTimeout(timeout);
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };

                this.websocket.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.websocket.onclose = (event) => {
                    clearTimeout(timeout);
                    this.websocket = null;
                    this.handleWebSocketClose(event);
                };
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
            
            switch (data.type) {
                case 'Begin':
                    // Session started - no action needed
                    break;
                    
                case 'Turn':
                    if (data.transcript && this.callbacks.onResult) {
                        const isFormatted = data.turn_is_formatted;
                        const isEndOfTurn = data.end_of_turn;
                        
                        if (isFormatted || isEndOfTurn) {
                            // Final transcript
                            this.callbacks.onResult({
                                finalTranscript: data.transcript,
                                interimTranscript: '',
                                lastFinalText: this.lastFinalText,
                                confidence: data.end_of_turn_confidence || 0.8
                            });
                        } else {
                            // Interim transcript
                            this.callbacks.onResult({
                                finalTranscript: '',
                                interimTranscript: data.transcript,
                                lastFinalText: this.lastFinalText,
                                confidence: 0.5
                            });
                        }
                    }
                    break;
                    
                case 'Termination':
                    // Session terminated - handled by onclose
                    break;
                    
                default:
                    console.warn('Unknown AssemblyAI message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket close
     */
    handleWebSocketClose(event) {
        // Only attempt reconnection if actively recognizing and haven't exceeded max attempts
        if (this.isRecognizing && this.reconnectAttempts < this.maxReconnectAttempts && event.code !== 1000) {
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
            // Audio capture is already active, no need to restart
        } catch (error) {
            console.error('Reconnection failed:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError({ error: 'reconnection_failed', message: error.message });
            }
        }
    }

    /**
     * Start audio capture with dual strategy (tab audio or microphone)
     */
    async startAudioCapture() {
        try {
            let audioStream;
            
            // Strategy 1: Try tab audio capture (Chrome/Edge)
            try {
                audioStream = await navigator.mediaDevices.getDisplayMedia({
                    video: false,
                    audio: true
                });
                this.audioSourceType = 'tab';
            } catch (error) {
                // Strategy 2: Fallback to microphone with optimized settings
                audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: this.config.sampleRate,
                        channelCount: this.config.channels,
                        echoCancellation: false,  // Allow speaker audio capture
                        noiseSuppression: true,   // Keep for audio quality
                        autoGainControl: false    // Preserve audio levels
                    }
                });
                this.audioSourceType = 'microphone';
            }
            
            this.mediaStream = audioStream;
            this.setupAudioProcessing();

        } catch (error) {
            throw new Error('Audio capture failed: ' + error.message);
        }
    }

    /**
     * Setup audio processing pipeline
     */
    setupAudioProcessing() {
        // Create AudioContext with specified sample rate
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.config.sampleRate
        });

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Use ScriptProcessor (will migrate to AudioWorklet in future versions)
        this.processor = this.audioContext.createScriptProcessor(
            this.config.bufferSize, 
            this.config.channels, 
            this.config.channels
        );
        
        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        // Process audio data and convert to PCM16
        this.processor.onaudioprocess = (event) => {
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                return;
            }

            const inputData = event.inputBuffer.getChannelData(0);
            const pcm16Buffer = this.convertFloat32ToInt16(inputData);
            this.websocket.send(pcm16Buffer);
        };
    }

    /**
     * Convert Float32 audio to PCM16 format (optimized)
     */
    convertFloat32ToInt16(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
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
            
            // Connect WebSocket first
            await this.connectWebSocket();
            
            // Then start audio capture
            await this.startAudioCapture();
            
            if (this.callbacks.onStart) {
                this.callbacks.onStart();
            }

            return true;
        } catch (error) {
            this.isRecognizing = false;
            this.cleanup();
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
     * Cleanup all resources
     */
    cleanup() {
        // Cleanup audio processing
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
            this.processor = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(console.error);
            this.audioContext = null;
        }

        // Cleanup media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Cleanup WebSocket
        if (this.websocket) {
            if (this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'Terminate' }));
            }
            this.websocket.close();
            this.websocket = null;
        }

        // Reset state
        this.audioSourceType = null;
        this.reconnectAttempts = 0;
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
     * Reset module state
     */
    reset() {
        this.lastFinalText = '';
        this.isRecognizing = false;
        this.reconnectAttempts = 0;
        this.cleanup();
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isSupported: true,
            isRecognizing: this.isRecognizing,
            lastFinalText: this.lastFinalText,
            connectionState: this.websocket ? this.websocket.readyState : WebSocket.CLOSED,
            audioSource: this.audioSourceType
        };
    }
}

// Export module
window.AssemblyAISpeechRecognitionModule = AssemblyAISpeechRecognitionModule;