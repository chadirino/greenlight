"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Question, Topic } from "@/lib/types";
import { recordAttempt } from "@/lib/progress";
import QuizQuestion from "@/app/components/QuizQuestion";

interface QuizRunnerProps {
  state: string;
  topicId: string;
  topic: Topic;
  questions: Question[];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function noopSubscribe() {
  return () => {};
}

// Randomizing must happen once, after mount: the server-prerendered HTML and
// the client's first hydration pass have to agree on question order, so the
// server snapshot stays in original order and the shuffle only takes effect
// once useSyncExternalStore re-syncs on the client.
function useShuffledOrder(questions: Question[]): Question[] {
  const cacheRef = useRef<Question[] | null>(null);

  const getSnapshot = useCallback(() => {
    if (!cacheRef.current) cacheRef.current = shuffle(questions);
    return cacheRef.current;
  }, [questions]);

  const getServerSnapshot = useCallback(() => questions, [questions]);

  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}

export default function QuizRunner({ state, topicId, topic, questions }: QuizRunnerProps) {
  const order = useShuffledOrder(questions);
  const [index, setIndex] = useState(0);

  const poolSize = questions.length;
  const currentQuestion = order[index];
  const done = index >= order.length;

  function handleAnswer(isCorrect: boolean) {
    recordAttempt(state, topicId, isCorrect, poolSize);
  }

  function handleNext() {
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center">
        <p className="text-[18px] font-semibold text-ink">Nice work for this session.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-text-3">
          You&rsquo;ve been through every question in {topic.label} for now.
        </p>
        <Link
          href={`/study/${state}`}
          className="mt-6 inline-flex items-center justify-center border-2 border-ink bg-ink px-5 py-3 text-[14px] font-semibold tracking-[0.01em] text-bg transition-colors duration-150 hover:border-orange hover:bg-orange"
        >
          Back to topics
        </Link>
      </div>
    );
  }

  return (
    <QuizQuestion
      key={currentQuestion.id}
      question={currentQuestion}
      chapterLabel={`Chapter ${topic.chapter} · ${topic.label}`}
      questionNumber={index + 1}
      totalQuestions={order.length}
      onAnswer={handleAnswer}
      onNext={handleNext}
    />
  );
}
