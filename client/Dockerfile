# Imagem do frontend: build do Vite e, no runtime, um nginx servindo estático.
# Nenhum Node chega ao runtime — o que se entrega é HTML, CSS e JS.

# --- build -------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ARG depois do `npm ci`: trocar a URL da API não invalida a layer das deps.
#
# A URL é injetada NO BUNDLE em build-time — não há como trocá-la depois sem
# rebuildar. E quem faz a requisição é o navegador do usuário, que roda FORA da
# rede do Docker: tem de ser um endereço que o host resolva.
#   ✅ http://localhost:3000/api   (porta publicada pelo compose)
#   ❌ http://server:3000/api      (hostname interno; o navegador dá ERR_NAME_NOT_RESOLVED)
ARG VITE_API_URL
# Falha explícita: sem isto o Vite assa `undefined` na URL e o erro só aparece
# no navegador do avaliador, como um TypeError dentro de um bundle minificado.
RUN test -n "$VITE_API_URL" || { \
  echo "ERRO: build-arg VITE_API_URL é obrigatório (ex.: --build-arg VITE_API_URL=http://localhost:3000/api)"; \
  exit 1; \
  }
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM nginx:alpine AS runtime

# Substitui o server default (que escuta na 80) pelo nosso, com fallback de SPA.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Sem HEALTHCHECK aqui, de propósito: nada no compose depende do client (é ele
# que espera o server ficar healthy, não o contrário), então o check só serviria
# de enfeite no `docker compose ps`.
