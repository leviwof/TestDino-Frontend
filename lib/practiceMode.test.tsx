import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PracticeModeView, CONFIDENCE_LEVELS } from "@/components/PracticeModeView";
import type { PracticeItem } from "@/lib/api";

describe("PracticeModeView UI", () => {
  const sampleItems: PracticeItem[] = [
    {
      id: "q-1",
      type: "question",
      content: "Explain event loop in Node.js",
      prompt: "Explain event loop in Node.js",
      answer_outline: "Discuss call stack, microtask queue, macrotask queue, libuv.",
      difficulty: 2,
      confidence: null,
      seen: false,
      section: "technical",
      requirement_ids: ["req-1"],
    },
    {
      id: "fc-1",
      type: "flashcard",
      content: "What is an idempotent HTTP method?",
      front: "What is an idempotent HTTP method?",
      back: "A method that has the same effect regardless of how many times it is executed.",
      difficulty: 1,
      confidence: 3,
      seen: true,
      section: "flashcards",
      requirement_ids: ["req-2"],
    },
  ];

  it("1. renders clear progress information (current item and total items)", () => {
    const html = renderToString(
      <PracticeModeView kitId="kit-123" initialItems={sampleItems} />,
    );

    // Current item and total count
    expect(html).toContain("Item");
    expect(html).toMatch(/Item.*1.*of.*2/);
    // Progress bar with accessible attributes
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-valuemax="2"');
    // Percentage display
    expect(html).toContain("50");
    expect(html).toContain("% done");
  });

  it("2. renders clear, easy to understand confidence selection options", () => {
    const html = renderToString(
      <PracticeModeView kitId="kit-123" initialItems={sampleItems} />,
    );

    // Legend
    expect(html).toContain("How confident are you with this item?");

    // Check all 5 confidence levels with descriptive labels and descriptions
    for (const level of CONFIDENCE_LEVELS) {
      expect(html).toContain(level.label);
      expect(html).toContain(level.description);
    }
  });

  it("3. clearly distinguishes seen vs unseen items", () => {
    // Render first item (unseen)
    const unseenHtml = renderToString(
      <PracticeModeView kitId="kit-123" initialItems={sampleItems} />,
    );
    expect(unseenHtml).toContain("Unseen Item");

    // Render second item as initial (seen)
    const seenHtml = renderToString(
      <PracticeModeView kitId="kit-123" initialItems={[sampleItems[1]]} />,
    );
    expect(seenHtml).toContain("Practiced");
    expect(seenHtml).toMatch(/3.*\/5/);
  });

  it("4. provides a clear link to return to the kit details page", () => {
    const html = renderToString(
      <PracticeModeView kitId="kit-123" initialItems={sampleItems} />,
    );

    expect(html).toContain("/kits/kit-123");
    expect(html).toContain("Return to kit details");
  });

  it("5. renders clean empty state when no items are available", () => {
    const emptyHtml = renderToString(
      <PracticeModeView kitId="kit-empty" initialItems={[]} />,
    );

    expect(emptyHtml).toContain("No practice items found");
    expect(emptyHtml).toContain("/kits/kit-empty");
  });
});
