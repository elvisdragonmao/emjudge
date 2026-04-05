# Run 3 Judge Workers with Auto Start

This guide sets up 3 worker containers on a new machine and makes them auto-start after reboot.

## 1) Prepare files

In the repo root, copy env template and fill in your real values:

```bash
cp workers.env.example workers.env
```

Edit `workers.env`:

- `DATABASE_URL`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

## 2) Start workers (build once, then run)

Use this single command from repo root:

```bash
docker compose --env-file workers.env -f docker-compose.workers.yml up -d --build
```

This will:

- build `emjudge-worker:latest`
- start `worker1`, `worker2`, `worker3`
- apply `restart: unless-stopped` so containers come back automatically when Docker starts after reboot

## 3) Verify

```bash
docker compose --env-file workers.env -f docker-compose.workers.yml ps
docker logs -f worker1
```

## 4) Useful follow-up commands

Stop workers:

```bash
docker compose --env-file workers.env -f docker-compose.workers.yml down
```

Restart workers:

```bash
docker compose --env-file workers.env -f docker-compose.workers.yml restart
```

Update image after code change:

```bash
docker compose --env-file workers.env -f docker-compose.workers.yml up -d --build
```

## Notes

- Keep `WORKER1_ID`, `WORKER2_ID`, `WORKER3_ID` unique.
- Make sure Docker itself is configured to start at boot on the host machine.
- `JUDGE_IMAGE` defaults to `judge-runner:latest`; worker startup script will build it automatically if missing.
