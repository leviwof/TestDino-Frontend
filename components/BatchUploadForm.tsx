"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClasses, textareaClasses } from "@/components/Field";
import {
  ApiError,
  createKitsBatch,
  type BatchKitItem,
  type BatchResult,
} from "@/lib/api";

const MIN_DAYS = 1;
const MAX_DAYS = 60;

const SAMPLE = `[
  {
    "company_url": "https://acme.example.com",
    "days": 7,
    "jd": "Senior Frontend Engineer. React, TypeScript, testing..."
  },
  {
    "company_url": "https://globex.example.com",
    "days": 5,
    "jd": "Backend Engineer. Node.js, PostgreSQL, APIs..."
  }
]`;

interface ParseOutcome {
  items: BatchKitItem[];
  errors: string[];
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Parse pasted/uploaded JSON into validated batch items. `defaultDays` fills
 *  any item that doesn't specify its own. */
function parseInput(raw: string, defaultDays: number): ParseOutcome {
  const errors: string[] = [];
  const items: BatchKitItem[] = [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { items: [], errors: ["File isn't valid JSON. Expected an array of pairs."] };
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] })?.items)
      ? (data as { items: unknown[] }).items
      : null;

  if (!rows) {
    return {
      items: [],
      errors: ['Expected a JSON array like [{ "company_url": "...", "jd": "..." }].'],
    };
  }

  rows.forEach((row, i) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const jd = String(r.jd ?? r.jobDescription ?? r.description ?? "").trim();
    const company_url = String(r.company_url ?? r.companyUrl ?? r.url ?? "").trim();
    const daysRaw = r.days ?? r.daysAvailable;
    const days = daysRaw === undefined || daysRaw === "" ? defaultDays : Number(daysRaw);
    const title = r.title ? String(r.title) : undefined;

    const label = `Row ${i + 1}`;
    if (!jd) {
      errors.push(`${label}: missing job description (jd).`);
      return;
    }
    if (!company_url || !isValidHttpUrl(company_url)) {
      errors.push(`${label}: company_url must be a valid http(s) URL.`);
      return;
    }
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
      errors.push(`${label}: days must be a whole number between ${MIN_DAYS} and ${MAX_DAYS}.`);
      return;
    }
    items.push({ jd, company_url, days, title });
  });

  return { items, errors };
}

export function BatchUploadForm() {
  const [raw, setRaw] = useState("");
  const [defaultDays, setDefaultDays] = useState(5);
  const [parsed, setParsed] = useState<ParseOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reparse = (text: string, days: number) => {
    setResult(null);
    setSubmitError(null);
    setParsed(text.trim() ? parseInput(text, days) : null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    reparse(text, defaultDays);
  };

  const handleSubmit = async () => {
    if (!parsed || parsed.items.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createKitsBatch(parsed.items);
      setResult(res);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Results view ----
  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Batch submitted</p>
          <p className="mt-1 text-sm text-slate-600">
            {result.created} created · {result.duplicates} already existed · {result.failed} failed
            {" "}(of {result.total}).
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {result.results.map((r) => (
            <li
              key={r.index}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-700">{r.company_url}</span>
              {r.ok ? (
                <span className="flex items-center gap-3">
                  <span className={r.existed ? "text-slate-500" : "text-green-700"}>
                    {r.existed ? "Already existed" : "Created"}
                  </span>
                  {r.jobId ? (
                    <Link
                      href={`/jobs/${encodeURIComponent(r.jobId)}`}
                      className="font-medium text-slate-900 underline underline-offset-2"
                    >
                      View progress
                    </Link>
                  ) : r.kitId ? (
                    <Link
                      href={`/kits/${encodeURIComponent(r.kitId)}`}
                      className="font-medium text-slate-900 underline underline-offset-2"
                    >
                      View kit
                    </Link>
                  ) : null}
                </span>
              ) : (
                <span className="text-red-600">{r.message ?? "Failed"}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/kits"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Go to My Kits
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setRaw("");
              setParsed(null);
            }}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Upload another batch
          </button>
        </div>
      </div>
    );
  }

  // ---- Upload / paste view ----
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-600">
          Upload a <code className="rounded bg-slate-100 px-1">.json</code> file (or paste JSON) with
          a list of description-and-company pairs. Each entry needs a{" "}
          <code className="rounded bg-slate-100 px-1">jd</code> and{" "}
          <code className="rounded bg-slate-100 px-1">company_url</code>;{" "}
          <code className="rounded bg-slate-100 px-1">days</code> is optional and falls back to the
          default below.
        </p>
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">Example format</summary>
          <pre className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
{SAMPLE}
          </pre>
        </details>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Upload JSON file" htmlFor="batch-file">
          <input
            id="batch-file"
            type="file"
            accept=".json,application/json"
            onChange={(e) => onFile(e.target.files?.[0])}
            disabled={submitting}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
        </Field>

        <Field label="Default days" htmlFor="batch-days" hint={`${MIN_DAYS}–${MAX_DAYS}`}>
          <input
            id="batch-days"
            type="number"
            min={MIN_DAYS}
            max={MAX_DAYS}
            value={defaultDays}
            onChange={(e) => {
              const d = Number(e.target.value);
              setDefaultDays(d);
              if (raw.trim()) reparse(raw, d);
            }}
            disabled={submitting}
            className={`${inputClasses} max-w-[7rem]`}
          />
        </Field>
      </div>

      <Field label="…or paste JSON" htmlFor="batch-raw">
        <textarea
          id="batch-raw"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            reparse(e.target.value, defaultDays);
          }}
          disabled={submitting}
          className={textareaClasses}
          placeholder={SAMPLE}
        />
      </Field>

      {parsed ? (
        <div className="flex flex-col gap-2">
          {parsed.items.length > 0 ? (
            <p className="text-sm font-medium text-green-700">
              {parsed.items.length} valid {parsed.items.length === 1 ? "kit" : "kits"} ready to create.
            </p>
          ) : null}
          {parsed.errors.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">
                {parsed.errors.length} {parsed.errors.length === 1 ? "issue" : "issues"} — these rows
                will be skipped:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {parsed.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parsed.errors.length > 10 ? <li>…and {parsed.errors.length - 10} more.</li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !parsed || parsed.items.length === 0}
          aria-busy={submitting}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Creating kits…"
            : parsed && parsed.items.length > 0
              ? `Create ${parsed.items.length} ${parsed.items.length === 1 ? "kit" : "kits"}`
              : "Create kits"}
        </button>
      </div>
    </div>
  );
}
