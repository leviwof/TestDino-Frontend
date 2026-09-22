"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClasses, textareaClasses } from "@/components/Field";
import { ApiError, createKit, type CreateKitResult } from "@/lib/api";

const MIN_DAYS = 1;
const MAX_DAYS = 60;

type FieldName = "jd" | "company_url" | "days";
type Errors = Partial<Record<FieldName, string>>;

export interface KitFormData {
  jobDescription: string;
  companyUrl: string;
  days: number;
}

interface FormState {
  jd: string;
  company_url: string;
  days: string;
}

const INITIAL: FormState = { jd: "", company_url: "", days: "5" };

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(state: FormState): Errors {
  const errors: Errors = {};

  if (state.jd.trim().length === 0) {
    errors.jd = "Job description is required.";
  }

  const url = state.company_url.trim();
  if (url.length === 0) {
    errors.company_url = "Company URL is required.";
  } else if (!isValidHttpUrl(url)) {
    errors.company_url = "Enter a valid URL starting with http:// or https://.";
  }

  const daysTrimmed = state.days.trim();
  const daysNum = Number(daysTrimmed);
  if (daysTrimmed.length === 0) {
    errors.days = "Preparation days is required.";
  } else if (!Number.isInteger(daysNum) || daysNum < MIN_DAYS || daysNum > MAX_DAYS) {
    errors.days = `Enter a whole number of days between ${MIN_DAYS} and ${MAX_DAYS}.`;
  }

  return errors;
}

interface NewKitFormProps {
  onSubmit?: (data: KitFormData) => Promise<CreateKitResult | void> | CreateKitResult | void;
}

export function NewKitForm({ onSubmit }: NewKitFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (name: FieldName, value: string) => {
    setState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validate(state);
    setErrors(nextErrors);
    const firstError = (["jd", "company_url", "days"] as FieldName[]).find(
      (name) => nextErrors[name],
    );
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const payload: KitFormData = {
        jobDescription: state.jd.trim(),
        companyUrl: state.company_url.trim(),
        days: Number(state.days),
      };

      // Call custom submit handler if provided, otherwise post to /kits via createKit
      const result: CreateKitResult | void = onSubmit
        ? await onSubmit(payload)
        : await createKit(payload);

      if (result) {
        // Use returned kitId, jobId, status
        const { kitId, jobId } = result;

        if (jobId) {
          router.push(`/jobs/${encodeURIComponent(jobId)}`);
        } else if (kitId) {
          router.push(`/kits/${encodeURIComponent(kitId)}`);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.status) {
          case 400:
            setSubmitError(
              err.message || "Please check the form and try again.",
            );
            break;
          case 401:
            setSubmitError(
              err.message || "You need to sign in to create a kit.",
            );
            break;
          case 500:
          case 502:
          case 503:
            setSubmitError(
              "Something went wrong on our end. Please try again.",
            );
            break;
          case 0:
            setSubmitError(
              "Could not reach the server. Check your connection and try again.",
            );
            break;
          default:
            setSubmitError(
              err.message || "Request failed. Please try again.",
            );
            break;
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const describedBy = (name: FieldName, hintId: string) =>
    errors[name] ? `${name}-error` : hintId;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Job description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="jd" className="text-sm font-medium text-slate-700">
          Job description <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id="jd"
          name="jd"
          value={state.jd}
          onChange={(e) => update("jd", e.target.value)}
          disabled={submitting}
          aria-required="true"
          aria-invalid={errors.jd ? true : undefined}
          aria-describedby={describedBy("jd", "jd-hint")}
          className={`${textareaClasses} disabled:cursor-not-allowed disabled:bg-slate-50 ${
            errors.jd ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          placeholder="Paste the target job description here..."
        />
        {errors.jd ? (
          <p id="jd-error" role="alert" className="text-xs font-medium text-red-600">
            {errors.jd}
          </p>
        ) : (
          <p id="jd-hint" className="text-xs text-slate-500">
            Paste the full job posting to generate tailored questions, flashcards, and schedule.
          </p>
        )}
      </div>

      {/* Company URL */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="company_url" className="text-sm font-medium text-slate-700">
          Company URL <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="company_url"
          name="company_url"
          type="url"
          inputMode="url"
          value={state.company_url}
          onChange={(e) => update("company_url", e.target.value)}
          disabled={submitting}
          aria-required="true"
          aria-invalid={errors.company_url ? true : undefined}
          aria-describedby={describedBy("company_url", "company_url-hint")}
          className={`${inputClasses} disabled:cursor-not-allowed disabled:bg-slate-50 ${
            errors.company_url ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          placeholder="https://example.com"
        />
        {errors.company_url ? (
          <p id="company_url-error" role="alert" className="text-xs font-medium text-red-600">
            {errors.company_url}
          </p>
        ) : (
          <p id="company_url-hint" className="text-xs text-slate-500">
            Website of the hiring company (must start with http:// or https://).
          </p>
        )}
      </div>

      {/* Preparation days */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="days" className="text-sm font-medium text-slate-700">
          Preparation days <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="days"
          name="days"
          type="number"
          min={MIN_DAYS}
          max={MAX_DAYS}
          step={1}
          value={state.days}
          onChange={(e) => update("days", e.target.value)}
          disabled={submitting}
          aria-required="true"
          aria-invalid={errors.days ? true : undefined}
          aria-describedby={describedBy("days", "days-hint")}
          className={`${inputClasses} max-w-[8rem] disabled:cursor-not-allowed disabled:bg-slate-50 ${
            errors.days ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          placeholder="5"
        />
        {errors.days ? (
          <p id="days-error" role="alert" className="text-xs font-medium text-red-600">
            {errors.days}
          </p>
        ) : (
          <p id="days-hint" className="text-xs text-slate-500">
            Number of preparation days before your interview ({MIN_DAYS}–{MAX_DAYS}).
          </p>
        )}
      </div>

      {submitError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <p className="font-medium">{submitError}</p>
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
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
              <span>Creating kit...</span>
            </>
          ) : (
            "Generate kit"
          )}
        </button>
        {submitting ? (
          <span className="text-xs text-slate-500" role="status">
            Submitting to server...
          </span>
        ) : null}
      </div>
    </form>
  );
}
