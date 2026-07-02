import { describe, expect, it } from "vitest";
import { calculateMonth, summarizeContractRows, theoreticalLiters } from "../src/core/calculations.js";

function baseState() {
  return {
    branches: [{ id: "b1", name: "Pojuca" }],
    contracts: [{ id: "c1", code: "C1", branchId: "b1", plannedDieselPrice: 5, fixedCostMonthly: 1000, active: true }],
    vehicles: [
      { id: "v1", contractId: "c1", code: "V1", plannedKm: 1000, avgKmL: 2, pumpLitersHour: 0, pumpHours: 0, tireCpk: 0.1, maintenanceCpk: 0.2, active: true },
      { id: "v2", contractId: "c1", code: "V2", plannedKm: 9000, avgKmL: 3, pumpLitersHour: 0, pumpHours: 0, tireCpk: 0.1, maintenanceCpk: 0.2, active: true }
    ],
    monthlyEntries: [
      { id: "e1", month: "2026-06", vehicleId: "v1", active: true, actualKm: 100, actualDieselLiters: 60, actualDieselPrice: 6 },
      { id: "e2", month: "2026-06", vehicleId: "v2", active: true, actualKm: 5000, actualDieselLiters: 0, actualDieselPrice: 0 }
    ],
    branchFuelPurchases: [{ id: "f1", month: "2026-06", branchId: "b1", liters: 1060, totalCost: 6360 }]
  };
}

describe("theoreticalLiters", () => {
  it("é km / média + bomba", () => {
    expect(theoreticalLiters({ avgKmL: 2, pumpLitersHour: 0, pumpHours: 0 }, 1000)).toBe(500);
    expect(theoreticalLiters({ avgKmL: 2, pumpLitersHour: 8, pumpHours: 10 }, 1000)).toBe(580);
    expect(theoreticalLiters({ avgKmL: 0, pumpLitersHour: 0, pumpHours: 0 }, 1000)).toBe(0);
  });
});

describe("calculateMonth", () => {
  it("não redistribui o KM realizado por veículo", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const v1 = result.vehicleRows.find((row) => row.vehicle.id === "v1");
    const v2 = result.vehicleRows.find((row) => row.vehicle.id === "v2");
    expect(v1.realized.km).toBe(100);
    expect(v2.realized.km).toBe(5000);
  });

  it("respeita litros manuais e rateia apenas para quem não informou", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const v1 = result.vehicleRows.find((row) => row.vehicle.id === "v1");
    const v2 = result.vehicleRows.find((row) => row.vehicle.id === "v2");
    expect(v1.realized.liters).toBe(60);
    expect(v1.realized.diesel).toBe(360);
    expect(v1.realized.source).toBe("manual");
    expect(v2.realized.liters).toBe(1000);
    expect(v2.realized.diesel).toBe(6000);
    expect(v2.realized.source).toBe("branch_allocation");
  });

  it("lança pneu e manutenção pelo KM mesmo com diesel rateado", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const v2 = result.vehicleRows.find((row) => row.vehicle.id === "v2");
    expect(v2.realized.tire).toBe(500);
    expect(v2.realized.maintenance).toBe(1000);
  });

  it("separa desvios de preço e consumo", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const v1 = result.vehicleRows.find((row) => row.vehicle.id === "v1");
    expect(v1.variances.price).toBe(60);
    expect(v1.variances.consumption).toBe(50);
  });

  it("sem compra da filial, veículo sem litros manuais fica sem diesel mas mantém pneu/manutenção", () => {
    const state = baseState();
    state.branchFuelPurchases = [];
    const result = calculateMonth(state, "2026-06");
    const v2 = result.vehicleRows.find((row) => row.vehicle.id === "v2");
    expect(v2.realized.liters).toBe(0);
    expect(v2.realized.diesel).toBe(0);
    expect(v2.realized.source).toBe("none");
    expect(v2.realized.tire).toBe(500);
    expect(v2.realized.maintenance).toBe(1000);
  });

  it("entrada inativa zera o realizado e o ajustado do veículo", () => {
    const state = baseState();
    state.monthlyEntries[1].active = false;
    const result = calculateMonth(state, "2026-06");
    const v2 = result.vehicleRows.find((row) => row.vehicle.id === "v2");
    expect(v2.realized.km).toBe(0);
    expect(v2.realized.total).toBe(0);
    expect(v2.adjusted.total).toBe(0);
  });

  it("custo fixo do contrato entra uma vez por bloco e zera com contrato inativo", () => {
    const state = baseState();
    const active = calculateMonth(state, "2026-06");
    expect(active.contracts[0].realized.fixed).toBe(1000);
    state.contracts[0].active = false;
    const inactive = calculateMonth(state, "2026-06");
    expect(inactive.contracts[0].realized.fixed).toBe(0);
  });

  it("mês sem lançamentos zera realizado e mantém programado", () => {
    const result = calculateMonth(baseState(), "2026-05");
    const contract = result.contracts[0];
    expect(contract.planned.total).toBeGreaterThan(0);
    expect(contract.realized.km).toBe(0);
    expect(contract.realized.diesel).toBe(0);
  });
});

describe("summarizeContractRows", () => {
  it("bate com os totais do mês completo", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const summary = summarizeContractRows(result.contracts);
    expect(summary.realized).toBeCloseTo(result.total.realized, 2);
    expect(summary.planned).toBeCloseTo(result.total.planned, 2);
    expect(summary.operationalVariance).toBeCloseTo(result.total.operationalVariance, 2);
    expect(summary.costPerKm).toBeCloseTo(result.total.costPerKm, 2);
  });

  it("total consolidado soma diesel, pneu, manutenção e fixos", () => {
    const result = calculateMonth(baseState(), "2026-06");
    const total = result.total;
    expect(total.realized).toBeCloseTo(total.diesel + total.tire + total.maintenance + total.fixed, 2);
  });
});
