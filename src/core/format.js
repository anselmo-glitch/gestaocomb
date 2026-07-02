export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  let normalized = String(value).replace(/\s/g, "").replace(/R\$/gi, "");
  if (normalized.includes(",")) {
    // Formato brasileiro: ponto é separador de milhar, vírgula é decimal.
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if ((normalized.match(/\./g) || []).length > 1) {
    // Vários pontos sem vírgula: só podem ser separadores de milhar.
    normalized = normalized.replace(/\./g, "");
  }
  // Um único ponto sem vírgula é decimal — é o formato que os campos
  // numéricos do navegador enviam ("5.29" significa 5,29).
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

export function pct(value, decimals = 1) {
  return `${round(value * 100, decimals)}%`;
}

export function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(toNumber(value));
}

export function number(value, decimals = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(toNumber(value));
}

export function integer(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

export function monthLabel(month) {
  if (!month) return "Mês não informado";
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
