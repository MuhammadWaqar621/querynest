# querynest

A RAG-powered document chat assistant. Upload documents, and ask questions
answered strictly from their content, with retrieved passages backing every
response. Built as a portfolio project to demonstrate a production-shaped
retrieval-augmented-generation stack: chunking and embedding documents,
storing vectors in a purpose-built vector database, and grounding an LLM's
answers in retrieved context rather than letting it hallucinate freely.

> **Status:** Phase 1 — repository scaffold. FastAPI backend, React
> frontend, Postgres, and Qdrant are wired together via docker-compose with
> health/config-status endpoints only. Auth, document ingestion, and the
> actual chat/retrieval pipeline are built in later phases.

## Architecture

```
                          ┌──────────────────┐
                          │   Frontend        │
                          │   React + Vite    │
                          │   + TypeScript    │
                          │   + Tailwind      │
                          └────────┬──────────┘
                                   │ HTTP (/api/*)
                                   ▼
                          ┌──────────────────┐
                          │   Backend         │
                          │   FastAPI         │
                          │   SQLAlchemy      │
                          │   + Alembic       │
                          └───┬──────────┬────┘
                              │          │
                 ┌────────────┘          └────────────┐
                 ▼                                     ▼
        ┌──────────────────┐                 ┌──────────────────┐
        │   Postgres        │                 │   Qdrant          │
        │   (relational     │                 │   (vector store   │
        │   data: users,    │                 │   for document    │
        │   documents,      │                 │   embeddings)     │
        │   chat history)   │                 │                   │
        └──────────────────┘                 └──────────────────┘

        Backend also talks to Azure OpenAI (via the Azure OpenAI client
        in the `openai` SDK) for:
          - text embeddings  (AZURE_EM_* settings)
          - chat completions (LLM_ENDPOINT_MINI_MODEL* settings)
```

- **Backend** — Python 3.11+, FastAPI, SQLAlchemy + Alembic for migrations,
  Postgres for relational data (users, documents, chat sessions), Qdrant
  for vector search. AI calls go through `openai.AzureOpenAI` /
  `AsyncAzureOpenAI` — this project targets **Azure OpenAI** specifically,
  not the public OpenAI API.
- **Frontend** — React + TypeScript + Vite + Tailwind CSS.
- **Vector DB** — Qdrant, run locally via docker-compose (or pointed at
  Qdrant Cloud — see below).
- **Auth** — not implemented yet. Config keys for JWT and Google OAuth
  exist as placeholders (see `.env.example`) so the env contract is
  stable, but the actual login/session flow is a later phase.

## Repository layout

```
querynest/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, /health, mounts routers
│   │   ├── core/
│   │   │   └── config.py      # pydantic Settings (env-driven)
│   │   └── api/
│   │       └── config_status.py  # GET /api/config/status
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx            # placeholder page + config-status check
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Getting started

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Azure OpenAI credentials (and, later, Google OAuth / SMTP
   values) in `.env`. `.env` is gitignored — never commit it.
3. Bring the whole stack up:
   ```bash
   docker-compose up --build
   ```
4. Visit:
   - Frontend: http://localhost:4173
   - Backend health check: http://localhost:8000/health
   - Backend config status: http://localhost:8000/api/config/status
   - Qdrant dashboard/API: http://localhost:6333/dashboard

### Running backend/frontend without Docker (local dev)

```bash
# backend
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` (see
`frontend/vite.config.ts`), so the frontend can call relative API paths
in both dev and Docker.

## Qdrant setup

Qdrant is the vector database used to store and search document
embeddings. In this project it is run as a container alongside everything
else — no separate setup required for local development.

- **Local (default):** `docker-compose up` starts a `qdrant` service from
  the `qdrant/qdrant:latest` image, exposing:
  - `6333` — HTTP/REST API (used by `qdrant-client`)
  - `6334` — gRPC API
  - A named volume (`qdrant_data`) persists collections across restarts.

- **Verify it's running:**
  ```bash
  curl http://localhost:6333/collections
  ```
  A healthy instance returns something like:
  ```json
  {"result":{"collections":[]},"status":"ok","time":0.0}
  ```
  You can also open the built-in dashboard at
  http://localhost:6333/dashboard.

- **Using Qdrant Cloud instead:** if you'd rather not run Qdrant locally
  (e.g. for a deployed demo), provision a free cluster at
  https://cloud.qdrant.io, then:
  1. Set `QDRANT_URL` in `.env` to your cluster URL, e.g.
     `https://xyz-example.eu-central.aws.cloud.qdrant.io:6333`.
  2. Add a `QDRANT_API_KEY` env var (the backend's Qdrant client should be
     initialized with `api_key=settings.QDRANT_API_KEY` once the
     ingestion/retrieval code lands — that variable isn't in scope for
     this scaffold phase, but the setup is documented here since it's the
     most common follow-up question).
  3. You can then remove the `qdrant` service from `docker-compose.yml`
     (or just stop using its port) since the backend will talk to Qdrant
     Cloud over HTTPS instead of the local container.

