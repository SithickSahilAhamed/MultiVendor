/* ================================================
   search.js — Live Search Dropdown
   Listens on the navbar search input, shows results
   ================================================ */
const Search = {
  init() {
    const input = document.getElementById('navbar-search-input');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    // Position dropdown inside search wrapper
    const wrapper = input.closest('.navbar-search');
    if (wrapper) wrapper.appendChild(dropdown);

    const doSearch = debounce((q) => {
      if (q.length < 2) { dropdown.classList.remove('visible'); dropdown.innerHTML = ''; return; }
      const results = Data.search(q).slice(0, 6);
      if (!results.length) {
        dropdown.innerHTML = `<div class="search-no-results">No results for "<strong>${q}</strong>"</div>`;
      } else {
        dropdown.innerHTML = results.map((p, idx) => `
          <div class="search-result-item" data-id="${p.id}" tabindex="0" data-index="${idx}">
            <img class="search-result-thumb" src="${p.image}" alt="${p.name}" onerror="this.style.background='#6a9e78';this.src=''">
            <div class="search-result-info">
              <div class="search-result-name">${p.name}</div>
              <div class="search-result-meta">${p.brand} · ${p.category.replace(/-/g,' ')}</div>
            </div>
            <div class="search-result-price">${formatPrice(p.price)}</div>
          </div>`).join('');

        // Click a result → navigate
        dropdown.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            window.location.hash = '#/product/' + item.dataset.id;
            dropdown.classList.remove('visible');
            input.value = '';
          });
        });
      }
      dropdown.classList.add('visible');
      this.setupKeyNav(input, dropdown);
    }, 300);

    input.addEventListener('input', (e) => doSearch(e.target.value.trim()));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = input.value.trim(); if (q) { window.location.hash = '#/search?q=' + encodeURIComponent(q); dropdown.classList.remove('visible'); input.value = ''; } } });

    // Close on outside click
    document.addEventListener('click', (e) => { if (!wrapper || !wrapper.contains(e.target)) dropdown.classList.remove('visible'); });
  },

  setupKeyNav(input, dropdown) {
    const items = dropdown.querySelectorAll('.search-result-item');
    let focused = -1;
    input.addEventListener('keydown', (e) => {
      if (!dropdown.classList.contains('visible')) return;
      if (e.key === 'ArrowDown') { focused = Math.min(focused + 1, items.length - 1); items[focused]?.focus(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { focused = Math.max(focused - 1, -1); if (focused === -1) input.focus(); else items[focused]?.focus(); e.preventDefault(); }
      else if (e.key === 'Escape') { dropdown.classList.remove('visible'); input.blur(); }
    });
  }
};
