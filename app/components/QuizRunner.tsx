"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Question, Topic } from "@/lib/types";
import {
  getSessionSize,
  getTopicProgress,
  recordAttempt,
  selectSessionQuestions,
  type TopicProgress,
} from "@/lib/progress";
import QuizQuestion from "@/app/components/QuizQuestion";
import TopicComplete from "@/app/components/TopicComplete";

interface QuizRunnerProps {
  state: string;
  topicId: string;
  topic: Topic;
  questions: Question[];
}

function noopSubscribe() {
  return () => {};
}

// A session targets 8-15 questions (see getSessionSize), sized off however
// many pool questions are still uncovered (never attempted) rather than the
// full pool. That's what makes a 38-question chapter split into 13/13/12
// instead of 13/13/13-with-a-repeat: the last coverage session is exactly as
// big as what's left. Once the whole pool is covered, sizing falls back to
// the full pool so repeat-practice rounds still land in the 8-15 range.
function buildSession(
  state: string,
  topicId: string,
  questions: Question[],
  poolQuestionIds: string[],
): Question[] {
  const progress = getTopicProgress(state, topicId);
  const uncoveredCount = poolQuestionIds.filter(
    (id) => (progress.questions[id]?.attempts ?? 0) === 0,
  ).length;
  const sessionSize = getSessionSize(uncoveredCount > 0 ? uncoveredCount : questions.length);
  return selectSessionQuestions(state, topicId, questions, sessionSize);
}

// Session selection depends on localStorage, which the server can't see. The
// server snapshot renders the pool in original order (a neutral, truthful
// default); useSyncExternalStore re-syncs to the real, coverage-based session
// once hydration completes. `version` lets a restart force a fresh session
// without needing a new `questions` reference.
function useSessionQueue(
  state: string,
  topicId: string,
  questions: Question[],
  poolQuestionIds: string[],
  version: number,
): Question[] {
  const cacheRef = useRef<{ version: number; queue: Question[] } | null>(null);

  const getSnapshot = useCallback(() => {
    if (!cacheRef.current || cacheRef.current.version !== version) {
      cacheRef.current = {
        version,
        queue: buildSession(state, topicId, questions, poolQuestionIds),
      };
    }
    return cacheRef.current.queue;
  }, [state, topicId, questions, poolQuestionIds, version]);

  const getServerSnapshot = useCallback(() => questions, [questions]);

  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}

export default function QuizRunner({ state, topicId, topic, questions }: QuizRunnerProps) {
  const [version, setVersion] = useState(0);
  const poolQuestionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const order = useSessionQueue(state, topicId, questions, poolQuestionIds, version);
  const [index, setIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [latestProgress, setLatestProgress] = useState<TopicProgress | null>(null);

  const currentQuestion = order[index];

  function handleAnswer(isCorrect: boolean) {
    setLatestProgress(
      recordAttempt(state, topicId, currentQuestion.id, isCorrect, poolQuestionIds),
    );
  }

  function handleNext() {
    if (index + 1 >= order.length) {
      setSessionComplete(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function handleRestart() {
    setVersion((v) => v + 1);
    setIndex(0);
    setSessionComplete(false);
  }

  if (sessionComplete && latestProgress) {
    return (
      <TopicComplete
        topicLabel={topic.label}
        state={state}
        topicId={topicId}
        progress={latestProgress}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <QuizQuestion
      key={`${version}-${currentQuestion.id}`}
      question={currentQuestion}
      chapterLabel={`Chapter ${topic.chapter} · ${topic.label}`}
      questionNumber={index + 1}
      totalQuestions={order.length}
      onAnswer={handleAnswer}
      onNext={handleNext}
    />
  );
}
