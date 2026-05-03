# Template Project — NodeJS + React + MySQL + Redis

Đây là project template dùng cho lab IaC.

## Stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Database: MySQL
- Cache: Redis
- Runtime: Docker Compose
- CI/CD: GitHub Actions

## Chạy local

```bash
cp .env.example .env
docker compose up -d --build
```

Frontend:

```text
http://localhost:8080
```

Backend:

```text
http://localhost:3000/health
```

## File quan trọng

```text
.env.example                 template biến môi trường local
docker-compose.yml           runtime local
.github/workflows/iac-pipeline.yml  CI/CD template
backend/.env.example         backend env contract
frontend/.env.example        frontend env contract
```

## Không commit

```text
.env
.env.*
```

ngoại trừ:

```text
.env.example
```
