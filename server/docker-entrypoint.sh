#!/bin/sh
# Aplica as migrations e só então entrega o processo ao CMD.
#
# Existe para que `docker compose up` seja o único comando que o avaliador
# precisa rodar: sem isto, o banco sobe sem tabela alguma e a primeira query
# do Express estoura.
set -e

# `migrate deploy` (não `migrate dev`): só aplica migrations já commitadas,
# nunca gera nem faz reset. É o comando certo para um ambiente não-interativo —
# `migrate dev` poderia decidir dropar o banco sozinho.
echo "[entrypoint] aplicando migrations..."
npx prisma migrate deploy

# `exec`: o node vira o PID 1, então recebe o SIGTERM do `docker stop` direto.
# Sem isto o shell seguraria o sinal e o compose mataria o container no timeout.
echo "[entrypoint] iniciando o servidor..."
exec "$@"
