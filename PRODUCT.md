# myClawTeam Product Contract

myClawTeam is a small file-sharing web app. Users upload one file and receive a short,
shareable link that downloads the original bytes with the recorded filename and content
type.

## Current Capabilities

- React + Tailwind upload page with drag-and-drop, file picker, upload progress, size
  validation, error states, and success state.
- One-click copy button for the generated share link.
- `POST /api/files` accepts a multipart field named `file`, enforces the configured file
  size limit, streams bytes to object storage, records metadata, and returns a short
  `linkId`.
- `GET /:linkId` looks up metadata and streams the object back with `Content-Type`,
  `Content-Length`, and `Content-Disposition` headers.
- `GET /api/health` reports API health.

## Architecture

- Monorepo managed with npm workspaces.
- `apps/web`: Vite React frontend.
- `apps/api`: Express API server, default bind `0.0.0.0:8080`.
- `packages/shared`: shared TypeScript response types.
- `prisma`: PostgreSQL Prisma schema and migrations.
- PostgreSQL is the only supported persistent metadata store.
- File bytes are stored in an S3-compatible object storage bucket.

## Data Model

The `files` table stores:

- `link_id` primary key
- original filename
- content type
- byte size
- object storage key
- created timestamp

## Configuration

Runtime configuration comes from environment variables. Important values are
`DATABASE_URL`, object storage endpoint/region/credentials/bucket, `MAX_FILE_SIZE_BYTES`,
`HOST`, and `PORT`. `.env.example` documents the expected variables. Node does not load
`.env` automatically.

## Conventions

- API errors use `{ "error": { "code": string, "message": string } }`.
- Expected client errors return specific messages; unexpected server errors return a
  generic `internal_server_error` response.
- Deployed metadata must not use SQLite, JSON files, in-memory maps, or ephemeral volumes.
- Bare self-hosted deployments should serve `apps/web/dist` statically and proxy `/api/*`
  plus short `/:linkId` download routes to the API.
- Quality gates are TypeScript typecheck, ESLint, Prettier, unit tests, E2E
  upload-link-download test, and production build.
