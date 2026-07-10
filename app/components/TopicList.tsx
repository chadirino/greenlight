"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Topic } from "@/lib/types";
import { getTopicProgress, STORAGE_KEY } from "@/lib/progress";

interface TopicListProps {
  topics: Topic[];
  state: string;
}

type Status = "not-started" | "in-progress" | "mastered";

const STATUS_LABEL: Record<Status, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  mastered: "Mastered",
};

const STATUS_CLASSES: Record<Status, string> = {
  "not-started": "border-[var(--color-ddd)] bg-bg text-text-2",
  "in-progress": "border-orange bg-orange-light text-orange-text",
  mastered: "border-green bg-green-light text-green",
};

function noopSubscribe() {
  return () => {};
}

function statusFor(state: string, topicId: string): Status {
  const progress = getTopicProgress(state, topicId);
  if (progress.mastered) return "mastered";
  if (progress.attempts > 0) return "in-progress";
  return "not-started";
}

// The status map depends on localStorage, which the server can't see. The
// server snapshot renders every topic as "not started" (a neutral, truthful
// default); useSyncExternalStore re-syncs to the real client snapshot right
// after hydration, without a synchronous setState-in-effect.
//
// useSyncExternalStore requires getSnapshot/getServerSnapshot to return the
// exact same reference when nothing's changed, or React treats every render
// as a fresh emission and logs "should be cached to avoid an infinite loop".
// Both snapshots are cached here: getSnapshot only rebuilds when the raw
// localStorage string actually differs from last time, and getServerSnapshot
// caches its (always-"not-started") result since it never depends on storage.
function useTopicStatuses(state: string, topics: Topic[]): Record<string, Status> {
  const cacheRef = useRef<{ raw: string | null; result: Record<string, Status> } | null>(null);
  const serverCacheRef = useRef<Record<string, Status> | null>(null);

  const getSnapshot = useCallback(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (cacheRef.current && cacheRef.current.raw === raw) {
      return cacheRef.current.result;
    }
    const result: Record<string, Status> = {};
    for (const topic of topics) result[topic.id] = statusFor(state, topic.id);
    cacheRef.current = { raw, result };
    return result;
  }, [state, topics]);

  const getServerSnapshot = useCallback(() => {
    if (!serverCacheRef.current) {
      const result: Record<string, Status> = {};
      for (const topic of topics) result[topic.id] = "not-started";
      serverCacheRef.current = result;
    }
    return serverCacheRef.current;
  }, [topics]);

  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}

export default function TopicList({ topics, state }: TopicListProps) {
  const statuses = useTopicStatuses(state, topics);

  return (
    <ul className="flex flex-col divide-y divide-[var(--color-line)] border-2 border-ink">
      {topics.map((topic) => {
        const status = statuses[topic.id];
        return (
          <li key={topic.id}>
            <Link
              href={`/study/${state}/${topic.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-purple-light"
            >
              <span className="text-[15px] font-medium text-ink">
                <span className="mr-2 font-mono text-[12px] text-text-2">Ch. {topic.chapter}</span>
                {topic.label}
              </span>
              <span
                className={`shrink-0 rounded border-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.10em] ${STATUS_CLASSES[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
