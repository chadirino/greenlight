# Greenlight

A Khan Academy–style, mastery-based tool for learning state driving rules — grounded in official state handbooks rather than AI-generated-from-memory content.

Illinois is the first state supported; the app is architected so more states can be added without routing or component changes. Greenlight is fully local-first: no backend, no accounts, and no user data ever leaves the browser.

## How it works

- Each state's handbook is split into topic-aligned text chunks (see `content/states/<STATE>/chunks.json`).
- Practice questions are generated per chunk, grounded strictly in that chunk's text, and cite their source section — the model never draws on general knowledge.
- Progress (attempts, correct answers, mastery per topic) is tracked entirely in `localStorage`, namespaced by state.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- No database, no server — content ships as static JSON; progress lives client-side

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project status

- [x] Illinois content pipeline: handbook parsed into `manual-meta.json`, `topics.json`, `chunks.json`
- [x] `questions.json` — 355 practice questions generated across all 102 chunks
- [ ] Study UI / routing / mastery tracking

## Contributing

PRs welcome. `main` is protected — all changes, including from maintainers, go through a pull request.

1. Fork or branch: `git checkout -b your-feature-name`
2. Make your changes; `npm run lint` and `npm run build` should pass (CI runs both on every PR)
3. Open a PR against `main` with a short description of what changed and why

No dev/release branch split — `main` is the trunk, kept deployable, and feature branches are short-lived.
