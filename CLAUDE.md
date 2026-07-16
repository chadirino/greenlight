@AGENTS.md

# Greenlight — Project Brief

A Khan Academy–style, mastery-based tool for learning state driving rules, grounded in official state handbooks (not AI-generated-from-memory content). Illinois-only for now, architected to support additional states later. Fully local-first: no backend, no user accounts, all progress stored client-side. Open source, hosted on GitHub, showcase project.

## Frequently violated — check these specifically

- No inline styles. Tailwind utility classes only, using tokens from `globals.css`. If a value isn't in the token set, ask before inventing one — don't reach for `style={}`.
- No duplicate font loading. Space Grotesk / Space Mono are loaded once via `next/font` in `app/layout.tsx` — never re-import a font elsewhere.
- Don't invent data shapes. `Question`, `TopicProgress`, and other shared types live in `lib/types.ts` — match them exactly. If a component needs a shape that doesn't exist yet, propose it rather than guessing one that "looks right."
- File extensions: `.ts` for logic-only files (no JSX), `.tsx` only when the file actually contains JSX.
- Reads of progress/localStorage state go through the shared `useProgressSnapshot` hook — don't write a fresh `useSyncExternalStore` call. An uncached `getServerSnapshot` causes infinite-loop warnings; this bug class was already fixed once.
- Routes are real Next.js routes under `app/study/[state]/[topicId]/`. Never simulate navigation with `useState` screen-switching — that pattern doesn't apply to this codebase.

## Stack
- Next.js (App Router, TypeScript, Tailwind) — static export target (`output: 'export'`) for GitHub Pages hosting
- No database, no server. Content is pre-generated static JSON shipped with the app.
- Progress data lives in the browser (localStorage), never touches a server.

## Content pipeline (already done for IL)
Source: Illinois Rules of the Road, published by the Illinois Secretary of State (Form DSD A 112, 2026 edition). Official but NOT public domain (state publication, not federal) — so the app must not reproduce the handbook text as static site copy. It's used only as a **grounding source** for AI-generated practice questions/explanations, each citing its source section. Link to the official PDF (ilsos.gov) rather than hosting/republishing it.

Pipeline used:
1. PDF → `pdftotext -layout` → raw text
2. Parsed table of contents → chapter/subtopic structure
3. Split body text into 102 subtopic-aligned chunks (regex-matched against TOC headers, whitespace/pagebreak-tolerant)
4. Output three files per state (see schema below)

Chunking bug fixed: the original 99-chunk split missed 3 chapter-13 TOC entries (Mandatory Insurance, Emissions Testing, License Plates and Parking Placards for Persons with Disabilities) whose headers didn't match the splitting regex, so their text — plus the book's whole-document Answers-to-Study-Questions and Index back matter — all got appended onto the last matched chunk (`il-ch13-07`), bloating it to ~62,000 characters. Re-extracted from the source PDF (`~/Documents/Learning/Driving/IL Rules of the Road - Part 1.pdf` + `Part 2.pdf`), split into 4 correctly-sized chunks (`il-ch13-07` through `il-ch13-10`), and the back matter (not real chapter content) was discarded entirely.

**Not yet done:** Step 2, generating the actual practice question bank from these chunks. This is the next task. Recommended approach: Sonnet 5 with extended thinking, one chunk at a time, question + explanation must be grounded only in that chunk's text, output must cite the source chunk id. Do not let the model draw on general knowledge — ground strictly in the retrieved chunk.

## Directory structure (state-agnostic by design)
```
/content
  /states
    /IL
      manual-meta.json   — source citation, edition, chapter/chunk counts
      topics.json         — chapter → subtopic tree (drives UI navigation + mastery gating)
      chunks.json          — 99 handbook text chunks, tagged by chapter/subtopic/state
      questions.json        — NOT YET BUILT — practice questions generated from chunks.json
```
Adding a new state later = new folder under `/content/states/`, no app logic changes needed. Every record (chunk, question, topic) already carries a `state` field even though only "IL" exists today.

