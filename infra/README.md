# Infra

Infrastructure assets for local development live here.

## ClickHouse

Files:

- `docker-compose.yml`: local ClickHouse service definition
- `.env.example`: example local environment variables for Docker Compose
- `clickhouse/initdb/001-error-events.sql`: initial `error_events` schema
- `redis/redis.conf`: local Redis configuration for BullMQ

Run locally:

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d
```

Stop:

```bash
docker compose -f infra/docker-compose.yml down
```
