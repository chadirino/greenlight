import type { Question } from "@/lib/types";

export const STORAGE_KEY = "greenlight:progress";

// Fired whenever writeStore persists a change, so same-tab components (e.g.
// HomeSummary after a DataControls import) can resync via
// useProgressSnapshot without a full page reload. localStorage's own
// "storage" event only fires in *other* tabs/documents, never the one that
// made the write.
export const PROGRESS_CHANGED_EVENT = "greenlight:progress-changed";

export interface QuestionRecord {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
}

export interface TopicProgress {
  attempts: number;
  correct: number;
  mastered: boolean;
  questions: {
    [questionId: string]: QuestionRecord;
  };
}

export type ProgressStore = {
  [state: string]: {
    [topicId: string]: TopicProgress;
  };
};

const EMPTY_TOPIC_PROGRESS: TopicProgress = {
  attempts: 0,
  correct: 0,
  mastered: false,
  questions: {},
};

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT));
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Mastery requires full coverage of the topic's question pool (every question
// id has at least one attempt) plus 80% cumulative accuracy, replacing the
// old fixed attempt-count floor. This guarantees someone who answers
// everything right masters a topic the moment they've seen every question
// once — no wasted repeat sessions — while someone missing questions keeps
// getting sessions biased toward what they got wrong (see
// selectSessionQuestions) until both coverage and accuracy hold. Recomputed
// from scratch on every attempt, so accuracy dropping back below 80% still
// un-masters a topic.
function computeMastered(
  attempts: number,
  correct: number,
  questions: TopicProgress["questions"],
  poolQuestionIds: string[],
): boolean {
  if (attempts === 0) return false;
  const fullyCovered = poolQuestionIds.every((id) => (questions[id]?.attempts ?? 0) >= 1);
  return fullyCovered && correct / attempts >= 0.8;
}

export function getProgress(state: string): ProgressStore[string] {
  return readStore()[state] ?? {};
}

export function getTopicProgress(state: string, topicId: string): TopicProgress {
  const stored = getProgress(state)[topicId];
  if (!stored) return EMPTY_TOPIC_PROGRESS;
  // Migration: progress recorded before per-question tracking existed won't
  // have a `questions` map — default it to {} rather than crash.
  return { ...stored, questions: stored.questions ?? {} };
}

export function recordAttempt(
  state: string,
  topicId: string,
  questionId: string,
  correct: boolean,
  poolQuestionIds: string[],
): TopicProgress {
  const store = readStore();
  const stateProgress = store[state] ?? {};
  const existing = stateProgress[topicId] ?? EMPTY_TOPIC_PROGRESS;
  const existingQuestions = existing.questions ?? {};

  const attempts = existing.attempts + 1;
  const correctCount = existing.correct + (correct ? 1 : 0);

  const existingRecord = existingQuestions[questionId];
  const questionRecord: QuestionRecord = {
    attempts: (existingRecord?.attempts ?? 0) + 1,
    correct: (existingRecord?.correct ?? 0) + (correct ? 1 : 0),
    lastCorrect: correct,
  };
  const questions = { ...existingQuestions, [questionId]: questionRecord };

  const updated: TopicProgress = {
    attempts,
    correct: correctCount,
    mastered: computeMastered(attempts, correctCount, questions, poolQuestionIds),
    questions,
  };

  store[state] = { ...stateProgress, [topicId]: updated };
  writeStore(store);
  return updated;
}

export function isTopicMastered(state: string, topicId: string): boolean {
  return getTopicProgress(state, topicId).mastered;
}

export interface ProgressExport {
  schemaVersion: 1;
  exportedAt: string;
  data: ProgressStore;
}

export function exportProgress(): string {
  const envelope: ProgressExport = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: readStore(),
  };
  return JSON.stringify(envelope);
}

function sanitizeQuestions(value: unknown): TopicProgress["questions"] {
  if (!value || typeof value !== "object") return {};
  const result: TopicProgress["questions"] = {};
  for (const [id, record] of Object.entries(value as Record<string, unknown>)) {
    if (!record || typeof record !== "object") continue;
    const { attempts, correct, lastCorrect } = record as Record<string, unknown>;
    if (typeof attempts !== "number" || typeof correct !== "number") continue;
    result[id] = { attempts, correct, lastCorrect: lastCorrect === true };
  }
  return result;
}

