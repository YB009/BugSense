# Bugsense

Bugsense is a self-hosted error monitoring platform being built as a production-grade alternative to Sentry. The goal is to combine NestJS microservices, a custom JavaScript SDK, ClickHouse-powered event storage, real-time dashboards, and AI-assisted issue triage in one cohesive system.

The project is currently at the foundation stage: the monorepo is scaffolded, the backend services are split, shared types are in place, and the workspace builds cleanly.

## Current Status

Implemented so far:

- Turborepo monorepo foundation
- `pnpm` workspace setup
- Three NestJS service apps
- Shared TypeScript package for cross-service types
- Root Turbo pipeline for build, dev, test, lint, and typecheck
- Basic starter modules and health-style endpoints in each service

Not implemented yet:

- TCP microservice communication
- Public `POST /ingest` endpoint
- ClickHouse integration and schema
- Redis and BullMQ job processing
- JWT auth and project API keys
- Source map upload and processing
- Next.js dashboard
- Live SSE event stream
- OpenAI issue grouping and root-cause suggestions
- `bugsense-js` SDK package

## Repository Structure

```text
bugsense/
├─ apps/
│  ├─ api-gateway/
│  ├─ alert-service/
│  └─ ingestion-service/
├─ infra/
├─ packages/
│  ├─ config/
│  └─ types/
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json
```

### Apps

- `apps/api-gateway`: intended public-facing HTTP entrypoint
- `apps/ingestion-service`: intended owner of event validation, enrichment, and ClickHouse writes
- `apps/alert-service`: intended owner of alert rules and notification workflows

### Packages

- `packages/types`: shared interfaces used across services
- `packages/config`: placeholder for shared tsconfig, lint, test, and workspace presets as the repo grows

### Infra

- `infra/`: reserved for Docker Compose, ClickHouse schema, Redis config, and deployment assets

## Architecture Direction

The intended request flow is:

```text
Client SDK -> api-gateway (HTTP) -> ingestion-service (TCP) -> ClickHouse
                                           |
                                           v
                                   alert-service
```

This keeps external HTTP concerns in one service, makes ingestion independently scalable, and isolates alert processing from the main ingestion path.

## Tech Stack

- NestJS
- Turborepo
- pnpm workspaces
- TypeScript

Planned additions:

- ClickHouse
- Redis
- BullMQ
- Next.js App Router
- OpenAI API
- `tsup`
- Jest
- Docker Compose

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10+

### Install dependencies

```bash
pnpm install
```

### Run the workspace in development

```bash
pnpm dev
```

### Build the workspace

```bash
pnpm build
```

### Typecheck the workspace

```bash
pnpm typecheck
```

## Service Ports

Current default ports:

- `api-gateway`: `3000`
- `ingestion-service`: `3001`
- `alert-service`: `3002`

These are temporary defaults and will later be paired with TCP transport configuration and environment variables.

## What Each Service Can Do Right Now

At the moment, each NestJS app only contains a minimal starter module and a health-style route:

- `api-gateway`: `/projects/health`
- `ingestion-service`: `/events/health`
- `alert-service`: `/rules/health`

These exist only to prove the apps boot and the workspace structure is correct.

## Roadmap

### Week 1

- Wire TCP transport between the three NestJS services
- Add shared contracts for inter-service messaging
- Stand up ClickHouse locally
- Build the first real `POST /ingest` flow
- Add Redis and BullMQ
- Add auth and project API key handling

### Week 2

- Create `bugsense-js`
- Add browser and Node error collectors
- Build batched HTTP transport
- Add React and Node integrations
- Add source map upload CLI
- Write SDK tests

### Week 3

- Scaffold Next.js dashboard
- Add streaming dashboard views with Suspense
- Add SSE live error feed
- Add AI issue grouping and AI debugging panel
- Build issue detail pages

### Week 4

- Add alert rules engine
- Add email and Slack notifications
- Finalize Docker Compose
- Prepare Railway deployment
- Publish SDK
- Write docs and demo materials

## What Needs To Be Added Next

The next necessary milestone is TCP communication between services.

Concretely, the repo still needs:

- shared DTOs and message-pattern constants
- NestJS client registration in `api-gateway`
- microservice bootstrap in `ingestion-service`
- microservice bootstrap in `alert-service`
- first end-to-end ingest request path

## Notes

- PostgreSQL is intentionally not part of the architecture. The point of this project is to learn and demonstrate a time-series database, specifically ClickHouse.
- The current scaffold is intentionally lean. Files for the dashboard, SDK, Docker Compose, BullMQ, and AI layers will be added when their corresponding milestones begin.

## License

No license has been added yet.
