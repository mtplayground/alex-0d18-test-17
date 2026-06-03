# myClawTeam

myClawTeam is a file-sharing web app. It provides a React + Tailwind upload UI, an
Express API, PostgreSQL metadata storage through Prisma, and S3-compatible object
storage for file bytes.

## Repository Layout

- `apps/web` - React frontend built with Vite and Tailwind CSS.
- `apps/api` - Express API server. It listens on `0.0.0.0:8080` by default.
- `packages/shared` - Shared TypeScript response and DTO types used by both apps.
- `prisma` - PostgreSQL Prisma schema and committed migrations.
- `.env.example` - Environment variable template for local and hosted deployments.

## Requirements

- Node.js 20 or newer
- npm 9 or newer
- PostgreSQL 16 or compatible PostgreSQL database
- S3-compatible object storage bucket

Persistent state must live in PostgreSQL. Do not use SQLite, local JSON files, in-memory
maps, or ephemeral volumes for deployed metadata.

## Environment

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Required backend settings:

- `HOST` - API bind host, defaults to `0.0.0.0`.
- `PORT` - API port, defaults to `8080`.
- `DATABASE_URL` - PostgreSQL connection string used by Prisma.
- `OBJECT_STORAGE_ENDPOINT` - S3-compatible object storage endpoint.
- `OBJECT_STORAGE_REGION` - S3-compatible object storage region.
- `OBJECT_STORAGE_ACCESS_KEY_ID` - object storage access key.
- `OBJECT_STORAGE_SECRET_ACCESS_KEY` - object storage secret key.
- `OBJECT_STORAGE_BUCKET` - object storage bucket name.
- `OBJECT_STORAGE_FORCE_PATH_STYLE` - optional boolean, defaults to `true`.
- `MAX_FILE_SIZE_BYTES` - backend upload limit, defaults to `10485760`.
- `VITE_MAX_FILE_SIZE_BYTES` - frontend upload limit display and client-side check.

Node does not load `.env` automatically. Export the values before running commands:

```bash
set -a
. ./.env
set +a
```

## Install

```bash
npm ci
npm run prisma:generate
```

## Development

Run the API:

```bash
npm run dev:api
```

Run the web app:

```bash
npm run dev:web
```

Both development scripts bind to `0.0.0.0:8080`, so run one at a time unless you put a
local reverse proxy in front of them. The browser app posts uploads to same-origin
`/api/files`; integrated upload testing should use the production-style proxy routing
described below.

## API

- `GET /api/health` returns API health.
- `POST /api/files` accepts one multipart file field named `file`, streams it to object
  storage, records metadata in PostgreSQL, and returns a short `linkId`.
- `GET /:linkId` downloads the stored file with the recorded content type, filename, and
  content length.

Error responses use this shape:

```json
{
  "error": {
    "code": "not_found",
    "message": "No file found for that link ID"
  }
}
```

Expected client errors return specific messages. Unexpected server failures return
`internal_server_error` with a generic message so deployment details and credentials are
not exposed to clients.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
DATABASE_URL=postgresql://user:password@host:5432/database npm run test:e2e
npm run build
```

Apply committed migrations before running the app against a fresh database:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database npm run prisma:migrate:deploy
```

## Bare Self-Hosted Deployment

1. Provision PostgreSQL and an S3-compatible bucket.
2. Clone the repository on the host.
3. Create an environment file from `.env.example` and set production values.
4. Install dependencies and generate the Prisma client:

```bash
npm ci
set -a
. ./.env
set +a
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
```

5. Start the API:

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

6. Serve `apps/web/dist` with a static web server such as Caddy or Nginx.
7. Proxy these routes to the API process:

- `/api/*`
- `/:linkId` where `linkId` matches `[A-Za-z0-9_-]{1,32}`

All other routes can serve `apps/web/dist/index.html`.

For process managers such as systemd, run from the repository root after `npm run build`
and provide the same environment variables:

```ini
[Service]
WorkingDirectory=/srv/myclawteam
EnvironmentFile=/srv/myclawteam/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
```
