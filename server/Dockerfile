# Imagem do backend. Multi-stage: as devDependencies e o toolchain do TypeScript
# ficam nos estágios de build e não chegam ao runtime.
#
# Node 22: é o que o CI e o desenvolvimento usam. Uma imagem `node:20` rodaria
# num runtime que nunca foi testado.

# --- deps: só o grafo de dependências, cacheável -----------------------------
# Copiamos apenas os manifestos: enquanto eles não mudarem, o Docker reusa a
# layer do `npm ci` mesmo que todo o src tenha mudado.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts pula o postinstall (`prisma generate`), que aqui falharia:
# o schema ainda não foi copiado. O generate roda explícito no estágio `build`.
RUN npm ci --ignore-scripts

# --- build: gera o client do Prisma e compila o TypeScript -------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` lê a `datasource.url` do prisma.config.ts e falha se a env
# não existir. Nenhuma conexão é aberta em generate — este valor nunca é usado
# para falar com banco algum, e é inline: morre com o RUN.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  npx prisma generate \
  && npm run build

# --- runtime: só o necessário para servir ------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# prisma/ e prisma.config.ts são de runtime, não de build: é deles que o
# `prisma migrate deploy` do entrypoint vive. Entram ANTES do `npm ci` porque
# o postinstall (`prisma generate`) precisa do schema.
COPY prisma ./prisma
COPY prisma.config.ts ./

# --omit=dev: sem TypeScript, vitest, tsx & cia. O `prisma` (CLI) e o `dotenv`
# ficam porque são `dependencies` — o entrypoint aplica migrations no boot.
#
# Aqui os scripts RODAM, de propósito: é o postinstall do @prisma/engines que
# baixa o schema-engine. Com --ignore-scripts a imagem sobe sem ele, e aí o
# `migrate deploy` tenta baixá-lo no boot — falhando por permissão (o usuário
# `node` não escreve em node_modules) e, pior, dependendo da internet a cada
# start. Assar no build troca isso por uma layer imutável.
#
# DATABASE_URL inline, só para este RUN: o postinstall a exige, mas nenhuma
# conexão é aberta em generate. Como ENV, ela vazaria para o runtime e viraria
# um fallback silencioso no lugar da falha rápida que o env.ts garante.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
  npm ci --omit=dev \
  && npm cache clean --force \
  && rm -rf src

COPY --from=build /app/dist ./dist
COPY --chmod=755 docker-entrypoint.sh ./

# `node` (uid 1000) já existe na imagem base. Rodar como root daria a um RCE no
# Express permissão de escrita sobre a própria imagem.
#
# Sem `chown -R /app`: o processo só lê e executa — nada aqui é escrito em
# runtime. E o chown recursivo copiaria os 350 MB de node_modules para uma
# layer nova só para trocar o dono (medido: +346 MB na imagem).
USER node

EXPOSE 3000

# É o que o `depends_on: service_healthy` do client espera. wget vem do busybox
# da Alpine — sem curl, sem instalar nada.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${BACKEND_PORT:-3000}/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
