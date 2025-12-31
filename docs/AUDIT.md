# Soul Lab - Production Readiness Audit

**Date**: 2025-12-31
**Version**: 1.0.0

---

## Executive Summary

Soul Lab is a Toss WebView mini-app for fortune/compatibility analysis. Current state is **prototype-ready** but requires infrastructure improvements for production deployment.

| Category | Status | Notes |
|----------|--------|-------|
| Core Functionality | ✅ Working | Fortune engine, Tarot, Astrology, Credits/IAP |
| Testing | ✅ Good | 9 test files, comprehensive coverage |
| CI/CD | ⚠️ Partial | Lint + build only, no tests in CI |
| Observability | ❌ Missing | No structured logging, no request IDs |
| Deployment | ⚠️ Partial | Vercel configured, no backend deployment |
| Security | ⚠️ Basic | Rate limiting exists, no auth beyond userKey |

---

## 1. Dependencies

### Frontend (`package.json`)

| Package | Version | Status |
|---------|---------|--------|
| react | ^18.3.1 | ✅ Current |
| react-dom | ^18.3.1 | ✅ Current |
| react-router-dom | ^6.27.0 | ✅ Current |
| fastify | ^4.28.1 | ⚠️ Root has v4, server has v5 |
| vite | ^6.0.6 | ✅ Current |
| typescript | ^5.7.2 | ✅ Current |
| vitest | ^4.0.16 | ✅ Current |

### Backend (`server/package.json`)

| Package | Version | Status |
|---------|---------|--------|
| fastify | ^5.6.2 | ✅ Current |
| @fastify/cors | ^11.2.0 | ✅ Current |
| @anthropic-ai/sdk | ^0.71.2 | ✅ Current |
| openai | ^6.15.0 | ✅ Current |
| astronomia | ^4.2.0 | ✅ Current |
| dotenv | ^17.2.3 | ✅ Current |

### Vulnerability Scan

```
✅ 0 vulnerabilities found (425 dependencies scanned)
```

### Missing Production Dependencies

| Package | Purpose | Priority |
|---------|---------|----------|
| pino | Structured JSON logging | P0 |
| zod | Schema validation | P0 |
| uuid | Request ID generation | P0 (or use crypto.randomUUID) |

---

## 2. What's Working

### Frontend
- ✅ Route-based code splitting (9 lazy-loaded pages)
- ✅ Toss WebView integration with mocks for standalone
- ✅ Bundle optimization (231KB → 63KB brotli)
- ✅ Error boundary
- ✅ Toast notifications

### Backend
- ✅ Fastify v5 with CORS
- ✅ File-based persistence (`server/data/`)
- ✅ Rate limiting (IP + user-based)
- ✅ Health check (`GET /health`)
- ✅ Invite system with 24h TTL
- ✅ Credit system (purchase, referral, streak rewards)
- ✅ Tarot engine (78 cards, 5 spread types)
- ✅ Astrology calculator (natal charts, synastry)
- ✅ AI integration (OpenAI + Anthropic)

### Testing
- ✅ 9 test files covering core functionality
- ✅ Vitest configuration for frontend + backend
- ✅ Test utilities and setup files

### CI/CD
- ✅ GitHub Actions workflow (lint → build)
- ✅ Vercel deployment configuration
- ✅ Build artifacts uploaded

---

## 3. Critical Gaps (P0)

### 3.1 No Structured Logging

**Current**: `console.error()` scattered throughout (`server/src/routes/fortune.ts:395,444,489,562,636`)

**Impact**: Cannot trace requests, debug production issues, or set up alerting

**Fix**: Add Pino logger with:
- JSON output
- Request ID per request
- Correlation ID from headers
- Log levels (debug/info/warn/error)

### 3.2 No Request Tracking

**Current**: No request ID, no correlation ID

**Impact**: Cannot trace distributed requests, cannot correlate logs

**Fix**: Add middleware to generate/propagate request IDs

### 3.3 Inconsistent Error Handling

**Current**: Per-route try/catch with varying error formats

