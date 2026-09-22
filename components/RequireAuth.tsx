"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Loading } from "@/components/Loading";
import { isAuthenticated } from "@/lib/api";

/**
 * Client-side guard. Redirects to /login (remembering where the user was going)
 * when there's no session token. Renders children only once authenticated.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setAllowed(true);
    } else {
      const next = encodeURIComponent(pathname || "/kits");
      router.replace(`/login?next=${next}`);
    }
  }, [router, pathname]);

  if (!allowed) {
    return (
      <Card>
        <Loading message="Checking your session…" />
      </Card>
    );
  }

  return <>{children}</>;
}
