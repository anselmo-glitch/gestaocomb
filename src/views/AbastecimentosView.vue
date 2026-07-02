<script setup>
import { computed, reactive, toRaw, watch } from "vue";
import { number, toNumber, uid } from "../core/format.js";
import { validateFueling } from "../core/validators.js";
import { tankStock } from "../core/stock.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const canRegister = computed(() => store.userCan("canRegisterOps"));
const canDelete = computed(() => store.userCan("canDelete"));

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function emptyForm() {
  return {
    date: nowLocal(),
    branchId: store.state.branches[0]?.id || "",
    tankId: "",
    vehicleId: store.state.vehicles[0]?.id || "",
    driverId: "",
    liters: "",
    odometer: "",
    hourmeter: "",
    costCenterId: "",
    osNumber: "",
    notes: ""
  };
}

const form = reactive(emptyForm());

const tankOptions = computed(() =>
  store.state.tanks.filter((tank) => tank.active !== false && tank.branchId === form.branchId)
);
watch(() => form.branchId, () => {
  if (!tankOptions.value.some((tank) => tank.id === form.tankId)) form.tankId = tankOptions.value[0]?.id || "";
}, { immediate: true });

const selectedTankStock = computed(() => (form.tankId ? tankStock(toRaw(store.state), form.tankId) : 0));

const rows = computed(() =>
  [...store.state.fuelings]
    .filter((row) => String(row.date).slice(0, 7) === store.selectedMonth)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
);
const monthLiters = computed(() => rows.value.reduce((sum, row) => sum + toNumber(row.liters), 0));

function submit() {
  if (!canRegister.value) return toast("Seu perfil não permite lançar abastecimentos.");
  const input = {
    id: uid("fue"),
    date: form.date,
    branchId: form.branchId,
    tankId: form.tankId,
    vehicleId: form.vehicleId,
    driverId: form.driverId,
    liters: toNumber(form.liters),
    odometer: toNumber(form.odometer),
    hourmeter: toNumber(form.hourmeter),
    costCenterId: form.costCenterId,
    osNumber: form.osNumber.trim(),
    notes: form.notes.trim()
  };
  const errors = validateFueling(input);
  if (errors.length) return toast(errors.join(" "));
  const vehicle = store.getVehicle(input.vehicleId);
  if (!vehicle?.plate) {
    return toast(`O prefixo ${vehicle?.code || ""} está sem placa — nenhum prefixo pode rodar sem placa. Cadastre a placa em Veículos.`);
  }
  if (input.liters > selectedTankStock.value) {
    return toast(`Estoque insuficiente no tanque (${number(selectedTankStock.value, 0)} L disponíveis).`);
  }
  store.state.fuelings.push(input);
  store.selectedMonth = String(input.date).slice(0, 7);
  store.persist(
    "fueling_created",
    `Abastecimento: ${number(input.liters, 0)} L do ${store.getTank(input.tankId)?.code} para ${store.getVehicle(input.vehicleId)?.code}.`
  );
  toast("Abastecimento lançado. Saída de estoque gerada.");
  Object.assign(form, emptyForm());
}

function remove(row) {
  if (!canDelete.value) return toast("Seu perfil não permite exclusão.");
  if (!confirm("Excluir este abastecimento? O estoque do tanque será recalculado.")) return;
  store.state.fuelings = store.state.fuelings.filter((item) => item.id !== row.id);
  store.persist("fueling_deleted", "Abastecimento excluído.");
  toast("Abastecimento excluído.");
}

