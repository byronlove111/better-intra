*This project has been created as part of the 42 curriculum by kclaudan, abbouras, aykrifa, slatrech.*

# BetterIntra

## Description

**BetterIntra** is a modern, social dashboard for students at 42. Its goal is to gather useful school information from the official 42 API and enrich it with features that do not exist in the original Intra, such as editable profiles, follows, direct messages, live presence, personal events, notifications, and logtime analytics.

Users first create a BetterIntra account with an email address and password. They may then link their 42 account through OAuth 2.0. The backend is the only component that communicates with the 42 API: 42 credentials and tokens are never exposed to the frontend. Data received from 42 is read-only, while BetterIntra-specific data is stored in PostgreSQL.

Key features include:

- secure email/password authentication with JWT access and refresh tokens;
- optional 42 OAuth account linking;
- a unified dashboard and profile with cursus, projects, evaluations, campus and wallet data;
- editable biography, avatar and profile banner;
- student search, follows, follower/following lists and live online status;
- one-to-one direct messages, read receipts and user blocking;
- a unified agenda combining 42 events and BetterIntra events;
- a documented, rate-limited public events API secured by personal API keys;
- interactive logtime analytics with date filters and CSV/PDF exports;
- in-app and real-time notifications;
- account deletion, Privacy Policy and Terms of Service pages.

### High-level architecture

```mermaid
flowchart LR
    Browser["React application<br/>Browser"]
    Proxy["nginx reverse proxy<br/>HTTPS / WSS"]
    Web["nginx static server<br/>Vite production build"]
    API["FastAPI application"]
    DB[("PostgreSQL 16")]
    Cache[("Redis 7")]
    Intra["Official 42 API"]

    Browser -->|"HTTPS"| Proxy
    Browser <-->|"WSS"| Proxy
    Proxy -->|"/"| Web
    Proxy -->|"/api/"| API
    API -->|"SQLAlchemy"| DB
    API -->|"TTL cache"| Cache
    API -->|"OAuth 2.0 / HTTPS"| Intra
```

## Team Information

| Team member | 42 login | Assigned roles | Responsibilities |
|---|---|---|---|
| Kylian | `kclaudan` | Product Owner, Developer | Defined the product vision and priorities, kept the feature set aligned with the 42 subject, validated user-facing behaviour, and contributed to cross-feature QA and documentation. |
| Abd'Al-Malik | `abbouras` | Product Manager, Technical Lead, Developer | Coordinated delivery, made the main architectural decisions, developed the backend and core integrations, reviewed cross-stack changes, and kept the API contracts consistent. |
| Ayoub | `aykrifa` | Developer | Owned containerization, service orchestration, HTTPS, environment configuration, health checks, deployment documentation and continuous integration. |
| Swann | `slatrech` | Developer | Built the official React frontend, its routing and API layer, and implemented the main pages, forms, responsive UI and data visualizations. |

## Project Management

The team divided work by stable ownership areas while reviewing integration points together:

- Kylian maintained the product direction, priorities and acceptance criteria.
- Abd'Al-Malik coordinated the technical roadmap and backend/API work.
- Ayoub handled infrastructure, deployment and CI.
- Swann handled the official frontend and frontend/backend integration.

The functional scope and module target were maintained in [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md). Work was split into feature-sized tasks, developed on Git branches, integrated through GitHub, and checked again on `main`. Short synchronization meetings were used to discuss dependencies, blockers and demonstration priorities.

Project management and communication tools:

- **Git and GitHub:** source control, branches, commit history, integration and GitHub Actions;
- **Markdown documentation:** scope, architecture, deployment and API contracts inside the repository;
- **Discord and in-person/voice meetings:** day-to-day communication, reviews and rapid blocker resolution.

Scope control was an important part of the project. Internationalization, peer recommendations and advanced event search were deliberately removed from the final target so the team could finish and test a coherent 15-point application.

## Technical Stack

### Frontend

