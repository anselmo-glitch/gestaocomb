import { computed, toRaw } from "vue";
import { calculateMonth, summarizeContractRows } from "../core/calculations.js";

// Reproduz o mês calculado, recortado pela filial selecionada, com totais
// recalculados por summarizeContractRows (fonte única, sem duplicar soma).
export function useFilteredMonth(store) {
  return computed(() => {
    const result = calculateMonth(toRaw(store.state), store.selectedMonth);
    if (store.selectedBranch === "all") return result;
    const contractIds = new Set(
      store.state.contracts.filter((contract) => contract.branchId === store.selectedBranch).map((contract) => contract.id)
    );
    const contracts = result.contracts.filter((row) => contractIds.has(row.contract.id));
    return {
      ...result,
      contracts,
      vehicleRows: result.vehicleRows.filter((row) => contractIds.has(row.contract.id)),
      total: summarizeContractRows(contracts)
    };
  });
}
