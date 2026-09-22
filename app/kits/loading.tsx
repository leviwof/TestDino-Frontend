import { PageHeader } from "@/components/PageHeader";

/** Skeleton shown while the kits route segment loads. */
export default function KitsLoading() {
  return (
    <div>
      <PageHeader title="My Kits" description="Interview prep kits you've created." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
