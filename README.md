# GCC Quest AI Content Intelligence Platform

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```

3. Start local infrastructure (PostgreSQL, Redis, Qdrant):
   ```bash
   docker compose up -d
   ```

4. Run database migrations:
   ```bash
   pnpm --filter api exec prisma migrate dev
   ```

5. Seed database:
   ```bash
   pnpm --filter api exec prisma db seed
   ```

6. Start development servers:
   ```bash
   pnpm dev
   ```
