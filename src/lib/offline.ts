import { Capacitor } from "@capacitor/core";

/** The only app-shell worker registrar. Never cache editor or native sessions. */
export async function registerOfflineApp() {
  if (!("serviceWorker" in navigator)) return;
  const host = window.location.hostname;
  const preview = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]
    .some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
    host.startsWith("id-preview--") || host.startsWith("preview--");
  const refused = !import.meta.env.PROD || window.self !== window.top || preview ||
    Capacitor.isNativePlatform() || new URLSearchParams(window.location.search).get("sw") === "off";
  if (refused) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) =>
      [registration.active, registration.waiting, registration.installing].some((worker) =>
        worker && new URL(worker.scriptURL).pathname === "/sw.js"),
    ).map((registration) => registration.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}