| Technology | Use |
|---|---|
| React 19 and TypeScript 6 | Component-based, typed single-page application |
| Vite 8 | Development server, TypeScript-aware build pipeline and optimized production bundle |
| React Router 7 | Client-side routes and protected layouts |
| TanStack Query 5 | Server-state cache, loading/error states, mutations and cache invalidation |
| Tailwind CSS 4 | Responsive utility-first styling |
| shadcn/ui and Base UI | Reusable and accessible UI primitives whose source remains editable in the repository |
| React Hook Form and Zod | Form state and client-side schema validation |
| Recharts | Area, bar and pie charts for logtime analytics |
| date-fns and Lucide | Date formatting and consistent icons |

React was chosen because its component model suits a dashboard made of reusable cards, forms and interactive views. TypeScript reduces API-contract mistakes. TanStack Query centralizes asynchronous server state instead of duplicating manual loading and caching logic on every page.

### Backend

| Technology | Use |
|---|---|
| Python 3.14 | Backend language |
| FastAPI | Typed REST API, dependency injection, validation, WebSockets and generated OpenAPI documentation |
| Pydantic | Request, response and configuration validation |
| SQLAlchemy 2 | ORM, transactions and repository layer |
| Alembic | Versioned database migrations |
| PyJWT and pwdlib/Argon2 | JWT sessions and secure password hashing |
| fpdf2 and Pillow | PDF generation and image processing |
| Uvicorn | ASGI application server |
| UV | Reproducible Python dependency and virtual-environment management |

FastAPI was chosen for its typed Python interface, automatic OpenAPI schema and native WebSocket support. The backend follows a feature-oriented controller/service/repository structure so HTTP concerns, business rules and persistence remain separate.

### Data, realtime and infrastructure

| Technology | Use and justification |
|---|---|
| PostgreSQL 16 | Relational storage for accounts, social relationships, messages, events and keys. Foreign keys, unique constraints, transactions and indexes fit the strongly related data model. |
| Redis 7 | Short-lived cache for 42 API responses and analytics, reducing latency and pressure on the external API. |
| WebSockets | Live messages, read receipts, notifications and presence updates without polling each feature. |
| Docker Compose | Reproducible one-command build and startup of the complete application. |
| nginx 1.27 | Single HTTPS/WSS entry point, reverse proxy and static frontend server. |
| GitHub Actions | Automated backend tests and frontend production build on pushes and pull requests to `main`. |
| Docusaurus 3 | Developer-oriented API and architecture documentation. |

## Database Schema

The PostgreSQL schema stores BetterIntra-owned data. Projects, cursus, evaluations and logtime records from 42 remain read-only external data and are not copied into permanent application tables.

```mermaid
erDiagram
    USERS ||--o| INTRA_PEOPLE : "links to"
    USERS ||--o{ FRIENDSHIPS : "creates"
    INTRA_PEOPLE ||--o{ FRIENDSHIPS : "is followed"
    USERS ||--o{ EVENTS : "creates"
    USERS ||--o{ API_KEYS : "owns"
    USERS ||--o{ CONVERSATIONS : "participates in"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    USERS ||--o{ MESSAGES : "sends"
    CONVERSATIONS ||--o{ CONVERSATION_READS : "tracks"
    USERS ||--o{ CONVERSATION_READS : "owns"
    MESSAGES o|--o{ CONVERSATION_READS : "last read"
    USERS ||--o{ USER_BLOCKS : "blocks / is blocked"
    USERS ||--o{ NOTIFICATIONS : "receives"

    USERS {
        int id PK
        varchar email UK
        varchar password_hash
        bigint forty_two_id UK
        varchar login UK
        text custom_avatar_url
        text banner_url
        text bio
        text forty_two_access_token
        text forty_two_refresh_token
        timestamptz created_at
        timestamptz updated_at
    }

    INTRA_PEOPLE {
        bigint forty_two_id PK
        varchar login UK
        varchar display_name
        text avatar_url
        int betterintra_user_id FK
        timestamptz updated_at
    }

    FRIENDSHIPS {
        int id PK
        int follower_id FK
        bigint following_forty_two_id FK
        timestamptz created_at
    }

    EVENTS {
        int id PK
        int creator_id FK
        varchar title
        text description
        varchar location
        varchar url
        timestamptz begin_at
        timestamptz end_at
    }

    API_KEYS {
        int id PK
        int user_id FK
        varchar name
        varchar prefix
        varchar key_hash UK
        timestamptz last_used_at
        timestamptz revoked_at
    }

    CONVERSATIONS {
        int id PK
        int user_low_id FK
        int user_high_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        int id PK
        int conversation_id FK
        int sender_id FK
        text body
        timestamptz created_at
    }

    CONVERSATION_READS {
        int id PK
        int conversation_id FK
        int user_id FK
        int last_read_message_id FK
        timestamptz last_read_at
    }

    USER_BLOCKS {
        int id PK
        int blocker_id FK
        int blocked_id FK
        timestamptz created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar type
        text body
        varchar url
        timestamptz created_at
    }
```

