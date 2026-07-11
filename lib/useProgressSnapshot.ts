import { useCallback, useRef, useSyncExternalStore } from "react";
import { PROGRESS_CHANGED_EVENT, STORAGE_KEY } from "@/lib/progress";

// writeStore dispatches PROGRESS_CHANGED_EVENT on every persisted change, so
// this is what lets e.g. HomeSummary resync right after a same-tab
// DataControls import — localStorage's own "storage" event never fires in
// the document that made the write.
function subscribe(onStoreChange: () => void) {
  window.addEventListener(PROGRESS_CHANGED_EVENT, onStoreChange);
  return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, onStoreChange);
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

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
