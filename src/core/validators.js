import { toNumber } from "./format.js";

export function requireText(value, fieldName, errors) {
  if (!String(value ?? "").trim()) errors.push(`${fieldName} é obrigatório.`);
}

export function requirePositive(value, fieldName, errors) {
  if (toNumber(value) <= 0) errors.push(`${fieldName} deve ser maior que zero.`);
}

function duplicateCode(input, existing) {
  const code = String(input.code ?? "").trim().toLowerCase();
  return existing.some((item) => item.id !== input.id && String(item.code ?? "").trim().toLowerCase() === code);
}

export function validateContract(input, existingContracts = []) {
  const errors = [];
  requireText(input.code, "Código do contrato", errors);
  requireText(input.name, "Nome do contrato", errors);
  requireText(input.branchId, "Filial", errors);
  if (toNumber(input.plannedDieselPrice) <= 0) errors.push("Preço previsto do diesel deve ser maior que zero.");
  if (duplicateCode(input, existingContracts)) errors.push("Já existe outro contrato com este código.");
  return errors;
}

export function validateVehicle(input, existingVehicles = []) {
  const errors = [];
  requireText(input.code, "Código do veículo", errors);
  requireText(input.description, "Descrição", errors);
  requireText(input.contractId, "Contrato", errors);
  requirePositive(input.plannedKm, "KM planejado", errors);
  requirePositive(input.avgKmL, "Média km/l", errors);
  if (toNumber(input.tireCpk) < 0) errors.push("CPK pneu não pode ser negativo.");
  if (toNumber(input.maintenanceCpk) < 0) errors.push("CPK manutenção não pode ser negativo.");
  if (duplicateCode(input, existingVehicles)) errors.push("Já existe outro veículo com este código.");
  return errors;
}

export function validateBranchFuel(input) {
  const errors = [];
  requireText(input.month, "Mês", errors);
  requireText(input.branchId, "Filial", errors);
  requirePositive(input.liters, "Litros", errors);
  requirePositive(input.totalCost, "Custo total", errors);
  return errors;
}

export function validateSimpleName(input, label = "Nome") {
  const errors = [];
  requireText(input.name, label, errors);
  return errors;
}

export function validateTank(input, existingTanks = []) {
  const errors = [];
  requireText(input.code, "Código do tanque", errors);
  requireText(input.branchId, "Filial", errors);
  requireText(input.fuelTypeId, "Combustível", errors);
  requirePositive(input.capacityLiters, "Capacidade total", errors);
  if (toNumber(input.minLiters) < 0) errors.push("Estoque mínimo não pode ser negativo.");
  if (toNumber(input.minLiters) > toNumber(input.capacityLiters)) errors.push("Estoque mínimo não pode superar a capacidade.");
  if (duplicateCode(input, existingTanks)) errors.push("Já existe outro tanque com este código.");
  return errors;
}

export function validatePurchase(input) {
  const errors = [];
  requireText(input.date, "Data da compra", errors);
  requireText(input.supplierId, "Fornecedor", errors);
  requireText(input.branchId, "Filial de destino", errors);
  requireText(input.fuelTypeId, "Combustível", errors);
  requireText(input.tankId, "Tanque de recebimento", errors);
  requirePositive(input.liters, "Quantidade (L)", errors);
  requirePositive(input.unitPrice, "Valor unitário", errors);
  requireText(input.invoiceNumber, "Nº da NF", errors);
  return errors;
}

export function validateFueling(input) {
  const errors = [];
  requireText(input.date, "Data/hora", errors);
  requireText(input.tankId, "Tanque de origem", errors);
  requireText(input.vehicleId, "Veículo/equipamento", errors);
  requirePositive(input.liters, "Litros abastecidos", errors);
  if (toNumber(input.odometer) < 0) errors.push("Hodômetro não pode ser negativo.");
  if (toNumber(input.hourmeter) < 0) errors.push("Horímetro não pode ser negativo.");
  return errors;
}

export function validateTransfer(input) {
  const errors = [];
  requireText(input.date, "Data", errors);
  requireText(input.fromTankId, "Tanque de origem", errors);
  requireText(input.toTankId, "Tanque de destino", errors);
  if (input.fromTankId && input.fromTankId === input.toTankId) errors.push("Origem e destino devem ser tanques diferentes.");
  requirePositive(input.liters, "Litros transferidos", errors);
  if (toNumber(input.lossLiters) < 0) errors.push("Perda não pode ser negativa.");
  if (toNumber(input.lossLiters) > toNumber(input.liters)) errors.push("Perda não pode superar os litros transferidos.");
  return errors;
}

export function validateInventory(input) {
  const errors = [];
  requireText(input.date, "Data da aferição", errors);
  requireText(input.tankId, "Tanque", errors);
  if (toNumber(input.physicalLiters) < 0) errors.push("Estoque físico não pode ser negativo.");
  requireText(input.responsible, "Responsável", errors);
  return errors;
}

export function validateActionPlan(input) {
  const errors = [];
  requireText(input.month, "Competência", errors);
  requireText(input.name, "Desvio analisado", errors);
  requireText(input.responsible, "Responsável pela análise", errors);
  requireText(input.cause, "Causa do desvio", errors);
  requireText(input.plan, "Plano de ação", errors);
  requireText(input.deadline, "Prazo", errors);
  return errors;
}