Important integrity rules include:

- one local account per email and, once linked, per 42 identity;
- one directional follow per follower/42-identity pair;
- one direct-message conversation per ordered pair of users;
- one read cursor per user and conversation;
- one block per blocker/blocked pair;
- cascading deletion for user-owned events, messages, keys and notifications;
- API keys are stored as hashes; the complete key is returned only once at creation.

## Features List

| Feature | Functionality | Main contributors |
|---|---|---|
| Local authentication | Registration, login, Argon2 password hashing, JWT access/refresh sessions, protected frontend routes and logout. | `abbouras`, `slatrech` |
| 42 OAuth and API proxy | Links an existing BetterIntra account to 42, refreshes 42 tokens and exposes read-only 42 data through the backend. | `abbouras`, `slatrech` |
| Dashboard | Summarizes profile, level, milestone, correction points, evaluations, events, online friends and active projects. | `slatrech`, `abbouras` |
| Unified profiles | Own and public student profiles, biography editing, avatar/banner management, cursus and project information. | `slatrech`, `abbouras` |
| Student search | Debounced lookup by 42 login and navigation to public profiles. | `slatrech`, `abbouras` |
| Projects and evaluations | Paged project list with status/marks and evaluation views for corrector/corrected roles. | `slatrech`, `abbouras` |
| Follows and presence | Follow/unfollow, followers/following lists and follow-scoped live online status. | `slatrech`, `abbouras` |
| Direct messages | One-to-one threads, first-message thread creation, message pagination, unread counts, read receipts and blocking. | `abbouras`, `slatrech` |
| Realtime channel | Authenticated WSS connection, keepalive, reconnection, messages, read receipts, presence and notification events. | `abbouras`, `aykrifa` |
| Unified agenda | Displays 42 campus events together with user-created BetterIntra events; owners can create, edit and delete their own events. | `abbouras`, `slatrech` |
| Public events API | Personal API-key creation/revocation, hashed key storage, rate limiting, OpenAPI docs and five CRUD endpoints. | `abbouras` |
| Notifications | Seven-day in-app inbox and live delivery for relevant creation, update and deletion actions, including messages, follows and event lifecycle changes. | `abbouras`, `slatrech` |
| Logtime analytics | Date-range selection, summary cards, daily/weekly/weekday charts, ten-minute refresh and CSV/PDF export. | `aykrifa`, `abbouras` |
| Privacy and account control | Privacy Policy, Terms of Service, custom media deletion and confirmed account/data deletion. | `slatrech`, `abbouras` |
| Deployment and CI | Docker images, Compose orchestration, migrations, health checks, same-origin HTTPS/WSS proxy and GitHub Actions. | `aykrifa`, `abbouras` |
| Product definition and QA | Scope selection, prioritization, acceptance criteria, demonstration flow and final cross-feature validation. | `kclaudan`, all team members |

## Modules

The project claims the following fully implemented modules. Major modules are worth **2 points** and Minor modules are worth **1 point**.

