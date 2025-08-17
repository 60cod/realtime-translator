/**
 * 유틸리티 함수들
 */
class Utils {
    /**
     * 요소가 존재하는지 확인
     */
    static elementExists(elementId) {
        return document.getElementById(elementId) !== null;
    }

    /**
     * 여러 요소가 모두 존재하는지 확인
     */
    static elementsExist(elementIds) {
        return elementIds.every(id => this.elementExists(id));
    }

    /**
     * 안전하게 요소 가져오기
     */
    static safeGetElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with id "${elementId}" not found`);
        }
        return element;
    }

    /**
     * 디바운스 함수
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 스로틀 함수
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 로컬 스토리지 안전 접근
     */
    static getFromStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            console.error('로컬 스토리지 접근 오류:', error);
            return defaultValue;
        }
    }

    /**
     * 로컬 스토리지 안전 저장
     */
    static saveToStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('로컬 스토리지 저장 오류:', error);
            return false;
        }
    }

    /**
     * 문자열이 비어있는지 확인
     */
    static isEmpty(str) {
        return !str || str.trim().length === 0;
    }

    /**
     * 문자열 자르기 (말줄임표 추가)
     */
    static truncate(str, maxLength, suffix = '...') {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * 에러 메시지 포맷팅
     */
    static formatError(error, prefix = '[오류]') {
        if (typeof error === 'string') {
            return `${prefix} ${error}`;
        }
        if (error instanceof Error) {
            return `${prefix} ${error.message}`;
        }
        return `${prefix} 알 수 없는 오류가 발생했습니다.`;
    }

    /**
     * 브라우저 기능 지원 확인
     */
    static checkBrowserSupport() {
        return {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            clipboard: navigator.clipboard && navigator.clipboard.writeText,
            localStorage: typeof Storage !== 'undefined',
            fetch: typeof fetch !== 'undefined'
        };
    }

    /**
     * 로그 레벨별 로깅
     */
    static log = {
        info: (message, ...args) => {
            console.log(`[INFO] ${message}`, ...args);
        },
        warn: (message, ...args) => {
            console.warn(`[WARN] ${message}`, ...args);
        },
        error: (message, ...args) => {
            console.error(`[ERROR] ${message}`, ...args);
        },
        debug: (message, ...args) => {
            if (this.isDebugMode()) {
                console.log(`[DEBUG] ${message}`, ...args);
            }
        }
    };

    /**
     * 디버그 모드 확인
     */
    static isDebugMode() {
        return localStorage.getItem('debug') === 'true' || 
               new URLSearchParams(window.location.search).get('debug') === 'true';
    }

    /**
     * 성능 측정
     */
    static performance = {
        start: (label) => {
            performance.mark(`${label}-start`);
        },
        end: (label) => {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
            const measure = performance.getEntriesByName(label)[0];
            console.log(`[PERF] ${label}: ${measure.duration.toFixed(2)}ms`);
            return measure.duration;
        }
    };
}

// 모듈 내보내기
window.Utils = Utils;