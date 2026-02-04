import { cosineSimilarity, averageEmbeddings } from '../src/utils/similarity.js';

describe('cosineSimilarity', () => {
  test('parallel vectors return 1', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  test('opposite vectors return -1', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
  });

  test('orthogonal vectors return 0', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0);
  });
});

describe('averageEmbeddings', () => {
  test('two vectors yield midpoint', () => {
    const prev = [0, 0, 0];
    const next = [2, 4, 6];
    const avg = averageEmbeddings(prev, next, 2);
    expect(avg).toEqual([1, 2, 3]);
  });

  test('running average with count 3', () => {
    const prevAvg = [1, 2, 3];
    const newVec = [1, 2, 3];
    const avg = averageEmbeddings(prevAvg, newVec, 3);
    expect(avg).toEqual([1, 2, 3]);
  });
});
