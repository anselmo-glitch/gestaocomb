import { DEFAULT_DEVIATION_SETTINGS } from "./constants.js";
import { round, toNumber } from "./format.js";

// Motor de estoque por tanque.
// Estoque atual = compras + transferências recebidas − transferências enviadas
//                − abastecimentos + ajustes de inventário.
// A perda declarada na transferência sai no destino: a origem baixa os litros
// enviados e o destino recebe (litros − perda).

export function deviationSettings(state) {
  return { ...DEFAULT_DEVIATION_SETTINGS, ...(state.deviationSettings || {}) };
}

function monthOf(dateString) {
  return String(dateString || "").slice(0, 7);
}

export function tankMovements(state, tankId) {
  const movements = [];
  for (const purchase of state.purchases || []) {
    if (purchase.tankId !== tankId) continue;
    movements.push({
      date: purchase.date,
      type: "purchase",
      liters: toNumber(purchase.liters),
      refId: purchase.id,
      description: `Compra NF ${purchase.invoiceNumber || "s/nº"}`
    });
  }
  for (const fueling of state.fuelings || []) {
    if (fueling.tankId !== tankId) continue;
    movements.push({
      date: fueling.date,
      type: "fueling",
      liters: -toNumber(fueling.liters),
      refId: fueling.id,
      description: "Abastecimento"
    });
  }
  for (const transfer of state.transfers || []) {
    if (transfer.fromTankId === tankId) {
      movements.push({
        date: transfer.date,
        type: "transfer_out",
        liters: -toNumber(transfer.liters),
        refId: transfer.id,
        description: "Transferência enviada"
      });
    }
    if (transfer.toTankId === tankId) {
      movements.push({
        date: transfer.date,
        type: "transfer_in",
        liters: round(toNumber(transfer.liters) - toNumber(transfer.lossLiters), 2),
        refId: transfer.id,
        description: "Transferência recebida"
      });
    }
  }
  for (const inventory of state.inventories || []) {
    if (inventory.tankId !== tankId) continue;
    movements.push({
      date: inventory.date,
      type: "adjustment",
      liters: round(toNumber(inventory.physicalLiters) - toNumber(inventory.systemLiters), 2),
      refId: inventory.id,
      description: `Ajuste de inventário (${inventory.reason || "sem motivo"})`
    });
  }
  return movements.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function tankStock(state, tankId) {
  return round(tankMovements(state, tankId).reduce((sum, movement) => sum + movement.liters, 0), 2);
}

export function branchStock(state, branchId) {
  return round(
    (state.tanks || [])
      .filter((tank) => tank.branchId === branchId)
      .reduce((sum, tank) => sum + tankStock(state, tank.id), 0),
    2
  );
}

export function totalStock(state) {
  return round((state.tanks || []).reduce((sum, tank) => sum + tankStock(state, tank.id), 0), 2);
}

// Perdas do mês: ajustes de inventário negativos + perdas declaradas em transferências.
export function monthLosses(state, month) {
  const inventoryLoss = (state.inventories || [])
    .filter((inventory) => monthOf(inventory.date) === month)
    .reduce((sum, inventory) => {
      const diff = toNumber(inventory.physicalLiters) - toNumber(inventory.systemLiters);
      return sum + (diff < 0 ? -diff : 0);
    }, 0);
  const transferLoss = (state.transfers || [])
    .filter((transfer) => monthOf(transfer.date) === month)
    .reduce((sum, transfer) => sum + toNumber(transfer.lossLiters), 0);
  return round(inventoryLoss + transferLoss, 2);
}

export function monthPurchases(state, month) {
  const rows = (state.purchases || []).filter((purchase) => monthOf(purchase.date) === month);
  return {
    liters: round(rows.reduce((sum, row) => sum + toNumber(row.liters), 0), 2),
    cost: round(rows.reduce((sum, row) => sum + toNumber(row.totalCost), 0), 2),
    byBranch: groupSum(rows, (row) => row.branchId, (row) => toNumber(row.totalCost))
  };
}

export function monthConsumption(state, month) {
  const rows = (state.fuelings || []).filter((fueling) => monthOf(fueling.date) === month);
  return {
    liters: round(rows.reduce((sum, row) => sum + toNumber(row.liters), 0), 2),
    byBranch: groupSum(rows, (row) => row.branchId, (row) => toNumber(row.liters))
  };
}

function groupSum(rows, keyFn, valueFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, round((map.get(key) || 0) + valueFn(row), 2));
  }
  return map;
}

