/**
 * Reads all project files (excluding node_modules, .env, tests/) and writes
 * their contents to extracted-codebase.txt.
 *
 * Run: node scripts/read-project.js
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'extracted-codebase.txt');
const SKIP_DIRS = new Set(['node_modules', 'tests', 'test']);
const SKIP_FILES = new Set(['.env']);
const SKIP_PREFIX = '.env.';

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

function shouldSkipFile(name) {
  if (SKIP_FILES.has(name)) return true;
  if (name.startsWith(SKIP_PREFIX)) return true;
  return false;
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full);
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name)) continue;
      yield* walk(full);
    } else if (ent.isFile()) {
      if (shouldSkipFile(ent.name)) continue;
      yield rel;
    }
  }
}

const SEP = '\n' + '─'.repeat(80) + '\n';
const chunks = [];

for (const rel of walk(ROOT)) {
  const full = path.join(ROOT, rel);
  let content;
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (err) {
    content = `[could not read: ${err.message}]`;
  }
  chunks.push(SEP, 'FILE: ', rel, SEP, content);
}

const output = chunks.join('');
fs.writeFileSync(OUT_FILE, output, 'utf8');
console.log('Written to', path.relative(ROOT, OUT_FILE));
