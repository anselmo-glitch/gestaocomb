<script setup>
import { computed, reactive, toRaw } from "vue";
import { number, toNumber, uid } from "../core/format.js";
import { validateTransfer } from "../core/validators.js";
import { tankMovements, tankStock } from "../core/stock.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();
const canWrite = computed(() => store.userCan("canWrite"));
const canDelete = computed(() => store.userCan("canDelete"));
const raw = computed(() => toRaw(store.state));

const tanksStatus = computed(() =>
  store.state.tanks.map((tank) => {
    const stock = tankStock(raw.value, tank.id);
    const capacity = toNumber(tank.capacityLiters);
    return {
      tank,
      stock,
      capacity,
      pct: capacity > 0 ? Math.min(100, Math.max(0, (stock / capacity) * 100)) : 0,
      low: toNumber(tank.minLiters) > 0 && stock < toNumber(tank.minLiters),
      branchName: store.getBranch(tank.branchId)?.name || "",
      fuelName: store.getFuelType(tank.fuelTypeId)?.name || ""
    };
  })
);

function emptyTransfer() {
  return {
    date: `${store.selectedMonth}-01`,
    fromTankId: store.state.tanks[0]?.id || "",
    toTankId: store.state.tanks[1]?.id || "",
    liters: "",
    lossLiters: "0",
    carrier: "",
    notes: ""
  };
}
const transferForm = reactive(emptyTransfer());

const transfers = computed(() =>
  [...store.state.transfers].sort((a, b) => String(b.date).localeCompare(String(a.date)))
);

const movementsTankId = reactive({ value: "" });
const movements = computed(() =>
  movementsTankId.value ? [...tankMovements(raw.value, movementsTankId.value)].reverse().slice(0, 40) : []
);

const MOVEMENT_LABEL = {
  purchase: "Compra",
  fueling: "Abastecimento",
  transfer_in: "Transferência recebida",
  transfer_out: "Transferência enviada",
  adjustment: "Ajuste de inventário"
};

function submitTransfer() {
  if (!canWrite.value) return toast("Seu perfil não permite alteração.");
  const input = {
    id: uid("tra"),
    date: transferForm.date,
    fromTankId: transferForm.fromTankId,
    toTankId: transferForm.toTankId,
    liters: toNumber(transferForm.liters),
    lossLiters: toNumber(transferForm.lossLiters),
    carrier: transferForm.carrier.trim(),
    notes: transferForm.notes.trim()
  };
  const errors = validateTransfer(input);
  if (errors.length) return toast(errors.join(" "));
  const available = tankStock(raw.value, input.fromTankId);
  if (input.liters > available) {
    return toast(`Estoque insuficiente na origem (${number(available, 0)} L disponíveis).`);
  }
  store.state.transfers.push(input);
  store.persist(
    "transfer_created",
    `Transferência: ${number(input.liters, 0)} L de ${store.getTank(input.fromTankId)?.code} para ${store.getTank(input.toTankId)?.code} (perda ${number(input.lossLiters, 1)} L).`
  );
  toast("Transferência registrada: baixa na origem, entrada no destino.");
  Object.assign(transferForm, emptyTransfer());
}

