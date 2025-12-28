# Soul Lab API (Invite Gate)

## 로컬 실행
```bash
pnpm dev:server
# 기본 포트: 8787
```

## 환경변수
- `PORT` (default 8787)
- `DATA_DIR` (default `server/data`)

## API
- `POST /api/invites` { inviterKey } -> { inviteId, expiresAt }
- `POST /api/invites/:id/join` { userKey } -> { inviteId, role, partnerKey?, status }
- `GET /api/invites/:id` -> { inviteId, status, expiresAt }

status:
- `pending` : inviter만 존재
- `paired` : inviter + invitee 모두 존재
- `expired` : 만료

- `POST /api/invites/:id/reissue` { userKey } -> { inviteId, expiresAt }

- `POST /api/rewards/earn` { userKey, dateKey, scope? } -> { ok, already }

## Rate Limit (v0.4)
- INVITE_LIMIT_PER_IP (default 40 / hour)
- INVITE_LIMIT_PER_USER (default 20 / hour)
- REWARD_LIMIT_PER_IP (default 60 / 10min)
- REWARD_LIMIT_PER_USER (default 20 / 10min)
