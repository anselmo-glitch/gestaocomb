import { ROLES } from "./constants.js";

const MATRIX = {
  [ROLES.ADMIN]: {
    canWrite: true,
    canManageUsers: true,
    canDelete: true,
    canExport: true,
    canImport: true,
    canViewPlanned: true,
    canManagePlanning: true,
    canRegisterOps: true,
    canManageActionPlans: true
  },
  [ROLES.GESTOR]: {
    canWrite: true,
    canManageUsers: false,
    canDelete: false,
    canExport: true,
    canImport: true,
    canViewPlanned: true,
    canManagePlanning: false,
    canRegisterOps: true,
    canManageActionPlans: true
  },
  [ROLES.OPERADOR]: {
    canWrite: true,
    canManageUsers: false,
    canDelete: false,
    canExport: true,
    canImport: false,
    // Operador lança abastecimentos e km, mas não vê nem altera valores previstos.
    canViewPlanned: false,
    canManagePlanning: false,
    canRegisterOps: true,
    canManageActionPlans: false
  },
  [ROLES.VISUALIZADOR]: {
    canWrite: false,
    canManageUsers: false,
    canDelete: false,
    canExport: true,
    canImport: false,
    canViewPlanned: true,
    canManagePlanning: false,
    canRegisterOps: false,
    canManageActionPlans: false
  }
};

export function permissionsFor(role) {
  return MATRIX[role] ?? MATRIX[ROLES.VISUALIZADOR];
}

export function can(role, action) {
  return Boolean(permissionsFor(role)[action]);
}
