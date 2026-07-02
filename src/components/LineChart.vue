<script setup>
import { computed } from "vue";

// Gráfico de linhas SVG leve (previsto × realizado), sem dependência externa.
// series: [{ name, values: number[], color }] — todas com o mesmo comprimento de labels.
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  height: { type: Number, default: 220 },
  formatValue: { type: Function, default: (value) => value.toLocaleString("pt-BR") }
});

const WIDTH = 720;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

const maxValue = computed(() => {
  const all = props.series.flatMap((serie) => serie.values);
  const max = Math.max(...all, 0);
  return max > 0 ? max * 1.08 : 1;
});

function x(index) {
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const steps = Math.max(props.labels.length - 1, 1);
  return PAD.left + (index / steps) * innerWidth;
}

function y(value) {
  const innerHeight = props.height - PAD.top - PAD.bottom;
  return PAD.top + innerHeight * (1 - value / maxValue.value);
}

const gridLines = computed(() => {
  const lines = [];
  for (let step = 0; step <= 4; step += 1) {
    const value = (maxValue.value / 4) * step;
    lines.push({ y: y(value), label: props.formatValue(Math.round(value)) });
  }
  return lines;
});

const paths = computed(() =>
  props.series.map((serie) => ({
    ...serie,
    d: serie.values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ")
  }))
);

const xTicks = computed(() => {
  const total = props.labels.length;
  const stride = Math.ceil(total / 8);
  return props.labels
    .map((label, index) => ({ label, index }))
    .filter((tick) => tick.index % stride === 0 || tick.index === total - 1);
});
</script>

<template>
  <figure class="chart">
    <svg :viewBox="`0 0 ${WIDTH} ${height}`" preserveAspectRatio="xMidYMid meet" role="img">
      <g v-for="line in gridLines" :key="line.y">
        <line :x1="PAD.left" :x2="WIDTH - PAD.right" :y1="line.y" :y2="line.y" class="chart-grid" />
        <text :x="PAD.left - 8" :y="line.y + 4" text-anchor="end" class="chart-tick">{{ line.label }}</text>
      </g>
      <text
        v-for="tick in xTicks"
        :key="`x${tick.index}`"
        :x="x(tick.index)"
        :y="height - 8"
        text-anchor="middle"
        class="chart-tick"
      >
        {{ tick.label }}
      </text>
      <path
        v-for="serie in paths"
        :key="serie.name"
        :d="serie.d"
        fill="none"
        :stroke="serie.color"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      >
        <title>{{ serie.name }}</title>
      </path>
    </svg>
    <figcaption class="chart-legend">
      <span v-for="serie in series" :key="serie.name" class="chart-legend-item">
        <span class="chart-swatch" :style="{ background: serie.color }" aria-hidden="true"></span>{{ serie.name }}
      </span>
    </figcaption>
  </figure>
</template>
