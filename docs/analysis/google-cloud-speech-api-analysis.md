# Google Cloud Speech-to-Text API 전환 가능성 분석

> 작성일: 2025-01-17  
> 대상: 실시간 번역기 프로젝트  
> 목적: Web Speech API → Google Cloud Speech-to-Text API 전환 검토

## 📊 분석 개요

현재 프로젝트에서 사용 중인 Web Speech API를 Google Cloud Speech-to-Text API로 전환하는 것의 기술적 가능성과 타당성을 분석합니다.

## 🔍 현재 프로젝트 구조 분석

### 음성 인식 모듈 현황
- **API**: Web Speech API (webkitSpeechRecognition/SpeechRecognition)
- **실행 환경**: 브라우저 클라이언트사이드
- **기능**: 실시간 연속 인식, 임시/최종 결과 분리
- **언어**: 영어 (en-US)
- **설정**: `continuous: true`, `interimResults: true`

### 현재 아키텍처
```
[마이크] → [Web Speech API] → [브라우저] → [실시간 번역]
```

## 🌐 Google Cloud Speech-to-Text API 제약사항

### 기술적 제약사항

#### 1. API 액세스 방식
- **실시간 스트리밍**: gRPC API만 지원
- **브라우저 제한**: 직접 gRPC 호출 불가능
- **대안**: REST API는 실시간 스트리밍 미지원

#### 2. 브라우저 환경 한계
```
❌ 브라우저 → Google Cloud gRPC (직접 불가능)
❌ 브라우저 → Google Cloud REST (실시간 스트리밍 미지원)
✅ 브라우저 → 서버 프록시 → Google Cloud gRPC
```

#### 3. CORS 및 인증
- **CORS 제한**: 직접 API 호출 시 CORS 문제
- **인증 복잡성**: 서버사이드 서비스 계정 인증 필요
- **보안**: API 키 클라이언트 노출 불가

### 서비스 제한사항

#### 1. 스트리밍 제한
- **데이터 크기**: 최대 10MB per request
- **연결 방식**: gRPC 양방향 스트림 필요
- **지연시간**: 네트워크 + 서버 처리 지연

#### 2. 비용
- **사용량 기반**: 15초 단위 과금
- **월 60분**: 무료 티어 제한
- **초과 시**: $0.006/15초 단위

## 🏗️ 구현 가능한 아키텍처

### 1. 서버 프록시 방식 (권장)
```
[브라우저] --WebSocket--> [Node.js 서버] --gRPC--> [Google Cloud API]
```

**구성 요소:**
- **클라이언트**: Web Audio API + WebSocket
- **서버**: Express.js + Socket.io + Google Cloud SDK
- **오디오 포맷**: LINEAR16, 16kHz 샘플률

**장점:**
- 완전한 실시간 스트리밍
- 고품질 음성 인식
- 다양한 언어 지원

**단점:**
- 서버 인프라 필요
- 복잡한 구현
- 운영 비용 증가

### 2. Netlify Functions 확장 (제한적)
```
[브라우저] --HTTP chunks--> [Netlify Functions] --gRPC--> [Google Cloud API]
```

**제약사항:**
- 실행 시간 제한 (10초/15분)
- WebSocket 미지원
- Cold start 지연
- gRPC 라이브러리 크기 제한

**결론**: 실시간 요구사항에 부적합

### 3. Hybrid 방식
```
[Web Speech API] + [Google Cloud API] (백업/고급 기능용)
```

## 📊 비교 분석

| 기준 | Web Speech API | Google Cloud API |
|------|---------------|------------------|
| **지연시간** | 매우 낮음 (< 100ms) | 높음 (300-500ms) |
| **구현 복잡도** | 간단 | 복잡 |
| **인프라 요구** | 없음 | 서버 필요 |
| **비용** | 무료 | 유료 |
| **브라우저 지원** | 제한적 | 일관성 |
| **언어 지원** | 제한적 | 광범위 |
| **정확도** | 양호 | 우수 |
| **커스터마이징** | 제한적 | 광범위 |

## 🎯 권장사항

### 현재 Web Speech API 유지 권장

**이유:**
1. **프로젝트 특성**: 간단한 실시간 번역기
2. **사용자 경험**: 낮은 지연시간 중요
3. **운영 복잡도**: 서버리스 아키텍처 유지
4. **비용 효율성**: 무료 사용

### 개선 방안

#### 1. Web Speech API 최적화
```javascript
// 브라우저별 호환성 개선
recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 1;
recognition.lang = navigator.language || 'en-US';
```

#### 2. 에러 복구 강화
```javascript
// 자동 재시작 로직
recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => recognition.start(), 1000);
    }
};
```

#### 3. 언어 선택 기능
- 다중 언어 지원
- 사용자 설정 저장
- 자동 언어 감지

## 🔮 향후 고려사항

### Google Cloud API 전환 시점
다음 조건 만족 시 재검토:
- [ ] 서버 인프라 구축 계획
- [ ] 고정 사용자 기반 확보
- [ ] 고급 음성 인식 기능 필요
- [ ] 다국어 지원 확대 필요

### 기술 발전 모니터링
- WebRTC 기반 실시간 처리
- 브라우저 WebAssembly 지원 확대
- Edge Computing 활용 방안

## 📝 결론

**현재 상황에서는 Web Speech API 유지가 최적입니다.**

Google Cloud Speech-to-Text API는 기술적으로 구현 가능하지만, 현재 프로젝트의 요구사항(실시간성, 간단함, 비용 효율성)을 고려할 때 과도한 복잡성을 야기합니다.

대신 현재 Web Speech API의 성능과 호환성을 개선하는 방향으로 진행하는 것을 권장합니다.