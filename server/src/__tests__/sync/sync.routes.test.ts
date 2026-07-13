import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import type { Logger } from '../../lib/logger.js';
import type { PoliticosRepository } from '../../politicos/politicos.repository.js';

const fakeLogger = (): Logger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const fakeRepo = () => ({}) as unknown as PoliticosRepository;

type SyncRun = (estados?: string[]) => Promise<unknown>;
const fakeSync = () => ({ run: vi.fn<SyncRun>() });

const appCom = (syncService: { run: SyncRun }) =>
  createApp({
    logger: fakeLogger(),
    corsOrigin: 'http://localhost:8080',
    repository: fakeRepo(),
    syncService,
    openApiDocument: {},
  });

describe('POST /api/sync', () => {
  it('responde 202 e dispara o sync', async () => {
    const syncService = fakeSync();
    syncService.run.mockResolvedValue({});

    const res = await request(appCom(syncService)).post('/api/sync').send({});

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted', message: expect.any(String) });
    expect(syncService.run).toHaveBeenCalledTimes(1);
  });

  it('repassa estados do body para run()', async () => {
    const syncService = fakeSync();
    syncService.run.mockResolvedValue({});

    await request(appCom(syncService)).post('/api/sync').send({ estados: ['California'] });

    expect(syncService.run).toHaveBeenCalledWith(['California']);
  });

  it('body malformado responde 400', async () => {
    const syncService = fakeSync();

    const res = await request(appCom(syncService)).post('/api/sync').send({ estados: 'nope' });

    expect(res.status).toBe(400);
    expect(syncService.run).not.toHaveBeenCalled();
  });
});