| # | Subject module | Type | Points | Why it was chosen and how it was implemented | Contributors |
|---:|---|---|---:|---|---|
| 1 | Use a framework for both the frontend and backend | Major | 2 | React structures the SPA into pages, layouts, hooks and reusable components. FastAPI structures the backend into typed controllers, services and repositories. | `slatrech`, `abbouras` |
| 2 | Implement real-time features using WebSockets | Major | 2 | One authenticated WSS channel broadcasts new messages, read receipts, presence and notifications. The frontend implements keepalive, exponential reconnection and cache updates. nginx forwards WebSocket upgrades over HTTPS. | `abbouras`, `aykrifa` |
| 3 | Allow users to interact with other users | Major | 2 | Public profiles, follow/unfollow lists and a complete basic DM system satisfy the required profile, friends and chat features. | `abbouras`, `slatrech` |
| 4 | Public API secured by API keys | Major | 2 | BetterIntra events are exposed through five CRUD routes under `/api/v1/events`. Keys are generated per user, stored hashed, revocable, rate-limited and documented by OpenAPI. | `abbouras` |
| 5 | Use an ORM for the database | Minor | 1 | SQLAlchemy 2 models and repositories manage PostgreSQL entities and transactions; Alembic applies versioned migrations before the API starts. | `abbouras`, `aykrifa` |
| 6 | Standard user management and authentication | Major | 2 | Users can register and log in securely, update their bio/avatar/banner, view profiles, follow users and see their online status. A default avatar fallback is displayed when no image exists. | `abbouras`, `slatrech` |
| 7 | Remote authentication with OAuth 2.0 | Minor | 1 | The authorization-code flow links a local account to 42. Client secrets and token exchange stay on the backend, and 42 tokens are refreshed server-side. | `abbouras`, `slatrech` |
| 8 | Advanced analytics dashboard with data visualization | Major | 2 | Logtime analytics include several interactive Recharts visualizations, summary metrics, a customizable date range, periodic updates, and PDF/CSV exports. | `aykrifa`, `abbouras` |
| 9 | Complete notification system for creation, update and deletion actions | Minor | 1 | Notifications are persisted in PostgreSQL, exposed through an in-app inbox, pushed immediately through WebSockets and automatically removed after seven days. They cover application resource lifecycle and social actions. | `abbouras`, `slatrech` |
|  | **Total** |  | **15** | **The 14-point minimum is reached with a one-point margin.** |  |

No custom “Module of choice” is claimed, so no custom-module justification is required.

## Instructions

### Prerequisites

The recommended evaluation setup requires:

