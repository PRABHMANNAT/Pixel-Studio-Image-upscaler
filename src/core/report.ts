import type { Entry } from "./queue";

function field(value: string | number | undefined) {
  const text = String(value ?? "");
  // Filenames and error strings can be opened in spreadsheet applications.
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function batchReport(entries: Entry[]) {
  const rows = [
    ["Source", "Status", "Input width", "Input height", "Input bytes", "Export path", "Output width", "Output height", "Output bytes", "Engine", "Error"],
    ...entries.map(({ path, status, input, file, output, error }) => [
      path, status, input?.width, input?.height, file.size, output?.path,
      output?.width, output?.height, output?.blob.size, output ? output.provider ?? "resize" : "", error,
    ]),
  ];
  return "\uFEFF" + rows.map(row => row.map(field).join(",")).join("\r\n") + "\r\n";
}
