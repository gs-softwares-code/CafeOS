export const ROLES = [
  'platform_admin',
  'owner',
  'manager',
  'cashier',
  'kitchen',
  'inventory_manager',
  'accountant',
  'customer',
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'platform:manage',
  'pos:bill',
  'pos:refund',
  'pos:cash_drawer',
  'kds:read',
  'kds:update',
  'menu:read',
  'menu:write',
  'inventory:read',
  'inventory:write',
  'purchase:read',
  'purchase:write',
  'purchase:receive',
  'accounting:read',
  'accounting:write',
  'accounting:close_day',
  'employees:read',
  'employees:write',
  'crm:read',
  'crm:write',
  'tables:write',
  'analytics:read',
  'audit:read',
  'settings:write',
  'backups:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  platform_admin: PERMISSIONS,
  owner: PERMISSIONS.filter((p) => p !== 'platform:manage'),
  manager: [
    'pos:bill',
    'pos:refund',
    'pos:cash_drawer',
    'kds:read',
    'kds:update',
    'menu:read',
    'menu:write',
    'inventory:read',
    'inventory:write',
    'purchase:read',
    'purchase:write',
    'purchase:receive',
    'accounting:read',
    'accounting:write',
    'accounting:close_day',
    'employees:read',
    'crm:read',
    'crm:write',
    'tables:write',
    'analytics:read',
    'audit:read',
  ],
  cashier: [
    'pos:bill',
    'pos:cash_drawer',
    'kds:read',
    'menu:read',
    'crm:read',
    'crm:write',
  ],
  kitchen: ['kds:read', 'kds:update', 'menu:read', 'inventory:read'],
  inventory_manager: [
    'menu:read',
    'inventory:read',
    'inventory:write',
    'purchase:read',
    'purchase:write',
    'purchase:receive',
  ],
  accountant: [
    'accounting:read',
    'accounting:write',
    'accounting:close_day',
    'purchase:read',
    'analytics:read',
    'audit:read',
  ],
  customer: ['menu:read'],
};

/**
 * Checks whether a given role grants the requested permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}
