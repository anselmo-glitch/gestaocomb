import { describe, expect, it } from "vitest";
import { validateBranchFuel, validateContract, validateVehicle } from "../src/core/validators.js";

const validContract = { id: "c9", code: "NOVO", name: "Contrato novo", branchId: "b1", plannedDieselPrice: 5.3, fixedCostMonthly: 0 };
const validVehicle = { id: "v9", code: "9001", plate: "ABC1D23", description: "Caminhão", contractId: "c1", plannedKm: 1000, avgKmL: 2.5, tireCpk: 0.1, maintenanceCpk: 0.2 };

describe("validateContract", () => {
  it("passa sem erros quando válido", () => {
    expect(validateContract(validContract, [])).toHaveLength(0);
  });

  it("rejeita código duplicado (ignorando maiúsculas)", () => {
    const errors = validateContract(validContract, [{ id: "c1", code: "novo" }]);
    expect(errors.some((error) => error.includes("código"))).toBe(true);
  });

  it("não acusa duplicidade ao editar mantendo o próprio código", () => {
    const errors = validateContract(validContract, [{ id: "c9", code: "NOVO" }]);
    expect(errors).toHaveLength(0);
  });

  it("rejeita contrato sem preço de diesel", () => {
    const errors = validateContract({ ...validContract, plannedDieselPrice: 0 }, []);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateVehicle", () => {
  it("passa quando válido e rejeita código duplicado", () => {
    expect(validateVehicle(validVehicle, [])).toHaveLength(0);
    const errors = validateVehicle(validVehicle, [{ id: "v1", code: "9001" }]);
    expect(errors.some((error) => error.includes("código"))).toBe(true);
  });

  it("rejeita veículo sem média km/l", () => {
    const errors = validateVehicle({ ...validVehicle, avgKmL: 0 }, []);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejeita prefixo sem placa (nenhum prefixo roda sem placa)", () => {
    const errors = validateVehicle({ ...validVehicle, plate: "" }, []);
    expect(errors.some((error) => error.includes("Placa"))).toBe(true);
  });
});

describe("validateBranchFuel", () => {
  it("exige litros e custo positivos", () => {
    expect(validateBranchFuel({ month: "2026-06", branchId: "b1", liters: 100, totalCost: 530 })).toHaveLength(0);
    expect(validateBranchFuel({ month: "2026-06", branchId: "b1", liters: 0, totalCost: 530 }).length).toBeGreaterThan(0);
    expect(validateBranchFuel({ month: "", branchId: "b1", liters: 100, totalCost: 530 }).length).toBeGreaterThan(0);
  });
});
