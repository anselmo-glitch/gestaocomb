import { round, toNumber } from "./format.js";
import { branchAvgPurchasePrice } from "./stock.js";

function safeDivide(a, b) {
  return toNumber(b) === 0 ? 0 : toNumber(a) / toNumber(b);
}

function monthOf(dateString) {
  return String(dateString || "").slice(0, 7);
}

function aggregateFuelings(state, month) {
  const map = new Map();
  for (const fueling of state.fuelings || []) {
    if (monthOf(fueling.date) !== month || !fueling.vehicleId) continue;
    const liters = toNumber(fueling.liters);
    if (liters <= 0) continue;
    const current = map.get(fueling.vehicleId) || { liters: 0, branchId: fueling.branchId };
    current.liters += liters;
    map.set(fueling.vehicleId, current);
  }
  return map;
}

// Consolida as compras novas (por NF/tanque) com o legado "diesel por filial",
// agregando por filial+mês para alimentar o rateio.
function mergedBranchPurchases(state) {
  const rows = new Map();
  for (const legacy of state.branchFuelPurchases || []) {
    const key = `${legacy.branchId}|${legacy.month}`;
    rows.set(key, {
      id: legacy.id,
      month: legacy.month,
      branchId: legacy.branchId,
      liters: toNumber(legacy.liters),
      totalCost: toNumber(legacy.totalCost)
    });
  }
  for (const purchase of state.purchases || []) {
    const month = monthOf(purchase.date);
    const key = `${purchase.branchId}|${month}`;
    const current = rows.get(key) || { id: `merged_${key}`, month, branchId: purchase.branchId, liters: 0, totalCost: 0 };
    current.liters = round(current.liters + toNumber(purchase.liters), 2);
    current.totalCost = round(current.totalCost + toNumber(purchase.totalCost), 2);
    rows.set(key, current);
  }
  return [...rows.values()];
}

// Estado efetivo do mês: injeta nos lançamentos os litros vindos dos
// abastecimentos (quando não há litros manuais) e consolida as compras.
// Ordem de prioridade dos litros reais: manual > abastecimentos > rateio.
export function effectiveMonthState(state, month) {
  const fuelingsByVehicle = aggregateFuelings(state, month);
  const covered = new Set();
  const entries = (state.monthlyEntries || []).map((entry) => {
    if (entry.month !== month) return entry;
    covered.add(entry.vehicleId);
    const agg = fuelingsByVehicle.get(entry.vehicleId);
    if (!agg || toNumber(entry.actualDieselLiters) > 0) return entry;
    return {
      ...entry,
      actualDieselLiters: round(agg.liters, 2),
      actualDieselPrice: toNumber(entry.actualDieselPrice) || branchAvgPurchasePrice(state, agg.branchId, month),
      dieselFromFuelings: true
    };
  });
  for (const [vehicleId, agg] of fuelingsByVehicle.entries()) {
    if (covered.has(vehicleId)) continue;
    entries.push({
      id: `fuelings_${vehicleId}_${month}`,
      month,
      vehicleId,
      active: true,
      actualKm: 0,
      actualDieselLiters: round(agg.liters, 2),
      actualDieselPrice: branchAvgPurchasePrice(state, agg.branchId, month),
      notes: "",
      dieselFromFuelings: true
    });
  }
  return { ...state, monthlyEntries: entries, branchFuelPurchases: mergedBranchPurchases(state) };
}

export function pumpLiters(vehicle) {
  return round(toNumber(vehicle.pumpLitersHour) * toNumber(vehicle.pumpHours), 4);
}

export function theoreticalLiters(vehicle, km) {
  const average = toNumber(vehicle.avgKmL);
  const roadLiters = average > 0 ? toNumber(km) / average : 0;
  return round(roadLiters + pumpLiters(vehicle), 4);
}

export function plannedVehicleCost(vehicle, contract) {
  const km = toNumber(vehicle.plannedKm);
  const liters = theoreticalLiters(vehicle, km);
  const dieselPrice = toNumber(contract.plannedDieselPrice);
  const diesel = round(liters * dieselPrice);
  const tire = round(km * toNumber(vehicle.tireCpk));
  const maintenance = round(km * toNumber(vehicle.maintenanceCpk));
  return {
    km,
    liters,
    dieselPrice,
    diesel,
    tire,
    maintenance,
    total: round(diesel + tire + maintenance)
  };
}

export function adjustedVehicleCost(vehicle, contract, entry) {
  const km = entry?.active === false ? 0 : toNumber(entry?.actualKm);
  const liters = theoreticalLiters(vehicle, km);
  const dieselPrice = toNumber(contract.plannedDieselPrice);
  const diesel = round(liters * dieselPrice);
  const tire = round(km * toNumber(vehicle.tireCpk));
  const maintenance = round(km * toNumber(vehicle.maintenanceCpk));
  return {
    km,
    liters,
    dieselPrice,
    diesel,
    tire,
    maintenance,
    total: round(diesel + tire + maintenance)
  };
}