function removeTransfer(row) {
  if (!canDelete.value) return toast("Seu perfil não permite exclusão.");
  if (!confirm("Excluir esta transferência? Os estoques serão recalculados.")) return;
  store.state.transfers = store.state.transfers.filter((item) => item.id !== row.id);
  store.persist("transfer_deleted", "Transferência excluída.");
  toast("Transferência excluída.");
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
        <h2>Estoque por filial e tanque</h2>
        <p>Estoque atual = entradas − saídas ± ajustes, calculado automaticamente a partir de compras, abastecimentos, transferências e inventários.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Filial</th><th>Tanque</th><th>Combustível</th>
            <th class="num">Capacidade (L)</th><th class="num">Estoque atual (L)</th><th class="num">Mínimo (L)</th>
            <th>Ocupação</th><th>Última aferição</th><th>Responsável</th><th>Situação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tanksStatus.length"><td colspan="10" class="help">Nenhum tanque cadastrado — use Cadastros básicos → Tanques.</td></tr>
          <tr v-for="row in tanksStatus" :key="row.tank.id" :class="{ 'inactive-row': row.tank.active === false }">
            <td>{{ row.branchName }}</td>
            <td><strong>{{ row.tank.code }}</strong></td>
            <td>{{ row.fuelName }}</td>
            <td class="num">{{ number(row.capacity, 0) }}</td>
            <td class="num"><strong :class="{ 'kpi-bad': row.low }">{{ number(row.stock, 0) }}</strong></td>
            <td class="num">{{ number(toNumber(row.tank.minLiters), 0) }}</td>
            <td style="min-width: 140px;">
              <div class="bar-track"><div class="bar-fill" :class="{ bad: row.low, warn: !row.low && row.pct > 90 }" :style="{ width: `${row.pct}%` }"></div></div>
            </td>
            <td>{{ row.tank.lastAuditDate ? formatDate(row.tank.lastAuditDate) : "—" }}</td>
            <td>{{ row.tank.responsible || "—" }}</td>
            <td>
              <span v-if="row.low" class="badge bad">Abaixo do mínimo</span>
              <span v-else-if="row.pct > 90" class="badge warn">Próximo da capacidade</span>
              <span v-else class="badge good">Normal</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <div class="panel-title">
      <div>
        <h2>Transferência entre filiais</h2>
        <p>Baixa na origem, entrada no destino, com registro do transportador e controle de perdas.</p>
      </div>
    </div>
    <form @submit.prevent="submitTransfer">
      <div class="form-grid">
        <div class="field"><label for="t-date">Data *</label><input id="t-date" v-model="transferForm.date" type="date" :disabled="!canWrite" /></div>
        <div class="field">
          <label for="t-from">Tanque de origem *</label>
          <select id="t-from" v-model="transferForm.fromTankId" :disabled="!canWrite">
            <option v-for="tank in store.state.tanks" :key="tank.id" :value="tank.id">
              {{ tank.code }} — {{ store.getBranch(tank.branchId)?.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="t-to">Tanque de destino *</label>
          <select id="t-to" v-model="transferForm.toTankId" :disabled="!canWrite">
            <option v-for="tank in store.state.tanks" :key="tank.id" :value="tank.id">
              {{ tank.code }} — {{ store.getBranch(tank.branchId)?.name }}
            </option>
          </select>
        </div>
        <div class="field"><label for="t-liters">Litros enviados *</label><input id="t-liters" v-model="transferForm.liters" type="number" step="0.01" :disabled="!canWrite" /></div>
        <div class="field"><label for="t-loss">Perda no transporte (L)</label><input id="t-loss" v-model="transferForm.lossLiters" type="number" step="0.01" :disabled="!canWrite" /></div>
        <div class="field"><label for="t-carrier">Caminhão transportador</label><input id="t-carrier" v-model="transferForm.carrier" placeholder="Placa/prefixo" :disabled="!canWrite" /></div>
        <div class="field"><label for="t-notes">Observação</label><input id="t-notes" v-model="transferForm.notes" :disabled="!canWrite" /></div>
      </div>
      <div class="actions"><button class="btn" :disabled="!canWrite">Registrar transferência</button></div>
    </form>
  </section>

  <div class="grid two">
    <section class="panel">
      <div class="panel-title"><div><h2>Transferências registradas</h2><p>{{ transfers.length }} registro(s).</p></div></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Origem</th><th>Destino</th><th class="num">Litros</th><th class="num">Perda</th><th>Transportador</th><th v-if="canDelete">Ações</th></tr>
          </thead>
          <tbody>
            <tr v-if="!transfers.length"><td colspan="7" class="help">Nenhuma transferência registrada.</td></tr>
            <tr v-for="row in transfers" :key="row.id">
              <td>{{ formatDate(row.date) }}</td>
              <td>{{ store.getTank(row.fromTankId)?.code }}</td>
              <td>{{ store.getTank(row.toTankId)?.code }}</td>
              <td class="num">{{ number(row.liters, 0) }}</td>
              <td class="num" :class="{ 'kpi-warn': toNumber(row.lossLiters) > 0 }">{{ number(toNumber(row.lossLiters), 1) }}</td>
              <td>{{ row.carrier || "—" }}</td>
              <td v-if="canDelete"><button class="btn danger" @click="removeTransfer(row)">Excluir</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title"><div><h2>Extrato de movimentações</h2><p>Últimos lançamentos do tanque selecionado.</p></div></div>
      <div class="form-grid compact" style="margin-bottom: 12px;">
        <div class="field">
          <label for="m-tank">Tanque</label>
          <select id="m-tank" v-model="movementsTankId.value">
            <option value="">— Selecione —</option>
            <option v-for="tank in store.state.tanks" :key="tank.id" :value="tank.id">{{ tank.code }}</option>
          </select>
        </div>
      </div>
      <div v-if="movementsTankId.value" class="table-wrap">
        <table style="min-width: 480px;">
          <thead><tr><th>Data</th><th>Tipo</th><th>Detalhe</th><th class="num">Litros</th></tr></thead>
          <tbody>
            <tr v-if="!movements.length"><td colspan="4" class="help">Sem movimentações.</td></tr>
            <tr v-for="movement in movements" :key="`${movement.type}${movement.refId}`">
              <td>{{ formatDate(movement.date) }}</td>
              <td>{{ MOVEMENT_LABEL[movement.type] }}</td>
              <td>{{ movement.description }}</td>
              <td class="num" :class="movement.liters >= 0 ? 'kpi-good' : 'kpi-bad'">
                {{ movement.liters >= 0 ? "+" : "" }}{{ number(movement.liters, 1) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">Selecione um tanque para ver o extrato.</div>
    </section>
  </div>
</template>
