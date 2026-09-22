import { API_BASE_URL } from "@/lib/config";

/**
 * Thin client for the TestDino backend. Only the calls needed so far are here.
 * Errors are normalized to ApiError with an HTTP status (0 for network failure)
 * and, when available, the backend's error code.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "testdino_token";
/** Fired on the window whenever the stored token changes (login/logout). */
export const AUTH_CHANGED_EVENT = "testdino-auth-changed";

/** Read the stored auth token (browser only). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist the auth token and notify listeners (e.g. the header). */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {
    // ignore storage failures
  }
}

/** Clear the auth token (logout) and notify listeners. */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/** True when a token is present (does not verify it server-side). */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/** Bearer token headers for authenticated requests (synchronous). */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Async variant kept for call-site compatibility. Unlike before, it does NOT
 * auto-provision an anonymous account — the user must log in.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  return authHeaders();
}

// ---- Auth ----

export interface AuthUser {
  id: string;
  email: string;
}

/** POST /auth/register — create an account (does not log in). */
export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 409
        ? "An account with that email already exists. Try logging in."
        : messageForError(res.status, body);
    throw new ApiError(message, res.status, body?.error?.code);
  }
  return body.user as AuthUser;
}

/** POST /auth/login — authenticate and store the token. */
export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      res.status === 401
        ? "Incorrect email or password."
        : messageForError(res.status, body);
    throw new ApiError(message, res.status, body?.error?.code);
  }
  if (!body?.token) {
    throw new ApiError("Unexpected response from the server.", res.status);
  }
  setToken(body.token);
  return body.user as AuthUser;
}

/** Clear the current session. */
export function logout(): void {
  clearToken();
}

/** GET /auth/me — the current user, or null if not authenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders() });
  } catch {
    return null;
  }
  if (res.status === 401) {
    clearToken();
    return null;
  }
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return (body?.user as AuthUser) ?? null;
}

/** Human-friendly message per failure, preferring a safe server message. */
function messageForError(status: number, body: { error?: { message?: string } } | null): string {
  switch (status) {
    case 400:
      return body?.error?.message ?? "Please check the form and try again.";
    case 401:
      return body?.error?.message ?? "You need to sign in to create a kit.";
    case 403:
      return body?.error?.message ?? "You don't have permission to do that.";
    case 500:
    case 502:
    case 503:
      return "Something went wrong on our end. Please try again.";
    default:
      return body?.error?.message ?? "Request failed. Please try again.";
  }
}

export type JobStatus = "queued" | "crawling" | "generating" | "done" | "failed";

/** Live progress reported by the backend while a job runs. */
export interface JobProgress {
  /** Machine-readable pipeline stage key (e.g. "crawl", "questions"). */
  step: string;
  /** The exact sentence to show the waiting user. */
  message: string;
  updatedAt?: string;
}

export interface JobStatusResult {
  jobId: string;
  kitId: string;
  status: JobStatus;
  /** Present once the pipeline has reported a stage. */
  progress?: JobProgress;
  error?: { code: string; message: string };
  createdAt?: string;
  updatedAt?: string;
}

/** GET /jobs/:id — fetch the current status of a generation job. */
export async function getJob(jobId: string): Promise<JobStatusResult> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      headers,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type JobResponse = { job?: JobStatusResult; error?: { code?: string; message?: string } };
  let body: JobResponse | null = null;
  try {
    body = (await res.json()) as JobResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const status = res.status;
    const message =
      status === 404 ? "We couldn't find that job." : messageForError(status, body);
    throw new ApiError(message, status, body?.error?.code);
  }
  if (!body?.job?.status) {
    throw new ApiError("Unexpected response from the server.", res.status);
  }
  return body.job;
}

// ---- Kit details ----

export interface KitRequirement {
  id: string;
  text: string;
  kind: string;
  priority: string;
}

export type QuestionOrigin = "generated" | "user";

export interface KitQuestion {
  id: string;
  requirement_ids: string[];
  category: string;
  prompt: string;
  answer_outline?: string;
  difficulty: number;
  origin?: QuestionOrigin;
  edited?: boolean;
  pinned?: boolean;
  order?: number;
}

export interface KitFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids?: string[];
  category?: string;
  difficulty?: number;
  origin?: QuestionOrigin;
  edited?: boolean;
  pinned?: boolean;
  order?: number;
}

export interface KitScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface KitDetails {
  id: string;
  title?: string;
  status?: string;
  company_brief?: { summary: string; what_they_do: string; sources: string[] };
  role?: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: KitRequirement[];
  };
  questions?: KitQuestion[];
  flashcards?: KitFlashcard[];
  schedule?: { days_available: number; days: KitScheduleDay[] };
  coverage?: { uncovered_requirement_ids: string[]; passes: number };
}

export interface KitSummary {
  id: string;
  title?: string;
  input?: { jd: string; company_url: string; days: number };
  status?: string;
  questionCount?: number;
}

/** GET /kits — list the authenticated user's kits (newest first). */
export async function listKits(): Promise<KitSummary[]> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits`, { headers });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type KitsResponse = { kits?: KitSummary[]; error?: { code?: string; message?: string } };
  let body: KitsResponse | null = null;
  try {
    body = (await res.json()) as KitsResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(messageForError(res.status, body), res.status, body?.error?.code);
  }
  return body?.kits ?? [];
}

/** GET /kits/:id — fetch a kit for the authenticated user. */
export async function getKit(kitId: string): Promise<KitDetails> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits/${encodeURIComponent(kitId)}`, {
      headers,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type KitResponse = { kit?: KitDetails; error?: { code?: string; message?: string } };
  let body: KitResponse | null = null;
  try {
    body = (await res.json()) as KitResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      res.status === 404 ? "We couldn't find that kit." : messageForError(res.status, body);
    throw new ApiError(message, res.status, body?.error?.code);
  }
  if (!body?.kit) {
    throw new ApiError("Unexpected response from the server.", res.status);
  }
  return body.kit;
}

