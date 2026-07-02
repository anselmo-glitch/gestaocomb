<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { NAV_GROUPS, ROLE_LABEL, TABS } from "./core/constants.js";
import { useAppStore } from "./stores/appStore.js";
import AppIcon from "./components/AppIcon.vue";

const THEME_KEY = "frota-ro-theme";

const store = useAppStore();
const route = useRoute();

// Tema claro é o padrão da identidade visual; escuro fica disponível via toggle.
const theme = ref(localStorage.getItem(THEME_KEY) || "light");
document.documentElement.dataset.theme = theme.value;

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem(THEME_KEY, theme.value);
}

function routeGroupName(routeName) {
  return routeName === "contractDetail" ? "contracts" : routeName;
}

const activeGroupLabel = computed(
  () => NAV_GROUPS.find((group) => group.items.some((item) => item.id === routeGroupName(route.name)))?.label || "Frota RO"
);
const activeLabel = computed(() => {
  if (route.name === "contractDetail") return "Dashboard do contrato";
  return TABS.find((tab) => tab.id === route.name)?.label || "Frota RO";
});
const user = computed(() => store.currentUser);

function isActive(tabId) {
  if (tabId === "contracts") return route.name === "contracts" || route.name === "contractDetail";
  return route.name === tabId;
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-badge">RO</span>
        <div class="brand-text">
          <strong>Frota RO</strong>
          <span>Combustível, contratos e frota</span>
        </div>
      </div>
      <nav aria-label="Navegação principal">
        <div v-for="group in NAV_GROUPS" :key="group.label" class="nav-group">
          <div class="nav-group-label">{{ group.label }}</div>
          <router-link
            v-for="tab in group.items"
            :key="tab.id"
            :to="tab.id === 'dashboard' ? '/' : `/${tab.id}`"
            custom
            v-slot="{ navigate }"
          >
            <button class="nav-button" :class="{ active: isActive(tab.id) }" @click="navigate">
              <span class="nav-icon"><AppIcon :name="tab.icon" /></span>
              <span>{{ tab.label }}</span>
            </button>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-card">
        <strong>Estoque em tempo real:</strong><br />
        Estoque atual = entradas − saídas ± ajustes. Todo abastecimento gera saída automática do tanque.
      </div>

      <div class="sidebar-footer">
        <button
          class="btn ghost"
          :aria-label="theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
          @click="toggleTheme"
        >
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
          {{ theme === "dark" ? "Modo claro" : "Modo escuro" }}
        </button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <div>
          <p class="eyebrow">{{ activeGroupLabel }}</p>
          <h1>{{ activeLabel }}</h1>
          <p>Base corporativa única em modo local para validação. Para produção, usar Supabase com RLS.</p>
        </div>
        <div class="topbar-right">
          <div class="user-pill">
            <strong>{{ user?.name || "Usuário" }}</strong>
            <span>{{ ROLE_LABEL[user?.role] || user?.role }} · {{ user?.active ? "ativo" : "inativo" }}</span>
          </div>
        </div>
      </div>
      <router-view />
    </main>
  </div>
</template>
