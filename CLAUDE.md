# Roadmap Scribe — MVP

Transcript-to-roadmap/ticket generator. Paste a meeting transcript, get a structured product roadmap + Jira tickets via OpenRouter LLM.

## Run
```
npm install
cp .env.example .env   # fill in OPENROUTER_API_KEY
npm start              # → :3000
npm test               # smoke tests (no LLM calls)
```

## Architecture
```
server.js          — Express entry (exports app for testing)
routes/generate.js — POST /api/generate validation + dispatch
lib/llm.js         — OpenRouter client, prompt builder, JSON parser
public/index.html  — Dark-mode UI: textarea → tabbed output
tests/smoke.test.js— Validation + static-serving integration tests
```

## Conventions
- No DB — stateless transform, no migrations needed
- Entry file ≤ 300 lines
- Routes use express.Router()
- Inline comments explain WHY, not WHAT
- Tests pass before push; push to feature branch only (never main)