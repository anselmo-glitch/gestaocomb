import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  { path: "/", name: "dashboard", component: () => import("../views/DashboardView.vue") },
  { path: "/desvios", name: "desvios", component: () => import("../views/DesviosView.vue") },
  { path: "/compras", name: "compras", component: () => import("../views/ComprasView.vue") },
  { path: "/estoque", name: "estoque", component: () => import("../views/EstoqueView.vue") },
  { path: "/abastecimentos", name: "abastecimentos", component: () => import("../views/AbastecimentosView.vue") },
  { path: "/inventario", name: "inventario", component: () => import("../views/InventarioView.vue") },
  { path: "/monthly", name: "monthly", component: () => import("../views/MonthlyView.vue") },
  { path: "/contracts", name: "contracts", component: () => import("../views/ContractsView.vue") },
  { path: "/contracts/:id", name: "contractDetail", component: () => import("../views/ContractDashboardView.vue"), props: true },
  { path: "/vehicles", name: "vehicles", component: () => import("../views/VehiclesView.vue") },
  { path: "/cadastros", name: "cadastros", component: () => import("../views/CadastrosView.vue") },
  { path: "/reports", name: "reports", component: () => import("../views/ReportsView.vue") },
  { path: "/users", name: "users", component: () => import("../views/UsersView.vue") },
  { path: "/rules", name: "rules", component: () => import("../views/RulesView.vue") },
  { path: "/:pathMatch(.*)*", redirect: "/" }
];

export const router = createRouter({
  // Hash history evita configurar rewrite de servidor ao hospedar como site estático.
  history: createWebHashHistory(),
  routes
});
