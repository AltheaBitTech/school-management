# CampusOps

CampusOps is a multi-tenant **School Operations Management SaaS** platform. It complements a School ERP by digitizing operational workflows such as staff, attendance, leave, complaints, visitors, notices, assets, documents, approvals, and events.

This repository is a **pnpm monorepo**:

```text
apps/api   NestJS modular monolith (REST API)
apps/web   Next.js App Router frontend
```

Architecture baseline: **Next.js + NestJS + PostgreSQL + Prisma**.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)

## Repository structure

```text
school-management/
├── apps/
│   ├── api/          NestJS backend
│   └── web/          Next.js frontend
├── docs/             Architecture documentation
├── .cursor/          Cursor rules and commands
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Installation

```bash
pnpm install
```

## Environment setup

Copy environment templates:

```bash
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Root `.env.example` documents shared PostgreSQL settings used by Docker Compose.

### Backend (`apps/api/.env`)

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | API port (default `3001`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Allowed frontend origin (no `*`) |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the API (e.g. `http://localhost:3001`) |

Required environment variables are validated at API startup.

## Start PostgreSQL

```bash
pnpm db:up
```

Stop PostgreSQL:

```bash
pnpm db:down
```

## Prisma

Generate the Prisma client:

```bash
pnpm prisma:generate
```

Validate schema and migration status:

```bash
pnpm prisma:validate
pnpm --filter @campusops/api exec prisma migrate status
```

Apply development migrations:

```bash
pnpm prisma:migrate:dev
```

Seed the global permission catalog and platform roles:

```bash
pnpm prisma:seed
```

Bootstrap the platform administrator (requires `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` in `apps/api/.env`):

```bash
pnpm bootstrap:platform-admin
```

Prisma scripts use `apps/api/tsconfig.prisma.json` for cross-platform `ts-node` execution (including on Windows).

## Run the API

```bash
pnpm dev:api
```

- Health: `GET http://localhost:3001/health`
- Swagger: `http://localhost:3001/docs`

## Run the web app

```bash
pnpm dev:web
```

Open `http://localhost:3000`.

Run both apps:

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API and web in parallel |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Typecheck all apps |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate:dev` | Run Prisma migrations (dev) |
| `pnpm prisma:seed` | Seed permissions and platform roles |
| `pnpm bootstrap:platform-admin` | Create platform org and admin user |
| `pnpm db:up` | Start local PostgreSQL |
| `pnpm db:down` | Stop local PostgreSQL |

## Testing

```bash
pnpm test
```

PostgreSQL integration tests (departments, staff, attendance, leave, auth, RBAC, organizations):

```bash
RUN_DB_TESTS=true pnpm test
```

## Linting and typechecking

```bash
pnpm lint
pnpm typecheck
```

## Security notes

- The backend is the security boundary.
- Never commit `.env` files or secrets.
- CORS is configured from environment variables, not `origin: '*'`.

## Documentation

Architecture and implementation guidance live in `docs/` and `.cursor/rules/`.

Permission identifiers use the `resource.action` format (for example `staff.view`, `leave.approve`).

## Current phase

**Phases 0–5** are implemented in this checkpoint:

- Foundation, authentication, refresh sessions, RBAC enforcement
- Organization onboarding (platform bootstrap + school tenant creation)
- Departments, staff, staff attendance, leave management (types, balances, requests, transactional approval)

Complaints, notices, notifications, audit, reusable approvals, and other roadmap items remain future work.
