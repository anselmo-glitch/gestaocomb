import { STORAGE_KEY } from "../core/constants.js";
import { createSeedState, ensureStateShape } from "../core/seed.js";

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedState();
    saveState(seeded);
    return seeded;
  }
  try {
    // ensureStateShape migra estados salvos por versões antigas (coleções novas vazias).
    return ensureStateShape(JSON.parse(raw));
  } catch {
    const seeded = createSeedState();
    saveState(seeded);
    return seeded;
  }
}

export function saveState(state) {
  // JSON (não structuredClone): o estado vem de uma store reativa do Vue e pode
  // conter objetos-Proxy aninhados (ex.: resultado de Array.filter sobre um array
  // reativo), que o structuredClone recusa a clonar (DataCloneError). JSON.stringify
  // atravessa Proxies normalmente e o estado é só dados simples serializáveis.
  const next = JSON.parse(JSON.stringify(state));
  next.meta = {
    ...(next.meta || {}),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetState() {
  const seeded = createSeedState();
  saveState(seeded);
  return seeded;
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  if (!parsed.contracts || !parsed.vehicles || !parsed.monthlyEntries) {
    throw new Error("Arquivo inválido: estrutura principal não encontrada.");
  }
  return saveState(ensureStateShape(parsed));
}
