/* AUTH-001 — Admin claim gate (mirrors vendor-store role check).
   Pure helpers so Node tests can assert without Firebase. */

const AdminClaimGate = {
  REQUIRED_ROLE: 'admin',

  isAdmin(claims) {
    return !!claims && claims.role === AdminClaimGate.REQUIRED_ROLE;
  },

  denyMessage: 'This account is not authorized for admin access.',

  /* After password success: require role=admin or sign out + throw. */
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
