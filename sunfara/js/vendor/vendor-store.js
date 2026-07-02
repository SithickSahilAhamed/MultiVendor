/* Vendor Portal Auth State — Firebase is the source of truth, not localStorage */

const VendorStore = {
  user: null,     // { uid, name, email }
  profile: null,  // vendor Firestore doc (status, commission, etc.)
  isLoggedIn: false,

  async login(email, password) {
    const cred = await window.FirebaseAuth.signInWithEmailAndPassword(window.firebase.auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult();
    if (tokenResult.claims.role !== 'vendor' && tokenResult.claims.role !== 'admin') {
      await window.FirebaseAuth.signOut(window.firebase.auth);
      throw new Error('This account is not registered as a vendor.');
    }
    this.user = { uid: cred.user.uid, name: cred.user.displayName || email.split('@')[0], email: cred.user.email };
    this.isLoggedIn = true;
    await this.loadProfile();
    return true;
  },

  async loadProfile() {
    try { this.profile = await VendorAPI.getMe(); } catch (e) { this.profile = null; }
  },

  logout() {
    window.FirebaseAuth.signOut(window.firebase.auth).catch(() => {});
    this.user = null; this.profile = null; this.isLoggedIn = false;
    window.location.hash = '#/vendor/login';
  },

  /* Resolves once Firebase has restored (or confirmed absence of) a session,
     so the router never flashes the wrong page before auth state is known. */
  init(onReady) {
    window.FirebaseAuth.onAuthStateChanged(window.firebase.auth, async (fbUser) => {
      if (fbUser) {
        const tokenResult = await fbUser.getIdTokenResult();
        if (tokenResult.claims.role === 'vendor' || tokenResult.claims.role === 'admin') {
          this.user = { uid: fbUser.uid, name: fbUser.displayName || fbUser.email.split('@')[0], email: fbUser.email };
          this.isLoggedIn = true;
          await this.loadProfile();
        } else {
          this.user = null; this.profile = null; this.isLoggedIn = false;
        }
      } else {
        this.user = null; this.profile = null; this.isLoggedIn = false;
      }
      onReady();
    });
  }
};
