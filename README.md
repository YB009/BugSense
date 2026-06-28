<div align="center">
  <img src="docs/assets/bugsense-logo.svg" alt="BugSense logo" width="96" height="96" />
  <h1>BugSense</h1>
  <p>
    Error monitoring program for React/Next apps, with live ingestion,
    grouped issues, alerting, and Gemini-assisted diagnosis.
  </p>
  <p>
    <a href="https://bugsensedashboard-production.up.railway.app"><strong>Live Dashboard</strong></a>
    &middot;
    <a href="https://www.npmjs.com/package/@bugsense/bugsense-js"><strong>npm SDK</strong></a>
  </p>
  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white" />
    <img alt="NestJS" src="https://img.shields.io/badge/NestJS-API%20Gateway%20%2B%20Services-e0234e?style=flat-square&logo=nestjs&logoColor=white" />
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-Dashboard-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
    <img alt="ClickHouse" src="https://img.shields.io/badge/ClickHouse-Events-ffcc01?style=flat-square&logo=clickhouse&logoColor=black" />
    <img alt="Redis" src="https://img.shields.io/badge/Redis-Queues-dc382d?style=flat-square&logo=redis&logoColor=white" />
    <img alt="Railway" src="https://img.shields.io/badge/Railway-Deployed-0b0d0e?style=flat-square&logo=railway&logoColor=white" />
    <img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
  </p>
</div>

---

BugSense is a self-hosted error monitoring and triage platform for JavaScript applications. It combines a browser/Node SDK, a NestJS microservice backend, ClickHouse event storage, Redis-backed alert processing, a Next.js dashboard, project-scoped API keys, live event streams, AI-assisted issue grouping, and on-demand root-cause analysis.

The system is designed around project isolation: every monitored app or environment gets its own project ID and API key, while the dashboard keeps issues, live events, credentials, and grouped clusters scoped to the current workspace.

## Hosted Project

| Resource | Link |
| --- | --- |
| Live dashboard | https://bugsensedashboard-production.up.railway.app |
| JavaScript SDK | https://www.npmjs.com/package/@bugsense/bugsense-js |
| Ingest endpoint | `https://bugsenseapi-gateway-production.up.railway.app/ingest` |
| Source map endpoint | `https://bugsenseapi-gateway-production.up.railway.app/sourcemaps` |

## How To Navigate The Live Dashboard

Use the hosted dashboard first if you want to try BugSense before running the monorepo locally.

### 1. Create Or Open A Workspace

Open:

```text
https://bugsensedashboard-production.up.railway.app
```

Sign in, then land in the protected workspace. The sidebar is the main navigation surface.

### 2. Create A Project

Go to `Projects`, create a project for the app or environment you want to monitor, then copy:

- `Project ID`
- `API key`
- generated SDK snippet

Each project has isolated credentials and a scoped event stream.

### 3. Install The SDK

```bash
npm install @bugsense/bugsense-js
```

or:

```bash
pnpm add @bugsense/bugsense-js
```

### 4. Connect Your App

```ts
import { BugSense } from '@bugsense/bugsense-js';

export const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://bugsenseapi-gateway-production.up.railway.app/ingest',
  environment: 'production',
  release: '1.0.0',
});
```

### 5. Send A Smoke Test

```ts
void bugsense.captureMessage('BugSense smoke test connected');
```

### 6. Follow The Event Through The Dashboard

| Dashboard Area | What To Use It For |
| --- | --- |
| `Overview` | Workspace summary, live errors, project activity, and recent grouped issues. |
| `Projects` | Project creation, credentials, API keys, SDK snippet, and scoped project events. |
| `Grouping` | Manually cluster recent raw events into grouped issues. |
| `Issues` | Triage grouped clusters, filter by project/status/environment/severity, and open detail pages. |
| Issue detail | Inspect stack traces, event frequency, affected users, recent snapshots, and AI analysis. |

Recommended first path:

```text
Projects -> Create project -> Copy SDK snippet -> Trigger test event -> Overview -> Grouping -> Issues -> Issue detail
```

## Table Of Contents

