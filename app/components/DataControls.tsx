"use client";

import { useRef, useState } from "react";
import { exportProgress, importProgress } from "@/lib/progress";

interface DataControlsProps {
  poolQuestionIds: Record<string, Record<string, string[]>>;
}

type Status = { type: "success" | "error"; message: string };

const BUTTON_CLASSES =
  "inline-flex items-center justify-center border-2 border-ink bg-bg px-5 py-3 text-[14px] font-semibold tracking-[0.01em] text-ink transition-colors duration-150 hover:border-purple hover:bg-purple-light hover:text-purple-dark";

export default function DataControls({ poolQuestionIds }: DataControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);

  function handleExport() {
    const json = exportProgress();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenlight-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = importProgress(text, poolQuestionIds);
      setStatus(
        result.ok
          ? {
              type: "success",
              message:
                result.topicsImported && result.topicsImported > 0
                  ? "Progress imported."
                  : "No usable progress found in that file.",
            }
          : { type: "error", message: result.error ?? "Import failed." },
      );
    };
    reader.onerror = () => setStatus({ type: "error", message: "Couldn't read that file." });
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t border-[var(--color-line)] pt-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={handleExport} className={BUTTON_CLASSES}>
          Export Progress
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON_CLASSES}>
          Import Progress
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <p className="font-mono text-[11px] text-text-3">
        Import will merge with existing progress — nothing is overwritten.
      </p>
      {status && (
        <p className={`text-[13px] ${status.type === "success" ? "text-green" : "text-orange-text"}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
