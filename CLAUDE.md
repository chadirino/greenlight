@AGENTS.md

# Greenlight — Project Brief

A Khan Academy–style, mastery-based tool for learning state driving rules, grounded in official state handbooks (not AI-generated-from-memory content). Illinois-only for now, architected to support additional states later. Fully local-first: no backend, no user accounts, all progress stored client-side. Open source, hosted on GitHub, showcase project.

## Stack
- Next.js (App Router, TypeScript, Tailwind) — static export target (`output: 'export'`) for GitHub Pages hosting
- No database, no server. Content is pre-generated static JSON shipped with the app.
- Progress data lives in the browser (localStorage), never touches a server.

## Content pipeline (already done for IL)
Source: Illinois Rules of the Road, published by the Illinois Secretary of State (Form DSD A 112, 2026 edition). Official but NOT public domain (state publication, not federal) — so the app must not reproduce the handbook text as static site copy. It's used only as a **grounding source** for AI-generated practice questions/explanations, each citing its source section. Link to the official PDF (ilsos.gov) rather than hosting/republishing it.

Pipeline used:
1. PDF → `pdftotext -layout` → raw text
2. Parsed table of contents → chapter/subtopic structure
3. Split body text into 99 subtopic-aligned chunks (regex-matched against TOC headers, whitespace/pagebreak-tolerant)
4. Output three files per state (see schema below)

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

### `questions.json` shape (planned, not yet built)
```json
{
  "id": "il-signs-014",
  "state": "IL",
  "topic": "road-signs",
  "subtopic": "warning-signs",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "answer": "...",
  "explanation": "...",
  "source": { "section": "Chapter 3, p. 22", "chunkId": "il-ch03-01" }
}
```

## Routing plan
State-aware from day one even with only one state: `/study/IL/[topicId]`, not hardcoded `/study/signs`. This avoids a URL/routing refactor later when a second state is added.

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

## Import/export (multi-device use, no backend)
Since there's no server, cross-device sync is opt-in and user-owned:
- Default: localStorage only, single device, zero setup — export/import via a JSON file download/upload button
- Optional upgrade path (not yet built): OAuth into the *user's own* Dropbox or Google Drive app-folder, so their progress file syncs across devices without Greenlight ever hosting or seeing their data. Conflict resolution should merge by taking the max of attempts/correct per topic, not last-write-wins, so progress never gets clobbered.
- File System Access API was considered and rejected as the primary path — no iOS Safari support, and multi-device (iPhone + MacBook) was a stated requirement.

## Explicit non-goals / scope boundaries
- Not attempting AI-verified mastery of physical driving skills (parking, lane changes) — those aren't in a source text to ground against. If added later, it'd be a self-reported practice log (see FourFive/RoadReady as reference examples), separate from the AI-grounded written-knowledge side.
- Not reproducing the handbook's road-sign graphics (state copyright uncertain) — use the federal MUTCD for sign imagery instead, since that's a public-domain federal document.
- Not attempting real DMV test questions — those aren't published by the state; `questions.json` entries are original questions grounded in the handbook text, not replicas of the actual exam.

## Repo state as of this brief
- Git initialized, pushed to GitHub as `greenlight`
- Next.js scaffolded (TypeScript, Tailwind, App Router) via `create-next-app` recommended defaults
- `content/states/IL/{manual-meta,topics,chunks}.json` present and committed
- `questions.json` not yet generated — this is the next task
- No UI/routing/components built yet