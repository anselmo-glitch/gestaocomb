<script setup>
import { computed, reactive, toRaw } from "vue";
import { ACTION_PLAN_STATUS_LABEL } from "../core/constants.js";
import { money, number, toNumber, uid } from "../core/format.js";
import { detectDeviations } from "../core/planning.js";
import { deviationSettings } from "../core/stock.js";
import { validateActionPlan } from "../core/validators.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";
import MonthBranchFilter from "../components/MonthBranchFilter.vue";
import StatusBadge from "../components/StatusBadge.vue";

const store = useAppStore();
const raw = computed(() => toRaw(store.state));
const canManage = computed(() => store.userCan("canManageActionPlans"));
const canManagePlanning = computed(() => store.userCan("canManagePlanning"));
const canViewPlanned = computed(() => store.userCan("canViewPlanned"));

const settings = computed(() => deviationSettings(raw.value));
const settingsForm = reactive({
  greenMaxPct: String(settings.value.greenMaxPct),
  yellowMaxPct: String(settings.value.yellowMaxPct),
  inventoryAlertPct: String(settings.value.inventoryAlertPct)
});

const deviations = computed(() => detectDeviations(raw.value, store.selectedMonth));

const plans = computed(() =>
  [...store.state.actionPlans].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
);

const planFormVisible = reactive({ value: false });
function emptyPlanForm() {
  return {
    id: "",
    month: store.selectedMonth,
    scope: "contract",
    refId: "",
    name: "",
    responsible: "",
    cause: "",
    plan: "",
    deadline: "",
    status: "aberto"
  };
}
const planForm = reactive(emptyPlanForm());

function saveSettings() {
  if (!canManagePlanning.value) return toast("Apenas administrador altera as regras de desvio.");
  const green = toNumber(settingsForm.greenMaxPct);
  const yellow = toNumber(settingsForm.yellowMaxPct);
  if (green <= 0 || yellow <= green) return toast("Limites inválidos: o amarelo deve ser maior que o verde.");
  store.state.deviationSettings = {
    ...settings.value,
    greenMaxPct: green,
    yellowMaxPct: yellow,
    inventoryAlertPct: toNumber(settingsForm.inventoryAlertPct)
  };
  store.persist("deviation_settings_updated", `Regras de desvio: verde ≤${green}%, amarelo ≤${yellow}%.`);
  toast("Regras de desvio atualizadas.");
}

function openPlanFor(deviation) {
  if (!canManage.value) return toast("Seu perfil não permite registrar análises.");
  Object.assign(planForm, emptyPlanForm(), {
    scope: deviation.scope,
    refId: deviation.refId,
    name: deviation.name
  });
  planFormVisible.value = true;
}

function editPlan(plan) {
  if (!canManage.value) return toast("Seu perfil não permite registrar análises.");
  Object.assign(planForm, {
    id: plan.id,
    month: plan.month,
    scope: plan.scope,
    refId: plan.refId,
    name: plan.name,
    responsible: plan.responsible,
    cause: plan.cause,
    plan: plan.plan,
    deadline: plan.deadline,
    status: plan.status
  });
  planFormVisible.value = true;
}

function cancelPlan() {
  planFormVisible.value = false;
  Object.assign(planForm, emptyPlanForm());
}

function submitPlan() {
  if (!canManage.value) return toast("Seu perfil não permite registrar análises.");
  const input = {
    id: planForm.id || uid("plan"),
    month: planForm.month,
    scope: planForm.scope,
    refId: planForm.refId,
    name: planForm.name.trim(),
    responsible: planForm.responsible.trim(),
    cause: planForm.cause.trim(),
    plan: planForm.plan.trim(),
    deadline: planForm.deadline,
    status: planForm.status,
    createdAt: planForm.id
      ? store.byId("actionPlans", planForm.id)?.createdAt || new Date().toISOString()
      : new Date().toISOString()
  };
  const errors = validateActionPlan(input);
  if (errors.length) return toast(errors.join(" "));
  if (planForm.id) {
    Object.assign(store.byId("actionPlans", planForm.id), input);
    store.persist("action_plan_updated", `Plano de ação atualizado: ${input.name}.`);
    toast("Plano de ação atualizado.");
  } else {
    store.state.actionPlans.push(input);
    store.persist("action_plan_created", `Plano de ação aberto: ${input.name}.`);
    toast("Plano de ação registrado.");
  }
  cancelPlan();
}

function hasPlan(deviation) {
  return store.state.actionPlans.some(
    (plan) => plan.refId === deviation.refId && plan.month === store.selectedMonth && plan.status !== "concluido"
  );
}

function formatValue(deviation, value) {
  return deviation.indicator.includes("R$") ? money(value) : number(value, 2);
}
</script>

