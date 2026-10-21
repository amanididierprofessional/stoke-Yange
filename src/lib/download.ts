/** Reliable file download for mobile browsers, PWA, and Capacitor WebView. */

function isNativeShell(): boolean {
  try {
    return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

/** Capacitor: write to cache + system Share sheet (Save to Files / Drive / WhatsApp). */
async function nativeSaveViaShare(blob: Blob, filename: string): Promise<boolean> {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const base64 = await blobToBase64(blob);
    const path = `reports/${filename}`;
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({
      title: filename,
      text: "Stoke Yange report",
      url: uri,
      dialogTitle: "Save or share report",
    });
    return true;
  } catch (e) {
    console.warn("[download] native filesystem/share failed", e);
    return false;
  }
}

/**
 * Save a file to the device.
 * On Android/iOS Capacitor: opens Share sheet so user can Save to Files.
 * On web: classic browser download.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  if (isNativeShell()) {
    const ok = await nativeSaveViaShare(blob, filename);
    if (ok) return;

    // Fallback: Web Share API with File
    try {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
      if (typeof navigator.share === "function") {
        if (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      }
    } catch (e) {
      console.warn("[download] navigator.share", e);
    }
  }

  const url = URL.createObjectURL(blob);
  triggerAnchorDownload(url, filename);
}

export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
  if (isNativeShell()) {
    return nativeSaveViaShare(blob, filename);
  }
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
