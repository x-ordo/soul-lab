# Soul Lab 운영 런북 (Runbook)

> 인시던트 대응 및 운영 절차 가이드

---

## 목차

1. [시스템 개요](#시스템-개요)
2. [모니터링](#모니터링)
3. [인시던트 대응](#인시던트-대응)
4. [일반 운영 절차](#일반-운영-절차)
5. [롤백 절차](#롤백-절차)
6. [연락처](#연락처)

---

## 시스템 개요

### 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│    Railway      │────▶│    Upstash      │
│  Pages (FE)     │     │  Server (API)   │     │    Redis        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  OpenAI /       │
                        │  Anthropic API  │
                        └─────────────────┘
```

### 구성 요소

| 컴포넌트       | 플랫폼           | URL                                      |
| -------------- | ---------------- | ---------------------------------------- |
| Frontend       | Cloudflare Pages | `https://soul-lab.pages.dev`             |
| API Server     | Railway          | `https://soul-lab-server.up.railway.app` |
| Redis          | Upstash          | Console: `https://console.upstash.com`   |
| Error Tracking | Sentry           | `https://sentry.io`                      |
| Logs           | Railway          | Dashboard → Logs                         |

### 환경 변수

```bash
# 필수
NODE_ENV=production
PORT=8787
DATA_DIR=/app/data
REDIS_URL=rediss://...
SIGNING_SECRET=...

# AI (유료 기능)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# 모니터링
SENTRY_DSN=https://...@sentry.io/...
```

---

## 모니터링

### 헬스체크

```bash
# API 서버 상태 확인
curl https://soul-lab-server.up.railway.app/health

# 예상 응답
{"status":"ok","timestamp":"...","uptime":12345}
```

### Sentry 대시보드

1. [Sentry](https://sentry.io) 로그인
2. Projects → soul-lab 선택
3. Issues 탭에서 에러 확인

### Railway 로그

1. [Railway Dashboard](https://railway.app) 로그인
2. soul-lab-server 프로젝트 선택
3. Deployments → 최신 배포 → Logs

### 주요 메트릭

| 메트릭        | 정상 범위 | 알림 임계값 |
| ------------- | --------- | ----------- |
| API 응답 시간 | < 200ms   | > 1000ms    |
| 에러율        | < 1%      | > 5%        |
| Redis 연결    | 정상      | 연결 실패   |
| AI API 호출   | 정상      | 타임아웃    |

---

## 인시던트 대응

### 심각도 정의

| 레벨   | 설명             | 대응 시간      |
| ------ | ---------------- | -------------- |
| **P0** | 전체 서비스 중단 | 즉시 (15분 내) |
| **P1** | 핵심 기능 장애   | 1시간 내       |
| **P2** | 부분 기능 장애   | 4시간 내       |
| **P3** | 경미한 이슈      | 다음 영업일    |

### P0: 서비스 전면 장애

**증상**: 모든 사용자가 앱 접근 불가

**진단 순서**:

```bash
# 1. API 서버 확인
curl -I https://soul-lab-server.up.railway.app/health

# 2. Frontend 확인
curl -I https://soul-lab.pages.dev

# 3. Railway 상태 확인
# → https://status.railway.app
```

**대응**:

1. Railway Dashboard에서 최근 배포 확인
2. 문제 배포 발견 시 → [롤백 절차](#롤백-절차) 실행
3. Sentry에서 에러 스택 확인
4. 필요시 이전 안정 버전으로 롤백

### P1: API 서버 장애

**증상**: 운세/타로 등 API 호출 실패

**진단**:

```bash
# 특정 엔드포인트 테스트
curl https://soul-lab-server.up.railway.app/api/health
curl https://soul-lab-server.up.railway.app/api/fortune/daily
```

**대응**:

1. Railway 로그에서 에러 확인
2. Redis 연결 상태 확인 (Upstash Console)
3. AI API 상태 확인 (OpenAI Status, Anthropic Status)
4. Rate limit 확인

### P1: Redis 연결 장애

**증상**: 초대/세션 관련 기능 실패

**진단**:

1. Upstash Console → Redis 인스턴스 상태
2. Railway 로그에서 `redis_connection_error` 검색

**대응**:

1. Upstash 상태 페이지 확인
2. REDIS_URL 환경변수 검증
3. 필요시 새 Redis 인스턴스 생성 및 마이그레이션

### P1: AI API 장애

**증상**: AI 상담/타로 해석 실패, 폴백 응답 반환

**진단**:

```bash
# 로그에서 AI 관련 에러 검색
# Railway Logs → "ai_" 필터
```

**대응**:

1. [OpenAI Status](https://status.openai.com) 확인
2. [Anthropic Status](https://status.anthropic.com) 확인
3. API 키 유효성/할당량 확인
4. 폴백이 정상 작동 중인지 확인 (fallback: true)

### P2: Rate Limit 초과

**증상**: 429 Too Many Requests 응답

**진단**:

```bash
# 로그에서 rate limit 확인
# Railway Logs → "rate_limit" 필터
```

**대응**:

1. 공격인지 정상 트래픽인지 확인
2. 공격 시: IP 차단 고려
3. 정상 트래픽 시: 환경변수로 limit 조정
   ```
   INVITE_LIMIT_PER_IP=100
   REWARD_LIMIT_PER_USER=50
   ```

---

## 일반 운영 절차

### 수동 배포

```bash
# Frontend (Cloudflare Pages)
pnpm build:web
# → GitHub push 시 자동 배포

# Backend (Railway)
cd server
pnpm build
# → GitHub push 시 자동 배포 (main 브랜치)
```

### 환경변수 변경

1. Railway Dashboard → soul-lab-server
2. Variables 탭
3. 변수 추가/수정
4. Redeploy 클릭 (자동 재시작)

### 로그 검색

```bash
# Railway CLI 사용
railway logs --filter "error"
railway logs --filter "request_id:abc123"

# correlationId로 요청 추적
# → 클라이언트 X-Correlation-ID 헤더 확인
```

### Redis 데이터 확인

1. Upstash Console 로그인
2. Data Browser 탭
3. 키 패턴으로 검색:
   - `invite:*` - 초대 데이터
   - `session:*` - 세션 데이터
   - `ratelimit:*` - Rate limit 카운터

---

## 롤백 절차

### Railway (API 서버)

1. Railway Dashboard → Deployments
2. 이전 안정 배포 찾기
3. 우측 메뉴 → Rollback
4. 확인 후 롤백 실행

### Cloudflare Pages (Frontend)

1. Cloudflare Dashboard → Pages → soul-lab
2. Deployments 탭
3. 이전 안정 배포 찾기
4. "Rollback to this deployment" 클릭

### Git 롤백 (긴급)

```bash
# 마지막 커밋 되돌리기
git revert HEAD
git push origin main

# 특정 커밋으로 되돌리기
git revert <commit-hash>
git push origin main
```

---

## 연락처

### 에스컬레이션

| 레벨 | 담당     | 연락처              |
| ---- | -------- | ------------------- |
| L1   | 운영팀   | Slack #soul-lab-ops |
| L2   | 개발팀   | Slack #soul-lab-dev |
| L3   | 인프라팀 | Slack #infra        |

### 외부 서비스

| 서비스     | 상태 페이지          | 지원                  |
| ---------- | -------------------- | --------------------- |
| Railway    | status.railway.app   | Discord               |
| Cloudflare | cloudflarestatus.com | Support Portal        |
| Upstash    | status.upstash.com   | Discord               |
| OpenAI     | status.openai.com    | help.openai.com       |
| Anthropic  | status.anthropic.com | support@anthropic.com |

---

## 부록: 에러 코드 참조

| 코드                 | HTTP | 설명             |
| -------------------- | ---- | ---------------- |
| VALIDATION_ERROR     | 400  | 입력값 검증 실패 |
| UNAUTHORIZED         | 401  | 인증 실패        |
| INSUFFICIENT_CREDITS | 402  | 크레딧 부족      |
| FORBIDDEN            | 403  | 권한 없음        |
| NOT_FOUND            | 404  | 리소스 없음      |
| CONFLICT             | 409  | 리소스 충돌      |
| RATE_LIMITED         | 429  | 요청 제한 초과   |
| INTERNAL_ERROR       | 500  | 서버 내부 오류   |
| SERVICE_UNAVAILABLE  | 503  | 서비스 일시 중단 |

---

_마지막 업데이트: 2026-01-02_
