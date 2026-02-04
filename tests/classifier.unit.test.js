import { jest } from '@jest/globals';

// Always mock OpenAI so tests never hit the real API
jest.unstable_mockModule('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    label: 'task',
                    confidence: 0.87,
                    reason: 'Mocked classification',
                  }),
                },
              },
            ],
          })),
        },
      },
    })),
  };
});

const { classify } = await import('../src/services/classifier.js');

describe('classifier fallback', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  test('classifies very short or noisy text as gibberish', async () => {
    const out = await classify('!!??');
    expect(out.label).toBe('gibberish');
  });

  test('detects task-like text', async () => {
    const out = await classify('Schedule dentist appointment tomorrow');
    expect(out.label).toBe('task');
  });

  test('detects idea-like text', async () => {
    const out = await classify('Idea: start a podcast about city history');
    expect(out.label).toBe('idea');
  });

  test('defaults to thought for other text', async () => {
    const out = await classify('I had an odd dream about the ocean last night');
    expect(out.label).toBe('thought');
  });
});

describe('classifier OpenAI path (mocked)', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  test('uses OpenAI client when key is present (mocked)', async () => {
    const out = await classify('Schedule team meeting tomorrow');
    expect(out.label).toBe('task');
  });
});

