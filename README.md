# myClawTeam

myClawTeam is a file-sharing web app. This repository is organized as a Node workspace with a React + Tailwind frontend, an Express backend, and shared TypeScript types.

## Repository Layout

- `apps/web` - React frontend built with Vite and Tailwind CSS.
- `apps/api` - Express API server. It listens on `0.0.0.0:8080` by default.
- `packages/shared` - Shared TypeScript response and DTO types used by both apps.
- `.plan` - Architecture plan and issue dependency map for the full implementation sequence.

## Prerequisites

- Node.js 20 or newer
- npm 9 or newer

## Install

```bash
npm install
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

Both app-level dev servers default to `0.0.0.0:8080`. Run one at a time or set `PORT` for the API when developing both processes locally.

## Build

```bash
npm run build
```

## Production Start

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

The current backend exposes `GET /api/health` as the initial API surface. File upload, PostgreSQL metadata, object storage, and download routes are scheduled for later issues.
