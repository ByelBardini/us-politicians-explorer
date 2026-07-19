import { apiPost } from './http';
import type { SyncAceito } from '../tipos/sync';

/**
 * Dispara o sync manual. O servidor responde 202 imediatamente e roda o sync em
 * background (leva minutos); chamadas concorrentes são deduplicadas lá.
 */
export function dispararSync(): Promise<SyncAceito> {
  return apiPost<SyncAceito>('/sync');
}
