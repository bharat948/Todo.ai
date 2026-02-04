import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openaiClient = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate a short title and summary for a topic from the first input text.
 * Single inference; returns { title, summary } or { title: null, summary: null } on skip/error.
 */
export async function generateTitleAndSummary(inputText) {
  const client = getClient();
  if (!client) return { title: null, summary: null };

  const t = typeof inputText === 'string' ? inputText.trim() : '';
  if (!t) return { title: null, summary: null };

  try {
    // eslint-disable-next-line no-console
    console.log('[topicSummarizer] generating title and summary...');
    const system = {
      role: 'system',
      content:
        'You are a strict JSON-only assistant. Given a short user note or thought, output ONLY a JSON object with exactly two fields: "title" (a very short topic title, 3-8 words, no quotes inside) and "summary" (one or two sentences summarizing the theme, max 100 words). No other text or commentary.',
    };
    const user = {
      role: 'user',
      content: `Generate a topic title and brief summary for this input:\n"""${t}"""`,
    };

    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [system, user],
      max_tokens: 150,
      temperature: 0.3,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) return { title: null, summary: null };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(raw.slice(start, end + 1));
        } catch {
          return { title: null, summary: null };
        }
      } else {
        return { title: null, summary: null };
      }
    }

    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim().slice(0, 120)
        : null;
    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 500)
        : null;

    // eslint-disable-next-line no-console
    console.log('[topicSummarizer] result — title:', title ?? 'null');
    return { title, summary };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[topicSummarizer] error:', err?.message || err);
    return { title: null, summary: null };
  }
}
