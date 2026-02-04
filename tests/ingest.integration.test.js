import { jest } from '@jest/globals';
import request from 'supertest';

const mockEmbedding = [0.01, -0.02, 0.03];
const mockTopicId = 'topic-mocked-123';

jest.unstable_mockModule('../src/services/classifier.js', () => ({
  classify: jest.fn(async () => ({
    label: 'idea',
    confidence: 0.9,
    reason: 'mocked',
  })),
}));

jest.unstable_mockModule('../src/services/embedder.js', () => ({
  embed: jest.fn(async () => mockEmbedding),
}));

jest.unstable_mockModule('../src/services/topicEngine.js', () => ({
  assignOrCreateTopic: jest.fn(async () => mockTopicId),
}));

jest.unstable_mockModule('../src/store/jsonStore.js', () => ({
  create: jest.fn(async (collection, payload) => ({ ...payload })),
  list: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
}));

const { createApp } = await import('../src/app.js');
const app = createApp();

describe('POST /ingest', () => {
  test('returns 400 when text is missing', async () => {
    const res = await request(app).post('/ingest').send({}).expect(400);
    expect(res.body).toEqual({ error: 'text is required' });
  });

  test('creates input and returns 201 with embedding and topicId', async () => {
    const payload = { text: 'Idea: start a podcast about history' };
    const res = await request(app).post('/ingest').send(payload).expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.text).toBe(payload.text);
    expect(res.body.category).toBe('idea');
    expect(res.body.created_at).toBeDefined();
    expect(Array.isArray(res.body.embedding)).toBe(true);
    expect(res.body.embedding).toEqual(mockEmbedding);
    expect(res.body.topicId).toBe(mockTopicId);
  });
});

