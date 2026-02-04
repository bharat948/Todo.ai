import { v4 as uuidv4 } from 'uuid';
import * as jsonStore from '../store/jsonStore.js';
import { cosineSimilarity, averageEmbeddings } from '../utils/similarity.js';
import { cosineSimilarity, averageEmbeddings } from '../utils/similarity.js';
import { generateTitleAndSummary } from './topicSummarizer.js';
import { embed } from './embedder.js';

const SIM_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.83;

const defaultStats = () => ({
  lifetime_size: 1,
  activity_7d: 1,
  completion_count: 0,
  execution_ratio: 0,
  recency_strength: 1.0,
});

export async function assignOrCreateTopic(inputEmbedding, inputId, inputText = null) {
  if (
    !inputEmbedding ||
    !Array.isArray(inputEmbedding) ||
    inputEmbedding.length === 0
  ) {
    return null;
  }

  const topics = await jsonStore.list('topics');
  const validTopics = Array.isArray(topics) ? topics : [];
  // eslint-disable-next-line no-console
  console.log('[topicEngine] comparing against', validTopics.length, 'existing topic(s)');

  let bestMatch = null;
  let bestSim = -1;

  for (const topic of validTopics) {
    if (!topic.embedding || !Array.isArray(topic.embedding)) continue;
    const sim = cosineSimilarity(topic.embedding, inputEmbedding);
    if (sim > bestSim && sim >= SIM_THRESHOLD) {
      bestSim = sim;
      bestMatch = topic;
    }
  }

  if (bestMatch) {
    bestMatch.inputIds = bestMatch.inputIds || [];
    bestMatch.inputIds.push(inputId);
    bestMatch.embedding = averageEmbeddings(
      bestMatch.embedding,
      inputEmbedding,
      bestMatch.inputIds.length,
    );
    bestMatch.stats = bestMatch.stats || defaultStats();
    bestMatch.stats.lifetime_size += 1;
    bestMatch.stats.activity_7d += 1;
    await jsonStore.update('topics', bestMatch.id, bestMatch);
    // eslint-disable-next-line no-console
    console.log('[topicEngine] assigned to existing topic:', bestMatch.id, 'similarity:', bestSim.toFixed(4), 'inputs:', bestMatch.inputIds.length);
    return bestMatch.id;
  }

  const newTopic = {
    id: uuidv4(),
    title: null,
    summary: null,
    embedding: inputEmbedding,
    inputIds: [inputId],
    created_at: new Date().toISOString(),
    stats: defaultStats(),
  };

  if (inputText && typeof inputText === 'string' && inputText.trim()) {
    const { title, summary } = await generateTitleAndSummary(inputText.trim());
    if (title) newTopic.title = title;
    if (summary) {
      newTopic.summary = summary;
      // Refactor: Use embedding of the SUMMARY for the new topic, not the input
      const summaryEmbedding = await embed(summary);
      if (summaryEmbedding) {
        newTopic.embedding = summaryEmbedding;
        console.log('[topicEngine] replaced initial embedding with summary embedding');
      }
    }
  }

  await jsonStore.create('topics', newTopic);
  // eslint-disable-next-line no-console
  console.log('[topicEngine] created new topic:', newTopic.id, 'title:', newTopic.title ?? 'null');
  return newTopic.id;
}
