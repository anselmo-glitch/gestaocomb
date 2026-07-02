<script setup>
// Ícones vetoriais (traço 2px, estilo Lucide) — sem emojis, conforme design system.
const PATHS = {
  gauge: "M12 15l3.5-3.5M20.5 12A8.5 8.5 0 1 1 3.5 12a8.5 8.5 0 0 1 17 0Z",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  cart: "M2 3h2l2.5 12.5a1 1 0 0 0 1 .5h9.7a1 1 0 0 0 1-.8L20 8H5.1M9 20a1 1 0 1 0 0 .01M17 20a1 1 0 1 0 0 .01",
  tank: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm-1 9h16M8 4v3m8-3v3",
  fuel: "M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M4 21h10M3 21h12M14 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3M7 8h4",
  clipboard: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Zm7 1h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m1 8 2 2 4-4",
  calendar: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 5h18M8 3v4m8-4v4",
  file: "M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 0v6h6M9 13h6m-6 4h6",
  truck: "M1 4h13v12H1V4Zm13 4h4l4 4v4h-3M6 19a2 2 0 1 0 0-.01M18 19a2 2 0 1 0 0-.01",
  folder: "M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
  chart: "M3 3v18h18M8 17V9m5 8V5m5 12v-6",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m19 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  transfer: "M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4m4 4H4"
};

defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 18 }
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="PATHS[name] || PATHS.file" />
  </svg>
</template>
