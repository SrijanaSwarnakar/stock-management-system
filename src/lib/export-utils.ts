"use client";

/**
 * Trigger CSV download in the browser
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const csvRows: string[] = [];

  // Add header
  csvRows.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","));

  // Add data rows
  for (const row of rows) {
    const escaped = row.map((cell) => {
      const val = cell === null || cell === undefined ? "" : String(cell);
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(escaped.join(","));
  }

  const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser print for PDF export
 */
export function triggerPrint() {
  window.print();
}
