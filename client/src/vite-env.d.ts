/// <reference types="vite/client" />

/**
 * Sem esta declaração `import.meta.env.VITE_API_URL` é `any`, e um erro de nome
 * (`VITE_API_BASE`) só apareceria em runtime, como `undefined` na URL.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
