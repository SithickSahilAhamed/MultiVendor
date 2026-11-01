/* AUTH-001 / RBAC-001 — Admin claim gate (mirrors vendor-store role check).
   Pure helpers so Node tests can assert without Firebase.
   Accepts legacy role=admin OR role=staff with at least one staffPerms entry. */

const AdminClaimGate = {
  REQUIRED_ROLE: 'admin',

  isAdmin(claims) {
    if (!claims) return false;
    if (claims.role === AdminClaimGate.REQUIRED_ROLE) return true;
    if (claims.role === 'staff') {
      const perms = String(claims.staffPerms || '').split(',').map(s => s.trim()).filter(Boolean);
      return perms.length > 0;
    }
    return false;
  },

  denyMessage: 'This account is not authorized for admin access.',

  /* After password success: require admin/staff claims or sign out + throw. */
  assertAdminClaims(claims) {
    if (!AdminClaimGate.isAdmin(claims)) {
      const err = new Error(AdminClaimGate.denyMessage);
      err.code = 'auth/insufficient-admin-claim';
      throw err;
    }
    return true;
  }
};

if (typeof window !== 'undefined') window.AdminClaimGate = AdminClaimGate;
if (typeof module !== 'undefined' && module.exports) module.exports = { AdminClaimGate };
