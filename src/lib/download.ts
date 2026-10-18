/** Reliable file download for mobile browsers / PWA (must append <a> to DOM). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  // Prefer Web Share API on mobile when available (iOS Safari often blocks <a download>)
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  if (canShare) {
    try {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
      if (navigator.canShare({ files: [file] })) {
        void navigator
          .share({ files: [file], title: filename })
          .catch(() => {
            // User cancelled or share failed — fall through to classic download
            triggerAnchorDownload(url, filename);
          })
          .finally(() => {
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
          });
        return;
      }
    } catch {
      // Fall through to anchor download
    }
  }

  triggerAnchorDownload(url, filename);
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Some WebViews need a tiny delay before revoke
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 2000);
}

export function downloadText(text: string, filename: string, mime: string) {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

/** Open HTML report in a new tab (more reliable than forced download on iOS). */
export function openHtmlReport(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    // Popup blocked — fall back to download
    downloadBlob(blob, filename);
  } else {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
