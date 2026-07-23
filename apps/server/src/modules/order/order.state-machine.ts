import { ForbiddenException } from '@nestjs/common';

export type OrderStatus = string;

interface TransitionRule {
  from: OrderStatus | OrderStatus[];
  to: OrderStatus;
  allowedRoles: string[];
  preConditions: string[];
}

const TRANSITIONS: TransitionRule[] = [
  { from: 'draft',              to: 'pending_approval',    allowedRoles: ['store_admin'],     preConditions: ['hasItems'] },
  { from: 'pending_approval',   to: 'approved',            allowedRoles: ['super_admin'],     preConditions: [] },
  { from: 'pending_approval',   to: 'rejected',            allowedRoles: ['super_admin'],     preConditions: [] },
  { from: 'pending_approval',   to: 'cancelled',           allowedRoles: ['store_admin','super_admin'], preConditions: [] },
  { from: 'approved',           to: 'cancelled',           allowedRoles: ['store_admin','super_admin'], preConditions: ['notInProduction'] },
  { from: 'approved',           to: 'pending_production',  allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'approved',           to: 'in_production',       allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'pending_production', to: 'in_production',       allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'in_production',      to: 'produced',            allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'partially_produced', to: 'produced',            allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'in_production',      to: 'partially_produced',  allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'produced',           to: 'partially_shipped',   allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'produced',           to: 'shipped',             allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'partially_shipped',  to: 'shipped',             allowedRoles: ['ck_admin'],        preConditions: [] },
  { from: 'shipped',            to: 'received',            allowedRoles: ['store_admin'],     preConditions: [] },
  {
    from: ['draft','pending_approval','approved','pending_production','in_production','partially_produced','produced','partially_shipped','shipped'],
    to: 'cancelled', allowedRoles: ['store_admin','super_admin'], preConditions: [],
  },
];

const TERMINAL = new Set(['rejected', 'received', 'cancelled']);

export function canTransition(from: OrderStatus, to: OrderStatus, role: string): boolean {
  const rule = TRANSITIONS.find(r => {
    const fromMatch = Array.isArray(r.from) ? r.from.includes(from) : r.from === from;
    return fromMatch && r.to === to;
  });
  if (!rule) throw new ForbiddenException(`Invalid transition: ${from} → ${to}`);
  if (!rule.allowedRoles.includes(role))
    throw new ForbiddenException(`Role "${role}" not allowed for: ${from} → ${to}`);
  return true;
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL.has(status);
}
