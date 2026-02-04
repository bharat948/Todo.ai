
## Quick start
1. `npm ci`
2. `npm run dev`
3. Open `http://localhost:3000/health` (should return `{ ok: true }`)
4. json-server serves `http://localhost:4000`

## POST /ingest
Send a JSON payload to create a classified input:

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{ "text": "I should finally read that book on Gandhara." }'
```

Example response (`201 Created`) when `OPENAI_API_KEY` is set (includes embedding and topic assignment):

```json
{
  "id": "uuid-v4",
  "text": "I should finally read that book on Gandhara.",
  "category": "idea",
  "created_at": "2026-02-04T08:30:00Z",
  "embedding": [0.024, -0.007, ...],
  "topicId": "topic-uuid"
}
```

Without `OPENAI_API_KEY`, `embedding` and `topicId` are `null`.

## Run tests
`npm test`

## GET /topics
- `GET /topics` — list all topics (semantic clusters of inputs). Each topic can have `title`, `summary`, `embedding`, `inputIds`, `stats`.
- `GET /topics/:id` — get one topic by id.
- When a **new** topic is created (no similar existing topic), the app uses one OpenAI call to generate a short `title` and `summary` from the first input text.

## Environment
- Copy `.env.example` to `.env` (or export variables in your shell).
- `OPENAI_API_KEY` is optional; if unset, the classifier uses a local rule-based fallback and embedding/topic assignment are skipped (`embedding` and `topicId` remain null).
- `OPENAI_MODEL` defaults to `gpt-4o-mini` when not provided.
- `OPENAI_EMBED_MODEL` defaults to `text-embedding-3-small` for input embeddings.
- `JSON_SERVER_URL` controls where `json-server` is expected (default `http://localhost:4000`).

## Notes
- json-server runs on port 4000 by default. Change with `JSON_SERVER_URL` env var.
- The data-access layer is `src/store/jsonStore.js`. Replace with Supabase client later.
