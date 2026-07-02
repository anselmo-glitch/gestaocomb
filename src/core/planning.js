import { calculateMonth } from "./calculations.js";
import { round, toNumber } from "./format.js";
import { branchAvgPurchasePrice, deviationSettings } from "./stock.js";

// Classificação parametrizável de desvios (padrão: verde ≤3%, amarelo ≤8%, vermelho >8%).
export function classifyDeviation(pctAbs, settings) {
  const abs = Math.abs(toNumber(pctAbs));
  if (abs <= toNumber(settings.greenMaxPct)) return { status: "ok", label: "Normal" };
  if (abs <= toNumber(settings.yellowMaxPct)) return { status: "atencao", label: "Atenção" };
  return { status: "critico", label: "Crítico" };
}

function pctOf(previsto, realizado) {
  return previsto !== 0 ? round(((realizado - previsto) / previsto) * 100, 1) : 0;
}

function scopeBlocks(state, month, scope) {
  const result = calculateMonth(state, month);
  if (!scope || scope.type === "company") {
    return { rows: result.contracts, vehicleRows: result.vehicleRows };
  }
  if (scope.type === "branch") {
    const rows = result.contracts.filter((row) => row.contract.branchId === scope.id);
    const ids = new Set(rows.map((row) => row.contract.id));
    return { rows, vehicleRows: result.vehicleRows.filter((row) => ids.has(row.contract.id)) };
  }
  if (scope.type === "contract") {
    const rows = result.contracts.filter((row) => row.contract.id === scope.id);
    return { rows, vehicleRows: result.vehicleRows.filter((row) => row.contract.id === scope.id) };
  }
  if (scope.type === "vehicle") {
    const vehicleRows = result.vehicleRows.filter((row) => row.vehicle.id === scope.id);
    return { rows: [], vehicleRows, vehicleOnly: true };
  }
  return { rows: result.contracts, vehicleRows: result.vehicleRows };
}

// Painel principal do módulo: Previsto × Realizado para empresa, filial, contrato ou veículo.
export function prevRealPanel(state, month, scope) {
  const settings = deviationSettings(state);
  const { rows, vehicleRows, vehicleOnly } = scopeBlocks(state, month, scope);

  const sum = (list, path) =>
    round(list.reduce((total, row) => total + toNumber(path(row)), 0), 2);

  const source = vehicleOnly ? vehicleRows : rows;
  const planned = {
    liters: sum(source, (row) => row.planned.liters),
    value: sum(source, (row) => row.planned.total),
    km: sum(source, (row) => row.planned.km)
  };
  const realized = {
    liters: sum(source, (row) => row.realized.liters),
    value: sum(source, (row) => row.realized.total),
    km: sum(source, (row) => row.realized.km)
  };
  const avgPrev = planned.liters > 0 ? round(planned.km / planned.liters, 2) : 0;
  const avgReal = realized.liters > 0 ? round(realized.km / realized.liters, 2) : 0;

  const build = (key, indicator, previsto, realizado, decimals = 0) => {
    const diff = round(realizado - previsto, 2);
    const pct = pctOf(previsto, realizado);
    return { key, indicator, previsto, realizado, diff, pct, decimals, ...classifyDeviation(pct, settings) };
  };

  return [
    build("liters", "Diesel (L)", planned.liters, realized.liters),
    build("value", "Valor (R$)", planned.value, realized.value, 2),
    build("km", "Km", planned.km, realized.km),
    build("avg", "Média km/L", avgPrev, avgReal, 2)
  ];
}

// Frota do contrato: km/L previsto × realizado com classificação por veículo.
export function contractFleet(state, month, contractId) {
  const settings = deviationSettings(state);
  const { vehicleRows } = scopeBlocks(state, month, { type: "contract", id: contractId });
  return vehicleRows.map((row) => {
    const kmLPrev = toNumber(row.vehicle.avgKmL);
    const kmLReal = row.realized.liters > 0 ? round(row.realized.km / row.realized.liters, 2) : 0;
    const pct = kmLReal > 0 && kmLPrev > 0 ? round(((kmLReal - kmLPrev) / kmLPrev) * 100, 1) : 0;
    return {
      vehicle: row.vehicle,
      realized: row.realized,
      kmLPrev,
      kmLReal,
      pct,
      ...classifyDeviation(pct, settings),
      hasData: row.realized.liters > 0 || row.realized.km > 0
    };
  });
}