export function buildFuelAllocationMap(state, month) {
  const allocation = new Map();
  const entries = state.monthlyEntries.filter((entry) => entry.month === month && entry.active !== false);
  const vehicleById = new Map(state.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const contractById = new Map(state.contracts.map((contract) => [contract.id, contract]));
  const purchasesByBranch = new Map(
    state.branchFuelPurchases
      .filter((purchase) => purchase.month === month)
      .map((purchase) => [purchase.branchId, purchase])
  );

  for (const [branchId, purchase] of purchasesByBranch.entries()) {
    const branchEntries = entries.filter((entry) => {
      const vehicle = vehicleById.get(entry.vehicleId);
      const contract = vehicle ? contractById.get(vehicle.contractId) : null;
      return vehicle && contract && contract.branchId === branchId && toNumber(entry.actualKm) > 0;
    });

    // Litros manuais/abastecidos abatem o pool mesmo sem KM lançado (ex.: equipamento
    // abastecido cujo hodômetro ainda não foi informado) para não duplicar diesel.
    const manualEntries = entries.filter((entry) => {
      const vehicle = vehicleById.get(entry.vehicleId);
      const contract = vehicle ? contractById.get(vehicle.contractId) : null;
      return vehicle && contract && contract.branchId === branchId && toNumber(entry.actualDieselLiters) > 0;
    });
    const manualLiters = manualEntries.reduce((sum, entry) => sum + toNumber(entry.actualDieselLiters), 0);
    const manualCost = manualEntries.reduce((sum, entry) => {
      const vehicle = vehicleById.get(entry.vehicleId);
      const contract = vehicle ? contractById.get(vehicle.contractId) : null;
      const price = toNumber(entry.actualDieselPrice) || toNumber(contract?.plannedDieselPrice);
      return sum + toNumber(entry.actualDieselLiters) * price;
    }, 0);

    const remainingLiters = Math.max(toNumber(purchase.liters) - manualLiters, 0);
    const remainingCost = Math.max(toNumber(purchase.totalCost) - manualCost, 0);
    const branchAvgPrice = safeDivide(purchase.totalCost, purchase.liters);
    const remainingAvgPrice = remainingLiters > 0 ? safeDivide(remainingCost, remainingLiters) : branchAvgPrice;

    const rateable = branchEntries
      .filter((entry) => toNumber(entry.actualDieselLiters) <= 0)
      .map((entry) => {
        const vehicle = vehicleById.get(entry.vehicleId);
        return {
          entry,
          vehicle,
          theoretical: theoreticalLiters(vehicle, entry.actualKm)
        };
      });

    const totalTheoretical = rateable.reduce((sum, row) => sum + row.theoretical, 0);

    if (remainingLiters <= 0 || totalTheoretical <= 0) continue;

    for (const row of rateable) {
      const share = row.theoretical / totalTheoretical;
      allocation.set(row.entry.vehicleId, {
        source: "branch_allocation",
        liters: round(remainingLiters * share, 4),
        price: round(remainingAvgPrice, 4),
        cost: round(remainingLiters * share * remainingAvgPrice),
        share
      });
    }
  }

  return allocation;
}

export function realizedVehicleCost(vehicle, contract, entry, allocation) {
  const active = entry?.active !== false;
  const km = active ? toNumber(entry?.actualKm) : 0;
  const manualLiters = active ? toNumber(entry?.actualDieselLiters) : 0;
  const allocatedLiters = active ? toNumber(allocation?.liters) : 0;
  const liters = manualLiters > 0 ? manualLiters : allocatedLiters;
  const price = manualLiters > 0
    ? (toNumber(entry?.actualDieselPrice) || toNumber(allocation?.price) || toNumber(contract.plannedDieselPrice))
    : (toNumber(allocation?.price) || toNumber(entry?.actualDieselPrice) || toNumber(contract.plannedDieselPrice));
  const diesel = round(liters * price);
  const tire = round(km * toNumber(vehicle.tireCpk));
  const maintenance = round(km * toNumber(vehicle.maintenanceCpk));
  return {
    km,
    liters,
    dieselPrice: price,
    diesel,
    tire,
    maintenance,
    total: round(diesel + tire + maintenance),
    source: manualLiters > 0 ? (entry?.dieselFromFuelings ? "fuelings" : "manual") : allocation?.source || "none"
  };
}

export function calculateVehicleMonth(vehicle, contract, entry, allocation) {
  const planned = plannedVehicleCost(vehicle, contract);
  const adjusted = adjustedVehicleCost(vehicle, contract, entry);
  const realized = realizedVehicleCost(vehicle, contract, entry, allocation);
  const priceVariance = round(realized.liters * (realized.dieselPrice - planned.dieselPrice));
  const consumptionVariance = round((realized.liters - adjusted.liters) * planned.dieselPrice);
  return {
    vehicle,
    contract,
    entry,
    planned,
    adjusted,
    realized,
    variances: {
      volume: round(adjusted.total - planned.total),
      operational: round(realized.total - adjusted.total),
      total: round(realized.total - planned.total),
      price: priceVariance,
      consumption: consumptionVariance
    }
  };
}

export function calculateMonth(rawState, month) {
  const state = effectiveMonthState(rawState, month);
  const vehicleById = new Map(state.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const contractById = new Map(state.contracts.map((contract) => [contract.id, contract]));
  const entryByVehicle = new Map(
    state.monthlyEntries
      .filter((entry) => entry.month === month)
      .map((entry) => [entry.vehicleId, entry])
  );
  const allocationMap = buildFuelAllocationMap(state, month);

  const vehicleRows = state.vehicles.map((vehicle) => {
    const contract = contractById.get(vehicle.contractId) || {};
    const entry = entryByVehicle.get(vehicle.id) || {
      month,
      vehicleId: vehicle.id,
      active: Boolean(vehicle.active),
      actualKm: 0,
      actualDieselLiters: 0,
      actualDieselPrice: 0
    };
    return calculateVehicleMonth(vehicle, contract, entry, allocationMap.get(vehicle.id));
  });

  const contracts = state.contracts.map((contract) => {
    const rows = vehicleRows.filter((row) => row.contract.id === contract.id);
    const fixedCost = contract.active === false ? 0 : toNumber(contract.fixedCostMonthly);
    const sumBlock = (key) => {
      const diesel = rows.reduce((sum, row) => sum + row[key].diesel, 0);
      const tire = rows.reduce((sum, row) => sum + row[key].tire, 0);
      const maintenance = rows.reduce((sum, row) => sum + row[key].maintenance, 0);
      const km = rows.reduce((sum, row) => sum + row[key].km, 0);
      const liters = rows.reduce((sum, row) => sum + row[key].liters, 0);
      return {
        km: round(km),
        liters: round(liters, 4),
        diesel: round(diesel),
        tire: round(tire),
        maintenance: round(maintenance),
        fixed: round(fixedCost),
        total: round(diesel + tire + maintenance + fixedCost),
        costPerKm: km > 0 ? round((diesel + tire + maintenance + fixedCost) / km, 4) : 0
      };
    };
    const planned = sumBlock("planned");
    const adjusted = sumBlock("adjusted");
    const realized = sumBlock("realized");
    return {
      contract,
      rows,
      planned,
      adjusted,
      realized,
      variances: {
        volume: round(adjusted.total - planned.total),
        operational: round(realized.total - adjusted.total),
        total: round(realized.total - planned.total),
        price: round(rows.reduce((sum, row) => sum + row.variances.price, 0)),
        consumption: round(rows.reduce((sum, row) => sum + row.variances.consumption, 0)),
        totalPctVsPlanned: planned.total > 0 ? round((realized.total - planned.total) / planned.total, 4) : 0,
        totalPctVsAdjusted: adjusted.total > 0 ? round((realized.total - adjusted.total) / adjusted.total, 4) : 0
      }
    };
  });

  return { month, vehicleRows, contracts, total: summarizeContractRows(contracts) };
}

export function summarizeContractRows(contractRows) {
  const total = ["planned", "adjusted", "realized"].reduce((acc, key) => {
    acc[key] = round(contractRows.reduce((sum, row) => sum + row[key].total, 0));
    return acc;
  }, {});

  total.km = round(contractRows.reduce((sum, row) => sum + row.realized.km, 0));
  total.liters = round(contractRows.reduce((sum, row) => sum + row.realized.liters, 0), 4);
  total.diesel = round(contractRows.reduce((sum, row) => sum + row.realized.diesel, 0));
  total.tire = round(contractRows.reduce((sum, row) => sum + row.realized.tire, 0));
  total.maintenance = round(contractRows.reduce((sum, row) => sum + row.realized.maintenance, 0));
  total.fixed = round(contractRows.reduce((sum, row) => sum + row.realized.fixed, 0));
  total.volumeVariance = round(total.adjusted - total.planned);
  total.operationalVariance = round(total.realized - total.adjusted);
  total.totalVariance = round(total.realized - total.planned);
  total.totalPctVsPlanned = total.planned > 0 ? round(total.totalVariance / total.planned, 4) : 0;
  total.totalPctVsAdjusted = total.adjusted > 0 ? round(total.operationalVariance / total.adjusted, 4) : 0;
  total.costPerKm = total.km > 0 ? round(total.realized / total.km, 4) : 0;
  return total;
}
