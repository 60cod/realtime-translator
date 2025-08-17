# Web Speech API 대체 옵션 분석

> 작성일: 2025-01-17  
> 목적: Web Speech API의 낮은 인식률 문제 해결을 위한 대체 솔루션 조사  
> 범위: 무료/저가 API, 오픈소스, 서버 솔루션 포함

## 🎯 문제 정의

### 현재 Web Speech API 한계
- **낮은 인식률**: 빠른 발화나 불명확한 발음에 취약
- **브라우저 의존성**: 브라우저별 성능 차이
- **제한된 커스터마이징**: 모델 튜닝 불가능
- **언어 지원**: 제한적인 다국어 지원

## 📊 대체 솔루션 분석

### 1. 상용 API (무료/프리미엄 티어)

#### 🥇 AssemblyAI (추천)
**무료 티어:**
- $50 크레딧 (약 330시간)
- 실시간 스트리밍 지원

**가격:**
- 실시간: $0.15/시간 ($0.0025/분)
- 실제 비용: ~$0.0042/분 (세션 기반 과금)

**장점:**
- ✅ 높은 정확도 (Web Speech API 대비 우수)
- ✅ 실시간 스트리밍 최적화
- ✅ Universal-Streaming: 41% 빠른 지연시간
- ✅ 40+ 언어 지원
- ✅ PII 제거, 노이즈 필터링
- ✅ 브라우저 WebSocket 직접 연동 가능

**구현 복잡도:** ⭐⭐☆☆☆ (중간)

#### 🥈 Deepgram Nova-3
**무료 티어:**
- $150-200 크레딧
- 실시간 스트리밍 지원

**가격:**
- Nova-3: $0.0043/분
- 50 스트림 동시 처리 제한

**장점:**
- ✅ 업계 최고 정확도 (54.3% WER 개선)
- ✅ 100+ 언어 지원
- ✅ 코드 스위칭 지원
- ✅ 온프레미스 배포 가능

**단점:**
- ❌ AssemblyAI 대비 높은 지연시간
- ❌ 더 높은 가격

**구현 복잡도:** ⭐⭐☆☆☆ (중간)

#### 🥉 Azure Speech Services
**무료 티어:**
- 월 5시간 무료
- 12개월 $200 크레딧

**가격:**
- $1.00/시간 (OpenAI 대비 3배 비쌈)

**장점:**
- ✅ 화자 분리 (Diarization)
- ✅ 배치 처리 (1GB 파일)
- ✅ 100+ 언어 지원

**단점:**
- ❌ 높은 가격
- ❌ 정확도 상대적으로 낮음
- ❌ 복잡한 설정

**구현 복잡도:** ⭐⭐⭐☆☆ (높음)

#### 🔄 OpenAI Whisper API
**가격:**
- $0.36/시간 ($0.006/분)

**장점:**
- ✅ 높은 정확도 (WER 7.60%)
- ✅ 다국어 번역 기능
- ✅ 코드/전문용어 인식 우수

**단점:**
- ❌ 실시간 스트리밍 미지원
- ❌ 25MB 파일 크기 제한
- ❌ 배치 처리만 가능

**구현 복잡도:** ⭐⭐☆☆☆ (중간)

### 2. 오픈소스 솔루션

#### 🏆 OpenAI Whisper (로컬/서버)
**비용:** 무료 (인프라 비용만)

**실시간 구현 옵션:**
1. **WhisperLive**: `github.com/collabora/WhisperLive`
2. **whisper_streaming**: `github.com/ufal/whisper_streaming`
3. **커스텀 WebSocket 서버**

**장점:**
- ✅ 최고 수준 정확도
- ✅ 완전 무료
- ✅ 데이터 프라이버시
- ✅ 커스터마이징 가능
- ✅ 다양한 백엔드 지원

**단점:**
- ❌ 서버 인프라 필요
- ❌ 높은 구현 복잡도
- ❌ GPU 리소스 권장
- ❌ 실시간 최적화 필요

**구현 복잡도:** ⭐⭐⭐⭐☆ (매우 높음)

