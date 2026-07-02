import { toNumber } from "./format.js";

// Números no CSV saem com vírgula decimal para o Excel pt-BR (separador de campo é ";").
export function csvNumber(value, decimals = 2) {
  return toNumber(value).toFixed(decimals).replace(".", ",");
}

function encodeCell(value) {
  const text = String(value ?? "");
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(";")];
  for (const row of rows) {
    lines.push(headers.map((header) => encodeCell(row[header])).join(";"));
  }
  return lines.join("\n");
}

export function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
