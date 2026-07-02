export const APP_VERSION = "3.1.0";
export const STORAGE_KEY = "frota-ro-v2-state";

export const ROLES = {
  ADMIN: "admin",
  GESTOR: "gestor",
  OPERADOR: "operador",
  VISUALIZADOR: "visualizador"
};

export const ROLE_LABEL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.GESTOR]: "Gestor",
  [ROLES.OPERADOR]: "Operador",
  [ROLES.VISUALIZADOR]: "Visualizador"
};

// Navegação agrupada da sidebar. `id` é também o nome da rota.
export const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "gauge" },
      { id: "desvios", label: "Desvios e planos", icon: "alert" }
    ]
  },
  {
    label: "Operação",
    items: [
      { id: "compras", label: "Compras", icon: "cart" },
      { id: "estoque", label: "Estoque e tanques", icon: "tank" },
      { id: "abastecimentos", label: "Abastecimentos", icon: "fuel" },
      { id: "inventario", label: "Inventário e perdas", icon: "clipboard" },
      { id: "monthly", label: "Lançamento mensal", icon: "calendar" }
    ]
  },
  {
    label: "Gestão",
    items: [
      { id: "contracts", label: "Contratos", icon: "file" },
      { id: "vehicles", label: "Veículos", icon: "truck" },
      { id: "cadastros", label: "Cadastros básicos", icon: "folder" },
      { id: "reports", label: "Relatórios", icon: "chart" }
    ]
  },
  {
    label: "Sistema",
    items: [
      { id: "users", label: "Usuários", icon: "users" },
      { id: "rules", label: "Regras e backup", icon: "book" }
    ]
  }
];

export const TABS = NAV_GROUPS.flatMap((group) => group.items);

export const FUELING_SOURCE_LABEL = {
  manual: "Manual",
  fuelings: "Abastecimentos",
  branch_allocation: "Rateio filial",
  none: "Sem diesel"
};

export const ACTION_PLAN_STATUS = {
  ABERTO: "aberto",
  ANDAMENTO: "andamento",
  CONCLUIDO: "concluido"
};

export const ACTION_PLAN_STATUS_LABEL = {
  [ACTION_PLAN_STATUS.ABERTO]: "Aberto",
  [ACTION_PLAN_STATUS.ANDAMENTO]: "Em andamento",
  [ACTION_PLAN_STATUS.CONCLUIDO]: "Concluído"
};

// Limites padrão (parametrizáveis em state.deviationSettings).
export const DEFAULT_DEVIATION_SETTINGS = {
  greenMaxPct: 3,
  yellowMaxPct: 8,
  inventoryAlertPct: 2,
  capacityAlertPct: 95,
  consumptionAlertFactor: 1.3
};
