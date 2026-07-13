import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

describe('createApp', () => {
  it('GET /health responde 200 { status: "ok" }', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
