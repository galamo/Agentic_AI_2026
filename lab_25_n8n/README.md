# Lab 25 — n8n (Docker Compose)

This lab packages **n8n** with **PostgreSQL** using Docker Compose, patterned after the repo’s standalone stack in `n8n/docker-compose.yml`, but with a **bridge network** (services talk over Docker DNS: `postgres` as the DB host) so it behaves predictably on laptops and in classrooms.

It also adds:

- **Mounted JSON config** (`config/n8n.lab.json`) loaded via `N8N_CONFIG_FILES` on startup (see [Configuration methods](https://docs.n8n.io/hosting/configuration/configuration-methods/)).
- **Seed workflows** under `workflows/seed/`, imported automatically on container start with `n8n import:workflow --separate` (see [CLI: import workflows](https://docs.n8n.io/hosting/cli-commands/)).

## Prerequisites

- Docker with Compose v2

## Quick start

From this directory:

```bash
cp .env.example .env
# Optional: edit N8N_ENCRYPTION_KEY in .env (required to stay constant if you keep ./n8n_data)

docker compose up -d
```

Open [http://localhost:5678](http://localhost:5678). Complete the **first-time owner** wizard (n8n requires this on a fresh database).

In **Workflows**, open **“Lab demo — fetch JSON (no credentials)”**, then click **Execute workflow**. It calls a public JSON API and maps the response with a **Code** node—no API keys.

To follow logs:

```bash
docker compose logs -f n8n
```

Stop and remove containers (data volumes are kept unless you remove them explicitly):

```bash
docker compose down
```

## Layout

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + n8n services, healthcheck, published port `5678` |
| `config/n8n.lab.json` | Extra settings merged at startup (`N8N_CONFIG_FILES`) |
| `docker/n8n-entrypoint.sh` | Imports `./workflows/seed/*.json` before the normal n8n entrypoint |
| `workflows/seed/` | Version-controlled workflow JSON to preload |
| `n8n_data/` | Persisted n8n user data (gitignored); created on first run |

## Port clashes

This lab maps **host `5678` → n8n**. If something else already uses `5678` (for example the root `n8n/` compose stack), change the left side of the ports mapping in `docker-compose.yml` (for example `5679:5678`).

## Relation to `n8n/` in the repo

The older stack at `n8n/docker-compose.yml` uses `network_mode: host` and expects Postgres on the host’s `localhost:5432`. This lab keeps Postgres **inside** Compose and is usually easier to run alongside other projects.

## Adding your own seed workflow

1. Build a workflow in the n8n UI (or export from another instance).
2. Export JSON into `workflows/seed/` (one file per workflow if you rely on `--separate`).
3. Restart the stack (`docker compose restart n8n`). Imports with the same workflow **id** overwrite existing rows; otherwise you may get duplicates—see the [import docs](https://docs.n8n.io/hosting/cli-commands/#import-workflows-and-credentials).
