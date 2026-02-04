import OpenAI from 'openai';

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

let openaiClient = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function embed(text) {
  const client = getClient();
  if (!client) {
    // eslint-disable-next-line no-console
    console.log('[embedder] skipped — OPENAI_API_KEY not set');
    return null;
  }

  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return null;

  try {
    // eslint-disable-next-line no-console
    console.log('[embedder] calling OpenAI', EMBED_MODEL, '...');
    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: t,
    });
    const embedding = response.data?.[0]?.embedding;
    if (Array.isArray(embedding) && embedding.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[embedder] result — vector length:', embedding.length);
      return embedding;
    }
    // eslint-disable-next-line no-console
    console.log('[embedder] result — no embedding in response');
    return null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[embedder] error:', err?.message || err);
    return null;
  }
}
