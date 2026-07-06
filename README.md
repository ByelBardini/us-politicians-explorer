# US Politicians Explorer

Full-stack que consome o endpoint `/people` da [OpenStates API v3](https://docs.openstates.org/api-v3/),
armazena os dados em **PostgreSQL** como cache (para economizar cota da API) e expõe
uma **API REST** + um **frontend React** com listagem e filtros por estado e partido —
tudo orquestrado por **Docker Compose**.

> 🚧 Projeto em construção. O plano completo está em [`ROADMAP.md`](./ROADMAP.md).

## Stack

- **Backend** (`server/`): Node 20 + Express + TypeScript + Prisma + zod
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

## Como rodar

Instruções completas de build/run virão na Fase 6. Por enquanto, para subir só o banco:

```bash
docker compose up -d db
```
