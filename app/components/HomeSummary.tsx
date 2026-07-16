"use client";

import { useCallback } from "react";
import Link from "next/link";
import type { Topic } from "@/lib/types";
import { getTopicProgress } from "@/lib/progress";
import { useProgressSnapshot } from "@/lib/useProgressSnapshot";

export interface StateSummary {
  code: string;
  label: string;
  topics: Topic[];
}

interface HomeSummaryProps {
  states: StateSummary[];
}

interface StateStatus {
  masteredCount: number;
  totalCount: number;
  anyProgress: boolean;
}

function statusFor(state: string, topics: Topic[]): StateStatus {
  let masteredCount = 0;
  let anyProgress = false;
  for (const topic of topics) {
    const progress = getTopicProgress(state, topic.id);
    if (progress.mastered) masteredCount++;
    if (progress.attempts > 0) anyProgress = true;
  }
  return { masteredCount, totalCount: topics.length, anyProgress };
}

// Same localStorage-snapshot pattern as TopicList: server render is a
// neutral "no progress yet" default, and useProgressSnapshot re-syncs to the
// real client snapshot right after hydration.
function useStateStatuses(states: StateSummary[]): Record<string, StateStatus> {
  const buildSnapshot = useCallback(() => {
    const result: Record<string, StateStatus> = {};
    for (const s of states) result[s.code] = statusFor(s.code, s.topics);
    return result;
  }, [states]);

  const buildServerSnapshot = useCallback(() => {
    const result: Record<string, StateStatus> = {};
    for (const s of states) {
      result[s.code] = { masteredCount: 0, totalCount: s.topics.length, anyProgress: false };
    }
    return result;
  }, [states]);

  return useProgressSnapshot(buildSnapshot, buildServerSnapshot);
}

export default function HomeSummary({ states }: HomeSummaryProps) {
  const statuses = useStateStatuses(states);

  return (
    <div className="flex flex-col items-center gap-6">
      {states.map((s) => {
        const status = statuses[s.code];
        return (
          <div key={s.code} className="flex flex-col items-center gap-2">
            <Link
              href={`/study/${s.code}`}
              className="inline-flex items-center justify-center border-2 border-ink bg-ink px-10 py-3 text-[14px] font-semibold tracking-[0.01em] text-bg transition-colors duration-150 hover:border-orange hover:bg-orange"
            >
              {status.anyProgress ? "Continue Studying" : "Start Studying"}
            </Link>
            {status.anyProgress && (
              <p className="font-mono text-[12px] text-text-3">
                {status.masteredCount} of {status.totalCount} chapters mastered
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
