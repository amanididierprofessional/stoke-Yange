/** Browser vs installed-app entry mode */

const KEY = "sy-app-mode";

/** Running as installed PWA (home screen / standalone window). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ios = (window.navigator as any).standalone === true;
  return mq || ios;
}

/** User chose "Open app" or already installed — skip marketing site. */
export function preferApp(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function enterAppMode() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* */
  }
}

/** True → show POS. False → show / redirect to landing. */
export function isAppMode(): boolean {
  return isStandalone() || preferApp();
}
