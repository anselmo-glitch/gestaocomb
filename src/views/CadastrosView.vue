<script setup>
import { computed, reactive, ref, toRaw } from "vue";
import { number, toNumber, uid } from "../core/format.js";
import { validateSimpleName, validateTank } from "../core/validators.js";
import { tankStock } from "../core/stock.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();

// Configuração declarativa dos cadastros. Cada aba define campos e validação.
const SECTIONS = {
  branches: {
    label: "Filiais",
    collection: "branches",
    prefix: "branch",
    fields: [{ key: "name", label: "Nome da filial", type: "text", required: true }],
    validate: (input) => validateSimpleName(input, "Nome da filial"),
    usedBy: (state, id) =>
      state.tanks.some((row) => row.branchId === id) || state.contracts.some((row) => row.branchId === id)
  },
  tanks: {
    label: "Tanques",
    collection: "tanks",
    prefix: "tank",
    fields: [
      { key: "code", label: "Código do tanque", type: "text", required: true, placeholder: "Ex.: TQ-01" },
      { key: "branchId", label: "Filial", type: "select", options: "branches", required: true },
      { key: "fuelTypeId", label: "Combustível", type: "select", options: "fuelTypes", required: true },
      { key: "capacityLiters", label: "Capacidade total (L)", type: "number", required: true },
      { key: "minLiters", label: "Estoque mínimo (L)", type: "number" },
      { key: "lastAuditDate", label: "Última aferição", type: "date" },
      { key: "responsible", label: "Responsável", type: "text" }
    ],
    validate: (input, state) => validateTank(input, state.tanks),
    usedBy: (state, id) =>
      state.purchases.some((row) => row.tankId === id) ||
      state.fuelings.some((row) => row.tankId === id) ||
      state.transfers.some((row) => row.fromTankId === id || row.toTankId === id) ||
      state.inventories.some((row) => row.tankId === id)
  },
  fuelTypes: {
    label: "Combustíveis",
    collection: "fuelTypes",
    prefix: "fuel",
    fields: [{ key: "name", label: "Tipo de combustível", type: "text", required: true, placeholder: "Ex.: Diesel S10" }],
    validate: (input) => validateSimpleName(input, "Tipo de combustível"),
    usedBy: (state, id) => state.tanks.some((row) => row.fuelTypeId === id) || state.purchases.some((row) => row.fuelTypeId === id)
  },
  suppliers: {
    label: "Fornecedores",
    collection: "suppliers",
    prefix: "sup",
    fields: [
      { key: "name", label: "Razão social", type: "text", required: true },
      { key: "document", label: "CNPJ", type: "text" },
      { key: "city", label: "Cidade/UF", type: "text" }
    ],
    validate: (input) => validateSimpleName(input, "Razão social"),
    usedBy: (state, id) => state.purchases.some((row) => row.supplierId === id)
  },
  costCenters: {
    label: "Centros de custo",
    collection: "costCenters",
    prefix: "cc",
    fields: [
      { key: "name", label: "Nome do centro de custo", type: "text", required: true },
      { key: "contractId", label: "Contrato vinculado", type: "select", options: "contracts", optional: true }
    ],
    validate: (input) => validateSimpleName(input, "Nome do centro de custo"),
    usedBy: (state, id) => state.fuelings.some((row) => row.costCenterId === id)
  },
  drivers: {
    label: "Motoristas/Operadores",
    collection: "drivers",
    prefix: "drv",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "branchId", label: "Filial", type: "select", options: "branches", optional: true }
    ],
    validate: (input) => validateSimpleName(input, "Nome"),
    usedBy: (state, id) => state.fuelings.some((row) => row.driverId === id)
  }
};

const activeSection = ref("branches");
const section = computed(() => SECTIONS[activeSection.value]);
const rows = computed(() => store.state[section.value.collection] || []);
const editingId = ref(null);
const form = reactive({});

const canWrite = computed(() => store.userCan("canWrite"));
const canDelete = computed(() => store.userCan("canDelete"));

function optionsFor(field) {
  if (field.options === "branches") return store.state.branches.map((row) => ({ id: row.id, label: row.name }));
  if (field.options === "fuelTypes") return store.state.fuelTypes.map((row) => ({ id: row.id, label: row.name }));
  if (field.options === "contracts") return store.state.contracts.map((row) => ({ id: row.id, label: `${row.code} — ${row.name}` }));
  return [];
}

function resetForm() {
  editingId.value = null;
  for (const key of Object.keys(form)) delete form[key];
  for (const field of section.value.fields) {
    form[field.key] = field.type === "select" && !field.optional ? optionsFor(field)[0]?.id || "" : "";
  }
  form.active = "true";
}