function formatDateTime(value) {
  const text = String(value || "");
  return `${text.slice(8, 10)}/${text.slice(5, 7)} ${text.slice(11, 16)}`;
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Lançar abastecimento</h2>
        <p>Todo abastecimento gera saída automática do tanque de origem e alimenta o realizado do veículo.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field"><label for="a-date">Data/hora *</label><input id="a-date" v-model="form.date" type="datetime-local" :disabled="!canRegister" /></div>
        <div class="field">
          <label for="a-branch">Filial *</label>
          <select id="a-branch" v-model="form.branchId" :disabled="!canRegister">
            <option v-for="row in store.state.branches" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="a-tank">Tanque de origem *</label>
          <select id="a-tank" v-model="form.tankId" :disabled="!canRegister">
            <option v-for="tank in tankOptions" :key="tank.id" :value="tank.id">{{ tank.code }}</option>
          </select>
        </div>
        <div class="field">
          <label for="a-vehicle">Prefixo (veículo/equipamento) *</label>
          <select id="a-vehicle" v-model="form.vehicleId" :disabled="!canRegister">
            <option v-for="row in store.state.vehicles" :key="row.id" :value="row.id">
              {{ row.code }} — {{ row.plate || "SEM PLACA" }} — {{ row.description }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="a-driver">Motorista/Operador</label>
          <select id="a-driver" v-model="form.driverId" :disabled="!canRegister">
            <option value="">— Não informado —</option>
            <option v-for="row in store.state.drivers" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field"><label for="a-liters">Litros abastecidos *</label><input id="a-liters" v-model="form.liters" type="number" step="0.01" :disabled="!canRegister" /></div>
        <div class="field"><label for="a-odo">Hodômetro (km)</label><input id="a-odo" v-model="form.odometer" type="number" step="1" :disabled="!canRegister" /></div>
        <div class="field"><label for="a-hour">Horímetro (h)</label><input id="a-hour" v-model="form.hourmeter" type="number" step="0.1" :disabled="!canRegister" /></div>
        <div class="field">
          <label for="a-cc">Centro de custo</label>
          <select id="a-cc" v-model="form.costCenterId" :disabled="!canRegister">
            <option value="">— Não informado —</option>
            <option v-for="row in store.state.costCenters" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field"><label for="a-os">OS / Viagem</label><input id="a-os" v-model="form.osNumber" placeholder="Ex.: OS 4587" :disabled="!canRegister" /></div>
        <div class="field"><label for="a-notes">Observação</label><input id="a-notes" v-model="form.notes" :disabled="!canRegister" /></div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!canRegister">Lançar abastecimento</button>
        <span class="help">
          Estoque do tanque selecionado: <strong :class="{ 'kpi-bad': selectedTankStock <= 0 }">{{ number(selectedTankStock, 0) }} L</strong>
        </span>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Abastecimentos de {{ store.selectedMonth }}</h2>
        <p>{{ rows.length }} lançamento(s) · {{ number(monthLiters, 0) }} L</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data/hora</th><th>Filial</th><th>Tanque</th><th>Veículo</th><th>Motorista</th>
            <th class="num">Litros</th><th class="num">Hodômetro</th><th class="num">Horímetro</th><th>Centro de custo</th><th>OS</th><th v-if="canDelete">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="11" class="help">Nenhum abastecimento neste mês.</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ formatDateTime(row.date) }}</td>
            <td>{{ store.getBranch(row.branchId)?.name }}</td>
            <td>{{ store.getTank(row.tankId)?.code }}</td>
            <td><strong>{{ store.getVehicle(row.vehicleId)?.code }}</strong><br /><span class="help">{{ store.getVehicle(row.vehicleId)?.plate }}</span></td>
            <td>{{ store.getDriver(row.driverId)?.name || "—" }}</td>
            <td class="num">{{ number(row.liters, 0) }}</td>
            <td class="num">{{ row.odometer ? number(row.odometer, 0) : "—" }}</td>
            <td class="num">{{ row.hourmeter ? number(row.hourmeter, 1) : "—" }}</td>
            <td>{{ store.getCostCenter(row.costCenterId)?.name || "—" }}</td>
            <td>{{ row.osNumber || "—" }}</td>
            <td v-if="canDelete"><button class="btn danger" @click="remove(row)">Excluir</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
