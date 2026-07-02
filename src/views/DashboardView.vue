<script setup>
import { computed, onMounted, ref, toRaw } from "vue";
import { COST_FOCUS_ASKED_KEY, COST_FOCUS_OPTIONS } from "../core/constants.js";
import { integer, money, monthLabel, number } from "../core/format.js";
import { contractsPrevReal, costTypeBreakdown, monthlyEvolution, prevRealPanel } from "../core/planning.js";
import { buildAlerts, monthConsumption, monthLosses, monthPurchases, tankStock, totalStock } from "../core/stock.js";
import { useAppStore } from "../stores/appStore.js";
import AppIcon from "../components/AppIcon.vue";
import CostBreakdownCard from "../components/CostBreakdownCard.vue";
import CostFocusModal from "../components/CostFocusModal.vue";
import KpiCard from "../components/KpiCard.vue";
import LineChart from "../components/LineChart.vue";
import MonthBranchFilter from "../components/MonthBranchFilter.vue";
import PrevRealPanel from "../components/PrevRealPanel.vue";
import StatusBadge from "../components/StatusBadge.vue";

const store = useAppStore();
const scopeType = ref("company");
const scopeId = ref("");
const evolutionMetric = ref("liters");

// Pergunta o foco de custo uma vez por sessão do navegador ao entrar no dashboard.
const showCostModal = ref(false);
onMounted(() => {
  if (!sessionStorage.getItem(COST_FOCUS_ASKED_KEY)) showCostModal.value = true;
});

function confirmCostFocus(value) {
  store.setCostFocus(value);
  sessionStorage.setItem(COST_FOCUS_ASKED_KEY, "true");
  showCostModal.value = false;
}

function closeCostModal() {
  sessionStorage.setItem(COST_FOCUS_ASKED_KEY, "true");
  showCostModal.value = false;
}

const COST_SHORT_LABEL = { all: "Total", diesel: "Diesel", tire: "Pneu", maintenance: "Manutenção" };
const costFocusLabel = computed(
  () => COST_FOCUS_OPTIONS.find((option) => option.value === store.costFocus)?.label || "Todos os custos"
);
const visibleCostBreakdown = computed(() =>
  costBreakdown.value.filter((row) => store.costFocus === "all" || row.key === store.costFocus)
);
const contractsColumnLabel = computed(() => `${COST_SHORT_LABEL[store.costFocus] || "Total"} (R$)`);

const raw = computed(() => toRaw(store.state));
const month = computed(() => store.selectedMonth);

const purchases = computed(() => monthPurchases(raw.value, month.value));
const consumption = computed(() => monthConsumption(raw.value, month.value));
const losses = computed(() => monthLosses(raw.value, month.value));
const stockNow = computed(() => totalStock(raw.value));
const lossPct = computed(() => (stockNow.value > 0 ? (losses.value / stockNow.value) * 100 : 0));
const alerts = computed(() => buildAlerts(raw.value, month.value));

const purchasesByBranch = computed(() =>
  [...purchases.value.byBranch.entries()]
    .map(([branchId, cost]) => ({ name: store.getBranch(branchId)?.name || branchId, value: cost }))
    .sort((a, b) => b.value - a.value)
);
const consumptionByBranch = computed(() =>
  [...consumption.value.byBranch.entries()]
    .map(([branchId, liters]) => ({ name: store.getBranch(branchId)?.name || branchId, value: liters }))
    .sort((a, b) => b.value - a.value)
);
const stockByTank = computed(() =>
  (store.state.tanks || [])
    .filter((tank) => tank.active !== false)
    .map((tank) => {
      const stock = tankStock(raw.value, tank.id);
      const capacity = Number(tank.capacityLiters) || 0;
      const pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
      return {
        tank,
        stock,
        capacity,
        pct,
        low: Number(tank.minLiters) > 0 && stock < Number(tank.minLiters),
        branchName: store.getBranch(tank.branchId)?.name || ""
      };
    })
);

const scope = computed(() => {
  if (scopeType.value === "company" || !scopeId.value) return { type: "company" };
  return { type: scopeType.value, id: scopeId.value };
});
const panelRows = computed(() => prevRealPanel(raw.value, month.value, scope.value));
const evolution = computed(() => monthlyEvolution(raw.value, month.value, scope.value));
const contractsTable = computed(() => contractsPrevReal(raw.value, month.value, store.costFocus));
const canViewPlanned = computed(() => store.userCan("canViewPlanned"));
const costBreakdown = computed(() => costTypeBreakdown(raw.value, month.value, scope.value));

const scopeOptions = computed(() => {
  if (scopeType.value === "branch") return store.state.branches.map((row) => ({ id: row.id, label: row.name }));
  if (scopeType.value === "contract") return store.state.contracts.map((row) => ({ id: row.id, label: `${row.code} — ${row.name}` }));
  if (scopeType.value === "vehicle") return store.state.vehicles.map((row) => ({ id: row.id, label: `${row.code} — ${row.description}` }));
  return [];
});

