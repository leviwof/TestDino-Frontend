import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
}

/** A link styled as a button. */
export function LinkButton({ href, children, variant = "primary" }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </Link>
  );
}
