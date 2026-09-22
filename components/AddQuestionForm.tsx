"use client";

import { useState } from "react";
import type { KitQuestion } from "@/lib/api";
import { Card } from "@/components/Card";
import { inputClasses, textareaClasses } from "@/components/Field";
import {
  type NewQuestionInput,
  type QuestionApiHandlers,
  defaultQuestionApiHandlers,
} from "@/lib/questionApi";

interface AddQuestionFormProps {
  kitId: string;
  defaultCategory?: string;
  onQuestionAdded: (newQuestion: KitQuestion) => void;
  apiHandlers?: QuestionApiHandlers;
}

export function AddQuestionForm({
  kitId,
  defaultCategory = "technical",
  onQuestionAdded,
  apiHandlers = defaultQuestionApiHandlers,
}: AddQuestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answerOutline, setAnswerOutline] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [difficulty, setDifficulty] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setPrompt("");
    setAnswerOutline("");
    setCategory(defaultCategory);
    setDifficulty(2);
    setError(null);
  };

  const handleOpen = () => {
    resetForm();
    setSuccessMessage(null);
    setIsOpen(true);
  };

  const handleCancel = () => {
    resetForm();
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length === 0) {
      setError("Question prompt is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const input: NewQuestionInput = {
        prompt: prompt.trim(),
        answer_outline: answerOutline.trim() || undefined,
        category,
        difficulty,
      };

      const newQuestion = await apiHandlers.addQuestion(kitId, input);
      onQuestionAdded(newQuestion);
      setSuccessMessage("Question added successfully!");
      resetForm();
      setIsOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add question.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-2">
        {successMessage ? (
          <div
            role="status"
            className="rounded bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
          >
            {successMessage}
          </div>
        ) : null}
        <div>
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <span>+ Add Question</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-slate-300 p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-semibold text-slate-900">Add New Question</h3>
        <span className="text-xs text-slate-500">
          Created with user metadata (origin: user, edited: true)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error ? (
          <div
            role="alert"
            className="rounded bg-red-50 p-2 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-question-category"
              className="block text-xs font-medium text-slate-700"
            >
              Category
            </label>
            <select
              id="new-question-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={saving}
              className={`mt-1 ${inputClasses}`}
            >
              <option value="technical">Technical</option>
              <option value="behavioural">Behavioural</option>
              <option value="system-design">System Design</option>
              <option value="company-fit">Company Fit</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="new-question-difficulty"
              className="block text-xs font-medium text-slate-700"
            >
              Difficulty
            </label>
            <select
              id="new-question-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              disabled={saving}
              className={`mt-1 ${inputClasses}`}
            >
              <option value={1}>Level 1 - Basic</option>
              <option value={2}>Level 2 - Intermediate</option>
              <option value={3}>Level 3 - Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="new-question-prompt"
            className="block text-xs font-medium text-slate-700"
          >
            Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            id="new-question-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={saving}
            rows={3}
            className={`mt-1 ${textareaClasses} min-h-[80px]`}
            placeholder="Type your interview question here..."
          />
        </div>

        <div>
          <label
            htmlFor="new-question-outline"
            className="block text-xs font-medium text-slate-700"
          >
            Answer Outline / Talking Points (optional)
          </label>
          <textarea
            id="new-question-outline"
            value={answerOutline}
            onChange={(e) => setAnswerOutline(e.target.value)}
            disabled={saving}
            rows={2}
            className={`mt-1 ${textareaClasses} min-h-[60px]`}
            placeholder="Key concepts, sample answers, or hints..."
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding question..." : "Add Question"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
