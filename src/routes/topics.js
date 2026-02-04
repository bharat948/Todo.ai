import express from 'express';
import * as jsonStore from '../store/jsonStore.js';

const router = express.Router();

router.get('/topics', async (req, res) => {
  try {
    const topics = await jsonStore.list('topics');
    const count = Array.isArray(topics) ? topics.length : 0;
    // eslint-disable-next-line no-console
    console.log('[topics] GET /topics — returning', count, 'topic(s)');
    res.json(topics);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[topics] GET /topics error:', err?.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

router.get('/topics/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const topic = await jsonStore.getById('topics', id);
    if (!topic || !topic.id) {
      // eslint-disable-next-line no-console
      console.log('[topics] GET /topics/:id — 404 not found:', id);
      return res.status(404).json({ error: 'topic not found' });
    }
    // eslint-disable-next-line no-console
    console.log('[topics] GET /topics/:id — 200', id, 'inputIds:', topic.inputIds?.length ?? 0);
    res.json(topic);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[topics] GET /topics/:id error:', err?.message || err);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
