<script setup>
// Selo de classificação de desvio: verde (Normal), âmbar (Atenção), vermelho (Crítico).
// Sempre com texto junto da cor (a cor nunca é o único indicador).
defineProps({
  status: { type: String, required: true }, // ok | atencao | critico
  label: { type: String, default: "" }
});

const FALLBACK = { ok: "Normal", atencao: "Atenção", critico: "Crítico" };
</script>

<template>
  <span class="badge" :class="{ good: status === 'ok', warn: status === 'atencao', bad: status === 'critico' }">
    <span class="status-dot" aria-hidden="true"></span>{{ label || FALLBACK[status] || status }}
  </span>
</template>
