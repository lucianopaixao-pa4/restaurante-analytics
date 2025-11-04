# Restaurant Analytics API (Node + Express + Postgres)

Endpoints para alimentar o frontend do desafio.

## Requisitos
- Node 18+
- PostgreSQL em execução com os dados do desafio

## Variáveis de ambiente

Copie o arquivo de exemplo e configure:

```bash
cp env.example .env
```

Edite `.env` com suas credenciais do PostgreSQL:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=challenge_db
PGUSER=challenge
PGPASSWORD=challenge

PORT=8000
ALLOW_ORIGIN=http://localhost:5500
```

**Nota:** Ajuste `ALLOW_ORIGIN` conforme onde o frontend será servido (Live Server usa porta 5500 por padrão).

## Instalação

```
cd backend
npm install
npm run dev
```

A API ficará em `http://localhost:8000`.

## Endpoints
- GET `/api/stores` → `[ { id, name } ]`
- GET `/api/channels` → `[ { id, name } ]`
- GET `/api/kpis?store&channel&range=7d|30d|90d` → `{ revenue, orders, aov, cancelRate }`
- GET `/api/sales/daily?store&channel&range=7d|30d|90d` → `[ { date, total } ]`
- GET `/api/products/top?store&channel&range&limit=10` → `[ { rank, name, units, revenue } ]`

CORS
- Ajuste `ALLOW_ORIGIN` de acordo com onde o frontend será servido.
