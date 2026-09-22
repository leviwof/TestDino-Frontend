"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiError, isAuthenticated, listKits, type KitSummary } from "@/lib/api";

/** Bare host for a company URL, without the www. prefix. */
function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Tone = "slate" | "amber" | "green" | "red";

/** Badge color per kit status. In-progress states share amber. */
function statusTone(status?: string): Tone {
  switch (status) {
    case "done":
      return "green";
    case "failed":
      return "red";
    case "queued":
      return "slate";
    default:
      return "amber";
  }
}

function statusLabel(status?: string): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function KitsPage() {
  // null = still loading; [] = loaded but empty.
  const [kits, setKits] = useState<KitSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip the fetch when unauthenticated; RequireAuth handles the redirect.
    if (!isAuthenticated()) return;
    let active = true;
    (async () => {
      try {
        const data = await listKits();
        if (active) setKits(data);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your kits. Please try again.",
        );
        setKits([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="My Kits"
        description="Interview prep kits you've created."
        action={<LinkButton href="/kits/new">New kit</LinkButton>}
      />

      <RequireAuth>
      {kits === null ? (
        <Loading message="Loading your kits..." />
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : kits.length === 0 ? (
        <EmptyState
          title="No kits yet"
          description="Create your first interview prep kit to get tailored questions, flashcards, and a study schedule."
          action={<LinkButton href="/kits/new">Create a kit</LinkButton>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {kits.map((kit) => {
            const host = hostOf(kit.input?.company_url);
            return (
              <li key={kit.id}>
                <Link
                  href={`/kits/${encodeURIComponent(kit.id)}`}
                  className="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <Card className="hover:border-slate-300">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-900">
                          {kit.title ?? "Untitled kit"}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          {host ? <span className="truncate">{host}</span> : null}
                          {kit.input?.days ? (
                            <span>
                              {kit.input.days} day{kit.input.days === 1 ? "" : "s"} to prep
                            </span>
                          ) : null}
                          {kit.status === "done" ? (
                            <span>
                              {kit.questionCount ?? 0} question
                              {(kit.questionCount ?? 0) === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Badge tone={statusTone(kit.status)}>
                        {statusLabel(kit.status)}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </RequireAuth>
    </div>
  );
}