### `topics.json` shape
```json
{
  "state": "IL",
  "source": { "name": "...", "publisher": "...", "formNumber": "DSD A 112", "edition": "2026", "url": "..." },
  "topics": [
    {
      "id": "ch04-traffic-laws",
      "chapter": 4,
      "label": "Traffic Laws",
      "subtopics": [ { "id": "il-ch04-01", "label": "Proper Action When Stopped by Law Enforcement", "chunkId": "il-ch04-01" }, ... ]
    }
  ]
}
```

### `chunks.json` shape (per entry)
```json
{
  "id": "il-ch04-01",
  "state": "IL",
  "topicId": "ch04-traffic-laws",
  "chapter": 4,
  "chapterTitle": "Traffic Laws",
  "subtopic": "Proper Action When Stopped by Law Enforcement",
  "text": "full handbook text for this subsection..."
}
```

### `questions.json` shape (built)
355 questions across all 102 IL chunks, generated one chunk at a time and grounded strictly in that chunk's `text` (no outside knowledge). `topicId`/`subtopicId`/`chapter` mirror the real ids from `topics.json`/`chunks.json` rather than slugified placeholders, and the answer is stored as an index (not text) to avoid text-matching bugs in the UI:
```json
{
  "id": "il-ch04-01-q1",
  "state": "IL",
  "topicId": "ch04-traffic-laws",
  "subtopicId": "il-ch04-01",
  "chapter": 4,
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "answerIndex": 0,
  "explanation": "...",
  "source": { "chunkId": "il-ch04-01", "chapterTitle": "Traffic Laws" }
}
```

## Routing plan
State-aware from day one even with only one state: `/study/IL/[topicId]`, not hardcoded `/study/signs`. This avoids a URL/routing refactor later when a second state is added. This is a real multi-route app, not a single-page state machine — see "Frequently violated" above.

## Progress tracking (localStorage, client-only)
Namespaced by state so multi-state study doesn't collide:
```json
{
  "IL": {
    "ch04-traffic-laws": { "attempts": 12, "correct": 10, "mastered": true },
    "ch09-roadway-signs": { "attempts": 5, "correct": 3, "mastered": false }
  }
}
```
Mastery gating (e.g., "can't move to next topic until X% correct") is pure client-side app logic — no AI involved.

Mastery is defined as: every question in a topic attempted at least once AND cumulative accuracy ≥ 80%. `TopicProgress` includes a `questions` map (`{ [questionId]: { attempts, correct, lastCorrect } }`) so per-question accuracy can drive repeat-phase selection (ascending accuracy, `lastCorrect === false` as tiebreak). Session sizing is dynamic: `numSessions = Math.ceil(poolSize / 15)`, `sessionSize = Math.ceil(poolSize / numSessions)`, keeping sessions in the 8–15 range.

State reads for progress go through the shared `useProgressSnapshot` hook, not ad hoc `useSyncExternalStore` calls — see "Frequently violated" above.

## Import/export (multi-device use, no backend)
Since there's no server, cross-device sync is opt-in and user-owned:
- Default: localStorage only, single device, zero setup — export/import via a JSON file download/upload button
- Optional upgrade path (not yet built): OAuth into the *user's own* Dropbox or Google Drive app-folder, so their progress file syncs across devices without Greenlight ever hosting or seeing their data. Conflict resolution should merge by taking the max of attempts/correct per topic, not last-write-wins, so progress never gets clobbered.
- File System Access API was considered and rejected as the primary path — no iOS Safari support, and multi-device (iPhone + MacBook) was a stated requirement.

Built and shipped as `app/components/DataControls.tsx` + `lib/progress.ts`: thin JSON envelope (`schemaVersion`, `exportedAt`, `data: ProgressStore`), merge-not-overwrite semantics (higher `attempts` count wins per topic, `mastered` recomputed post-merge), graceful handling of malformed files.

## Explicit non-goals / scope boundaries
- Not attempting AI-verified mastery of physical driving skills (parking, lane changes) — those aren't in a source text to ground against. If added later, it'd be a self-reported practice log (see FourFive/RoadReady as reference examples), separate from the AI-grounded written-knowledge side.
- Not reproducing the handbook's road-sign graphics (state copyright uncertain) — use the federal MUTCD for sign imagery instead, since that's a public-domain federal document.
- Not attempting real DMV test questions — those aren't published by the state; `questions.json` entries are original questions grounded in the handbook text, not replicas of the actual exam.

