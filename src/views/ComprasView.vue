<script setup>
import { computed, reactive, watch } from "vue";
import { money, number, toNumber, uid } from "../core/format.js";
import { validatePurchase } from "../core/validators.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const canWrite = computed(() => store.userCan("canWrite"));
const canDelete = computed(() => store.userCan("canDelete"));

function emptyForm() {
  return {
    date: `${store.selectedMonth}-01`,
    supplierId: store.state.suppliers[0]?.id || "",
    branchId: store.state.branches[0]?.id || "",
    fuelTypeId: store.state.fuelTypes[0]?.id || "",
    tankId: "",
    liters: "",
    unitPrice: "",
    invoiceNumber: "",
    carrier: "",
    notes: ""
  };
}

const form = reactive(emptyForm());

// Tanques compatíveis com a filial e o combustível selecionados.
const tankOptions = computed(() =>
  store.state.tanks.filter(
    (tank) => tank.active !== false && tank.branchId === form.branchId && (!form.fuelTypeId || tank.fuelTypeId === form.fuelTypeId)
  )
);
watch([() => form.branchId, () => form.fuelTypeId], () => {
  if (!tankOptions.value.some((tank) => tank.id === form.tankId)) {
    form.tankId = tankOptions.value[0]?.id || "";
  }
}, { immediate: true });

const totalPreview = computed(() => toNumber(form.liters) * toNumber(form.unitPrice));

const rows = computed(() =>
  [...store.state.purchases]
    .filter((row) => String(row.date).slice(0, 7) === store.selectedMonth)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
);
const monthTotal = computed(() => rows.value.reduce((sum, row) => sum + toNumber(row.totalCost), 0));

function submit() {
  if (!canWrite.value) return toast("Seu perfil não permite alteração.");
  const input = {
    id: uid("pur"),
    date: form.date,
    supplierId: form.supplierId,
    branchId: form.branchId,
    fuelTypeId: form.fuelTypeId,
    tankId: form.tankId,
    liters: toNumber(form.liters),
    unitPrice: toNumber(form.unitPrice),
    totalCost: Math.round(toNumber(form.liters) * toNumber(form.unitPrice) * 100) / 100,
    invoiceNumber: form.invoiceNumber.trim(),
    carrier: form.carrier.trim(),
    notes: form.notes.trim()
  };
  const errors = validatePurchase(input);
  if (errors.length) return toast(errors.join(" "));
  store.state.purchases.push(input);
  store.selectedMonth = String(input.date).slice(0, 7);
  store.persist("purchase_created", `Compra NF ${input.invoiceNumber} — ${number(input.liters, 0)} L para ${store.getTank(input.tankId)?.code}.`);
  toast("Compra registrada. Estoque do tanque atualizado.");
  Object.assign(form, emptyForm());
}

function remove(row) {
  if (!canDelete.value) return toast("Seu perfil não permite exclusão.");
  if (!confirm(`Excluir a compra NF ${row.invoiceNumber}? O estoque do tanque será recalculado.`)) return;
  store.state.purchases = store.state.purchases.filter((item) => item.id !== row.id);
  store.persist("purchase_deleted", `Compra NF ${row.invoiceNumber} excluída.`);
  toast("Compra excluída.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Registrar compra de combustível</h2>
        <p>Cada compra dá entrada automática no estoque do tanque de recebimento.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field"><label for="c-date">Data da compra *</label><input id="c-date" v-model="form.date" type="date" :disabled="!canWrite" /></div>
        <div class="field">
          <label for="c-supplier">Fornecedor *</label>
          <select id="c-supplier" v-model="form.supplierId" :disabled="!canWrite">
            <option v-for="row in store.state.suppliers" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="c-branch">Filial de destino *</label>
          <select id="c-branch" v-model="form.branchId" :disabled="!canWrite">
            <option v-for="row in store.state.branches" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="c-fuel">Combustível *</label>
          <select id="c-fuel" v-model="form.fuelTypeId" :disabled="!canWrite">
            <option v-for="row in store.state.fuelTypes" :key="row.id" :value="row.id">{{ row.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="c-tank">Tanque de recebimento *</label>
          <select id="c-tank" v-model="form.tankId" :disabled="!canWrite">
            <option v-for="tank in tankOptions" :key="tank.id" :value="tank.id">{{ tank.code }}</option>
          </select>
        </div>
        <div class="field"><label for="c-liters">Quantidade (L) *</label><input id="c-liters" v-model="form.liters" type="number" step="0.01" :disabled="!canWrite" /></div>
        <div class="field"><label for="c-price">Valor unitário (R$/L) *</label><input id="c-price" v-model="form.unitPrice" type="number" step="0.0001" placeholder="5.89" :disabled="!canWrite" /></div>
        <div class="field"><label for="c-nf">Nº NF *</label><input id="c-nf" v-model="form.invoiceNumber" :disabled="!canWrite" /></div>
        <div class="field"><label for="c-carrier">Transportadora</label><input id="c-carrier" v-model="form.carrier" :disabled="!canWrite" /></div>
        <div class="field"><label for="c-notes">Observação</label><input id="c-notes" v-model="form.notes" :disabled="!canWrite" /></div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!canWrite">Salvar compra</button>
        <span class="help">Valor total: <strong>{{ money(totalPreview) }}</strong></span>
      </div>
      <p v-if="!tankOptions.length" class="help kpi-warn">Nenhum tanque ativo para esta filial/combustível — cadastre em Cadastros básicos → Tanques.</p>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Compras de {{ store.selectedMonth }}</h2>
        <p>{{ rows.length }} compra(s) · total {{ money(monthTotal) }}</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>NF</th><th>Fornecedor</th><th>Filial</th><th>Combustível</th><th>Tanque</th>
            <th class="num">Litros</th><th class="num">R$/L</th><th class="num">Total</th><th>Transportadora</th><th v-if="canDelete">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="11" class="help">Nenhuma compra registrada neste mês.</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ String(row.date).slice(8, 10) }}/{{ String(row.date).slice(5, 7) }}</td>
            <td><strong>{{ row.invoiceNumber }}</strong></td>
            <td>{{ store.getSupplier(row.supplierId)?.name }}</td>
            <td>{{ store.getBranch(row.branchId)?.name }}</td>
            <td>{{ store.getFuelType(row.fuelTypeId)?.name }}</td>
            <td>{{ store.getTank(row.tankId)?.code }}</td>
            <td class="num">{{ number(row.liters, 0) }}</td>
            <td class="num">{{ number(row.unitPrice, 4) }}</td>
            <td class="num"><strong>{{ money(row.totalCost) }}</strong></td>
            <td>{{ row.carrier || "—" }}</td>
            <td v-if="canDelete"><button class="btn danger" @click="remove(row)">Excluir</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