<template>
  <MonthBranchFilter />

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Regras de classificação</h2>
        <p>Parametrizáveis — aplicadas a todos os painéis e alertas.</p>
      </div>
    </div>
    <div class="form-grid compact">
      <div class="field">
        <label for="s-green">Verde (Normal) até %</label>
        <input id="s-green" v-model="settingsForm.greenMaxPct" type="number" step="0.5" :disabled="!canManagePlanning" />
      </div>
      <div class="field">
        <label for="s-yellow">Amarelo (Atenção) até %</label>
        <input id="s-yellow" v-model="settingsForm.yellowMaxPct" type="number" step="0.5" :disabled="!canManagePlanning" />
      </div>
      <div class="field">
        <label for="s-inv">Alerta de inventário acima de %</label>
        <input id="s-inv" v-model="settingsForm.inventoryAlertPct" type="number" step="0.5" :disabled="!canManagePlanning" />
      </div>
    </div>
    <div class="actions">
      <button class="btn" :disabled="!canManagePlanning" @click="saveSettings">Salvar regras</button>
      <span class="help">Acima do amarelo o desvio é classificado como <strong class="kpi-bad">Crítico</strong>.</span>
    </div>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Desvios detectados em {{ store.selectedMonth }}</h2>
        <p>Contratos avaliados pelo valor total; veículos pela média km/L.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Origem</th><th>Item</th><th>Indicador</th>
            <th v-if="canViewPlanned" class="num">Previsto</th>
            <th class="num">Realizado</th>
            <th class="num">Desvio %</th>
            <th>Status</th><th>Tratamento</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!deviations.length"><td colspan="8" class="help">Nenhum desvio acima do limite verde neste mês.</td></tr>
          <tr v-for="deviation in deviations" :key="`${deviation.scope}${deviation.refId}${deviation.indicator}`">
            <td>{{ deviation.scope === "contract" ? "Contrato" : "Veículo" }}</td>
            <td><strong>{{ deviation.name }}</strong></td>
            <td>{{ deviation.indicator }}</td>
            <td v-if="canViewPlanned" class="num">{{ formatValue(deviation, deviation.previsto) }}</td>
            <td class="num">{{ formatValue(deviation, deviation.realizado) }}</td>
            <td class="num" :class="deviation.status === 'critico' ? 'kpi-bad' : 'kpi-warn'">
              {{ deviation.pct > 0 ? "+" : "" }}{{ number(deviation.pct, 1) }}%
            </td>
            <td><StatusBadge :status="deviation.status" :label="deviation.label" /></td>
            <td>
              <span v-if="hasPlan(deviation)" class="badge">Em tratamento</span>
              <button v-else-if="canManage" class="btn ghost" @click="openPlanFor(deviation)">Abrir plano</button>
              <span v-else class="help">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section v-if="planFormVisible.value" class="panel">
    <div class="panel-title">
      <div>
        <h2>{{ planForm.id ? "Editar plano de ação" : "Novo plano de ação" }}</h2>
        <p>Responsável, causa, plano, prazo e status — exigidos para tratar o desvio.</p>
      </div>
    </div>
    <form @submit.prevent="submitPlan">
      <div class="form-grid">
        <div class="field"><label for="p-name">Desvio analisado *</label><input id="p-name" v-model="planForm.name" /></div>
        <div class="field"><label for="p-month">Competência *</label><input id="p-month" v-model="planForm.month" type="month" /></div>
        <div class="field"><label for="p-resp">Responsável pela análise *</label><input id="p-resp" v-model="planForm.responsible" /></div>
        <div class="field"><label for="p-deadline">Prazo para conclusão *</label><input id="p-deadline" v-model="planForm.deadline" type="date" /></div>
        <div class="field">
          <label for="p-status">Status</label>
          <select id="p-status" v-model="planForm.status">
            <option v-for="(label, value) in ACTION_PLAN_STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <label for="p-cause">Causa do desvio *</label>
          <textarea id="p-cause" v-model="planForm.cause" rows="2"></textarea>
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <label for="p-plan">Plano de ação *</label>
          <textarea id="p-plan" v-model="planForm.plan" rows="2"></textarea>
        </div>
      </div>
      <div class="actions">
        <button class="btn">{{ planForm.id ? "Atualizar plano" : "Registrar plano" }}</button>
        <button type="button" class="btn ghost" @click="cancelPlan">Cancelar</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Planos de ação</h2>
        <p>{{ plans.length }} plano(s) registrados.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Competência</th><th>Desvio</th><th>Responsável</th><th>Causa</th><th>Plano</th><th>Prazo</th><th>Status</th><th v-if="canManage">Ações</th></tr>
        </thead>
        <tbody>
          <tr v-if="!plans.length"><td colspan="8" class="help">Nenhum plano de ação registrado.</td></tr>
          <tr v-for="plan in plans" :key="plan.id">
            <td>{{ plan.month }}</td>
            <td><strong>{{ plan.name }}</strong></td>
            <td>{{ plan.responsible }}</td>
            <td>{{ plan.cause }}</td>
            <td>{{ plan.plan }}</td>
            <td>{{ plan.deadline }}</td>
            <td>
              <span class="badge" :class="plan.status === 'concluido' ? 'good' : plan.status === 'andamento' ? 'warn' : 'bad'">
                {{ ACTION_PLAN_STATUS_LABEL[plan.status] || plan.status }}
              </span>
            </td>
            <td v-if="canManage"><button class="btn ghost" @click="editPlan(plan)">Editar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
