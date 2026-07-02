<script setup>
import { computed, ref, toRaw } from "vue";
import { useRouter } from "vue-router";
import { integer, money, monthLabel, number } from "../core/format.js";
import { contractFleet, monthlyEvolution, prevRealPanel } from "../core/planning.js";
import { useAppStore } from "../stores/appStore.js";
import KpiCard from "../components/KpiCard.vue";
import LineChart from "../components/LineChart.vue";
import MonthBranchFilter from "../components/MonthBranchFilter.vue";
import PrevRealPanel from "../components/PrevRealPanel.vue";
import StatusBadge from "../components/StatusBadge.vue";

const props = defineProps({ id: { type: String, required: true } });

const store = useAppStore();
const router = useRouter();
const raw = computed(() => toRaw(store.state));
const evolutionMetric = ref("liters");

const contract = computed(() => store.getContract(props.id));
const month = computed(() => store.selectedMonth);
const scope = computed(() => ({ type: "contract", id: props.id }));

const panelRows = computed(() => prevRealPanel(raw.value, month.value, scope.value));
const fleet = computed(() => contractFleet(raw.value, month.value, props.id));
const evolution = computed(() => monthlyEvolution(raw.value, month.value, scope.value));
const canViewPlanned = computed(() => store.userCan("canViewPlanned"));

const summary = computed(() => {
  const byKey = Object.fromEntries(panelRows.value.map((row) => [row.key, row]));
  return {
    liters: byKey.liters,
    value: byKey.value,
    avg: byKey.avg,
    saving: byKey.value ? -byKey.value.diff : 0
  };
});

const chartSeries = computed(() => {
  const isLiters = evolutionMetric.value === "liters";
  return [
    { name: isLiters ? "Previsto (L)" : "Previsto (R$)", values: isLiters ? evolution.value.prevLiters : evolution.value.prevCost, color: "#94a3b8" },
    { name: isLiters ? "Realizado (L)" : "Realizado (R$)", values: isLiters ? evolution.value.realLiters : evolution.value.realCost, color: "#6d28d9" }
  ];
});
</script>

<template>
  <div v-if="!contract" class="empty-state">
    Contrato não encontrado.
    <div class="actions" style="justify-content: center;">
      <button class="btn secondary" @click="router.push('/contracts')">Voltar aos contratos</button>
    </div>
  </div>

  <template v-else>
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>{{ contract.code }} — {{ contract.name }}</h2>
          <p>{{ contract.client }} · {{ store.getBranch(contract.branchId)?.name }} · {{ monthLabel(store.selectedMonth) }}</p>
        </div>
        <button class="btn ghost" @click="router.push('/contracts')">← Contratos</button>
      </div>
      <MonthBranchFilter />
    </section>

    <div class="grid cards" v-if="canViewPlanned">
      <KpiCard
        label="Litros previstos × realizados"
        :value="`${integer(summary.liters?.realizado || 0)} L`"
        :foot="`Previsto: ${integer(summary.liters?.previsto || 0)} L`"
        icon="fuel"
      />
      <KpiCard
        label="Valor previsto × realizado"
        :value="money(summary.value?.realizado || 0)"
        :foot="`Previsto: ${money(summary.value?.previsto || 0)}`"
        icon="chart"
      />
      <KpiCard
        label="Consumo médio (km/L)"
        :value="number(summary.avg?.realizado || 0, 2)"
        :foot="`Previsto: ${number(summary.avg?.previsto || 0, 2)} km/L`"
        icon="gauge"
      />
      <KpiCard
        :label="summary.saving >= 0 ? 'Economia no mês' : 'Excesso no mês'"
        :value="money(Math.abs(summary.saving))"
        :foot="summary.saving >= 0 ? 'Realizado abaixo do previsto' : 'Realizado acima do previsto'"
        icon="alert"
        :tone="summary.saving >= 0 ? 'good' : 'bad'"
      />
    </div>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Previsto × Realizado</h2>
          <p>Resumo consolidado do contrato no mês.</p>
        </div>
      </div>
      <PrevRealPanel :rows="panelRows" />
    </section>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Frota do contrato</h2>
          <p>Desempenho km/L por veículo com classificação automática.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Prefixo</th><th>Descrição</th>
              <th v-if="canViewPlanned" class="num">km/L previsto</th>
              <th class="num">km/L realizado</th>
              <th class="num">KM</th><th class="num">Litros</th>
              <th v-if="canViewPlanned" class="num">Desvio</th>
              <th v-if="canViewPlanned">Classificação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!fleet.length"><td colspan="8" class="help">Nenhum veículo alocado a este contrato.</td></tr>
            <tr v-for="row in fleet" :key="row.vehicle.id">
              <td><strong>{{ row.vehicle.code }}</strong></td>
              <td>{{ row.vehicle.description }}</td>
              <td v-if="canViewPlanned" class="num">{{ number(row.kmLPrev, 2) }}</td>
              <td class="num">{{ row.hasData ? number(row.kmLReal, 2) : "—" }}</td>
              <td class="num">{{ integer(row.realized.km) }}</td>
              <td class="num">{{ number(row.realized.liters, 0) }}</td>
              <td v-if="canViewPlanned" class="num" :class="{ 'kpi-bad': row.status === 'critico', 'kpi-warn': row.status === 'atencao' }">
                {{ row.hasData ? `${row.pct > 0 ? "+" : ""}${number(row.pct, 1)}%` : "—" }}
              </td>
              <td v-if="canViewPlanned">
                <StatusBadge v-if="row.hasData" :status="row.status" :label="row.label" />
                <span v-else class="help">Sem dados</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Evolução no mês</h2>
          <p>Consumo previsto × realizado e custo acumulado ao longo de {{ monthLabel(store.selectedMonth) }}.</p>
        </div>
        <div class="subtabs" style="margin-bottom: 0;">
          <button class="subtab" :class="{ active: evolutionMetric === 'liters' }" @click="evolutionMetric = 'liters'">Consumo (L)</button>
          <button class="subtab" :class="{ active: evolutionMetric === 'cost' }" @click="evolutionMetric = 'cost'">Custo acumulado</button>
        </div>
      </div>
      <LineChart
        :labels="evolution.labels"
        :series="chartSeries"
        :format-value="(value) => (evolutionMetric === 'cost' ? money(value) : integer(value))"
      />
    </section>
  </template>
</template>
