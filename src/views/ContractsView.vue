<script setup>
import { computed, reactive, ref } from "vue";
import { money, toNumber, uid } from "../core/format.js";
import { validateContract } from "../core/validators.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const editingId = ref(null);
const editing = computed(() => (editingId.value ? store.getContract(editingId.value) : null));

function emptyForm() {
  return { code: "", name: "", client: "", branchId: store.state.branches[0]?.id || "", plannedDieselPrice: "", fixedCostMonthly: "", active: "true" };
}

const form = reactive(emptyForm());

function loadIntoForm(contract) {
  form.code = contract.code;
  form.name = contract.name;
  form.client = contract.client;
  form.branchId = contract.branchId;
  form.plannedDieselPrice = contract.plannedDieselPrice || "";
  form.fixedCostMonthly = contract.fixedCostMonthly || "";
  form.active = contract.active !== false ? "true" : "false";
}

function startEdit(contract) {
  editingId.value = contract.id;
  loadIntoForm(contract);
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

function submit() {
  if (!store.userCan("canWrite")) return toast("Seu perfil não permite alteração.");
  const input = {
    id: editingId.value || uid("contract"),
    code: form.code.trim(),
    name: form.name.trim(),
    client: form.client.trim(),
    branchId: form.branchId,
    plannedDieselPrice: toNumber(form.plannedDieselPrice),
    fixedCostMonthly: toNumber(form.fixedCostMonthly),
    active: form.active === "true"
  };
  const errors = validateContract(input, store.state.contracts);
  if (errors.length) return toast(errors.join(" "));
  if (editingId.value) {
    Object.assign(store.getContract(editingId.value), input);
    editingId.value = null;
    store.persist("contract_updated", `Contrato ${input.code} atualizado.`);
    toast("Contrato atualizado.");
  } else {
    store.state.contracts.push(input);
    store.persist("contract_created", `Contrato ${input.code} criado.`);
    toast("Contrato salvo.");
  }
  Object.assign(form, emptyForm());
}

function removeContract(contract) {
  if (!store.userCan("canDelete")) return toast("Seu perfil não permite exclusão.");
  const linkedVehicles = store.state.vehicles.filter((vehicle) => vehicle.contractId === contract.id);
  if (linkedVehicles.length) {
    return toast(`Não é possível excluir: ${linkedVehicles.length} veículo(s) vinculados a este contrato.`);
  }
  if (!confirm(`Excluir o contrato ${contract.code}?`)) return;
  store.state.contracts = store.state.contracts.filter((row) => row.id !== contract.id);
  if (editingId.value === contract.id) cancelEdit();
  store.persist("contract_deleted", `Contrato ${contract.code} excluído.`);
  toast("Contrato excluído.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>{{ editing ? `Editar contrato ${editing.code}` : "Cadastrar contrato" }}</h2>
        <p>O preço previsto de diesel é usado nas fórmulas programadas e ajustadas.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field"><label>Código</label><input v-model="form.code" :disabled="!store.userCan('canWrite')" placeholder="Ex.: PR-BA" /></div>
        <div class="field"><label>Nome do contrato</label><input v-model="form.name" :disabled="!store.userCan('canWrite')" placeholder="Ex.: PetroReconcavo BA" /></div>
        <div class="field"><label>Cliente</label><input v-model="form.client" :disabled="!store.userCan('canWrite')" placeholder="Cliente" /></div>
        <div class="field">
          <label>Filial</label>
          <select v-model="form.branchId" :disabled="!store.userCan('canWrite')">
            <option v-for="branch in store.state.branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
          </select>
        </div>
        <div class="field"><label>Preço diesel previsto</label><input v-model="form.plannedDieselPrice" :disabled="!store.userCan('canWrite')" type="number" step="0.01" placeholder="5.30" /></div>
        <div class="field"><label>Custo fixo mensal</label><input v-model="form.fixedCostMonthly" :disabled="!store.userCan('canWrite')" type="number" step="0.01" placeholder="0,00" /></div>
        <div class="field">
          <label>Status</label>
          <select v-model="form.active" :disabled="!store.userCan('canWrite')">
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!store.userCan('canWrite')">{{ editing ? "Atualizar contrato" : "Salvar contrato" }}</button>
        <button v-if="editing" type="button" class="btn ghost" @click="cancelEdit">Cancelar edição</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title"><div><h2>Contratos cadastrados</h2><p>Base única usada nos cálculos mensais.</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Código</th><th>Nome</th><th>Cliente</th><th>Filial</th><th>Diesel prev.</th><th>Fixo mensal</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-for="contract in store.state.contracts" :key="contract.id">
            <td><strong>{{ contract.code }}</strong></td>
            <td>{{ contract.name }}</td>
            <td>{{ contract.client }}</td>
            <td>{{ store.getBranch(contract.branchId)?.name }}</td>
            <td>{{ money(contract.plannedDieselPrice) }}</td>
            <td>{{ money(contract.fixedCostMonthly) }}</td>
            <td><span class="badge" :class="contract.active ? 'good' : 'bad'">{{ contract.active ? "Ativo" : "Inativo" }}</span></td>
            <td>
              <button class="btn secondary" @click="$router.push(`/contracts/${contract.id}`)">Abrir</button>
              <button class="btn ghost" :disabled="!store.userCan('canWrite')" @click="startEdit(contract)">Editar</button>
              <button v-if="store.userCan('canDelete')" class="btn danger" @click="removeContract(contract)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
