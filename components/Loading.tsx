interface LoadingProps {
  message?: string;
  className?: string;
}

/** Basic loading spinner and message component for async states. */
export function Loading({ message = "Loading...", className = "" }: LoadingProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <svg
        className="h-8 w-8 animate-spin text-slate-700"
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
      {message ? (
        <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>
      ) : null}
      <span className="sr-only">{message}</span>
    </div>
  );
}
