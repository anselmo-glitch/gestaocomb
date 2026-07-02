<script setup>
import { computed } from "vue";
import { money, number } from "../core/format.js";
import { useAppStore } from "../stores/appStore.js";
import StatusBadge from "./StatusBadge.vue";

// Painel "Previsto × Realizado" — formato do print de referência:
// Indicador | Previsto | Realizado | Diferença | %
const props = defineProps({
  rows: { type: Array, required: true } // saída de prevRealPanel()
});

const store = useAppStore();
const canViewPlanned = computed(() => store.userCan("canViewPlanned"));

function formatCell(row, value) {
  if (row.key === "value") return money(value);
  return number(value, row.decimals ?? 0);
}

function formatDiff(row) {
  const prefix = row.diff > 0 ? "+" : "";
  return `${prefix}${formatCell(row, row.diff)}`;
}
</script>

<template>
  <div class="table-wrap">
    <table class="prevreal">
      <thead>
        <tr>
          <th>Indicador</th>
          <th v-if="canViewPlanned">Previsto</th>
          <th>Realizado</th>
          <th v-if="canViewPlanned">Diferença</th>
          <th v-if="canViewPlanned">%</th>
          <th v-if="canViewPlanned">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td>{{ row.indicator }}</td>
          <td v-if="canViewPlanned" class="num">{{ formatCell(row, row.previsto) }}</td>
          <td class="num">{{ formatCell(row, row.realizado) }}</td>
          <td v-if="canViewPlanned" class="num" :class="{ 'kpi-bad': row.status === 'critico', 'kpi-warn': row.status === 'atencao' }">
            {{ formatDiff(row) }}
          </td>
          <td v-if="canViewPlanned" class="num">{{ row.pct > 0 ? "+" : "" }}{{ number(row.pct, 1) }}%</td>
          <td v-if="canViewPlanned"><StatusBadge :status="row.status" :label="row.label" /></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-if="!canViewPlanned" class="help">Seu perfil (Operador) visualiza apenas valores realizados.</p>
</template>