- Git;
- Docker Engine with the Docker Compose plugin, or Podman with `podman-compose`;
- GNU Make;
- OpenSSL;
- a modern browser;
- a 42 account and a 42 OAuth application created at [42 API applications](https://profile.intra.42.fr/oauth/applications).

The containers provide PostgreSQL 16, Redis 7, Python 3.14, UV, Node.js 22, pnpm 9 and nginx. They do not need to be installed on the host.

### 1. Clone and configure

```bash
git clone <repository-url> better-intra
cd better-intra
cp .env.example .env
```

Open `.env` and set at least:

```dotenv
DOMAIN_NAME=localhost:8443
VITE_API_URL=/api

POSTGRES_USER=betterintra
POSTGRES_PASSWORD=choose-a-password
POSTGRES_DB=betterintra

JWT_SECRET=  # openssl rand -base64 48 — required, no code default

FORTY_TWO_CLIENT_ID=your-42-client-id
FORTY_TWO_CLIENT_SECRET=your-42-client-secret
```

Do not commit `.env` or share its secrets.

In the settings of the 42 OAuth application, configure this redirect URI exactly:

```text
https://localhost:8443/api/auth/callback
```

If `DOMAIN_NAME` changes, the redirect URI registered with 42 must change as well.

### 2. Build and run

```bash
make up
```

This command:

1. creates a local self-signed TLS certificate if necessary;
2. builds the backend and frontend images;
3. starts PostgreSQL and Redis;
4. applies Alembic migrations through the one-shot `migrate` service;
5. starts FastAPI, the static frontend server and the HTTPS reverse proxy.

The first build may take several minutes. `make up` runs in the foreground; use `Ctrl+C` to stop the stack.

### 3. Open the application

| Resource | URL |
|---|---|
| BetterIntra | [https://localhost:8443](https://localhost:8443) |
| API health | [https://localhost:8443/api/health](https://localhost:8443/api/health) |
| Database health | [https://localhost:8443/api/health/db](https://localhost:8443/api/health/db) |
| Swagger UI | [https://localhost:8443/api/docs](https://localhost:8443/api/docs) |
| ReDoc | [https://localhost:8443/api/redoc](https://localhost:8443/api/redoc) |

Because the local certificate is self-signed, the browser displays a warning on first access. Inspect the certificate and accept it for `localhost` to continue. All browser traffic then goes through the HTTPS/WSS proxy; backend and database ports are not exposed on the host.

Create a BetterIntra account, log in, and use the dashboard button to link the corresponding 42 account.

### Useful commands

```bash
make help       # list project commands
make ps         # show container status
make logs       # follow service logs
make down       # stop containers and keep PostgreSQL data
make restart    # stop and rebuild/restart the stack
make clean      # remove built images but keep database volumes
```

Detailed deployment and troubleshooting information is available in [`docs/deploiement.md`](docs/deploiement.md).

### Local development without Compose

For backend development, install Python 3.14, UV, PostgreSQL 16 and Redis 7, then:

```bash
cd apps/server
cp .env.example .env
# Fill DATABASE_URL, JWT_SECRET and the FORTY_TWO_* values.
uv sync --group dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For frontend development, install Node.js 22 and enable pnpm 9:

```bash
cd apps/web
cp .env.example .env
corepack enable
corepack prepare pnpm@9 --activate
pnpm install --frozen-lockfile
pnpm dev
```

The development frontend is then available at [http://localhost:5173](http://localhost:5173), with `VITE_API_URL=http://localhost:8000`.

### Tests and checks

Backend tests use a dedicated PostgreSQL test database and do not call the live 42 API:

```bash
cd apps/server
uv sync --group dev
TEST_DATABASE_URL=postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra_test uv run pytest -q
```

Frontend checks:

```bash
cd apps/web
pnpm lint
pnpm build
```

GitHub Actions runs the backend test suite and the frontend TypeScript/Vite production build on pushes and pull requests targeting `main`.

## Public API Usage

After logging in and linking a 42 account, open the Agenda page and generate a personal API key. The raw key is shown only once.

With the Docker/HTTPS setup, list the owner's BetterIntra events with:

```bash
curl --cacert infra/nginx/certs/fullchain.pem "https://localhost:8443/api/api/v1/events?limit=20" -H "X-API-Key: bi_replace_with_your_key"
```

The external URL contains the reverse-proxy prefix `/api` followed by the backend public route `/api/v1/events`. When the backend is run directly on port 8000, use `http://localhost:8000/api/v1/events` instead.

Available CRUD operations:

- `GET /api/v1/events`
- `POST /api/v1/events`
- `GET /api/v1/events/{id}`
- `PUT /api/v1/events/{id}`
- `DELETE /api/v1/events/{id}`

Swagger provides the complete schemas, validation rules and status codes.

## Individual Contributions

### Kylian — `kclaudan`

- acted as Product Owner and kept the application aligned with the selected 42 modules;
- prioritized the essential user journeys and helped decide which optional ideas should be removed;
- reviewed feature behaviour from a user perspective and participated in final smoke testing;
- contributed to acceptance criteria, demonstration preparation and project documentation.

The main challenge was scope growth. It was addressed by maintaining an explicit feature document and cutting i18n, recommendations and advanced search before they could jeopardize the minimum 14-point target.

### Abd'Al-Malik — `abbouras`

- acted as Product Manager and Technical Lead;
- designed the feature-oriented FastAPI architecture and API contracts;
- implemented local authentication, JWT refresh and the 42 OAuth/proxy layer;
- implemented the SQLAlchemy models, repositories, services and Alembic migrations;
- developed unified profiles, follows, BetterIntra events, API keys and rate limiting;
- developed direct messages, blocking, read receipts, WebSocket presence and notifications;
- implemented logtime aggregation and CSV/PDF generation;
- wrote backend integration tests, developer API documentation and cross-stack fixes.

The major challenges were external API limits, expiring OAuth tokens, combining external and local data, and keeping realtime state coherent. Server-side token refresh, Redis caching, source adapters, database constraints and a single authenticated event channel were used to address them.

### Ayoub — `aykrifa`

- containerized the backend and frontend;
- built the Docker Compose service graph for PostgreSQL, Redis, migrations, FastAPI, the web server and the proxy;
- configured local HTTPS/WSS and nginx reverse proxying;
- implemented health checks and dependency-based startup ordering;
- standardized root environment variables and OAuth redirect configuration;
- documented deployment and troubleshooting;
- configured GitHub Actions for backend tests and frontend production builds;
- implemented the Logtime Analytics dashboard, including its date range, visualizations, periodic refresh and export interface.

The main challenges were reproducible startup and secure same-origin routing. A one-shot migration container, health-gated dependencies, a generated local certificate and one public nginx endpoint solved these issues.

### Swann — `slatrech`

- initialized the React/TypeScript/Vite frontend and authentication flow;
- created the page/layout/feature architecture and protected routing;
- implemented the typed frontend API layer and TanStack Query integration;
- built the dashboard, profiles, student search, projects and evaluations pages;
- implemented friends/follow management and contributed to chat integration;
- built profile media controls, legal pages and responsive reusable UI;
- handled form validation, loading/error states and frontend lint/type fixes.

The main challenges were learning React while coordinating many asynchronous API states. Typed API functions, query keys, mutations, cache invalidation, reusable components and Zod-backed forms kept the interface predictable and maintainable.

## Known Limitations and Scope

- 42-backed pages require a valid 42 OAuth application and a linked 42 account.
- BetterIntra never writes to the official 42 API.
- The interface is currently in French; internationalization is outside the selected scope.
- Advanced event search and peer recommendations are outside the selected scope.
- The WebSocket connection manager is in memory and the deployed stack runs a single backend process. Horizontal scaling would require a shared pub/sub layer.
- The local HTTPS certificate is self-signed and intended for evaluation/development, not public production.

## Repository Structure

```text
better-intra/
├── apps/
│   ├── server/       # FastAPI application, migrations and tests
│   ├── web/          # Official React frontend
│   ├── docs/         # Docusaurus developer documentation
│   └── api-lab/      # API smoke-test client used during development
├── docs/             # Product scope, deployment and architecture notes
├── infra/            # nginx, TLS and optional monitoring configuration
├── compose.yml       # Complete service orchestration
├── Makefile          # Evaluation and maintenance commands
└── README.md
```

## Resources

### Project documentation

- [Product scope and selected modules](docs/cahier-des-charges.md)
- [Deployment, HTTPS and troubleshooting](docs/deploiement.md)
- [DevOps architecture notes](docs/devops.md)
- [Developer documentation application](apps/docs/README.md)
- [Frontend/API connection notes](apps/web/README.md)
- [GitHub Actions documentation](.github/workflows/README.md)

### External references

- [React documentation](https://react.dev/)
- [Vite guide](https://vite.dev/guide/)
- [React Router documentation](https://reactrouter.com/home)
- [TanStack Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
- [shadcn/ui documentation](https://ui.shadcn.com/docs)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2 documentation](https://docs.sqlalchemy.org/en/20/)
- [Alembic documentation](https://alembic.sqlalchemy.org/en/latest/)
- [PostgreSQL 16 documentation](https://www.postgresql.org/docs/16/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [nginx documentation](https://nginx.org/en/docs/)
- [42 API documentation](https://api.intra.42.fr/apidoc)
- [OAuth 2.0 — RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Use of AI

Generative AI assistants were used as development support for:

- brainstorming and refining the initial architecture and module scope;
- producing or reviewing repetitive scaffolding and typed API boilerplate;
- explaining unfamiliar React, TanStack Query, OAuth, WebSocket and Docker concepts;
- debugging TypeScript, ESLint, API-integration and environment-configuration issues;
- suggesting tests, edge cases and refactoring opportunities;
- drafting and reorganizing technical documentation.

AI was not treated as an authoritative source or as a replacement for team understanding. Generated suggestions were inspected, adapted to the project's architecture, tested locally, and reviewed by team members. Secrets and real OAuth credentials were never intentionally provided to AI tools.