export interface RegenerateResult {
  id?: string;
  jobId?: string;
  section?: string | null;
}

/** Sections that can be regenerated independently. */
export type RegenerateSection =
  | "company_brief"
  | "role"
  | "questions"
  | "flashcards"
  | "schedule"
  | "coverage";

/**
 * POST /kits/:id/regenerate — re-generate a kit (preserving edited/pinned items).
 * Pass a `section` to regenerate only that part; edits in other sections are
 * left untouched. Omit it to regenerate the whole kit.
 */
export async function regenerateKit(
  kitId: string,
  section?: RegenerateSection,
): Promise<RegenerateResult> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/regenerate`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(section ? { section } : {}),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type RegenResponse = {
    id?: string;
    jobId?: string;
    section?: string | null;
    error?: { code?: string; message?: string };
  };
  let body: RegenResponse | null = null;
  try {
    body = (await res.json()) as RegenResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    let message: string;
    if (res.status === 404) message = "We couldn't find that kit.";
    else if (res.status === 409)
      message = "This kit hasn't finished generating yet, so there's nothing to regenerate.";
    else message = messageForError(res.status, body);
    throw new ApiError(message, res.status, body?.error?.code);
  }

  return { id: body?.id, jobId: body?.jobId, section: body?.section ?? null };
}

export interface CreateKitInput {
  jobDescription: string;
  companyUrl: string;
  days: number;
}

export interface CreateKitResult {
  kitId: string;
  jobId?: string;
  status?: string;
}

/** POST /kits — create a kit and enqueue its generation job. */
export async function createKit(input: CreateKitInput): Promise<CreateKitResult> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      // Map the form's fields to the backend contract (jd / company_url / days)
      // while also including the explicit client field names.
      body: JSON.stringify({
        jd: input.jobDescription,
        company_url: input.companyUrl,
        days: input.days,
        jobDescription: input.jobDescription,
        companyUrl: input.companyUrl,
      }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type CreateKitResponse = Partial<CreateKitResult> & {
    error?: { code?: string; message?: string };
  };
  let body: CreateKitResponse | null = null;
  try {
    body = (await res.json()) as CreateKitResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(messageForError(res.status, body), res.status, body?.error?.code);
  }
  if (!body?.kitId) {
    throw new ApiError("Unexpected response from the server.", res.status);
  }

  return { kitId: body.kitId, jobId: body.jobId, status: body.status };
}

// ---- Batch create ----

export interface BatchKitItem {
  jd: string;
  company_url: string;
  days: number;
  title?: string;
}

export interface BatchResultItem {
  index: number;
  ok: boolean;
  kitId?: string;
  jobId?: string;
  status?: string;
  existed?: boolean;
  company_url: string;
  error?: string;
  message?: string;
}

export interface BatchResult {
  total: number;
  created: number;
  duplicates: number;
  failed: number;
  results: BatchResultItem[];
}

/** POST /kits/batch — create many kits at once from a list of pairs. */
export async function createKitsBatch(items: BatchKitItem[]): Promise<BatchResult> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits/batch`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ items }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type BatchResponse = Partial<BatchResult> & {
    error?: { code?: string; message?: string };
  };
  let body: BatchResponse | null = null;
  try {
    body = (await res.json()) as BatchResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(messageForError(res.status, body), res.status, body?.error?.code);
  }
  return {
    total: body?.total ?? items.length,
    created: body?.created ?? 0,
    duplicates: body?.duplicates ?? 0,
    failed: body?.failed ?? 0,
    results: body?.results ?? [],
  };
}

// ---- Practice Mode ----

export interface PracticeItem {
  id: string;
  type: "question" | "flashcard";
  content: string;
  prompt?: string;
  answer_outline?: string;
  front?: string;
  back?: string;
  difficulty: number;
  confidence: number | null;
  seen: boolean;
  seen_status?: boolean | string;
  is_seen?: boolean;
  section: string;
  category?: string;
  requirement_ids?: string[];
  pinned?: boolean;
  origin?: string;
  edited?: boolean;
}

export interface PracticeResponse {
  kitId: string;
  items: PracticeItem[];
  total: number;
}

/** GET /kits/:id/practice — fetch confidence-weighted sorted practice items. */
export async function getPracticeItems(kitId: string): Promise<PracticeItem[]> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/practice`, {
      headers,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  type PracticeApiResponse = {
    kitId?: string;
    items?: PracticeItem[];
    practice?: PracticeItem[];
    practiceItems?: PracticeItem[];
    total?: number;
    error?: { code?: string; message?: string };
  };

  let body: PracticeApiResponse | null = null;
  try {
    body = (await res.json()) as PracticeApiResponse;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      res.status === 404 ? "We couldn't find that kit." : messageForError(res.status, body);
    throw new ApiError(message, res.status, body?.error?.code);
  }

  return body?.items ?? body?.practice ?? body?.practiceItems ?? [];
}

/**
 * POST /kits/:id/practice/:itemId — persist a self-rated confidence (1–5) for
 * one item, marking it seen. Lets coverage survive reloads and future sessions.
 */
export async function recordPractice(
  kitId: string,
  itemId: string,
  confidence: number,
): Promise<void> {
  const headers = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/kits/${encodeURIComponent(kitId)}/practice/${encodeURIComponent(itemId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ confidence }),
      },
    );
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      "network_error",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(messageForError(res.status, body), res.status, body?.error?.code);
  }
}
