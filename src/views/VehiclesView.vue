<script setup>
import { computed, reactive, ref } from "vue";
import { integer, money, number, toNumber, uid } from "../core/format.js";
import { validateVehicle } from "../core/validators.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const editingId = ref(null);
const editing = computed(() => (editingId.value ? store.getVehicle(editingId.value) : null));

function emptyForm() {
  return {
    contractId: store.state.contracts[0]?.id || "",
    code: "",
    plate: "",
    description: "",
    category: "",
    plannedKm: "",
    avgKmL: "",
    pumpLitersHour: "0",
    pumpHours: "0",
    tireCpk: "",
    maintenanceCpk: "",
    active: "true"
  };
}

const form = reactive(emptyForm());

function loadIntoForm(vehicle) {
  form.contractId = vehicle.contractId;
  form.code = vehicle.code;
  form.plate = vehicle.plate;
  form.description = vehicle.description;
  form.category = vehicle.category;
  form.plannedKm = vehicle.plannedKm || "";
  form.avgKmL = vehicle.avgKmL || "";
  form.pumpLitersHour = String(vehicle.pumpLitersHour ?? 0);
  form.pumpHours = String(vehicle.pumpHours ?? 0);
  form.tireCpk = vehicle.tireCpk || "";
  form.maintenanceCpk = vehicle.maintenanceCpk || "";
  form.active = vehicle.active !== false ? "true" : "false";
}

