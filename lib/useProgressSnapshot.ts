import { useCallback, useRef, useSyncExternalStore } from "react";
import { STORAGE_KEY } from "@/lib/progress";

function noopSubscribe() {
  return () => {};
}

// localStorage-backed snapshot hook shared by any component that needs to
// re-render once progress data is available after hydration (TopicList,
// HomeSummary). useSyncExternalStore requires getSnapshot/getServerSnapshot
// to return the exact same reference when nothing's changed, or React treats
// every render as a fresh emission and logs "should be cached to avoid an
// infinite loop" (this bit TopicList once, with an ad hoc subscription).
// buildSnapshot only re-runs when the raw localStorage string actually
// differs from last time; buildServerSnapshot's result is cached forever
// since the server render never has access to storage.
export function useProgressSnapshot<T>(buildSnapshot: () => T, buildServerSnapshot: () => T): T {
  const cacheRef = useRef<{ raw: string | null; result: T } | null>(null);
  const serverCacheRef = useRef<{ result: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (cacheRef.current && cacheRef.current.raw === raw) {
      return cacheRef.current.result;
    }
    const result = buildSnapshot();
    cacheRef.current = { raw, result };
    return result;
  }, [buildSnapshot]);

  const getServerSnapshot = useCallback(() => {
    if (!serverCacheRef.current) {
      serverCacheRef.current = { result: buildServerSnapshot() };
    }
    return serverCacheRef.current.result;
  }, [buildServerSnapshot]);

  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
