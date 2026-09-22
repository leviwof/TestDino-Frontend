"use client";

import { useState } from "react";
import type { KitQuestion } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { inputClasses, textareaClasses } from "@/components/Field";
import {
  type QuestionApiHandlers,
  type QuestionUpdateInput,
  defaultQuestionApiHandlers,
} from "@/lib/questionApi";

const DIFFICULTY: Record<number, string> = {
  1: "Basic",
  2: "Intermediate",
  3: "Advanced",
};

interface QuestionItemProps {
  kitId: string;
  question: KitQuestion;
  onQuestionUpdated: (updated: KitQuestion) => void;
  apiHandlers?: QuestionApiHandlers;
  initiallyExpanded?: boolean;
}

export function QuestionItem({
  kitId,
  question,
  onQuestionUpdated,
  apiHandlers = defaultQuestionApiHandlers,
  initiallyExpanded = true,
}: QuestionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Edit form state
  const [editPrompt, setEditPrompt] = useState(question.prompt);
  const [editOutline, setEditOutline] = useState(question.answer_outline ?? "");
  const [editDifficulty, setEditDifficulty] = useState(question.difficulty);
  const [formError, setFormError] = useState<string | null>(null);

  const startEdit = () => {
    setEditPrompt(question.prompt);
    setEditOutline(question.answer_outline ?? "");
    setEditDifficulty(question.difficulty);
    setFormError(null);
    setStatusMessage(null);
    setIsEditing(true);
    setExpanded(true); // expand when editing
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFormError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim().length === 0) {
      setFormError("Question prompt cannot be empty.");
      return;
    }

    setSaving(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      const updates: QuestionUpdateInput = {
        prompt: editPrompt.trim(),
        answer_outline: editOutline.trim() || undefined,
        difficulty: editDifficulty,
      };

      const updated = await apiHandlers.saveQuestion(kitId, question, updates);
      onQuestionUpdated(updated);
      setIsEditing(false);
      setStatusMessage({ type: "success", text: "Question updated successfully." });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save question.";
      setFormError(message);
      setStatusMessage({ type: "error", text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async () => {
    setPinning(true);
    setStatusMessage(null);

    const targetPinned = !question.pinned;
    try {
      const updated = await apiHandlers.togglePinQuestion(
        kitId,
        question,
        targetPinned,
      );
      onQuestionUpdated(updated);
      setStatusMessage({
        type: "success",
        text: targetPinned ? "Question pinned." : "Question unpinned.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update pin state.";
      setStatusMessage({ type: "error", text: message });
    } finally {
      setPinning(false);
    }
  };

  // Distinct visual border styling based on provenance and pin status
  const cardBorderHighlight = question.pinned
    ? "border-l-4 border-l-amber-400 bg-amber-50/20"
    : question.origin === "user"
      ? "border-l-4 border-l-purple-500 bg-purple-50/20"
      : question.edited
        ? "border-l-4 border-l-blue-500 bg-blue-50/20"
        : "border-l-4 border-l-slate-300";

  return (
    <Card className={`p-4 transition-all ${cardBorderHighlight}`}>
      {/* Feedback banner */}
      {statusMessage ? (
        <div
          role="status"
          className={`mb-3 rounded px-2.5 py-1.5 text-xs font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor={`edit-prompt-${question.id}`}
              className="block text-xs font-semibold text-slate-700"
            >
              Question Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`edit-prompt-${question.id}`}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              disabled={saving}
              rows={3}
              className={`mt-1 ${textareaClasses} min-h-[80px]`}
              placeholder="Enter question prompt..."
            />
          </div>

          <div>
            <label
              htmlFor={`edit-outline-${question.id}`}
              className="block text-xs font-semibold text-slate-700"
            >
              Answer Outline (optional)
            </label>
            <textarea
              id={`edit-outline-${question.id}`}
              value={editOutline}
              onChange={(e) => setEditOutline(e.target.value)}
              disabled={saving}
              rows={2}
              className={`mt-1 ${textareaClasses} min-h-[60px]`}
              placeholder="Key talking points or answer outline..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label
                htmlFor={`edit-difficulty-${question.id}`}
                className="block text-xs font-semibold text-slate-700"
              >
                Difficulty
              </label>
              <select
                id={`edit-difficulty-${question.id}`}
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(Number(e.target.value))}
                disabled={saving}
                className={`mt-1 ${inputClasses} w-auto pr-8`}
              >
                <option value={1}>Level 1 - Basic</option>
                <option value={2}>Level 2 - Intermediate</option>
                <option value={3}>Level 3 - Advanced</option>
              </select>
            </div>
          </div>

          {formError ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {formError}
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {question.prompt}
                </p>
              </div>

              {/* Collapsible Answer Outline Section */}
              {question.answer_outline && (
                <div
                  className={`mt-2 text-sm text-slate-600 transition-all ${
                    expanded ? "block" : "line-clamp-1 text-slate-500 italic"
                  }`}
                >
                  <span className="font-medium not-italic text-slate-700">Outline: </span>
                  {question.answer_outline}
                </div>
              )}
            </div>

            {/* Actions: Collapse/Expand, Pin/Unpin, Edit */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {question.answer_outline ? (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  aria-expanded={expanded}
                  aria-label={expanded ? "Collapse question details" : "Expand question details"}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <svg
                    className={`h-3 w-3 transform transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="hidden sm:inline">{expanded ? "Collapse" : "Expand"}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleTogglePin}
                disabled={pinning}
                aria-pressed={Boolean(question.pinned)}
                aria-label={question.pinned ? "Unpin question" : "Pin question"}
                className={`inline-flex items-center justify-center rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  question.pinned
                    ? "bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200 shadow-xs"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {pinning
                  ? "Saving..."
                  : question.pinned
                    ? "Unpin"
                    : "Pin"}
              </button>

              <button
                type="button"
                onClick={startEdit}
                aria-label="Edit question"
                className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Metadata Display with Distinct Provenance Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100" data-testid="metadata-badges">
            {/* Pinned badge */}
            {question.pinned ? (
              <Badge tone="amber">📌 Pinned</Badge>
            ) : null}

            {/* User-created badge */}
            {question.origin === "user" ? (
              <Badge tone="purple">User Added</Badge>
            ) : question.origin === "generated" ? (
              <Badge tone="slate">Generated</Badge>
            ) : null}

            {/* Edited badge */}
            {question.edited ? (
              <Badge tone="blue">Edited</Badge>
            ) : null}

            {/* Difficulty badge */}
            <Badge tone="green">
              {DIFFICULTY[question.difficulty] ?? `Level ${question.difficulty}`}
            </Badge>

            {/* Category badge */}
            <Badge tone="slate">{question.category}</Badge>

            {/* Linked requirements (when expanded) */}
            {expanded && question.requirement_ids && question.requirement_ids.length > 0 ? (
              <span className="font-mono text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {question.requirement_ids.join(", ")}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
