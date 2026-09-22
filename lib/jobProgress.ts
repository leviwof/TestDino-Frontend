import type { JobStatus, JobStatusResult } from "@/lib/api";

/**
 * Presentation logic for the kit-generation wait screen.
 *
 * Kept pure and framework-free so the copy shown during a long wait can be unit
 * tested without mounting React. The guiding rule: never invent progress. When
 * the backend reports a stage we show its exact message; everything else here is
 * either a labelled fallback or an honest statement of what happens next.
 */

export interface TimelineStep {
  key: JobStatus;
  label: string;
  /** One-line explanation of what this phase actually involves. */
  detail: string;
}

export const TIMELINE: TimelineStep[] = [
  {
    key: "queued",
    label: "Queued",
    detail: "Your request is in the queue and will start in a moment.",
  },
  {
    key: "crawling",
    label: "Researching the company",
    detail: "Reading the job description and the company's own pages.",
  },
  {
    key: "generating",
    label: "Writing your kit",
    detail: "Questions, answer outlines, flashcards, and your study schedule.",
  },
  {
    key: "done",
    label: "Ready",
    detail: "Everything is checked and validated.",
  },
];

export const ORDER: JobStatus[] = TIMELINE.map((s) => s.key);

export const STEP_LABEL: Record<JobStatus, string> = TIMELINE.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<JobStatus, string>,
);

/**
 * Phase-appropriate fallback lines, used only until the backend reports a real
 * stage message (or if a job predates progress reporting).
 */
export const ACTIVITY: Record<JobStatus, string[]> = {
  queued: ["Reserving a slot for your kit…", "Warming things up…"],
  crawling: [
    "Visiting the company website…",
    "Reading their About and Careers pages…",
    "Gathering context about the role…",
  ],
  generating: [
    "Analyzing the job description…",
    "Matching questions to key requirements…",
    "Drafting answer outlines and flashcards…",
    "Planning your day-by-day study schedule…",
  ],
  done: ["Wrapping up…"],
  failed: [],
};

/**
 * What the pipeline will do next, keyed by the stage it is currently reporting.
 * Shown as the expectation line so the user knows the wait has a shape.
 */
const NEXT_UP: Record<string, string> = {
  queued: "Next: reading the job description.",
  requirements: "Next: crawling the company site for context.",
  crawl: "Next: checking public interview discussions.",
  discussions: "Next: writing a grounded company brief.",
  brief: "Next: looking at what they're hiring for right now.",
  hiring: "Next: drafting questions and answer outlines.",
  questions: "Next: closing any requirement gaps it finds.",
  coverage: "Next: building your flashcards.",
  flashcards: "Next: laying out your day-by-day schedule.",
  schedule: "Next: a final consistency check.",
  validation: "Next: handing your kit over.",
  done: "Opening your kit…",
};

/** The expectation line for a stage, or null when the stage is unknown. */
export function nextUpFor(step?: string): string | null {
  if (!step) return null;
  return NEXT_UP[step] ?? null;
}

/**
 * The line under the progress bar. Prefers the backend's own message; falls
 * back to rotating phase copy while no real stage has been reported.
 */
export function resolveActivityLine(
  job: Pick<JobStatusResult, "status" | "progress"> | null,
  activityTick: number,
): string {
  const reported = job?.progress?.message?.trim();
  if (reported) return reported;
  const status = job?.status ?? "queued";
  const lines = ACTIVITY[status] ?? [];
  if (lines.length === 0) return STEP_LABEL[status] ?? "Working…";
  return lines[Math.abs(activityTick) % lines.length];
}

/**
 * Honest time expectation. Deliberately qualitative — no fake countdown — and it
 * changes tone (rather than silently stalling) once we run past our estimate.
 */
export function expectationLine(status: JobStatus, elapsedSeconds: number): string {
  if (status === "done") return "Done — opening your kit now.";
  if (status === "failed") return "Generation stopped. You can retry from here.";
  if (elapsedSeconds < 60) {
    return "Most kits are ready in about a minute. Keep this tab open — we'll open yours automatically.";
  }
  if (elapsedSeconds < 150) {
    return "Running a little past a minute — we're still working. Nothing needed on your end.";
  }
  return "This one is taking longer than usual. We're still on it — no need to refresh.";
}

export interface Warmup {
  prompt: string;
  /** Model answer as STAR-shaped beats, not a script to memorise. */
  outline: string[];
}

/**
 * Something genuinely useful to do while waiting: rehearse the kind of question
 * this kit will contain. Drafts stay on the user's device (local storage), so
 * the warm-up is low-stakes.
 */
export const WARMUPS: Warmup[] = [
  {
    prompt: "Tell me about a project you're proud of.",
    outline: [
      "Situation — the problem and why it mattered",
      "Task — what you specifically owned",
      "Action — the decisions you made and the trade-offs you weighed",
      "Result — one number that proves the impact",
    ],
  },
  {
    prompt: "Walk me through a bug that took you a long time to find.",
    outline: [
      "Symptom — what users saw, and how you found out",
      "Investigation — the hypotheses you ruled out and how",
      "Root cause — the actual defect, in one sentence",
      "Fix and guard — the change plus the test that prevents a repeat",
    ],
  },
  {
    prompt: "Describe a disagreement with a teammate and how you resolved it.",
    outline: [
      "Context — the decision being debated, without blame",
      "Their position — stated fairly enough that they'd recognise it",
      "How you moved forward — evidence, a prototype, or a small experiment",
      "Outcome — what shipped, and what you'd do differently",
    ],
  },
  {
    prompt: "Why this company, and why this role, right now?",
    outline: [
      "What they do — in your own words, from their own material",
      "The hook — a product, value, or problem that genuinely interests you",
      "Your fit — one past experience that maps onto the role's requirements",
      "What you want to learn next",
    ],
  },
  {
    prompt: "Tell me about a time you shipped something under a tight deadline.",
    outline: [
      "The constraint — date, scope, and what was non-negotiable",
      "The plan — how you cut scope rather than quality",
      "Execution — how you communicated risk as it changed",
      "Outcome — what shipped on time, and what you deferred deliberately",
    ],
  },
];

/** Stable warm-up pick for an index (wraps, tolerates negatives/big ticks). */
export function warmupAt(index: number): Warmup {
  const i = ((index % WARMUPS.length) + WARMUPS.length) % WARMUPS.length;
  return WARMUPS[i]!;
}

/** Interview tips, shown quietly beside the warm-up. */
export const TIPS: string[] = [
  "Use the STAR method — Situation, Task, Action, Result — to structure behavioral answers.",
  "Quantify your impact: “cut load time by 40%” lands harder than “improved performance.”",
  "Research the company's recent news; referencing it signals genuine interest.",
  "Prepare two or three thoughtful questions to ask your interviewer.",
  "Practice your answers out loud — it surfaces gaps silent reading hides.",
  "It's fine to pause and think before answering. A considered reply beats a rushed one.",
];

export function tipAt(index: number): string {
  const i = ((index % TIPS.length) + TIPS.length) % TIPS.length;
  return TIPS[i]!;
}

/** Format elapsed seconds as m:ss. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Key under which a warm-up draft is kept for a job (device-local only). */
export function draftStorageKey(jobId: string): string {
  return `testdino:job-draft:${jobId}`;
}
