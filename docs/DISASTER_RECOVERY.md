# Soul Lab 재해 복구 계획 (Disaster Recovery)

> 서비스 중단 시 복구 절차 및 비즈니스 연속성 계획

---

## 목차

1. [복구 목표](#복구-목표)
2. [데이터 분류](#데이터-분류)
3. [백업 전략](#백업-전략)
4. [복구 절차](#복구-절차)
5. [테스트 계획](#테스트-계획)

---

## 복구 목표

### RTO (Recovery Time Objective)

| 시스템        | RTO   | 우선순위 |
| ------------- | ----- | -------- |
| API 서버      | 1시간 | P0       |
| Frontend      | 30분  | P0       |
| Redis (캐시)  | 2시간 | P1       |
| 사용자 데이터 | 4시간 | P1       |

### RPO (Recovery Point Objective)

| 데이터 유형   | RPO        | 백업 주기   |
| ------------- | ---------- | ----------- |
| 크레딧 잔액   | 1시간      | 실시간 + 1h |
| 트랜잭션 로그 | 0 (무손실) | 실시간      |
| 사용자 프로필 | 24시간     | 일간        |
| 세션/초대     | 손실 허용  | 백업 없음   |

---

## 데이터 분류

### Critical (무손실 필수)

| 데이터         | 위치                                  | 암호화  |
| -------------- | ------------------------------------- | ------- |
| 크레딧 잔액    | `server/data/credits.json`            | AES-256 |
| 트랜잭션 로그  | `server/data/transactions.json`       | AES-256 |
| 결제 처리 기록 | `server/data/processed_payments.json` | 평문    |

### Important (24h RPO)

| 데이터        | 위치                         | 암호화             |
| ------------- | ---------------------------- | ------------------ |
| 사용자 프로필 | `server/data/profiles.json`  | AES-256 (생년월일) |
| 보상 기록     | `server/data/referrals.json` | 평문               |

### Ephemeral (손실 허용)

| 데이터     | 위치                | TTL    |
| ---------- | ------------------- | ------ |
| 초대 링크  | Redis `invite:*`    | 24시간 |
| 세션 토큰  | Redis `session:*`   | 7일    |
| Rate limit | Redis `ratelimit:*` | 1시간  |
| AI 캐시    | Redis `ai:*`        | 24시간 |

---

## 백업 전략

### 자동 백업 (구현 예정)

```bash
# Cron: 매 시간
0 * * * * /app/scripts/backup.sh

# backup.sh 예시
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/${TIMESTAMP}"

# 1. 데이터 디렉토리 복사
cp -r /app/data "${BACKUP_DIR}"

# 2. 암호화 (선택)
tar czf - "${BACKUP_DIR}" | \
  openssl enc -aes-256-cbc -salt -pass env:BACKUP_PASSWORD \
  > "${BACKUP_DIR}.tar.gz.enc"

# 3. S3 업로드
aws s3 cp "${BACKUP_DIR}.tar.gz.enc" \
  s3://soul-lab-backups/${TIMESTAMP}/

# 4. 30일 이상 된 백업 정리
aws s3 ls s3://soul-lab-backups/ | \
  awk '{print $2}' | \
  while read dir; do
    # 30일 이상 된 백업 삭제
  done
```

### 수동 백업

```bash
# Railway 서버에서 데이터 다운로드
railway run cat /app/data/credits.json > credits_backup.json
railway run cat /app/data/transactions.json > transactions_backup.json

# 로컬 암호화 저장
tar czf backup_$(date +%Y%m%d).tar.gz *.json
gpg --symmetric backup_$(date +%Y%m%d).tar.gz
```

### Redis 백업

```bash
# Upstash는 자동 백업 제공
# Console → Redis → Backups 탭에서 확인

# 수동 스냅샷 (필요시)
redis-cli -u $REDIS_URL BGSAVE
```

---

## 복구 절차

### 시나리오 1: Railway 서버 장애

**증상**: API 서버 완전 중단

**복구 절차**:

1. **긴급 대체 배포** (15분)

   ```bash
   # 새 Railway 프로젝트에 배포
   railway init
   railway up

   # 환경변수 설정
   railway variables set NODE_ENV=production
   railway variables set REDIS_URL=...
   # ... 나머지 변수들
   ```

2. **데이터 복원** (30분)

   ```bash
   # S3에서 최신 백업 다운로드
   aws s3 cp s3://soul-lab-backups/latest/ ./restore/

   # 복호화
   openssl enc -aes-256-cbc -d -in backup.tar.gz.enc \
     -pass env:BACKUP_PASSWORD > backup.tar.gz

   # Railway에 업로드
   railway run mkdir -p /app/data
   railway run "cat > /app/data/credits.json" < credits.json
   ```

3. **DNS 전환** (필요시)
   - Cloudflare → DNS → API 레코드 업데이트
   - 새 Railway URL로 변경

4. **검증**
   ```bash
   curl https://new-api-url/health
   curl https://new-api-url/api/credits/balance?userId=test
   ```

### 시나리오 2: Cloudflare Pages 장애

**증상**: Frontend 접근 불가

**복구 절차**:

1. **Vercel 대체 배포** (10분)

   ```bash
   pnpm build:web
   npx vercel --prod
   ```

2. **Toss 미니앱 URL 업데이트**
   - 토스 개발자 센터 → 앱 설정
   - WebView URL 변경

### 시나리오 3: Redis 데이터 손실

**증상**: 세션/초대 기능 장애

**복구 절차**:

1. **새 Redis 인스턴스 생성** (5분)
   - Upstash Console → Create Database
   - 새 REDIS_URL 획득

2. **환경변수 업데이트** (5분)

   ```bash
   railway variables set REDIS_URL=new-redis-url
   railway up
   ```

3. **영향 범위 공지**
   - 기존 초대 링크 만료됨
   - 로그인 세션 초기화됨
   - 사용자 재로그인 필요

### 시나리오 4: 크레딧 데이터 손상

**증상**: 크레딧 잔액 불일치

**복구 절차**:

1. **서비스 일시 중단**

   ```bash
   # API 서버에 maintenance 모드 활성화
   railway variables set MAINTENANCE_MODE=true
   railway up
   ```

2. **백업에서 복원**

   ```bash
   # 최신 정합성 있는 백업 찾기
   aws s3 ls s3://soul-lab-backups/ --recursive | tail -20

   # 복원
   aws s3 cp s3://soul-lab-backups/20260101_120000/credits.json ./

   # 검증 후 업로드
   railway run "cat > /app/data/credits.json" < credits.json
   ```

3. **트랜잭션 로그로 재생**

   ```bash
   # 백업 시점 이후의 트랜잭션만 재적용
   # (별도 스크립트 필요)
   ```

4. **서비스 재개**
   ```bash
   railway variables set MAINTENANCE_MODE=false
   railway up
   ```

---

## 테스트 계획

### 월간 DR 테스트

| 테스트           | 주기     | 담당     |
| ---------------- | -------- | -------- |
| 백업 복원 테스트 | 월 1회   | 운영팀   |
| 롤백 테스트      | 월 1회   | 개발팀   |
| 대체 배포 테스트 | 분기 1회 | 인프라팀 |

### 테스트 체크리스트

#### 백업 복원 테스트

- [ ] S3에서 백업 다운로드 성공
- [ ] 복호화 성공
- [ ] 데이터 정합성 검증
- [ ] API 정상 응답 확인
- [ ] 크레딧 잔액 일치 확인

#### 롤백 테스트

- [ ] Railway 이전 배포로 롤백
- [ ] 서비스 정상 작동 확인
- [ ] 현재 버전으로 재배포

#### 대체 배포 테스트

- [ ] 새 Railway 프로젝트 생성
- [ ] 환경변수 설정
- [ ] 데이터 마이그레이션
- [ ] 서비스 정상 작동 확인
- [ ] 테스트 프로젝트 삭제

---

## 커뮤니케이션 템플릿

### 장애 발생 공지

```
[Soul Lab] 서비스 장애 안내

현재 Soul Lab 서비스 이용에 불편을 드려 죄송합니다.
현재 일부 기능에 장애가 발생하여 복구 중입니다.

- 발생 시각: YYYY-MM-DD HH:MM
- 영향 범위: (영향받는 기능)
- 예상 복구: (예상 시간)

빠른 시일 내 정상화될 수 있도록 최선을 다하겠습니다.
```

### 복구 완료 공지

```
[Soul Lab] 서비스 정상화 안내

서비스가 정상화되었습니다.
이용에 불편을 드려 죄송합니다.

- 장애 시간: YYYY-MM-DD HH:MM ~ HH:MM (N분)
- 원인: (간략한 원인)
- 조치: (수행한 조치)

재발 방지를 위해 지속적으로 개선하겠습니다.
```

---

## 연락처

| 역할    | 담당 | 연락처 |
| ------- | ---- | ------ |
| DR 총괄 | TBD  | -      |
| 인프라  | TBD  | -      |
| 개발    | TBD  | -      |
| CS      | TBD  | -      |

---

_마지막 업데이트: 2026-01-02_
