import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { openApiDocument } from './openapi.js';

/**
 * Escreve `server/openapi.json` — o contrato versionado e revisável em diff.
 * Rodar com `npm run openapi:generate` sempre que os schemas mudarem.
 */
const destino = resolve(dirname(fileURLToPath(import.meta.url)), '../../openapi.json');

writeFileSync(destino, `${JSON.stringify(openApiDocument, null, 2)}\n`);

console.log(`OpenAPI escrito em ${destino}`);
