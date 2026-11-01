/* VEN-001 — vendor microsite branding (logo, banner, about/tagline) */

const VendorBranding = {
  async render() {
    const el = document.getElementById('vendor-page-content');
    el.innerHTML = `<div class="admin-page-header"><div><h1 class="admin-page-title">Storefront branding</h1><p class="admin-page-subtitle">Public #/vendor/:id page reflects these fields.</p></div></div>
      <div id="branding-form" style="max-width:560px"><p style="color:#6b7280">Loading…</p></div>`;
    try {
      const me = await VendorAPI.getMe();
      const form = document.getElementById('branding-form');
      form.innerHTML = `
        <label class="admin-label">Tagline</label>
        <input class="admin-input" id="brand-tagline" value="${VendorUtils.escapeHtml(me.tagline || '')}" />
        <label class="admin-label" style="margin-top:12px">About</label>
        <textarea class="admin-input" id="brand-about" rows="4">${VendorUtils.escapeHtml(me.description || me.about || '')}</textarea>
        <label class="admin-label" style="margin-top:12px">Logo URL</label>
        <input class="admin-input" id="brand-logo" value="${VendorUtils.escapeHtml(me.logo || '')}" />
        <label class="admin-label" style="margin-top:12px">Banner URL</label>
        <input class="admin-input" id="brand-banner" value="${VendorUtils.escapeHtml(me.banner || '')}" />
        <button class="admin-btn admin-btn-primary" style="margin-top:16px" onclick="VendorBranding.save()">Save branding</button>`;
      this._id = me.id || me.uid;
    } catch (e) {
      document.getElementById('branding-form').innerHTML = `<p style="color:#b91c1c">${VendorUtils.escapeHtml(e.message || e)}</p>`;
    }
  },

  async save() {
    const payload = {
      tagline: document.getElementById('brand-tagline').value,
      description: document.getElementById('brand-about').value,
      logo: document.getElementById('brand-logo').value,
      banner: document.getElementById('brand-banner').value
    };
    try {
      await VendorAPI.updateMe(payload);
      VendorToast.success('Branding updated');
    } catch (e) {
      VendorToast.error(e.message || String(e));
    }
  }
};
