"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  getKit,
  regenerateKit,
  type KitDetails,
  type KitQuestion,
  type KitRequirement,
} from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Section } from "@/components/Section";
import { QuestionItem } from "@/components/QuestionItem";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { Loading } from "@/components/Loading";
import { reorderQuestions } from "@/lib/questionApi";

interface LoadError {
  message: string;
  status: number;
}

type TabKey = "overview" | "requirements" | "questions" | "flashcards" | "schedule";

const QUESTION_SECTIONS: { category: string; title: string }[] = [
  { category: "technical", title: "Technical Questions" },
  { category: "behavioural", title: "Behavioural Questions" },
  { category: "system-design", title: "System Design Questions" },
  { category: "company-fit", title: "Company Fit Questions" },
];

function priorityTone(priority: string): "amber" | "slate" {
  return priority.toLowerCase() === "must" ? "amber" : "slate";
}

function RequirementList({ requirements }: { requirements: KitRequirement[] }) {
  if (requirements.length === 0) {
    return <p className="text-sm text-slate-500">No requirements extracted.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {requirements.map((r) => (
        <li key={r.id}>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500">{r.id}</span>
              <Badge tone="blue">{r.kind}</Badge>
              <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-800">{r.text}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function QuestionList({
  kitId,
  questions,
  onQuestionUpdated,
  onQuestionDeleted,
  onSwap,
}: {
  kitId: string;
  questions: KitQuestion[];
  onQuestionUpdated: (updated: KitQuestion) => void;
  onQuestionDeleted: (id: string) => void;
  /** Swap the order of two questions (the item and its rendered neighbour). */
  onSwap: (idA: string, idB: string) => void;
}) {
  if (questions.length === 0) {
    return <p className="text-sm text-slate-500">No questions in this section.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {questions.map((q, i) => (
        <li key={q.id}>
          <QuestionItem
            kitId={kitId}
            question={q}
            onQuestionUpdated={onQuestionUpdated}
            onQuestionDeleted={onQuestionDeleted}
            canMoveUp={i > 0}
            canMoveDown={i < questions.length - 1}
            onMoveUp={i > 0 ? () => onSwap(q.id, questions[i - 1].id) : undefined}
            onMoveDown={
              i < questions.length - 1
                ? () => onSwap(q.id, questions[i + 1].id)
                : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}

type RegenPhase = "idle" | "confirming" | "running";

export function KitDetailsView({ kitId }: { kitId: string }) {
  const router = useRouter();
  const [kit, setKit] = useState<KitDetails | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [regenPhase, setRegenPhase] = useState<RegenPhase>("idle");
  const [regenError, setRegenError] = useState<string | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Question scanning and filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pinned" | "user" | "edited">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleRegenerate = async () => {
    setRegenError(null);
    setRegenPhase("running");
    try {
      const result = await regenerateKit(kitId);
      if (result.jobId) {
        router.push(`/jobs/${encodeURIComponent(result.jobId)}`);
        return;
      }
      setRegenPhase("idle");
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.status) {
          case 401:
            setRegenError("You must be signed in to regenerate this kit.");
            break;
          case 404:
            setRegenError(
              "Kit not found. It may have been deleted or belongs to another user.",
            );
            break;
          case 409:
            setRegenError(
              "This kit hasn't finished generating yet, so there's nothing to regenerate.",
            );
            break;
          case 500:
          case 502:
          case 503:
            setRegenError(
              "Server error while regenerating the kit. Please try again.",
            );
            break;
          case 0:
            setRegenError(
              "Network error. Could not connect to the server. Please check your connection.",
            );
            break;
          default:
            setRegenError(
              err.message || "Failed to regenerate kit. Please try again.",
            );
            break;
        }
      } else if (err instanceof Error) {
        setRegenError(err.message);
      } else {
        setRegenError("An unexpected error occurred while regenerating.");
      }
      setRegenPhase("idle");
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getKit(kitId)
      .then((result) => {
        if (cancelled) return;
        setKit(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err instanceof ApiError ? err : new ApiError("Something went wrong.", 0);
        setError({ message: e.message, status: e.status });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kitId, reloadKey]);

  const questions = kit?.questions ?? [];
  const requirements = kit?.role?.requirements ?? [];
  const flashcards = kit?.flashcards ?? [];

  const handleQuestionUpdated = (updated: KitQuestion) => {
    setKit((prev) => {
      if (!prev || !prev.questions) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)),
      };
    });
  };

  const handleQuestionAdded = (newQuestion: KitQuestion) => {
    setKit((prev) => {
      if (!prev) return prev;
      const currentQuestions = prev.questions ?? [];
      return {
        ...prev,
        questions: [...currentQuestions, newQuestion],
      };
    });
    // Switch to questions tab when new question is added
    setActiveTab("questions");
  };

  const handleQuestionDeleted = (id: string) => {
    setKit((prev) => {
      if (!prev?.questions) return prev;
      return { ...prev, questions: prev.questions.filter((q) => q.id !== id) };
    });
  };

  // Swap two questions' positions (optimistic) and persist the full new order.
  const handleSwap = async (idA: string, idB: string) => {
    const current = kit?.questions ?? [];
    const arr = [...current];
    const ia = arr.findIndex((q) => q.id === idA);
    const ib = arr.findIndex((q) => q.id === idB);
    if (ia < 0 || ib < 0) return;
    [arr[ia], arr[ib]] = [arr[ib], arr[ia]];
    setKit((prev) => (prev ? { ...prev, questions: arr } : prev));
    try {
      await reorderQuestions(kitId, arr.map((q) => q.id));
    } catch {
      // Revert on failure.
      setKit((prev) => (prev ? { ...prev, questions: current } : prev));
    }
  };

  // Filtered questions computation for easy scanning
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Category filter
      if (categoryFilter !== "all" && q.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === "pinned" && !q.pinned) return false;
      if (statusFilter === "user" && q.origin !== "user") return false;
      if (statusFilter === "edited" && !q.edited) return false;

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesPrompt = q.prompt.toLowerCase().includes(query);
        const matchesOutline = q.answer_outline?.toLowerCase().includes(query) ?? false;
        const matchesCat = q.category.toLowerCase().includes(query);
        if (!matchesPrompt && !matchesOutline && !matchesCat) return false;
      }

      return true;
    });
  }, [questions, categoryFilter, statusFilter, searchQuery]);

  // Statistics for Overview tab
  const stats = useMemo(() => {
    const pinnedCount = questions.filter((q) => q.pinned).length;
    const userCount = questions.filter((q) => q.origin === "user").length;
    const editedCount = questions.filter((q) => q.edited).length;
    const scheduleDays = kit?.schedule?.days?.length ?? 0;
    const totalMinutes = kit?.schedule?.days?.reduce((sum, d) => sum + (d.minutes || 0), 0) ?? 0;
    return {
      totalQuestions: questions.length,
      pinnedCount,
      userCount,
      editedCount,
      scheduleDays,
      totalMinutes,
    };
  }, [questions, kit]);

  // ---- Loading state ----
  if (loading) {
    return (
      <Card>
        <Loading message="Loading kit details…" />
      </Card>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <Card>
        <p role="alert" className="text-sm font-medium text-slate-900">
          {error.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {error.status === 0 || error.status >= 500 ? (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Try again
            </button>
          ) : null}
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        </div>
      </Card>
    );
  }

  if (!kit) return null;

  const hasContent = Boolean(
    kit.company_brief || kit.role || (kit.questions && kit.questions.length > 0) || kit.schedule,
  );

  // ---- Not-ready / Empty state ----
  if (!hasContent) {
    return (
      <EmptyState
        title="This kit isn't ready to view yet"
        description={
          kit.status
            ? `Current status: ${kit.status}. Check back once generation has completed.`
            : "Check back once generation has completed."
        }
        action={
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        }
      />
    );
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "requirements", label: "Requirements", count: requirements.length },
    { key: "questions", label: "Questions", count: questions.length },
    { key: "flashcards", label: "Flashcards", count: flashcards.length },
    { key: "schedule", label: "Schedule", count: kit.schedule?.days?.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Regeneration Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <p className="text-sm font-semibold text-slate-900">Regenerate this kit</p>
          <p className="text-xs text-slate-500">
            Rebuilds generated questions and flashcards. Edited, user-authored, and pinned items are strictly preserved.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/kits/${kitId}/practice`} variant="secondary">
            Practice Mode
          </LinkButton>
          {regenPhase === "idle" ? (
            <button
              type="button"
              onClick={() => {
                setRegenError(null);
                setRegenPhase("confirming");
              }}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Regenerate
            </button>
          ) : null}

          {regenPhase === "confirming" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Are you sure?</span>
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Yes, regenerate
              </button>
              <button
                type="button"
                onClick={() => setRegenPhase("idle")}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {regenPhase === "running" ? (
            <button
              type="button"
              disabled
              aria-busy="true"
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-70"
            >
              <svg
                className="h-4 w-4 animate-spin text-white"
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
              <span>Regenerating…</span>
            </button>
          ) : null}
        </div>
      </div>

      {regenError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">{regenError}</p>
        </div>
      ) : null}

      {/* Responsive Section Navigation / Tabs */}
      <div className="border-b border-slate-200">
        <nav
          aria-label="Kit Sections"
          role="tablist"
          className="-mb-px flex gap-2 sm:gap-6 overflow-x-auto pb-1"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-slate-900 text-slate-900 font-semibold"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB PANEL 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          className="flex flex-col gap-6"
        >
          {/* Dashboard Summary Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <span className="text-xs font-medium text-slate-500">Total Questions</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalQuestions}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-amber-600">{stats.pinnedCount}</span> pinned •{" "}
                <span className="font-semibold text-purple-600">{stats.userCount}</span> user-added
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-medium text-slate-500">Requirements</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{requirements.length}</p>
              <p className="mt-2 text-xs text-slate-500">
                {kit.coverage?.passes ? `${kit.coverage.passes} coverage passes` : "Extracted from JD"}
              </p>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-medium text-slate-500">Schedule</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.scheduleDays} Days</p>
              <p className="mt-2 text-xs text-slate-500">{stats.totalMinutes} total practice min</p>
            </Card>

            <Card className="p-4">
              <span className="text-xs font-medium text-slate-500">Target Role</span>
              <p className="mt-1 truncate text-base font-bold text-slate-900">
                {kit.role?.title || "Role Identified"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {kit.role?.seniority ? `${kit.role.seniority} level` : "Customized prep"}
              </p>
            </Card>
          </div>

          {/* Company Brief */}
          <Section title="Company Brief">
            {kit.company_brief ? (
              <Card>
                {kit.company_brief.summary ? (
                  <p className="text-sm text-slate-800">{kit.company_brief.summary}</p>
                ) : null}
                {kit.company_brief.what_they_do ? (
                  <p className="mt-2 text-sm text-slate-600">{kit.company_brief.what_they_do}</p>
                ) : null}
                {kit.company_brief.sources.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">Sources</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {kit.company_brief.sources.map((src) => (
                        <li key={src}>
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900 break-all"
                          >
                            {src}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            ) : (
              <p className="text-sm text-slate-500">No company brief available.</p>
            )}
          </Section>

          {/* Target Role Responsibilities */}
          {kit.role && kit.role.responsibilities && kit.role.responsibilities.length > 0 ? (
            <Section title="Key Role Responsibilities">
              <Card>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm text-slate-700">
                  {kit.role.responsibilities.map((resp, idx) => (
                    <li key={idx}>{resp}</li>
                  ))}
                </ul>
              </Card>
            </Section>
          ) : null}

          {/* Coverage Summary */}
          {kit.coverage ? (
            <Section title="Requirement Coverage">
              <Card className="p-4 text-sm text-slate-700">
                <p>
                  Coverage passes: <span className="font-semibold text-slate-900">{kit.coverage.passes}</span>
                </p>
                {kit.coverage.uncovered_requirement_ids.length > 0 ? (
                  <p className="mt-1 text-slate-600">
                    Uncovered requirements:{" "}
                    <span className="font-mono text-xs text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                      {kit.coverage.uncovered_requirement_ids.join(", ")}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-emerald-700 font-medium">All role requirements are covered by questions.</p>
                )}
              </Card>
            </Section>
          ) : null}
        </div>
      )}

      {/* TAB PANEL 2: REQUIREMENTS */}
      {activeTab === "requirements" && (
        <div
          id="panel-requirements"
          role="tabpanel"
          aria-labelledby="tab-requirements"
          className="flex flex-col gap-6"
        >
          <Section title="Role Requirements" count={requirements.length}>
            <RequirementList requirements={requirements} />
          </Section>

          {kit.coverage ? (
            <Section title="Coverage Status">
              <Card className="p-4 text-sm text-slate-700">
                <p>
                  Coverage passes: <span className="font-semibold">{kit.coverage.passes}</span>
                </p>
                {kit.coverage.uncovered_requirement_ids.length > 0 ? (
                  <p className="mt-1">
                    Uncovered requirements:{" "}
                    <span className="font-mono text-xs text-slate-500">
                      {kit.coverage.uncovered_requirement_ids.join(", ")}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-emerald-700 font-medium">All requirements are covered.</p>
                )}
              </Card>
            </Section>
          ) : null}
        </div>
      )}

      {/* TAB PANEL 3: QUESTIONS */}
      {activeTab === "questions" && (
        <div
          id="panel-questions"
          role="tabpanel"
          aria-labelledby="tab-questions"
          className="flex flex-col gap-6"
        >
          {/* Questions Header & Quick Actions */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Questions ({questions.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Tailored interview questions. Card color accents distinguish pinned, user-authored, and edited questions.
                </p>
              </div>

              <AddQuestionForm kitId={kitId} onQuestionAdded={handleQuestionAdded} />
            </div>

            {/* Quick scanning tools: Search & Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              {/* Keyword Search */}
              <div className="relative flex-1 max-w-sm">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter questions by prompt..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 mr-1">Status:</span>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "pinned", label: "Pinned" },
                    { key: "user", label: "User Added" },
                    { key: "edited", label: "Edited" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatusFilter(s.key)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s.key
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Category:</span>
              {[
                { key: "all", label: "All Categories" },
                { key: "technical", label: "Technical" },
                { key: "behavioural", label: "Behavioural" },
                { key: "system-design", label: "System Design" },
                { key: "company-fit", label: "Company Fit" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryFilter(c.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    categoryFilter === c.key
                      ? "bg-slate-200 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scannable Question List */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg bg-white">
              <p className="text-sm font-medium text-slate-700">No questions match your current filters.</p>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-blue-600 underline hover:text-blue-800"
              >
                Reset filters
              </button>
            </div>
          ) : categoryFilter === "all" && !searchQuery && statusFilter === "all" ? (
            /* Render Grouped by Category when no filters active */
            <div className="flex flex-col gap-8">
              {QUESTION_SECTIONS.map(({ category, title }) => {
                const inCategory = questions.filter((q) => q.category === category);
                return (
                  <Section key={category} title={title} count={inCategory.length}>
                    <QuestionList
                      kitId={kitId}
                      questions={inCategory}
                      onQuestionUpdated={handleQuestionUpdated}
                      onQuestionDeleted={handleQuestionDeleted}
                      onSwap={handleSwap}
                    />
                  </Section>
                );
              })}
            </div>
          ) : (
            /* Render Flattened Filtered List for rapid scanning */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
              </div>
              <QuestionList
                kitId={kitId}
                questions={filteredQuestions}
                onQuestionUpdated={handleQuestionUpdated}
                onQuestionDeleted={handleQuestionDeleted}
                onSwap={handleSwap}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB PANEL: FLASHCARDS */}
      {activeTab === "flashcards" && (
        <div
          id="panel-flashcards"
          role="tabpanel"
          aria-labelledby="tab-flashcards"
          className="flex flex-col gap-6"
        >
          <Section title="Flashcards" count={flashcards.length}>
            {flashcards.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {flashcards.map((card) => (
                  <li key={card.id}>
                    <Card className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Front
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {card.pinned ? <Badge tone="amber">Pinned</Badge> : null}
                          {card.origin === "user" ? <Badge tone="purple">Yours</Badge> : null}
                          {card.edited ? <Badge tone="blue">Edited</Badge> : null}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{card.front}</p>

                      <details className="mt-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-medium text-blue-700">
                          Show back
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                          {card.back}
                        </p>
                      </details>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No flashcards in this kit yet. They&apos;re generated alongside questions.
              </p>
            )}
          </Section>

          <p className="text-sm text-slate-600">
            Want to drill these?{" "}
            <LinkButton href={`/kits/${kitId}/practice`} variant="secondary">
              Practice Mode
            </LinkButton>
          </p>
        </div>
      )}

      {/* TAB PANEL 4: SCHEDULE */}
      {activeTab === "schedule" && (
        <div
          id="panel-schedule"
          role="tabpanel"
          aria-labelledby="tab-schedule"
          className="flex flex-col gap-6"
        >
          <Section title="Preparation Schedule">
            {kit.schedule && kit.schedule.days.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {kit.schedule.days.map((day) => (
                  <li key={day.day}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                            {day.day}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            Day {day.day} Focus
                          </span>
                        </div>
                        <Badge tone="blue">{day.minutes} min practice</Badge>
                      </div>

                      {day.focus ? (
                        <p className="mt-3 text-sm text-slate-800">{day.focus}</p>
                      ) : null}

                      {day.question_ids.length > 0 ? (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-slate-500">Assigned Questions:</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {day.question_ids.map((qid) => (
                              <span
                                key={qid}
                                className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              >
                                {qid}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">Review, synthesis, and flashcard practice</p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No schedule available.</p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
