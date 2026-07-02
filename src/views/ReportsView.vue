<script setup>
import { computed } from "vue";
import { csvNumber, downloadText, toCsv } from "../core/csv.js";
import { integer, money, number, pct, toNumber } from "../core/format.js";
import { useAppStore } from "../stores/appStore.js";
import { useFilteredMonth } from "../composables/useFilteredMonth.js";
import MonthBranchFilter from "../components/MonthBranchFilter.vue";

const SOURCE_LABEL = { manual: "Manual", fuelings: "Abastecimentos", branch_allocation: "Rateio filial", none: "Sem diesel" };
const SOURCE_BADGE = { manual: "good", fuelings: "good", branch_allocation: "warn", none: "bad" };

const store = useAppStore();
const result = useFilteredMonth(store);

function statusBadgeClass(value) {
  return Math.abs(toNumber(value)) < 0.01 ? "good" : toNumber(value) > 0 ? "bad" : "good";
}

function statusBadgeText(value) {
  const n = toNumber(value);
  if (Math.abs(n) < 0.01) return "Dentro";
  return `${n > 0 ? "+" : ""}${money(n)}`;
}

const vehicleRows = computed(() =>
  [...result.value.vehicleRows]
    .filter((row) => row.realized.km > 0 || row.realized.total > 0)
    .sort((a, b) => b.realized.total - a.realized.total)
);

function exportCsv() {
  const rows = result.value.contracts.map((row) => ({
    mes: store.selectedMonth,
    contrato: row.contract.code,
    filial: store.getBranch(row.contract.branchId)?.name,
    programado: csvNumber(row.planned.total),
    previsto_ajustado: csvNumber(row.adjusted.total),
    realizado: csvNumber(row.realized.total),
    desvio_volume: csvNumber(row.variances.volume),
    desvio_operacional: csvNumber(row.variances.operational),
    desvio_total: csvNumber(row.variances.total),
    percentual_vs_programado: csvNumber(row.variances.totalPctVsPlanned * 100),
    percentual_vs_ajustado: csvNumber(row.variances.totalPctVsAdjusted * 100)
  }));
  downloadText(`frota-ro-relatorio-${store.selectedMonth}.csv`, toCsv(rows), "text/csv;charset=utf-8");
}
</script>

<template>
  <MonthBranchFilter />
  <section class="panel">
    <div class="panel-title">
      <div><h2>Comparativo por contrato</h2><p>Desvios separados para evitar confusão entre preço, consumo e volume.</p></div>
      <button class="btn secondary" @click="exportCsv">Exportar CSV</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Contrato</th><th>Filial</th><th>Programado</th><th>Ajustado</th><th>Realizado</th><th>Volume</th><th>Operacional</th><th>Total</th><th>% vs Programado</th><th>% vs Ajustado</th></tr></thead>
        <tbody>
          <tr v-for="row in result.contracts" :key="row.contract.id">
            <td><strong>{{ row.contract.code }}</strong><br><span class="help">{{ row.contract.name }}</span></td>
            <td>{{ store.getBranch(row.contract.branchId)?.name }}</td>
            <td>{{ money(row.planned.total) }}</td>
            <td>{{ money(row.adjusted.total) }}</td>
            <td>{{ money(row.realized.total) }}</td>
            <td><span class="badge" :class="statusBadgeClass(row.variances.volume)">{{ statusBadgeText(row.variances.volume) }}</span></td>
            <td><span class="badge" :class="statusBadgeClass(row.variances.operational)">{{ statusBadgeText(row.variances.operational) }}</span></td>
            <td><span class="badge" :class="statusBadgeClass(row.variances.total)">{{ statusBadgeText(row.variances.total) }}</span></td>
            <td>{{ pct(row.variances.totalPctVsPlanned) }}</td>
            <td>{{ pct(row.variances.totalPctVsAdjusted) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <div class="panel-title"><div><h2>Ranking por veículo</h2><p>KM, diesel, pneu e manutenção sempre partem do veículo lançado.</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Prefixo</th><th>Contrato</th><th>KM</th><th>Litros</th><th>Origem diesel</th><th>Diesel</th><th>Pneu</th><th>Manutenção</th><th>Total</th><th>Desv. consumo</th><th>Desv. preço</th></tr></thead>
        <tbody>
          <tr v-for="row in vehicleRows" :key="row.vehicle.id">
            <td><strong>{{ row.vehicle.code }}</strong><br><span class="help">{{ row.vehicle.description }}</span></td>
            <td>{{ row.contract.code }}</td>
            <td>{{ integer(row.realized.km) }}</td>
            <td>{{ number(row.realized.liters, 2) }}</td>
            <td><span class="badge" :class="SOURCE_BADGE[row.realized.source] || 'bad'">{{ SOURCE_LABEL[row.realized.source] || row.realized.source }}</span></td>
            <td>{{ money(row.realized.diesel) }}</td>
            <td>{{ money(row.realized.tire) }}</td>
            <td>{{ money(row.realized.maintenance) }}</td>
            <td><strong>{{ money(row.realized.total) }}</strong></td>
            <td>{{ money(row.variances.consumption) }}</td>
            <td>{{ money(row.variances.price) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