function changeScopeType(type) {
  scopeType.value = type;
  scopeId.value = type === "company" ? "" : scopeOptions.value[0]?.id || "";
}

const chartSeries = computed(() => {
  const isLiters = evolutionMetric.value === "liters";
  return [
    {
      name: isLiters ? "Previsto (L)" : "Previsto (R$)",
      values: isLiters ? evolution.value.prevLiters : evolution.value.prevCost,
      color: "#94a3b8"
    },
    {
      name: isLiters ? "Realizado (L)" : "Realizado (R$)",
      values: isLiters ? evolution.value.realLiters : evolution.value.realCost,
      color: "#6d28d9"
    }
  ];
});
</script>

<template>
  <CostFocusModal v-if="showCostModal" :model-value="store.costFocus" @confirm="confirmCostFocus" @close="closeCostModal" />

  <MonthBranchFilter />

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>KPIs por tipo de custo</h2>
        <p>Exibindo: {{ costFocusLabel }}. Previsto ajustado × realizado.</p>
      </div>
      <button class="btn ghost" @click="showCostModal = true">Alterar filtro de custo</button>
    </div>
    <div class="grid cards">
      <CostBreakdownCard v-for="row in visibleCostBreakdown" :key="row.key" :row="row" />
    </div>
  </section>

  <div class="grid cards">
    <KpiCard
      label="Compra mensal"
      :value="money(purchases.cost)"
      :foot="`${number(purchases.liters, 0)} L comprados em ${monthLabel(month)}`"
      icon="cart"
    />
    <KpiCard
      label="Estoque atual"
      :value="`${number(stockNow, 0)} L`"
      :foot="`${stockByTank.length} tanque(s) ativo(s)`"
      icon="tank"
    />
    <KpiCard
      label="Consumo mensal"
      :value="`${number(consumption.liters, 0)} L`"
      :foot="`Abastecimentos de ${monthLabel(month)}`"
      icon="fuel"
    />
    <KpiCard
      label="Perdas / desvios"
      :value="`${number(losses, 0)} L`"
      :foot="`${number(lossPct, 2)}% do estoque atual`"
      icon="alert"
      :tone="losses > 0 ? 'bad' : 'good'"
    />
  </div>

  <section class="panel" style="margin-top: 16px;">
    <div class="panel-title">
      <div>
        <h2>Previsto × Realizado</h2>
        <p>Painel principal do módulo — escolha o nível de análise.</p>
      </div>
      <div class="subtabs" style="margin-bottom: 0;">
        <button class="subtab" :class="{ active: scopeType === 'company' }" @click="changeScopeType('company')">Empresa</button>
        <button class="subtab" :class="{ active: scopeType === 'branch' }" @click="changeScopeType('branch')">Filial</button>
        <button class="subtab" :class="{ active: scopeType === 'contract' }" @click="changeScopeType('contract')">Contrato</button>
        <button class="subtab" :class="{ active: scopeType === 'vehicle' }" @click="changeScopeType('vehicle')">Veículo</button>
      </div>
    </div>
    <div v-if="scopeType !== 'company'" class="form-grid compact" style="margin-bottom: 12px;">
      <div class="field">
        <label for="scope-select">Selecionar {{ scopeType === "branch" ? "filial" : scopeType === "contract" ? "contrato" : "veículo" }}</label>
        <select id="scope-select" v-model="scopeId">
          <option v-for="option in scopeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </div>
    </div>
    <PrevRealPanel :rows="panelRows" />
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Contratos — Previsto × Realizado</h2>
        <p>Todos os contratos do mês · foco: {{ costFocusLabel }}.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contrato</th>
            <th>Filial</th>
            <th v-if="canViewPlanned" class="num">Previsto {{ contractsColumnLabel }}</th>
            <th class="num">Realizado {{ contractsColumnLabel }}</th>
            <th v-if="canViewPlanned" class="num">Diferença (R$)</th>
            <th v-if="canViewPlanned" class="num">Diferença (%)</th>
            <th v-if="canViewPlanned">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!contractsTable.rows.length">
            <td colspan="8" class="help">Nenhum contrato cadastrado.</td>
          </tr>
          <tr v-for="row in contractsTable.rows" :key="row.contract.id">
            <td><strong>{{ row.contract.code }}</strong><br /><span class="help">{{ row.contract.name }}</span></td>
            <td>{{ store.getBranch(row.contract.branchId)?.name }}</td>
            <td v-if="canViewPlanned" class="num">{{ money(row.previsto) }}</td>
            <td class="num">{{ money(row.realizado) }}</td>
            <td v-if="canViewPlanned" class="num" :class="{ 'kpi-bad': row.status === 'critico', 'kpi-warn': row.status === 'atencao', 'kpi-good': row.diff < 0 }">
              {{ row.diff > 0 ? "+" : "" }}{{ money(row.diff) }}
            </td>
            <td v-if="canViewPlanned" class="num">{{ row.pct > 0 ? "+" : "" }}{{ number(row.pct, 1) }}%</td>
            <td v-if="canViewPlanned"><StatusBadge :status="row.status" :label="row.label" /></td>
            <td><button class="btn ghost" @click="$router.push(`/contracts/${row.contract.id}`)">Abrir</button></td>
          </tr>
        </tbody>
        <tfoot v-if="contractsTable.rows.length">
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td></td>
            <td v-if="canViewPlanned" class="num"><strong>{{ money(contractsTable.total.previsto) }}</strong></td>
            <td class="num"><strong>{{ money(contractsTable.total.realizado) }}</strong></td>
            <td v-if="canViewPlanned" class="num" :class="{ 'kpi-bad': contractsTable.total.status === 'critico', 'kpi-warn': contractsTable.total.status === 'atencao', 'kpi-good': contractsTable.total.diff < 0 }">
              <strong>{{ contractsTable.total.diff > 0 ? "+" : "" }}{{ money(contractsTable.total.diff) }}</strong>
            </td>
            <td v-if="canViewPlanned" class="num"><strong>{{ contractsTable.total.pct > 0 ? "+" : "" }}{{ number(contractsTable.total.pct, 1) }}%</strong></td>
            <td v-if="canViewPlanned"><StatusBadge :status="contractsTable.total.status" :label="contractsTable.total.label" /></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>

  <div class="grid two">
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Evolução no mês</h2>
          <p>Acumulado diário: consumo previsto × realizado.</p>
        </div>
        <div class="subtabs" style="margin-bottom: 0;">
          <button class="subtab" :class="{ active: evolutionMetric === 'liters' }" @click="evolutionMetric = 'liters'">Litros</button>
          <button class="subtab" :class="{ active: evolutionMetric === 'cost' }" @click="evolutionMetric = 'cost'">Custo</button>
        </div>
      </div>
      <LineChart
        :labels="evolution.labels"
        :series="chartSeries"
        :format-value="(value) => (evolutionMetric === 'cost' ? money(value) : integer(value))"
      />
    </section>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Alertas automáticos</h2>
          <p>Estoque mínimo, capacidade, inventário e consumo anormal.</p>
        </div>
      </div>
      <div v-if="alerts.length" class="alert-list">
        <div v-for="(alert, index) in alerts" :key="index" class="alert-item" :class="{ critical: alert.severity === 'critical' }">
          <span class="alert-icon"><AppIcon :name="alert.icon" :size="16" /></span>
          <div>
            <strong>{{ alert.title }}</strong>
            <span>{{ alert.detail }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">Nenhum alerta para o mês selecionado.</div>
    </section>
  </div>

  <div class="grid two">
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Estoque por tanque</h2>
          <p>Saldo em litros e ocupação da capacidade.</p>
        </div>
      </div>
      <template v-if="stockByTank.length">
        <div v-for="row in stockByTank" :key="row.tank.id" class="chart-bar">
          <strong>{{ row.tank.code }}</strong>
          <div class="bar-track">
            <div class="bar-fill" :class="{ bad: row.low, warn: !row.low && row.pct > 90 }" :style="{ width: `${row.pct}%` }"></div>
          </div>
          <span :class="{ 'kpi-bad': row.low }">{{ number(row.stock, 0) }} L</span>
        </div>
      </template>
      <div v-else class="empty-state">Cadastre tanques em Cadastros básicos.</div>
    </section>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>Compras e consumo por filial</h2>
          <p>Distribuição do mês selecionado.</p>
        </div>
      </div>
      <h3 class="help" style="margin: 0 0 4px;">Compras (R$)</h3>
      <div v-for="row in purchasesByBranch" :key="`p${row.name}`" class="chart-bar">
        <strong>{{ row.name }}</strong>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${(row.value / (purchasesByBranch[0]?.value || 1)) * 100}%` }"></div>
        </div>
        <span>{{ money(row.value) }}</span>
      </div>
      <div v-if="!purchasesByBranch.length" class="empty-state">Sem compras no mês.</div>
      <h3 class="help" style="margin: 12px 0 4px;">Consumo (L)</h3>
      <div v-for="row in consumptionByBranch" :key="`c${row.name}`" class="chart-bar">
        <strong>{{ row.name }}</strong>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${(row.value / (consumptionByBranch[0]?.value || 1)) * 100}%` }"></div>
        </div>
        <span>{{ number(row.value, 0) }} L</span>
      </div>
      <div v-if="!consumptionByBranch.length" class="empty-state">Sem abastecimentos no mês.</div>
    </section>
  </div>
</template>
