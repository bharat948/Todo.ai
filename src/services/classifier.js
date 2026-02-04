import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openaiClient = null;

const FALLBACK_GIBBERISH_SCORE = 0.95;

const fallbackClassify = (text) => {
  const t = (text || '').trim();
  if (!t) {
    return {
      label: 'gibberish',
      confidence: 1,
      reason: 'Empty or whitespace-only text',
      gibberishScore: FALLBACK_GIBBERISH_SCORE,
    };
  }

  const words = t.split(/\s+/).length;
  const alphaChars = t.replace(/[^a-zA-Z0-9 ]/g, '').length;
  const alphaRatio = alphaChars / Math.max(1, t.length);

  if (words <= 2 || alphaRatio < 0.5) {
    return {
      label: 'gibberish',
      confidence: 0.95,
      reason: 'Too short or mostly non-alphanumeric',
      gibberishScore: FALLBACK_GIBBERISH_SCORE,
    };
  }

  const lowered = t.toLowerCase();

  if (
    /(schedule|todo|remind|call|email|buy|book|complete|finish|due|tomorrow|by tomorrow|by next)/i.test(
      lowered,
    )
  ) {
    return {
      label: 'task',
      confidence: 0.85,
      reason: 'Imperative or temporal language detected',
    };
  }

  if (/(idea|what if|plan|proposal|could be|maybe we)/i.test(lowered)) {
    return {
      label: 'idea',
      confidence: 0.78,
      reason: 'Idea-like phrases found',
    };
  }

  return {
    label: 'thought',
    confidence: 0.6,
    reason: 'Defaulting to thought for free-form text',
  };
};

export const classify = async (text) => {
  const t = (text || '').trim();
  if (!t) {
    return fallbackClassify(text);
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return fallbackClassify(t);
    }

    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey });
    }

    const system = {
      role: 'system',
      content:
        'You are a strict JSON-only classifier. Given a text, return ONLY a JSON object with fields: {"label": one of ["gibberish","thought","idea","task"], "confidence": number 0-1, "reason": "one-line explanation", "gibberishScore": optional number 0-1 when label is "gibberish", "expanded_idea": "Reword the input into a clear, complete sentence (max 20 words)", "is_task": boolean }. No extra commentary.',
    };

    const user = {
      role: 'user',
      content: `Classify the following user input:\n"""${t}"""`,
    };

    const resp = await openaiClient.chat.completions.create({
      model: MODEL,
      messages: [system, user],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return fallbackClassify(t);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // try to salvage JSON substring
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = raw.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(candidate);
        } catch {
          return fallbackClassify(t);
        }
      } else {
        return fallbackClassify(t);
      }
    }

    if (!parsed || !parsed.label) {
      return fallbackClassify(t);
    }

    // normalize label
    const label = String(parsed.label).toLowerCase();
    const normalized =
      label === 'gibberish' || label === 'thought' || label === 'idea' || label === 'task'
        ? label
        : 'thought';

    const result = {
      label: normalized,
      confidence:
        typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
          ? parsed.confidence
          : undefined,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      expanded_idea: typeof parsed.expanded_idea === 'string' ? parsed.expanded_idea : undefined,
      is_task: typeof parsed.is_task === 'boolean' ? parsed.is_task : false,
    };

    if (normalized === 'gibberish') {
      result.gibberishScore =
        typeof parsed.gibberishScore === 'number' && parsed.gibberishScore >= 0
          ? parsed.gibberishScore
          : FALLBACK_GIBBERISH_SCORE;
    }

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OpenAI classify error:', err?.message || err);
    return fallbackClassify(text);
  }
};

