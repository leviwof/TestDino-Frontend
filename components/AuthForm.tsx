"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Field, inputClasses } from "@/components/Field";
import { ApiError, login, registerUser } from "@/lib/api";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

const MIN_PASSWORD = 8;

/** Shared login/register form. On success, lands the user on their kits. */
export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";
  const title = isRegister ? "Create your account" : "Welcome back";
  const cta = isRegister ? "Create account" : "Log in";

  const validate = (): string | null => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address.";
    if (password.length < MIN_PASSWORD)
      return `Password must be at least ${MIN_PASSWORD} characters.`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      if (isRegister) {
        // Register, then log in immediately so the user lands authenticated.
        await registerUser(credentials);
      }
      await login(credentials);
      // Honor ?next=… (set by RequireAuth) but only allow internal paths.
      let dest = "/kits";
      try {
        const next = new URLSearchParams(window.location.search).get("next");
        if (next && next.startsWith("/") && !next.startsWith("//")) dest = next;
      } catch {
        // ignore; fall back to /kits
      }
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {isRegister
            ? "Sign up to build and save your interview prep kits."
            : "Log in to see your kits and keep your progress."}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={inputClasses}
              placeholder="you@example.com"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            hint={isRegister ? `At least ${MIN_PASSWORD} characters.` : undefined}
          >
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={inputClasses}
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Please wait…" : cta}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-slate-900 underline underline-offset-2">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="font-medium text-slate-900 underline underline-offset-2">
                Create an account
              </Link>
            </>
          )}
        </p>
      </Card>
    </div>
  );
}
