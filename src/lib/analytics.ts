/** Optional web analytics. Enable Vercel Web Analytics in the Vercel dashboard.
 * PostHog remains disabled until VITE_POSTHOG_KEY is configured. */
let started = false;
export function startAnalytics() {
  if (typeof window === "undefined" || started) return;
  started = true;
  if (!document.querySelector('script[data-stoke-vercel-analytics="true"]')) {
    const script = document.createElement("script");
    script.src = "/_vercel/insights/script.js";
    script.defer = true;
    script.dataset.stokeVercelAnalytics = "true";
    document.head.appendChild(script);
  }
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";
  if (!key || document.querySelector('script[data-stoke-posthog="true"]')) return;
  const loader = document.createElement("script");
  loader.src = "https://us.i.posthog.com/static/array.js";
  loader.async = true;
  loader.dataset.stokePosthog = "true";
  loader.onload = () => {
    const ph = (window as Window & { posthog?: { init?: (key: string, options: Record<string, unknown>) => void } }).posthog;
    ph?.init?.(key, { api_host: host, autocapture: true, capture_pageview: true, person_profiles: "identified_only" });
  };
  loader.onerror = () => console.warn("[analytics] PostHog SDK failed to load");
  document.head.appendChild(loader);
}
