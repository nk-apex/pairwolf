# WOLFBOT Session Generator

## Overview

WOLFBOT Session Generator is a full-stack web application that generates WhatsApp session IDs through two connection methods: 8-digit pairing codes and QR codes. The app features a dark, cyberpunk-themed UI with neon green accents and glass-morphism effects. After linking, it automatically joins a WhatsApp group, follows a channel, and sends session credentials in `WOLF-BOT:~{base64_creds}` format.

The application uses a React frontend with an Express backend, connected via REST API endpoints. Session data is currently stored in-memory but the project is configured for PostgreSQL via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode by default
- **Visual Theme**: Cyberpunk/hacker aesthetic — black backgrounds, neon green (`#00ff00`) accents, glass-morphism cards with `backdrop-blur-sm`, glow effects via box shadows
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (server/)
- **Framework**: Express.js running on Node with TypeScript (tsx for dev, esbuild for production)
- **HTTP Server**: Node's `createServer` wrapping Express (supports WebSocket upgrade if needed)
- **API Pattern**: REST endpoints under `/api/` prefix
- **Key Endpoints**:
  - `POST /api/generate-session` — Creates a new session with pairing code or QR code
  - Session status polling and verification endpoints
- **QR Code Generation**: Uses the `qrcode` npm package to generate data URLs server-side
- **Dev Server**: Vite dev server middleware integrated into Express during development
- **Production**: Static files served from `dist/public`

### Shared (shared/)
- **Schema**: `shared/schema.ts` defines TypeScript interfaces and Zod validation schemas shared between frontend and backend
- **Key Types**: `Session`, `SessionStatus` (pending → connecting → connected → failed → terminated), `CreateSessionRequest`, `PairingVerifyRequest`
- **No Drizzle tables defined yet** — The schema currently only contains TypeScript interfaces and Zod schemas, not Drizzle table definitions. The `drizzle.config.ts` points to this file and expects PostgreSQL.

### Data Storage
- **Current**: In-memory storage (`MemStorage` class using a `Map<string, Session>`)
- **Planned**: PostgreSQL via Drizzle ORM. The `drizzle.config.ts` is configured and `DATABASE_URL` environment variable is expected. When adding database support, create Drizzle table schemas in `shared/schema.ts` and update `server/storage.ts` to use `drizzle-orm` queries.
- **Session IDs**: Generated as `wolf_` + 4 random hex bytes
- **Pairing Codes**: Random 8-digit numbers
- **Credentials**: Base64-encoded JSON payloads with session ID, timestamp, random key, and device info

### Build System
- **Dev**: `tsx server/index.ts` with Vite middleware for HMR
- **Build**: Custom `script/build.ts` runs Vite build for client, esbuild for server
- **Output**: `dist/` directory with `dist/public/` for static assets and `dist/index.cjs` for server
- **DB Migrations**: `drizzle-kit push` via `npm run db:push`

## External Dependencies

- **PostgreSQL**: Required database (connection via `DATABASE_URL` env var). Currently in-memory but Drizzle ORM + drizzle-kit are configured for PostgreSQL.
- **QRCode (npm)**: Server-side QR code generation as data URLs
- **WhatsApp Integration** (simulated): The app references auto-joining WhatsApp groups and channels after session linking. Currently simulated with timeouts in `server/routes.ts` — no actual WhatsApp API integration exists.
- **Replit Plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for Replit development environment
- **connect-pg-simple**: PostgreSQL session store for Express sessions (available but not actively wired up)
- **react-icons**: Used for WhatsApp icon (`SiWhatsapp`)