## Environment variables

All variables live in `.env` (gitignored) and are documented with blank
placeholders in `.env.example`. The backend reads them via
`app/core/config.py` (a pydantic `Settings` model).

| Variable                          | Purpose                                                              | Required (this phase) |
|------------------------------------|-----------------------------------------------------------------------|------------------------|
| `DATABASE_URL`                     | Postgres connection string used by SQLAlchemy/Alembic                 | Yes |
| `QDRANT_URL`                       | Base URL of the Qdrant instance (local container or Qdrant Cloud)     | Yes |
| `AZURE_EM_ENDPOINT`                 | Azure OpenAI resource endpoint used for embeddings                     | Optional (needed for AI features, later phase) |
| `AZURE_EM_API_KEY`                  | API key for the Azure OpenAI embeddings resource                      | Optional |
| `AZURE_EM_API_VERSION`              | Azure OpenAI API version for the embeddings deployment                | Optional |
| `AZURE_EM_MODEL`                    | Azure OpenAI embeddings deployment/model name                         | Optional |
| `LLM_ENDPOINT_MINI_MODEL`           | Azure OpenAI resource endpoint used for chat completions               | Optional |
| `LLM_ENDPOINT_MINI_MODEL_APIKEY`    | API key for the Azure OpenAI chat resource                            | Optional |
| `MINI_MODEL_NAME`                   | Azure OpenAI chat deployment/model name (e.g. a "mini" model)          | Optional |
| `JWT_SECRET_KEY`                    | Secret used to sign JWTs                                              | Not yet used (auth is a later phase) |
| `JWT_ALGORITHM`                     | JWT signing algorithm                                                  | Not yet used |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`   | Access token lifetime, in minutes                                     | Not yet used |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`     | Refresh token lifetime, in days                                        | Not yet used |
| `GOOGLE_CLIENT_ID`                  | Google OAuth client ID (for "Sign in with Google")                    | Not yet used |
| `GOOGLE_CLIENT_SECRET`              | Google OAuth client secret                                             | Not yet used |
| `SMTP_HOST`                         | SMTP server host, for forgot-password emails                          | Not yet used |
| `SMTP_PORT`                         | SMTP server port                                                       | Not yet used |
| `SMTP_USERNAME`                     | SMTP auth username                                                     | Not yet used |
| `SMTP_PASSWORD`                     | SMTP auth password                                                     | Not yet used |
| `SMTP_FROM_EMAIL`                   | "From" address used on outgoing emails                                 | Not yet used |

The backend exposes `GET /api/config/status` which reports, per group,
whether every variable in that group is set:

```json
{ "azure_ai": true, "google_oauth": false, "smtp": false }
```

The frontend uses this to show "configuration missing" banners for
features that depend on secrets which haven't been provided yet.

## Roadmap

- **Phase 1 (this phase):** repo scaffold, docker-compose, health/config
  endpoints.
- **Phase 2:** database models + Alembic migrations, document upload +
  storage.
- **Phase 3:** embedding/ingestion pipeline into Qdrant, retrieval +
  chat endpoint (the actual RAG logic).
- **Phase 4:** authentication (JWT + Google OAuth + forgot-password via
  SMTP), per-user document scoping.
- **Phase 5:** frontend chat UI, polish, deployment.
