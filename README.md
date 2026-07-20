# US Politicians Explorer

Full-stack que consome o endpoint `/people` da [OpenStates API v3](https://docs.openstates.org/api-v3/),
armazena os dados em **PostgreSQL** como cache (para economizar cota da API) e expõe
uma **API REST** + um **frontend React** com listagem e filtros por estado e partido —
tudo orquestrado por **Docker Compose**.

## Stack

- **Backend** (`server/`): Node 22 + Express + TypeScript + Prisma 7 + zod
- **Banco**: PostgreSQL 16
- **Frontend** (`client/`): Vite + React + TypeScript + TanStack Query + Tailwind
- **Testes**: Vitest (supertest no backend, React Testing Library no frontend)
- **Infra**: Docker + docker-compose (db, server e client em containers separados)

## Subir tudo com um comando

Só precisa de **Docker**. (Node 22 é para desenvolver fora dos containers; ver
[Desenvolvimento](#desenvolvimento-fora-do-docker).)

```bash
cp .env.example .env   # preencha OPENSTATES_API_KEY (https://open.pluralpolicy.com/accounts/profile/)
docker compose up --build
```

Pronto: **o frontend fica em <http://localhost:8080>** e a API em <http://localhost:3000>.

### O primeiro passo depois de subir: popular o cache

**A lista sobe vazia — isso é esperado, não é bug.** O banco começa sem dado, e o sync
não roda sozinho no boot (`SYNC_ON_STARTUP=false`): cada `up` gastaria a cota de um sync
inteiro. Popule o cache uma vez:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H 'content-type: application/json' -d '{"estados":["California"]}'
```

O endpoint responde `202` na hora e sincroniza em background — a lista leva alguns minutos
para aparecer em <http://localhost:8080> (o throttle de 6100 ms entre requisições é o que
respeita o limite de 10 req/min da API). Acompanhe com `docker compose logs -f server`.

Para derrubar: `docker compose down` (com `-v` para apagar o banco também).

### Variáveis

Todas documentadas em [`.env.example`](./.env.example); o `.env` da raiz é a única fonte —
o compose o injeta em cada serviço.

| Variável                    | Default                     | Para que serve                                                                                              |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OPENSTATES_API_KEY`        | —                           | **Obrigatória.** Sem ela o backend nem sobe (validação falha rápido, de propósito).                         |
| `VITE_API_URL`              | `http://localhost:3000/api` | URL da API **como o navegador a enxerga**. Lida em _build-time_ — ver aviso abaixo.                         |
| `POSTGRES_USER/PASSWORD/DB` | `politics`                  | Credenciais do Postgres. A `DATABASE_URL` do container é derivada delas.                                    |
| `POSTGRES_HOST_PORT`        | `5432`                      | Porta do Postgres **no host**. Mude se a 5432 já estiver ocupada.                                           |
| `BACKEND_PORT`              | `3000`                      | Porta da API. Ao mudar, ajuste `VITE_API_URL` junto.                                                        |
| `WEB_PORT`                  | `8080`                      | Porta do frontend no host. Ao mudar, ajuste `CORS_ORIGIN` junto.                                            |
| `CORS_ORIGIN`               | `http://localhost:8080`     | Origem autorizada a chamar a API. Tem de bater com a URL do frontend.                                       |
| `SYNC_STATES`               | _(vazio)_                   | Estados a sincronizar. **Vazio = todos** (~150 req). Ver [Cota](#cota-da-api--leia-antes-do-primeiro-sync). |

> **`VITE_API_URL` é assada no bundle em build-time.** Quem chama a API é o navegador do
> usuário, que roda **fora** da rede do Docker — então o valor tem de ser um endereço que
> o _host_ resolva (`http://localhost:3000/api`), nunca o hostname interno
> `http://server:3000/api` (o navegador daria `ERR_NAME_NOT_RESOLVED`). Trocá-la exige
> `docker compose up --build`, não só um restart.

### Se a porta 5432 (ou 8080/3000) estiver ocupada

Sintoma: `Bind for 0.0.0.0:5432 failed: port is already allocated` — comum em máquina com
outro Postgres no ar. As três portas publicadas são configuráveis no `.env`:

```bash
POSTGRES_HOST_PORT=5434     # só a porta do host muda; dentro da rede o db segue em 5432
WEB_PORT=8081               # lembre de ajustar CORS_ORIGIN=http://localhost:8081
BACKEND_PORT=3001           # lembre de ajustar VITE_API_URL=http://localhost:3001/api
```

### Os três containers

| Serviço  | Imagem                                     | Porta (host → container) | O que roda                                                          |
| -------- | ------------------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| `db`     | `postgres:16-alpine`                       | `5432 → 5432`            | Postgres, com volume `db_data` para o dado sobreviver ao `down`     |
| `server` | [`server/Dockerfile`](./server/Dockerfile) | `3000 → 3000`            | `node dist/index.js`, como usuário não-root, atrás de um entrypoint |
| `client` | [`client/Dockerfile`](./client/Dockerfile) | `8080 → 8080`            | nginx servindo o build do Vite (nenhum Node no runtime)             |

O `up` vale como comando único por causa do encadeamento de healthchecks: o `server` só
tenta migrar depois de o Postgres aceitar conexão (`pg_isready`), e o `client` só sobe
depois de o `/health` do `server` responder. **As migrations são aplicadas no boot** pelo
entrypoint do `server` (`prisma migrate deploy`) — não há passo manual.

Ambas as imagens são multi-stage: o toolchain de build não chega ao runtime.

## Desenvolvimento (fora do Docker)

Para o loop de desenvolvimento com HMR, requer [Node 22](./.nvmrc).

O backend **na máquina host** precisa de um `server/.env` que sobrescreva a
`DATABASE_URL` — a da raiz aponta para `db:5432`, um hostname que só existe dentro da
rede do Docker:

```bash
cp server/.env.example server/.env   # ajuste a porta se a 5432 estiver ocupada
```

O `npm run dev` carrega os dois arquivos (raiz primeiro, `server/` depois), então a
`OPENSTATES_API_KEY` vive num lugar só.

```bash
docker compose up -d db          # só o Postgres

cd server
npm install
npm run db:migrate               # aplica as migrations
npm run dev                      # backend em http://localhost:3000
```

`GET /health` responde `{"status":"ok"}`. Os endpoints de `/api` estão documentados abaixo.

O backend **não sobe** sem `OPENSTATES_API_KEY` e `DATABASE_URL`: a validação de
ambiente falha rápido, de propósito.

### API

| Método | Rota                                                | Descrição                                        |
| ------ | --------------------------------------------------- | ------------------------------------------------ |
| GET    | `/api/politicos?estado=&partido=&q=&page=&perPage=` | Lista paginada com filtros                       |
| GET    | `/api/politicos/filtros`                            | Estados e partidos distintos (para os dropdowns) |
| POST   | `/api/sync`                                         | Dispara o sync em background (responde `202`)    |
| GET    | `/api/docs`                                         | Swagger UI                                       |
| GET    | `/api/openapi.json`                                 | Documento OpenAPI 3.1                            |

A lista responde no envelope `{ "data": [...], "pagination": { page, perPage, total, totalPages } }`.
Erros saem no shape `{ "error": { "message", "details"? } }`. O contrato é gerado dos mesmos
schemas Zod que validam as requests (`npm run openapi:generate` reescreve `server/openapi.json`).

```bash
curl "http://localhost:3000/api/politicos?estado=California&perPage=5"
curl "http://localhost:3000/api/politicos/filtros"
curl -X POST http://localhost:3000/api/sync \
  -H 'content-type: application/json' -d '{"estados":["California"]}'
```

### Testes do backend

```bash
cd server
npm test                 # suíte rápida: sem Docker, sem rede, sem banco
npm run typecheck
npm run test:integration # Postgres real via Testcontainers — exige Docker
```

Ver [Testes](#testes) para a pirâmide completa (incluindo E2E e o smoke ao vivo).

## Frontend

SPA React em `client/`, servida na **porta 8080** (casa com o `CORS_ORIGIN` do backend).

> **O frontend exige o backend no ar.** Não há mais dados falsos na árvore de produção:
> a camada de API fala HTTP com `VITE_API_URL`. Suba o banco e o server antes (seção
> [Backend](#backend)); sem eles a lista renderiza o estado de erro.

```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api
npm run dev            # http://localhost:8080
```

| Variável       | Para que serve                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | URL base da API, **com o prefixo `/api`**. Lida em build-time pelo Vite e tipada em `src/vite-env.d.ts`. |

| Script            | O que faz                                                             |
| ----------------- | --------------------------------------------------------------------- |
| `npm run dev`     | Dev server com HMR em `http://localhost:8080`                         |
| `npm run build`   | `tsc -b` (type-check) + build de produção em `dist/`                  |
| `npm run preview` | Serve o build em `http://localhost:8080`                              |
| `npm test`        | Vitest (jsdom + React Testing Library + MSW; sem Docker, sem backend) |
| `npm run lint`    | oxlint                                                                |

**Arquitetura:** `src/api/http.ts` é a única porta de saída para a rede — monta a URL a
partir de `VITE_API_URL`, serializa a query string e traduz o envelope de erro do backend
(`{ error: { message } }`) num `ApiError` com `status`. Sobre ele, `src/api/politicos.ts`
expõe `listarPoliticos` / `buscarFiltros`, uma linha por endpoint. Os **hooks** (TanStack Query) entregam loading/erro/cache;
a **página** (`src/paginas/PoliticosPage.tsx`) detém o UI-state; os **componentes** são de
apresentação, sem I/O.

## Testes

> **Um teste vale pelo que ele quebra.** Se sabotar o código de propósito e o teste seguir
> verde, ele não é um teste — é decoração. Cada camada abaixo existe porque a de cima não
> pega o que ela pega.

| Camada                              | Comando                                           | Precisa de            | Prova                                                                                          |
| ----------------------------------- | ------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| **Unitário + integração do client** | `npm test` (em `server/` e `client/`)             | nada                  | Lógica pura, componentes, e o `fetch` real do client contra o MSW                              |
| **Integração do server**            | `npm run test:integration` (em `server/`)         | **Docker**            | SQL de verdade: filtros, paginação, `distinct`, upsert idempotente                             |
| **E2E**                             | `npm run test:e2e` (na **raiz**)                  | **Docker** + Chromium | Navegador real → React → HTTP → Express → Prisma → Postgres. Zero mocks                        |
| **E2E do compose**                  | `npm run test:e2e:compose` (na **raiz**)          | **Docker** + Chromium | O mesmo spec contra as **imagens de entrega**: nginx servindo o bundle e o entrypoint migrando |
| **Smoke ao vivo** _(opt-in)_        | `RUN_LIVE_API=1 npm run test:live` (em `server/`) | `OPENSTATES_API_KEY`  | Que as fixtures ainda espelham a API real. **Gasta 1 requisição da cota**                      |

```bash
# loop de desenvolvimento: rápido, sem Docker
cd server && npm test
cd client && npm test

# antes de abrir PR: as camadas que exigem Docker
cd server && npm run test:integration
npm run test:e2e                      # na raiz; instale o navegador uma vez:
                                      #   npx playwright install --with-deps chromium

# antes de entregar: prova as imagens de verdade (builda, leva minutos)
npm run test:e2e:compose

# só quando desconfiar que a OpenStates mudou (gasta cota):
cd server && RUN_LIVE_API=1 npm run test:live
```

O CI (`.github/workflows/ci.yml`) roda as três primeiras camadas em todo push e PR. O
`test:live` fica **fora** do CI de propósito: cada rodada queimaria cota do tier free, que
é compartilhada com o sync de produção.

**Por que dois E2E com o mesmo spec:** eles provam coisas diferentes. O `test:e2e` roda em
~15 s contra `vite dev` + `tsx` — é o que cabe em cada push. O `test:e2e:compose` builda as
imagens e leva minutos, mas pega o que o outro não pode pegar: um `VITE_API_URL` assado
errado no bundle, um estágio do Dockerfile que não copiou o que devia, uma migration que não
roda no boot. Ele sobe num projeto compose isolado (`-p ups-e2e`, portas e volume próprios),
então **não toca no banco do seu `docker compose up`** — o seed começa com um `deleteMany()`.

**Por que só a OpenStates continua fingida:** o tier free dá ~500 req/dia. Um `npm test`
que batesse nela seria caro (o CI queimaria a cota do dia), lento (throttle de 6100 ms) e
instável (legisladores mudam de cargo — o teste quebraria sem bug nosso). A saída são
fixtures gravadas de respostas reais **mais** o smoke opt-in, que ancora essas fixtures na
realidade. Fixture sem smoke test é fé; fixture com smoke test é contrato.

## Cota da API — leia antes do primeiro sync

O tier free da OpenStates dá **~500 requisições/dia** e **10 req/min**. É a restrição que
decide o desenho: por isso existem o cache no Postgres, o throttle de 6100 ms entre
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
