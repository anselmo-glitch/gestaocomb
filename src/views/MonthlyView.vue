<script setup>
import { reactive, watch } from "vue";
import { integer, toNumber, uid } from "../core/format.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";
import MonthBranchFilter from "../components/MonthBranchFilter.vue";

const store = useAppStore();
const edits = reactive({});

function draftFor(vehicle) {
  const entry = store.state.monthlyEntries.find((row) => row.month === store.selectedMonth && row.vehicleId === vehicle.id);
  return {
    active: entry?.active !== false,
    actualKm: entry?.actualKm || "",
    actualDieselLiters: entry?.actualDieselLiters || "",
    actualDieselPrice: entry?.actualDieselPrice || "",
    notes: entry?.notes || ""
  };
}

function rebuildEdits() {
  for (const key of Object.keys(edits)) delete edits[key];
  for (const vehicle of store.state.vehicles) edits[vehicle.id] = draftFor(vehicle);
}

rebuildEdits();
watch(() => store.selectedMonth, rebuildEdits);

function getOrCreateEntry(month, vehicleId) {
  let entry = store.state.monthlyEntries.find((row) => row.month === month && row.vehicleId === vehicleId);
  if (!entry) {
    const vehicle = store.getVehicle(vehicleId);
    entry = {
      id: uid("entry"),
      month,
      vehicleId,
      active: Boolean(vehicle?.active),
      actualKm: 0,
      actualDieselLiters: 0,
      actualDieselPrice: 0,
      notes: ""
    };
    store.state.monthlyEntries.push(entry);
  }
  return entry;
}

function fillActive() {
  if (!store.userCan("canWrite")) return toast("Seu perfil não permite alteração.");
  for (const vehicle of store.state.vehicles) getOrCreateEntry(store.selectedMonth, vehicle.id);
  store.persist("monthly_rows_created", `Linhas do mês ${store.selectedMonth} criadas.`);
  rebuildEdits();
  toast("Linhas criadas.");
}

function saveMonthly() {
  if (!store.userCan("canWrite")) return toast("Seu perfil não permite alteração.");
  for (const vehicle of store.state.vehicles) {
    const draft = edits[vehicle.id];
    if (!draft) continue;
    const entry = getOrCreateEntry(store.selectedMonth, vehicle.id);
    entry.active = draft.active;
    entry.actualKm = toNumber(draft.actualKm);
    entry.actualDieselLiters = toNumber(draft.actualDieselLiters);
    entry.actualDieselPrice = toNumber(draft.actualDieselPrice);
    entry.notes = draft.notes;
  }
  store.persist("monthly_entries_saved", `Lançamentos do mês ${store.selectedMonth} salvos.`);
  toast("Lançamentos salvos.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div><h2>Lançamento por veículo</h2><p>Cada veículo usa o KM informado na própria linha — o sistema não redistribui.</p></div>
    </div>
  </section>
  <MonthBranchFilter />
  <section class="panel">
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Ativo</th><th>Bem</th><th>Contrato</th><th>Filial</th><th>KM planejado</th><th>KM realizado</th><th>Litros reais</th><th>Preço real</th><th>Observação</th></tr>
        </thead>
        <tbody>
          <template v-for="vehicle in store.state.vehicles" :key="vehicle.id">
            <tr
              v-if="store.selectedBranch === 'all' || store.getContract(vehicle.contractId)?.branchId === store.selectedBranch"
              :class="{ 'inactive-row': edits[vehicle.id] && !edits[vehicle.id].active }"
            >
              <td><input type="checkbox" v-model="edits[vehicle.id].active" :disabled="!store.userCan('canWrite')" /></td>
              <td><strong>{{ vehicle.code }}</strong><br><span class="help">{{ vehicle.description }}</span></td>
              <td>{{ store.getContract(vehicle.contractId)?.code }}</td>
              <td>{{ store.getBranch(store.getContract(vehicle.contractId)?.branchId)?.name }}</td>
              <td>{{ integer(vehicle.plannedKm) }}</td>
              <td><input type="number" step="1" v-model="edits[vehicle.id].actualKm" :disabled="!store.userCan('canWrite')" /></td>
              <td><input type="number" step="0.01" v-model="edits[vehicle.id].actualDieselLiters" :disabled="!store.userCan('canWrite')" placeholder="Opcional" /></td>
              <td><input type="number" step="0.01" v-model="edits[vehicle.id].actualDieselPrice" :disabled="!store.userCan('canWrite')" placeholder="Opcional" /></td>
              <td><input v-model="edits[vehicle.id].notes" :disabled="!store.userCan('canWrite')" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div class="actions">
      <button class="btn" :disabled="!store.userCan('canWrite')" @click="saveMonthly">Salvar lançamentos</button>
      <button class="btn secondary" :disabled="!store.userCan('canWrite')" @click="fillActive">Criar linhas zeradas do mês</button>
    </div>
    <p class="help">Litros e preço por veículo são opcionais. Se estiverem vazios, o sistema usa o rateio do diesel comprado por filial.</p>
  </section>
</template>
