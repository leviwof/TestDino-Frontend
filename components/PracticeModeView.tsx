"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getPracticeItems,
  type PracticeItem,
} from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Loading } from "@/components/Loading";

export interface ConfidenceLevel {
  value: number;
  label: string;
  description: string;
  tone: "red" | "amber" | "blue" | "purple" | "green";
}

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  {
    value: 1,
    label: "1 · Low",
    description: "Need to review / unfamiliar",
    tone: "red",
  },
  {
    value: 2,
    label: "2 · Somewhat Low",
    description: "Partial recall / hesitant",
    tone: "amber",
  },
  {
    value: 3,
    label: "3 · Medium",
    description: "Good general understanding",
    tone: "blue",
  },
  {
    value: 4,
    label: "4 · Strong",
    description: "Clear and confident grasp",
    tone: "purple",
  },
  {
    value: 5,
    label: "5 · Mastered",
    description: "Completely fluent and thorough",
    tone: "green",
  },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Basic",
  2: "Intermediate",
  3: "Advanced",
};

interface PracticeModeViewProps {
  kitId: string;
  initialItems?: PracticeItem[];
}

export function PracticeModeView({ kitId, initialItems }: PracticeModeViewProps) {
  const [items, setItems] = useState<PracticeItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState<boolean>(!initialItems);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Per-session practice records: itemId -> confidence rating
  const [sessionRatings, setSessionRatings] = useState<Record<string, number>>({});
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Fetch practice items from the API
  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getPracticeItems(kitId)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Could not load practice items. Please try again.");
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [kitId, initialItems]);

  const currentItem: PracticeItem | undefined = items[currentIndex];

  // Update selected confidence when moving to an item already rated in this session
  useEffect(() => {
    if (currentItem && sessionRatings[currentItem.id] !== undefined) {
      setSelectedConfidence(sessionRatings[currentItem.id]);
    } else {
      setSelectedConfidence(null);
    }
    setShowAnswer(false);
  }, [currentIndex, currentItem, sessionRatings]);

  const handleConfidenceSelect = (value: number) => {
    setSelectedConfidence(value);
  };

  const handleNext = () => {
    if (!currentItem) return;

    // Record confidence rating for current item
    const finalRating = selectedConfidence ?? currentItem.confidence ?? 3;
    const updatedRatings = { ...sessionRatings, [currentItem.id]: finalRating };
    setSessionRatings(updatedRatings);

    if (currentIndex + 1 >= items.length) {
      // Completed all items!
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setSessionRatings({});
    setSelectedConfidence(null);
    setShowAnswer(false);
    setIsCompleted(false);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <Card>
        <Loading message="Loading practice items…" />
      </Card>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <Card>
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                getPracticeItems(kitId)
                  .then((data) => {
                    setItems(data);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setError(err.message || "Failed to load practice items.");
                    setLoading(false);
                  });
              }}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Try again
            </button>
            <LinkButton href={`/kits/${kitId}`} variant="secondary">
              Return to kit details
            </LinkButton>
          </div>
        </div>
      </Card>
    );
  }

  // ---- Empty state ----
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No practice items found"
        description="This kit does not have any questions or flashcards available to practice yet."
        action={
          <LinkButton href={`/kits/${kitId}`} variant="secondary">
            Return to kit details
          </LinkButton>
        }
      />
    );
  }

  // ---- Completion state ----
  if (isCompleted) {
    const totalItems = items.length;
    const ratingsArray = Object.values(sessionRatings);
    const avgScore =
      ratingsArray.length > 0
        ? (ratingsArray.reduce((acc, curr) => acc + curr, 0) / ratingsArray.length).toFixed(1)
        : "N/A";
    const highCount = ratingsArray.filter((r) => r >= 4).length;
    const mediumCount = ratingsArray.filter((r) => r === 3).length;
    const lowCount = ratingsArray.filter((r) => r <= 2).length;

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <LinkButton href={`/kits/${kitId}`} variant="secondary">
            ← Return to kit details
          </LinkButton>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Practice Session Complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have successfully practiced and self-rated all {totalItems} items in this kit.
            </p>

            {/* Session Stats Summary */}
            <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="text-xs font-medium text-slate-500">Items Practiced</span>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalItems}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="text-xs font-medium text-slate-500">Avg Confidence</span>
                <p className="mt-1 text-xl font-bold text-blue-700">{avgScore} / 5</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="text-xs font-medium text-slate-500">Mastered / Strong</span>
                <p className="mt-1 text-xl font-bold text-green-700">{highCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <span className="text-xs font-medium text-slate-500">Needs Review</span>
                <p className="mt-1 text-xl font-bold text-amber-700">{lowCount}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <LinkButton href={`/kits/${kitId}`} variant="primary">
                Return to Kit Details
              </LinkButton>
              <button
                type="button"
                onClick={restartSession}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Practice Again
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Active Practice Item Screen ----
  const totalItems = items.length;
  const currentNumber = currentIndex + 1;
  const progressPercent = Math.round((currentNumber / totalItems) * 100);
  const completedInSession = Object.keys(sessionRatings).length;
  const isSeenItem = Boolean(currentItem.seen);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LinkButton href={`/kits/${kitId}`} variant="secondary">
          ← Return to kit details
        </LinkButton>

        {/* Progress Information */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">
            Item <span className="text-blue-700">{currentNumber}</span> of {totalItems}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {progressPercent}% done
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-valuenow={currentNumber}
          aria-valuemin={1}
          aria-valuemax={totalItems}
          aria-label="Practice progress"
          className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full bg-slate-900 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{completedInSession} reviewed in session</span>
          <span>{totalItems - completedInSession} remaining</span>
        </div>
      </div>

      {/* Practice Item Card */}
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        {/* Item Header / Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Seen vs Unseen Badge */}
            {isSeenItem ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                <svg
                  className="h-3.5 w-3.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Practiced
                {currentItem.confidence !== null && currentItem.confidence !== undefined ? (
                  <span className="font-semibold text-slate-900">
                    ({currentItem.confidence}/5)
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
                Unseen Item
              </span>
            )}

            {/* Type Badge */}
            <Badge tone={currentItem.type === "flashcard" ? "amber" : "purple"}>
              {currentItem.type === "flashcard" ? "Flashcard" : "Question"}
            </Badge>

            {/* Section Badge */}
            {currentItem.section ? (
              <Badge tone="slate">{currentItem.section}</Badge>
            ) : null}

            {/* Difficulty Badge */}
            {currentItem.difficulty ? (
              <Badge tone="slate">
                {DIFFICULTY_LABELS[currentItem.difficulty] ?? `Diff ${currentItem.difficulty}`}
              </Badge>
            ) : null}
          </div>

          <span className="font-mono text-xs text-slate-400">{currentItem.id}</span>
        </div>

        {/* Question / Flashcard Content */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {currentItem.type === "flashcard"
              ? currentItem.front || currentItem.content
              : currentItem.prompt || currentItem.content}
          </h3>

          {/* Answer Outline / Flashcard Back Toggle */}
          {(currentItem.answer_outline || currentItem.back) ? (
            <div className="mt-2 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentItem.type === "flashcard" ? "Flashcard Back" : "Suggested Answer Outline"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAnswer((prev) => !prev)}
                  aria-expanded={showAnswer}
                  className="text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  {showAnswer ? "Hide outline" : "Show answer outline"}
                </button>
              </div>

              {showAnswer ? (
                <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
                  {currentItem.type === "flashcard" ? currentItem.back : currentItem.answer_outline}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Think through your answer before revealing the outline.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Confidence Selection Section */}
        <fieldset className="border-t border-slate-100 pt-6">
          <legend className="text-sm font-semibold text-slate-900">
            How confident are you with this item?
          </legend>
          <p className="mt-1 text-xs text-slate-500">
            Lower confidence items are scheduled for more frequent review in practice mode.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            {CONFIDENCE_LEVELS.map((level) => {
              const isSelected = selectedConfidence === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleConfidenceSelect(level.value)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {level.label}
                  </span>
                  <span
                    className={`mt-1 text-xs leading-tight ${
                      isSelected ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {level.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Navigation & Submit Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 shadow-xs"
            >
              {currentNumber === totalItems ? "Finish Practice ✓" : "Next Item →"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
