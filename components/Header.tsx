"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  getCurrentUser,
  logout,
  type AuthUser,
} from "@/lib/api";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/kits", label: "My Kits" },
  { href: "/kits/new", label: "New Kit" },
];

/** Top navigation with TestDino branding and auth state. */
export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      getCurrentUser().then((u) => {
        if (active) {
          setUser(u);
          setReady(true);
        }
      });
    };
    refresh();
    // React to login/logout from anywhere (this tab or another).
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">
            TD
          </span>
          <span>TestDino</span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}

          {/* Auth controls. Hidden until we know the state to avoid a flash. */}
          {ready ? (
            user ? (
              <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-2">
                <span
                  className="hidden max-w-[12rem] truncate text-slate-500 sm:inline"
                  title={user.email}
                >
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2">
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-700"
                >
                  Sign up
                </Link>
              </div>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
