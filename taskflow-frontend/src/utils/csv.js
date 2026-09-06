/**
 * exportToCsv — Robust browser utility to export tabular data to a CSV file.
 *
 * Designed to work across Chrome, Safari, Edge, Firefox on macOS/Windows.
 * Solves:
 * 1. Immediate URL.revokeObjectURL canceling downloads in Chromium.
 * 2. UTF-8 BOM encoding for Microsoft Excel & Apple Numbers compatibility.
 * 3. Sanitized filenames avoiding illegal characters.
 * 4. Fallback to direct data URI if Blob URL fails.
 */
export function exportToCsv(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const cleanFilename = (filename.endsWith(".csv") ? filename : `${filename}.csv`)
    .replace(/[/\\?%*:|"<>]/g, "_");

  const BOM = "\ufeff";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Modern browsers: Blob URL with persistent delay
  if (typeof URL !== "undefined" && URL.createObjectURL) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = cleanFilename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // CRITICAL: Delay revocation by 60 seconds so the browser download manager
    // has completed transferring the file to disk before the blob is revoked.
    setTimeout(() => {
      try {
        if (link.parentNode) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 60000);
    return;
  }

  // Fallback: Data URI
  const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(BOM + csvContent);
  const link = document.createElement("a");
  link.href = encodedUri;
  link.download = cleanFilename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (link.parentNode) document.body.removeChild(link);
    } catch (_) {}
  }, 1000);
}