## Repo state as of this brief
- Git initialized, pushed to GitHub as `greenlight`. `main` is protected (PRs required, CI must pass, no approval required). CI (`.github/workflows/ci.yml`) runs `npm run lint` and `npm run build` on every PR and push to `main`.
- Content pipeline complete and committed: `content/states/IL/{manual-meta,topics,chunks,questions}.json` — 13 chapters, 102 chunks, 355 questions grounded one-to-one against chunk text.
- App shell: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`. `app/components/` and `lib/` now exist too.
- Design tokens landed: `app/globals.css` defines the real token set (colors, type scale, spacing) via a Tailwind v4 `@theme` block, ported from chadweaver.io's design system; `app/layout.tsx` loads Space Grotesk / Space Mono via `next/font`.
- Built and browser-verified: `lib/progress.ts` (localStorage progress module), `lib/content.ts` (static content accessors), `app/study/[state]/[topicId]` route with `QuizRunner`, `app/study/[state]` Topic List screen with status pills, real Home screen (replacing the placeholder), shared `useProgressSnapshot` hook, `QuizQuestion.tsx` aligned to the actual `questions.json` shape, Import/Export (`DataControls` component + merge logic in `lib/progress.ts`).
- Still not built: multi-state support beyond the existing architecture (only IL has content), optional cross-device sync (OAuth into Dropbox/Google Drive).

## Working agreements

### Ask before doing
- Don't add new dependencies (npm packages, CDN scripts) without asking first.
- Don't restructure existing folders (`/content`, `/app`, `/lib`) without asking first.
- Don't touch `content/states/**/*.json` by hand in the course of an unrelated task — those are generated data, not app code.
- Don't add new colors, fonts, or spacing values outside the existing token set without asking first.
- Don't introduce a new styling pattern (CSS modules, inline styles, styled-components) — Tailwind utility classes only.
- If a task seems underspecified, ask what specifically needs to change rather than guessing.
- Never run `git reset --hard` without running `git status` first to check for uncommitted changes on other files.

### Verification
- Before reporting a UI task done, take a screenshot and compare it against the patterns in CLAUDE.md — not just lint/build/functional verification.
- `npm run lint` and `npm run build` must pass before opening a PR — CI runs both on every PR and push to `main`.

## Design tokens
Visual tokens (colors, type scale, spacing, radius, borders) live in `app/globals.css` under the Tailwind v4 `@theme` block. They were ported from chadweaver.io's `PERSONAL_DESIGN_SYSTEM.md` and `docs/style-guide.md` — treat those as the source of truth. Don't invent new colors, fonts, or spacing values outside the existing token set without asking first. If the chadweaver.io system changes, update tokens here to match rather than letting them drift independently.

### Grouped / sequential content
When displaying a short list of related items as a single unit (steps, stages, grouped
stats), use ONE bordered container split into cells via CSS grid with shared internal
dividers — never separate bordered boxes with gaps between them.
- Desktop: `grid-cols-N divide-x-2 divide-y-0`
- Mobile: `grid-cols-1 divide-y-2`
- Cell padding: px-6 py-6 — don't exceed this for short content (a label + one line).
- Text left-aligned within cells, not centered.

## Commands
```bash
npm run dev     # local dev server
npm run lint    # must pass — CI runs this on every PR
npm run build   # must pass — CI runs this on every PR, also validates the static export
```

## Code conventions
- Components live under `app/components/`, one component per file, PascalCase filenames.
- Components are default exports; the `Props` type is defined locally in the same file, not exported separately.
- Routes stay state-aware: `app/study/[state]/[topicId]/`, never hardcode `IL`.
- Shared types go in one place (`lib/types.ts`), not scattered inline interfaces.
- Tailwind utility classes only — no CSS-in-JS, no styled-components. Use the token-based classes from `globals.css`.
- Default to server components; add `"use client"` only where interactivity is required (quiz state, progress tracking, mastery gating).
- Progress/localStorage reads go through `useProgressSnapshot`, not a fresh `useSyncExternalStore` call.