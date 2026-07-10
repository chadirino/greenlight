import Link from "next/link";
import type { TopicProgress } from "@/lib/progress";

interface TopicCompleteProps {
  topicLabel: string;
  state: string;
  topicId: string;
  progress: TopicProgress;
  onRestart: () => void;
}

export default function TopicComplete({
  topicLabel,
  state,
  progress,
  onRestart,
}: TopicCompleteProps) {
  const { mastered, attempts, correct } = progress;

  return (
    <div
      className={`max-w-md mx-auto text-center border-2 p-6 ${
        mastered ? "border-green bg-green-light" : "border-orange bg-orange-light"
      }`}
    >
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.10em] ${
          mastered ? "text-green" : "text-orange-text"
        }`}
      >
        {mastered ? "Mastered" : "Session complete"}
      </span>

      <p className="mt-2 text-[18px] font-semibold text-ink">
        {mastered
          ? `You’ve mastered ${topicLabel}.`
          : `Good pass through ${topicLabel} — not quite there yet.`}
      </p>

      <p className="mt-2 text-[14px] leading-relaxed text-text-3">
        {correct}/{attempts} correct overall.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/study/${state}`}
          className="inline-flex items-center justify-center border-2 border-ink bg-ink px-5 py-3 text-[14px] font-semibold tracking-[0.01em] text-bg transition-colors duration-150 hover:border-orange hover:bg-orange"
        >
          Back to topics
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center border-2 border-ink bg-bg px-5 py-3 text-[14px] font-semibold tracking-[0.01em] text-ink transition-colors duration-150 hover:bg-purple-light hover:border-purple hover:text-purple-dark"
        >
          Practice again
        </button>
      </div>
    </div>
  );
}