function daysInMonth(month) {
  const [year, monthNumber] = String(month).split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

// Evolução diária acumulada do mês: consumo (L) e custo (R$), previsto × realizado.
// Previsto distribui o planejado linearmente; realizado acumula os abastecimentos por dia.
export function monthlyEvolution(state, month, scope) {
  const { rows, vehicleRows, vehicleOnly } = scopeBlocks(state, month, scope);
  const source = vehicleOnly ? vehicleRows : rows;
  const plannedLiters = source.reduce((sum, row) => sum + toNumber(row.planned.liters), 0);
  const plannedValue = source.reduce((sum, row) => sum + toNumber(row.planned.total), 0);

  const vehicleIds = new Set(
    (vehicleOnly ? vehicleRows : vehicleRows).map((row) => row.vehicle.id)
  );
  const totalDays = daysInMonth(month);
  const litersPerDay = new Array(totalDays).fill(0);
  const costPerDay = new Array(totalDays).fill(0);

  for (const fueling of state.fuelings || []) {
    if (String(fueling.date || "").slice(0, 7) !== month) continue;
    if (vehicleIds.size && fueling.vehicleId && !vehicleIds.has(fueling.vehicleId)) continue;
    const day = Number(String(fueling.date).slice(8, 10));
    if (!day || day > totalDays) continue;
    const liters = toNumber(fueling.liters);
    const price = branchAvgPurchasePrice(state, fueling.branchId, month);
    litersPerDay[day - 1] += liters;
    costPerDay[day - 1] += liters * price;
  }

  const labels = [];
  const prevLiters = [];
  const realLiters = [];
  const prevCost = [];
  const realCost = [];
  let accLiters = 0;
  let accCost = 0;
  for (let day = 1; day <= totalDays; day += 1) {
    labels.push(day);
    accLiters = round(accLiters + litersPerDay[day - 1], 2);
    accCost = round(accCost + costPerDay[day - 1], 2);
    prevLiters.push(round((plannedLiters / totalDays) * day, 2));
    realLiters.push(accLiters);
    prevCost.push(round((plannedValue / totalDays) * day, 2));
    realCost.push(accCost);
  }
  return { labels, prevLiters, realLiters, prevCost, realCost };
}

// Desvios detectados automaticamente no mês (contratos por valor, veículos por km/L).
export function detectDeviations(state, month) {
  const settings = deviationSettings(state);
  const result = calculateMonth(state, month);
  const deviations = [];

  for (const row of result.contracts) {
    if (row.realized.total <= 0 && row.planned.total <= 0) continue;
    const pct = pctOf(row.planned.total, row.realized.total);
    const classified = classifyDeviation(pct, settings);
    if (classified.status === "ok") continue;
    deviations.push({
      scope: "contract",
      refId: row.contract.id,
      name: `${row.contract.code} — ${row.contract.name}`,
      indicator: "Valor (R$)",
      previsto: row.planned.total,
      realizado: row.realized.total,
      pct,
      ...classified
    });
  }

  for (const row of result.vehicleRows) {
    const kmLPrev = toNumber(row.vehicle.avgKmL);
    const kmLReal = row.realized.liters > 0 ? row.realized.km / row.realized.liters : 0;
    if (kmLReal <= 0 || kmLPrev <= 0) continue;
    const pct = round(((kmLReal - kmLPrev) / kmLPrev) * 100, 1);
    const classified = classifyDeviation(pct, settings);
    if (classified.status === "ok") continue;
    deviations.push({
      scope: "vehicle",
      refId: row.vehicle.id,
      name: `${row.vehicle.code} — ${row.vehicle.description}`,
      indicator: "Média km/L",
      previsto: kmLPrev,
      realizado: round(kmLReal, 2),
      pct,
      ...classified
    });
  }

  return deviations.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}

// Rankings para o dashboard e relatórios.
export function contractDeviationRanking(state, month, limit = 5) {
  const result = calculateMonth(state, month);
  return result.contracts
    .filter((row) => row.planned.total > 0)
    .map((row) => ({
      contract: row.contract,
      pct: pctOf(row.planned.total, row.realized.total),
      previsto: row.planned.total,
      realizado: row.realized.total
    }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, limit);
}

export function vehiclePerformanceRanking(state, month, limit = 5) {
  const settings = deviationSettings(state);
  const result = calculateMonth(state, month);
  return result.vehicleRows
    .map((row) => {
      const kmLPrev = toNumber(row.vehicle.avgKmL);
      const kmLReal = row.realized.liters > 0 ? round(row.realized.km / row.realized.liters, 2) : 0;
      const pct = kmLReal > 0 && kmLPrev > 0 ? round(((kmLReal - kmLPrev) / kmLPrev) * 100, 1) : 0;
      return { vehicle: row.vehicle, kmLPrev, kmLReal, pct, ...classifyDeviation(pct, settings) };
    })
    .filter((row) => row.kmLReal > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit);
}
