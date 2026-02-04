import request from 'supertest';
import express from 'express';

const createApp = () => {
  const app = express();
  app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  return app;
};

describe('GET /health', () => {
  let app;
  beforeAll(() => {
    app = createApp();
  });

  test('returns ok true and iso time', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(new Date(res.body.time).toString()).not.toBe('Invalid Date');
  });
});
