import 'dotenv/config';
import express from 'express';
import ingestRouter from './routes/ingest.js';
import topicsRouter from './routes/topics.js';

export const createApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use(ingestRouter);
  app.use(topicsRouter);

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`api listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'not set');
  });
}