#### DeepSpeech / SpeechBrain
**비용:** 무료

**한계:**
- ❌ 10초 제한 (DeepSpeech)
- ❌ Whisper 대비 낮은 정확도
- ❌ 제한적인 언어 지원

**구현 복잡도:** ⭐⭐⭐☆☆ (높음)

## 🏗️ 구현 아키텍처 옵션

### Option 1: AssemblyAI 직접 연동 (권장)
```
[브라우저] --WebSocket--> [AssemblyAI API]
```

**구현 시간:** 1-2일  
**비용:** $50 크레딧으로 시작  
**정확도:** ⭐⭐⭐⭐⭐

```javascript
// 예제 코드
const socket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=YOUR_TOKEN');
```

### Option 2: Whisper 서버 구축
```
[브라우저] --WebSocket--> [Node.js + Whisper] --Local--> [Whisper Model]
```

**구현 시간:** 1-2주  
**비용:** 서버 비용만 ($5-20/월)  
**정확도:** ⭐⭐⭐⭐⭐

```bash
# WhisperLive 서버 실행
python3 run_server.py --port 9090 --backend faster_whisper
```

### Option 3: Hybrid 접근법
```
[Web Speech API] + [AssemblyAI Fallback]
```

**구현 시간:** 3-5일  
**비용:** 최소화  
**정확도:** ⭐⭐⭐⭐☆

## 💰 비용 분석 (월 100시간 사용 기준)

| 솔루션 | 무료 티어 | 월 비용 | 연간 비용 |
|--------|-----------|---------|-----------|
| **AssemblyAI** | 330시간 | $15 | $180 |
| **Deepgram** | 37-50시간 | $26 | $312 |
| **Azure** | 5시간 | $100 | $1,200 |
| **OpenAI Whisper API** | 없음 | $36 | $432 |
| **Whisper 로컬** | 무제한 | $10-20 | $120-240 |
| **Web Speech API** | 무제한 | $0 | $0 |

## 🎯 권장사항

### 단기 솔루션 (1주 내 구현)
**AssemblyAI 실시간 API 도입**

**구현 계획:**
1. AssemblyAI 계정 생성 및 API 키 발급
2. 현재 `speechRecognition.js` 모듈 수정
3. WebSocket 기반 실시간 연동
4. 에러 핸들링 및 fallback 로직

**예상 효과:**
- 📈 인식률 30-50% 향상
- ⚡ 지연시간 유지
- 💰 월 $15 비용 (330시간 무료 후)

### 중장기 솔루션 (1개월 내 구현)
**Whisper 로컬 서버 구축**

**구현 계획:**
1. Node.js + WhisperLive 서버 구축
2. Docker 컨테이너화
3. 클라우드 배포 (AWS/GCP/Azure)
4. 로드밸런싱 및 모니터링

**예상 효과:**
- 📈 최고 수준 인식률
- 🔒 데이터 프라이버시
- 💰 월 $10-20 인프라 비용
- ⚙️ 완전한 커스터마이징

## 🚀 즉시 실행 가능한 실험

### AssemblyAI 프로토타입 (1일)
```javascript
// 기존 Web Speech API 대체
class AssemblyAIRecognition {
    constructor() {
        this.socket = null;
        this.isRecognizing = false;
    }
    
    async start() {
        const token = await this.getRealtimeToken();
        this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);
        // ... implementation
    }
}
```

### 비교 테스트 환경
1. 동일한 오디오 샘플로 정확도 비교
2. 지연시간 측정
3. 사용자 피드백 수집

## 📋 결론

**즉시 개선이 필요하다면 AssemblyAI**, **장기적으로 최고 성능을 원한다면 Whisper 로컬 서버**를 권장합니다.

현재 프로젝트의 Netlify Functions 아키텍처와 호환성을 고려할 때, AssemblyAI가 가장 현실적인 선택입니다.

**다음 단계:**
1. AssemblyAI 무료 계정 생성
2. 프로토타입 구현 및 테스트
3. 성능 만족 시 전체 마이그레이션
4. 장기적으로 Whisper 서버 검토