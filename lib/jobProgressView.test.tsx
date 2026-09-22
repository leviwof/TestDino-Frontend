import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { KitProgressPanel } from "@/components/KitProgressPanel";
import { WARMUPS } from "@/lib/jobProgress";
import type { JobStatusResult } from "@/lib/api";

const RUNNING: JobStatusResult = {
  jobId: "job-1",
  kitId: "kit-1",
  status: "generating",
  progress: {
    step: "questions",
    message: "Drafting interview questions and answer outlines…",
  },
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:30.000Z",
};

function render(job: JobStatusResult, elapsedSeconds = 12) {
  return renderToString(
    <KitProgressPanel job={job} elapsedSeconds={elapsedSeconds} activityTick={0} tipTick={0} />,
  );
}

/** React escapes apostrophes in text nodes; compare against readable text. */
function text(html: string): string {
  return html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
}

describe("KitProgressPanel", () => {
  it("1. shows the backend's own progress message, not a guess", () => {
    const html = render(RUNNING);
    expect(html).toContain("Drafting interview questions and answer outlines…");
  });

  it("2. sets an expectation: what happens next and how long this takes", () => {
    const html = render(RUNNING, 12);
    expect(html).toContain("Next: closing any requirement gaps it finds.");
    expect(html).toContain("Most kits are ready in about a minute");
  });

  it("3. adjusts the expectation line instead of stalling when a run goes long", () => {
    const html = render(RUNNING, 400);
    expect(html).toContain("taking longer than usual");
    expect(html).not.toContain("Most kits are ready in about a minute");
  });

  it("4. marks the active phase and explains what it involves", () => {
    const html = render(RUNNING);
    expect(html).toContain("Writing your kit");
    expect(html).toContain("In progress…");
    expect(html).toContain("Questions, answer outlines, flashcards, and your study schedule.");
    // The completed phase is ticked off.
    expect(html).toContain("✓");
  });

  it("5. gives the user something to do while the job runs", () => {
    const html = text(render(RUNNING));
    expect(html).toContain("Warm up while you wait");
    expect(html).toContain(WARMUPS[0].prompt);
    // A scratchpad that stays on the device.
    expect(html).toContain("it stays on this device");
    // The model outline is opt-in, so it can be attempted first.
    expect(html).toContain("Reveal a model outline");
    expect(html).not.toContain(WARMUPS[0].outline[0]);
  });

  it("6. falls back to phase copy for a job with no reported stage", () => {
    const html = render(
      { jobId: "job-2", kitId: "kit-2", status: "crawling" },
      3,
    );
    expect(html).toContain("Visiting the company website…");
    expect(html).toContain("Researching the company");
  });

  it("7. exposes progress to assistive tech through a live region", () => {
    const html = render(RUNNING);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Drafting interview questions and answer outlines…");
  });
});
