/* RBAC-001 — client nav gating mirrors server StaffRbac permissions.
   Legacy role=admin receives all permissions. Staff use staffPerms CSV claim. */

const AdminRbac = {
  ALL: ['catalog', 'finance', 'support', 'shipping', 'cms', 'staff'],

  parse(role, staffPermsCsv) {
    if (role === 'admin') return new Set(this.ALL);
    const set = new Set();
    String(staffPermsCsv || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      .forEach(p => { if (this.ALL.includes(p)) set.add(p); });
    return set;
  },

  canAccessRoute(perms, routeKey) {
    if (!perms || perms.size === 0) return false;
    switch (routeKey) {
      case 'dashboard': return true;
      case 'vendors':
      case 'products': return perms.has('catalog');
      case 'commissions':
      case 'withdrawals':
      case 'reports': return perms.has('finance');
      case 'orders':
      case 'customers':
      case 'returns': return perms.has('support');
      case 'shipping': return perms.has('shipping');
      case 'cms': return perms.has('cms');
      case 'settings': return perms.has('staff') || perms.has('finance');
      default: return true;
    }
  },

  filterSidebar(sidebar, perms) {
    return sidebar.map(item => {
      if (item.submenu) {
        const submenu = item.submenu.filter(sub => this.canAccessRoute(perms, sub.id));
        if (!submenu.length && !this.canAccessRoute(perms, item.id)) return null;
        return { ...item, submenu };
      }
      return this.canAccessRoute(perms, item.id) ? item : null;
    }).filter(Boolean);
  }
};
