import { describe, expect, it } from "vitest";
import { effectiveMonthState } from "../src/core/calculations.js";
import {
  classifyDeviation,
  contractFleet,
  detectDeviations,
  monthlyEvolution,
  prevRealPanel
} from "../src/core/planning.js";

const SETTINGS = { greenMaxPct: 3, yellowMaxPct: 8 };

function baseState() {
  return {
    branches: [{ id: "b1", name: "Filial A" }],
    contracts: [{ id: "c1", code: "C1", name: "Contrato 1", branchId: "b1", plannedDieselPrice: 5, fixedCostMonthly: 0, active: true }],
    vehicles: [
      { id: "v1", contractId: "c1", code: "V1", description: "Cavalo", plannedKm: 1000, avgKmL: 2, pumpLitersHour: 0, pumpHours: 0, tireCpk: 0, maintenanceCpk: 0, active: true }
    ],
    monthlyEntries: [
      { id: "e1", month: "2026-06", vehicleId: "v1", active: true, actualKm: 1000, actualDieselLiters: 0, actualDieselPrice: 0 }
    ],
    branchFuelPurchases: [],
    purchases: [
      { id: "p1", date: "2026-06-01", branchId: "b1", tankId: "t1", liters: 10000, totalCost: 50000, invoiceNumber: "1" }
    ],
    fuelings: [
      { id: "a1", date: "2026-06-10T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 250 },
      { id: "a2", date: "2026-06-20T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 250 }
    ],
    transfers: [],
    inventories: [],
    deviationSettings: { greenMaxPct: 3, yellowMaxPct: 8, inventoryAlertPct: 2, capacityAlertPct: 95, consumptionAlertFactor: 1.3 }
  };
}

describe("classifyDeviation", () => {
  it("aplica as faixas verde/amarela/vermelha", () => {
    expect(classifyDeviation(2.9, SETTINGS).status).toBe("ok");
    expect(classifyDeviation(-3, SETTINGS).status).toBe("ok");
    expect(classifyDeviation(5, SETTINGS).status).toBe("atencao");
    expect(classifyDeviation(-7.9, SETTINGS).status).toBe("atencao");
    expect(classifyDeviation(8.1, SETTINGS).status).toBe("critico");
    expect(classifyDeviation(-15, SETTINGS).status).toBe("critico");
  });

  it("respeita limites parametrizados", () => {
    const custom = { greenMaxPct: 1, yellowMaxPct: 2 };
    expect(classifyDeviation(1.5, custom).status).toBe("atencao");
    expect(classifyDeviation(2.5, custom).status).toBe("critico");
  });
});

describe("effectiveMonthState (integração abastecimentos → realizado)", () => {
  it("injeta litros dos abastecimentos quando não há litros manuais", () => {
    const effective = effectiveMonthState(baseState(), "2026-06");
    const entry = effective.monthlyEntries.find((row) => row.vehicleId === "v1");
    expect(entry.actualDieselLiters).toBe(500);
    expect(entry.actualDieselPrice).toBe(5); // preço médio da compra da filial
    expect(entry.dieselFromFuelings).toBe(true);
  });

  it("litros manuais têm prioridade sobre abastecimentos", () => {
    const state = baseState();
    state.monthlyEntries[0].actualDieselLiters = 480;
    const effective = effectiveMonthState(state, "2026-06");
    const entry = effective.monthlyEntries.find((row) => row.vehicleId === "v1");
    expect(entry.actualDieselLiters).toBe(480);
    expect(entry.dieselFromFuelings).toBeUndefined();
  });

  it("cria lançamento sintético para veículo abastecido sem entrada mensal", () => {
    const state = baseState();
    state.monthlyEntries = [];
    const effective = effectiveMonthState(state, "2026-06");
    const entry = effective.monthlyEntries.find((row) => row.vehicleId === "v1");
    expect(entry).toBeTruthy();
    expect(entry.actualDieselLiters).toBe(500);
  });

  it("consolida compras novas no pool de rateio da filial", () => {
    const effective = effectiveMonthState(baseState(), "2026-06");
    const pool = effective.branchFuelPurchases.find((row) => row.branchId === "b1" && row.month === "2026-06");
    expect(pool.liters).toBe(10000);
    expect(pool.totalCost).toBe(50000);
  });
});

describe("prevRealPanel", () => {
  it("monta os 4 indicadores no escopo empresa", () => {
    const rows = prevRealPanel(baseState(), "2026-06", { type: "company" });
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.liters.previsto).toBe(500); // 1000 km / 2 km/L
    expect(byKey.liters.realizado).toBe(500);
    expect(byKey.liters.status).toBe("ok");
    expect(byKey.km.previsto).toBe(1000);
    expect(byKey.km.realizado).toBe(1000);
    expect(byKey.avg.previsto).toBe(2);
    expect(byKey.avg.realizado).toBe(2);
  });

  it("marca desvio crítico quando realizado estoura o previsto", () => {
    const state = baseState();
    state.fuelings.push({ id: "a3", date: "2026-06-25T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 100 });
    const rows = prevRealPanel(state, "2026-06", { type: "company" });
    const liters = rows.find((row) => row.key === "liters");
    expect(liters.realizado).toBe(600);
    expect(liters.pct).toBe(20);
    expect(liters.status).toBe("critico");
  });

  it("escopo por veículo restringe os números", () => {
    const rows = prevRealPanel(baseState(), "2026-06", { type: "vehicle", id: "v1" });
    expect(rows.find((row) => row.key === "km").realizado).toBe(1000);
  });
});

describe("contractFleet e detectDeviations", () => {
  it("classifica veículo com consumo pior que o previsto", () => {
    const state = baseState();
    state.fuelings.push({ id: "a3", date: "2026-06-25T08:00", branchId: "b1", tankId: "t1", vehicleId: "v1", liters: 100 });
    const fleet = contractFleet(state, "2026-06", "c1");
    expect(fleet[0].kmLReal).toBeCloseTo(1.67, 2);
    expect(fleet[0].status).toBe("critico");

    const deviations = detectDeviations(state, "2026-06");
    expect(deviations.some((row) => row.scope === "vehicle" && row.refId === "v1")).toBe(true);
  });

  it("sem desvios quando realizado = previsto", () => {
    expect(detectDeviations(baseState(), "2026-06")).toHaveLength(0);
  });
});

describe("monthlyEvolution", () => {
  it("acumula realizado por dia e distribui previsto linearmente", () => {
    const result = monthlyEvolution(baseState(), "2026-06", { type: "company" });
    expect(result.labels).toHaveLength(30); // junho tem 30 dias
    expect(result.realLiters[8]).toBe(0); // dia 9, antes do primeiro abastecimento
    expect(result.realLiters[9]).toBe(250); // dia 10
    expect(result.realLiters[19]).toBe(500); // dia 20
    expect(result.realLiters[29]).toBe(500); // fim do mês
    expect(result.prevLiters[29]).toBe(500); // previsto total no último dia
    expect(result.realCost[29]).toBe(2500); // 500 L × R$ 5,00
  });
});