function isRawTopicRecord(
  value: unknown,
): value is { attempts: number; correct: number; questions?: unknown } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.attempts === "number" && typeof record.correct === "number";
}

// Merges an imported export into the local store. Per topic, whichever side
// has more cumulative attempts wins wholesale (its full record, including
// the per-question map) — ties keep local — mirroring the "max of
// attempts/correct, not last-write-wins" policy already planned for the
// future OAuth sync path. `mastered` is never trusted from the file: it's
// recomputed against the app's current question pool, since an old export's
// notion of "fully covered" can go stale if the content changes.
//
// poolQuestionIds is keyed by state then topicId so the merge stays
// state-agnostic; a topic missing from it means "not part of this app's
// current content" and its imported record is skipped rather than trusted
// blindly (an unknown pool size would make a coverage check meaningless).
export function importProgress(
  json: string,
  poolQuestionIds: Record<string, Record<string, string[]>>,
): { ok: boolean; error?: string; topicsImported?: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "That file isn't a Greenlight progress export." };
  }

  const envelope = parsed as Record<string, unknown>;
  if (envelope.schemaVersion !== 1) {
    return { ok: false, error: "Unsupported export version." };
  }
  if (!envelope.data || typeof envelope.data !== "object") {
    return { ok: false, error: "That file isn't a Greenlight progress export." };
  }

  const importedData = envelope.data as Record<string, Record<string, unknown>>;
  const localStore = readStore();
  const mergedStore: ProgressStore = { ...localStore };
  let topicsImported = 0;

  for (const [state, topics] of Object.entries(importedData)) {
    if (!topics || typeof topics !== "object") continue;
    const statePool = poolQuestionIds[state];
    if (!statePool) continue;

    const localState = mergedStore[state] ?? {};
    let updatedState = localState;

    for (const [topicId, rawRecord] of Object.entries(topics)) {
      const pool = statePool[topicId];
      if (!pool || !isRawTopicRecord(rawRecord)) continue;

      const importedTopic: TopicProgress = {
        attempts: rawRecord.attempts,
        correct: rawRecord.correct,
        mastered: false,
        questions: sanitizeQuestions(rawRecord.questions),
      };
      const localTopic = localState[topicId] ?? EMPTY_TOPIC_PROGRESS;
      const winner = importedTopic.attempts > localTopic.attempts ? importedTopic : localTopic;

      updatedState = {
        ...updatedState,
        [topicId]: {
          ...winner,
          mastered: computeMastered(winner.attempts, winner.correct, winner.questions, pool),
        },
      };
      topicsImported++;
    }

    mergedStore[state] = updatedState;
  }

  writeStore(mergedStore);
  return { ok: true, topicsImported };
}

// Chunks a topic's pool into 8-15 question sessions regardless of chapter
// size, e.g. 38 questions -> 3 sessions instead of one 38-question dump.
export function getSessionSize(poolSize: number): number {
  const numSessions = Math.ceil(poolSize / 15);
  return Math.ceil(poolSize / numSessions);
}

// Phase 1 fills the session with never-attempted questions (coverage).
// Phase 2, only if phase 1 didn't fill the session, tops it up from already
// attempted questions ranked by ascending accuracy (worst-first), tiebroken
// by lastCorrect === false sorting first. Final order is shuffled so it
// doesn't read as two visible blocks.
export function selectSessionQuestions(
  state: string,
  topicId: string,
  allQuestions: Question[],
  sessionSize: number,
): Question[] {
  const { questions: records } = getTopicProgress(state, topicId);

  const unattempted: Question[] = [];
  const attempted: Question[] = [];
  for (const question of allQuestions) {
    if (records[question.id]) {
      attempted.push(question);
    } else {
      unattempted.push(question);
    }
  }

  let selected = shuffle(unattempted).slice(0, sessionSize);

  if (selected.length < sessionSize) {
    const remainingSlots = sessionSize - selected.length;
    const ranked = [...attempted].sort((a, b) => {
      const recordA = records[a.id];
      const recordB = records[b.id];
      const accuracyA = recordA.correct / recordA.attempts;
      const accuracyB = recordB.correct / recordB.attempts;
      if (accuracyA !== accuracyB) return accuracyA - accuracyB;
      if (recordA.lastCorrect !== recordB.lastCorrect) {
        return recordA.lastCorrect ? 1 : -1;
      }
      return 0;
    });
    selected = [...selected, ...ranked.slice(0, remainingSlots)];
  }

  return shuffle(selected);
}
