import type { Question } from "@/lib/types";

export const STORAGE_KEY = "greenlight:progress";

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
