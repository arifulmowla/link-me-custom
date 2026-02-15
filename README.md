# Linkme

Linkme is a URL shortener application built with Next.js App Router.

## Prerequisites

1. Node.js 20+
2. npm 10+
3. A Neon PostgreSQL database

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Fill these values:
- `DATABASE_URL`: Neon pooled connection URL
- `DIRECT_URL`: Neon direct connection URL for Prisma migrations
- `APP_BASE_URL`: public base URL (for local: `http://localhost:3000`)
- `IP_HASH_SALT`: secret used to hash visitor IPs before storage

## Install and Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

## Backend Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

## API Verification

Create a short link:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com/docs","source":"homepage_hero"}'
```

Expected response:

```json
{ "shortUrl": "http://localhost:3000/abc1234", "code": "abc1234" }
```

Follow the short link:

```bash
curl -i http://localhost:3000/abc1234
```

Expected behavior: HTTP `307` redirect to the original URL when code exists.
