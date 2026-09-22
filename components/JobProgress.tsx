"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getJob, type JobStatus, type JobStatusResult } from "@/lib/api";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { KitProgressPanel } from "@/components/KitProgressPanel";

const POLL_MS = 2000;
const ACTIVE: JobStatus[] = ["queued", "crawling", "generating"];

interface LoadError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Polls GET /jobs/:id and renders the waiting screen.
 *
 * The backend reports the pipeline's real stage (progress.step + message); this
 * component only owns the polling and the timers, and hands both to
 * KitProgressPanel, which decides how to phrase things.
 */
export function JobProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobStatusResult | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [activityTick, setActivityTick] = useState(0);
  const [tipTick, setTipTick] = useState(0);

  const isActive = job ? ACTIVE.includes(job.status) : true;

  // Elapsed timer + rotating fallback copy. These run only while the job is
  // active so a finished/failed screen doesn't keep animating.
  useEffect(() => {
    if (!isActive) return;
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    const activity = setInterval(() => setActivityTick((t) => t + 1), 2500);
    const tips = setInterval(() => setTipTick((t) => t + 1), 7000);
    return () => {
      clearInterval(clock);
      clearInterval(activity);
      clearInterval(tips);
    };
  }, [isActive]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await getJob(jobId);
        if (cancelled) return;
        setJob(next);
        setError(null);
        setLoading(false);

        if (next.status === "done") {
          // Hand off to the kit page; stop polling.
          router.push(`/kits/${encodeURIComponent(next.kitId)}`);
          return;
        }

        if (next.status === "failed") {
          // Terminal failure state — stop polling.
          return;
        }

        if (ACTIVE.includes(next.status)) {
          // Continue polling every ~2s while queued, crawling, or generating
          timer = setTimeout(tick, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        const e =
          err instanceof ApiError
            ? err
            : new ApiError(
                err instanceof Error ? err.message : "Something went wrong.",
                0,
                "network_error",
              );
        setError({ message: e.message, status: e.status, code: e.code });
        // Stop polling on error; user can retry.
      }
    };

    setLoading(true);
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router, reloadKey]);

  const retry = () => {
    setError(null);
    setJob(null);
    setReloadKey((k) => k + 1);
  };

  // ---- 401 / 404 / Network / Server Error states ----
  if (error) {
    let title = "Unable to load job";
    let description = error.message;

    if (error.status === 401) {
      title = "Authentication required";
      description = "You need to be signed in to view this preparation kit job.";
    } else if (error.status === 404) {
      title = "Job not found";
      description =
        "We couldn't find that job. It may not exist, has expired, or belongs to another user.";
    } else if (error.status === 0 || error.code === "network_error") {
      title = "Connection error";
      description =
        "Could not reach the server. Please check your network connection and try again.";
    } else if (error.status >= 500) {
      title = "Server error";
      description =
        "A server error occurred while retrieving job status. Please try again.";
    }

    return (
      <Card>
        <div className="flex flex-col gap-2">
          <h2 role="alert" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {error.status !== 401 && error.status !== 404 ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Try again
            </button>
          ) : null}
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
          <LinkButton href="/kits/new" variant="secondary">
            Start a new kit
          </LinkButton>
        </div>
      </Card>
    );
  }

  // ---- Initial loading state ----
  if (loading && !job) {
    return (
      <Card>
        <div
          role="status"
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <svg
            className="h-8 w-8 animate-spin text-slate-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <p className="mt-3 text-sm font-medium text-slate-600">
            Checking job status...
          </p>
          <span className="sr-only">Checking job status...</span>
        </div>
      </Card>
    );
  }

  // ---- Failed status state with retry/navigation actions ----
  if (job?.status === "failed") {
    return (
      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700"
            >
              ✕
            </span>
            <h2 role="alert" className="text-base font-semibold text-slate-900">
              Kit generation failed
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {job.error?.message ??
              "Something went wrong while building your kit. You can retry checking status or start a new kit."}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Retry status check
          </button>
          <LinkButton href="/kits/new">Start a new kit</LinkButton>
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        </div>
      </Card>
    );
  }

  // ---- In-progress / completed stepper display ----
  return (
    <Card>
      <KitProgressPanel
        job={job ?? { jobId, kitId: "", status: "queued" }}
        elapsedSeconds={elapsed}
        activityTick={activityTick}
        tipTick={tipTick}
      />
    </Card>
  );
}
