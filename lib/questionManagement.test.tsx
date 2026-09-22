import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import type { KitQuestion } from "@/lib/api";
import {
  applyEditToQuestion,
  applyPinToQuestion,
  buildUserQuestion,
  defaultQuestionApiHandlers,
  type NewQuestionInput,
} from "@/lib/questionApi";
import { QuestionItem } from "@/components/QuestionItem";

describe("Question Management", () => {
  const sampleGeneratedQuestion: KitQuestion = {
    id: "q-101",
    prompt: "Explain how Next.js App Router works.",
    answer_outline: "Discuss server components, client components, and streaming.",
    category: "technical",
    difficulty: 2,
    requirement_ids: ["req-1"],
    origin: "generated",
    edited: false,
    pinned: false,
  };

  const sampleUserQuestion: KitQuestion = {
    id: "q-user-1",
    prompt: "Tell me about a challenging distributed systems bug you fixed.",
    answer_outline: "STAR format: Situation, Task, Action, Result.",
    category: "behavioural",
    difficulty: 3,
    requirement_ids: [],
    origin: "user",
    edited: true,
    pinned: false,
  };

  describe("1. Edit Question", () => {
    it("editing a generated question sets origin = 'generated' and edited = true", () => {
      const updated = applyEditToQuestion(sampleGeneratedQuestion, {
        prompt: "Updated prompt: Explain React Server Components and SSR.",
      });

      expect(updated.prompt).toBe("Updated prompt: Explain React Server Components and SSR.");
      expect(updated.origin).toBe("generated");
      expect(updated.edited).toBe(true);
      expect(updated.pinned).toBe(false);
    });

    it("editing a user-created question preserves origin = 'user' and sets edited = true", () => {
      const updated = applyEditToQuestion(sampleUserQuestion, {
        prompt: "Refined prompt about distributed systems debugging.",
        answer_outline: "Emphasize root-cause analysis and metrics.",
      });

      expect(updated.prompt).toBe("Refined prompt about distributed systems debugging.");
      expect(updated.answer_outline).toBe("Emphasize root-cause analysis and metrics.");
      expect(updated.origin).toBe("user");
      expect(updated.edited).toBe(true);
    });

    it("editing preserves existing pinned state", () => {
      const pinnedGeneratedQuestion: KitQuestion = {
        ...sampleGeneratedQuestion,
        pinned: true,
      };

      const updated = applyEditToQuestion(pinnedGeneratedQuestion, {
        prompt: "Updated prompt while pinned.",
      });

      expect(updated.prompt).toBe("Updated prompt while pinned.");
      expect(updated.pinned).toBe(true);
      expect(updated.edited).toBe(true);
    });

    it("saveQuestion API handler correctly applies updates", async () => {
      const updated = await defaultQuestionApiHandlers.saveQuestion(
        "kit-123",
        sampleGeneratedQuestion,
        { prompt: "Saved through API handler" },
      );

      expect(updated.prompt).toBe("Saved through API handler");
      expect(updated.edited).toBe(true);
      expect(updated.origin).toBe("generated");
    });
  });

  describe("2. Pin / Unpin Question", () => {
    it("pinning sets pinned = true", () => {
      const pinned = applyPinToQuestion(sampleGeneratedQuestion, true);
      expect(pinned.pinned).toBe(true);
      expect(pinned.id).toBe(sampleGeneratedQuestion.id);
    });

    it("unpinning sets pinned = false", () => {
      const pinnedQuestion: KitQuestion = {
        ...sampleGeneratedQuestion,
        pinned: true,
      };

      const unpinned = applyPinToQuestion(pinnedQuestion, false);
      expect(unpinned.pinned).toBe(false);
    });

    it("togglePinQuestion API handler toggles state correctly", async () => {
      const pinned = await defaultQuestionApiHandlers.togglePinQuestion(
        "kit-123",
        sampleGeneratedQuestion,
        true,
      );
      expect(pinned.pinned).toBe(true);

      const unpinned = await defaultQuestionApiHandlers.togglePinQuestion(
        "kit-123",
        pinned,
        false,
      );
      expect(unpinned.pinned).toBe(false);
    });
  });

  describe("3. Add Question", () => {
    it("user-created question has origin = 'user', edited = true, pinned = false", () => {
      const input: NewQuestionInput = {
        prompt: "What is eventual consistency in distributed databases?",
        answer_outline: "Explain CAP theorem and replication lag.",
        category: "system-design",
        difficulty: 3,
      };

      const newQuestion = buildUserQuestion(input);

      expect(newQuestion.prompt).toBe("What is eventual consistency in distributed databases?");
      expect(newQuestion.answer_outline).toBe("Explain CAP theorem and replication lag.");
      expect(newQuestion.category).toBe("system-design");
      expect(newQuestion.difficulty).toBe(3);
      expect(newQuestion.origin).toBe("user");
      expect(newQuestion.edited).toBe(true);
      expect(newQuestion.pinned).toBe(false);
      expect(newQuestion.id).toBeDefined();
    });

    it("addQuestion API handler successfully builds and returns user question", async () => {
      const input: NewQuestionInput = {
        prompt: "Describe your experience with microfrontends.",
        category: "technical",
        difficulty: 2,
      };

      const added = await defaultQuestionApiHandlers.addQuestion("kit-123", input);

      expect(added.prompt).toBe("Describe your experience with microfrontends.");
      expect(added.origin).toBe("user");
      expect(added.edited).toBe(true);
      expect(added.pinned).toBe(false);
    });
  });

  describe("4. Metadata Display in UI", () => {
    it("renders Pinned badge and Unpin action when question is pinned", () => {
      const pinnedQuestion: KitQuestion = {
        ...sampleGeneratedQuestion,
        pinned: true,
      };

      const html = renderToString(
        <QuestionItem
          kitId="kit-123"
          question={pinnedQuestion}
          onQuestionUpdated={() => {}}
        />,
      );

      expect(html).toContain("Pinned");
      expect(html).toContain("Unpin");
    });

    it("renders Pin button and no Pinned badge when question is unpinned", () => {
      const html = renderToString(
        <QuestionItem
          kitId="kit-123"
          question={sampleGeneratedQuestion}
          onQuestionUpdated={() => {}}
        />,
      );

      expect(html).toContain("Pin</button>");
      expect(html).not.toContain("Pinned");
    });

    it("renders Edited badge when question has edited = true", () => {
      const editedQuestion: KitQuestion = {
        ...sampleGeneratedQuestion,
        edited: true,
      };

      const html = renderToString(
        <QuestionItem
          kitId="kit-123"
          question={editedQuestion}
          onQuestionUpdated={() => {}}
        />,
      );

      expect(html).toContain("Edited");
    });

    it("renders User Added badge when question has origin = 'user'", () => {
      const html = renderToString(
        <QuestionItem
          kitId="kit-123"
          question={sampleUserQuestion}
          onQuestionUpdated={() => {}}
        />,
      );

      expect(html).toContain("User Added");
    });

    it("renders Generated badge when question has origin = 'generated'", () => {
      const html = renderToString(
        <QuestionItem
          kitId="kit-123"
          question={sampleGeneratedQuestion}
          onQuestionUpdated={() => {}}
        />,
      );

      expect(html).toContain("Generated");
    });
  });
});
