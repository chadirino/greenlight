"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_STATE } from "@/lib/constants";
import { getSelectedState, setSelectedState } from "@/lib/statePreference";
import HomeSummary, { type StateSummary } from "@/app/components/HomeSummary";
import DataControls from "@/app/components/DataControls";

interface HomeScopeProps {
  states: StateSummary[];
  poolQuestionIds: Record<string, Record<string, string[]>>;
}

// No external event ever changes this preference mid-session (no picker UI
// yet), so subscribe is a no-op — useSyncExternalStore is used purely for
// its snapshot/serverSnapshot split, the same hydration-safe pattern
// useProgressSnapshot uses for localStorage-backed data.
function subscribe() {
  return () => {};
}

function getServerSnapshot(): string {
  return DEFAULT_STATE;
}

function getSnapshot(): string {
  return getSelectedState() ?? DEFAULT_STATE;
}

export default function HomeScope({ states, poolQuestionIds }: HomeScopeProps) {
  const selectedState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // First visit: persist the fallback so it sticks as the real preference
  // rather than being re-derived every load. Does not call setState, so it
  // can't cascade — getSnapshot already reflects this write on next read.
  useEffect(() => {
    if (getSelectedState() === null) setSelectedState(DEFAULT_STATE);
  }, []);

  const scopedStates = states.filter((s) => s.code === selectedState);

  return (
    <>
      <HomeSummary states={scopedStates} />
      <DataControls poolQuestionIds={poolQuestionIds} />
    </>
  );
}