// Preço médio do litro comprado pela filial no mês (fallback: qualquer mês).
export function branchAvgPurchasePrice(state, branchId, month) {
  const inMonth = (state.purchases || []).filter(
    (purchase) => purchase.branchId === branchId && monthOf(purchase.date) === month
  );
  const rows = inMonth.length
    ? inMonth
    : (state.purchases || []).filter((purchase) => purchase.branchId === branchId);
  const liters = rows.reduce((sum, row) => sum + toNumber(row.liters), 0);
  const cost = rows.reduce((sum, row) => sum + toNumber(row.totalCost), 0);
  return liters > 0 ? round(cost / liters, 4) : 0;
}

// Alertas automáticos exibidos no dashboard.
export function buildAlerts(state, month) {
  const settings = deviationSettings(state);
  const alerts = [];

  for (const tank of state.tanks || []) {
    if (tank.active === false) continue;
    const stock = tankStock(state, tank.id);
    const capacity = toNumber(tank.capacityLiters);
    if (toNumber(tank.minLiters) > 0 && stock < toNumber(tank.minLiters)) {
      alerts.push({
        severity: "critical",
        icon: "tank",
        title: `Tanque ${tank.code} abaixo do mínimo`,
        detail: `Estoque ${stock.toLocaleString("pt-BR")} L · mínimo ${toNumber(tank.minLiters).toLocaleString("pt-BR")} L`
      });
    }
    if (capacity > 0 && stock > capacity * (settings.capacityAlertPct / 100)) {
      alerts.push({
        severity: "warning",
        icon: "tank",
        title: `Tanque ${tank.code} próximo da capacidade`,
        detail: `Estoque ${stock.toLocaleString("pt-BR")} L de ${capacity.toLocaleString("pt-BR")} L (${round((stock / capacity) * 100, 1)}%)`
      });
    }
  }

  for (const inventory of state.inventories || []) {
    if (monthOf(inventory.date) !== month) continue;
    const system = toNumber(inventory.systemLiters);
    const diff = toNumber(inventory.physicalLiters) - system;
    const pct = system > 0 ? Math.abs(diff / system) * 100 : 0;
    if (pct > settings.inventoryAlertPct) {
      const tank = (state.tanks || []).find((row) => row.id === inventory.tankId);
      alerts.push({
        severity: "critical",
        icon: "clipboard",
        title: `Diferença de inventário no tanque ${tank?.code || inventory.tankId}`,
        detail: `${diff > 0 ? "+" : ""}${round(diff, 1).toLocaleString("pt-BR")} L (${round(pct, 1)}%) · motivo: ${inventory.reason || "não informado"}`
      });
    }
  }

  // Consumo anormal: mês corrente acima do fator sobre a média dos meses anteriores.
  const byBranchNow = monthConsumption(state, month).byBranch;
  const previousMonths = [...new Set((state.fuelings || []).map((row) => monthOf(row.date)))]
    .filter((m) => m && m < month);
  if (previousMonths.length) {
    for (const [branchId, liters] of byBranchNow.entries()) {
      const history = previousMonths
        .map((m) => monthConsumption(state, m).byBranch.get(branchId) || 0)
        .filter((value) => value > 0);
      if (!history.length) continue;
      const average = history.reduce((sum, value) => sum + value, 0) / history.length;
      if (liters > average * settings.consumptionAlertFactor) {
        const branch = (state.branches || []).find((row) => row.id === branchId);
        alerts.push({
          severity: "warning",
          icon: "fuel",
          title: `Consumo anormal em ${branch?.name || branchId}`,
          detail: `${liters.toLocaleString("pt-BR")} L no mês · média histórica ${round(average, 0).toLocaleString("pt-BR")} L`
        });
      }
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}