**Impact**: Clients cannot reliably parse errors, no error codes

**Fix**: Centralized error handler with standard response format:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "...",
    "requestId": "..."
  }
}
```

### 3.4 No Backend Deployment Config

**Current**: Only Vercel (frontend) configured

**Impact**: Cannot deploy backend to production

**Fix**: Add Railway/Fly.io configuration with:
- Persistent volume for `server/data/`
- Environment variable management
- Health check configuration

### 3.5 No Readiness Probe

**Current**: Only liveness (`/health → { ok: true }`)

**Impact**: Cannot verify dependencies before accepting traffic

**Fix**: Add `/ready` endpoint checking:
- Data directory writable
- AI provider keys configured

### 3.6 Tests Not in CI

**Current**: CI runs lint + build only

**Impact**: Regressions not caught before merge

**Fix**: Add test step to CI workflow

---

## 4. Architecture Gaps (P1)

### 4.1 Fortune Engine is Frontend-Only

**Current**: Hash-based template selection in `src/utils/engine.ts`

**Impact**:
- Cannot add server-side rule logic
- Cannot A/B test fortunes
- Cannot update rules without frontend deploy

**Fix**: Migrate to server-side YAML rule engine

### 4.2 No Environment Separation

**Current**: Single `.env.example`, no staging/prod configs

**Impact**: Risk of using wrong keys in production

**Fix**: Zod-validated config with environment-specific defaults

### 4.3 Fastify Version Mismatch

**Current**: Root `package.json` has Fastify v4, server has v5

**Impact**: Potential API incompatibilities

**Fix**: Remove Fastify from root dependencies (it's only needed in server)

---

## 5. Security Assessment

| Area | Status | Notes |
|------|--------|-------|
| Rate Limiting | ✅ | Fixed-window per IP and user |
| Input Validation | ⚠️ | Basic, not comprehensive |
| Auth | ⚠️ | userKey only (client-generated) |
| Secrets | ✅ | In .env, not committed |
| CORS | ⚠️ | All origins allowed |
| Dependencies | ✅ | 0 known vulnerabilities |

---

## 6. Performance Baseline

### Frontend
- Initial JS: 231KB (uncompressed)
- Gzip: 76KB
- Brotli: 63KB
- Lazy chunks: 9

### Backend
- File-based persistence (suitable for MVP scale)
- In-memory rate limiting (resets on restart)
- No caching layer

---

## 7. Recommended Implementation Order

| Priority | Task | Effort |
|----------|------|--------|
| P0-1 | Add Pino logger + request context | 2h |
| P0-2 | Centralized error handler | 2h |
| P0-3 | Environment config with Zod | 1h |
| P0-4 | Add /ready endpoint | 30m |
| P0-5 | Add tests to CI | 30m |
| P0-6 | Railway deployment config | 1h |
| P0-7 | YAML rule engine (core) | 8h |
| P0-8 | Template migration script | 4h |
| P0-9 | Frontend API integration | 4h |
| P1-1 | AI enhancement layer | 4h |

---

## 8. File Inventory

### Critical Files to Modify

| File | Changes Needed |
|------|----------------|
| `server/src/index.ts` | Middleware integration, /ready |
| `server/package.json` | Add pino, zod |
| `.github/workflows/ci.yml` | Add test step |

### New Files to Create

| File | Purpose |
|------|---------|
| `server/src/config/index.ts` | Env validation |
| `server/src/lib/logger.ts` | Pino configuration |
| `server/src/middleware/requestContext.ts` | Request ID |
| `server/src/middleware/errorHandler.ts` | Error handler |
| `server/src/fortune-engine/` | New rule engine |
| `server/railway.toml` | Deployment config |

---

## 9. Definition of Done

- [ ] No `console.error` in production code paths
- [ ] All requests have request ID in logs
- [ ] All errors return standardized format
- [ ] `/health` and `/ready` endpoints respond correctly
- [ ] Tests run in CI and pass
- [ ] Backend deployable via single command
- [ ] Fortune API returns deterministic results
