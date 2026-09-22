"use client";

import { useEffect, useState } from "react";
import type { JobStatusResult } from "@/lib/api";
import {
  ORDER,
  TIMELINE,
  draftStorageKey,
  expectationLine,
  formatElapsed,
  nextUpFor,
  resolveActivityLine,
  tipAt,
  warmupAt,
} from "@/lib/jobProgress";

/**
 * The waiting screen for a running kit job.
 *
 * Three jobs, in priority order:
 *   1. Show what the backend says is happening right now (its own message).
 *   2. Set an honest expectation — what happens next, and how long this should
 *      take, changing tone if we run long rather than silently stalling.
 *   3. Give the user something genuinely useful to do (rehearse a warm-up
 *      question) so the wait feels productive instead of idle.
 *
 * Props in, no data fetching, so it renders identically on the server and in
 * tests. Timers live in the polling parent.
 */
export interface KitProgressPanelProps {
  job: JobStatusResult;
  elapsedSeconds: number;
  /** Drives the rotating fallback copy when no real stage message exists. */
  activityTick: number;
  /** Drives the rotating interview tip. */
  tipTick: number;
}

export function KitProgressPanel({
  job,
  elapsedSeconds,
  activityTick,
  tipTick,
}: KitProgressPanelProps) {
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");

  const storageKey = draftStorageKey(job.jobId);

  // Restore a draft written before a refresh. Device-local, never sent anywhere.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) setDraft(saved);
    } catch {
      // Private mode / storage disabled — the warm-up still works, unsaved.
    }
  }, [storageKey]);

  const currentIndex = Math.max(0, ORDER.indexOf(job.status));
  const status = job.status;
  const activityLine = resolveActivityLine(job, activityTick);
  const nextUp = nextUpFor(job.progress?.step);
  const expectation = expectationLine(status, elapsedSeconds);
  const warmup = warmupAt(warmupIndex);
  const tip = tipAt(tipTick);

  const saveDraft = (value: string) => {
    setDraft(value);
    try {
      window.sessionStorage.setItem(storageKey, value);
    } catch {
      // Ignore storage failures; the draft still lives in component state.
    }
  };

  return (
    <>
      <div aria-live="polite" className="sr-only">
        Current step: {TIMELINE[currentIndex]?.label}. {activityLine}
      </div>

      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Building your kit</h2>
          {/* Expectation line: honest, and it adapts if we run long. */}
          <p className="mt-0.5 text-xs text-slate-500">{expectation}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
          {formatElapsed(elapsedSeconds)}
        </span>
      </div>

      {/* Indeterminate progress bar — motion signals "alive" during long steps. */}
      <div
        className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Generating your kit"
      >
        <span className="animate-indeterminate rounded-full bg-blue-500" />
      </div>

      {/* What is happening right now. The backend's own sentence when we have it. */}
      <p className="flex items-start gap-2 text-sm font-medium text-slate-700" aria-hidden="true">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-blue-500" />
        <span key={activityLine} className="animate-fade-in">
          {activityLine}
        </span>
      </p>
      {nextUp ? (
        <p className="mt-1 pl-3.5 text-xs text-slate-500" aria-hidden="true">
          {nextUp}
        </p>
      ) : null}

      <ol className="mt-5 flex flex-col gap-4">
        {TIMELINE.map((step, i) => {
          const isComplete = i < currentIndex;
          const isActive = i === currentIndex && status !== "done";
          const isPending = i > currentIndex;

          return (
            <li key={step.key} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
                  (isComplete
                    ? "bg-slate-900 text-white"
                    : isActive
                      ? "border-2 border-slate-900 bg-white text-slate-900"
                      : "border border-slate-300 bg-white text-slate-400")
                }
              >
                {isComplete ? (
                  "✓"
                ) : isActive ? (
                  <svg
                    className="h-3.5 w-3.5 animate-spin text-slate-900"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex flex-col">
                <span
                  className={
                    "text-sm " +
                    (isPending
                      ? "text-slate-400"
                      : isActive
                        ? "font-semibold text-slate-900"
                        : "font-medium text-slate-800")
                  }
                >
                  {step.label}
                  {isActive ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">In progress…</span>
                  ) : null}
                </span>
                {/* The active phase explains itself; pending ones stay quiet. */}
                {!isPending && status !== "done" ? (
                  <span className="mt-0.5 text-xs text-slate-500">{step.detail}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Something useful to do: rehearse a question this kit will cover. */}
      <div className="mt-6 rounded-md border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Warm up while you wait
          </p>
          <button
            type="button"
            onClick={() => {
              setWarmupIndex((i) => i + 1);
              setRevealed(false);
            }}
            className="rounded text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
          >
            Another question
          </button>
        </div>

        <p className="mt-2 text-sm font-medium text-slate-800">{warmup.prompt}</p>

        <label htmlFor="warmup-draft" className="sr-only">
          Draft your answer
        </label>
        <textarea
          id="warmup-draft"
          value={draft}
          onChange={(e) => saveDraft(e.target.value)}
          rows={3}
          placeholder="Draft your answer — it stays on this device."
          className="mt-2 w-full resize-y rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-expanded={revealed}
            className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {revealed ? "Hide outline" : "Reveal a model outline"}
          </button>
          <span className="text-xs text-slate-500">
            Tip: {tip}
          </span>
        </div>

        {revealed ? (
          <ul className="mt-3 flex flex-col gap-1 border-t border-blue-100 pt-3 text-xs text-slate-600">
            {warmup.outline.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="text-blue-500">
                  •
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
