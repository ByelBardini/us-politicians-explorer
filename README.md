# US Politicians Explorer

Full-stack que consome o endpoint `/people` da [OpenStates API v3](https://docs.openstates.org/api-v3/),
armazena os dados em **PostgreSQL** como cache (para economizar cota da API) e expõe
uma **API REST** + um **frontend React** com listagem e filtros por estado e partido —
tudo orquestrado por **Docker Compose**.

## Stack

- **Backend** (`server/`): Node 20 + Express + TypeScript + Prisma 7 + zod
- **Banco**: PostgreSQL 16
- **Frontend** (`client/`): Vite + React + TypeScript + TanStack Query + Tailwind
- **Testes**: Vitest (supertest no backend, React Testing Library no frontend)
- **Infra**: Docker + docker-compose

## Configuração

Requer [Node 20](./.nvmrc) e Docker.

```bash
cp .env.example .env   # preencha OPENSTATES_API_KEY (https://open.pluralpolicy.com/accounts/profile/)
```

As variáveis estão documentadas em [`.env.example`](./.env.example).

Para rodar o backend **na máquina host** (fora do Docker), o `server/.env` sobrescreve
o `DATABASE_URL` — o `.env` da raiz aponta para `db:5432`, um hostname que só existe
dentro da rede do Docker:

```bash
cp server/.env.example server/.env   # ajuste a porta se a 5432 estiver ocupada
```

O `npm run dev` carrega os dois arquivos (raiz primeiro, `server/` depois), então a
`OPENSTATES_API_KEY` vive num lugar só.

## Como rodar

```bash
docker compose up -d db          # sobe o Postgres

cd server
npm install
npm run db:migrate               # aplica as migrations
npm run dev                      # backend em http://localhost:3000
```

`GET /health` responde `{"status":"ok"}`. Os endpoints de `/api` estão documentados abaixo.

O backend **não sobe** sem `OPENSTATES_API_KEY` e `DATABASE_URL`: a validação de
ambiente falha rápido, de propósito.

### API

| Método | Rota | Descrição |
|---|---|---|
| GET  | `/api/politicos?estado=&partido=&q=&page=&perPage=` | Lista paginada com filtros |
| GET  | `/api/politicos/filtros` | Estados e partidos distintos (para os dropdowns) |
| POST | `/api/sync` | Dispara o sync em background (responde `202`) |
| GET  | `/api/docs` | Swagger UI |
| GET  | `/api/openapi.json` | Documento OpenAPI 3.1 |

A lista responde no envelope `{ "data": [...], "pagination": { page, perPage, total, totalPages } }`.
Erros saem no shape `{ "error": { "message", "details"? } }`. O contrato é gerado dos mesmos
schemas Zod que validam as requests (`npm run openapi:generate` reescreve `server/openapi.json`).

```bash
curl "http://localhost:3000/api/politicos?estado=California&perPage=5"
curl "http://localhost:3000/api/politicos/filtros"
curl -X POST http://localhost:3000/api/sync \
  -H 'content-type: application/json' -d '{"estados":["California"]}'
```

### Testes

```bash
cd server && npm test            # suíte rápida; nenhum teste bate na API real nem no banco
npm run typecheck
npm run test:integration         # integração do repository com Postgres real — exige Docker
```

> `test:integration` sobe um Postgres efêmero via Testcontainers e aplica as migrations,
> então precisa de Docker rodando. Fica fora do `npm test` para manter o loop rápido.

## Cota da API — leia antes do primeiro sync

O tier free da OpenStates dá **~500 requisições/dia** e **~1 req/s**. É a restrição que
decide o desenho: por isso existem o cache no Postgres, o throttle de 1100 ms entre
requisições, a parada limpa em `429` e o upsert idempotente.

- **`SYNC_STATES` vazio significa TODOS os estados** (~150 requisições, ~30% da cota
  diária). Em desenvolvimento, preencha com um subconjunto: `SYNC_STATES=California`.
- **`SYNC_ON_STARTUP=false` por default.** Com `true`, cada `docker compose up` gastaria
  a cota de um sync inteiro.
- **`SYNC_SCHEDULE_ENABLED=false`** desliga o sync automático diário.

## Notas de desenvolvimento

**`npm ci` exige `DATABASE_URL` definida.** O `postinstall` roda `prisma generate`, que
carrega o `prisma.config.ts` e lê `env('DATABASE_URL')` de imediato. Não precisa de banco
_no ar_ — mas a variável precisa existir, ou o install falha. Em CI:

```bash
DATABASE_URL=postgresql://x:x@localhost:5432/x npm ci
```

**O Prisma 7 exige um driver adapter.** O client é gerado em modo query-compiler (WASM),
sem o binary engine antigo: `new PrismaClient()` lança se não receber um `adapter`. Daí o
`@prisma/adapter-pg` nas dependências.