function switchSection(key) {
  activeSection.value = key;
  resetForm();
}

resetForm();

function startEdit(row) {
  editingId.value = row.id;
  for (const field of section.value.fields) form[field.key] = row[field.key] ?? "";
  form.active = row.active === false ? "false" : "true";
}

function displayValue(row, field) {
  const value = row[field.key];
  if (field.type === "select") {
    return optionsFor(field).find((option) => option.id === value)?.label || "—";
  }
  if (field.type === "number") return value ? number(toNumber(value), 0) : "—";
  return value || "—";
}

function submit() {
  if (!canWrite.value) return toast("Seu perfil não permite alteração.");
  const input = { id: editingId.value || uid(section.value.prefix), active: form.active === "true" };
  for (const field of section.value.fields) {
    input[field.key] = field.type === "number" ? toNumber(form[field.key]) : String(form[field.key] ?? "").trim();
  }
  const errors = section.value.validate(input, toRaw(store.state));
  if (errors.length) return toast(errors.join(" "));
  if (editingId.value) {
    Object.assign(store.byId(section.value.collection, editingId.value), input);
    store.persist(`${section.value.collection}_updated`, `${section.value.label}: registro atualizado (${input.name || input.code}).`);
    toast("Registro atualizado.");
  } else {
    store.state[section.value.collection].push(input);
    store.persist(`${section.value.collection}_created`, `${section.value.label}: registro criado (${input.name || input.code}).`);
    toast("Registro salvo.");
  }
  resetForm();
}

function remove(row) {
  if (!canDelete.value) return toast("Seu perfil não permite exclusão.");
  if (section.value.usedBy(toRaw(store.state), row.id)) {
    return toast("Não é possível excluir: registro em uso por outros lançamentos.");
  }
  if (!confirm(`Excluir "${row.name || row.code}"?`)) return;
  store.state[section.value.collection] = store.state[section.value.collection].filter((item) => item.id !== row.id);
  if (editingId.value === row.id) resetForm();
  store.persist(`${section.value.collection}_deleted`, `${section.value.label}: registro excluído (${row.name || row.code}).`);
  toast("Registro excluído.");
}

function stockOf(row) {
  return number(tankStock(toRaw(store.state), row.id), 0);
}
</script>

<template>
  <div class="subtabs">
    <button
      v-for="(config, key) in SECTIONS"
      :key="key"
      class="subtab"
      :class="{ active: activeSection === key }"
      @click="switchSection(key)"
    >
      {{ config.label }}
    </button>
  </div>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>{{ editingId ? `Editar — ${section.label}` : `Cadastrar — ${section.label}` }}</h2>
        <p>Cadastros essenciais usados por compras, estoque e abastecimentos.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div v-for="field in section.fields" :key="field.key" class="field">
          <label :for="`f-${field.key}`">{{ field.label }}{{ field.required ? " *" : "" }}</label>
          <select v-if="field.type === 'select'" :id="`f-${field.key}`" v-model="form[field.key]" :disabled="!canWrite">
            <option v-if="field.optional" value="">— Sem vínculo —</option>
            <option v-for="option in optionsFor(field)" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
          <input
            v-else
            :id="`f-${field.key}`"
            v-model="form[field.key]"
            :type="field.type"
            :step="field.type === 'number' ? '0.01' : undefined"
            :placeholder="field.placeholder || ''"
            :disabled="!canWrite"
          />
        </div>
        <div class="field">
          <label for="f-active">Status</label>
          <select id="f-active" v-model="form.active" :disabled="!canWrite">
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!canWrite">{{ editingId ? "Atualizar" : "Salvar" }}</button>
        <button v-if="editingId" type="button" class="btn ghost" @click="resetForm">Cancelar edição</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>{{ section.label }} cadastrados</h2>
        <p>{{ rows.length }} registro(s).</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="field in section.fields" :key="field.key">{{ field.label }}</th>
            <th v-if="activeSection === 'tanks'" class="num">Estoque atual (L)</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td :colspan="section.fields.length + 3" class="help">Nenhum registro ainda.</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td v-for="field in section.fields" :key="field.key">{{ displayValue(row, field) }}</td>
            <td v-if="activeSection === 'tanks'" class="num">{{ stockOf(row) }}</td>
            <td><span class="badge" :class="row.active === false ? 'bad' : 'good'">{{ row.active === false ? "Inativo" : "Ativo" }}</span></td>
            <td>
              <button class="btn ghost" :disabled="!canWrite" @click="startEdit(row)">Editar</button>
              <button v-if="canDelete" class="btn danger" @click="remove(row)">Excluir</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
