/** Reliable file download for mobile browsers / PWA (must append <a> to DOM). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Some WebViews need a tiny delay before revoke
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

export function downloadText(text: string, filename: string, mime: string) {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}
