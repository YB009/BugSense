# Infra

Infrastructure assets for local development live here.

## ClickHouse

Files:

- `docker-compose.yml`: local ClickHouse service definition
- `clickhouse/initdb/001-error-events.sql`: initial `error_events` schema

Run locally:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Stop:

```bash
docker compose -f infra/docker-compose.yml down
```
