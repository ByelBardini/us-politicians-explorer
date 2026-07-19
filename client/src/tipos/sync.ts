/** Resposta do `POST /sync` — 202: o sync roda em background no servidor. */
export interface SyncAceito {
  status: 'accepted';
  message: string;
}
