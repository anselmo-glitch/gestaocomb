<script setup>
import { computed } from "vue";
import { money, number } from "../core/format.js";

const props = defineProps({
  row: { type: Object, required: true } // item de costTypeBreakdown()
});

const COLOR_VAR = { diesel: "--cat-diesel", maintenance: "--cat-maintenance", tire: "--cat-tire", fixed: "--cat-fixed" };

const colorStyle = computed(() => ({ "--cost-color": `var(${COLOR_VAR[props.row.key] || "--primary"})` }));

// Seta indica se o realizado subiu (pior) ou caiu (melhor) frente ao previsto ajustado.
const trendDown = computed(() => props.row.realizado <= props.row.previsto);
const gainLabel = computed(() => (props.row.gain >= 0 ? "Ganho" : "Excesso"));
</script>

<template>
  <div class="cost-card" :style="colorStyle">
    <div class="cost-card-head">
      <span class="cost-avatar">{{ row.letter }}</span>
      <span class="cost-card-title">{{ row.name }}</span>
    </div>
    <div class="cost-row">
      <span class="cost-row-label">Previsto ajustado</span>
      <span class="cost-row-value">{{ money(row.previsto) }}</span>
    </div>
    <div class="cost-row realized">
      <span class="cost-row-label">Realizado</span>
      <span class="cost-row-value">{{ money(row.realizado) }}</span>
    </div>
    <span class="cost-trend badge" :class="trendDown ? 'good' : 'bad'">
      <span aria-hidden="true">{{ trendDown ? "↓" : "↑" }}</span>{{ number(Math.abs(row.pct), 1) }}%
    </span>
    <div class="cost-gain" :class="row.gain >= 0 ? 'kpi-good' : 'kpi-bad'">
      {{ gainLabel }}: {{ money(Math.abs(row.gain)) }}
    </div>
  </div>
</template>
