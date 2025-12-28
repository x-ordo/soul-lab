# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soul Lab (소울 랩) is a Toss WebView mini-app for fortune/compatibility analysis with viral sharing mechanics. Built with React + Vite for frontend and Fastify for backend API.

## Commands

```bash
# Development
pnpm install           # Install dependencies
pnpm dev               # Run with granite (Toss Sandbox) - use intoss://soul-lab in sandbox app
pnpm dev:web           # Local browser only (limited Toss features)
pnpm dev:server        # API server at localhost:8787

# Build & Quality
pnpm build             # Full granite build
pnpm build:web         # TypeScript + Vite build
pnpm build:server      # Compile server TypeScript
pnpm lint              # ESLint
pnpm format            # Prettier
```

## Architecture

### Frontend (`src/`)
- **Pages**: Landing → Agreement → Loading → Result → Detail → Chemistry
- **Flow**: User agrees to terms → enters birthdate → sees fortune → unlocks detailed content via ads or viral sharing
- **Toss Integration** (`src/lib/toss.ts`): Wraps `@apps-in-toss/web-framework` for login, contactsViral, rewarded ads, sharing
- **Fortune Engine** (`src/utils/engine.ts`): Deterministic hash-based (FNV-1a) fortune generation from userKey + birthdate + date
- **Storage** (`src/lib/storage.ts`): localStorage for user state (seed, agreements, unlock status)

### Backend (`server/`)
- **Fastify API** at port 8787 with file-based persistence in `server/data/`
- **Invite System**: Create/join/reissue invites with 24h TTL for paired chemistry unlocks
- **Rate Limiting**: Fixed-window limits per IP and user key (configurable via env)
- **Reward Tracking**: Server-side record of rewarded ad completions (1 per user per day)

### Key Integration Points
- `granite.config.ts`: Toss mini-app configuration (permissions: contacts, clipboard, photos)
- Environment variables in `.env`: `VITE_CONTACTS_MODULE_ID`, `VITE_REWARDED_AD_GROUP_ID`, `VITE_OG_IMAGE_URL`, `VITE_API_BASE`

### Unlock Mechanics
1. **Ad Unlock**: Watch rewarded ad → server records in `/api/rewards/earn` → unlocks detail page for today
2. **Viral Unlock**: Create invite → partner joins via deep link → both users see chemistry + unlock detail

## Deep Links
- Result page: `intoss://soul-lab/result`
- Chemistry page: `intoss://soul-lab/chemistry?partner=<userKey>`

## Testing Notes
- contactsViral requires mini-app approval (returns Internal Server Error if unapproved)
- Sandbox app may show blank contactsViral UI - test on real device via console QR
- For mobile testing, deploy API server externally (localhost won't work from device)