function startEdit(vehicle) {
  editingId.value = vehicle.id;
  loadIntoForm(vehicle);
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

function submit() {
  if (!store.userCan("canWrite")) return toast("Seu perfil não permite alteração.");
  const input = {
    id: editingId.value || uid("vehicle"),
    contractId: form.contractId,
    code: form.code.trim(),
    plate: form.plate.trim().toUpperCase(),
    description: form.description.trim(),
    category: form.category.trim(),
    plannedKm: toNumber(form.plannedKm),
    avgKmL: toNumber(form.avgKmL),
    pumpLitersHour: toNumber(form.pumpLitersHour),
    pumpHours: toNumber(form.pumpHours),
    tireCpk: toNumber(form.tireCpk),
    maintenanceCpk: toNumber(form.maintenanceCpk),
    active: form.active === "true"
  };
  const errors = validateVehicle(input, store.state.vehicles);
  if (errors.length) return toast(errors.join(" "));
  if (editingId.value) {
    const vehicle = store.getVehicle(editingId.value);
    // Variação de placas por prefixo: troca de placa entra no histórico.
    const previousPlate = vehicle.plate;
    const plateChanged = Boolean(previousPlate) && previousPlate !== input.plate;
    input.plateHistory = plateChanged
      ? [...(vehicle.plateHistory || []), { plate: previousPlate, until: new Date().toISOString().slice(0, 10) }]
      : vehicle.plateHistory || [];
    Object.assign(vehicle, input);
    editingId.value = null;
    store.persist(
      plateChanged ? "vehicle_plate_changed" : "vehicle_updated",
      plateChanged
        ? `Prefixo ${input.code} atualizado — placa ${previousPlate} → ${input.plate} (histórico registrado).`
        : `Prefixo ${input.code} atualizado.`
    );
    toast(plateChanged ? `Prefixo atualizado. Placa anterior ${previousPlate} guardada no histórico.` : "Prefixo atualizado.");
  } else {
    input.plateHistory = [];
    store.state.vehicles.push(input);
    store.persist("vehicle_created", `Prefixo ${input.code} criado.`);
    toast("Prefixo salvo.");
  }
  Object.assign(form, emptyForm());
}

function plateHistoryLabel(vehicle) {
  const history = vehicle.plateHistory || [];
  if (!history.length) return "";
  return history.map((item) => `${item.plate} (até ${item.until})`).join(", ");
}

function removeVehicle(vehicle) {
  if (!store.userCan("canDelete")) return toast("Seu perfil não permite exclusão.");
  const linkedEntries = store.state.monthlyEntries.filter((entry) => entry.vehicleId === vehicle.id);
  if (linkedEntries.length) {
    return toast(`Não é possível excluir: existem ${linkedEntries.length} lançamento(s) mensais deste veículo.`);
  }
  if (!confirm(`Excluir o veículo ${vehicle.code}?`)) return;
  store.state.vehicles = store.state.vehicles.filter((row) => row.id !== vehicle.id);
  if (editingId.value === vehicle.id) cancelEdit();
  store.persist("vehicle_deleted", `Veículo ${vehicle.code} excluído.`);
  toast("Veículo excluído.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>{{ editing ? `Editar prefixo ${editing.code}` : "Cadastrar prefixo (posto de trabalho)" }}</h2>
        <p>Cada prefixo é um posto de trabalho vinculado a um contrato. Placa é obrigatória — nenhum prefixo roda sem placa; trocas ficam no histórico.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field">
          <label>Contrato</label>
          <select v-model="form.contractId" :disabled="!store.userCan('canWrite')">
            <option v-for="contract in store.state.contracts" :key="contract.id" :value="contract.id">{{ contract.code }}</option>
          </select>
        </div>
        <div class="field"><label>Prefixo *</label><input v-model="form.code" :disabled="!store.userCan('canWrite')" placeholder="Ex.: CARMO 318" /></div>
        <div class="field"><label>Placa atual *</label><input v-model="form.plate" :disabled="!store.userCan('canWrite')" placeholder="Ex.: ROD0A00" /></div>
        <div class="field"><label>Descrição</label><input v-model="form.description" :disabled="!store.userCan('canWrite')" placeholder="Ex.: Cavalo mecânico" /></div>
        <div class="field"><label>Categoria</label><input v-model="form.category" :disabled="!store.userCan('canWrite')" placeholder="Cavalo, tanque, munck..." /></div>
        <div class="field"><label>KM planejado</label><input v-model="form.plannedKm" :disabled="!store.userCan('canWrite')" type="number" step="1" /></div>
        <div class="field"><label>Média km/l</label><input v-model="form.avgKmL" :disabled="!store.userCan('canWrite')" type="number" step="0.01" /></div>
        <div class="field"><label>Bomba L/h</label><input v-model="form.pumpLitersHour" :disabled="!store.userCan('canWrite')" type="number" step="0.01" /></div>
        <div class="field"><label>Horas bomba</label><input v-model="form.pumpHours" :disabled="!store.userCan('canWrite')" type="number" step="0.01" /></div>
        <div class="field"><label>CPK pneu</label><input v-model="form.tireCpk" :disabled="!store.userCan('canWrite')" type="number" step="0.01" /></div>
        <div class="field"><label>CPK manutenção</label><input v-model="form.maintenanceCpk" :disabled="!store.userCan('canWrite')" type="number" step="0.01" /></div>
        <div class="field">
          <label>Status</label>
          <select v-model="form.active" :disabled="!store.userCan('canWrite')">
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!store.userCan('canWrite')">{{ editing ? "Atualizar veículo" : "Salvar veículo" }}</button>
        <button v-if="editing" type="button" class="btn ghost" @click="cancelEdit">Cancelar edição</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title"><div><h2>Prefixos cadastrados</h2><p>O KM realizado será lançado por prefixo e não será redistribuído.</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Prefixo</th><th>Placa</th><th>Descrição</th><th>Contrato</th><th>KM plan.</th><th>Média</th><th>Bomba</th><th>CPK pneu</th><th>CPK manut.</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-for="vehicle in store.state.vehicles" :key="vehicle.id">
            <td><strong>{{ vehicle.code }}</strong></td>
            <td>
              <span v-if="vehicle.plate">{{ vehicle.plate }}</span>
              <span v-else class="badge bad">Sem placa</span>
              <br v-if="plateHistoryLabel(vehicle)" />
              <span v-if="plateHistoryLabel(vehicle)" class="help">Anteriores: {{ plateHistoryLabel(vehicle) }}</span>
            </td>
            <td>{{ vehicle.description }}</td>
            <td>{{ store.getContract(vehicle.contractId)?.code }}</td>
            <td>{{ integer(vehicle.plannedKm) }}</td>
            <td>{{ number(vehicle.avgKmL, 2) }} km/l</td>
            <td>{{ number(vehicle.pumpLitersHour, 2) }} L/h × {{ number(vehicle.pumpHours, 2) }} h</td>
            <td>{{ money(vehicle.tireCpk) }}</td>
            <td>{{ money(vehicle.maintenanceCpk) }}</td>
            <td><span class="badge" :class="vehicle.active ? 'good' : 'bad'">{{ vehicle.active ? "Ativo" : "Inativo" }}</span></td>
            <td>
              <button class="btn ghost" :disabled="!store.userCan('canWrite')" @click="startEdit(vehicle)">Editar</button>
              <button v-if="store.userCan('canDelete')" class="btn danger" @click="removeVehicle(vehicle)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
