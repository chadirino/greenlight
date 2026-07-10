const STORAGE_KEY = "greenlight:progress";

export interface TopicProgress {
  attempts: number;
  correct: number;
  mastered: boolean;
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

// Mastery is recomputed from scratch on every attempt rather than a one-way
// flag: accuracy dropping back below 80% un-masters a topic, and it's only
// earned again once accuracy recovers. Mirrors Khan Academy's approach of
// letting skill levels move in both directions instead of locking in
// mastery off an early lucky streak. The attempt floor scales with the
// topic's pool size (capped at 8) so a handful of easy questions on a large
// chapter can't "prove" mastery on a thin, unrepresentative sample.
function computeMastered(attempts: number, correct: number, poolSize: number): boolean {
  const minAttempts = Math.min(poolSize, 8);
  return attempts >= minAttempts && correct / attempts >= 0.8;
}

export function getProgress(state: string): ProgressStore[string] {
  return readStore()[state] ?? {};
}

export function getTopicProgress(state: string, topicId: string): TopicProgress {
  return getProgress(state)[topicId] ?? EMPTY_TOPIC_PROGRESS;
}

export function recordAttempt(
  state: string,
  topicId: string,
  correct: boolean,
  poolSize: number,
): TopicProgress {
  const store = readStore();
  const stateProgress = store[state] ?? {};
  const existing = stateProgress[topicId] ?? EMPTY_TOPIC_PROGRESS;

  const attempts = existing.attempts + 1;
  const correctCount = existing.correct + (correct ? 1 : 0);
  const updated: TopicProgress = {
    attempts,
    correct: correctCount,
    mastered: computeMastered(attempts, correctCount, poolSize),
  };

  store[state] = { ...stateProgress, [topicId]: updated };
  writeStore(store);
  return updated;
}

export function isTopicMastered(state: string, topicId: string): boolean {
  return getTopicProgress(state, topicId).mastered;
}
