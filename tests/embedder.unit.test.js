import { jest } from '@jest/globals';

const mockEmbedding = [0.024, -0.007, 0.01];

jest.unstable_mockModule('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn(async () => ({
          data: [{ embedding: mockEmbedding }],
        })),
      },
    })),
  };
});

const { embed } = await import('../src/services/embedder.js');

describe('embedder', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  test('returns embedding array when API key is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const result = await embed('hello world');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(mockEmbedding);
  });

  test('returns null when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await embed('hello');
    expect(result).toBeNull();
  });

  test('returns null for empty or whitespace text', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    expect(await embed('')).toBeNull();
    expect(await embed('   ')).toBeNull();
  });
});
