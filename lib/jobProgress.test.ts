import { describe, it, expect } from "vitest";
import {
  TIMELINE,
  ORDER,
  WARMUPS,
  draftStorageKey,
  expectationLine,
  formatElapsed,
  nextUpFor,
  resolveActivityLine,
  tipAt,
  warmupAt,
} from "@/lib/jobProgress";
import type { JobStatusResult } from "@/lib/api";

function job(over: Partial<JobStatusResult> = {}): JobStatusResult {
  return { jobId: "job-1", kitId: "kit-1", status: "crawling", ...over };
}

describe("resolveActivityLine", () => {
  it("prefers the backend's own stage message over any fallback copy", () => {
    const line = resolveActivityLine(
      job({
        status: "generating",
        progress: { step: "questions", message: "Drafting interview questions…" },
      }),
      7,
    );
    expect(line).toBe("Drafting interview questions…");
    // Rotating ticks must never overwrite a real message.
    expect(
      resolveActivityLine(
        job({ progress: { step: "questions", message: "Drafting interview questions…" } }),
        1,
      ),
    ).toBe("Drafting interview questions…");
  });

  it("ignores a blank message and falls back to phase copy", () => {
    const line = resolveActivityLine(
      job({ status: "queued", progress: { step: "queued", message: "   " } }),
      0,
    );
    expect(line.length).toBeGreaterThan(0);
    expect(line).not.toBe("   ");
  });

  it("rotates fallback lines by tick without going out of bounds", () => {
    const a = resolveActivityLine(job({ status: "generating" }), 0);
    const b = resolveActivityLine(job({ status: "generating" }), 1);
    expect(a).not.toBe(b);
    // Large ticks still land on a real line.
    expect(resolveActivityLine(job({ status: "crawling" }), 9999).length).toBeGreaterThan(0);
  });

  it("never returns an empty line for a job that has not loaded yet", () => {
    expect(resolveActivityLine(null, 0).length).toBeGreaterThan(0);
  });
});

describe("nextUpFor", () => {
  it("describes the next stage for every stage the backend can report", () => {
    const steps = [
      "queued",
      "requirements",
      "crawl",
      "discussions",
      "brief",
      "hiring",
      "questions",
      "coverage",
      "flashcards",
      "schedule",
      "validation",
      "done",
    ];
    for (const step of steps) {
      expect(nextUpFor(step)).toMatch(/^Next: |^Opening /);
    }
  });

  it("returns null for an unknown or missing step rather than inventing one", () => {
    expect(nextUpFor(undefined)).toBeNull();
    expect(nextUpFor("something-new")).toBeNull();
  });
});

describe("expectationLine", () => {
  it("is qualitative early on, naming the wait and the hand-off", () => {
    const line = expectationLine("generating", 5);
    expect(line).toContain("minute");
    expect(line).not.toMatch(/\d+\s*(seconds|minutes) (left|remaining)/);
  });

  it("changes tone (rather than stalling) once we run past the estimate", () => {
    const early = expectationLine("crawling", 10);
    const late = expectationLine("crawling", 90);
    const veryLate = expectationLine("crawling", 400);
    expect(new Set([early, late, veryLate]).size).toBe(3);
    expect(veryLate).toContain("longer than usual");
    expect(veryLate).toMatch(/no need to refresh/i);
  });

  it("covers the terminal statuses", () => {
    expect(expectationLine("done", 60)).toContain("opening your kit");
    expect(expectationLine("failed", 60)).toContain("retry");
  });
});

describe("timeline", () => {
  it("lists exactly the job statuses in lifecycle order", () => {
    expect(ORDER).toEqual(["queued", "crawling", "generating", "done"]);
    expect(TIMELINE.every((s) => s.detail.length > 10)).toBe(true);
  });
});

describe("warm-ups", () => {
  it("offers several distinct questions, each with a model outline", () => {
    expect(WARMUPS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(WARMUPS.map((w) => w.prompt)).size).toBe(WARMUPS.length);
    for (const w of WARMUPS) expect(w.outline.length).toBeGreaterThanOrEqual(3);
  });

  it("wraps around for any index, including negatives", () => {
    expect(warmupAt(0)).toBe(WARMUPS[0]);
    expect(warmupAt(WARMUPS.length)).toBe(WARMUPS[0]);
    expect(warmupAt(-1)).toBe(WARMUPS[WARMUPS.length - 1]);
  });

  it("wraps tips the same way", () => {
    expect(tipAt(0)).toBe(tipAt(0));
    expect(tipAt(-1).length).toBeGreaterThan(0);
  });
});

describe("formatElapsed / draftStorageKey", () => {
  it("formats m:ss and clamps junk input", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(7)).toBe("0:07");
    expect(formatElapsed(61)).toBe("1:01");
    expect(formatElapsed(-5)).toBe("0:00");
  });

  it("scopes drafts per job and device-locally", () => {
    expect(draftStorageKey("job-1")).toBe("testdino:job-draft:job-1");
    expect(draftStorageKey("job-1")).not.toBe(draftStorageKey("job-2"));
  });
});
