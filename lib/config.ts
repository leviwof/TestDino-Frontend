/**
 * Frontend runtime configuration.
 *
 * The backend base URL is read from NEXT_PUBLIC_API_BASE_URL (exposed to the
 * browser by Next.js and baked in at build time). If it isn't set, we fall back
 * to the deployed backend so the app works out of the box. To point at a local
 * backend during development, set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000.
 */
const DEFAULT_API_BASE_URL = "https://testdino-backend.onrender.com";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
