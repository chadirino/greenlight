"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

interface QuizQuestionProps {
  question?: Question;
  chapterLabel?: string;
  questionNumber?: number;
  totalQuestions?: number;
  onAnswer?: (isCorrect: boolean) => void;
  onNext?: () => void;
}

const demoQuestion: Question = {
  id: "il-ch04-01-demo",
  state: "IL",
  topicId: "ch04-traffic-laws",
  subtopicId: "il-ch04-01",
  chapter: 4,
  question: "When you see a steady yellow traffic signal, you should:",
  options: [
    "Speed up to clear the intersection before it turns red",
    "Stop if you can do so safely",
    "Proceed through at the same speed",
    "Sound your horn and continue",
  ],
  answerIndex: 1,
  explanation:
    "A steady yellow light means the signal is about to turn red \u2014 stop if you can do so safely.",
  source: { chunkId: "il-ch04-01", chapterTitle: "Traffic Laws" },
};

export default function QuizQuestion({
  question = demoQuestion,
  chapterLabel = "Chapter 4 \u00b7 Traffic laws",
  questionNumber = 3,
  totalQuestions = 8,
  onAnswer = () => {},
  onNext = () => {},
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    if (selected !== null) return;
    setSelected(index);
    onAnswer(index === question.answerIndex);
  }

  const isCorrect = selected !== null && selected === question.answerIndex;

  return (
    <div className="font-sans border-2 border-ink bg-bg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-2">
          {chapterLabel}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-text-2">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      <div className="flex gap-1 mb-6">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-[2px] ${i < questionNumber ? "bg-ink" : "bg-[var(--color-line)]"}`}
          />
        ))}
      </div>

      <p className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink mb-5">
        {question.question}
      </p>

      <div className="flex flex-col gap-2">
        {question.options.map((optionText, i) => {
          const isPicked = selected === i;
          const showCorrect = selected !== null && i === question.answerIndex;
          const showIncorrect = isPicked && i !== question.answerIndex;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`text-left border-2 px-4 py-3 text-[14px] font-medium transition-colors duration-150 ${
                showCorrect
                  ? "border-green bg-green-light text-green"
                  : showIncorrect
                  ? "border-orange bg-orange-light text-orange-text"
                  : "border-ink bg-bg text-ink hover:bg-purple-light hover:border-purple hover:text-purple-dark"
              }`}
            >
              {optionText}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-4 border-2 border-ink p-4">
          <p className="text-[13px] leading-relaxed text-text-3">
            {isCorrect ? "Correct. " : "Not quite. "}
            {question.explanation}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-text-2">
            Source: {question.source.chapterTitle}
          </p>
        </div>
      )}

      {selected !== null && (
        <button
          type="button"
          onClick={onNext}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 border-2 border-ink bg-ink px-5 py-3 text-[14px] font-semibold tracking-[0.01em] text-bg transition-colors duration-150 hover:border-orange hover:bg-orange active:scale-[0.97]"
        >
          Next question &rarr;
        </button>
      )}
    </div>
  );
}