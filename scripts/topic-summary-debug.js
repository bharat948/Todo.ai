/**
 * Debug + regeneration utility for topic title and summary.
 *
 * - Inspects all topics in db.json
 * - Detects missing or empty title / summary
 * - Can regenerate from first input text or from manually provided text
 * - Logs original and updated state
 * - Outputs the JSON structure expected from OpenAI
 *
 * Usage:
 *   node scripts/topic-summary-debug.js                    # inspect only
 *   node scripts/topic-summary-debug.js --regenerate      # fix missing (use first input text)
 *   node scripts/topic-summary-debug.js --regenerate --dry-run
 *   node scripts/topic-summary-debug.js --regenerate --topic-id <id> --text "Sample text"
 *
 * Requires: OPENAI_API_KEY in .env for regeneration.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { generateTitleAndSummary } from '../src/services/topicSummarizer.js';

const ROOT = process.cwd();
const DEFAULT_DB = path.join(ROOT, 'db.json');

const EXPECTED_OPENAI_JSON = {
  description: 'LLM must return only this JSON (no markdown, no extra text)',
  schema: {
    title: 'string, 3-8 words, short topic title',
    summary: 'string, 1-2 sentences, max ~100 words',
  },
  example: { title: 'Daily nutrition goals', summary: 'User is tracking calorie intake and wants to reach at least 3000 cal per day.' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    dbPath: DEFAULT_DB,
    regenerate: false,
    dryRun: false,
    topicId: null,
    text: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      out.dbPath = path.resolve(ROOT, args[++i]);
    } else if (args[i] === '--regenerate') {
      out.regenerate = true;
    } else if (args[i] === '--dry-run') {
      out.dryRun = true;
    } else if (args[i] === '--topic-id' && args[i + 1]) {
      out.topicId = args[++i];
    } else if (args[i] === '--text' && args[i + 1]) {
      out.text = args[++i];
    }
  }
  return out;
}

function isEmpty(v) {
  return v == null || (typeof v === 'string' && !v.trim());
}

function loadDb(dbPath) {
  const raw = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(raw);
}

function saveDb(dbPath, data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function inspectTopics(db) {
  const topics = Array.isArray(db.topics) ? db.topics : [];
  const inputById = new Map();
  for (const inp of Array.isArray(db.inputs) ? db.inputs : []) {
    if (inp && inp.id) inputById.set(inp.id, inp);
  }

  const missing = [];
  for (const t of topics) {
    const noTitle = isEmpty(t.title);
    const noSummary = isEmpty(t.summary);
    if (!noTitle && !noSummary) continue;
    const firstInputId = Array.isArray(t.inputIds) && t.inputIds.length > 0 ? t.inputIds[0] : null;
    const firstInput = firstInputId ? inputById.get(firstInputId) : null;
    const sampleText = firstInput && typeof firstInput.text === 'string' ? firstInput.text.trim() : null;
    missing.push({
      id: t.id,
      title: t.title ?? null,
      summary: t.summary ?? null,
      inputIds: t.inputIds ?? [],
      sampleText,
    });
  }
  return { topics, inputById, missing };
}

async function main() {
  const opts = parseArgs();

  if (!fs.existsSync(opts.dbPath)) {
    console.error('DB file not found:', opts.dbPath);
    process.exit(1);
  }

  console.log('DB path:', opts.dbPath);
  const db = loadDb(opts.dbPath);
  const { topics, inputById, missing } = inspectTopics(db);

  console.log('\n--- Topic summary ---');
  console.log('Total topics:', topics.length);
  console.log('Topics with missing title or summary:', missing.length);

  if (missing.length > 0) {
    console.log('\n--- Topics needing title/summary ---');
    for (const m of missing) {
      console.log('\n  id:', m.id);
      console.log('  title:', m.title ?? '(empty)');
      console.log('  summary:', m.summary ?? '(empty)');
      console.log('  inputIds count:', m.inputIds.length);
      console.log('  first input text:', m.sampleText ? `"${m.sampleText.slice(0, 80)}${m.sampleText.length > 80 ? '...' : ''}"` : '(none)');
    }
  }

  console.log('\n--- Expected OpenAI response (JSON only) ---');
  console.log(JSON.stringify(EXPECTED_OPENAI_JSON, null, 2));

  if (!opts.regenerate || missing.length === 0) {
    if (missing.length > 0) {
      console.log('\nRun with --regenerate to fill missing title/summary from first input text.');
      console.log('Optional: --topic-id <id> --text "..." to use custom text for one topic.');
      console.log('Use --dry-run to log changes without writing db.json.');
    }
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('\nOPENAI_API_KEY is not set. Set it in .env to run regeneration.');
    process.exit(1);
  }

  const topicsById = new Map(topics.map((t) => [t.id, t]));
  let updated = 0;

  for (const m of missing) {
    let sampleText = m.sampleText;
    if (opts.topicId === m.id && opts.text) {
      sampleText = opts.text.trim();
      // eslint-disable-next-line no-console
      console.log('\n[regenerate] using manual --text for topic', m.id);
    }
    if (!sampleText) {
      // eslint-disable-next-line no-console
      console.log('\n[regenerate] skip topic', m.id, '(no input text available)');
      continue;
    }

    const topic = topicsById.get(m.id);
    if (!topic) continue;

    const before = { title: topic.title ?? null, summary: topic.summary ?? null };
    // eslint-disable-next-line no-console
    console.log('\n[regenerate] topic', m.id);
    // eslint-disable-next-line no-console
    console.log('  before:', JSON.stringify(before));

    const result = await generateTitleAndSummary(sampleText);
    if (result.title) topic.title = result.title;
    if (result.summary) topic.summary = result.summary;

    const after = { title: topic.title ?? null, summary: topic.summary ?? null };
    console.log('  after:', JSON.stringify(after));
    updated++;
  }

  console.log('\n--- Regeneration summary ---');
  console.log('Topics updated:', updated);

  if (updated > 0 && !opts.dryRun) {
    saveDb(opts.dbPath, db);
    console.log('Written to', opts.dbPath);
  } else if (opts.dryRun && updated > 0) {
    console.log('(dry-run: db.json not written)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
