<script setup>
import AppIcon from "./AppIcon.vue";

defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  foot: { type: String, default: "" },
  icon: { type: String, default: "" },
  tone: { type: String, default: "" } // "", "good", "bad", "warn"
});
</script>

<template>
  <div class="card">
    <div class="card-head">
      <div class="card-label">{{ label }}</div>
      <span v-if="icon" class="card-icon"><AppIcon :name="icon" :size="16" /></span>
    </div>
    <div class="card-value" :class="{ 'kpi-good': tone === 'good', 'kpi-bad': tone === 'bad', 'kpi-warn': tone === 'warn' }">
      {{ value }}
    </div>
    <div v-if="foot" class="card-foot">{{ foot }}</div>
  </div>
</template>
