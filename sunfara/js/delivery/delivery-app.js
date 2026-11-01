/* WEB-003 delivery partner portal — uses Firebase Auth + /api/delivery */

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

const cfg = window.SUNFARA_FIREBASE_CONFIG || {
  apiKey: 'AIzaSyBN-0IvpsqfHULbddiauMFz9Dh3iL5aXw0',
  authDomain: 'sunfara-500b0.firebaseapp.com',
  projectId: 'sunfara-500b0',
  storageBucket: 'sunfara-500b0.firebasestorage.app',
  messagingSenderId: '678617069984',
  appId: '1:678617069984:web:c807a635452f3d1f6c4cc5'
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
const auth = getAuth(app);
const apiBase = window.SUNFARA_API_BASE;
const content = document.getElementById('delivery-content');
const loginBtn = document.getElementById('delivery-login-btn');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, opts = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const res = await fetch(`${apiBase}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

async function renderAssignments() {
  content.innerHTML = '<p>Loading assignments…</p>';
  try {
    const rows = await api('/delivery/assignments');
    if (!rows.length) {
      content.innerHTML = '<p class="delivery-hint">No assignments yet. Ask ops to set <code>deliveryPartnerId</code> on packed vendor orders, or claim from ops tools.</p>';
      return;
    }
    content.innerHTML = rows.map(o => `
      <article class="delivery-card">
        <strong>${escapeHtml(o.orderNumber || o.id)}</strong>
        <div>Status: ${escapeHtml(o.status)} · ${escapeHtml(o.vendorName || '')}</div>
        <div class="delivery-actions">
          ${o.status === 'shipped' ? `<button class="admin-btn admin-btn-sm admin-btn-primary" data-deliver="${escapeHtml(o.id)}">Mark delivered</button>` : ''}
        </div>
      </article>`).join('');
    content.querySelectorAll('[data-deliver]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/delivery/assignments/${btn.getAttribute('data-deliver')}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'delivered' })
          });
          await renderAssignments();
        } catch (e) {
          alert(e.message || String(e));
        }
      });
    });
  } catch (e) {
    content.innerHTML = `<p style="color:#b91c1c">${escapeHtml(e.message || e)}</p>`;
  }
}

loginBtn.addEventListener('click', async () => {
  if (auth.currentUser) {
    await signOut(auth);
    return;
  }
  const email = prompt('Delivery partner email');
  const password = prompt('Password');
  if (!email || !password) return;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message || String(e));
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginBtn.textContent = 'Sign in';
    content.innerHTML = '<p class="delivery-hint">Sign in with a Firebase user that has custom claim <code>role=delivery</code>.</p>';
    return;
  }
  const token = await user.getIdTokenResult();
  if (token.claims.role !== 'delivery' && token.claims.role !== 'admin') {
    content.innerHTML = '<p style="color:#b91c1c">Signed in, but missing delivery/admin claim.</p>';
    loginBtn.textContent = 'Sign out';
    return;
  }
  loginBtn.textContent = 'Sign out';
  await renderAssignments();
});
