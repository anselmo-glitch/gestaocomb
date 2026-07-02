<script setup>
import { computed, reactive, toRaw, watch } from "vue";
import { number, toNumber, uid } from "../core/format.js";
import { validateInventory } from "../core/validators.js";
import { deviationSettings, tankStock } from "../core/stock.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const canWrite = computed(() => store.userCan("canWrite"));
const canDelete = computed(() => store.userCan("canDelete"));
const raw = computed(() => toRaw(store.state));
const settings = computed(() => deviationSettings(raw.value));

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    tankId: store.state.tanks[0]?.id || "",
    physicalLiters: "",
    reason: "",
    responsible: "",
    notes: ""
  };
}
const form = reactive(emptyForm());

// Estoque sistema é capturado no momento do registro (fotografia da régua).
const systemLitersNow = computed(() => (form.tankId ? tankStock(raw.value, form.tankId) : 0));
const previewDiff = computed(() => toNumber(form.physicalLiters) - systemLitersNow.value);

watch(() => form.tankId, () => {
  form.physicalLiters = "";
});

const rows = computed(() =>
  [...store.state.inventories].sort((a, b) => String(b.date).localeCompare(String(a.date)))
);

function diffOf(row) {
  return toNumber(row.physicalLiters) - toNumber(row.systemLiters);
}

function diffPct(row) {
  const system = toNumber(row.systemLiters);
  return system > 0 ? (diffOf(row) / system) * 100 : 0;
}

function submit() {
  if (!canWrite.value) return toast("Seu perfil não permite alteração.");
  const input = {
    id: uid("inv"),
    date: form.date,
    tankId: form.tankId,
    systemLiters: systemLitersNow.value,
    physicalLiters: toNumber(form.physicalLiters),
    reason: form.reason.trim(),
    responsible: form.responsible.trim(),
    notes: form.notes.trim()
  };
  const errors = validateInventory(input);
  if (errors.length) return toast(errors.join(" "));
  store.state.inventories.push(input);
  const tank = store.getTank(input.tankId);
  if (tank) tank.lastAuditDate = input.date;
  const diff = input.physicalLiters - input.systemLiters;
  store.persist(
    "inventory_created",
    `Inventário ${tank?.code}: sistema ${number(input.systemLiters, 0)} L × físico ${number(input.physicalLiters, 0)} L (${diff > 0 ? "+" : ""}${number(diff, 0)} L).`
  );
  toast("Inventário registrado. O estoque foi ajustado para o valor físico.");
  Object.assign(form, emptyForm());
}

function remove(row) {
  if (!canDelete.value) return toast("Seu perfil não permite exclusão.");
  if (!confirm("Excluir esta aferição? O ajuste de estoque será desfeito.")) return;
  store.state.inventories = store.state.inventories.filter((item) => item.id !== row.id);
  store.persist("inventory_deleted", "Aferição de inventário excluída.");
  toast("Aferição excluída.");
}

function formatDate(value) {
  const text = String(value || "");
  return `${text.slice(8, 10)}/${text.slice(5, 7)}/${text.slice(0, 4)}`;
}
</script>

<template>
  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Registrar aferição de inventário</h2>
        <p>Compare o estoque do sistema com a medição física. A diferença vira ajuste automático e alimenta o indicador de perdas.</p>
      </div>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field"><label for="i-date">Data da aferição *</label><input id="i-date" v-model="form.date" type="date" :disabled="!canWrite" /></div>
        <div class="field">
          <label for="i-tank">Tanque *</label>
          <select id="i-tank" v-model="form.tankId" :disabled="!canWrite">
            <option v-for="tank in store.state.tanks" :key="tank.id" :value="tank.id">
              {{ tank.code }} — {{ store.getBranch(tank.branchId)?.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>Estoque sistema (L)</label>
          <input :value="number(systemLitersNow, 1)" disabled />
        </div>
        <div class="field"><label for="i-physical">Estoque físico medido (L) *</label><input id="i-physical" v-model="form.physicalLiters" type="number" step="0.1" :disabled="!canWrite" /></div>
        <div class="field"><label for="i-reason">Motivo da diferença</label><input id="i-reason" v-model="form.reason" placeholder="Evaporação, vazamento, erro..." :disabled="!canWrite" /></div>
        <div class="field"><label for="i-resp">Responsável *</label><input id="i-resp" v-model="form.responsible" :disabled="!canWrite" /></div>
        <div class="field"><label for="i-notes">Observação</label><input id="i-notes" v-model="form.notes" :disabled="!canWrite" /></div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!canWrite">Registrar aferição</button>
        <span v-if="form.physicalLiters !== ''" class="help">
          Diferença:
          <strong :class="previewDiff < 0 ? 'kpi-bad' : previewDiff > 0 ? 'kpi-warn' : 'kpi-good'">
            {{ previewDiff > 0 ? "+" : "" }}{{ number(previewDiff, 1) }} L
          </strong>
        </span>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Histórico de inventários</h2>
        <p>Diferenças acima de {{ settings.inventoryAlertPct }}% geram alerta no dashboard.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Tanque</th>
            <th class="num">Sistema (L)</th><th class="num">Físico (L)</th><th class="num">Diferença (L)</th><th class="num">%</th>
            <th>Motivo</th><th>Responsável</th><th>Situação</th><th v-if="canDelete">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="10" class="help">Nenhuma aferição registrada.</td></tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ formatDate(row.date) }}</td>
            <td><strong>{{ store.getTank(row.tankId)?.code }}</strong></td>
            <td class="num">{{ number(toNumber(row.systemLiters), 0) }}</td>
            <td class="num">{{ number(toNumber(row.physicalLiters), 0) }}</td>
            <td class="num" :class="diffOf(row) < 0 ? 'kpi-bad' : diffOf(row) > 0 ? 'kpi-warn' : 'kpi-good'">
              {{ diffOf(row) > 0 ? "+" : "" }}{{ number(diffOf(row), 0) }}
            </td>
            <td class="num">{{ number(diffPct(row), 2) }}%</td>
            <td>{{ row.reason || "—" }}</td>
            <td>{{ row.responsible || "—" }}</td>
            <td>
              <span v-if="Math.abs(diffPct(row)) > settings.inventoryAlertPct" class="badge bad">Acima do limite</span>
              <span v-else class="badge good">Dentro do limite</span>
            </td>
            <td v-if="canDelete"><button class="btn danger" @click="remove(row)">Excluir</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
