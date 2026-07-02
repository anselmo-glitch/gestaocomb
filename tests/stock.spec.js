import { describe, expect, it } from "vitest";
import {
  branchAvgPurchasePrice,
  buildAlerts,
  monthConsumption,
  monthLosses,
  monthPurchases,
  tankStock,
  totalStock
} from "../src/core/stock.js";

function baseState() {
  return {
    branches: [
      { id: "b1", name: "Filial A" },
      { id: "b2", name: "Filial B" }
    ],
    tanks: [
      { id: "t1", branchId: "b1", code: "TQ-01", fuelTypeId: "f1", capacityLiters: 30000, minLiters: 5000, active: true },
      { id: "t2", branchId: "b2", code: "TQ-02", fuelTypeId: "f1", capacityLiters: 15000, minLiters: 3000, active: true }
    ],
    purchases: [
      { id: "p1", date: "2026-06-03", branchId: "b1", tankId: "t1", liters: 15000, totalCost: 84000, invoiceNumber: "1" },
      { id: "p2", date: "2026-06-10", branchId: "b2", tankId: "t2", liters: 8000, totalCost: 43600, invoiceNumber: "2" }
    ],
    fuelings: [
      { id: "a1", date: "2026-06-05T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 1200 },
      { id: "a2", date: "2026-06-12T09:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 800 }
    ],
    transfers: [
      { id: "tr1", date: "2026-06-15", fromTankId: "t1", toTankId: "t2", liters: 3000, lossLiters: 20 }
    ],
    inventories: [
      { id: "i1", date: "2026-06-28", tankId: "t1", systemLiters: 10000, physicalLiters: 9850, reason: "Evaporação" }
    ]
  };
}

describe("tankStock", () => {
  it("estoque = entradas − saídas ± ajustes", () => {
    const state = baseState();
    // t1: +15000 −1200 −800 −3000 (transferência) −150 (ajuste) = 9850
    expect(tankStock(state, "t1")).toBe(9850);
    // t2: +8000 +(3000 − 20 perdidos) = 10980
    expect(tankStock(state, "t2")).toBe(10980);
    expect(totalStock(state)).toBe(20830);
  });

  it("perda de transferência sai do saldo global (origem baixa cheio, destino recebe líquido)", () => {
    const state = baseState();
    state.fuelings = [];
    state.inventories = [];
    // t1: 15000 − 3000 = 12000; t2: 8000 + 2980 = 10980 → total 22980 = 23000 − 20
    expect(totalStock(state)).toBe(22980);
  });
});

describe("KPIs mensais", () => {
  it("compras do mês agregadas por filial", () => {
    const result = monthPurchases(baseState(), "2026-06");
    expect(result.cost).toBe(127600);
    expect(result.liters).toBe(23000);
    expect(result.byBranch.get("b1")).toBe(84000);
    expect(result.byBranch.get("b2")).toBe(43600);
  });

  it("consumo do mês por filial", () => {
    const result = monthConsumption(baseState(), "2026-06");
    expect(result.liters).toBe(2000);
    expect(result.byBranch.get("b1")).toBe(2000);
  });

  it("perdas = ajustes negativos de inventário + perdas de transferência", () => {
    expect(monthLosses(baseState(), "2026-06")).toBe(170); // 150 + 20
  });

  it("mês sem lançamentos zera os KPIs", () => {
    expect(monthPurchases(baseState(), "2026-05").cost).toBe(0);
    expect(monthConsumption(baseState(), "2026-05").liters).toBe(0);
    expect(monthLosses(baseState(), "2026-05")).toBe(0);
  });

  it("preço médio de compra da filial no mês", () => {
    expect(branchAvgPurchasePrice(baseState(), "b1", "2026-06")).toBe(5.6);
    // fallback para qualquer mês quando não há compra no mês pedido
    expect(branchAvgPurchasePrice(baseState(), "b1", "2026-07")).toBe(5.6);
  });
});

describe("buildAlerts", () => {
  it("alerta crítico quando estoque abaixo do mínimo", () => {
    const state = baseState();
    state.tanks[0].minLiters = 12000; // estoque calculado é 9850
    const alerts = buildAlerts(state, "2026-06");
    expect(alerts.some((alert) => alert.title.includes("TQ-01") && alert.title.includes("abaixo do mínimo"))).toBe(true);
    expect(alerts[0].severity).toBe("critical");
  });

  it("alerta quando tanque próximo da capacidade", () => {
    const state = baseState();
    state.tanks[1].capacityLiters = 11000; // estoque 10980 → 99,8%
    const alerts = buildAlerts(state, "2026-06");
    expect(alerts.some((alert) => alert.title.includes("TQ-02") && alert.title.includes("capacidade"))).toBe(true);
  });

  it("alerta quando diferença de inventário supera o limite", () => {
    const state = baseState();
    state.inventories[0].physicalLiters = 9500; // -5% > 2%
    const alerts = buildAlerts(state, "2026-06");
    expect(alerts.some((alert) => alert.title.includes("inventário"))).toBe(true);
  });

  it("alerta de consumo anormal comparado à média histórica", () => {
    const state = baseState();
    state.fuelings.push(
      { id: "h1", date: "2026-05-10T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 1000 },
      { id: "h2", date: "2026-04-10T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 1000 }
    );
    // Junho tem 2000 L > 1,3 × média(1000, 1000)
    const alerts = buildAlerts(state, "2026-06");
    expect(alerts.some((alert) => alert.title.includes("Consumo anormal"))).toBe(true);
  });

  it("sem alertas quando tudo dentro dos limites", () => {
    const state = baseState();
    state.inventories = [];
    const alerts = buildAlerts(state, "2026-06");
    expect(alerts).toHaveLength(0);
  });
});
