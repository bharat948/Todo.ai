import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { classify } from '../services/classifier.js';
import { embed } from '../services/embedder.js';
import { assignOrCreateTopic } from '../services/topicEngine.js';
import { create as createRecord } from '../store/jsonStore.js';

const router = express.Router();

router.post('/ingest', async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      // eslint-disable-next-line no-console
      console.log('[ingest] 400 — text is required');
      return res.status(400).json({ error: 'text is required' });
    }

    const trimmed = text.trim();
    // eslint-disable-next-line no-console
    console.log('[ingest] classifying:', trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : ''));
    const classification = await classify(trimmed);
    // eslint-disable-next-line no-console
    console.log('[ingest] classification result:', classification.label);

    const record = {
      id: uuidv4(),
      text: trimmed,
      category: classification.label,
      created_at: new Date().toISOString(),
      embedding: null,
      topicId: null,
      expanded_idea: classification.expanded_idea || null,
      is_task: classification.is_task || false,
    };

    if (classification.label === 'gibberish') {
      record.gibberishScore =
        typeof classification.gibberishScore === 'number'
          ? classification.gibberishScore
          : 0.9;
      // eslint-disable-next-line no-console
      console.log('[ingest] gibberish — skipping embedding/topic, storing input');
    } else {
      const embedding = await embed(trimmed);
      if (embedding) {
        const topicId = await assignOrCreateTopic(embedding, record.id, trimmed);
        record.embedding = embedding;
        record.topicId = topicId;
        // eslint-disable-next-line no-console
        console.log('[ingest] embedding generated, topicId:', topicId);
      } else {
        // eslint-disable-next-line no-console
        console.log('[ingest] no embedding (missing key or error) — storing without topic');
      }
    }

    const created = await createRecord('inputs', record);
    // eslint-disable-next-line no-console
    console.log('[ingest] 201 — input created:', created.id, 'category:', created.category, 'topicId:', created.topicId ?? 'null');
    return res.status(201).json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ingest] error:', err?.message || err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export default router;

