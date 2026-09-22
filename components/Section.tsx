import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  count?: number;
  children: ReactNode;
}

/** A titled content section with an optional item count. */
export function Section({ title, count, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
        {typeof count === "number" ? (
          <span className="ml-2 text-sm font-normal text-slate-500">{count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
