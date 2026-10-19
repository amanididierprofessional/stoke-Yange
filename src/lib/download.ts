/** Reliable file download for mobile browsers, PWA, and Capacitor WebView. */

function isNativeShell(): boolean {
  try {
    // Capacitor injects this on Android/iOS
    return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  // Avoid target=_blank on native — opens empty tab and kills the download in WebView
  if (!isNativeShell()) a.target = "_blank";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

/** Force download via data-URL (works better in some Android WebViews). */
function triggerDataUrlDownload(blob: Blob, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      try {
        const a = document.createElement("a");
        a.href = String(reader.result);
        a.download = filename;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        window.setTimeout(() => a.remove(), 2000);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Save a file to the device.
 * Does NOT auto-open the system Share sheet (that only showed a toast before).
 * Share is available via shareBlob() if the user wants it.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);

  // 1) Classic <a download> (Chrome / desktop / many Android browsers)
  try {
    triggerAnchorDownload(url, filename);
  } catch {
    /* continue */
  }

  // 2) Data-URL fallback for Capacitor / stubborn WebViews
  if (isNativeShell()) {
    try {
      await triggerDataUrlDownload(blob, filename);
      return;
    } catch (e) {
      console.warn("[download] data-url failed", e);
    }
  }

  // 3) Optional share as last resort on native (user must pick Save / Files / Drive)
  if (isNativeShell() && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {
      // User cancelled share — still ok; anchor may have worked
      console.warn("[download] share", e);
    }
  }
}

/** Explicit share action (optional button). */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch {
    return false;
  }
}

export function downloadText(text: string, filename: string, mime: string) {
  return downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

/** Open HTML report in a new tab (more reliable than forced download on iOS). */
export function openHtmlReport(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    void downloadBlob(blob, filename);
  } else {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