- [Hosted Project](#hosted-project)
- [How To Navigate The Live Dashboard](#how-to-navigate-the-live-dashboard)
  - [1. Create Or Open A Workspace](#1-create-or-open-a-workspace)
  - [2. Create A Project](#2-create-a-project)
  - [3. Install The SDK](#3-install-the-sdk)
  - [4. Connect Your App](#4-connect-your-app)
  - [5. Send A Smoke Test](#5-send-a-smoke-test)
  - [6. Follow The Event Through The Dashboard](#6-follow-the-event-through-the-dashboard)
- [Table Of Contents](#table-of-contents)
- [Features](#features)
- [Architecture](#architecture)
  - [Services](#services)
  - [Data Stores](#data-stores)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
  - [Root `.env`](#root-env)
  - [Dashboard](#dashboard)
  - [API Gateway](#api-gateway)
  - [Ingestion Service](#ingestion-service)
  - [Alert Service](#alert-service)
- [Running The App](#running-the-app)
- [Dashboard Workflow](#dashboard-workflow)
- [SDK Integration](#sdk-integration)
  - [Browser Or Vite App](#browser-or-vite-app)
  - [React Error Boundary](#react-error-boundary)
  - [Axios](#axios)
  - [Node](#node)
- [Source Maps](#source-maps)
- [Issue Grouping And AI Analysis](#issue-grouping-and-ai-analysis)
  - [Manual Grouping](#manual-grouping)
  - [On-Demand AI Analysis](#on-demand-ai-analysis)
- [Alerts](#alerts)
- [Railway Deployment](#railway-deployment)
  - [Build Commands](#build-commands)
  - [Railway Variables](#railway-variables)
    - [Dashboard](#dashboard-1)
    - [API Gateway](#api-gateway-1)
    - [Ingestion Service](#ingestion-service-1)
    - [Alert Service](#alert-service-1)
  - [Production Integration Endpoint](#production-integration-endpoint)
- [Troubleshooting](#troubleshooting)
  - [`/ingest` returns 401](#ingest-returns-401)
  - [Browser preflight to `/ingest` fails](#browser-preflight-to-ingest-fails)
  - [Dashboard shows `* project` or `1/1/1970`](#dashboard-shows--project-or-111970)
  - [Grouping fails with `fetch failed`](#grouping-fails-with-fetch-failed)
  - [Grouping page shows issues but Issues page is empty](#grouping-page-shows-issues-but-issues-page-is-empty)
  - [Issue detail AI panel says Gemini key is missing](#issue-detail-ai-panel-says-gemini-key-is-missing)
  - [Grouping produces no issues](#grouping-produces-no-issues)
  - [Railway service-to-service traffic fails](#railway-service-to-service-traffic-fails)
  - [Secrets were accidentally exposed](#secrets-were-accidentally-exposed)
- [Useful Commands](#useful-commands)
- [Security Notes](#security-notes)
- [License](#license)

## Features

- Project-scoped workspaces with generated project IDs and API keys.
- Public `/ingest` endpoint protected by project API keys.
- Browser, React, Axios, fetch, and Node error capture through `@bugsense/bugsense-js`.
- ClickHouse-backed event storage for high-volume error events.
- Redis/BullMQ alert evaluation pipeline.
- Next.js dashboard with overview, projects, live events, grouped issues, and issue detail pages.
- Server-sent events for live dashboard updates.
- Manual and scheduled issue grouping.
- Gemini-assisted grouping summaries and root-cause analysis.
- Source map upload endpoint and CLI.
- Local Docker Compose infrastructure for Redis, Postgres, and ClickHouse.
- Railway-ready service split for production deployment.

## Architecture

```text
Monitored app
  |
  | @bugsense/bugsense-js
  v
api-gateway HTTP
  |  POST /ingest
  |  POST /sourcemaps
  |  dashboard APIs
  |
  +--> ingestion-service TCP
  |      |
  |      +--> ClickHouse error_events
  |      +--> BullMQ alert jobs
  |
  +--> alert-service HTTP
         |
         +--> manual issue grouping
         +--> nightly grouping job
         +--> alert rules and notifications

dashboard Next.js
  |
  +--> api-gateway HTTP
```

### Services

- `apps/dashboard`: Next.js App Router UI for login, projects, live events, grouped issues, and AI analysis.
- `apps/api-gateway`: public HTTP API, auth, project API key validation, SSE, dashboard APIs, sourcemap upload proxy, and issue reads.
- `apps/ingestion-service`: validates/enriches events and writes them to ClickHouse.
- `apps/alert-service`: alert rules, BullMQ worker, manual/nightly grouping, notification dispatch, and AI grouping.

### Data Stores

- ClickHouse: raw error event storage.
- Redis: queue backend for alert jobs.
- Postgres: dashboard users, project records, project API keys, and project membership.
- Filesystem path `BUGSENSE_ISSUES_STORAGE_PATH`: grouped issue snapshots. In production, api-gateway persists grouping responses after delegating to alert-service so the dashboard can read the latest grouped issues.

## Repository Structure

```text
bugsense/
  apps/
    api-gateway/
    alert-service/
    dashboard/
    ingestion-service/
  infra/
    clickhouse/
    docker/
    redis/
  packages/
    bugsense-js/
    config/
    types/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop for local infrastructure
- A Google Gemini API key if you want AI grouping and AI analysis
- Railway account for production deployment

Install pnpm through Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@10.25.0 --activate
```

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment files from examples:

```bash
Copy-Item .env.example .env
Copy-Item apps/dashboard/.env.example apps/dashboard/.env
Copy-Item apps/api-gateway/.env.example apps/api-gateway/.env
Copy-Item apps/ingestion-service/.env.example apps/ingestion-service/.env
Copy-Item apps/alert-service/.env.example apps/alert-service/.env
```

3. Update secrets in `.env` and service env files:

- Replace `BUGSENSE_JWT_SECRET`.
- Replace `BUGSENSE_INTERNAL_SERVICE_TOKEN`.
- Replace `BUGSENSE_DASHBOARD_ADMIN_PASSWORD`.
- Add `GEMINI_API_KEY` where needed.
- Never commit real API keys or production credentials.

4. Start local infrastructure:

```bash
pnpm infra:up
```

5. Run all apps in development:

```bash
pnpm dev
```

Default local URLs:

- Dashboard: `http://localhost:3005`
- API gateway: `http://localhost:3000`
- API gateway database keepalive: `http://localhost:3000/health/db`
- Ingestion service health: `http://localhost:3001/events/health`
- Alert service health: `http://localhost:3003/rules/health`
- ClickHouse HTTP: `http://localhost:8123`
- Redis: `127.0.0.1:6379`
- Postgres: `127.0.0.1:5432`

For hosted environments that pause inactive databases, point an external cron
ping at the API gateway `GET /health/db` endpoint. It performs a lightweight
Postgres `SELECT 1` and returns `200` only when the database responds.

## Environment Variables

### Root `.env`

Used by Docker Compose and shared local config.

```env
BUGSENSE_PROJECT_API_KEYS=proj_123:key_dev_123
BUGSENSE_DASHBOARD_URL=http://localhost:3005
BUGSENSE_ALLOWED_ORIGINS=http://localhost:3005,http://localhost:4173
ALERT_SERVICE_URL=http://127.0.0.1:3003
CLICKHOUSE_URL=http://127.0.0.1:8123
CLICKHOUSE_DB=bugsense
GEMINI_API_KEY=
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
BUGSENSE_ISSUES_STORAGE_PATH=storage/issues/grouped-issues.json
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/bugsense
DATABASE_SSL=false
BUGSENSE_INTERNAL_SERVICE_TOKEN=replace-with-a-long-random-internal-token
BUGSENSE_API_GATEWAY_URL=http://127.0.0.1:3000
BUGSENSE_JWT_SECRET=replace-with-a-long-random-secret
BUGSENSE_JWT_EXPIRES_IN=1h
BUGSENSE_DASHBOARD_ADMIN_EMAIL=admin@bugsense.dev
BUGSENSE_DASHBOARD_ADMIN_PASSWORD=change-me
```

`BUGSENSE_PROJECT_API_KEYS` is a fallback/static project-key map. The completed app primarily uses Postgres-backed dashboard projects. Avoid using `*` as a production project ID; it can accidentally act as a wildcard.

### Dashboard

```env
BUGSENSE_API_URL=http://localhost:3000
BUGSENSE_DASHBOARD_TOKEN_COOKIE=bugsense_dashboard_token
NEXT_PUBLIC_BUGSENSE_GOOGLE_CLIENT_ID=
```

`BUGSENSE_API_URL` should point to api-gateway. In production it can be api-gateway's public Railway URL or an internal service URL if dashboard can reach it.

### API Gateway

```env
PORT=3000
TCP_HOST=127.0.0.1
TCP_PORT=4000
INGESTION_TCP_HOST=127.0.0.1
INGESTION_TCP_PORT=4001
ALERT_SERVICE_URL=http://127.0.0.1:3003
ALERT_SERVICE_HTTP_PORT=
DATABASE_URL=postgres://bugsense:bugsense@127.0.0.1:5432/bugsense
DATABASE_SSL=false
BUGSENSE_INTERNAL_SERVICE_TOKEN=replace-with-a-long-random-internal-token
GEMINI_API_KEY=
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
```

Important:

- `/ingest` is a public SDK endpoint and accepts browser preflights from monitored apps.
- Dashboard/admin routes still use `BUGSENSE_ALLOWED_ORIGINS`.
- `GEMINI_API_KEY` is required here for the issue detail "Run analysis" button.
- `ALERT_SERVICE_URL` is HTTP, not TCP.

### Ingestion Service

```env
PORT=3001
TCP_HOST=127.0.0.1
TCP_PORT=4001
ALERT_TCP_HOST=127.0.0.1
ALERT_TCP_PORT=3002
CLICKHOUSE_URL=http://127.0.0.1:8123
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SOURCEMAP_STORAGE_DIR=storage/sourcemaps
```

`ALERT_TCP_HOST` and `ALERT_TCP_PORT` are for Nest TCP microservice traffic from ingestion-service to alert-service.

### Alert Service

```env
ALERT_HTTP_PORT=3003
ALERT_TCP_PORT=3002
TCP_HOST=0.0.0.0
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CLICKHOUSE_URL=http://127.0.0.1:8123
CLICKHOUSE_DB=bugsense
GEMINI_API_KEY=
BUGSENSE_NIGHTLY_GROUPING_MODEL=gemma-3-12b-it
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
BUGSENSE_ISSUES_STORAGE_PATH=storage/issues/grouped-issues.json
BUGSENSE_ALERT_RULES_JSON={"*":{"error":{"threshold":3,"windowSeconds":300,"cooldownSeconds":900}}}
RESEND_API_KEY=
BUGSENSE_ALERT_EMAIL_FROM=Bugsense <alerts@example.com>
BUGSENSE_ALERT_EMAILS_JSON=
BUGSENSE_API_GATEWAY_URL=http://127.0.0.1:3000
BUGSENSE_INTERNAL_SERVICE_TOKEN=replace-with-a-long-random-internal-token
```

`GEMINI_API_KEY` is required here for manual and scheduled issue grouping.

## Running The App

Run infrastructure only:

```bash
pnpm infra:up
```

Run all apps in dev mode:

```bash
pnpm dev
```

Run the full Docker app stack:

```bash
pnpm stack:up
```

Stop local infrastructure:

```bash
pnpm infra:down
```

Stop the Docker app stack:

```bash
pnpm stack:down
```

## Dashboard Workflow

1. Open `http://localhost:3005`.
2. Sign in with the configured admin email/password or Google if configured.
3. Open Projects.
4. Create a project for each monitored app or environment.
5. Copy the generated project ID and API key.
6. Install the SDK in the monitored app.
7. Trigger a smoke test event.
8. Watch live events in Dashboard or Projects.
9. Run grouping from Grouping or Issues.
10. Triage grouped issues from Issues.
11. Open an issue detail page and run AI analysis if `GEMINI_API_KEY` is configured on api-gateway.

## SDK Integration

Install the SDK:

```bash
pnpm add @bugsense/bugsense-js
```

or:

```bash
npm install @bugsense/bugsense-js
```

### Browser Or Vite App

```ts
import { BugSense } from '@bugsense/bugsense-js';

export const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://your-api-gateway.example.com/ingest',
  environment: 'production',
  release: '1.0.0',
});
```

This captures:

- `window.onerror`
- unhandled promise rejections
- failed `fetch` requests unless `autoInstrumentFetch` is disabled

Send a smoke test:

```ts
void bugsense.captureMessage('BugSense smoke test connected', {
  tags: {
    source: 'manual-test',
  },
  metadata: {
    page: window.location.pathname,
  },
});
```

### React Error Boundary

```tsx
import { BugSense, BugSenseErrorBoundary } from '@bugsense/bugsense-js';

const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://your-api-gateway.example.com/ingest',
  environment: 'production',
  release: '1.0.0',
});

export function App() {
  return (
    <BugSenseErrorBoundary bugsense={bugsense}>
      <YourApp />
    </BugSenseErrorBoundary>
  );
}
```

### Axios

```ts
import axios from 'axios';
import { BugSense, instrumentAxios } from '@bugsense/bugsense-js';

const bugsense = new BugSense({
  projectId: 'proj_your_project_id',
  apiKey: 'key_your_project_api_key',
  endpoint: 'https://your-api-gateway.example.com/ingest',
  environment: 'production',
  release: '1.0.0',
});

instrumentAxios(axios, bugsense);
```

### Node

```ts
import { BugSense } from '@bugsense/bugsense-js';
import { registerNodeHandlers } from '@bugsense/bugsense-js/node';

const bugsense = new BugSense({
  projectId: process.env.BUGSENSE_PROJECT_ID!,
  apiKey: process.env.BUGSENSE_API_KEY!,
  endpoint: process.env.BUGSENSE_ENDPOINT!,
  environment: process.env.NODE_ENV ?? 'production',
  release: process.env.APP_VERSION ?? 'local',
  autoCapture: false,
});

registerNodeHandlers(bugsense);
```

For browser apps, the project API key is visible to users. Treat it as a project-scoped client token, not a server secret. Protection comes from project scoping, validation, rate limits, and key rotation.

## Source Maps

Upload source maps for better production stack traces.

```bash
npx bugsense upload-sourcemaps \
  --project-id proj_your_project_id \
  --api-key key_your_project_api_key \
  --release 1.0.0 \
  --dir dist \
  --endpoint https://your-api-gateway.example.com/sourcemaps
```

The SDK `release` value and the upload `--release` value must match.

## Issue Grouping And AI Analysis

### Manual Grouping

Manual grouping is triggered from the dashboard:

- Grouping page: `Run grouping now`
- Issues page: `Run grouping`

The dashboard calls api-gateway, api-gateway calls alert-service over HTTP, and alert-service groups recent ClickHouse events into issues.

Required for AI grouping:

```env
GEMINI_API_KEY=...
BUGSENSE_NIGHTLY_GROUPING_MODEL=gemma-3-12b-it
```

These belong on alert-service.

### On-Demand AI Analysis

On an issue detail page, click `Run analysis` to request a root-cause summary and suggested fix.

Required on api-gateway:

```env
GEMINI_API_KEY=...
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
```

If you see `missing_gemini_key_or_google_ai_api_key`, add `GEMINI_API_KEY` to api-gateway and redeploy it.

## Alerts

Alert rules are configured with `BUGSENSE_ALERT_RULES_JSON`.

Default:

```json
{
  "*": {
    "error": {
      "threshold": 3,
      "windowSeconds": 300,
      "cooldownSeconds": 900
    }
  }
}
```

This means any project that receives 3 error events in 300 seconds can trigger an alert, then waits 900 seconds before alerting again for the same rule.

Email notifications require:

```env
RESEND_API_KEY=...
BUGSENSE_ALERT_EMAIL_FROM=Bugsense <alerts@example.com>
BUGSENSE_ALERT_EMAILS_JSON={"proj_abc":["owner@example.com"]}
```

Project member emails can also be resolved through api-gateway using the internal service token.

## Railway Deployment

Deploy each app as a separate Railway service:

- `@bugsense/dashboard`
- `@bugsense/api-gateway`
- `@bugsense/ingestion-service`
- `@bugsense/alert-service`
- Redis
- Postgres
- ClickHouse

### Build Commands

Use the existing package filters:

```bash
pnpm --filter @bugsense/dashboard build
pnpm --filter @bugsense/api-gateway build
pnpm --filter @bugsense/ingestion-service build
pnpm --filter @bugsense/alert-service build
```

Start command for each service:

```bash
pnpm start
```

### Railway Variables

#### Dashboard

```env
BUGSENSE_API_URL=https://your-api-gateway-public-url
BUGSENSE_DASHBOARD_TOKEN_COOKIE=bugsense_dashboard_token
NEXT_PUBLIC_BUGSENSE_GOOGLE_CLIENT_ID=
```

#### API Gateway

```env
PORT=3000
TCP_HOST=::
TCP_PORT=4000
INGESTION_TCP_HOST=your-ingestion-service.railway.internal
INGESTION_TCP_PORT=4001
ALERT_SERVICE_URL=http://your-alert-service.railway.internal
ALERT_SERVICE_HTTP_PORT=3003
BUGSENSE_DASHBOARD_URL=https://your-dashboard-public-url
BUGSENSE_ALLOWED_ORIGINS=https://your-dashboard-public-url
DATABASE_URL=postgres://...
DATABASE_SSL=true
CLICKHOUSE_URL=http://your-clickhouse-url:8123
CLICKHOUSE_DB=bugsense
CLICKHOUSE_USER=...
CLICKHOUSE_PASSWORD=...
BUGSENSE_JWT_SECRET=long-random-secret
BUGSENSE_JWT_EXPIRES_IN=1h
BUGSENSE_DASHBOARD_ADMIN_EMAIL=admin@example.com
BUGSENSE_DASHBOARD_ADMIN_PASSWORD=long-random-password
BUGSENSE_INTERNAL_SERVICE_TOKEN=long-random-internal-token
GEMINI_API_KEY=...
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
```

Use `ALERT_SERVICE_URL` for HTTP only. Do not put the alert TCP port there.

#### Ingestion Service

```env
PORT=3001
TCP_HOST=::
TCP_PORT=4001
ALERT_TCP_HOST=your-alert-service.railway.internal
ALERT_TCP_PORT=4002
CLICKHOUSE_URL=http://your-clickhouse-url:8123
CLICKHOUSE_DB=bugsense
CLICKHOUSE_USER=...
CLICKHOUSE_PASSWORD=...
REDIS_URL=redis://...
SOURCEMAP_STORAGE_DIR=/app/storage/sourcemaps
```

If your deployment already uses alert TCP port `4002`, keep it consistent across ingestion-service and alert-service. The important point is not the exact number; it is that TCP and HTTP ports are not mixed.

#### Alert Service

```env
ALERT_HTTP_PORT=3003
TCP_HOST=::
TCP_PORT=4002
ALERT_TCP_PORT=4002
CLICKHOUSE_URL=http://your-clickhouse-url:8123
CLICKHOUSE_DB=bugsense
CLICKHOUSE_USER=...
CLICKHOUSE_PASSWORD=...
REDIS_URL=redis://...
GEMINI_API_KEY=...
BUGSENSE_NIGHTLY_GROUPING_MODEL=gemma-3-12b-it
BUGSENSE_AI_PANEL_MODEL=gemini-2.5-flash
BUGSENSE_ISSUES_STORAGE_PATH=/app/storage/issues/grouped-issues.json
BUGSENSE_API_GATEWAY_URL=https://your-api-gateway-public-url
BUGSENSE_INTERNAL_SERVICE_TOKEN=long-random-internal-token
```

Railway private networking is IPv6-oriented. Use `TCP_HOST=::` or allow the app's config normalization to map `0.0.0.0` to `::`.

### Production Integration Endpoint

Customer or monitored apps should use:

```text
https://your-api-gateway-public-url/ingest
```

Do not add every monitored app URL to `BUGSENSE_ALLOWED_ORIGINS`. That allowlist is for dashboard/admin routes. `/ingest` is a public SDK endpoint protected by project ID and project API key.

## Troubleshooting

### `/ingest` returns 401

The `x-bugsense-api-key` header is missing or does not match the submitted `projectId`.

Fix:

- Copy project ID and API key from the dashboard project tab.
- Confirm the SDK is using the `/ingest` endpoint.

### Browser preflight to `/ingest` fails

`/ingest` must accept `OPTIONS` requests and the `x-bugsense-api-key` header.

Fix:

- Deploy the current api-gateway.
- Confirm the monitored app calls `/ingest`, not a dashboard route.

### Dashboard shows `* project` or `1/1/1970`

This means a fallback/static project entry leaked into the UI.

Fix:

- Ensure api-gateway can reach Postgres.
- Avoid `BUGSENSE_PROJECT_API_KEYS=*:...` in production.
- Sign out and sign in again after deploying auth/project fixes.

### Grouping fails with `fetch failed`

api-gateway cannot reach alert-service over HTTP.

Fix:

- api-gateway:

```env
ALERT_SERVICE_URL=http://your-alert-service.railway.internal
ALERT_SERVICE_HTTP_PORT=3003
```

- alert-service:

```env
ALERT_HTTP_PORT=3003
TCP_HOST=::
```

Redeploy alert-service, then api-gateway.

### Grouping page shows issues but Issues page is empty

Older dashboard builds could show stale browser-local grouping state. Deploy the current dashboard so `/grouping`, `/issues`, and `/dashboard` all depend on backend state.

Also make sure api-gateway has the patch that persists the grouping response after calling alert-service.

### Issue detail AI panel says Gemini key is missing

Add `GEMINI_API_KEY` to api-gateway and redeploy api-gateway.

### Grouping produces no issues

Check:

- ClickHouse has events for the project.
- Events were received recently enough for the grouping query.
- `GEMINI_API_KEY` exists on alert-service.
- Alert-service logs show grouping candidates were fetched.

### Railway service-to-service traffic fails

Use Railway private URLs and IPv6-compatible binding.

HTTP:

```env
ALERT_SERVICE_URL=http://your-alert-service.railway.internal
ALERT_SERVICE_HTTP_PORT=3003
```

TCP:

```env
ALERT_TCP_HOST=your-alert-service.railway.internal
ALERT_TCP_PORT=4002
TCP_HOST=::
```

### Secrets were accidentally exposed

Immediately rotate them in the provider dashboard. For Gemini keys, revoke the exposed key in Google AI Studio and create a new one. Update Railway variables and local `.env` files with the replacement.

## Useful Commands

Install:

```bash
pnpm install
```

Build everything:

```bash
pnpm build
```

Typecheck everything:

```bash
pnpm typecheck
```

Run tests:

```bash
pnpm test
```

Build one service:

```bash
pnpm --filter @bugsense/api-gateway build
pnpm --filter @bugsense/dashboard build
pnpm --filter @bugsense/ingestion-service build
pnpm --filter @bugsense/alert-service build
pnpm --filter @bugsense/bugsense-js build
```

Typecheck one service:

```bash
pnpm --filter @bugsense/api-gateway typecheck
pnpm --filter @bugsense/dashboard typecheck
pnpm --filter @bugsense/ingestion-service typecheck
pnpm --filter @bugsense/alert-service typecheck
```

Start local infra:

```bash
pnpm infra:up
```

Stop local infra:

```bash
pnpm infra:down
```

Start full Docker stack:

```bash
pnpm stack:up
```

Stop full Docker stack:

```bash
pnpm stack:down
```

## Security Notes

- Never commit real `.env` files.
- Rotate any key that has been pasted into chat, logs, screenshots, or commits.
- Browser SDK project API keys are client-visible and should be treated as scoped ingest tokens.
- Keep `BUGSENSE_JWT_SECRET` and `BUGSENSE_INTERNAL_SERVICE_TOKEN` long, random, and private.
- Restrict dashboard/admin origins with `BUGSENSE_ALLOWED_ORIGINS`.
- Keep `/ingest` public enough for SDKs, but protect it with validation, rate limits, and key rotation.

## License

MIT
