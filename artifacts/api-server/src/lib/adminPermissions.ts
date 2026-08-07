/**
 * Admin sub-role permissions.
 *
 * `users.role === "admin"` grants entry to the admin panel; `users.admin_role`
 * decides what that admin may actually do. Before this module existed the
 * sub-role was stored but never enforced, so a data_analyst had the same power
 * as a super_admin.
 *
 * Backwards compatibility: an admin with `admin_role = null` is treated as a
 * super_admin. Existing admin accounts predate this column, and silently
 * locking them out of their own platform would be worse than the status quo.
 * Assign explicit sub-roles to narrow access.
 */

export const ADMIN_ROLES = [
  "super_admin",
  "support_admin",
  "finance_admin",
  "data_analyst",
  "ad_manager",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Capabilities are coarse on purpose: one per meaningful area of damage.
 * Finer-grained permissions are easy to add later; wrong groupings are not.
 */
export const ADMIN_CAPABILITIES = [
  /** Read user records, listings, requests, disputes — no mutation. */
  "read",
  /** Ban/unban, unlock, moderate content, approve or reject listings. */
  "moderate",
  /** Payouts, escrow release, refunds, fee configuration, Stripe operations. */
  "finance",
  /** Blog posts, site settings, marketing surfaces. */
  "content",
  /** Assign admin sub-roles and other platform-wide configuration. */
  "manage_admins",
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<AdminRole, readonly AdminCapability[]> = {
  super_admin: ["read", "moderate", "finance", "content", "manage_admins"],
  support_admin: ["read", "moderate"],
  finance_admin: ["read", "finance"],
  data_analyst: ["read"],
  ad_manager: ["read", "content"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/**
 * Capabilities for an admin's sub-role.
 * A null/unrecognised sub-role resolves to full access — see the note above.
 */
export function capabilitiesFor(adminRole: string | null | undefined): readonly AdminCapability[] {
  if (!adminRole) return ROLE_CAPABILITIES.super_admin;
  return isAdminRole(adminRole) ? ROLE_CAPABILITIES[adminRole] : ROLE_CAPABILITIES.super_admin;
}

export function hasCapability(adminRole: string | null | undefined, cap: AdminCapability): boolean {
  return capabilitiesFor(adminRole).includes(cap);
}
