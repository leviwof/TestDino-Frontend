import { API_BASE_URL } from "@/lib/config";
import { ApiError, getAuthHeaders, type KitQuestion, type QuestionOrigin } from "@/lib/api";

export interface NewQuestionInput {
  id?: string;
  prompt: string;
  answer_outline?: string;
  category: string;
  difficulty: number;
  requirement_ids?: string[];
}

export interface QuestionUpdateInput {
  prompt?: string;
  answer_outline?: string;
  category?: string;
  difficulty?: number;
  requirement_ids?: string[];
}

/**
 * Pure metadata transformation for user-created questions:
 * - origin = "user"
 * - edited = true
 * - pinned = false
 */
export function buildUserQuestion(input: NewQuestionInput): KitQuestion {
  return {
    id:
      input.id ||
      `user-q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    prompt: input.prompt.trim(),
    answer_outline: input.answer_outline?.trim() || undefined,
    category: input.category,
    difficulty: input.difficulty,
    requirement_ids: input.requirement_ids ?? [],
    origin: "user",
    edited: true,
    pinned: false,
  };
}

/**
 * Pure metadata transformation for edited questions:
 * - If generated: origin = "generated", edited = true
 * - If user: origin = "user", edited = true
 * - pinned status is preserved
 */
export function applyEditToQuestion(
  question: KitQuestion,
  updates: QuestionUpdateInput,
): KitQuestion {
  const origin: QuestionOrigin =
    question.origin === "user" ? "user" : "generated";

  return {
    ...question,
    ...updates,
    prompt: updates.prompt !== undefined ? updates.prompt.trim() : question.prompt,
    answer_outline:
      updates.answer_outline !== undefined
        ? updates.answer_outline.trim() || undefined
        : question.answer_outline,
    origin,
    edited: true,
  };
}

/**
 * Pure metadata transformation for pin/unpin:
 * - Pinned: pinned = true (or false when unpinning)
 */
export function applyPinToQuestion(
  question: KitQuestion,
  pinned: boolean,
): KitQuestion {
  return {
    ...question,
    pinned,
  };
}

/**
 * Question API handlers.
 * Dispatches to the authenticated backend endpoints when run in browser,
 * with pure transformation fallback for offline/test environments.
 */
export interface QuestionApiHandlers {
  saveQuestion: (
    kitId: string,
    question: KitQuestion,
    updates: QuestionUpdateInput,
  ) => Promise<KitQuestion>;
  togglePinQuestion: (
    kitId: string,
    question: KitQuestion,
    pinned: boolean,
  ) => Promise<KitQuestion>;
  addQuestion: (
    kitId: string,
    input: NewQuestionInput,
  ) => Promise<KitQuestion>;
  deleteQuestion: (kitId: string, questionId: string) => Promise<void>;
}

/** PATCH /kits/:id/reorder — persist a new question order (list of ids). */
export async function reorderQuestions(
  kitId: string,
  orderedIds: string[],
): Promise<void> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/reorder`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ order: orderedIds }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(
      errBody?.error?.message ?? "Failed to reorder questions.",
      res.status,
    );
  }
}

export const defaultQuestionApiHandlers: QuestionApiHandlers = {
  async saveQuestion(kitId, question, updates) {
    if (typeof window !== "undefined") {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/questions/${encodeURIComponent(question.id)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify(updates),
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.question) return data.question;
        } else {
          const errBody = await res.json().catch(() => null);
          throw new ApiError(errBody?.error?.message ?? "Failed to save question.", res.status);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        // Network failure in local preview fallback
        return applyEditToQuestion(question, updates);
      }
    }
    return applyEditToQuestion(question, updates);
  },

  async togglePinQuestion(kitId, question, pinned) {
    if (typeof window !== "undefined") {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/questions/${encodeURIComponent(question.id)}/pin`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify({ pinned }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.question) return data.question;
        } else {
          const errBody = await res.json().catch(() => null);
          throw new ApiError(errBody?.error?.message ?? "Failed to update pin state.", res.status);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return applyPinToQuestion(question, pinned);
      }
    }
    return applyPinToQuestion(question, pinned);
  },

  async addQuestion(kitId, input) {
    if (typeof window !== "undefined") {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/questions`,
          {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify(input),
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.question) return data.question;
        } else {
          const errBody = await res.json().catch(() => null);
          throw new ApiError(errBody?.error?.message ?? "Failed to add question.", res.status);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        return buildUserQuestion(input);
      }
    }
    return buildUserQuestion(input);
  },

  async deleteQuestion(kitId, questionId) {
    if (typeof window === "undefined") return;
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/questions/${encodeURIComponent(questionId)}`,
      { method: "DELETE", headers },
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new ApiError(
        errBody?.error?.message ?? "Failed to delete question.",
        res.status,
      );
    }
  },
};
