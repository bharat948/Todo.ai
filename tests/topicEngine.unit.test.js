import { jest } from '@jest/globals';

const existingTopicId = 'existing-topic-123';
const sameVector = [1, 0, 0];
const differentVector = [-1, 0, 0];

const mockList = jest.fn();
const mockUpdate = jest.fn(async () => ({}));
const mockCreate = jest.fn(async (_, topic) => topic);

jest.unstable_mockModule('../src/store/jsonStore.js', () => ({
  list: mockList,
  update: mockUpdate,
  create: mockCreate,
  getById: jest.fn(),
}));

const { assignOrCreateTopic } = await import('../src/services/topicEngine.js');

describe('topicEngine', () => {
  beforeEach(() => {
    mockList.mockClear();
    mockUpdate.mockClear();
    mockCreate.mockClear();
  });

  test('returns null when inputEmbedding is null or not array', async () => {
    expect(await assignOrCreateTopic(null, 'id1')).toBeNull();
    expect(await assignOrCreateTopic(undefined, 'id1')).toBeNull();
    expect(await assignOrCreateTopic([], 'id1')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('assigns to existing topic when similarity >= threshold', async () => {
    mockList.mockResolvedValue([
      {
        id: existingTopicId,
        embedding: sameVector,
        inputIds: [],
        stats: { lifetime_size: 0, activity_7d: 0, completion_count: 0, execution_ratio: 0, recency_strength: 1.0 },
      },
    ]);

    const topicId = await assignOrCreateTopic(sameVector, 'input-1');
    expect(topicId).toBe(existingTopicId);
    expect(mockUpdate).toHaveBeenCalledWith(
      'topics',
      existingTopicId,
      expect.objectContaining({
        id: existingTopicId,
        inputIds: ['input-1'],
        stats: expect.objectContaining({ lifetime_size: 1, activity_7d: 1 }),
      }),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('creates new topic when no topic is close enough', async () => {
    mockList.mockResolvedValue([]);

    const topicId = await assignOrCreateTopic(sameVector, 'input-1');
    expect(topicId).toBeDefined();
    expect(typeof topicId).toBe('string');
    expect(mockCreate).toHaveBeenCalledWith(
      'topics',
      expect.objectContaining({
        title: null,
        embedding: sameVector,
        inputIds: ['input-1'],
        stats: expect.objectContaining({ lifetime_size: 1, activity_7d: 1 }),
      }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('creates new topic when best similarity is below threshold', async () => {
    mockList.mockResolvedValue([
      {
        id: existingTopicId,
        embedding: differentVector,
        inputIds: [],
        stats: { lifetime_size: 0, activity_7d: 0, completion_count: 0, execution_ratio: 0, recency_strength: 1.0 },
      },
    ]);

    const topicId = await assignOrCreateTopic(sameVector, 'input-1');
    expect(topicId).not.toBe(existingTopicId);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
