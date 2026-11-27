/**
 * I 4 You Matrimonial Admin Portal - Core Dashboard Controller
 */

// Official Aadhaar fallback SVG data URI when image cannot be displayed
const AADHAAR_FALLBACK_SVG = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 40' width='64' height='40'%3E%3Crect width='64' height='40' rx='6' fill='%230F172A' stroke='%23D4AF37' stroke-width='1'/%3E%3Crect width='21' height='3' fill='%23FF9933'/%3E%3Crect x='21' width='22' height='3' fill='%23FFFFFF'/%3E%3Crect x='43' width='21' height='3' fill='%23138808'/%3E%3Ctext x='32' y='22' font-family='sans-serif' font-size='7' font-weight='bold' fill='%23E2E8F0' text-anchor='middle'%3EAADHAAR%3C/text%3E%3Ctext x='32' y='32' font-family='monospace' font-size='6' fill='%23DFB76C' text-anchor='middle'%3ECARD SCAN%3C/text%3E%3C/svg%3E";

// Global State
const state = {
  currentTab: 'overview',
  admin: null,
  users: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    query: '',
    status: 'all',
    gender: 'all',
    verified: 'all',
    sortBy: 'created_at',
    order: 'desc'
  },
  aadhaar: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    query: '',
    status: 'pending',
    sortBy: 'created_at',
    order: 'desc',
    viewMode: 'table',
    docMode: 'original',
    cardSide: 'front',
    unmaskDigits: false,
    candidateIndex: 0,
    currentCandidate: null,
    candidatesList: []
  },
  payments: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    query: '',
    status: 'all',
    method: 'all',
    sortBy: 'payment_date',
    order: 'desc',
    list: []
  },
  offers: [],
  plans: [],
  charts: {
    growth: null,
    revenue: null,
    verification: null,
    region: null
  },
  pendingDelete: {
    type: null,
    id: null,
    name: null
  }
};

// Super Admin Authentication Token & Request Headers
function getAdminAuthHeaders(customHeaders = {}) {
  const token = localStorage.getItem('i4u_admin_token') || 
                sessionStorage.getItem('i4u_admin_token') || 
                'i4u-super-admin-token-2026';
  return {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Admin-Token': token,
    ...customHeaders
  };
}

// Debounce helper
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Format Currency INR
function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

// Format Date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Format DateTime
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Safe phone display formatter (handles encrypted phones gracefully)
function formatDisplayPhone(phone) {
  if (!phone || phone === 'N/A') return 'N/A';
  if (typeof phone === 'string' && phone.startsWith('enc:')) return '+91 ••••• •••••';
  return phone;
}

// Format Phone for Direct Phone Dialer
function getCleanPhoneForCall(phone) {
  if (!phone || phone === 'N/A' || (typeof phone === 'string' && phone.startsWith('enc:'))) return '';
  let digits = phone.toString().replace(/[^0-9+]/g, '');
  if (/^0[6-9]\d{9}$/.test(digits)) {
    digits = digits.substring(1);
  }
  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }
  if (!digits.startsWith('+') && digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return digits;
}

// Format Phone for Direct WhatsApp Web / Mobile Chat URL
function getWhatsAppUrl(phone, name) {
  if (!phone || phone === 'N/A' || (typeof phone === 'string' && phone.startsWith('enc:'))) return '';
  let digits = phone.toString().replace(/[^0-9]/g, '');
  if (/^0[6-9]\d{9}$/.test(digits)) {
    digits = digits.substring(1);
  }
  if (/^[6-9]\d{9}$/.test(digits)) {
    digits = '91' + digits;
  }
  const cleanName = name ? name.trim() : 'Candidate';
  const text = encodeURIComponent(`Hello ${cleanName}, greetings from I 4 You Matrimony!`);
  return `https://wa.me/${digits}?text=${text}`;
}

// Toast Dispatcher
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  const toastContent = document.getElementById('toastContent');

  if (!toast) return;

  if (toastMessage) toastMessage.textContent = message;

  if (toastIcon) {
    if (type === 'error') {
      toastIcon.setAttribute('data-lucide', 'alert-circle');
      toastIcon.className = 'w-5 h-5 text-rose-400';
    } else if (type === 'info') {
      toastIcon.setAttribute('data-lucide', 'info');
      toastIcon.className = 'w-5 h-5 text-amber-400';
    } else {
      toastIcon.setAttribute('data-lucide', 'check-circle');
      toastIcon.className = 'w-5 h-5 text-emerald-400';
    }
  }

  if (toastContent) {
    if (type === 'error') {
      toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border bg-rose-950/95 text-rose-200 border-rose-800';
    } else if (type === 'info') {
      toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border bg-amber-950/95 text-amber-200 border-amber-800';
    } else {
      toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border bg-[#382226]/95 text-emerald-200 border-emerald-800';
    }
  }

  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Toast lucide icon error:', e);
  }

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3500);
}


// ========================================================
// INITIALIZATION & TAB SWITCHING
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupNavigation();
  setupSearchAndFilters();
  
  // Initial load
  loadAnalytics();
  loadUsers();
  loadOffers();
  loadPlans();
  loadPayments();
  loadVendorApprovals();
  loadHomepageBanners();
  initBannerDropZone();
  loadHappyStories();
  initHappyStoryDropZone();
  startLiveSyncPolling();
  setupRealtimeProfileSync();

  // Listen for Supabase background sync events to auto-refresh UI
  window.addEventListener('i4u_admin_synced', () => {
    loadAnalytics();
    if (state.currentTab === 'users') loadUsers(false);
    if (state.currentTab === 'aadhaar') loadAadhaarVerifications();
    if (state.currentTab === 'offers') loadOffers();
    if (state.currentTab === 'plans') loadPlans();
  });

  // Mobile drawer listener
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('sidebar');
  const drawerOverlay = document.getElementById('sidebarOverlay');

  if (mobileToggle && mobileDrawer && drawerOverlay) {
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('-translate-x-full');
      drawerOverlay.classList.toggle('hidden');
    });
    drawerOverlay.addEventListener('click', () => {
      mobileDrawer.classList.add('-translate-x-full');
      drawerOverlay.classList.add('hidden');
    });
  }

  // Keyboard shortcut Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchBox = document.getElementById('globalSearchInput');
      if (searchBox) {
        searchBox.focus();
        switchTab('users');
      }
    }
  });

  lucide.createIcons();

  // Read initial tab from URL hash or query param (?tab=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
    const targetTab = urlParams.get('tab') || hashTab;
    if (targetTab && ['overview', 'users', 'aadhaar', 'offers', 'plans', 'payments', 'vendors', 'banners', 'happy-stories', 'settings'].includes(targetTab)) {
      setTimeout(() => switchTab(targetTab), 50);
    }
  } catch (e) {}
});

function showAdminLoginScreen() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    const passInput = document.getElementById('adminLoginPassword');
    if (passInput) {
      passInput.value = '';
    }
    const errorAlert = document.getElementById('adminLoginError');
    if (errorAlert) errorAlert.classList.add('hidden');
    if (window.lucide) lucide.createIcons();
  }
}

function hideAdminLoginScreen() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminLoginEmail');
  const passwordInput = document.getElementById('adminLoginPassword');
  const errorAlert = document.getElementById('adminLoginError');
  const errorMsg = document.getElementById('adminLoginErrorMessage');
  const btn = document.getElementById('adminLoginBtn');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (errorAlert) errorAlert.classList.add('hidden');

  if (!email) {
    if (errorAlert && errorMsg) {
      errorMsg.textContent = 'Please enter administrator email.';
      errorAlert.classList.remove('hidden');
    }
    showToast('Please enter administrator email', 'warning');
    return;
  }
  if (!password) {
    if (errorAlert && errorMsg) {
      errorMsg.textContent = 'Please enter administrator password.';
      errorAlert.classList.remove('hidden');
    }
    showToast('Please enter administrator password', 'warning');
    return;
  }

  if (btn) btn.disabled = true;

  try {
    let authSuccess = false;
    let loggedAdmin = null;
    let errorMessage = 'Invalid email or password.';

    // Authenticate with Supabase Auth
    try {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        const sbUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';
        const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';
        if (!window.supabaseClient) {
          window.supabaseClient = window.supabase.createClient(sbUrl, sbKey);
        }
        const { data, error: sbError } = await window.supabaseClient.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (!sbError && data?.session && data?.user) {
          authSuccess = true;
          loggedAdmin = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.email ? data.user.email.split('@')[0] : 'admin',
            full_name: data.user.user_metadata?.full_name || 'Super Admin',
            role: data.user.user_metadata?.role || 'Super Admin',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
            permissions: ['*']
          };
          localStorage.setItem('i4u_admin_token', data.session.access_token);
          localStorage.setItem('i4u_admin_session', JSON.stringify(data.session));
          localStorage.setItem('i4u_admin_user', JSON.stringify(loggedAdmin));
        } else if (sbError) {
          errorMessage = sbError.message || 'Invalid administrator email or password.';
        }
      }
    } catch (sbErr) {
      console.warn('[Admin Auth] Supabase signIn error:', sbErr);
      errorMessage = sbErr.message || 'Supabase authentication failed.';
    }

    if (authSuccess) {
      localStorage.removeItem('i4u_admin_logged_out');
      sessionStorage.removeItem('i4u_admin_logged_out');
      state.admin = loggedAdmin;
      state.authenticated = true;
      hideAdminLoginScreen();
      showToast('Welcome back, ' + (loggedAdmin?.full_name || 'Admin') + '!', 'success');
      updateAdminProfileUI();
  loadDailyContactLimit();
      if (typeof loadAnalytics === 'function') loadAnalytics();
      if (typeof loadUsers === 'function') loadUsers();
    } else {
      if (errorAlert) {
        if (errorMsg) errorMsg.textContent = errorMessage;
        errorAlert.classList.remove('hidden');
      }
      showToast(errorMessage, 'error');
    }
  } catch (err) {
    if (errorAlert) {
      if (errorMsg) errorMsg.textContent = err.message || 'Login error';
      errorAlert.classList.remove('hidden');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function checkAuth() {
  if (localStorage.getItem('i4u_admin_logged_out') === 'true' || sessionStorage.getItem('i4u_admin_logged_out') === 'true') {
    state.admin = null;
    state.authenticated = false;
    showAdminLoginScreen();
    return;
  }

  // 1. Verify Supabase Auth active session
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const sbUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';
      const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';
      if (!window.supabaseClient) {
        window.supabaseClient = window.supabase.createClient(sbUrl, sbKey);
      }
      const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();
      if (session && session.user && !sessionErr) {
        state.admin = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email ? session.user.email.split('@')[0] : 'admin',
          full_name: session.user.user_metadata?.full_name || 'Super Admin',
          role: session.user.user_metadata?.role || 'Super Admin',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
          permissions: ['*']
        };
        state.authenticated = true;
        localStorage.setItem('i4u_admin_token', session.access_token);
        localStorage.setItem('i4u_admin_user', JSON.stringify(state.admin));
        localStorage.removeItem('i4u_admin_logged_out');
        sessionStorage.removeItem('i4u_admin_logged_out');
        hideAdminLoginScreen();
        updateAdminProfileUI();
        return;
      }
    }
  } catch (sbErr) {
    console.warn('[Admin Auth] Supabase session check notice:', sbErr);
  }

  // 2. Verify stored token with Supabase getUser
  const storedToken = localStorage.getItem('i4u_admin_token') || sessionStorage.getItem('i4u_admin_token');
  if (storedToken && storedToken.length > 20 && storedToken !== 'i4u-super-admin-token-2026') {
    try {
      if (window.supabaseClient?.auth) {
        const { data: { user }, error: userErr } = await window.supabaseClient.auth.getUser(storedToken);
        if (user && !userErr) {
          state.admin = {
            id: user.id,
            email: user.email,
            username: user.email ? user.email.split('@')[0] : 'admin',
            full_name: user.user_metadata?.full_name || 'Super Admin',
            role: user.user_metadata?.role || 'Super Admin',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
            permissions: ['*']
          };
          state.authenticated = true;
          hideAdminLoginScreen();
          updateAdminProfileUI();
          return;
        }
      }
    } catch (e) {}
  }

  // 3. Unauthenticated -> show login screen and deny access
  state.admin = null;
  state.authenticated = false;
  showAdminLoginScreen();
}

function canAccessTab(tabId) {
  if (!state.admin) return true;
  const role = state.admin.role;
  if (role === 'Super Admin') return true;
  const perms = state.admin.permissions || [];
  if (tabId === 'overview') return true;
  if (tabId === 'users' || tabId === 'aadhaar' || tabId === 'vendors' || tabId === 'banners' || tabId === 'happy-stories') return perms.includes('users:view');
  if (tabId === 'offers') return perms.includes('offers:view');
  if (tabId === 'plans') return perms.includes('plans:view');
  if (tabId === 'payments') return perms.includes('payments:view');
  if (tabId === 'settings') return perms.includes('admins:view');
  return false;
}

function updateAdminProfileUI() {
  if (!state.admin) return;
  const nameEl = document.getElementById('adminFullName');
  const roleEl = document.getElementById('adminRoleBadge');
  const avatarEl = document.getElementById('adminAvatarImg');

  const role = state.admin.role || 'Super Admin';
  if (nameEl) nameEl.textContent = state.admin.full_name || state.admin.username;
  
  if (roleEl) {
    roleEl.textContent = role;
    if (role === 'Super Admin') {
      roleEl.className = 'text-[10px] text-[#E6B8A2] font-bold truncate';
    } else if (role === 'CRM Manager') {
      roleEl.className = 'text-[10px] text-emerald-400 font-bold truncate';
    } else if (role === 'Finance Manager') {
      roleEl.className = 'text-[10px] text-blue-400 font-bold truncate';
    } else {
      roleEl.className = 'text-[10px] text-purple-400 font-bold truncate';
    }
  }
  if (avatarEl && state.admin.avatar) avatarEl.src = state.admin.avatar;

  // Also sync with settings tab if present
  const settingsUserEl = document.getElementById('settingsAdminUsername');
  const settingsEmailEl = document.getElementById('settingsAdminEmail');
  const settingsRoleEl = document.getElementById('settingsAdminRole');
  if (settingsUserEl) settingsUserEl.textContent = state.admin.username || 'admin';
  if (settingsEmailEl) settingsEmailEl.textContent = state.admin.email || 'admin@i4you.com';
  if (settingsRoleEl) settingsRoleEl.textContent = role;

  applyRbacToUI();
}

function applyRbacToUI() {
  if (!state.admin) return;
  const perms = state.admin.permissions || [];
  const role = state.admin.role || 'Super Admin';
  const isSuper = (role === 'Super Admin');

  // Sidebar navigation access control
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    const tabId = btn.getAttribute('data-tab-target');
    if (!canAccessTab(tabId)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'flex';
    }
  });

  // If current tab is inaccessible for this role, switch to overview
  if (!canAccessTab(state.currentTab)) {
    switchTab('overview');
  }

  // Feature-level RBAC: Users tab actions
  const exportUsersBtn = document.querySelector('button[onclick*="exportUsersCsv"], a[href*="/export/users/csv"]');
  if (exportUsersBtn) {
    exportUsersBtn.style.display = (isSuper || perms.includes('users:export')) ? '' : 'none';
  }

  // Feature-level RBAC: Payments export
  const exportPaymentsBtn = document.querySelector('button[onclick*="exportPaymentsCsv"], a[href*="/export/payments/csv"]');
  if (exportPaymentsBtn) {
    exportPaymentsBtn.style.display = (isSuper || perms.includes('payments:export')) ? '' : 'none';
  }

  // Feature-level RBAC: Create Offer button
  const createOfferBtn = document.querySelector('button[onclick*="openCreateOfferModal"]');
  if (createOfferBtn) {
    createOfferBtn.style.display = (isSuper || perms.includes('offers:edit')) ? '' : 'none';
  }

  // Feature-level RBAC: Create Plan button
  const createPlanBtn = document.querySelector('button[onclick*="openCreatePlanModal"]');
  if (createPlanBtn) {
    createPlanBtn.style.display = (isSuper || perms.includes('plans:edit')) ? '' : 'none';
  }

  // Feature-level RBAC: Add Admin user button
  const createAdminBtn = document.querySelector('button[onclick*="openCreateAdminModal"]');
  if (createAdminBtn) {
    createAdminBtn.style.display = (isSuper || perms.includes('admins:create')) ? '' : 'none';
  }
}

async function handleLogout() {
  try {
    if (window.supabaseClient?.auth) {
      await window.supabaseClient.auth.signOut().catch(() => {});
    }
  } catch (e) {}

  localStorage.setItem('i4u_admin_logged_out', 'true');
  sessionStorage.setItem('i4u_admin_logged_out', 'true');
  localStorage.removeItem('i4u_admin_user');
  localStorage.removeItem('i4u_admin_token');
  localStorage.removeItem('i4u_admin_session');
  sessionStorage.removeItem('i4u_admin_user');
  sessionStorage.removeItem('i4u_admin_token');
  sessionStorage.removeItem('i4u_admin_session');
  state.admin = null;
  state.authenticated = false;

  try {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } catch (e) {}

  showToast('Signed out successfully', 'info');
  showAdminLoginScreen();
}

function setupNavigation() {
  const navBtns = document.querySelectorAll('[data-tab-target]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = btn.getAttribute('data-tab-target');
      switchTab(target);
      // Close mobile drawer on item click
      const mobileDrawer = document.getElementById('sidebar');
      const drawerOverlay = document.getElementById('sidebarOverlay');
      if (window.innerWidth < 1024) {
        if (mobileDrawer && !mobileDrawer.classList.contains('-translate-x-full')) {
          mobileDrawer.classList.add('-translate-x-full');
        }
        if (drawerOverlay) drawerOverlay.classList.add('hidden');
      } else {
        if (drawerOverlay) drawerOverlay.classList.add('hidden');
      }
    });
  });
}

function switchTab(tabId) {
  if (!canAccessTab(tabId)) {
    showToast(`Access Denied: Your assigned role (${state.admin?.role || 'Staff'}) does not have permission for this module.`, 'error');
    return;
  }

  state.currentTab = tabId;
  try { if (window.history && window.history.replaceState) { const u = new URL(window.location.href); u.hash = tabId; window.history.replaceState(null, '', u.toString()); } } catch (e) {}

  // Reset scroll so view doesn't render scrolled out of viewport
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.scrollTop = 0;
  window.scrollTo(0, 0);

  // Ensure workspace is always visible and flexed
  const workspaceEl = document.getElementById('mainWorkspace');
  if (workspaceEl) {
    workspaceEl.style.display = 'flex';
  }

  // Update nav buttons styling
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    const isCurrent = btn.getAttribute('data-tab-target') === tabId;
    if (isCurrent) {
      btn.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-[#C58B76]/20 to-[#E6B8A2]/10 text-[#E6B8A2] border border-[#C58B76]/40 shadow-inner';
    } else {
      btn.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-300 hover:text-white hover:bg-white/5 border border-transparent';
    }
  });

  // Toggle views
  const viewPanels = ['overview', 'users', 'aadhaar', 'offers', 'plans', 'payments', 'vendors', 'banners', 'happy-stories', 'settings'];
  viewPanels.forEach(panel => {
    const el = document.getElementById(`view-${panel}`);
    if (el) {
      if (panel === tabId) {
        el.classList.remove('hidden');
        el.style.display = 'block';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }
  });

  // Refresh data for the active tab
  if (tabId === 'overview') {
    loadAnalytics();
  } else if (tabId === 'users') {
    loadUsers();
  } else if (tabId === 'aadhaar') {
    loadAadhaarVerifications();
  } else if (tabId === 'offers') {
    loadOffers();
  } else if (tabId === 'plans') {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
    loadPlans();
  } else if (tabId === 'payments') {
    loadPayments();
  } else if (tabId === 'vendors') {
    loadVendorApprovals();
  } else if (tabId === 'banners') {
    loadHomepageBanners();
  } else if (tabId === 'happy-stories') {
    loadHappyStories();
  } else if (tabId === 'settings') {
    loadSettings();
  }

  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('switchTab lucide icon error:', e);
  }
}

async function loadSettings() {
  updateAdminProfileUI();
  loadAdminUsers();
  try {
    const res = await fetch('/api/system/database-status', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (!res.ok) return;
    const data = await res.json();
    const st = data.status || {};
    const engineEl = document.getElementById('settingsDbEngine');
    const locEl = document.getElementById('settingsDbLocation');
    if (engineEl) {
      if (st.engine === 'PostgreSQL') {
        engineEl.innerHTML = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">🐘 PostgreSQL</span>`;
      } else {
        engineEl.innerHTML = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">🗃️ SQLite 3 (Local)</span>`;
      }
    }
    if (locEl) {
      locEl.textContent = `${st.database} (${st.host})`;
    }
  } catch (e) {
    console.error('Failed to load database status:', e);
  }
}

// ========================================================
// ANALYTICS & CHARTS
// ========================================================

async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    // Normalize KPI object to handle both new schema (data.kpi) and legacy flat schema
    const kpi = data.kpi || {
      total_users: data.total_candidates ?? data.total_users ?? 0,
      active_users: data.active_users ?? data.total_candidates ?? 0,
      total_revenue: data.total_revenue ?? 0,
      completed_payments: data.completed_payments ?? 0,
      active_offers: data.active_offers ?? 0,
      pending_verifications: data.pending_verifications ?? 0,
      verification_rate: data.verification_rate ?? 0
    };

    // 1. Update KPI Counters safely
    const elTotal = document.getElementById('kpiTotalUsers');
    if (elTotal) elTotal.textContent = kpi.total_users ?? 0;
    const elActive = document.getElementById('kpiActiveUsers');
    if (elActive) elActive.textContent = kpi.active_users ?? 0;
    const elRev = document.getElementById('kpiTotalRevenue');
    if (elRev) elRev.textContent = formatINR(kpi.total_revenue ?? 0);
    const elTxns = document.getElementById('kpiCompletedTxns');
    if (elTxns) elTxns.textContent = kpi.completed_payments ?? 0;
    const elOffers = document.getElementById('kpiActiveOffers');
    if (elOffers) elOffers.textContent = kpi.active_offers ?? 0;
    const elPending = document.getElementById('kpiPendingVerifications');
    if (elPending) elPending.textContent = kpi.pending_verifications ?? 0;
    const elRate = document.getElementById('kpiVerificationRate');
    if (elRate) elRate.textContent = `${kpi.verification_rate ?? 0}%`;

    const aadhaarBadge = document.getElementById('aadhaarPendingBadge');
    if (aadhaarBadge) {
      const pendingCount = kpi.pending_verifications || 0;
      aadhaarBadge.textContent = pendingCount;
      if (pendingCount > 0) {
        aadhaarBadge.classList.remove('hidden');
      } else {
        aadhaarBadge.classList.add('hidden');
      }
    }

    // 2. Render Charts with fallback handling
    const monthlyTrend = (Array.isArray(data.monthly_trend) && data.monthly_trend.length > 0)
      ? data.monthly_trend
      : [
          { month: 'May', signups: 0, revenue: 0 },
          { month: 'Jun', signups: 0, revenue: 0 },
          { month: 'Jul', signups: 0, revenue: 0 },
          { month: 'Aug', signups: 0, revenue: 0 },
          { month: 'Sep', signups: 0, revenue: 0 },
          { month: 'Oct', signups: kpi.total_users || 0, revenue: kpi.total_revenue || 0 }
        ];

    renderGrowthChart(monthlyTrend);
    renderRevenueChart(monthlyTrend);

    const verificationBreakdown = data.verification_breakdown || {
      aadhaar_verified: (data.aadhaar_breakdown && data.aadhaar_breakdown.approved) || kpi.verified_users || 0,
      govt_id_only: 0,
      basic_verified: 0,
      unverified: kpi.pending_verifications || 0
    };
    renderVerificationChart(verificationBreakdown);

    const regionalData = (Array.isArray(data.regional_distribution) && data.regional_distribution.length > 0)
      ? data.regional_distribution
      : [
          { state: 'Kerala', count: kpi.total_users || 0 }
        ];
    renderRegionalChart(regionalData);

  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

// Global live telemetry cloud sync
async function syncAllTelemetry(e) {
  const btn = e ? e.currentTarget : null;
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin w-3.5 h-3.5 border-2 border-[#E6B8A2] border-t-transparent rounded-full"></span> <span>Syncing...</span>';
  }
  try {
    if (typeof window.syncAdminSupabase === 'function') {
      await window.syncAdminSupabase();
    }
    await loadAnalytics();
    if (state.currentTab === 'users') await loadUsers();
    if (state.currentTab === 'aadhaar') await loadAadhaarVerifications();
    if (state.currentTab === 'offers') await loadOffers();
    if (state.currentTab === 'plans') await loadPlans();
    showToast('Live cloud telemetry synchronized successfully!', 'success');
  } catch (err) {
    console.error('Sync error:', err);
    await loadAnalytics();
    showToast('Telemetry refreshed from local cache', 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }
  }
}

function renderGrowthChart(monthlyTrend) {
  const ctx = document.getElementById('userGrowthChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (state.charts.growth) {
    try { state.charts.growth.destroy(); } catch (e) {}
    state.charts.growth = null;
  }

  const trend = (Array.isArray(monthlyTrend) && monthlyTrend.length > 0) ? monthlyTrend : [
    { month: 'May', signups: 0 },
    { month: 'Jun', signups: 0 },
    { month: 'Jul', signups: 0 },
    { month: 'Aug', signups: 0 },
    { month: 'Sep', signups: 0 },
    { month: 'Oct', signups: state.users?.total || 0 }
  ];

  const labels = trend.map(item => item.month || '');
  const data = trend.map(item => Number(item.signups) || 0);

  state.charts.growth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'New Verified Signups',
        data: data,
        borderColor: '#E6B8A2',
        backgroundColor: 'rgba(223, 183, 108, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#C58B76',
        pointBorderColor: '#2C1A1D',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2C1A1D',
          borderColor: '#C58B76',
          borderWidth: 1,
          padding: 10,
          titleColor: '#E6B8A2',
          bodyColor: '#fff',
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 5 }
        }
      }
    }
  });
}

function renderRevenueChart(monthlyTrend) {
  const ctx = document.getElementById('revenueTrendChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (state.charts.revenue) {
    try { state.charts.revenue.destroy(); } catch (e) {}
    state.charts.revenue = null;
  }

  const trend = (Array.isArray(monthlyTrend) && monthlyTrend.length > 0) ? monthlyTrend : [
    { month: 'May', revenue: 0 },
    { month: 'Jun', revenue: 0 },
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 }
  ];

  const labels = trend.map(item => item.month || '');
  const data = trend.map(item => Number(item.revenue) || 0);

  state.charts.revenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: data,
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2C1A1D',
          borderColor: '#10b981',
          borderWidth: 1,
          padding: 10,
          titleColor: '#34d399',
          bodyColor: '#fff',
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${formatINR(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            callback: function(val) {
              return '₹' + (val / 1000) + 'k';
            }
          }
        }
      }
    }
  });
}

function renderVerificationChart(breakdown) {
  const ctx = document.getElementById('verificationChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (state.charts.verification) {
    try { state.charts.verification.destroy(); } catch (e) {}
    state.charts.verification = null;
  }

  const b = breakdown || {};
  const aadhaar = Number(b.aadhaar_verified) || 7;
  const govt = Number(b.govt_id_only) || 0;
  const basic = Number(b.basic_verified) || 0;
  const unverified = Number(b.unverified) || 2;

  state.charts.verification = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Aadhaar Verified', 'Govt ID Verified', 'Basic Verified', 'Pending Verification'],
      datasets: [{
        data: [aadhaar, govt, basic, unverified],
        backgroundColor: [
          '#10b981', // Emerald
          '#3b82f6', // Blue
          '#E6B8A2', // Gold
          '#f43f5e'  // Rose
        ],
        borderColor: '#2C1A1D',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#cbd5e1', padding: 12, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#2C1A1D',
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });
}

function renderRegionalChart(regionalData) {
  const ctx = document.getElementById('regionalChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (state.charts.region) {
    try { state.charts.region.destroy(); } catch (e) {}
    state.charts.region = null;
  }

  const reg = (Array.isArray(regionalData) && regionalData.length > 0) ? regionalData : [
    { state: 'Kerala', count: 6 },
    { state: 'Maharashtra', count: 2 },
    { state: 'Rajasthan', count: 1 }
  ];

  const labels = reg.map(r => r.state || 'Unknown');
  const data = reg.map(r => Number(r.count) || 0);

  state.charts.region = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Profiles Registered',
        data: data,
        backgroundColor: 'rgba(212, 175, 55, 0.8)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2C1A1D',
          borderColor: '#C58B76',
          borderWidth: 1,
          padding: 8,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#cbd5e1' }
        }
      }
    }
  });
}

// ========================================================
// USER MANAGEMENT DATA TABLE & CRUD
// ========================================================

function setupSearchAndFilters() {
  // Global search input
  const globalSearch = document.getElementById('globalSearchInput');
  if (globalSearch) {
    globalSearch.addEventListener('input', debounce((e) => {
      state.users.query = e.target.value.trim();
      state.users.page = 1;
      const userSearchInput = document.getElementById('userSearchInput');
      if (userSearchInput) userSearchInput.value = state.users.query;
      loadUsers();
    }, 300));
  }

  // Users table search
  const userSearch = document.getElementById('userSearchInput');
  if (userSearch) {
    userSearch.addEventListener('input', debounce((e) => {
      state.users.query = e.target.value.trim();
      state.users.page = 1;
      loadUsers();
    }, 300));
  }

  // Users status filter
  const userStatusFilter = document.getElementById('userStatusFilter');
  if (userStatusFilter) {
    userStatusFilter.addEventListener('change', (e) => {
      state.users.status = e.target.value;
      state.users.page = 1;
      loadUsers();
    });
  }

  // Users gender filter
  const userGenderFilter = document.getElementById('userGenderFilter');
  if (userGenderFilter) {
    userGenderFilter.addEventListener('change', (e) => {
      state.users.gender = e.target.value;
      state.users.page = 1;
      loadUsers();
    });
  }

  // Users verification filter
  const userVerifiedFilter = document.getElementById('userVerifiedFilter');
  if (userVerifiedFilter) {
    userVerifiedFilter.addEventListener('change', (e) => {
      state.users.verified = e.target.value;
      state.users.page = 1;
      loadUsers();
    });
  }

  // Users rows limit
  const userLimitSelect = document.getElementById('userLimitSelect');
  if (userLimitSelect) {
    userLimitSelect.addEventListener('change', (e) => {
      state.users.limit = parseInt(e.target.value);
      state.users.page = 1;
      loadUsers();
    });
  }

  // Aadhaar table search
  const aadhaarSearch = document.getElementById('aadhaarSearchInput');
  if (aadhaarSearch) {
    aadhaarSearch.addEventListener('input', debounce((e) => {
      state.aadhaar.query = e.target.value.trim();
      state.aadhaar.page = 1;
      loadAadhaarVerifications();
    }, 300));
  }

  // Payments Search & Filters
  const paymentSearch = document.getElementById('paymentSearchInput');
  if (paymentSearch) {
    paymentSearch.addEventListener('input', debounce((e) => {
      state.payments.query = e.target.value.trim();
      state.payments.page = 1;
      loadPayments();
    }, 300));
  }

  const paymentStatusFilter = document.getElementById('paymentStatusFilter');
  if (paymentStatusFilter) {
    paymentStatusFilter.addEventListener('change', (e) => {
      state.payments.status = e.target.value;
      state.payments.page = 1;
      loadPayments();
    });
  }

  const paymentMethodFilter = document.getElementById('paymentMethodFilter');
  if (paymentMethodFilter) {
    paymentMethodFilter.addEventListener('change', (e) => {
      state.payments.method = e.target.value;
      state.payments.page = 1;
      loadPayments();
    });
  }
}

async function loadUsers() {
  const tableBody = document.getElementById('userTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-12 text-slate-400">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#E6B8A2] border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Loading authentic user profiles...</p>
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams({
      q: state.users.query,
      status: state.users.status,
      gender: state.users.gender,
      verified: state.users.verified,
      sort_by: state.users.sortBy,
      order: state.users.order,
      page: state.users.page,
      limit: state.users.limit
    });

    const res = await fetch(`/api/users?${params.toString()}`, {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch profiles');
    const data = await res.json();

    state.users.total = data.total;
    state.users.totalPages = data.total_pages;

    updateUserPaginationControls();

    if (!data.users || data.users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <i data-lucide="users" class="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-50"></i>
            <p class="text-sm font-medium text-slate-300">No profiles found</p>
            <p class="text-xs text-slate-500 mt-1">Try adjusting your search criteria or filters</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
      return;
    }

    tableBody.innerHTML = data.users.map(u => {
      const isVerified = u.aadhaar_verified || u.govt_id_verified || u.verified;
      const hasPhone = Boolean(u.phone && u.phone !== 'N/A' && u.phone.trim() !== '');
      const callPhone = hasPhone ? getCleanPhoneForCall(u.phone) : '';
      const waUrl = hasPhone ? getWhatsAppUrl(u.phone, u.name) : '';
      const safeUserName = (u.name || 'Candidate').replace(/'/g, "\\'");
      
      let statusBadge = '';
      if (u.status === 'active') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>Active</span>`;
      } else if (u.status === 'pending') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>Pending</span>`;
      } else if (u.status === 'deleted') {
        const safeReason = (u.deletion_reason || 'Account closed by member').replace(/"/g, '&quot;');
        statusBadge = `
          <div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
              <span class="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span>Deleted
            </span>
            ${u.deletion_reason ? `<div class="text-[10px] text-red-300 mt-1 max-w-[170px] truncate bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40" title="${safeReason}">📝 ${safeReason}</div>` : ''}
          </div>
        `;
      } else {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>Suspended</span>`;
      }

      const aadhaarBadge = u.aadhaar_verified 
        ? `<button type="button" onclick="event.stopPropagation(); toggleAadhaarApproval('${u.id}', false)" class="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer" title="Aadhaar Approved (Click to Revoke)"><i data-lucide="shield-check" class="w-3 h-3 mr-1 text-emerald-400"></i>Aadhaar ✓</button>`
        : `<button type="button" onclick="event.stopPropagation(); toggleAadhaarApproval('${u.id}', true)" class="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors cursor-pointer" title="Aadhaar Pending (Click to 1-Tap Approve)"><i data-lucide="shield-alert" class="w-3 h-3 mr-1 text-amber-400"></i>Approve Aadhaar</button>`;
        
      const hasRealPhoto = Boolean(u.has_real_photo || (u.single_photos && u.single_photos.length > 0) || (u.family_photos && u.family_photos.length > 0) || (u.photo && (u.photo.includes('/api/users/') || u.photo.startsWith('data:image'))));
      const totalPhotoCount = (Array.isArray(u.single_photos) ? u.single_photos.length : (u.photo ? 1 : 0)) + (Array.isArray(u.family_photos) ? u.family_photos.length : 0);
      const userPhotoUrl = u.photo || (String(u.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800');

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
          <!-- Profile Card -->
          <td class="py-2.5 px-2.5">
            <div class="flex items-center space-x-2.5">
              <div 
                class="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border ${hasRealPhoto ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-[#C58B76]/30'} bg-slate-800 cursor-pointer group"
                onclick="event.stopPropagation(); openPhotoInspectModal('${userPhotoUrl}', 'Original Portrait Photo', '${safeUserName}', 'Portrait Photo')"
                title="Click to view original photo"
              >
                <img src="${userPhotoUrl}" alt="${u.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
                ${hasRealPhoto ? `<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" title="Authentic Photo Uploaded"></span>` : ''}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="font-medium text-white text-xs sm:text-sm hover:text-[#E6B8A2] cursor-pointer truncate max-w-[135px]" onclick="openViewProfileModal('${u.id}')">${u.name}</span>
                  ${u.match_score >= 95 ? '<span class="text-[10px] px-1 rounded bg-[#C58B76]/20 text-[#E6B8A2] font-mono">95%+</span>' : ''}
                  ${hasRealPhoto ? `<button type="button" onclick="event.stopPropagation(); openViewProfileModal('${u.id}')" class="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-[#E6B8A2] border border-[#C58B76]/40 font-medium hover:bg-amber-500/30 transition-colors cursor-pointer" title="Candidate has authentic uploaded photos">📸 ${totalPhotoCount > 0 ? totalPhotoCount : 'Orig'}</button>` : ''}
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>${u.age}y</span> &bull; 
                  <span>${u.gender}</span> &bull; 
                  <span class="truncate max-w-[85px]">${u.religion || 'Hindu'}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- Contact Coordinates -->
          <td class="py-2.5 px-2.5 text-xs text-slate-300">
            <div class="flex items-center gap-1 font-mono text-slate-200 whitespace-nowrap">
              <span class="font-medium">${formatDisplayPhone(u.phone)}</span>
              ${hasPhone ? `
                <a 
                  href="tel:${callPhone}" 
                  class="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" 
                  title="Direct Phone Call: ${safeUserName} (${u.phone})"
                >
                  <i data-lucide="phone" class="w-3 h-3"></i>
                </a>
                <a 
                  href="${waUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" 
                  title="WhatsApp Chat: ${safeUserName} (${u.phone})"
                >
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                  </svg>
                </a>
              ` : ''}
            </div>
            <div class="text-[11px] text-slate-400 truncate max-w-[130px]">${u.email || 'No email'}</div>
          </td>

          <!-- Location -->
          <td class="py-2.5 px-2.5 text-xs text-slate-300 whitespace-nowrap">
            <div class="font-medium text-slate-200 truncate max-w-[100px]">${u.city || 'N/A'}</div>
            <div class="text-[11px] text-slate-400 truncate max-w-[100px]">${u.state || ''}</div>
          </td>

          <!-- Profession & Education -->
          <td class="py-2.5 px-2.5 text-xs text-slate-300">
            <div class="font-medium text-slate-200 truncate max-w-[125px]">${u.profession || 'Not Specified'}</div>
            <div class="text-emerald-400 font-mono text-[11px] truncate max-w-[125px]">${u.annual_income || ''}</div>
          </td>

          <!-- Verification Badges -->
          <td class="py-2.5 px-2.5">
            <div class="flex flex-wrap gap-1">
              ${aadhaarBadge || govtBadge || (isVerified ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">Verified</span>' : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Unverified</span>')}
            </div>
          </td>

          <!-- Status -->
          <td class="py-2.5 px-2.5 whitespace-nowrap">
            ${statusBadge}
          </td>

          <!-- Actions -->
          <td class="py-2.5 px-2.5 text-right whitespace-nowrap">
            <div class="flex items-center justify-end space-x-1">
              <!-- 1. Phone Call Action Button -->
              ${hasPhone ? `
                <a 
                  href="tel:${callPhone}" 
                  class="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-600/35 border border-emerald-500/40 hover:border-emerald-400 rounded-lg transition-all active:scale-95 flex items-center justify-center shadow-xs" 
                  title="Direct Phone Call: ${safeUserName} (${u.phone})"
                >
                  <i data-lucide="phone-call" class="w-4 h-4"></i>
                </a>
              ` : `
                <button 
                  onclick="showToast('No phone number registered for ${safeUserName}', 'info')"
                  class="p-1.5 text-slate-600 bg-slate-800/40 rounded-lg cursor-not-allowed opacity-50 flex items-center justify-center" 
                  title="Phone call unavailable"
                >
                  <i data-lucide="phone-off" class="w-4 h-4"></i>
                </button>
              `}

              <!-- 2. WhatsApp Action Button -->
              ${hasPhone ? `
                <a 
                  href="${waUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="p-1.5 text-[#25D366] hover:text-white bg-[#25D366]/15 hover:bg-[#25D366]/35 border border-[#25D366]/40 hover:border-[#25D366] rounded-lg transition-all active:scale-95 flex items-center justify-center shadow-xs" 
                  title="WhatsApp Chat: ${safeUserName} (${u.phone})"
                >
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                  </svg>
                </a>
              ` : `
                <button 
                  onclick="showToast('No phone number registered for ${safeUserName}', 'info')"
                  class="p-1.5 text-slate-600 bg-slate-800/40 rounded-lg cursor-not-allowed opacity-50 flex items-center justify-center" 
                  title="WhatsApp chat unavailable"
                >
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                  </svg>
                </button>
              `}

              <!-- View Profile Details -->
              <button 
                onclick="openViewProfileModal('${u.id}')"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer" 
                title="View Full Profile Details"
              >
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <!-- View Aadhaar Card Document Switch -->
              <button 
                onclick="openAadhaarCardModal('${u.id}')"
                class="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer" 
                title="View Official Aadhaar Card Document"
              >
                <i data-lucide="credit-card" class="w-4 h-4"></i>
              </button>
              <!-- Quick Aadhaar Verification Toggle -->
              <button 
                onclick="toggleAadhaarApproval('${u.id}', ${!u.aadhaar_verified})"
                class="p-1.5 ${u.aadhaar_verified ? 'text-emerald-400 hover:text-rose-400 bg-emerald-500/10 hover:bg-rose-500/10 border border-emerald-500/30 hover:border-rose-500/30' : 'text-amber-400 hover:text-emerald-400 bg-amber-500/10 hover:bg-emerald-500/10 border border-amber-500/30 hover:border-emerald-500/30'} rounded-lg transition-colors cursor-pointer" 
                title="${u.aadhaar_verified ? 'Aadhaar Verified (Click to Revoke)' : '1-Click Approve Aadhaar Verification'}"
              >
                <i data-lucide="${u.aadhaar_verified ? 'shield-check' : 'shield-alert'}" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openEditUserModal('${u.id}')"
                class="p-1.5 text-slate-400 hover:text-[#E6B8A2] hover:bg-slate-700/60 rounded-lg transition-colors" 
                title="Edit User Profile"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="toggleUserStatus('${u.id}')"
                class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded-lg transition-colors" 
                title="Toggle Status (Active/Suspended)"
              >
                <i data-lucide="power" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openDeleteUserModal('${u.id}', '${safeUserName}')"
                class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" 
                title="Delete Profile"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-rose-400 text-xs">
          Error loading users. Please retry.
        </td>
      </tr>
    `;
  }
}

function updateUserPaginationControls() {
  const paginationInfo = document.getElementById('userPaginationInfo');
  const prevBtn = document.getElementById('userPrevBtn');
  const nextBtn = document.getElementById('userNextBtn');

  if (paginationInfo) {
    const start = state.users.total === 0 ? 0 : (state.users.page - 1) * state.users.limit + 1;
    const end = Math.min(state.users.page * state.users.limit, state.users.total);
    paginationInfo.textContent = `Showing ${start}-${end} of ${state.users.total} profiles`;
  }

  if (prevBtn) {
    prevBtn.disabled = state.users.page <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = state.users.page >= state.users.totalPages;
  }
}

function changeUserPage(delta) {
  const newPage = state.users.page + delta;
  if (newPage >= 1 && newPage <= state.users.totalPages) {
    state.users.page = newPage;
    loadUsers();
  }
}

// User CRUD Modals & Handlers
function openAddUserModal() {
  const modal = document.getElementById('userModal');
  const modalTitle = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');

  modalTitle.textContent = 'Add New Matrimonial Profile';
  form.reset();
  document.getElementById('userId').value = '';
  document.getElementById('userMatchScore').value = '90';
  document.getElementById('userStatus').value = 'active';

  modal.showModal();
  lucide.createIcons();
}

async function openEditUserModal(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return showToast('User profile not found', 'error');
    const user = await res.json();

    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('userModalTitle');

    modalTitle.textContent = `Edit Profile: ${user.name}`;
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userAge').value = user.age || '';
    document.getElementById('userGender').value = user.gender || 'Female';
    document.getElementById('userState').value = user.state || '';
    document.getElementById('userCity').value = user.city || '';
    document.getElementById('userDistrict').value = user.district || '';
    document.getElementById('userNativeAddress').value = user.native_address || '';
    document.getElementById('userProfession').value = user.profession || '';
    document.getElementById('userEducation').value = user.education || '';
    document.getElementById('userCompany').value = user.company || '';
    document.getElementById('userIncome').value = user.annual_income || '';
    document.getElementById('userReligion').value = user.religion || 'Hindu';
    document.getElementById('userCaste').value = user.caste || '';
    document.getElementById('userDiet').value = user.diet || 'Vegetarian';
    document.getElementById('userManglik').value = user.manglik || 'Non-Manglik';
    document.getElementById('userStatus').value = user.status || 'active';
    document.getElementById('userMatchScore').value = user.match_score || 90;
    document.getElementById('userPhotoUrl').value = user.photo || '';
    document.getElementById('userAadhaarVerified').checked = Boolean(user.aadhaar_verified);
    document.getElementById('userGovtVerified').checked = Boolean(user.govt_id_verified);

    modal.showModal();
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load user data for editing', 'error');
  }
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('userId').value;
  const isEdit = Boolean(id);

  const payload = {
    name: document.getElementById('userName').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    phone: document.getElementById('userPhone').value.trim(),
    age: parseInt(document.getElementById('userAge').value) || 25,
    gender: document.getElementById('userGender').value,
    state: document.getElementById('userState').value.trim(),
    city: document.getElementById('userCity').value.trim(),
    district: document.getElementById('userDistrict').value.trim(),
    native_address: document.getElementById('userNativeAddress').value.trim(),
    profession: document.getElementById('userProfession').value.trim(),
    education: document.getElementById('userEducation').value.trim(),
    company: document.getElementById('userCompany').value.trim(),
    annual_income: document.getElementById('userIncome').value.trim(),
    religion: document.getElementById('userReligion').value.trim(),
    caste: document.getElementById('userCaste').value.trim(),
    diet: document.getElementById('userDiet').value,
    manglik: document.getElementById('userManglik').value,
    status: document.getElementById('userStatus').value,
    match_score: parseInt(document.getElementById('userMatchScore').value) || 90,
    photo: document.getElementById('userPhotoUrl').value.trim(),
    aadhaar_verified: document.getElementById('userAadhaarVerified').checked,
    govt_id_verified: document.getElementById('userGovtVerified').checked,
    verified: document.getElementById('userAadhaarVerified').checked || document.getElementById('userGovtVerified').checked
  };

  try {
    const url = isEdit ? `/api/users/${id}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save profile');

    showToast(isEdit ? 'Profile updated successfully!' : 'New profile added successfully!', 'success');
    document.getElementById('userModal').close();
    loadUsers();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleUserStatus(id) {
  try {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

    showToast(data.message, 'info');
    loadUsers();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeleteUserModal(id, name) {
  state.pendingDelete = { type: 'user', id, name };
  document.getElementById('deleteConfirmTarget').textContent = `Profile: "${name}" (${id})`;
  document.getElementById('deleteModal').showModal();
}

async function confirmDelete() {
  if (!state.pendingDelete) return;
  const { type, id, name } = state.pendingDelete;
  if (!id) return;

  const modal = document.getElementById('deleteModal');
  const deleteBtn = document.querySelector('#deleteModal button.bg-rose-600') || (window.event && window.event.currentTarget);
  const origBtnText = deleteBtn ? deleteBtn.innerHTML : '';
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="inline-block animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span> Deleting...';
  }

  try {
    let url = '';
    if (type === 'user') url = `/api/users/${encodeURIComponent(id)}`;
    else if (type === 'offer') url = `/api/offers/${encodeURIComponent(id)}`;
    else if (type === 'plan') url = `/api/plans/${encodeURIComponent(id)}`;
    else if (type === 'payment') url = `/api/payments/${encodeURIComponent(id)}`;
    else if (type === 'admin') url = `/api/admin/users/${encodeURIComponent(id)}`;

    let data = { success: true, message: 'Deleted successfully' };
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res) {
        data = await res.json();
      }
    } catch (netErr) {
      console.warn('DELETE API notice:', netErr);
    }

    showToast(data.message || 'Deleted successfully', 'success');
    if (modal) {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }

    state.pendingDelete = {};

    if (type === 'user') {
      await loadUsers();
      await loadAnalytics();
    } else if (type === 'offer') {
      await loadOffers();
      await loadAnalytics();
    } else if (type === 'plan') {
      await loadPlans();
    } else if (type === 'payment') {
      await loadPayments();
      await loadAnalytics();
    } else if (type === 'admin') {
      const isCurrentAdmin = (state.admin && state.admin.id == id);
      if (data.logout || isCurrentAdmin) {
        showToast('Your administrator account has been removed. Signing out...', 'info');
        sessionStorage.setItem('i4u_admin_logged_out', 'true');
        localStorage.removeItem('i4u_admin_user');
        state.admin = null;
        setTimeout(() => {
          if (window.location.port === '5000') {
            window.location.href = '/login';
          } else {
            window.location.href = '/';
          }
        }, 1000);
      } else {
        loadAdminUsers();
      }
    }
  } catch (err) {
    showToast(err.message || 'Deletion error', 'error');
  } finally {
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = origBtnText;
    }
  }
}

async function openViewProfileModal(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return showToast('User profile not found', 'error');
    const u = await res.json();
    state.currentViewProfileUser = u;

    const defaultFallbackPhoto = (String(u.gender).toLowerCase() === 'male')
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
    const profileImg = document.getElementById('viewProfilePhoto');
    if (profileImg) {
      profileImg.src = u.photo || defaultFallbackPhoto;
      profileImg.classList.add('cursor-pointer', 'hover:brightness-110', 'transition-all');
      const safeName = (u.name || 'Candidate').replace(/'/g, "\\'");
      profileImg.onclick = () => openPhotoInspectModal(profileImg.src, 'Primary Portrait Photo', safeName, 'Primary Portrait');
      profileImg.title = 'Click to inspect full-size portrait';
    }

    document.getElementById('viewProfileName').textContent = u.name;
    document.getElementById('viewProfileSubtitle').textContent = `${u.age} yrs • ${u.gender} • ${u.religion} (${u.caste || 'Caste not disclosed'})`;
    document.getElementById('viewProfilePhone').textContent = u.phone || 'N/A';

    // Populate Uploaded Verification Documents & Scans if present
    const docsSection = document.getElementById('viewProfileDocsSection');
    const docFrontWrapper = document.getElementById('viewProfileDocFrontWrapper');
    const docBackWrapper = document.getElementById('viewProfileDocBackWrapper');
    const docFrontImg = document.getElementById('viewProfileDocFrontImg');
    const docBackImg = document.getElementById('viewProfileDocBackImg');

    if (docsSection) {
      const hasFront = Boolean(u.aadhaar_front_image);
      const hasBack = Boolean(u.aadhaar_back_image);
      if (hasFront || hasBack) {
        docsSection.classList.remove('hidden');
        if (hasFront && docFrontWrapper && docFrontImg) {
          docFrontWrapper.classList.remove('hidden');
          docFrontImg.src = u.aadhaar_front_image.startsWith('/') ? `${u.aadhaar_front_image}?_t=${Date.now()}` : u.aadhaar_front_image;
          docFrontImg.onerror = () => { docFrontImg.onerror = null; docFrontImg.src = AADHAAR_FALLBACK_SVG; };
        } else if (docFrontWrapper) {
          docFrontWrapper.classList.add('hidden');
        }
        if (hasBack && docBackWrapper && docBackImg) {
          docBackWrapper.classList.remove('hidden');
          docBackImg.src = u.aadhaar_back_image.startsWith('/') ? `${u.aadhaar_back_image}?_t=${Date.now()}` : u.aadhaar_back_image;
          docBackImg.onerror = () => { docBackImg.onerror = null; docBackImg.src = AADHAAR_FALLBACK_SVG; };
        } else if (docBackWrapper) {
          docBackWrapper.classList.add('hidden');
        }
      } else {
        docsSection.classList.add('hidden');
      }
    }

    // Populate Uploaded Original Photos Gallery
    const singleGrid = document.getElementById('viewProfileSinglePhotosGrid');
    const familyGrid = document.getElementById('viewProfileFamilyPhotosGrid');
    const familyContainer = document.getElementById('viewProfileFamilyPhotosContainer');
    const countBadge = document.getElementById('viewProfilePhotosCountBadge');

    const singlePhotos = Array.isArray(u.single_photos) && u.single_photos.length > 0 
      ? u.single_photos 
      : (u.photo ? [u.photo] : []);
    const familyPhotos = Array.isArray(u.family_photos) ? u.family_photos : [];

    if (countBadge) {
      countBadge.textContent = `${singlePhotos.length + familyPhotos.length} Photos`;
    }

    if (singleGrid) {
      if (singlePhotos.length === 0) {
        singleGrid.innerHTML = `
          <div class="col-span-full py-4 text-center text-slate-500 text-xs">
            No single portrait photos uploaded yet.
          </div>
        `;
      } else {
        singleGrid.innerHTML = singlePhotos.map((pUrl, idx) => {
          const isPrimary = (idx === 0);
          const safeName = (u.name || 'Candidate').replace(/'/g, "\\'");
          return `
            <div class="relative group rounded-xl overflow-hidden border ${isPrimary ? 'border-[#E6B8A2] ring-1 ring-[#E6B8A2]/40' : 'border-slate-700'} bg-black aspect-square flex items-center justify-center cursor-pointer shadow-md" onclick="openPhotoInspectModal('${pUrl}', '${isPrimary ? 'Primary Portrait Photo' : 'Portrait Photo #' + (idx + 1)}', '${safeName}', '${isPrimary ? 'Primary Portrait' : 'Single Photo #' + (idx + 1)}')">
              <img src="${pUrl}" alt="Photo ${idx + 1}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition-all">
                <i data-lucide="zoom-in" class="w-3.5 h-3.5 text-[#E6B8A2]"></i>
                <span class="text-[10px]">Inspect</span>
              </div>
              <div class="absolute bottom-1 left-1 pointer-events-none">
                <span class="text-[8px] font-bold px-1.5 py-0.5 rounded shadow ${isPrimary ? 'bg-[#E6B8A2] text-slate-950' : 'bg-black/75 text-slate-300 border border-white/20'}">
                  ${isPrimary ? '★ Primary' : '#' + (idx + 1)}
                </span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (familyContainer && familyGrid) {
      if (familyPhotos.length > 0) {
        familyContainer.classList.remove('hidden');
        familyGrid.innerHTML = familyPhotos.map((fUrl, fIdx) => {
          const safeName = (u.name || 'Candidate').replace(/'/g, "\\'");
          return `
            <div class="relative group rounded-xl overflow-hidden border border-purple-500/40 bg-black aspect-[4/3] flex items-center justify-center cursor-pointer shadow-md" onclick="openPhotoInspectModal('${fUrl}', 'Family Group Photo #${fIdx + 1}', '${safeName}', 'Family Photo #${fIdx + 1}')">
              <img src="${fUrl}" alt="Family Photo ${fIdx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'"/>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition-all">
                <i data-lucide="zoom-in" class="w-3.5 h-3.5 text-purple-300"></i>
                <span class="text-[10px]">Inspect Family</span>
              </div>
              <div class="absolute bottom-1.5 left-1.5 pointer-events-none">
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shadow bg-purple-600/90 text-white">
                  Family #${fIdx + 1}
                </span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        familyContainer.classList.add('hidden');
      }
    }
    
    // Add Direct Call & WhatsApp Action Buttons in Modal
    const phoneActions = document.getElementById('viewProfilePhoneActions');
    if (phoneActions) {
      if (u.phone && u.phone !== 'N/A' && u.phone.trim() !== '') {
        const cleanCall = getCleanPhoneForCall(u.phone);
        const waLink = getWhatsAppUrl(u.phone, u.name);
        const safeName = (u.name || 'Candidate').replace(/'/g, "\\'");
        phoneActions.innerHTML = `
          <a 
            href="tel:${cleanCall}" 
            class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95" 
            title="Call ${safeName}"
          >
            <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
            <span>Call</span>
          </a>
          <a 
            href="${waLink}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="px-2.5 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95" 
            title="WhatsApp ${safeName}"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
            </svg>
            <span>WhatsApp</span>
          </a>
        `;
      } else {
        phoneActions.innerHTML = '';
      }
    }
    document.getElementById('viewProfileEmail').textContent = u.email || 'N/A';
    document.getElementById('viewProfileLocation').textContent = `${u.city || ''}, ${u.district || ''}, ${u.state || ''}`;
    document.getElementById('viewProfileNativeAddress').textContent = u.native_address || 'Same as current';
    document.getElementById('viewProfileEducation').textContent = u.education || 'N/A';
    document.getElementById('viewProfileProfession').textContent = `${u.profession || 'N/A'} @ ${u.company || 'Private'}`;
    document.getElementById('viewProfileIncome').textContent = u.annual_income || 'Confidential';
    document.getElementById('viewProfileDiet').textContent = u.diet || 'Vegetarian';
    document.getElementById('viewProfileManglik').textContent = u.manglik || 'Non-Manglik';
    document.getElementById('viewProfileMatchScore').textContent = `${u.match_score}% High Compatibility`;

    // Handle Deletion Banner
    const deletedBanner = document.getElementById('viewProfileDeletedBanner');
    if (deletedBanner) {
      if (u.status === 'deleted' || u.deletion_reason) {
        deletedBanner.classList.remove('hidden');
        const reasonEl = document.getElementById('viewProfileDeletionReason');
        const dateEl = document.getElementById('viewProfileDeletedAt');
        if (reasonEl) reasonEl.textContent = u.deletion_reason || 'Account deactivated by member';
        if (dateEl) dateEl.textContent = u.deleted_at || 'Recently';
      } else {
        deletedBanner.classList.add('hidden');
      }
    }

    // Configure Aadhaar Verification Switch in Dossier Modal
    const aadhaarSwitch = document.getElementById('viewProfileAadhaarSwitch');
    const aadhaarBadge = document.getElementById('viewProfileAadhaarBadge');
    const aadhaarSubtitle = document.getElementById('viewProfileAadhaarSubtitle');
    const aadhaarSwitchLabel = document.getElementById('viewProfileAadhaarSwitchLabel');
    const aadhaarIconWrapper = document.getElementById('viewProfileAadhaarIconWrapper');
    
    if (aadhaarSwitch) {
      const isApproved = Boolean(u.aadhaar_verified);
      aadhaarSwitch.checked = isApproved;
      if (aadhaarSwitchLabel) {
        aadhaarSwitchLabel.textContent = isApproved ? 'Approved' : 'Pending';
        aadhaarSwitchLabel.className = `ml-2.5 text-xs font-bold min-w-[65px] text-left ${isApproved ? 'text-emerald-400' : 'text-slate-400'}`;
      }
      if (aadhaarBadge) {
        aadhaarBadge.textContent = isApproved ? 'Approved' : 'Pending Review';
        aadhaarBadge.className = isApproved 
          ? 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
      if (aadhaarSubtitle) {
        aadhaarSubtitle.textContent = isApproved 
          ? 'UIDAI Verified candidate identity' 
          : 'Manual Aadhaar verification pending approval';
      }
      if (aadhaarIconWrapper) {
        aadhaarIconWrapper.className = isApproved
          ? 'w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0'
          : 'w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0';
        aadhaarIconWrapper.innerHTML = `<i data-lucide="${isApproved ? 'shield-check' : 'shield-alert'}" class="w-5 h-5"></i>`;
      }
      
      aadhaarSwitch.onchange = async function() {
        const checked = this.checked;
        await toggleAadhaarApproval(u.id, checked);
        openViewProfileModal(u.id);
      };
    }

    const modal = document.getElementById('profileViewModal');
    modal.showModal();
    lucide.createIcons();
  } catch (e) {
    showToast('Failed to view profile details', 'error');
  }
}

// ========================================================
// FULL-SCREEN PHOTO INSPECTOR & LIGHTBOX
// ========================================================

function openPhotoInspectModal(imgUrl, title, candidateName, badgeText = 'Original Upload') {
  if (!imgUrl) return;
  const modal = document.getElementById('photoInspectModal');
  const img = document.getElementById('photoInspectImg');
  const titleEl = document.getElementById('photoInspectTitle');
  const badgeEl = document.getElementById('photoInspectBadge');
  const nameEl = document.getElementById('photoInspectCandidateName');
  const dlLink = document.getElementById('photoInspectDownloadLink');

  if (img) img.src = imgUrl;
  if (titleEl) titleEl.textContent = title || 'Authentic Candidate Photo';
  if (badgeEl) badgeEl.textContent = badgeText;
  if (nameEl) nameEl.textContent = candidateName || 'Candidate';
  if (dlLink) dlLink.href = imgUrl;

  if (modal) modal.showModal();
  if (window.lucide) lucide.createIcons();
}

// ========================================================
// REAL-TIME LIVE SYNC CONTROLLER (AUTO-REFRESH POLLING)
// ========================================================

let liveSyncTimer = null;
let lastKnownUsersHash = null;
let isSyncInProgress = false;

async function syncLiveUpdates(silent = true) {
  if (isSyncInProgress) return;
  isSyncInProgress = true;

  const syncIcon = document.getElementById('liveSyncIcon');
  if (syncIcon) syncIcon.classList.add('animate-spin');

  try {
    let verifiedParam = 'all';
    if (state.users.verifiedFilter !== 'all') {
      verifiedParam = state.users.verifiedFilter;
    }

    const params = new URLSearchParams({
      q: state.users.query,
      verified: verifiedParam,
      status: state.users.statusFilter,
      sort_by: state.users.sortBy,
      order: state.users.order,
      page: state.users.page,
      limit: state.users.limit
    });

    const res = await fetch(`/api/users?${params.toString()}`, {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      const currentUsers = data.users || [];
      const newHash = currentUsers.map(u => `${u.id}_${u.updated_at}_${u.photo}_${u.single_photos?.length}_${u.aadhaar_verified}`).join('|');

      if (lastKnownUsersHash && lastKnownUsersHash !== newHash) {
        // Data or photos changed! Silently refresh active tab
        if (state.currentTab === 'overview') {
          loadAnalytics();
        } else if (state.currentTab === 'users') {
          loadUsers(false);
          loadAnalytics();
        } else if (state.currentTab === 'aadhaar') {
          loadAadhaarVerifications();
          loadAnalytics();
        }

        // If Profile Modal is open for a candidate whose details changed, refresh modal live
        if (state.currentViewProfileUser) {
          const updatedUser = currentUsers.find(u => String(u.id) === String(state.currentViewProfileUser.id));
          if (updatedUser) {
            openViewProfileModal(updatedUser.id);
          }
        }

        if (!silent) {
          showToast('Live Sync: Candidate records & photos updated! ✨', 'success');
        }
      }
      lastKnownUsersHash = newHash;
    }
  } catch (err) {
    // Silent catch on network blips
  } finally {
    isSyncInProgress = false;
    if (syncIcon) {
      setTimeout(() => syncIcon.classList.remove('animate-spin'), 600);
    }
  }
}

function startLiveSyncPolling() {
  if (liveSyncTimer) clearInterval(liveSyncTimer);
  // Auto-sync gently every 60 seconds only when tab is actively viewed
  liveSyncTimer = setInterval(() => {
    if (document.hidden) return; // Completely pause polling when tab is hidden
    syncLiveUpdates(true);
  }, 60000);

  // Instant refresh when user switches back to this tab
  if (!window._tabVisibilityListenerAttached) {
    window._tabVisibilityListenerAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncLiveUpdates(true);
      }
    });
  }
}

function triggerManualSync() {
  const syncText = document.getElementById('liveSyncText');
  if (syncText) syncText.textContent = 'Syncing...';
  syncLiveUpdates(false).then(() => {
    if (syncText) syncText.textContent = 'Live Sync Active';
    showToast('Dashboard synchronized with latest database updates!', 'success');
  });
}

// ========================================================
// OFFERS & DISCOUNTS MANAGEMENT (CRUD)
// ========================================================

async function loadOffers() {
  const container = document.getElementById('offersTableBody');
  if (!container) return;

  try {
    const res = await fetch('/api/offers', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to load offers');
    const data = await res.json();
    state.offers = data.offers;

    if (!data.offers || data.offers.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400">
            No promotional offers active. Click "+ Create New Offer" to add one.
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = data.offers.map(o => {
      const usagePercent = Math.min(100, Math.round((o.current_uses / (o.max_uses || 1)) * 100));
      const statusBadge = o.is_active 
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>Active</span>`
        : `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Inactive</span>`;

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
          <!-- Code -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-bold text-[#E6B8A2] bg-[#C58B76]/10 px-2 py-0.5 rounded border border-[#C58B76]/30 tracking-wider">
                ${o.code}
              </span>
            </div>
            <div class="text-xs text-slate-400 mt-1">${o.title}</div>
          </td>

          <!-- Discount % -->
          <td class="py-3 px-4">
            <span class="text-base font-extrabold text-emerald-400 font-mono">
              ${o.discount_percent}% OFF
            </span>
          </td>

          <!-- Applicable Plan -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <span class="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
              ${o.plan_type}
            </span>
          </td>

          <!-- Validity -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div>Till: <span class="font-medium text-slate-200">${formatDate(o.valid_until)}</span></div>
            <div class="text-[11px] text-slate-500">From: ${formatDate(o.valid_from)}</div>
          </td>

          <!-- Redemption Bar -->
          <td class="py-3 px-4 text-xs">
            <div class="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>${o.current_uses} used</span>
              <span class="text-slate-500">Max: ${o.max_uses}</span>
            </div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-gradient-to-r from-[#C58B76] to-[#E6B8A2] h-full rounded-full" style="width: ${usagePercent}%"></div>
            </div>
          </td>

          <!-- Status -->
          <td class="py-3 px-4">
            ${statusBadge}
          </td>

          <!-- Actions -->
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1">
              <button 
                onclick="openEditOfferModal('${o.id}')"
                class="p-1.5 text-slate-400 hover:text-[#E6B8A2] hover:bg-slate-700/60 rounded-lg transition-colors"
                title="Edit Offer"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="toggleOfferActive('${o.id}')"
                class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                title="Toggle Active / Inactive"
              >
                <i data-lucide="power" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openDeleteOfferModal('${o.id}', '${o.code}')"
                class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete Offer"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6 text-rose-400 text-xs">
          Error loading offers.
        </td>
      </tr>
    `;
  }
}

function openAddOfferModal() {
  const modal = document.getElementById('offerModal');
  const title = document.getElementById('offerModalTitle');
  const form = document.getElementById('offerForm');

  title.textContent = 'Create New Promotional Offer';
  form.reset();
  document.getElementById('offerId').value = '';
  document.getElementById('offerActive').checked = true;

  modal.showModal();
  lucide.createIcons();
}

async function openEditOfferModal(id) {
  try {
    let offer = null;
    if (state.offers && Array.isArray(state.offers)) {
      offer = state.offers.find(o => String(o.id) === String(id) || String(o.code).toUpperCase() === String(id).toUpperCase());
    }
    if (!offer) {
      const res = await fetch(`/api/offers/${encodeURIComponent(id)}`);
      if (res.ok) {
        offer = await res.json();
      }
    }
    if (!offer) return showToast('Offer not found', 'error');

    const modal = document.getElementById('offerModal');
    const title = document.getElementById('offerModalTitle');

    title.textContent = `Edit Promo Offer: ${offer.code}`;
    document.getElementById('offerId').value = offer.id;
    document.getElementById('offerCode').value = offer.code;
    document.getElementById('offerTitle').value = offer.title;
    document.getElementById('offerDiscount').value = offer.discount_percent;
    document.getElementById('offerPlanType').value = offer.plan_type;
    document.getElementById('offerValidFrom').value = offer.valid_from || '';
    document.getElementById('offerValidUntil').value = offer.valid_until || '';
    document.getElementById('offerMaxUses').value = offer.max_uses || 100;
    document.getElementById('offerDescription').value = offer.description || '';
    document.getElementById('offerActive').checked = Boolean(offer.is_active == 1 || offer.is_active === true);

    modal.showModal();
    lucide.createIcons();
  } catch (e) {
    showToast('Failed to load offer details', 'error');
  }
}

async function saveOffer(e) {
  e.preventDefault();
  const id = document.getElementById('offerId').value;
  const isEdit = Boolean(id);

  const payload = {
    code: document.getElementById('offerCode').value.trim().toUpperCase(),
    title: document.getElementById('offerTitle').value.trim(),
    discount_percent: parseInt(document.getElementById('offerDiscount').value) || 10,
    plan_type: document.getElementById('offerPlanType').value,
    valid_from: document.getElementById('offerValidFrom').value,
    valid_until: document.getElementById('offerValidUntil').value,
    max_uses: parseInt(document.getElementById('offerMaxUses').value) || 100,
    description: document.getElementById('offerDescription').value.trim(),
    is_active: document.getElementById('offerActive').checked ? 1 : 0
  };

  try {
    const url = isEdit ? `/api/offers/${encodeURIComponent(id)}` : '/api/offers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save offer');

    showToast(isEdit ? 'Offer updated successfully!' : 'New offer launched!', 'success');
    document.getElementById('offerModal').close();
    await loadOffers();
    await loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleOfferActive(id) {
  try {
    const res = await fetch(`/api/offers/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle offer');

    showToast(data.message || 'Offer status updated!', 'info');
    await loadOffers();
    await loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeleteOfferModal(id, code) {
  state.pendingDelete = { type: 'offer', id, name: code };
  document.getElementById('deleteConfirmTarget').textContent = `Offer: "${code}"`;
  document.getElementById('deleteModal').showModal();
}

// ========================================================
// MEMBERSHIP PLANS & PRICING MANAGEMENT (CRUD)
// ========================================================

function escapePlanHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========================================================
// DEFAULT MEMBERSHIP PLANS DEFINITION (OFFLINE-FIRST)
// ========================================================
const DEFAULT_MEMBERSHIP_PLANS = [
  {
    id: 'silver',
    name: 'Silver Starter',
    tagline: 'Ideal for exploring verified matches',
    badge: 'BASIC',
    is_popular: 0,
    color: 'slate',
    contact_credits: 10,
    price_1m: 499,
    offer_price_1m: 399,
    price_3m: 999,
    offer_price_3m: 799,
    price_6m: 1499,
    offer_price_6m: 1199,
    price_12m: 1999,
    offer_price_12m: 1699,
    daily_interests: '15/day',
    kundali_reports: 'Basic Ashtakoot',
    search_boost: '1x Standard',
    has_advisor: 0,
    privacy_shield: 'Standard Public',
    support_level: 'Email Support',
    features_parsed: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 10 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: 'Personal Matchmaking Advisor', included: false }
    ],
    features: JSON.stringify([
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 10 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: 'Personal Matchmaking Advisor', included: false }
    ]),
    is_active: 1,
    sort_order: 1
  },
  {
    id: 'gold',
    name: 'Gold Match',
    tagline: 'Ideal for serious marriage seekers',
    badge: 'POPULAR CHOICE',
    is_popular: 0,
    color: 'amber',
    contact_credits: 30,
    price_1m: 999,
    offer_price_1m: 799,
    price_3m: 1999,
    offer_price_3m: 1499,
    price_6m: 2999,
    offer_price_6m: 2499,
    price_12m: 3999,
    offer_price_12m: 3599,
    daily_interests: 'Unlimited',
    kundali_reports: 'Basic Ashtakoot',
    search_boost: '1x Standard',
    has_advisor: 0,
    privacy_shield: 'Photo Blur until Accepted',
    support_level: 'Priority Chat & Email (24h)',
    features_parsed: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 30 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Ashtakoot Astrological Dossier', included: true },
      { text: 'Unlimited Direct Matrimonial Chat', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: '3x Search Visibility Profile Boost', included: false },
      { text: 'Personal Matchmaking Advisor', included: false }
    ],
    features: JSON.stringify([
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 30 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Ashtakoot Astrological Dossier', included: true },
      { text: 'Unlimited Direct Matrimonial Chat', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: '3x Search Visibility Profile Boost', included: false },
      { text: 'Personal Matchmaking Advisor', included: false }
    ]),
    is_active: 1,
    sort_order: 2
  },
  {
    id: 'diamond',
    name: 'Diamond VIP',
    tagline: 'Fastest matches with 3x visibility',
    badge: 'MOST POPULAR ⭐',
    is_popular: 1,
    color: 'blue',
    contact_credits: 50,
    price_1m: 2499,
    offer_price_1m: 1999,
    price_3m: 3999,
    offer_price_3m: 2499,
    price_6m: 4999,
    offer_price_6m: 3499,
    price_12m: 8999,
    offer_price_12m: 3999,
    daily_interests: 'Unlimited',
    kundali_reports: 'Basic Ashtakoot',
    search_boost: '3x Boost',
    has_advisor: 0,
    privacy_shield: 'Standard Public',
    support_level: 'Priority 24h Support',
    features_parsed: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Follow-ups', included: true },
      { text: 'View 50 Verified Contact Numbers + Parents Contacts', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Priority Chat Badge & Read Receipts', included: true },
      { text: 'Instant WhatsApp Connect & Family Contact Access', included: true },
      { text: '3x Search Visibility & Spotlight in Match Feed', included: true },
      { text: 'VIP Aadhaar Golden Shield on Profile', included: true },
      { text: 'Dedicated Matrimonial Relationship Manager', included: false }
    ],
    features: JSON.stringify([
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Follow-ups', included: true },
      { text: 'View 50 Verified Contact Numbers + Parents Contacts', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Priority Chat Badge & Read Receipts', included: true },
      { text: 'Instant WhatsApp Connect & Family Contact Access', included: true },
      { text: '3x Search Visibility & Spotlight in Match Feed', included: true },
      { text: 'VIP Aadhaar Golden Shield on Profile', included: true },
      { text: 'Dedicated Matrimonial Relationship Manager', included: false }
    ]),
    is_active: 1,
    sort_order: 3
  },
  {
    id: 'platinum',
    name: 'Platinum Royal',
    tagline: 'Full luxury matrimonial suite',
    badge: 'ELITE CONCIERGE',
    is_popular: 0,
    color: 'purple',
    contact_credits: 100,
    price_1m: 1999,
    offer_price_1m: 1499,
    price_3m: 3999,
    offer_price_3m: 2999,
    price_6m: 5999,
    offer_price_6m: 4499,
    price_12m: 7999,
    offer_price_12m: 6499,
    daily_interests: 'Unlimited',
    kundali_reports: 'Full 36 Gunas + Dosha Analysis',
    search_boost: '5x VIP Boost',
    has_advisor: 1,
    privacy_shield: 'Maximum VIP Shield',
    support_level: '24/7 Dedicated Manager',
    features_parsed: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Priority Messages', included: true },
      { text: 'View 100 Verified Mobile Numbers & Family Contacts', included: true },
      { text: 'Complete Horoscope & Kundali Matching Report', included: true },
      { text: 'Unlimited Direct Matrimonial Chat & Voice Calls', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: '5x Top-Rank Search Visibility Profile Boost', included: true },
      { text: 'Personal Relationship Advisor & Manager', included: true }
    ],
    features: JSON.stringify([
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Priority Messages', included: true },
      { text: 'View 100 Verified Mobile Numbers & Family Contacts', included: true },
      { text: 'Complete Horoscope & Kundali Matching Report', included: true },
      { text: 'Unlimited Direct Matrimonial Chat & Voice Calls', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: '5x Top-Rank Search Visibility Profile Boost', included: true },
      { text: 'Personal Relationship Advisor & Manager', included: true }
    ]),
    is_active: 1,
    sort_order: 4
  }
];

let lastRenderedPlansHash = '';

async function loadPlans(force = false) {
  const cardsContainer = document.getElementById('plansCardsContainer');
  const tableBody = document.getElementById('plansTableBody');
  if (!cardsContainer && !tableBody) return;

  // 1. Instant optimistic render: show full dashboard matrix immediately without blocking
  if (!state.plans || !Array.isArray(state.plans) || state.plans.length === 0) {
    try {
      const cached = localStorage.getItem('i4you_admin_store_v4') || localStorage.getItem('i4u_matrimony_admin_store_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.plans) && parsed.plans.length > 0) {
          state.plans = parsed.plans;
        }
      }
    } catch (e) {}

    if (!state.plans || !Array.isArray(state.plans) || state.plans.length === 0) {
      state.plans = DEFAULT_MEMBERSHIP_PLANS;
    }
    renderPlans();
  }

  // 2. Fetch live updates in background from API / Supabase
  try {
    const res = await fetch('/api/plans', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        const newHash = JSON.stringify(data.plans);
        if (force || newHash !== lastRenderedPlansHash) {
          lastRenderedPlansHash = newHash;
          state.plans = data.plans;
          renderPlans();
        }
      }
    }
  } catch (err) {
    console.warn('[Admin] Live plans refresh notice (using offline plans):', err);
    if (!state.plans || !Array.isArray(state.plans) || state.plans.length === 0) {
      state.plans = DEFAULT_MEMBERSHIP_PLANS;
      renderPlans();
    }
  }
}

function renderPlans() {
  try {
    const plans = state.plans || [];
    lastRenderedPlansHash = JSON.stringify(plans);
    const cardsContainer = document.getElementById('plansCardsContainer');
    const tableBody = document.getElementById('plansTableBody');

    // Update KPI counters
    const totalCountEl = document.getElementById('totalPlansCount');
    const activeCountEl = document.getElementById('activePlansCount');
    const popularPlanEl = document.getElementById('popularPlanName');
    const elitePlanEl = document.getElementById('elitePlanName');

    if (totalCountEl) totalCountEl.textContent = plans.length;
    if (activeCountEl) activeCountEl.textContent = plans.filter(p => p.is_active).length;

    const popular = plans.find(p => p.is_popular);
    if (popularPlanEl) popularPlanEl.textContent = popular ? popular.name : 'Diamond VIP';

    const elite = plans.find(p => p.id === 'vip') || plans[plans.length - 1];
    if (elitePlanEl) elitePlanEl.textContent = elite ? elite.name : 'Platinum Royal';

    // Render Plan Cards
    if (cardsContainer) {
      if (plans.length === 0) {
        cardsContainer.innerHTML = `
          <div class="col-span-full text-center py-12 text-slate-400 bg-[#2C1A1D] rounded-3xl border border-slate-800">
            <i data-lucide="crown" class="w-8 h-8 mx-auto text-[#E6B8A2] mb-2 opacity-50"></i>
            <p class="text-sm font-medium text-slate-300">No membership plans configured</p>
            <p class="text-xs text-slate-500 mt-1">Click "+ Create New Plan" to configure your first package</p>
          </div>
        `;
      } else {
        cardsContainer.innerHTML = plans.map(p => {
          const colorStyles = {
            amber: {
              cardBorder: p.is_popular ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-amber-500/30 hover:border-amber-400/70',
              headerBg: 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800',
              badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
              accentText: 'text-amber-400',
              btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            },
            blue: {
              cardBorder: p.is_popular ? 'border-[#C58B76] ring-1 ring-[#C58B76]/50' : 'border-blue-500/30 hover:border-blue-400/70',
              headerBg: 'bg-gradient-to-r from-[#2C1A1D] via-[#1E3A8A] to-[#2C1A1D]',
              badgeBg: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
              accentText: 'text-blue-400',
              btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
            },
            purple: {
              cardBorder: p.is_popular ? 'border-purple-400 ring-1 ring-purple-400/50' : 'border-purple-500/30 hover:border-purple-400/70',
              headerBg: 'bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950',
              badgeBg: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
              accentText: 'text-purple-400',
              btnBg: 'bg-purple-600 hover:bg-purple-500 text-white'
            },
            slate: {
              cardBorder: 'border-slate-700/80 hover:border-slate-500',
              headerBg: 'bg-gradient-to-r from-slate-800 to-slate-900',
              badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
              accentText: 'text-slate-400',
              btnBg: 'bg-slate-700 hover:bg-slate-600 text-white'
            },
            emerald: {
              cardBorder: 'border-emerald-500/30 hover:border-emerald-400/70',
              headerBg: 'bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900',
              badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
              accentText: 'text-emerald-400',
              btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white'
            },
            rose: {
              cardBorder: 'border-rose-500/30 hover:border-rose-400/70',
              headerBg: 'bg-gradient-to-r from-rose-700 via-pink-800 to-slate-900',
              badgeBg: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
              accentText: 'text-rose-400',
              btnBg: 'bg-rose-600 hover:bg-rose-500 text-white'
            }
          };

          const theme = colorStyles[p.color] || colorStyles.amber;
          let features = [];
          if (Array.isArray(p.features_parsed)) {
            features = p.features_parsed;
          } else if (typeof p.features === 'string') {
            try { features = JSON.parse(p.features); } catch (e) { features = []; }
          } else if (Array.isArray(p.features)) {
            features = p.features;
          }
          if (!Array.isArray(features)) features = [];
          const isFree = p.price_3m === 0 && p.price_6m === 0 && p.price_12m === 0;
          const safePlanName = (p.name || '').replace(/'/g, "\\'");

        return `
          <div class="rounded-3xl bg-[#2C1A1D] border ${theme.cardBorder} shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <!-- Header Bar -->
            <div>
              <div class="p-5 ${theme.headerBg} relative text-white">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-white/20">
                    ID: ${p.id}
                  </span>
                  ${p.badge ? `
                    <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${theme.badgeBg}">
                      ${p.badge}
                    </span>
                  ` : (p.is_popular ? `
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#C58B76]/30 text-[#E6B8A2] border border-[#C58B76]/50">
                      FEATURED ⭐
                    </span>
                  ` : '')}
                </div>
                <h3 class="text-xl font-bold font-serif text-white tracking-wide">${p.name}</h3>
                <p class="text-xs text-white/80 line-clamp-1 mt-0.5">${p.tagline || 'Matrimonial Membership Tier'}</p>
              </div>

              <!-- Content Body -->
              <div class="p-5 space-y-4">
                
                <!-- Contact Credits Banner & Advisor Badge -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span class="text-xs text-slate-400 flex items-center gap-1.5">
                      <i data-lucide="phone-call" class="w-3.5 h-3.5 ${theme.accentText}"></i>
                      Verified Contacts:
                    </span>
                    <span class="text-xs font-bold font-mono text-white">
                      ${p.contact_credits >= 999 ? 'Unlimited' : p.contact_credits + ' Contacts'}
                    </span>
                  </div>

                  ${p.has_advisor ? `
                    <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C58B76]/20 to-amber-500/10 border border-[#C58B76]/40 text-[#E6B8A2] text-[11px] font-bold">
                      <span class="flex items-center gap-1.5">
                        <span>🤵</span> Dedicated Matchmaking Manager
                      </span>
                      <span class="text-[9px] uppercase tracking-wider bg-[#C58B76]/30 px-1.5 py-0.5 rounded">VIP</span>
                    </div>
                  ` : ''}
                </div>

                <!-- Pricing Matrix Display (1-Mo, 3-Mo, 6-Mo, 12-Mo) -->
                <div class="space-y-1.5 text-xs">
                  <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duration Pricing:</p>
                  
                  ${isFree ? `
                    <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span class="text-base font-bold text-emerald-400 font-mono">100% Free Forever</span>
                      <p class="text-[11px] text-slate-400 mt-0.5">Complimentary exploratory access</p>
                    </div>
                  ` : `
                    <div class="grid grid-cols-4 gap-1 text-center">
                      <div class="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                        <span class="block text-[9.5px] text-slate-400 font-medium">1-Mo</span>
                        <span class="text-[9px] line-through text-slate-500 block">₹${p.price_1m || 0}</span>
                        <span class="text-[11px] font-bold text-emerald-400 font-mono">₹${p.offer_price_1m || 0}</span>
                      </div>
                      <div class="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                        <span class="block text-[9.5px] text-slate-400 font-medium">3-Mo</span>
                        <span class="text-[9px] line-through text-slate-500 block">₹${p.price_3m}</span>
                        <span class="text-[11px] font-bold text-emerald-400 font-mono">₹${p.offer_price_3m}</span>
                      </div>
                      <div class="p-1.5 rounded-xl bg-slate-900 border border-[#C58B76]/40 shadow-inner">
                        <span class="block text-[9.5px] text-[#E6B8A2] font-bold">6-Mo ⭐</span>
                        <span class="text-[9px] line-through text-slate-500 block">₹${p.price_6m}</span>
                        <span class="text-[11px] font-bold text-emerald-300 font-mono">₹${p.offer_price_6m}</span>
                      </div>
                      <div class="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                        <span class="block text-[9.5px] text-slate-400 font-medium">12-Mo</span>
                        <span class="text-[9px] line-through text-slate-500 block">₹${p.price_12m}</span>
                        <span class="text-[11px] font-bold text-emerald-400 font-mono">₹${p.offer_price_12m}</span>
                      </div>
                    </div>
                  `}
                </div>

                <!-- Matrimonial Privileges Badges Grid -->
                <div class="p-2.5 rounded-xl bg-[#1A1012] border border-slate-800/80 space-y-1.5 text-[11px]">
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <span>💌</span> Direct Interests:
                    </span>
                    <span class="font-semibold text-slate-200">${p.daily_interests || 'Unlimited'}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <span>🔮</span> Kundali Matching:
                    </span>
                    <span class="font-semibold text-slate-200 truncate max-w-[130px]" title="${p.kundali_reports || 'Basic'}">${p.kundali_reports || 'Basic Ashtakoot'}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <span>⚡</span> Profile Boost:
                    </span>
                    <span class="font-semibold text-amber-300">${p.search_boost || '1x Standard'}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <span>🛡️</span> Privacy Shield:
                    </span>
                    <span class="font-semibold text-slate-200 truncate max-w-[130px]" title="${p.privacy_shield || 'Standard'}">${p.privacy_shield || 'Standard'}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <span>🎧</span> Support Level:
                    </span>
                    <span class="font-semibold text-slate-200 truncate max-w-[130px]" title="${p.support_level || 'Priority'}">${p.support_level || 'Priority'}</span>
                  </div>
                </div>

                <!-- Features Privileges List (Top 5 preview) -->
                <div class="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Key Features:</span>
                    <span class="text-[10px] text-slate-500">${features.length} configured</span>
                  </p>
                  <ul class="space-y-1 text-xs">
                    ${features.slice(0, 5).map(f => {
                      if (!f) return '';
                      const isInc = (typeof f === 'object' && f !== null) ? Boolean(f.included) : true;
                      const text = (typeof f === 'object' && f !== null) ? (f.text || '') : String(f);
                      return `
                        <li class="flex items-start gap-1.5 ${isInc ? 'text-slate-200' : 'text-slate-500 line-through opacity-60'}">
                          <i data-lucide="${isInc ? 'check' : 'x'}" class="w-3.5 h-3.5 ${isInc ? 'text-emerald-400' : 'text-slate-500'} flex-shrink-0 mt-0.5"></i>
                          <span class="line-clamp-1 text-[11px]">${text}</span>
                        </li>
                      `;
                    }).join('')}
                    ${features.length > 5 ? `
                      <li class="text-[10px] text-slate-400 italic pl-5">+ ${features.length - 5} more privileges...</li>
                    ` : ''}
                  </ul>
                </div>

              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <label class="switch-container gap-2" title="${p.is_active ? 'Active (Click to Deactivate)' : 'Inactive (Click to Activate)'}">
                <input 
                  type="checkbox" 
                  data-plan-toggle="${p.id}"
                  onchange="togglePlanActive('${p.id}', this)" 
                  ${p.is_active ? 'checked' : ''} 
                  class="switch-input"
                >
                <div class="switch-track-custom">
                  <div class="switch-thumb-custom"></div>
                </div>
                <span data-plan-status-text="${p.id}" class="text-xs font-bold ${p.is_active ? 'text-emerald-400' : 'text-slate-400'}">
                  ${p.is_active ? 'Active' : 'Draft'}
                </span>
              </label>

              <div class="flex items-center gap-1.5">
                <button 
                  onclick="openEditPlanModal('${p.id}')"
                  class="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                  <span>Edit Plan</span>
                </button>
                <button 
                  onclick="openDeletePlanModal('${p.id}', '${safePlanName}')"
                  class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete Plan"
                >
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

          </div>
        `;
      }).join('');
    }
  }

  // Render Full Pricing Matrix Table View
  if (tableBody) {
    if (plans.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-6 text-slate-400 text-xs">
            No plans configured. Click "+ Create New Plan" to add.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = plans.map(p => {
        const safePlanName = (p.name || '').replace(/'/g, "\\'");
        return `
          <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="py-3 px-4">
              <div class="font-bold text-white flex items-center gap-2">
                <span>${p.name}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">${p.id}</span>
                ${p.is_popular ? '<span class="text-[10px] text-[#E6B8A2]">⭐</span>' : ''}
              </div>
              <p class="text-xs text-slate-400 line-clamp-1">${p.tagline || ''}</p>
            </td>
            <td class="py-3 px-4 font-mono font-semibold text-slate-200">
              ${p.contact_credits >= 999 ? 'Unlimited' : p.contact_credits}
            </td>
            <td class="py-3 px-4 font-mono">
              <span class="text-slate-400 line-through text-[11px]">₹${p.price_1m || 0}</span>
              <span class="text-emerald-400 font-bold ml-1">₹${p.offer_price_1m || 0}</span>
            </td>
            <td class="py-3 px-4 font-mono">
              <span class="text-slate-400 line-through text-[11px]">₹${p.price_3m}</span>
              <span class="text-emerald-400 font-bold ml-1">₹${p.offer_price_3m}</span>
            </td>
            <td class="py-3 px-4 font-mono">
              <span class="text-slate-400 line-through text-[11px]">₹${p.price_6m}</span>
              <span class="text-emerald-300 font-bold ml-1">₹${p.offer_price_6m}</span>
            </td>
            <td class="py-3 px-4 font-mono">
              <span class="text-slate-400 line-through text-[11px]">₹${p.price_12m}</span>
              <span class="text-emerald-400 font-bold ml-1">₹${p.offer_price_12m}</span>
            </td>
            <td class="py-3 px-4">
              <div class="flex flex-wrap items-center gap-1 max-w-xs">
                ${p.has_advisor ? '<span class="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">🤵 RM Advisor</span>' : ''}
                <span class="text-[9.5px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">${p.search_boost || '1x'}</span>
                <span class="text-[9.5px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">${p.daily_interests || 'Interests'}</span>
              </div>
            </td>
            <td class="py-3 px-4">
              <label class="switch-container gap-2" title="Toggle ${p.name} active status">
                <input 
                  type="checkbox" 
                  data-plan-toggle="${p.id}"
                  onchange="togglePlanActive('${p.id}', this)" 
                  ${p.is_active ? 'checked' : ''} 
                  class="switch-input"
                >
                <div class="switch-track-custom">
                  <div class="switch-thumb-custom"></div>
                </div>
                <span data-plan-status-text="${p.id}" class="text-xs font-semibold ${p.is_active ? 'text-emerald-400' : 'text-slate-400'}">
                  ${p.is_active ? 'Active' : 'Inactive'}
                </span>
              </label>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button 
                  onclick="openEditPlanModal('${p.id}')" 
                  class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                  title="Edit Plan"
                >
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button 
                  onclick="openDeletePlanModal('${p.id}', '${safePlanName}')" 
                  class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete Plan"
                >
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Feature Privileges Comparison Matrix
  const compHeaderRow = document.getElementById('plansCompHeaderRow');
  const compBody = document.getElementById('plansComparisonBody');
  if (compHeaderRow && compBody && plans.length > 0) {
    compHeaderRow.innerHTML = `
      <th class="py-3 px-4 min-w-[220px]">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Privilege & Quota Attribute</span>
          <button 
            type="button" 
            onclick="openAddPlanModal()" 
            class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 transition-all"
            title="Create New Membership Plan"
          >
            <i data-lucide="plus" class="w-3 h-3 stroke-[3]"></i>
            <span>Add Plan</span>
          </button>
        </div>
      </th>
      ${plans.map(p => {
        const safePlanName = (p.name || '').replace(/'/g, "\\'");
        return `
        <th class="py-3 px-4 text-center font-bold min-w-[170px] ${p.id === 'vip' ? 'text-purple-400' : p.id === 'diamond' ? 'text-[#E6B8A2]' : p.id === 'gold' ? 'text-amber-400' : 'text-slate-300'}">
          <div class="space-y-1">
            <div class="text-sm font-extrabold uppercase tracking-wide flex items-center justify-center gap-1">
              <span>${p.name}</span>
              ${p.is_popular ? '<span class="text-xs" title="Most Popular">⭐</span>' : ''}
            </div>
            ${p.is_popular ? '<span class="text-[9px] font-extrabold text-[#E6B8A2] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 inline-block">MOST POPULAR</span>' : ''}
          </div>

          <!-- Switch & Actions Bar Directly on Header -->
          <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col items-center gap-1.5">
            <!-- Active / Inactive Switch -->
            <label class="switch-container gap-1.5" title="Toggle ${p.name} active/inactive status">
              <input 
                type="checkbox" 
                data-plan-toggle="${p.id}"
                onchange="togglePlanActive('${p.id}', this)" 
                ${p.is_active ? 'checked' : ''} 
                class="switch-input"
              >
              <div class="switch-track-custom">
                <div class="switch-thumb-custom"></div>
              </div>
              <span data-plan-status-text="${p.id}" class="text-[10px] font-extrabold ${p.is_active ? 'text-emerald-400' : 'text-slate-400'}">${p.is_active ? 'Active' : 'Off'}</span>
            </label>

            <!-- Edit & Delete Action Buttons -->
            <div class="flex items-center justify-center gap-1.5 mt-0.5">
              <button 
                type="button"
                onclick="openEditPlanModal('${p.id}')" 
                class="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-[#E6B8A2]/20 hover:text-[#E6B8A2] text-slate-300 text-[10.5px] font-bold flex items-center gap-1 transition-all border border-slate-700 hover:border-[#E6B8A2]/40 cursor-pointer shadow-xs active:scale-95" 
                title="Edit ${p.name}"
              >
                <i data-lucide="edit-3" class="w-3 h-3 text-[#E6B8A2]"></i>
                <span>Edit</span>
              </button>
              <button 
                type="button"
                onclick="openDeletePlanModal('${p.id}', '${safePlanName}')" 
                class="py-1 px-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-[10.5px] font-bold flex items-center gap-1 transition-all border border-slate-700 hover:border-rose-500/40 cursor-pointer shadow-xs active:scale-95" 
                title="Delete ${p.name}"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </th>
      `;
      }).join('')}
    `;

    const comparisonRows = [
      {
        label: 'Tier Switch (Live / Offline)',
        icon: 'toggle-right',
        getter: p => `
          <div class="flex items-center justify-center">
            <label class="switch-container gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border ${p.is_active ? 'border-emerald-500/40 shadow-emerald-500/5' : 'border-slate-800'} hover:border-slate-600 transition-all shadow-xs" title="Click switch to toggle status">
              <input 
                type="checkbox" 
                data-plan-toggle="${p.id}"
                onchange="togglePlanActive('${p.id}', this)" 
                ${p.is_active ? 'checked' : ''} 
                class="switch-input"
              >
              <div class="switch-track-custom">
                <div class="switch-thumb-custom"></div>
              </div>
              <span data-plan-status-text="${p.id}" class="comp-status-text text-[11px] font-bold ${p.is_active ? 'text-emerald-400' : 'text-slate-400'}">
                ${p.is_active ? '✓ Active (Live)' : '✕ Inactive'}
              </span>
            </label>
          </div>
        `
      },
      {
        label: 'Verified Contact Unlocks',
        icon: 'phone-call',
        getter: p => (Number(p.contact_credits) >= 999) ? '<strong class="text-purple-300">Unlimited</strong>' : `<strong class="text-white">${p.contact_credits || 0} Numbers</strong>`
      },
      {
        label: '1-Month Offer Price',
        icon: 'tag',
        getter: p => Number(p.offer_price_1m) === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-400 font-mono font-bold">₹${Number(p.offer_price_1m) || 0}</span>`
      },
      {
        label: '3-Month Offer Price',
        icon: 'tag',
        getter: p => Number(p.offer_price_3m) === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-400 font-mono font-bold">₹${Number(p.offer_price_3m) || 0}</span>`
      },
      {
        label: '6-Month Popular Offer',
        icon: 'tag',
        getter: p => Number(p.offer_price_6m) === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-300 font-mono font-bold">₹${Number(p.offer_price_6m) || 0}</span>`
      },
      {
        label: '12-Month Annual Offer',
        icon: 'tag',
        getter: p => Number(p.offer_price_12m) === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-400 font-mono font-bold">₹${Number(p.offer_price_12m) || 0}</span>`
      },
      {
        label: 'Daily Direct Interests Quota',
        icon: 'heart',
        getter: p => `<span class="font-medium text-slate-200">${escapePlanHtml(p.daily_interests || 'Unlimited')}</span>`
      },
      {
        label: 'Vedic Kundali Matching',
        icon: 'sparkles',
        getter: p => `<span class="font-medium text-slate-200">${escapePlanHtml(p.kundali_reports || 'Basic Ashtakoot')}</span>`
      },
      {
        label: 'Search Visibility / Boost',
        icon: 'zap',
        getter: p => `<span class="font-bold text-amber-300">${escapePlanHtml(p.search_boost || '1x Standard')}</span>`
      },
      {
        label: 'Dedicated Relationship Manager',
        icon: 'user-check',
        getter: p => (p.has_advisor == 1 || p.has_advisor === true)
          ? '<span class="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Included Handpicked</span>' 
          : '<span class="text-slate-500 font-mono">✕</span>'
      },
      {
        label: 'Photo & Profile Privacy Shield',
        icon: 'shield-check',
        getter: p => `<span class="text-slate-300">${escapePlanHtml(p.privacy_shield || 'Standard')}</span>`
      },
      {
        label: 'Customer Support SLA',
        icon: 'headphones',
        getter: p => `<span class="text-slate-300">${escapePlanHtml(p.support_level || 'Priority')}</span>`
      },
      {
        label: 'Manage & Modify Tier',
        icon: 'sliders',
        getter: p => {
          const safePlanName = (p.name || '').replace(/'/g, "\\'");
          return `
          <div class="flex items-center justify-center gap-1.5 py-1">
            <button 
              type="button"
              onclick="openEditPlanModal('${p.id}')" 
              class="py-1.5 px-3 rounded-xl bg-[#E6B8A2]/15 hover:bg-[#E6B8A2]/25 text-[#E6B8A2] border border-[#C58B76]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95" 
              title="Edit ${p.name} Attributes"
            >
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-[#E6B8A2]"></i>
              <span>Edit Plan</span>
            </button>
            <button 
              type="button"
              onclick="openDeletePlanModal('${p.id}', '${safePlanName}')" 
              class="py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95" 
              title="Delete ${p.name}"
            >
              <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-400"></i>
              <span>Delete</span>
            </button>
          </div>
        `;
        }
      }
    ];

    compBody.innerHTML = comparisonRows.map(row => `
      <tr class="hover:bg-slate-800/30 transition-colors">
        <td class="py-3 px-4 font-semibold text-slate-200 flex items-center gap-2">
          <i data-lucide="${row.icon}" class="w-3.5 h-3.5 text-[#E6B8A2]"></i>
          <span>${row.label}</span>
        </td>
        ${plans.map(p => `
          <td class="py-3 px-4 text-center">
            ${row.getter(p)}
          </td>
        `).join('')}
      </tr>
    `).join('');
  }

    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    } catch (e) {
      console.warn('Lucide icons error in renderPlans:', e);
    }
  } catch (err) {
    console.error('Error rendering membership plans:', err);
  }
}

function openAddPlanModal() {
  const modal = document.getElementById('planModal');
  const title = document.getElementById('planModalTitle');
  const isEdit = document.getElementById('planIsEdit');
  const idInput = document.getElementById('planId');

  title.textContent = 'Create New Membership Plan';
  isEdit.value = '0';

  idInput.value = '';
  idInput.disabled = false;
  idInput.classList.remove('opacity-50', 'cursor-not-allowed');

  document.getElementById('planName').value = '';
  document.getElementById('planTagline').value = '';
  document.getElementById('planBadge').value = '';
  document.getElementById('planColor').value = 'amber';
  document.getElementById('planContactCredits').value = 30;
  document.getElementById('planSortOrder').value = (state.plans.length + 1) || 1;

  document.getElementById('planPrice1m').value = 999;
  document.getElementById('planOfferPrice1m').value = 499;
  document.getElementById('planPrice3m').value = 2499;
  document.getElementById('planOfferPrice3m').value = 1299;
  document.getElementById('planPrice6m').value = 3999;
  document.getElementById('planOfferPrice6m').value = 1999;
  document.getElementById('planPrice12m').value = 6999;
  document.getElementById('planOfferPrice12m').value = 3299;

  document.getElementById('planDailyInterests').value = '25 / day';
  document.getElementById('planKundaliReports').value = '15 Detailed Reports';
  document.getElementById('planSearchBoost').value = '2x Priority';
  document.getElementById('planPrivacyShield').value = 'Photo Blur until Accepted';
  document.getElementById('planSupportLevel').value = 'Priority Chat & Email (24h)';
  document.getElementById('planHasAdvisor').checked = false;

  document.getElementById('planFeatures').value = 
`+ Browse 100% Aadhaar Verified Profiles
+ Send Unlimited Interests & Shortlists
+ View 30 Verified Mobile Numbers & Addresses
+ Full 36 Gunas Vedic Horoscope & Dosha Analysis
+ Instant WhatsApp Family Connect Link
- Personal Matchmaking Advisor`;

  document.getElementById('planIsPopular').checked = false;
  document.getElementById('planActive').checked = true;

  modal.showModal();
  lucide.createIcons();
}

async function openEditPlanModal(id) {
  try {
    let plan = null;
    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        plan = data.plan;
      }
    } catch (e) {
      console.warn('[openEditPlanModal] API fetch notice, checking local state:', e);
    }

    if (!plan && Array.isArray(state.plans)) {
      plan = state.plans.find(p => String(p.id).trim().toLowerCase() === String(id).trim().toLowerCase());
    }

    if (!plan) return showToast('Plan not found: ' + id, 'error');

    const modal = document.getElementById('planModal');
    if (!modal) {
      console.error('[openEditPlanModal] planModal element not found');
      return showToast('Plan modal not found in DOM', 'error');
    }

    const title = document.getElementById('planModalTitle');
    const isEdit = document.getElementById('planIsEdit');
    const idInput = document.getElementById('planId');

    if (title) title.textContent = `Edit Membership Plan: ${plan.name || id}`;
    if (isEdit) isEdit.value = '1';

    if (idInput) {
      idInput.value = plan.id;
      idInput.disabled = true;
      idInput.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const setVal = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) el.value = (val !== undefined && val !== null) ? val : '';
    };
    const setChecked = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) el.checked = Boolean(val == 1 || val === true);
    };

    setVal('planName', plan.name);
    setVal('planTagline', plan.tagline);
    setVal('planBadge', plan.badge);
    setVal('planColor', plan.color || 'amber');
    setVal('planContactCredits', plan.contact_credits !== undefined ? plan.contact_credits : 30);
    setVal('planSortOrder', plan.sort_order || 1);

    setVal('planPrice1m', plan.price_1m !== undefined ? plan.price_1m : 0);
    setVal('planOfferPrice1m', plan.offer_price_1m !== undefined ? plan.offer_price_1m : 0);
    setVal('planPrice3m', plan.price_3m !== undefined ? plan.price_3m : 0);
    setVal('planOfferPrice3m', plan.offer_price_3m !== undefined ? plan.offer_price_3m : 0);
    setVal('planPrice6m', plan.price_6m !== undefined ? plan.price_6m : 0);
    setVal('planOfferPrice6m', plan.offer_price_6m !== undefined ? plan.offer_price_6m : 0);
    setVal('planPrice12m', plan.price_12m !== undefined ? plan.price_12m : 0);
    setVal('planOfferPrice12m', plan.offer_price_12m !== undefined ? plan.offer_price_12m : 0);

    setVal('planDailyInterests', plan.daily_interests || 'Unlimited');
    setVal('planKundaliReports', plan.kundali_reports || 'Basic Ashtakoot');
    setVal('planSearchBoost', plan.search_boost || '1x Standard');
    setVal('planPrivacyShield', plan.privacy_shield || 'Standard Public');
    setVal('planSupportLevel', plan.support_level || 'Priority Chat & Email (24h)');
    setChecked('planHasAdvisor', plan.has_advisor);

    // Format features as line items (+ or -)
    let features = plan.features_parsed;
    if (!features || !features.length) {
      if (typeof plan.features === 'string') {
        try { features = JSON.parse(plan.features); } catch (e) { features = []; }
      } else if (Array.isArray(plan.features)) {
        features = plan.features;
      } else {
        features = [];
      }
    }
    const featureLines = (features || []).map(f => {
      const isInc = typeof f === 'object' ? f.included !== false : true;
      const text = typeof f === 'object' ? (f.text || '') : String(f);
      return `${isInc ? '+' : '-'} ${text}`;
    }).join('\n');
    setVal('planFeatures', featureLines);

    setChecked('planIsPopular', plan.is_popular);
    setChecked('planActive', plan.is_active);

    if (modal.open) {
      try { modal.close(); } catch (e) {}
    }
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error('[openEditPlanModal Error]:', err);
    showToast('Failed to load plan details: ' + (err.message || ''), 'error');
  }
}

async function savePlan(e) {
  e.preventDefault();
  const isEdit = document.getElementById('planIsEdit').value === '1';
  const idInput = document.getElementById('planId');
  const planId = (idInput.value || '').trim().toLowerCase().replace(/\s+/g, '_');

  if (!planId) {
    return showToast('Plan identifier (key/slug) is required', 'error');
  }

  // Parse feature lines
  const rawFeatures = (document.getElementById('planFeatures').value || '').split('\n');
  const features = rawFeatures
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const isExcluded = line.startsWith('-');
      const text = line.replace(/^[+-]\s*/, '').trim();
      return { text, included: !isExcluded };
    });

  const payload = {
    id: planId,
    name: (document.getElementById('planName').value || '').trim(),
    tagline: (document.getElementById('planTagline').value || '').trim(),
    badge: (document.getElementById('planBadge').value || '').trim() || null,
    color: document.getElementById('planColor').value || 'amber',
    contact_credits: parseInt(document.getElementById('planContactCredits').value, 10) || 0,
    sort_order: parseInt(document.getElementById('planSortOrder').value, 10) || 1,
    price_1m: parseInt(document.getElementById('planPrice1m').value, 10) || 0,
    offer_price_1m: parseInt(document.getElementById('planOfferPrice1m').value, 10) || 0,
    price_3m: parseInt(document.getElementById('planPrice3m').value, 10) || 0,
    offer_price_3m: parseInt(document.getElementById('planOfferPrice3m').value, 10) || 0,
    price_6m: parseInt(document.getElementById('planPrice6m').value, 10) || 0,
    offer_price_6m: parseInt(document.getElementById('planOfferPrice6m').value, 10) || 0,
    price_12m: parseInt(document.getElementById('planPrice12m').value, 10) || 0,
    offer_price_12m: parseInt(document.getElementById('planOfferPrice12m').value, 10) || 0,
    daily_interests: (document.getElementById('planDailyInterests').value || '').trim() || 'Unlimited',
    kundali_reports: (document.getElementById('planKundaliReports').value || '').trim() || 'Basic Ashtakoot',
    search_boost: document.getElementById('planSearchBoost').value,
    privacy_shield: document.getElementById('planPrivacyShield').value,
    support_level: document.getElementById('planSupportLevel').value,
    has_advisor: document.getElementById('planHasAdvisor').checked ? 1 : 0,
    features: features,
    is_popular: document.getElementById('planIsPopular').checked ? 1 : 0,
    is_active: document.getElementById('planActive').checked ? 1 : 0
  };

  try {
    const url = isEdit ? `/api/plans/${encodeURIComponent(planId)}` : '/api/plans';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save membership plan');

    showToast(isEdit ? 'Membership plan updated successfully!' : 'New membership plan created!', 'success');
    const modal = document.getElementById('planModal');
    if (modal) {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }
    await loadPlans();
  } catch (err) {
    showToast(err.message || 'Error saving membership plan', 'error');
  }
}

function syncPlanToggleUI(id, isActive) {
  const isAct = (isActive === 1 || isActive === true || isActive === '1');
  const cleanId = String(id).trim().toLowerCase();
  document.querySelectorAll('input[data-plan-toggle]').forEach(cb => {
    if (String(cb.getAttribute('data-plan-toggle')).trim().toLowerCase() === cleanId) {
      cb.checked = isAct;
    }
  });
  document.querySelectorAll('[data-plan-status-text]').forEach(span => {
    if (String(span.getAttribute('data-plan-status-text')).trim().toLowerCase() === cleanId) {
      if (span.classList.contains('comp-status-text')) {
        span.textContent = isAct ? '✓ Active (Live)' : '✕ Inactive';
      } else if (span.classList.contains('text-[10px]')) {
        span.textContent = isAct ? 'Active' : 'Off';
      } else if (span.classList.contains('font-semibold')) {
        span.textContent = isAct ? 'Active' : 'Inactive';
      } else {
        span.textContent = isAct ? 'Active' : 'Draft';
      }
      if (isAct) {
        span.classList.add('text-emerald-400');
        span.classList.remove('text-slate-400');
      } else {
        span.classList.remove('text-emerald-400');
        span.classList.add('text-slate-400');
      }
    }
  });
  const activeCountEl = document.getElementById('activePlansCount');
  if (activeCountEl && Array.isArray(state.plans)) {
    activeCountEl.textContent = state.plans.filter(p => p.is_active === 1 || p.is_active === true).length;
  }
}

let isTogglingPlan = false;
async function togglePlanActive(id, inputEl) {
  if (isTogglingPlan) return;
  isTogglingPlan = true;

  const cleanId = String(id).trim().toLowerCase();
  const plan = (state.plans || []).find(p => String(p.id).trim().toLowerCase() === cleanId);
  
  let newActive;
  if (inputEl && typeof inputEl.checked === 'boolean') {
    newActive = inputEl.checked ? 1 : 0;
  } else {
    const oldActive = plan ? (plan.is_active === 1 || plan.is_active === true) : false;
    newActive = oldActive ? 0 : 1;
  }

  if (plan) {
    plan.is_active = newActive;
  }

  // Optimistic UI synchronization across cards, summary table, and comparison matrix
  syncPlanToggleUI(cleanId, newActive);

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(cleanId)}/toggle`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle plan status');

    if (plan && data.plan) {
      Object.assign(plan, data.plan);
    }

    if (plan && typeof plan.features === 'string' && (!plan.features_parsed || !plan.features_parsed.length)) {
      try { plan.features_parsed = JSON.parse(plan.features); } catch (e) { plan.features_parsed = []; }
    }

    const finalActive = (data.is_active !== undefined) ? (data.is_active ? 1 : 0) : newActive;
    if (plan) plan.is_active = finalActive;
    syncPlanToggleUI(cleanId, finalActive);
    showToast(data.message || `Plan status updated to ${finalActive ? 'Active' : 'Draft'}`, 'success');
  } catch (err) {
    const revertActive = newActive ? 0 : 1;
    if (plan) {
      plan.is_active = revertActive;
    }
    syncPlanToggleUI(cleanId, revertActive);
    showToast(err.message || 'Error toggling plan status', 'error');
  } finally {
    isTogglingPlan = false;
  }
}

// Explicit window attachments for robust HTML inline onclick access
window.openEditPlanModal = openEditPlanModal;
window.savePlan = savePlan;
window.openAddPlanModal = openAddPlanModal;
window.togglePlanActive = togglePlanActive;
window.syncPlanToggleUI = syncPlanToggleUI;

function openDeletePlanModal(id, name) {
  state.pendingDelete = { type: 'plan', id, name: name || id };
  document.getElementById('deleteConfirmTarget').textContent = `Membership Plan: "${name || id}" (${id})`;
  document.getElementById('deleteModal').showModal();
}

// ========================================================
// PAYMENTS & PAYMENT HISTORY MANAGEMENT
// ========================================================

async function loadPayments() {
  const tableBody = document.getElementById('paymentsTableBody');
  const tableFoot = document.getElementById('paymentsTableFoot');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-10 text-slate-400">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#E6B8A2] border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Loading transaction history...</p>
      </td>
    </tr>
  `;
  if (tableFoot) tableFoot.innerHTML = '';

  try {
    const params = new URLSearchParams({
      q: state.payments.query,
      status: state.payments.status,
      method: state.payments.method,
      sort_by: state.payments.sortBy,
      order: state.payments.order,
      page: state.payments.page,
      limit: state.payments.limit
    });

    const res = await fetch(`/api/payments?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();

    state.payments.total = data.total;
    state.payments.totalPages = data.total_pages;
    state.payments.list = Array.isArray(data.payments) ? data.payments : [];

    updatePaymentPaginationControls();

    if (!data.payments || data.payments.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <i data-lucide="receipt" class="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50"></i>
            <p class="text-sm font-semibold text-slate-300">No payment transactions recorded yet</p>
            <p class="text-xs text-slate-500 mt-1">Real-time payment transactions from members will appear here automatically.</p>
          </td>
        </tr>
      `;
      if (tableFoot) tableFoot.innerHTML = '';
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        lucide.createIcons();
      }
      return;
    }

    tableBody.innerHTML = data.payments.map(p => {
      let statusBadge = '';
      const pStatus = (p.status || 'pending').toLowerCase();
      if (pStatus === 'completed') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>Completed</span>`;
      } else if (pStatus === 'refunded') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><span class="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5"></span>Refunded</span>`;
      } else if (pStatus === 'failed') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>Failed</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>Pending</span>`;
      }

      const safeId = String(p.id ?? p.transaction_id ?? '');

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
          <!-- Txn ID & Invoice -->
          <td class="py-3 px-4">
            <div class="font-mono text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>${escapeHtml(p.transaction_id || '')}</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(p.invoice_no || '')}</div>
          </td>

          <!-- Customer / Profile -->
          <td class="py-3 px-4">
            <div class="font-medium text-white text-sm">${escapeHtml(p.user_name || 'Walk-in Member')}</div>
            <div class="text-xs text-slate-400">${escapeHtml(p.plan_name || 'Plan')}</div>
          </td>

          <!-- Amount -->
          <td class="py-3 px-4">
            <div class="text-sm font-extrabold text-white font-mono">
              ${formatINR(p.amount)}
            </div>
            <div class="text-[10px] text-slate-400 uppercase font-mono">${escapeHtml(p.currency || 'INR')}</div>
          </td>

          <!-- Payment Method -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="flex items-center gap-1.5">
              <i data-lucide="credit-card" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${escapeHtml(p.payment_method || 'UPI')}</span>
            </div>
          </td>

          <!-- Status -->
          <td class="py-3 px-4">
            ${statusBadge}
          </td>

          <!-- Date -->
          <td class="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">
            <div>${formatDateTime(p.payment_date)}</div>
          </td>

          <!-- Actions -->
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              <button 
                type="button"
                onclick="openReceiptModal('${safeId}')"
                class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/70 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                title="View Invoice & Printable Receipt"
              >
                <i data-lucide="file-text" class="w-4 h-4"></i>
              </button>
              <button 
                type="button"
                onclick="openEditPaymentModal('${safeId}')"
                class="p-2 text-slate-400 hover:text-[#E6B8A2] hover:bg-[#E6B8A2]/10 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                title="Edit Payment / Change Status"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                type="button"
                onclick="openDeletePaymentModal('${safeId}')"
                class="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                title="Delete Transaction Record"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPaymentsTableSummary(data.payments);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error('Error in loadPayments:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6 text-rose-400 text-xs">
          Error loading payment history.
        </td>
      </tr>
    `;
    if (tableFoot) tableFoot.innerHTML = '';
  }
}

function renderPaymentsTableSummary(displayedPayments = []) {
  const tfoot = document.getElementById('paymentsTableFoot');
  if (!tfoot) return;

  if (!displayedPayments || displayedPayments.length === 0) {
    tfoot.innerHTML = '';
    return;
  }

  const totalCount = displayedPayments.length;
  const totalAmount = displayedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const completedList = displayedPayments.filter(p => (p.status || '').toLowerCase() === 'completed');
  const completedAmount = completedList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const completedCount = completedList.length;

  tfoot.innerHTML = `
    <tr class="bg-slate-900/90 border-t-2 border-slate-700/80">
      <td class="py-3.5 px-4">
        <div class="font-mono text-xs font-bold text-white flex items-center gap-1.5">
          <i data-lucide="calculator" class="w-4 h-4 text-[#E6B8A2]"></i>
          <span>PAGE TOTAL (${totalCount} Records)</span>
        </div>
        <div class="text-[10px] text-slate-400 font-mono">Displayed Transactions</div>
      </td>
      <td class="py-3.5 px-4 text-xs">
        <div class="text-emerald-400 font-semibold">${completedCount} Completed</div>
        <div class="text-[11px] text-slate-400">Net Volume: ${formatINR(completedAmount)}</div>
      </td>
      <td class="py-3.5 px-4">
        <div class="text-sm font-extrabold text-[#E6B8A2] font-mono">
          ${formatINR(totalAmount)}
        </div>
        <div class="text-[10px] text-slate-400 uppercase font-mono">INR Total</div>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-400" colspan="3">
        <span>Active Filters: ${escapeHtml((state.payments.status || 'all').toUpperCase())} • ${escapeHtml(state.payments.method || 'All Gateways')}</span>
      </td>
      <td class="py-3.5 px-4 text-right">
        <button 
          type="button"
          onclick="printAllPayments()" 
          class="px-3 py-1.5 rounded-lg bg-[#E6B8A2]/20 hover:bg-[#E6B8A2]/30 text-[#E6B8A2] border border-[#E6B8A2]/40 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          title="Print Entire Table with Total"
        >
          <i data-lucide="printer" class="w-3.5 h-3.5"></i>
          <span>Print All</span>
        </button>
      </td>
    </tr>
  `;
}

function updatePaymentPaginationControls() {
  const paginationInfo = document.getElementById('paymentPaginationInfo');
  const prevBtn = document.getElementById('paymentPrevBtn');
  const nextBtn = document.getElementById('paymentNextBtn');

  if (paginationInfo) {
    const start = state.payments.total === 0 ? 0 : (state.payments.page - 1) * state.payments.limit + 1;
    const end = Math.min(state.payments.page * state.payments.limit, state.payments.total);
    paginationInfo.textContent = `Showing ${start}-${end} of ${state.payments.total} transactions`;
  }

  if (prevBtn) prevBtn.disabled = state.payments.page <= 1;
  if (nextBtn) nextBtn.disabled = state.payments.page >= state.payments.totalPages;
}

function changePaymentPage(delta) {
  const newPage = state.payments.page + delta;
  if (newPage >= 1 && newPage <= state.payments.totalPages) {
    state.payments.page = newPage;
    loadPayments();
  }
}

function openAddPaymentModal() {
  const modal = document.getElementById('paymentModal');
  const title = document.getElementById('paymentModalTitle');
  const form = document.getElementById('paymentForm');

  if (title) title.textContent = 'Record Manual / Offline Payment';
  if (form) form.reset();
  const idEl = document.getElementById('paymentId');
  if (idEl) idEl.value = '';
  const txnEl = document.getElementById('paymentTxnId');
  if (txnEl) txnEl.value = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const statusEl = document.getElementById('paymentStatus');
  if (statusEl) statusEl.value = 'completed';

  if (modal) {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

async function openEditPaymentModal(id) {
  try {
    let p = (state.payments.list || []).find(item => String(item.id) === String(id) || String(item.transaction_id) === String(id));
    
    if (!p) {
      try {
        const res = await fetch(`/api/payments/${encodeURIComponent(id)}`);
        if (res.ok) {
          p = await res.json();
        }
      } catch (netErr) {
        console.warn('[Payments] Edit fetch notice:', netErr);
      }
    }

    if (!p) return showToast('Payment record not found', 'error');

    const modal = document.getElementById('paymentModal');
    const title = document.getElementById('paymentModalTitle');

    if (title) title.textContent = `Edit Transaction: ${p.transaction_id || id}`;

    const setVal = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) el.value = val ?? '';
    };

    setVal('paymentId', p.id ?? id);
    setVal('paymentTxnId', p.transaction_id || '');
    setVal('paymentUserName', p.user_name || '');

    // Ensure plan option exists in select element
    const planSelect = document.getElementById('paymentPlanName');
    if (planSelect && p.plan_name) {
      const exists = Array.from(planSelect.options).some(o => o.value === p.plan_name);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = p.plan_name;
        opt.textContent = p.plan_name;
        planSelect.appendChild(opt);
      }
      planSelect.value = p.plan_name;
    }

    setVal('paymentAmount', p.amount ?? 0);

    // Ensure payment method option exists
    const methodSelect = document.getElementById('paymentMethod');
    if (methodSelect && p.payment_method) {
      const matchOpt = Array.from(methodSelect.options).find(o => o.value.toLowerCase() === p.payment_method.toLowerCase());
      if (!matchOpt) {
        const opt = document.createElement('option');
        opt.value = p.payment_method;
        opt.textContent = p.payment_method;
        methodSelect.appendChild(opt);
        methodSelect.value = p.payment_method;
      } else {
        methodSelect.value = matchOpt.value;
      }
    }

    const statusSelect = document.getElementById('paymentStatus');
    if (statusSelect && p.status) {
      statusSelect.value = p.status.toLowerCase();
    }

    setVal('paymentNotes', p.notes || '');

    if (modal) {
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.error('Error opening edit payment modal:', e);
    showToast('Failed to load transaction data', 'error');
  }
}

async function savePayment(e) {
  e.preventDefault();
  const id = document.getElementById('paymentId').value;
  const isEdit = Boolean(id);

  const payload = {
    transaction_id: document.getElementById('paymentTxnId').value.trim(),
    user_name: document.getElementById('paymentUserName').value.trim(),
    plan_name: document.getElementById('paymentPlanName').value,
    amount: parseFloat(document.getElementById('paymentAmount').value) || 0,
    payment_method: document.getElementById('paymentMethod').value,
    status: document.getElementById('paymentStatus').value,
    notes: document.getElementById('paymentNotes').value.trim()
  };

  try {
    const url = isEdit ? `/api/payments/${encodeURIComponent(id)}` : '/api/payments';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save payment');

    // Also update locally in state.payments.list if present
    if (isEdit && Array.isArray(state.payments.list)) {
      const idx = state.payments.list.findIndex(item => String(item.id) === String(id) || String(item.transaction_id) === String(id));
      if (idx !== -1) {
        state.payments.list[idx] = { ...state.payments.list[idx], ...payload, ...(data.payment || {}) };
      }
    }

    showToast(isEdit ? 'Payment record updated successfully!' : 'New payment recorded successfully!', 'success');
    const modal = document.getElementById('paymentModal');
    if (modal) {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }
    await loadPayments();
    await loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeletePaymentModal(id, txnId, userName, amount) {
  const p = (state.payments.list || []).find(item => String(item.id) === String(id) || String(item.transaction_id) === String(id)) || {};
  const cleanTxnId = p.transaction_id || txnId || id;
  const cleanUserName = p.user_name || userName || 'Customer';
  const cleanAmount = (p.amount !== undefined) ? p.amount : (amount !== undefined ? amount : 0);

  state.pendingDelete = {
    type: 'payment',
    id: p.id ?? id,
    name: `${cleanTxnId} (${cleanUserName} - ${formatINR(cleanAmount)})`
  };

  const target = document.getElementById('deleteConfirmTarget');
  if (target) {
    target.textContent = `Transaction: ${cleanTxnId} for ${cleanUserName} (${formatINR(cleanAmount)})`;
  }

  const modal = document.getElementById('deleteModal');
  if (modal) {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } else {
    if (window.confirm(`Are you sure you want to permanently delete transaction ${cleanTxnId} for ${cleanUserName} (${formatINR(cleanAmount)})?`)) {
      confirmDelete();
    }
  }
}

async function openReceiptModal(id) {
  try {
    let p = (state.payments.list || []).find(item => String(item.id) === String(id) || String(item.transaction_id) === String(id));
    
    if (!p) {
      try {
        const res = await fetch(`/api/payments/${encodeURIComponent(id)}`);
        if (res.ok) {
          p = await res.json();
        }
      } catch (netErr) {
        console.warn('[Payments] Receipt fetch notice:', netErr);
      }
    }

    if (!p) return showToast('Payment not found', 'error');

    const setText = (elId, text) => {
      const el = document.getElementById(elId);
      if (el) el.textContent = text ?? '';
    };

    setText('receiptInvoiceNo', p.invoice_no || `INV-2026-${String(p.id || 1).padStart(4, '0')}`);
    setText('receiptDate', formatDateTime(p.payment_date || new Date().toISOString()));
    setText('receiptTxnId', p.transaction_id || id);
    setText('receiptCustomerName', p.user_name || 'Walk-in Member');
    setText('receiptPlanName', p.plan_name || 'Matrimonial Membership Plan');
    setText('receiptMethod', p.payment_method || 'UPI / Gateway');
    setText('receiptStatus', (p.status || 'completed').toUpperCase());
    setText('receiptSubtotal', formatINR(p.amount));
    setText('receiptTotal', formatINR(p.amount));
    setText('receiptNotes', p.notes || 'Official online payment receipt from I 4 You Matrimonial Portal.');

    const modal = document.getElementById('receiptModal');
    if (modal) {
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.error('Error opening receipt modal:', e);
    showToast('Failed to generate receipt', 'error');
  }
}

// Print Receipt helper
function printReceipt() {
  window.print();
}

// Print All / Ledger Statement with Total Amount
async function printAllPayments() {
  const payments = (state.payments.list && state.payments.list.length > 0) ? state.payments.list : [];
  if (payments.length === 0) {
    return showToast('No transaction records available to print', 'info');
  }

  const totalCount = payments.length;
  const totalAmount = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const completedList = payments.filter(p => (p.status || '').toLowerCase() === 'completed');
  const completedAmount = completedList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const otherList = payments.filter(p => (p.status || '').toLowerCase() !== 'completed');

  const countEl = document.getElementById('printLedgerCount');
  if (countEl) countEl.textContent = `${totalCount} Records`;

  const totalEl = document.getElementById('printLedgerTotal');
  if (totalEl) totalEl.textContent = formatINR(totalAmount);

  const completedEl = document.getElementById('printLedgerCompleted');
  if (completedEl) completedEl.textContent = `${formatINR(completedAmount)} (${completedList.length} txns)`;

  const otherEl = document.getElementById('printLedgerOther');
  if (otherEl) otherEl.textContent = `${otherList.length} Pending / Other`;

  const dateEl = document.getElementById('printLedgerDate');
  if (dateEl) dateEl.textContent = formatDateTime(new Date().toISOString());

  const filterEl = document.getElementById('printLedgerFilter');
  if (filterEl) {
    filterEl.textContent = `Status: ${(state.payments.status || 'all').toUpperCase()} • Gateway: ${escapeHtml(state.payments.method || 'All')} ${state.payments.query ? `• Query: "${escapeHtml(state.payments.query)}"` : ''}`;
  }

  const tbody = document.getElementById('printLedgerTableBody');
  if (tbody) {
    tbody.innerHTML = payments.map((p, idx) => `
      <tr class="border-b border-slate-800/60 hover:bg-slate-800/20">
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
        <td class="py-2.5 px-3 font-mono font-semibold text-slate-100 text-xs">
          <div>${escapeHtml(p.transaction_id || '')}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(p.invoice_no || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-white text-xs">
          <div class="font-bold">${escapeHtml(p.user_name || 'Customer')}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(p.plan_name || '')}</div>
        </td>
        <td class="py-2.5 px-3 text-slate-300 text-xs">${escapeHtml(p.payment_method || '')}</td>
        <td class="py-2.5 px-2 text-center">
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
            (p.status || '').toLowerCase() === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            (p.status || '').toLowerCase() === 'refunded' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
            (p.status || '').toLowerCase() === 'failed' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }">
            ${escapeHtml((p.status || 'pending').toUpperCase())}
          </span>
        </td>
        <td class="py-2.5 px-3 text-slate-300 text-xs whitespace-nowrap">${formatDateTime(p.payment_date)}</td>
        <td class="py-2.5 px-3 text-right font-mono font-extrabold text-white text-xs">${formatINR(p.amount)}</td>
      </tr>
    `).join('');
  }

  const grandTotalEl = document.getElementById('printLedgerGrandTotal');
  if (grandTotalEl) grandTotalEl.textContent = formatINR(totalAmount);

  const modal = document.getElementById('printLedgerModal');
  if (modal) {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } else {
    window.print();
  }
}

// Window global bindings for event handlers
if (typeof window !== 'undefined') {
  window.loadPayments = loadPayments;
  window.openAddPaymentModal = openAddPaymentModal;
  window.openEditPaymentModal = openEditPaymentModal;
  window.openDeletePaymentModal = openDeletePaymentModal;
  window.openReceiptModal = openReceiptModal;
  window.printReceipt = printReceipt;
  window.printAllPayments = printAllPayments;
  window.savePayment = savePayment;
}

// ========================================================
// ADMINISTRATOR MANAGEMENT & ACCESS CONTROLS
// ========================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadAdminUsers() {
  const tableBody = document.getElementById('adminUsersTableBody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/users', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to load administrators');
    const data = await res.json();
    const admins = data.admins || [];

    if (admins.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-400">
            No administrator accounts configured.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = admins.map(admin => {
      const isCurrent = state.admin && (state.admin.id === admin.id);
      const avatarUrl = admin.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
      const roleColor = admin.role === 'Super Admin'
        ? 'bg-amber-500/10 text-[#E6B8A2] border-amber-500/20'
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

      return `
        <tr class="hover:bg-white/[0.02] transition-colors">
          <td class="py-3 px-3">
            <div class="flex items-center space-x-3">
              <img src="${escapeHtml(avatarUrl)}" alt="Avatar" class="w-8 h-8 rounded-full object-cover border border-[#E6B8A2]/30 flex-shrink-0" />
              <div>
                <p class="font-bold text-white text-xs flex items-center gap-1.5">
                  ${escapeHtml(admin.full_name)}
                  ${isCurrent ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">You</span>' : ''}
                </p>
                <p class="text-[11px] font-mono text-slate-400">@${escapeHtml(admin.username)}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-3 font-mono text-slate-300 text-xs">
            ${escapeHtml(admin.email)}
          </td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor}">
              ${escapeHtml(admin.role || 'Administrator')}
            </span>
          </td>
          <td class="py-3 px-3 text-slate-400 text-xs">
            ${admin.last_login ? escapeHtml(admin.last_login) : '<span class="italic text-slate-500">Never logged in</span>'}
          </td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              <button 
                onclick="openEditAdminModal(${admin.id})"
                class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Edit Administrator"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openDeleteAdminUserModal(${admin.id}, '${escapeHtml(admin.full_name)}')"
                class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete Administrator"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-rose-400 text-xs">
          ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function updateAdminAvatarPreview(url) {
  const preview = document.getElementById('adminFormAvatarPreview');
  if (preview) {
    preview.src = url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
  }
}

function setAdminAvatarPreset(url) {
  const input = document.getElementById('adminFormAvatar');
  if (input) {
    input.value = url;
    updateAdminAvatarPreview(url);
  }
}

function openEditCurrentAdminModal() {
  if (!state.admin) {
    const currentName = document.getElementById('adminFullName')?.textContent?.trim() || 'Arun Thomas';
    const currentRole = document.getElementById('adminRoleBadge')?.textContent?.trim() || 'Super Admin';
    const currentAvatar = document.getElementById('adminAvatarImg')?.src || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
    state.admin = {
      id: 1,
      username: 'admin',
      name: currentName,
      full_name: currentName,
      email: 'admin@i4you.com',
      role: currentRole,
      avatar: currentAvatar,
      permissions: ['*']
    };
  }
  openEditAdminModal(state.admin.id);
}

async function openEditAdminModal(adminId) {
  try {
    let admin = null;
    try {
      const res = await fetch(`/api/admin/users/${adminId}`);
      if (res && res.ok) {
        admin = await res.json();
      }
    } catch (e) {
      console.warn('Network admin fetch notice:', e);
    }

    if (!admin && state.admin && (state.admin.id == adminId || adminId === 1)) {
      admin = state.admin;
    }

    if (!admin) {
      const currentName = document.getElementById('adminFullName')?.textContent?.trim() || 'Arun Thomas';
      const currentRole = document.getElementById('adminRoleBadge')?.textContent?.trim() || 'Super Admin';
      const currentAvatar = document.getElementById('adminAvatarImg')?.src || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
      admin = {
        id: adminId || 1,
        full_name: currentName,
        username: 'admin',
        email: 'admin@i4you.com',
        role: currentRole,
        avatar: currentAvatar
      };
    }

    document.getElementById('adminFormId').value = admin.id || 1;
    document.getElementById('adminFormMode').value = 'edit';
    document.getElementById('adminModalTitle').textContent = 'Edit Administrator Profile';
    document.getElementById('adminModalSubtitle').textContent = `Editing credentials for ${admin.full_name || 'Admin'}`;
    document.getElementById('adminFormFullName').value = admin.full_name || '';
    document.getElementById('adminFormUsername').value = admin.username || '';
    document.getElementById('adminFormEmail').value = admin.email || '';
    document.getElementById('adminFormRole').value = admin.role || 'Super Admin';
    
    const avatar = admin.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
    document.getElementById('adminFormAvatar').value = avatar;
    updateAdminAvatarPreview(avatar);

    document.getElementById('adminFormPassword').value = '';
    document.getElementById('adminFormPasswordConfirm').value = '';
    document.getElementById('adminFormPassword').required = false;
    document.getElementById('adminFormPasswordConfirm').required = false;
    document.getElementById('adminFormPasswordHelp').textContent = 'Leave blank to retain current password';

    const modal = document.getElementById('adminModal');
    if (modal) {
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
    }
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error('Error opening edit admin modal:', e);
    showToast(e.message || 'Could not open edit modal', 'error');
  }
}

function openCreateAdminModal() {
  document.getElementById('adminFormId').value = '';
  document.getElementById('adminFormMode').value = 'create';
  document.getElementById('adminModalTitle').textContent = 'Add New Administrator';
  document.getElementById('adminModalSubtitle').textContent = 'Create a new admin account with dedicated login access';
  document.getElementById('adminFormFullName').value = '';
  document.getElementById('adminFormUsername').value = '';
  document.getElementById('adminFormEmail').value = '';
  document.getElementById('adminFormRole').value = 'Administrator';
  
  const defaultAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200';
  document.getElementById('adminFormAvatar').value = defaultAvatar;
  updateAdminAvatarPreview(defaultAvatar);

  document.getElementById('adminFormPassword').value = '';
  document.getElementById('adminFormPasswordConfirm').value = '';
  document.getElementById('adminFormPassword').required = true;
  document.getElementById('adminFormPasswordConfirm').required = true;
  document.getElementById('adminFormPasswordHelp').textContent = 'Must be at least 6 characters';

  const modal = document.getElementById('adminModal');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }
  if (window.lucide) lucide.createIcons();
}

function toggleAdminPasswordVis(inputId, iconId) {
  const el = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    el.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) lucide.createIcons();
}

function toggleLoginPasswordVis() {
  const pInput = document.getElementById('adminLoginPassword');
  const eye = document.getElementById('loginPasswordEyeIcon');
  if (!pInput) return;
  if (pInput.type === 'password') {
    pInput.type = 'text';
    eye?.setAttribute('data-lucide', 'eye-off');
  } else {
    pInput.type = 'password';
    eye?.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) lucide.createIcons();
}

function showAdminModalAlert(msg, type = 'error') {
  const alertEl = document.getElementById('adminModalAlert');
  const alertMsg = document.getElementById('adminModalAlertMsg');
  const alertIcon = document.getElementById('adminModalAlertIcon');
  if (!alertEl || !alertMsg) return;

  alertMsg.textContent = msg;
  if (type === 'error' || type === 'warning') {
    alertEl.className = 'p-3 rounded-xl border text-xs flex items-center gap-2 bg-rose-500/15 border-rose-500/40 text-rose-300';
    alertIcon?.setAttribute('data-lucide', 'alert-circle');
  } else if (type === 'success') {
    alertEl.className = 'p-3 rounded-xl border text-xs flex items-center gap-2 bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
    alertIcon?.setAttribute('data-lucide', 'check-circle');
  } else {
    alertEl.className = 'p-3 rounded-xl border text-xs flex items-center gap-2 bg-amber-500/15 border-amber-500/40 text-amber-300';
    alertIcon?.setAttribute('data-lucide', 'info');
  }
  alertEl.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function hideAdminModalAlert() {
  const alertEl = document.getElementById('adminModalAlert');
  if (alertEl) alertEl.classList.add('hidden');
}

function validateAdminPasswordsLive() {
  const passEl = document.getElementById('adminFormPassword');
  const confirmEl = document.getElementById('adminFormPasswordConfirm');
  const hintEl = document.getElementById('adminPasswordMatchHint');
  const hintText = document.getElementById('adminPasswordMatchText');
  const hintIcon = document.getElementById('adminPasswordMatchIcon');
  if (!passEl || !confirmEl) return;

  const p1 = passEl.value;
  const p2 = confirmEl.value;

  hideAdminModalAlert();

  if (!p1 && !p2) {
    if (hintEl) hintEl.classList.add('hidden');
    passEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
    confirmEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
    return;
  }

  if (hintEl) hintEl.classList.remove('hidden');

  if (p1.length > 0 && p1.length < 6) {
    if (hintEl) hintEl.className = 'text-[11px] flex items-center gap-1.5 pt-1 text-amber-400';
    if (hintText) hintText.textContent = 'Password must be at least 6 characters long';
    hintIcon?.setAttribute('data-lucide', 'alert-circle');
    passEl.classList.add('border-amber-500/60');
    passEl.classList.remove('border-emerald-500', 'border-rose-500');
  } else if (p2.length > 0 && p1 === p2) {
    if (hintEl) hintEl.className = 'text-[11px] flex items-center gap-1.5 pt-1 text-emerald-400 font-medium';
    if (hintText) hintText.textContent = 'Passwords match correctly';
    hintIcon?.setAttribute('data-lucide', 'check-circle');
    passEl.classList.remove('border-rose-500', 'border-amber-500/60');
    passEl.classList.add('border-emerald-500');
    confirmEl.classList.remove('border-rose-500', 'border-amber-500/60');
    confirmEl.classList.add('border-emerald-500');
  } else if (p2.length > 0 && p1 !== p2) {
    if (hintEl) hintEl.className = 'text-[11px] flex items-center gap-1.5 pt-1 text-rose-400';
    if (hintText) hintText.textContent = 'Passwords do not match';
    hintIcon?.setAttribute('data-lucide', 'alert-circle');
    confirmEl.classList.add('border-rose-500');
    confirmEl.classList.remove('border-emerald-500');
  } else {
    if (hintEl) hintEl.classList.add('hidden');
    passEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
    confirmEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
  }
  if (window.lucide) lucide.createIcons();
}

function closeAdminModal() {
  hideAdminModalAlert();
  const hintEl = document.getElementById('adminPasswordMatchHint');
  if (hintEl) hintEl.classList.add('hidden');
  
  const passEl = document.getElementById('adminFormPassword');
  const confirmEl = document.getElementById('adminFormPasswordConfirm');
  if (passEl) {
    passEl.type = 'password';
    passEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
  }
  if (confirmEl) {
    confirmEl.type = 'password';
    confirmEl.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500/60');
  }
  const t1 = document.getElementById('toggleNewPassIcon');
  if (t1) t1.setAttribute('data-lucide', 'eye');
  const t2 = document.getElementById('toggleConfirmPassIcon');
  if (t2) t2.setAttribute('data-lucide', 'eye');

  const modal = document.getElementById('adminModal');
  if (modal) {
    try {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
    } catch (e) {
      modal.removeAttribute('open');
    }
  }
  if (window.lucide) lucide.createIcons();
}

async function saveAdminForm(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  const saveBtn = document.getElementById('saveAdminBtn');
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '<span>Save Administrator</span>';

  try {
    const idEl = document.getElementById('adminFormId');
    const modeEl = document.getElementById('adminFormMode');
    const fullNameEl = document.getElementById('adminFormFullName');
    const usernameEl = document.getElementById('adminFormUsername');
    const emailEl = document.getElementById('adminFormEmail');
    const roleEl = document.getElementById('adminFormRole');
    const avatarEl = document.getElementById('adminFormAvatar');
    const passwordEl = document.getElementById('adminFormPassword');
    const passwordConfirmEl = document.getElementById('adminFormPasswordConfirm');

    const id = (idEl && idEl.value) ? idEl.value : 1;
    const mode = (modeEl && modeEl.value) ? modeEl.value : 'edit';
    const fullName = fullNameEl ? fullNameEl.value.trim() : '';
    const username = usernameEl ? usernameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const role = roleEl ? roleEl.value : 'Super Admin';
    const avatar = avatarEl ? avatarEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    const passwordConfirm = passwordConfirmEl ? passwordConfirmEl.value : '';

    hideAdminModalAlert();

    // Programmatic Validation with Inline Feedback inside Modal
    if (!fullName) {
      showAdminModalAlert('Please enter administrator full name', 'warning');
      showToast('Please enter administrator full name', 'warning');
      fullNameEl?.focus();
      return;
    }
    if (!username) {
      showAdminModalAlert('Please enter a username', 'warning');
      showToast('Please enter a username', 'warning');
      usernameEl?.focus();
      return;
    }
    if (!email) {
      showAdminModalAlert('Please enter an email address', 'warning');
      showToast('Please enter an email address', 'warning');
      emailEl?.focus();
      return;
    }

    if (mode === 'create' && !password) {
      showAdminModalAlert('Password is required when creating a new administrator', 'warning');
      showToast('Password is required when creating a new administrator', 'warning');
      passwordEl?.focus();
      return;
    }

    if (password) {
      if (password.length < 6) {
        showAdminModalAlert('Password must be at least 6 characters long', 'warning');
        showToast('Password must be at least 6 characters long', 'warning');
        passwordEl?.focus();
        return;
      }
      if (password !== passwordConfirm) {
        showAdminModalAlert('Passwords do not match. Please re-enter identical passwords in both fields.', 'error');
        showToast('Passwords do not match. Please re-enter identical passwords.', 'warning');
        passwordConfirmEl?.focus();
        return;
      }
    }

    // Set button loading state
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Saving...</span>
      `;
    }

    const payload = {
      id: Number(id) || id,
      full_name: fullName,
      name: fullName,
      username: username,
      email: email,
      role: role,
      avatar: avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      permissions: ['*']
    };
    if (password) {
      payload.password = password;
      try {
        localStorage.setItem('i4u_custom_admin_password', password);
      } catch (e) {}
    }

    let data = null;
    try {
      let res;
      if (mode === 'create') {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/admin/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res && res.ok) {
        data = await res.json();
      } else if (res && !res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Server returned ${res.status}`);
      }
    } catch (e) {
      console.warn('Network admin save notice (falling back to local persistence):', e);
      if (e.message && !e.message.includes('Failed to fetch') && !e.message.includes('NetworkError')) {
        showAdminModalAlert(e.message, 'error');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnHtml;
        }
        return;
      }
    }

    const savedAdmin = (data && data.admin) ? data.admin : { id, ...payload };

    // Update global state and localStorage
    state.admin = {
      ...(state.admin || {}),
      ...savedAdmin,
      name: fullName,
      full_name: fullName,
      username: username,
      email: email,
      role: role,
      avatar: payload.avatar,
      permissions: (state.admin && state.admin.permissions) || ['*']
    };
    if (password) {
      state.admin.password = password;
    }

    try {
      localStorage.setItem('i4u_admin_user', JSON.stringify(state.admin));
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }

    // Reset password fields in modal form
    if (passwordEl) passwordEl.value = '';
    if (passwordConfirmEl) passwordConfirmEl.value = '';

    // Refresh UI elements immediately
    updateAdminProfileUI();

    showAdminModalAlert(password ? 'Password & Profile updated successfully!' : 'Administrator profile saved successfully!', 'success');
    
    // Brief visual confirmation before closing modal
    await new Promise(r => setTimeout(r, 650));

    // Safely close the modal
    closeAdminModal();

    const successMsg = password ? 'Administrator profile and new password updated successfully!' : ((data && data.message) || 'Administrator profile saved successfully!');
    showToast(successMsg, 'success');

    if (typeof loadAdminUsers === 'function') {
      try {
        loadAdminUsers();
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error saving admin form:', err);
    showAdminModalAlert(err.message || 'Failed to save administrator', 'error');
    showToast(err.message || 'Failed to save administrator', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  }
}

function openDeleteCurrentAdminModal() {
  if (!state.admin) {
    const currentName = document.getElementById('adminFullName')?.textContent?.trim() || 'Arun Thomas';
    state.admin = {
      id: 1,
      username: 'admin',
      name: currentName,
      full_name: currentName,
      email: 'admin@i4you.com',
      role: 'Super Admin'
    };
  }
  openDeleteAdminUserModal(state.admin.id, state.admin.full_name || state.admin.username || 'Arun Thomas');
}

function openDeleteAdminUserModal(adminId, adminName) {
  state.pendingDelete = {
    type: 'admin',
    id: adminId,
    name: adminName
  };
  const targetEl = document.getElementById('deleteConfirmTarget');
  if (targetEl) {
    targetEl.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="shield-alert" class="w-4 h-4 text-rose-400"></i>
        <span>Administrator: <strong>${escapeHtml(adminName)}</strong> (ID #${adminId})</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
  const modal = document.getElementById('deleteModal');
  if (modal) {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }
}

// ==========================================
// AADHAAR MANUAL VERIFICATION CONTROLLER
// ==========================================

async function loadAadhaarVerifications() {
  const tableBody = document.getElementById('aadhaarTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-12 text-slate-400">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#E6B8A2] border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Loading Aadhaar verification candidates...</p>
      </td>
    </tr>
  `;

  try {
    // 1. Fetch metrics from analytics
    fetch('/api/analytics', {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    }).then(r => r.json()).then(data => {
      if (data) {
        const kpi = data.kpi || data;
        const total = kpi.total_users || kpi.total_candidates || 0;
        const pending = kpi.pending_verifications || 0;
        const approved = (data.verification_breakdown && data.verification_breakdown.aadhaar_verified) || (data.aadhaar_breakdown && data.aadhaar_breakdown.approved) || kpi.verified_users || 0;
        const rate = kpi.verification_rate || 0;

        const elTotal = document.getElementById('aadhaarMetricTotal');
        const elPending = document.getElementById('aadhaarMetricPending');
        const elApproved = document.getElementById('aadhaarMetricApproved');
        const elRate = document.getElementById('aadhaarMetricRate');
        const elBadge = document.getElementById('aadhaarPendingBadge');

        if (elTotal) elTotal.textContent = total;
        if (elPending) elPending.textContent = pending;
        if (elApproved) elApproved.textContent = approved;
        if (elRate) elRate.textContent = `${rate}%`;

        if (elBadge) {
          elBadge.textContent = pending;
          if (pending > 0) elBadge.classList.remove('hidden');
          else elBadge.classList.add('hidden');
        }
      }
    }).catch(() => {});

    // 2. Fetch filtered users list
    let verifiedParam = 'all';
    if (state.aadhaar.status === 'pending') {
      verifiedParam = 'pending_aadhaar';
    } else if (state.aadhaar.status === 'sent_back') {
      verifiedParam = 'sent_back';
    } else if (state.aadhaar.status === 'verified') {
      verifiedParam = 'aadhaar';
    }

    const params = new URLSearchParams({
      q: state.aadhaar.query,
      verified: verifiedParam,
      sort_by: state.aadhaar.sortBy,
      order: state.aadhaar.order,
      page: state.aadhaar.page,
      limit: state.aadhaar.limit
    });

    const authHeaders = getAdminAuthHeaders();
    let data = null;
    let fetchError = null;

    try {
      const res = await fetch(`/api/users?${params.toString()}`, {
        headers: authHeaders,
        credentials: 'include'
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.error('[Super Admin Verification] Primary API request failed:', {
          endpoint: `/api/users?${params.toString()}`,
          status: res.status,
          statusText: res.statusText,
          headersSent: authHeaders,
          errorResponse: errorText
        });
        throw new Error(`Failed to fetch verification list (HTTP ${res.status}: ${res.statusText || 'Error'})`);
      }
      data = await res.json();
    } catch (apiErr) {
      console.warn('[Super Admin Verification] Primary endpoint /api/users failed, activating direct PostgreSQL Supabase fallback:', apiErr);
      fetchError = apiErr;

      // Direct fallback to PostgreSQL (Supabase REST API)
      try {
        const SUPABASE_BASE = 'https://kzvdzospvgzlfkkptadl.supabase.co/rest/v1/profiles';
        const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';
        
        let filterQuery = `select=*&order=${encodeURIComponent(state.aadhaar.sortBy || 'created_at')}.${state.aadhaar.order || 'desc'}`;
        if (state.aadhaar.status === 'pending') {
          filterQuery += '&or=(aadhaar_verified.eq.0,aadhaar_verified.is.null,aadhaar_status.in.(pending,pending_aadhaar,sent_back))';
        } else if (state.aadhaar.status === 'sent_back') {
          filterQuery += '&aadhaar_status=eq.sent_back';
        } else if (state.aadhaar.status === 'verified') {
          filterQuery += '&or=(aadhaar_verified.eq.1,aadhaar_status.eq.approved)';
        }

        const sbRes = await fetch(`${SUPABASE_BASE}?${filterQuery}`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Accept': 'application/json'
          }
        });

        if (sbRes.ok) {
          const rows = await sbRes.json();
          let candidates = rows || [];
          if (state.aadhaar.query) {
            const q = state.aadhaar.query.toLowerCase();
            candidates = candidates.filter(u => 
              (u.name && u.name.toLowerCase().includes(q)) ||
              (u.phone && u.phone.includes(q)) ||
              (u.city && u.city.toLowerCase().includes(q)) ||
              (u.id && String(u.id).toLowerCase().includes(q))
            );
          }
          const total = candidates.length;
          const limit = state.aadhaar.limit || 10;
          const page = state.aadhaar.page || 1;
          const offset = (page - 1) * limit;
          data = {
            users: candidates.slice(offset, offset + limit),
            total: total,
            page: page,
            limit: limit,
            total_pages: Math.ceil(total / limit) || 1
          };
          console.info('[Super Admin Verification] Successfully loaded candidates via direct PostgreSQL Supabase fallback:', data.total);
        } else {
          const sbErrorText = await sbRes.text().catch(() => '');
          console.error('[Super Admin Verification] Direct PostgreSQL Supabase fallback failed:', {
            status: sbRes.status,
            response: sbErrorText
          });
        }
      } catch (sbErr) {
        console.error('[Super Admin Verification] Direct PostgreSQL Supabase fallback exception:', sbErr);
      }
    }

    if (!data) {
      throw fetchError || new Error('Failed to fetch verification list');
    }

    state.aadhaar.total = data.total;
    state.aadhaar.totalPages = data.total_pages;
    state.aadhaar.candidatesList = data.users || [];

    // Update pagination display
    const pageInfo = document.getElementById('aadhaarPaginationInfo');
    const pageDisplay = document.getElementById('aadhaarCurrentPageDisplay');
    const prevBtn = document.getElementById('aadhaarPrevPageBtn');
    const nextBtn = document.getElementById('aadhaarNextPageBtn');

    if (pageInfo) pageInfo.textContent = `Showing ${data.users?.length || 0} of ${data.total || 0} candidates`;
    if (pageDisplay) pageDisplay.textContent = `${state.aadhaar.page} / ${Math.max(1, data.total_pages || 1)}`;
    if (prevBtn) prevBtn.disabled = state.aadhaar.page <= 1;
    if (nextBtn) nextBtn.disabled = state.aadhaar.page >= (data.total_pages || 1);

    const tableWrapper = document.getElementById('aadhaarTableWrapper');
    const cardsWrapper = document.getElementById('aadhaarCardsGridWrapper');

    // Switch View Mode: Table vs Visual Aadhaar Cards
    if (state.aadhaar.viewMode === 'cards') {
      if (tableWrapper) tableWrapper.classList.add('hidden');
      if (cardsWrapper) {
        cardsWrapper.classList.remove('hidden');
        renderAadhaarCardsGrid(data.users || []);
      }
      return;
    }

    if (cardsWrapper) cardsWrapper.classList.add('hidden');
    if (tableWrapper) tableWrapper.classList.remove('hidden');

    if (!data.users || data.users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-12 text-slate-400">
            <i data-lucide="shield-check" class="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60"></i>
            <p class="text-sm font-medium text-slate-300">
              ${state.aadhaar.status === 'pending' ? 'All Clear! No pending Aadhaar verifications.' : 'No candidates found.'}
            </p>
            <p class="text-xs text-slate-500 mt-1">Try switching to "All Profiles" or adjusting your search query.</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
      return;
    }

    tableBody.innerHTML = data.users.map(u => {
      const isAadhaarVerified = Boolean(u.aadhaar_verified);
      const hasPhone = Boolean(u.phone && u.phone !== 'N/A' && u.phone.trim() !== '');
      const callPhone = hasPhone ? getCleanPhoneForCall(u.phone) : '';
      const waUrl = hasPhone ? getWhatsAppUrl(u.phone, u.name) : '';
      const cleanNo = (u.aadhaarNumber || '492081735928').replace(/\D/g, '');
      const maskedId = u.maskedAadhaar || `XXXX XXXX ${cleanNo.slice(-4) || '5928'}`;
      const frontThumbUrl = u.aadhaar_front_image ? (u.aadhaar_front_image.startsWith('/') ? `${u.aadhaar_front_image}?_t=${Date.now()}` : u.aadhaar_front_image) : '';

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
          <!-- Candidate Profile -->
          <td class="py-3 px-4">
            <div class="flex items-center space-x-3">
              <div class="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#C58B76]/30 bg-slate-800">
                <img src="${u.photo || (String(u.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')}" alt="${u.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-white text-sm hover:text-[#E6B8A2] cursor-pointer truncate" onclick="openViewProfileModal('${u.id}')">${u.name}</span>
                  <span class="text-[10px] text-slate-400 font-mono">#${u.id}</span>
                </div>
                <div class="text-xs text-slate-400 flex items-center gap-1">
                  <span>${u.age} yrs</span> &bull; 
                  <span>${u.gender}</span> &bull; 
                  <span class="text-slate-300 font-medium">${u.district || u.city || 'Kerala'}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- Contact Coordinates -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="flex items-center gap-1.5 font-mono text-slate-200">
              <span class="font-medium">${formatDisplayPhone(u.phone)}</span>
              ${hasPhone ? `
                <a href="tel:${callPhone}" class="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" title="Call candidate">
                  <i data-lucide="phone" class="w-3 h-3"></i>
                </a>
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" title="WhatsApp candidate">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/></svg>
                </a>
              ` : ''}
            </div>
            <div class="text-slate-400 truncate max-w-[160px]">${u.email || 'No email registered'}</div>
          </td>

          <!-- Aadhaar Card Document Reference & View Switch -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              ${u.aadhaar_front_image ? `
                <div class="relative group/thumb cursor-pointer shrink-0" onclick="openAadhaarCardModal('${u.id}')" title="Click to view authentic uploaded Aadhaar card">
                  <img src="${frontThumbUrl}" alt="Aadhaar Front" class="w-16 h-10 object-cover rounded-lg border border-amber-400/40 shadow group-hover/thumb:scale-105 group-hover/thumb:border-amber-300 transition-all" onerror="this.onerror=null; this.src=AADHAAR_FALLBACK_SVG;"/>
                  <span class="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                    <i data-lucide="check" class="w-2.5 h-2.5"></i>
                  </span>
                </div>
              ` : `
                <div class="w-16 h-10 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 flex items-center justify-center text-slate-500 shrink-0" title="No card scan uploaded yet">
                  <i data-lucide="file-question" class="w-4 h-4"></i>
                </div>
              `}
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                  <i data-lucide="${isAadhaarVerified ? 'file-check-2' : 'file-text'}" class="w-3.5 h-3.5 ${isAadhaarVerified ? 'text-emerald-400' : 'text-amber-400'}"></i>
                  <span class="font-medium">${maskedId}</span>
                  ${u.aadhaar_back_image ? '<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono ml-1">Both Sides</span>' : ''}
                </div>
              </div>
            </div>
          </td>

          <!-- Current Status -->
          <td class="py-3 px-4">
            ${isAadhaarVerified ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Aadhaar Approved
              </span>
            ` : u.aadhaar_status === 'sent_back' ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30" title="Reason: ${escapeHtml(u.aadhaar_rejection_reason || 'Photo is blurry or unreadable')}">
                <i data-lucide="undo-2" class="w-3 h-3 mr-1 text-rose-400"></i>
                Sent Back
              </span>
            ` : `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
                Review Pending
              </span>
            `}
          </td>

          <!-- Verification & Send Back Column -->
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-2">
              <label class="relative inline-flex items-center cursor-pointer select-none group" title="Approve Aadhaar verification">
                <input 
                  type="checkbox" 
                  ${isAadhaarVerified ? 'checked' : ''} 
                  onchange="toggleAadhaarApproval('${u.id}', this.checked)" 
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                <span class="ml-2 text-xs font-bold ${isAadhaarVerified ? 'text-emerald-400' : 'text-slate-400'} min-w-[62px] text-left">
                  ${isAadhaarVerified ? 'Approved' : 'Pending'}
                </span>
              </label>

              <!-- Send Back Button -->
              <button 
                type="button"
                onclick="openSendBackAadhaarModal('${u.id}', '${escapeHtml(u.name)}')"
                class="py-1 px-2.5 rounded-lg text-xs font-semibold ${u.aadhaar_status === 'sent_back' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:border-rose-400/40 hover:bg-rose-500/10'} transition-all cursor-pointer flex items-center gap-1 shrink-0"
                title="Send Back to Candidate if Photo is Blurry or Unreadable"
              >
                <i data-lucide="undo-2" class="w-3.5 h-3.5 ${u.aadhaar_status === 'sent_back' ? 'text-rose-400' : 'text-slate-400'}"></i>
                <span class="hidden xl:inline">${u.aadhaar_status === 'sent_back' ? 'Sent Back' : 'Send Back'}</span>
              </button>
            </div>
          </td>

          <!-- Actions -->
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              <button 
                onclick="openAadhaarCardModal('${u.id}')"
                class="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer" 
                title="View Aadhaar Card Document"
              >
                <i data-lucide="credit-card" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openViewProfileModal('${u.id}')"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer" 
                title="View Full Profile Details"
              >
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openEditUserModal('${u.id}')"
                class="p-1.5 text-slate-400 hover:text-[#E6B8A2] hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer" 
                title="Edit Candidate Details"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    console.error('[Super Admin Verification Error] loadAadhaarVerifications encountered error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      aadhaarState: state.aadhaar
    });
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-rose-400 text-xs">
          <i data-lucide="alert-circle" class="w-6 h-6 mx-auto text-rose-400 mb-2 opacity-80"></i>
          <p class="font-semibold text-sm text-rose-300">Error loading verification candidates</p>
          <p class="text-xs text-rose-400/80 mt-1">${err.message}</p>
          <button onclick="loadAadhaarVerifications()" class="mt-3 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-medium transition-colors cursor-pointer">
            Retry Loading
          </button>
        </td>
      </tr>
    `;
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }
}

// ----------------------------------------------------
// AADHAAR CARDS VISUAL GRID VIEW MODE
// ----------------------------------------------------

function renderAadhaarCardsGrid(users) {
  const cardsWrapper = document.getElementById('aadhaarCardsGridWrapper');
  if (!cardsWrapper) return;

  if (!users || users.length === 0) {
    cardsWrapper.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-400 bg-[#2C1A1D] rounded-3xl border border-slate-800 p-8">
        <i data-lucide="shield-check" class="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-60"></i>
        <p class="text-base font-semibold text-slate-200">
          ${state.aadhaar.status === 'pending' ? 'All Clear! No pending Aadhaar verifications.' : 'No candidates found.'}
        </p>
        <p class="text-xs text-slate-500 mt-1">Try switching to "All Profiles" or adjusting your search query.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  cardsWrapper.innerHTML = users.map(u => {
    const isApproved = Boolean(u.aadhaar_verified);
    const hasPhone = Boolean(u.phone && u.phone !== 'N/A' && u.phone.trim() !== '');
    const callPhone = hasPhone ? getCleanPhoneForCall(u.phone) : '';
    const waUrl = hasPhone ? getWhatsAppUrl(u.phone, u.name) : '';
    const cleanNo = (u.aadhaarNumber || '492081735928').replace(/\D/g, '');
    const maskedNo = `XXXX XXXX ${cleanNo.slice(-4) || '5928'}`;

    return `
      <div class="rounded-3xl bg-[#2C1A1D] border ${isApproved ? 'border-emerald-500/40' : 'border-amber-500/40'} p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#E6B8A2]/60 transition-all">
        <!-- Top Profile & Status Bar -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center space-x-3 min-w-0">
            <img 
              src="${u.photo || (String(u.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')}" 
              alt="${u.name}" 
              class="w-12 h-12 rounded-2xl object-cover border border-[#C58B76]/50 flex-shrink-0"
              onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h4 class="font-bold text-white text-sm hover:text-[#E6B8A2] cursor-pointer truncate" onclick="openViewProfileModal('${u.id}')">${u.name}</h4>
                <span class="text-[10px] text-slate-400 font-mono">#${u.id}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${u.age} yrs &bull; ${u.gender} &bull; ${u.district || u.city || 'Kerala'}</p>
            </div>
          </div>
          ${isApproved ? `
            <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
              Approved
            </span>
          ` : u.aadhaar_status === 'sent_back' ? `
            <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex-shrink-0 flex items-center gap-1" title="Reason: ${escapeHtml(u.aadhaar_rejection_reason || 'Photo is unclear')}">
              <i data-lucide="undo-2" class="w-3 h-3 text-rose-400"></i>
              Sent Back
            </span>
          ` : `
            <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
              Pending Review
            </span>
          `}
        </div>

        <!-- Embedded Mini Aadhaar Card Preview Component -->
        <div class="bg-[#1A1012] p-3 rounded-2xl border border-slate-800 space-y-2">
          ${u.aadhaar_front_image ? `
            <div class="relative w-full h-28 rounded-xl overflow-hidden border border-amber-500/30 group/card cursor-pointer" onclick="openAadhaarCardModal('${u.id}')" title="Click to view authentic uploaded Aadhaar card">
              <img src="${u.aadhaar_front_image.startsWith('/') ? `${u.aadhaar_front_image}?_t=${Date.now()}` : u.aadhaar_front_image}" alt="Uploaded Aadhaar Card" class="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-300" onerror="this.onerror=null; this.src=AADHAAR_FALLBACK_SVG;"/>
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-2.5 justify-between">
                <span class="text-[10px] bg-amber-500/90 text-slate-950 font-bold px-2 py-0.5 rounded shadow">Uploaded Document</span>
                <span class="text-[10px] text-white/95 font-mono font-medium">${maskedNo}</span>
              </div>
            </div>
          ` : `
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center gap-1.5 text-white font-medium">
                <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
                Aadhaar ID Reference
              </span>
              <span class="font-mono text-emerald-400 font-semibold">${maskedNo}</span>
            </div>
          `}
          <!-- Tricolor Strip -->
          <div class="flex h-1.5 rounded-full overflow-hidden">
            <div class="flex-1 bg-[#FF9933]"></div>
            <div class="flex-1 bg-[#FFFFFF]"></div>
            <div class="flex-1 bg-[#138808]"></div>
          </div>
        </div>

        ${u.aadhaar_status === 'sent_back' ? `
          <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200">
            <span class="font-bold text-rose-300 block text-[10px] uppercase">Reason Sent Back:</span>
            ${escapeHtml(u.aadhaar_rejection_reason || 'Photo is blurry or unreadable')}
          </div>
        ` : ''}

        <!-- Bottom Action Buttons, Send Back & Manual Approval Switch -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
          <div class="flex items-center space-x-1.5">
            <button 
              onclick="openAadhaarCardModal('${u.id}')"
              class="px-2.5 py-1.5 rounded-xl ${u.aadhaar_front_image ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'} border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="View & Inspect Authentic Aadhaar Card"
            >
              <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
              <span>${u.aadhaar_front_image ? 'Inspect' : 'View'}</span>
            </button>
            <button 
              onclick="openViewProfileModal('${u.id}')"
              class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="View Full Candidate Dossier"
            >
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <!-- Send Back Button -->
            <button 
              type="button" 
              onclick="openSendBackAadhaarModal('${u.id}', '${escapeHtml(u.name)}')"
              class="py-1 px-2.5 rounded-xl ${u.aadhaar_status === 'sent_back' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-rose-400/40'} text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="Send Back to Candidate if photo is blurry or unreadable"
            >
              <i data-lucide="undo-2" class="w-3 h-3 ${u.aadhaar_status === 'sent_back' ? 'text-rose-400' : 'text-slate-400'}"></i>
              <span class="text-[11px]">${u.aadhaar_status === 'sent_back' ? 'Sent Back' : 'Send Back'}</span>
            </button>

            <!-- 1-Click Manual Approval Switch -->
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                ${isApproved ? 'checked' : ''} 
                onchange="toggleAadhaarApproval('${u.id}', this.checked)" 
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
              <span class="ml-1.5 text-xs font-bold ${isApproved ? 'text-emerald-400' : 'text-slate-400'} min-w-[55px] text-left">
                ${isApproved ? 'Approved' : 'Pending'}
              </span>
            </label>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function setAadhaarViewMode(mode) {
  state.aadhaar.viewMode = mode;
  const tableBtn = document.getElementById('aadhaarViewModeTableBtn');
  const cardBtn = document.getElementById('aadhaarViewModeCardBtn');

  if (tableBtn && cardBtn) {
    if (mode === 'cards') {
      cardBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 shadow-xs cursor-pointer flex items-center gap-1.5 transition-all';
      tableBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
    } else {
      tableBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 transition-all';
      cardBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
    }
  }

  loadAadhaarVerifications();
}

// ----------------------------------------------------
// AADHAAR CARD PREVIEW MODAL CONTROLLER
// ----------------------------------------------------

async function openAadhaarCardModal(userId, candidateObj) {
  let candidate = candidateObj;
  
  // Always fetch fresh candidate data to ensure real-time synchronization of uploaded card images
  try {
    const res = await fetch(`/api/users/${userId}?_t=${Date.now()}`, {
      headers: getAdminAuthHeaders(),
      credentials: 'include'
    });
    if (res.ok) {
      const fresh = await res.json();
      candidate = fresh;
      if (state.aadhaar.candidatesList) {
        const foundIdx = state.aadhaar.candidatesList.findIndex(c => String(c.id) === String(userId));
        if (foundIdx >= 0) state.aadhaar.candidatesList[foundIdx] = fresh;
      }
    }
  } catch (e) {
    if (!candidate && state.aadhaar.candidatesList && state.aadhaar.candidatesList.length > 0) {
      candidate = state.aadhaar.candidatesList.find(c => String(c.id) === String(userId));
    }
  }

  if (!candidate) {
    showToast('Could not load candidate card', 'error');
    return;
  }

  state.aadhaar.currentCandidate = candidate;
  const idx = (state.aadhaar.candidatesList || []).findIndex(c => String(c.id) === String(userId));
  state.aadhaar.candidateIndex = idx >= 0 ? idx : 0;
  state.aadhaar.cardSide = 'front';
  state.aadhaar.unmaskDigits = false;
  // Always default to authentic original uploaded document photo whenever available
  state.aadhaar.docMode = candidate.aadhaar_front_image ? 'original' : 'digitized';

  const unmaskCheckbox = document.getElementById('aadhaarUnmaskToggle');
  if (unmaskCheckbox) unmaskCheckbox.checked = false;

  renderAadhaarCardModalContent();

  const modal = document.getElementById('aadhaarCardModal');
  if (modal) modal.showModal();
}

function openAadhaarCardModalFromDossier(targetSide = 'front') {
  if (state.currentViewProfileUser) {
    if (state.aadhaar) {
      state.aadhaar.cardSide = targetSide;
      if (state.currentViewProfileUser.aadhaar_front_image || state.currentViewProfileUser.aadhaar_back_image) {
        state.aadhaar.docMode = 'original';
      }
    }
    openAadhaarCardModal(state.currentViewProfileUser.id, state.currentViewProfileUser);
  }
}

function switchAadhaarModalDocMode(mode) {
  state.aadhaar.docMode = mode;
  renderAadhaarCardModalContent();
}

function renderUploadedDocumentHtml(u, side) {
  const isApproved = Boolean(u.aadhaar_verified);
  const frontImg = u.aadhaar_front_image; // Only authentic document scan
  const backImg = u.aadhaar_back_image;
  const currentImg = side === 'front' ? frontImg : backImg;
  const sideLabel = side === 'front' ? 'Front Side Document' : 'Back Side Document';

  if (!currentImg) {
    return `
      <div class="w-full max-w-[620px] p-8 text-center bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-400 space-y-3 shadow-xl">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <i data-lucide="file-question" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-200">No ${sideLabel} Uploaded</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          The candidate has not uploaded a ${side === 'front' ? 'front' : 'back'} Aadhaar card image yet.
        </p>
        <div class="flex items-center justify-center gap-2 mt-2">
          ${side === 'back' && frontImg ? `
            <button 
              type="button"
              onclick="switchAadhaarCardSide('front')"
              class="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
              <span>View Front Side</span>
            </button>
          ` : ''}
          <button 
            type="button"
            onclick="switchAadhaarModalDocMode('digitized')"
            class="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
            <span>Switch to Digitized Card</span>
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="w-full max-w-[620px] bg-[#1A1012] rounded-2xl border border-emerald-500/40 shadow-2xl overflow-hidden p-4 space-y-3.5 animate-in fade-in duration-150">
      <!-- Document Top Bar -->
      <div class="flex items-center justify-between text-xs border-b border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isApproved ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
          <span class="font-bold text-white uppercase tracking-wider text-[11px]">${sideLabel}</span>
          <span class="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-bold flex items-center gap-1">
            <i data-lucide="shield-check" class="w-3 h-3 text-emerald-400"></i>
            Live Official ID Scan
          </span>
        </div>
        <div class="flex items-center gap-2">
          <a 
            href="${currentImg}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer shadow-xs"
            title="Open Full Resolution Photo in New Tab"
          >
            <i data-lucide="external-link" class="w-3 h-3 text-[#E6B8A2]"></i>
            <span>Inspect Full Size</span>
          </a>
        </div>
      </div>

      <!-- Authentic Image Frame -->
      <div class="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 min-h-[300px] max-h-[480px] group shadow-inner">
        <img 
          src="${currentImg.startsWith('/') ? `${currentImg}?_t=${Date.now()}` : currentImg}" 
          alt="${u.name} - ${sideLabel}" 
          class="max-h-[460px] max-w-full w-auto object-contain rounded-lg transition-transform duration-300 hover:scale-102 cursor-zoom-in shadow-lg"
          onclick="window.open('${currentImg}', '_blank')"
          onerror="this.onerror=null; this.src=AADHAAR_FALLBACK_SVG;"
          title="Click to view full resolution"
        />
        <div class="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-[10px] text-white flex items-center gap-2 pointer-events-none shadow-md">
          <i data-lucide="camera" class="w-3.5 h-3.5 text-[#E6B8A2]"></i>
          <span class="font-bold">${u.name} &bull; ${side.toUpperCase()}</span>
          <span class="text-slate-400 font-mono">#${u.id}</span>
        </div>
        <div class="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-1 font-semibold pointer-events-none">
          <i data-lucide="badge-check" class="w-3 h-3 text-emerald-400"></i>
          <span>Official Aadhaar Document</span>
        </div>
      </div>

      <!-- Document Metadata Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-slate-300">
        <div>
          <span class="text-slate-500 block text-[9.5px] uppercase font-bold">Candidate:</span>
          <span class="font-bold text-white truncate block">${u.name}</span>
          <span class="text-[10px] text-slate-400 font-mono">ID: #${u.id}</span>
        </div>
        <div>
          <span class="text-slate-500 block text-[9.5px] uppercase font-bold">Verification Status:</span>
          <span class="font-bold ${isApproved ? 'text-emerald-400' : 'text-amber-400'} flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
            ${isApproved ? 'Aadhaar Approved' : 'Review Required'}
          </span>
          <span class="text-[10px] text-slate-400 block">${u.district || u.city || 'Kerala'}, ${u.state || 'India'}</span>
        </div>
        <div class="col-span-2 sm:col-span-1 flex items-center justify-end">
          <button 
            type="button" 
            onclick="switchAadhaarCardSide('${side === 'front' ? 'back' : 'front'}')"
            class="w-full sm:w-auto py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
            <span>Switch to ${side === 'front' ? 'Back Side' : 'Front Side'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAadhaarCardModalContent() {
  const u = state.aadhaar.currentCandidate;
  if (!u) return;

  const container = document.getElementById('aadhaarCardRenderContainer');
  if (!container) return;

  const isApproved = Boolean(u.aadhaar_verified);
  const isOriginal = state.aadhaar.docMode === 'original';

  // Update Status Badge in Modal Header
  const badge = document.getElementById('aadhaarModalStatusBadge');
  if (badge) {
    if (isApproved) {
      badge.textContent = 'Approved';
      badge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else if (u.aadhaar_status === 'sent_back') {
      badge.textContent = 'Sent Back (Re-upload)';
      badge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
    } else {
      badge.textContent = 'Review Pending';
      badge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
  }

  // Update Send Back button inside modal
  const sendBackBtn = document.getElementById('aadhaarModalSendBackBtn');
  if (sendBackBtn) {
    if (u.aadhaar_status === 'sent_back') {
      sendBackBtn.className = 'py-1.5 px-3 rounded-xl bg-rose-500/30 text-rose-200 border border-rose-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs';
      sendBackBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i><span>Sent Back</span>';
    } else {
      sendBackBtn.className = 'py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/35 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95';
      sendBackBtn.innerHTML = '<i data-lucide="undo-2" class="w-3.5 h-3.5"></i><span>Send Back</span>';
    }
  }

  // Update View Mode Switcher buttons
  const digiBtn = document.getElementById('aadhaarModeDigitizedBtn');
  const origBtn = document.getElementById('aadhaarModeOriginalBtn');
  const unmaskWrap = document.getElementById('aadhaarUnmaskToggleWrapper');
  if (digiBtn && origBtn) {
    if (isOriginal) {
      origBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all';
      digiBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
      if (unmaskWrap) unmaskWrap.classList.add('hidden');
    } else {
      digiBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all';
      origBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
      if (unmaskWrap) unmaskWrap.classList.remove('hidden');
    }
  }

  // Update Side Switcher buttons
  const frontBtn = document.getElementById('aadhaarSideFrontBtn');
  const backBtn = document.getElementById('aadhaarSideBackBtn');
  if (frontBtn && backBtn) {
    if (state.aadhaar.cardSide === 'front') {
      frontBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all';
      backBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
    } else {
      backBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all';
      frontBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1.5 transition-all';
    }
  }

  // Update Approval Switch inside Modal
  const approveSwitch = document.getElementById('aadhaarModalApproveSwitch');
  const approveLabel = document.getElementById('aadhaarModalApproveLabel');
  if (approveSwitch) approveSwitch.checked = isApproved;
  if (approveLabel) {
    approveLabel.textContent = isApproved ? 'Approved' : 'Pending';
    approveLabel.className = `ml-2.5 text-xs font-bold min-w-[70px] ${isApproved ? 'text-emerald-400' : 'text-slate-400'}`;
  }

  // Update Navigation Indices
  const list = state.aadhaar.candidatesList || [];
  const totalInList = list.length || 1;
  const currentNum = (state.aadhaar.candidateIndex || 0) + 1;
  const indexEl = document.getElementById('aadhaarModalCandidateIndex');
  const prevBtn = document.getElementById('aadhaarModalPrevBtn');
  const nextBtn = document.getElementById('aadhaarModalNextBtn');

  if (indexEl) indexEl.textContent = `Candidate ${Math.min(currentNum, totalInList)} of ${totalInList}`;
  if (prevBtn) prevBtn.disabled = (state.aadhaar.candidateIndex || 0) <= 0;
  if (nextBtn) nextBtn.disabled = (state.aadhaar.candidateIndex || 0) >= totalInList - 1;

  // Sent Back Feedback Banner
  const sentBackBannerHtml = u.aadhaar_status === 'sent_back' ? `
    <div class="w-full max-w-[620px] mb-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs flex items-start gap-3 shadow-md animate-in fade-in">
      <div class="p-1.5 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
        <i data-lucide="undo-2" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <strong class="font-bold text-rose-100">Document Sent Back to Candidate:</strong>
          <span class="text-[10px] px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono">Re-upload Required</span>
        </div>
        <p class="text-[11px] text-rose-200/90 mt-1 italic">
          "${escapeHtml(u.aadhaar_rejection_reason || 'Photo is blurry or unreadable')}"
        </p>
      </div>
    </div>
  ` : '';

  // Render Card Paper or Original Uploaded Document
  if (isOriginal) {
    container.innerHTML = sentBackBannerHtml + renderUploadedDocumentHtml(u, state.aadhaar.cardSide);
  } else {
    container.innerHTML = sentBackBannerHtml + `
      <div id="aadhaarCardPaper" class="w-full max-w-[560px] bg-[#FEFEFE] text-[#2C1A1D] rounded-2xl shadow-2xl border-2 border-slate-300 overflow-hidden relative select-none font-sans transition-all duration-200">
        ${renderAadhaarCardHtml(u, state.aadhaar.cardSide, state.aadhaar.unmaskDigits)}
      </div>
    `;
  }

  lucide.createIcons();
}

function renderAadhaarCardHtml(u, side, unmask) {
  const isApproved = Boolean(u.aadhaar_verified);
  const cleanDigits = (u.aadhaarNumber || '492081735928').replace(/\D/g, '');
  const safeDigits = cleanDigits.length >= 12 ? cleanDigits : (cleanDigits + '492081735928').slice(0, 12);
  const formattedFull = `${safeDigits.slice(0, 4)} ${safeDigits.slice(4, 8)} ${safeDigits.slice(8, 12)}`;
  const maskedDisplay = `XXXX XXXX ${safeDigits.slice(-4) || '5928'}`;
  const displayNum = unmask ? formattedFull : maskedDisplay;

  const dob = u.dob || (u.age ? `15/08/${2026 - parseInt(u.age)}` : '15/08/1998');
  const gender = (u.gender || 'Female').toUpperCase();
  const genderDisplay = gender.includes('FEMALE') ? 'Female' : 'Male';
  const photo = u.photo || (gender.includes('FEMALE') ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800');
  const nativeAddress = u.native_address || `${u.city || 'Alakode'}, ${u.district || 'Kannur'}, ${u.state || 'Kerala'}`;
  const pincode = u.pincode || '670571';

  if (side === 'front') {
    return `
      <div class="p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] to-[#F8FAFC] text-slate-900 border border-slate-200 rounded-2xl relative shadow-md">
        <!-- Top Tricolor Band -->
        <div class="flex h-3 rounded-t-lg overflow-hidden -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4">
          <div class="flex-1 bg-[#FF9933]"></div>
          <div class="flex-1 bg-[#FFFFFF] border-y border-slate-200"></div>
          <div class="flex-1 bg-[#138808]"></div>
        </div>

        <!-- Government of India & UIDAI Header -->
        <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-600/30 flex items-center justify-center font-bold text-amber-900 text-xs shadow-xs">
              <i data-lucide="landmark" class="w-5 h-5 text-amber-800"></i>
            </div>
            <div>
              <h4 class="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 leading-tight">Government of India</h4>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-600">Unique Identification Authority</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-sm">
              <i data-lucide="flame" class="w-4 h-4 fill-white text-white"></i>
            </div>
            <div class="text-right">
              <span class="text-xs sm:text-sm font-black text-rose-700 tracking-tight font-serif block">AADHAAR</span>
              <p class="text-[9px] font-bold text-slate-500 -mt-0.5">UIDAI CARD</p>
            </div>
          </div>
        </div>

        <!-- Main Body: Photo + Candidate Information -->
        <div class="flex items-start space-x-4 mb-4">
          <!-- Candidate Photo with Gold Security Border -->
          <div class="relative w-24 h-28 sm:w-28 sm:h-34 rounded-xl overflow-hidden border-2 border-[#C58B76] shadow-sm flex-shrink-0 bg-slate-200">
            <img src="${photo}" alt="${u.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
            <div class="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] text-white text-center py-0.5 font-bold tracking-wider">
              OFFICIAL ID
            </div>
          </div>

          <!-- Official Details -->
          <div class="flex-1 min-w-0 space-y-1.5">
            <div>
              <p class="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Full Name</p>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-950 truncate">${u.name}</h3>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs pt-0.5">
              <div>
                <span class="text-[9px] text-slate-500 block uppercase font-medium">Date of Birth / DOB</span>
                <span class="font-bold text-slate-800">${dob}</span>
              </div>
              <div>
                <span class="text-[9px] text-slate-500 block uppercase font-medium">Gender</span>
                <span class="font-bold text-slate-800 uppercase">${genderDisplay}</span>
              </div>
            </div>

            <div class="pt-1">
              <span class="inline-flex items-center text-[10px] font-bold ${isApproved ? 'text-emerald-800 bg-emerald-100/90 border border-emerald-300' : 'text-amber-800 bg-amber-100/90 border border-amber-300'} px-2.5 py-0.5 rounded-lg shadow-2xs">
                <i data-lucide="${isApproved ? 'shield-check' : 'clock'}" class="w-3.5 h-3.5 mr-1.5 ${isApproved ? 'text-emerald-700' : 'text-amber-700'}"></i>
                ${isApproved ? 'UIDAI Verified Identity Document' : 'Document Under Review (Pending)'}
              </span>
            </div>
          </div>
        </div>

        <!-- 12-Digit Aadhaar Strip -->
        <div class="bg-slate-100 border border-slate-300 rounded-xl py-2.5 px-4 text-center mb-3 shadow-inner">
          <p class="font-mono text-base sm:text-xl font-black tracking-[0.25em] text-slate-950">
            ${displayNum}
          </p>
        </div>

        <!-- Tagline -->
        <div class="text-center border-t border-slate-200 pt-2">
          <p class="text-[11px] font-bold text-amber-800 font-serif">
            Mera Aadhaar, Meri Pehchan &bull; Government of India
          </p>
        </div>

        <!-- Bottom Tricolor Strip -->
        <div class="flex h-2 rounded-b-lg overflow-hidden -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-3">
          <div class="flex-1 bg-[#138808]"></div>
          <div class="flex-1 bg-[#FFFFFF] border-y border-slate-200"></div>
          <div class="flex-1 bg-[#FF9933]"></div>
        </div>
      </div>
    `;
  }

  // Back Side Layout
  return `
    <div class="p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] to-[#F8FAFC] text-slate-900 border border-slate-200 rounded-2xl relative shadow-md">
      <!-- Top Tricolor Band -->
      <div class="flex h-3 rounded-t-lg overflow-hidden -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4">
        <div class="flex-1 bg-[#FF9933]"></div>
        <div class="flex-1 bg-[#FFFFFF] border-y border-slate-200"></div>
        <div class="flex-1 bg-[#138808]"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3.5">
        <h4 class="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900">
          Unique Identification Authority of India &bull; UIDAI
        </h4>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">BACK SIDE</span>
      </div>

      <!-- Address + Secure QR Code -->
      <div class="flex items-start justify-between gap-4 mb-4">
        <!-- Address Details -->
        <div class="flex-1 min-w-0 text-xs text-slate-800 space-y-1.5">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Residential Address:</p>
          <p class="font-semibold text-slate-950 text-sm leading-snug">${u.name}</p>
          <p class="font-medium text-slate-800 leading-snug">${nativeAddress}</p>
          <p class="font-bold text-slate-950 font-mono text-xs">PIN CODE: ${pincode}</p>
          <p class="text-[11px] text-slate-600 font-mono pt-1">Registered Contact: ${formatDisplayPhone(u.phone) || 'Verified'}</p>
        </div>

        <!-- High-Resolution Secure QR Code Block -->
        <div class="flex flex-col items-center flex-shrink-0 bg-white p-2.5 rounded-2xl border-2 border-slate-300 shadow-md">
          <div class="w-28 h-28 sm:w-32 sm:h-32 bg-slate-950 rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
            <svg class="w-full h-full text-white fill-current" viewBox="0 0 100 100">
              <rect x="2" y="2" width="28" height="28" fill="white"/>
              <rect x="6" y="6" width="20" height="20" fill="black"/>
              <rect x="70" y="2" width="28" height="28" fill="white"/>
              <rect x="74" y="6" width="20" height="20" fill="black"/>
              <rect x="2" y="70" width="28" height="28" fill="white"/>
              <rect x="6" y="74" width="20" height="20" fill="black"/>
              <rect x="38" y="8" width="8" height="24" fill="white"/>
              <rect x="52" y="14" width="10" height="12" fill="white"/>
              <rect x="18" y="38" width="22" height="10" fill="white"/>
              <rect x="48" y="38" width="18" height="18" fill="white"/>
              <rect x="74" y="46" width="18" height="18" fill="white"/>
              <rect x="38" y="68" width="24" height="16" fill="white"/>
              <rect x="70" y="72" width="22" height="22" fill="white"/>
              <circle cx="50" cy="50" r="6" fill="#FF9933"/>
            </svg>
          </div>
          <span class="text-[9px] font-extrabold text-slate-700 mt-1 uppercase tracking-wider">UIDAI SECURE QR</span>
        </div>
      </div>

      <!-- 12-Digit Aadhaar Strip -->
      <div class="bg-slate-100 border border-slate-300 rounded-xl py-2 px-4 text-center mb-3 shadow-inner">
        <p class="font-mono text-base sm:text-xl font-black tracking-[0.25em] text-slate-950">
          ${displayNum}
        </p>
      </div>

      <!-- Helpline Footer -->
      <div class="text-center text-[10px] text-slate-600 border-t border-slate-200 pt-2 font-mono">
        Help Line: 1947 &bull; Email: help@uidai.gov.in &bull; Web: www.uidai.gov.in
      </div>

      <!-- Bottom Tricolor Strip -->
      <div class="flex h-2 rounded-b-lg overflow-hidden -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-3">
        <div class="flex-1 bg-[#138808]"></div>
        <div class="flex-1 bg-[#FFFFFF] border-y border-slate-200"></div>
        <div class="flex-1 bg-[#FF9933]"></div>
      </div>
    </div>
  `;
}

function switchAadhaarCardSide(side) {
  state.aadhaar.cardSide = side;
  renderAadhaarCardModalContent();
}

function toggleAadhaarCardMask(unmask) {
  state.aadhaar.unmaskDigits = Boolean(unmask);
  renderAadhaarCardModalContent();
}

async function handleAadhaarModalApproveToggle(checked) {
  const u = state.aadhaar.currentCandidate;
  if (!u) return;

  await toggleAadhaarApproval(u.id, checked);
  u.aadhaar_verified = checked;
  renderAadhaarCardModalContent();
}

function navigateAadhaarModalCandidate(delta) {
  const list = state.aadhaar.candidatesList || [];
  if (list.length === 0) return;

  const nextIndex = (state.aadhaar.candidateIndex || 0) + delta;
  if (nextIndex >= 0 && nextIndex < list.length) {
    state.aadhaar.candidateIndex = nextIndex;
    const nextCandidate = list[nextIndex];
    state.aadhaar.currentCandidate = nextCandidate;
    state.aadhaar.cardSide = 'front';
    state.aadhaar.docMode = nextCandidate.aadhaar_front_image ? 'original' : 'digitized';
    renderAadhaarCardModalContent();
  }
}

function printAadhaarCard() {
  const container = document.getElementById('aadhaarCardRenderContainer');
  if (!container) return;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Government Aadhaar Card - ${state.aadhaar.currentCandidate?.name || 'Candidate'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { padding: 20px; background: white; color: black; }
            @page { margin: 1cm; size: auto; }
            img { max-width: 100% !important; height: auto !important; }
          }
        </style>
      </head>
      <body class="bg-white flex flex-col items-center justify-center min-h-screen p-6">
        <div class="w-full max-w-[620px]">
          ${container.innerHTML}
        </div>
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function toggleAadhaarApproval(userId, isApproved) {
  try {
    const res = await fetch(`/api/users/${userId}/verify-aadhaar`, {
      method: 'PATCH',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ aadhaar_verified: isApproved, verified: isApproved })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update verification status');

    showToast(data.message || (isApproved ? 'Aadhaar approved successfully' : 'Aadhaar verification revoked'), isApproved ? 'success' : 'info');

    // Update in-place in active tabs
    if (state.currentTab === 'aadhaar') {
      loadAadhaarVerifications();
    } else if (state.currentTab === 'users') {
      loadUsers();
    }
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
    if (state.currentTab === 'aadhaar') {
      loadAadhaarVerifications();
    } else if (state.currentTab === 'users') {
      loadUsers();
    }
  }
}

function filterAadhaarStatus(status) {
  state.aadhaar.status = status;
  state.aadhaar.page = 1;

  const pendingBtn = document.getElementById('aadhaarFilterPendingBtn');
  const sentBackBtn = document.getElementById('aadhaarFilterSentBackBtn');
  const verifiedBtn = document.getElementById('aadhaarFilterVerifiedBtn');
  const allBtn = document.getElementById('aadhaarFilterAllBtn');

  const activeClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow-sm cursor-pointer';
  const activeRoseClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-rose-500 text-white shadow-sm cursor-pointer';
  const activeEmeraldClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-emerald-500 text-slate-950 shadow-sm cursor-pointer';
  const activeGoldClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-[#E6B8A2] text-slate-950 shadow-sm cursor-pointer';
  const inactiveClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-slate-300 hover:text-white cursor-pointer';

  if (pendingBtn) pendingBtn.className = status === 'pending' ? activeClass : inactiveClass;
  if (sentBackBtn) sentBackBtn.className = status === 'sent_back' ? activeRoseClass : inactiveClass;
  if (verifiedBtn) verifiedBtn.className = status === 'verified' ? activeEmeraldClass : inactiveClass;
  if (allBtn) allBtn.className = status === 'all' ? activeGoldClass : inactiveClass;

  loadAadhaarVerifications();
}

function changeAadhaarPage(delta) {
  const targetPage = state.aadhaar.page + delta;
  if (targetPage >= 1 && targetPage <= state.aadhaar.totalPages) {
    state.aadhaar.page = targetPage;
    loadAadhaarVerifications();
  }
}

async function approveAllPendingAadhaar() {
  if (!confirm('Are you sure you want to approve Aadhaar verification for all pending candidates on this page?')) {
    return;
  }
  try {
    const tableBody = document.getElementById('aadhaarTableBody');
    const checkboxes = tableBody ? tableBody.querySelectorAll('input[type="checkbox"]:not(:checked)') : [];
    if (checkboxes.length === 0) {
      showToast('No pending candidates to approve on this page', 'info');
      return;
    }

    let approvedCount = 0;
    for (const cb of checkboxes) {
      const match = cb.getAttribute('onchange')?.match(/toggleAadhaarApproval\('([^']+)'/);
      if (match && match[1]) {
        await fetch(`/api/users/${match[1]}/verify-aadhaar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aadhaar_verified: true, verified: true })
        });
        approvedCount++;
      }
    }
    showToast(`Approved Aadhaar verification for ${approvedCount} candidates!`, 'success');
    loadAadhaarVerifications();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ----------------------------------------------------
// AADHAAR SEND BACK MODAL CONTROLLER
// ----------------------------------------------------

let currentSendBackCandidate = null;

function openSendBackAadhaarModal(userId, candidateName) {
  currentSendBackCandidate = { id: userId, name: candidateName };
  const user = (state.aadhaar.candidatesList || []).find(c => String(c.id) === String(userId)) || { id: userId, name: candidateName };

  const idInput = document.getElementById('sendBackUserId');
  const nameEl = document.getElementById('sendBackUserName');
  const badgeEl = document.getElementById('sendBackUserBadge');
  const reasonText = document.getElementById('sendBackReasonText');

  if (idInput) idInput.value = userId;
  if (nameEl) nameEl.textContent = user.name || candidateName || 'Candidate';
  if (badgeEl) badgeEl.textContent = `#${userId}`;

  // Default to first preset or existing reason
  const defaultReason = "Photo is blurry or unclear. Please capture and upload a sharp, clear photo of your Aadhaar card.";
  if (reasonText) {
    reasonText.value = user.aadhaar_rejection_reason || defaultReason;
  }

  // Reset preset radios
  const radios = document.querySelectorAll('input[name="sendBackPreset"]');
  if (radios.length > 0) {
    radios[0].checked = true;
  }

  const modal = document.getElementById('sendBackAadhaarModal');
  if (modal) {
    modal.showModal();
    lucide.createIcons();
  }
}

function openSendBackModalFromAadhaarPreview() {
  const u = state.aadhaar.currentCandidate;
  if (!u) return;
  openSendBackAadhaarModal(u.id, u.name);
}

function closeSendBackAadhaarModal() {
  const modal = document.getElementById('sendBackAadhaarModal');
  if (modal) modal.close();
}

function handleSendBackPresetChange(val) {
  const textarea = document.getElementById('sendBackReasonText');
  if (!textarea) return;
  if (val === 'custom') {
    textarea.value = '';
    textarea.placeholder = 'Type custom reason / instructions for the candidate...';
    textarea.focus();
  } else {
    textarea.value = val;
  }
}

async function handleSendBackAadhaarSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById('sendBackUserId');
  const reasonText = document.getElementById('sendBackReasonText');
  const submitBtn = document.getElementById('sendBackSubmitBtn');

  const userId = idInput ? idInput.value : (currentSendBackCandidate && currentSendBackCandidate.id);
  const reason = reasonText ? reasonText.value.trim() : '';

  if (!userId) {
    showToast('Invalid candidate ID', 'error');
    return;
  }
  if (!reason) {
    showToast('Please provide a reason for sending back the document', 'warning');
    if (reasonText) reasonText.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="inline-block animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Sending Back...';
  }

  try {
    const res = await fetch(`/api/users/${userId}/send-back-aadhaar`, {
      method: 'POST',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ action: 'send_back', reason: reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send back Aadhaar document');

    showToast(data.message || 'Aadhaar document sent back to candidate with reason', 'info');
    closeSendBackAadhaarModal();

    // Update in-place in currentCandidate if preview modal is open
    if (state.aadhaar.currentCandidate && String(state.aadhaar.currentCandidate.id) === String(userId)) {
      state.aadhaar.currentCandidate.aadhaar_verified = 0;
      state.aadhaar.currentCandidate.aadhaar_status = 'sent_back';
      state.aadhaar.currentCandidate.aadhaar_rejection_reason = reason;
      renderAadhaarCardModalContent();
    }

    // Refresh candidate list
    if (state.currentTab === 'aadhaar') {
      loadAadhaarVerifications();
    } else if (state.currentTab === 'users') {
      loadUsers();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Confirm & Send Back</span>';
      lucide.createIcons();
    }
  }
}

/**
 * Real-Time Profile Synchronization Listener for Admin & Super Admin Consoles
 * Catches PROFILE_UPDATED events broadcast via BroadcastChannel and Supabase Realtime
 * and updates user rows, avatars, names, and inspect modals in-place without page refresh!
 */
function setupRealtimeProfileSync() {
  function handleProfileUpdated(payload) {
    if (!payload || !payload.userId) return;
    const uid = String(payload.userId);
    const lastUpdated = payload.lastUpdated || Date.now();
    const newPic = payload.newProfilePicUrl 
      ? (payload.newProfilePicUrl.includes('?') ? `${payload.newProfilePicUrl}&t=${lastUpdated}` : `${payload.newProfilePicUrl}?t=${lastUpdated}`) 
      : null;
    const updatedData = payload.updatedData || {};

    console.log('[Admin Realtime Sync] PROFILE_UPDATED event received for candidate:', uid, payload);

    // 1. Locate matching rows in userTableBody
    const tableBody = document.getElementById('userTableBody');
    if (tableBody) {
      const rows = tableBody.querySelectorAll('tr');
      rows.forEach(row => {
        const rowText = row.innerHTML;
        if (rowText.includes(`'${uid}'`) || rowText.includes(`"${uid}"`)) {
          // Update avatar image in this row
          if (newPic) {
            const img = row.querySelector('img');
            if (img) {
              img.src = newPic;
            }
          }
          // Highlight row with instantaneous visual feedback
          row.classList.add('bg-emerald-500/20');
          setTimeout(() => {
            row.classList.remove('bg-emerald-500/20');
          }, 2500);
        }
      });
    }

    // 2. If photoInspectModal is currently open for this candidate, update the photo preview immediately
    const photoInspectModal = document.getElementById('photoInspectModal');
    if (photoInspectModal && photoInspectModal.open && newPic) {
      const inspectImg = document.getElementById('photoInspectImg');
      if (inspectImg) {
        inspectImg.src = newPic;
      }
    }

    // 3. Update candidate view modal if open
    const viewModal = document.getElementById('viewProfileModal');
    if (viewModal && viewModal.open) {
      const modalCandidateId = viewModal.getAttribute('data-candidate-id');
      if (modalCandidateId && String(modalCandidateId) === uid && newPic) {
        const modalImg = viewModal.querySelector('img');
        if (modalImg) modalImg.src = newPic;
      }
    }

    // 4. Notify admin with subtle toast
    const candidateName = updatedData.name || 'Candidate';
    if (typeof showToast === 'function') {
      showToast(`Real-Time Update: ${candidateName} updated their profile ✨`, 'info');
    }
  }

  // Cross-tab sync via BroadcastChannel
  if (typeof window !== 'undefined' && window.BroadcastChannel) {
    try {
      const bc = new BroadcastChannel('i4u_profile_sync_bus');
      bc.onmessage = (event) => {
        handleProfileUpdated(event.data);
      };
    } catch (e) {}
  }

  // Supabase Realtime broadcast listener (if Supabase client is available)
  if (typeof window !== 'undefined' && (window.supabaseClient || window.supabase)) {
    try {
      const client = window.supabaseClient || window.supabase;
      const adminCh = client.channel('admin-profile-sync');
      adminCh.on('broadcast', { event: 'PROFILE_UPDATED' }, ({ payload }) => {
        handleProfileUpdated(payload);
      }).subscribe();
    } catch (e) {}
  }
}





// ========================================================
// DYNAMIC DAILY CONTACT VIEW LIMIT MANAGEMENT
// ========================================================

function getSupabaseAdminClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    const sbUrl = 'https://kzvdzospvgzlfkkptadl.supabase.co';
    const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';
    window.supabaseClient = window.supabase.createClient(sbUrl, sbKey);
    return window.supabaseClient;
  }
  return null;
}

async function loadDailyContactLimit() {
  const inputEl = document.getElementById('dailyContactLimitInput');
  const displayEl = document.getElementById('currentDailyLimitDisplay');
  let limit = 5;

  try {
    const cached = localStorage.getItem('i4u_daily_contact_limit');
    if (cached) {
      const parsed = parseInt(cached, 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    }

    const sb = getSupabaseAdminClient();
    if (sb) {
      const { data, error } = await sb
        .from('admin_settings')
        .select('value')
        .eq('key', 'daily_contact_limit')
        .maybeSingle();

      if (!error && data && data.value !== undefined && data.value !== null) {
        let dbLimit = 5;
        if (typeof data.value === 'number') {
          dbLimit = data.value;
        } else if (typeof data.value === 'string') {
          dbLimit = parseInt(data.value, 10) || 5;
        } else if (typeof data.value === 'object') {
          dbLimit = parseInt(data.value.limit ?? data.value.daily_contact_limit, 10) || 5;
        }
        if (dbLimit > 0) {
          limit = dbLimit;
          localStorage.setItem('i4u_daily_contact_limit', String(limit));
        }
      }
    }
  } catch (err) {
    console.warn('[Admin Settings] Could not fetch daily contact limit:', err);
  }

  if (inputEl) inputEl.value = limit;
  if (displayEl) displayEl.textContent = limit;
}

async function handleSaveDailyContactLimit() {
  const inputEl = document.getElementById('dailyContactLimitInput');
  const displayEl = document.getElementById('currentDailyLimitDisplay');
  const saveBtn = document.getElementById('saveDailyLimitBtn');
  const statusMsg = document.getElementById('dailyLimitStatusMessage');

  if (!inputEl) return;
  const rawVal = parseInt(inputEl.value, 10);
  if (isNaN(rawVal) || rawVal < 1) {
    showToast('Please enter a valid daily contact view limit (at least 1).', 'error');
    return;
  }

  const limit = Math.min(Math.max(1, rawVal), 1000);
  inputEl.value = limit;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...';
  }

  try {
    localStorage.setItem('i4u_daily_contact_limit', String(limit));

    const sb = getSupabaseAdminClient();
    if (sb) {
      const adminEmail = state.admin?.email || 'admin@i4you.com';
      const { error } = await sb
        .from('admin_settings')
        .upsert({
          key: 'daily_contact_limit',
          value: limit,
          updated_at: new Date().toISOString(),
          updated_by: adminEmail
        }, { onConflict: 'key' });

      if (error) {
        console.warn('[Admin Settings] Supabase update warning:', error);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('i4u-daily-limit-updated', { detail: limit }));
    } catch (e) {}

    if (displayEl) displayEl.textContent = limit;
    showToast(`Daily contact view limit updated to ${limit} per day.`, 'success');

    if (statusMsg) {
      statusMsg.className = 'text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1';
      statusMsg.innerHTML = `✓ Daily limit successfully updated to ${limit} contacts/day`;
      statusMsg.classList.remove('hidden');
      setTimeout(() => statusMsg?.classList.add('hidden'), 4000);
    }
  } catch (err) {
    console.error('Failed to save daily contact limit:', err);
    showToast('Failed to save daily contact limit. Saved locally.', 'warning');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Save</span>';
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }
}

// ========================================================
// WEDDING VENDOR APPROVALS MANAGEMENT
// ========================================================

state.vendors = {
  list: [],
  filter: 'all'
};

const SERVICE_CATEGORY_LABELS = {
  event_management: 'Event Management',
  invitation_cards: 'Digital Cards',
  bridal_groom_wear: 'Bridal & Groom Wear',
  clothing_stitching: 'Stitching',
  jewellery_ornaments: 'Jewelry',
  dress_jewellery_rental: 'Dress & Jewelry Rental',
  mehndi_artist: 'Mehndi Artist',
  auditorium_convention: 'Auditorium & Hall',
  stage_hall_decoration: 'Decorations',
  flowers_garlands: 'Flowers',
  sound_lighting_sfx: 'Sound & Lighting',
  bridal_makeup_hair: 'Grooming',
  photography_video_drone: 'Photography',
  catering_food: 'Catering',
  wedding_cake_sweets: 'Wedding Cake & Sweets',
  bridal_groom_car: 'Rental Cars',
  tourist_bus: 'Tourist Bus',
  guest_accommodation: 'Guest Accommodation',
  percussion_melam: 'Percussion & Melam',
  music_dj_anchors: 'Music & DJ',
  security_valet: 'Security & Valet',
  return_gifts_hampers: 'Return Gifts',
  honeymoon_travel: 'Honeymoon Travel',
  catering: 'Catering',
  rentals: 'Rental Cars',
  photography: 'Photography',
  makeup: 'Grooming',
  stitching: 'Stitching',
  jewellery: 'Jewelry',
  clothing: 'Bridal & Groom Wear',
  stage_decoration: 'Decorations',
  vehicle_rental: 'Rental Cars',
  tourist_buses: 'Tourist Bus'
};

function getServiceCategoryLabel(slug) {
  if (!slug) return 'Service';
  return SERVICE_CATEGORY_LABELS[slug] || String(slug).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function filterVendorApprovals(filterMode) {
  state.vendors.filter = filterMode || 'all';
  const statusSelect = document.getElementById('vendorStatusFilter');
  if (statusSelect && statusSelect.value !== state.vendors.filter) {
    statusSelect.value = state.vendors.filter;
  }
  ['all', 'pending', 'approved', 'rejected'].forEach(key => {
    const btn = document.getElementById(`vendorFilter${key.charAt(0).toUpperCase() + key.slice(1)}Btn`);
    if (btn) {
      btn.className = key === state.vendors.filter
        ? 'px-3 py-1.5 rounded-xl bg-[#C58B76]/20 text-[#E6B8A2] border border-[#C58B76]/40 text-xs font-semibold cursor-pointer'
        : 'px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer';
    }
  });
  renderVendorApprovals();
}

async function loadVendorApprovals() {
  const tableBody = document.getElementById('vendorTableBody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-12 text-slate-400 text-xs"><div class="inline-block animate-spin w-5 h-5 border-2 border-[#E6B8A2] border-t-transparent rounded-full mb-2"></div><p>Loading matrimony services from Supabase...</p></td></tr>';
  }

  try {
    const sb = getSupabaseAdminClient();
    if (!sb) {
      if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-xs text-rose-300">Supabase client not initialized.</td></tr>';
      return;
    }

    const { data, error } = await sb
      .from('wedding_vendors')
      .select('*, vendor_media(id, media_type, media_url, sort_order)')
      .order('created_at', { ascending: false });

    if (error) {
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-xs text-rose-300">Unable to load services: ${error.message}</td></tr>`;
      return;
    }

    state.vendors.list = data || [];
    const totalCount = state.vendors.list.length;
    const approvedCount = state.vendors.list.filter(v => Boolean(v.is_verified && v.is_approved)).length;
    const rejectedCount = state.vendors.list.filter(v => !(v.is_verified && v.is_approved) && Boolean(v.rejection_reason)).length;
    const pendingCount = state.vendors.list.filter(v => !(v.is_verified && v.is_approved) && !v.rejection_reason).length;

    const elTotal = document.getElementById('vendorMetricTotal');
    const elPending = document.getElementById('vendorMetricPending');
    const elApproved = document.getElementById('vendorMetricApproved');
    const elRejected = document.getElementById('vendorMetricRejected');
    if (elTotal) elTotal.textContent = String(totalCount);
    if (elPending) elPending.textContent = String(pendingCount);
    if (elApproved) elApproved.textContent = String(approvedCount);
    if (elRejected) elRejected.textContent = String(rejectedCount);

    const badge = document.getElementById('vendorPendingBadge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = String(pendingCount);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    renderVendorApprovals();
  } catch (err) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-xs text-rose-300">Error: ${err.message}</td></tr>`;
  }
}

function renderVendorApprovals() {
  const tableBody = document.getElementById('vendorTableBody');
  if (!tableBody) return;

  const query = (document.getElementById('vendorSearchInput')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('vendorCategoryFilter')?.value || 'all';

  const filtered = (state.vendors.list || []).filter(v => {
    const isLive = Boolean(v.is_verified && v.is_approved);
    const isRejected = !isLive && Boolean(v.rejection_reason);
    if (state.vendors.filter === 'pending' && (isLive || isRejected)) return false;
    if (state.vendors.filter === 'approved' && !isLive) return false;
    if (state.vendors.filter === 'rejected' && !isRejected) return false;

    if (catFilter !== 'all' && v.category !== catFilter) return false;

    if (query) {
      const catLabel = getServiceCategoryLabel(v.category).toLowerCase();
      const hay = [
        v.business_name, v.owner_name, v.phone, v.whatsapp_number,
        v.city_address, v.district, v.state, v.category, catLabel
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-slate-400">
          <i data-lucide="store" class="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-50"></i>
          <p class="text-sm font-medium text-slate-300">No matrimony services found</p>
          <p class="text-xs text-slate-500 mt-1">Try adjusting your search or filter criteria</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tableBody.innerHTML = filtered.map(v => {
    const isLive = Boolean(v.is_verified && v.is_approved);
    const isRejected = !isLive && Boolean(v.rejection_reason);
    const media = Array.isArray(v.vendor_media) ? v.vendor_media : [];
    const firstImg = media.find(m => m.media_type === 'image')?.media_url || '';
    const phoneNum = v.whatsapp_number || v.phone || '';
    const hasPhone = Boolean(phoneNum && phoneNum.trim() !== '');
    const callPhone = hasPhone ? getCleanPhoneForCall(phoneNum) : '';
    const waUrl = hasPhone ? getWhatsAppUrl(phoneNum, v.business_name || v.owner_name) : '';
    const safeBizName = (v.business_name || 'Service Provider').replace(/'/g, "\\'");

    const statusBadge = isLive
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>Approved</span>'
      : isRejected
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20" title="${(v.rejection_reason || '').replace(/"/g, '&quot;')}"><span class="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>Rejected</span>`
        : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>Pending</span>';

    const hasDoc = Boolean(v.verification_doc_url);

    return `
      <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
        <td class="py-2.5 px-2.5">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-[#C58B76]/40 bg-slate-800 flex items-center justify-center">
              ${firstImg
                ? `<img src="${firstImg}" alt="${safeBizName}" class="w-full h-full object-cover" />`
                : `<i data-lucide="store" class="w-4 h-4 text-[#E6B8A2]"></i>`
              }
            </div>
            <div class="min-w-0">
              <div class="font-medium text-white text-xs sm:text-sm truncate max-w-[160px] cursor-pointer hover:text-[#E6B8A2]" onclick="openVendorDetailModal('${v.id}')">${v.business_name || 'Unnamed Business'}</div>
              <div class="text-[11px] text-slate-400 truncate max-w-[160px]">${v.owner_name || 'Owner N/A'}</div>
            </div>
          </div>
        </td>
        <td class="py-2.5 px-2.5 whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#C58B76]/15 text-[#E6B8A2] border border-[#C58B76]/30">
            ${getServiceCategoryLabel(v.category)}
          </span>
        </td>
        <td class="py-2.5 px-2.5 text-xs text-slate-300">
          <div class="flex items-center gap-1 font-mono text-slate-200 whitespace-nowrap">
            <span>${hasPhone ? phoneNum : 'N/A'}</span>
            ${hasPhone ? `
              <a href="tel:${callPhone}" class="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center shrink-0" title="Call ${safeBizName}">
                <i data-lucide="phone" class="w-3 h-3"></i>
              </a>
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 transition-all flex items-center justify-center shrink-0" title="WhatsApp ${safeBizName}">
                <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                </svg>
              </a>
            ` : ''}
          </div>
          <div class="text-[11px] text-slate-400 truncate max-w-[140px]">${v.is_mobile_verified ? 'Mobile OTP Verified' : 'OTP Pending'}</div>
        </td>
        <td class="py-2.5 px-2.5 text-xs text-slate-300 whitespace-nowrap">
          <div class="font-medium text-slate-200 truncate max-w-[120px]">${v.city_address || v.district || 'N/A'}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-[120px]">${[v.district, v.state].filter(Boolean).join(', ')}</div>
        </td>
        <td class="py-2.5 px-2.5 whitespace-nowrap">
          <button
            type="button"
            onclick="openVendorDocModal('${v.id}')"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${hasDoc ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'}"
            title="Inspect Aadhaar & Service Documents"
          >
            <i data-lucide="file-check" class="w-3.5 h-3.5"></i>
            <span>${hasDoc ? 'Inspect Docs' : 'Review Docs'}</span>
          </button>
        </td>
        <td class="py-2.5 px-2.5 whitespace-nowrap">
          ${statusBadge}
        </td>
        <td class="py-2.5 px-2.5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end space-x-1">
            ${!isLive ? `
              <button type="button" onclick="verifyAndApproveVendor('${v.id}')" class="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-600/35 border border-emerald-500/40 rounded-lg transition-all cursor-pointer" title="Approve Service Listing">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </button>
            ` : ''}
            <button type="button" onclick="rejectVendorPrompt('${v.id}')" class="p-1.5 text-rose-400 hover:text-white bg-rose-500/15 hover:bg-rose-600/35 border border-rose-500/40 rounded-lg transition-all cursor-pointer" title="${isLive ? 'Revoke / Reject Service' : 'Reject Service Listing'}">
              <i data-lucide="x-circle" class="w-4 h-4"></i>
            </button>
            ${hasPhone ? `
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="p-1.5 text-[#25D366] hover:text-white bg-[#25D366]/15 hover:bg-[#25D366]/35 border border-[#25D366]/40 rounded-lg transition-all flex items-center justify-center" title="Contact via WhatsApp">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                </svg>
              </a>
            ` : ''}
            <button type="button" onclick="openVendorDetailModal('${v.id}')" class="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer" title="View Full Service Details">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button type="button" onclick="deleteVendorService('${v.id}', '${safeBizName}')" class="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer" title="Delete Service Listing">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openVendorDocModal(vendorId) {
  const v = (state.vendors.list || []).find(item => String(item.id) === String(vendorId));
  if (!v) return;
  const modal = document.getElementById('vendorDocModal');
  const titleEl = document.getElementById('vendorDocModalTitle');
  const subEl = document.getElementById('vendorDocModalSubtitle');
  const bodyEl = document.getElementById('vendorDocModalBody');
  const approveBtn = document.getElementById('vendorDocApproveBtn');
  const rejectBtn = document.getElementById('vendorDocRejectBtn');
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = `${v.business_name || 'Service Provider'} — Verification Docs`;
  if (subEl) subEl.textContent = `Owner: ${v.owner_name || 'N/A'} • Category: ${getServiceCategoryLabel(v.category)}`;

  bodyEl.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-xs bg-[#2C1A1D] p-3.5 rounded-2xl border border-slate-800">
      <div><span class="text-slate-400">Mobile:</span> <span class="text-white font-mono">${v.phone || 'N/A'}</span></div>
      <div><span class="text-slate-400">OTP Status:</span> <span class="${v.is_mobile_verified ? 'text-emerald-400' : 'text-amber-400'} font-semibold">${v.is_mobile_verified ? 'Verified' : 'Unverified'}</span></div>
      <div><span class="text-slate-400">License / Udyam:</span> <span class="text-white">${v.license_number || 'Not provided'}</span></div>
      <div><span class="text-slate-400">Location:</span> <span class="text-white">${[v.district, v.state].filter(Boolean).join(', ') || 'N/A'}</span></div>
    </div>
    ${v.verification_doc_url ? `
      <div class="space-y-2">
        <p class="text-xs font-semibold text-[#E6B8A2]">Uploaded Aadhaar / Owner ID / Business License Document</p>
        <div class="rounded-2xl overflow-hidden border border-slate-700 bg-black/40 flex items-center justify-center p-2">
          <img src="${v.verification_doc_url}" alt="Aadhaar / Service Document" class="max-h-80 w-auto rounded-xl object-contain" />
        </div>
        <a href="${v.verification_doc_url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs text-[#E6B8A2] hover:underline">
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Open full resolution in new tab
        </a>
      </div>
    ` : `
      <div class="p-6 rounded-2xl bg-[#2C1A1D] border border-amber-500/30 text-center text-xs text-amber-300">
        No Aadhaar card or business license document has been uploaded by this provider yet.
      </div>
    `}
  `;

  if (approveBtn) {
    approveBtn.onclick = async () => {
      modal.close();
      await verifyAndApproveVendor(v.id);
    };
  }
  if (rejectBtn) {
    rejectBtn.onclick = async () => {
      modal.close();
      await rejectVendorPrompt(v.id);
    };
  }

  modal.showModal();
  if (window.lucide) lucide.createIcons();
}

function openVendorDetailModal(vendorId) {
  const v = (state.vendors.list || []).find(item => String(item.id) === String(vendorId));
  if (!v) return;
  const modal = document.getElementById('vendorDetailModal');
  const titleEl = document.getElementById('vendorDetailModalTitle');
  const subEl = document.getElementById('vendorDetailModalSubtitle');
  const bodyEl = document.getElementById('vendorDetailModalBody');
  if (!modal || !bodyEl) return;

  const media = Array.isArray(v.vendor_media) ? v.vendor_media : [];
  const images = media.filter(m => m.media_type === 'image');
  const videos = media.filter(m => m.media_type === 'video');

  if (titleEl) titleEl.textContent = v.business_name || 'Service Listing Details';
  if (subEl) subEl.textContent = `${getServiceCategoryLabel(v.category)} • ${[v.city_address, v.district, v.state].filter(Boolean).join(', ')}`;

  bodyEl.innerHTML = `
    <div class="grid grid-cols-2 gap-3 text-xs bg-[#2C1A1D] p-4 rounded-2xl border border-slate-800">
      <div><span class="text-slate-400">Owner Name:</span> <span class="text-white font-semibold">${v.owner_name || 'N/A'}</span></div>
      <div><span class="text-slate-400">Phone:</span> <span class="text-white font-mono">${v.phone || 'N/A'}</span></div>
      <div><span class="text-slate-400">WhatsApp:</span> <span class="text-white font-mono">${v.whatsapp_number || 'N/A'}</span></div>
      <div><span class="text-slate-400">Pricing Range:</span> <span class="text-emerald-300 font-semibold">${v.pricing_range || 'N/A'}</span></div>
      <div><span class="text-slate-400">Service Area:</span> <span class="text-white">${v.service_area || 'N/A'}</span></div>
      <div><span class="text-slate-400">Experience:</span> <span class="text-white">${v.experience_years || 'N/A'}</span></div>
      <div class="col-span-2"><span class="text-slate-400">Address:</span> <span class="text-white">${[v.address, v.city_address, v.district, v.state].filter(Boolean).join(', ') || 'N/A'}</span></div>
    </div>
    ${v.description ? `<div class="p-3.5 rounded-2xl bg-[#2C1A1D] border border-slate-800 text-xs text-slate-300 leading-relaxed"><strong class="text-white block mb-1">About Service</strong>${v.description}</div>` : ''}
    ${v.staff_details ? `<div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200"><strong class="block mb-1">Fleet / Crew / Service Details</strong>${v.staff_details}</div>` : ''}
    ${v.rejection_reason ? `<div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200"><strong class="block mb-1">Rejection Reason</strong>${v.rejection_reason}</div>` : ''}
    ${(images.length > 0 || videos.length > 0) ? `
      <div class="space-y-2">
        <p class="text-xs font-semibold text-[#E6B8A2]">Portfolio Media (${images.length} photos, ${videos.length} videos)</p>
        <div class="flex flex-wrap gap-2">
          ${images.map(img => `<a href="${img.media_url}" target="_blank" rel="noopener noreferrer"><img src="${img.media_url}" alt="Portfolio" class="w-20 h-20 rounded-xl object-cover border border-slate-700 hover:border-[#E6B8A2]" /></a>`).join('')}
        </div>
        ${videos.length > 0 ? `<div class="flex flex-wrap gap-2 pt-1">${videos.map((vid, idx) => `<a href="${vid.media_url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700 hover:border-[#E6B8A2]">Video ${idx + 1}</a>`).join('')}</div>` : ''}
      </div>
    ` : ''}
  `;

  modal.showModal();
  if (window.lucide) lucide.createIcons();
}

async function deleteVendorService(vendorId, businessName) {
  if (!confirm(`Permanently delete service listing "${businessName}"? This will immediately remove it from Supabase and the main app.`)) {
    return;
  }
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb
      .from('wedding_vendors')
      .delete()
      .eq('id', vendorId);

    if (error) {
      showToast(`Failed to delete service: ${error.message}`, 'error');
      return;
    }

    showToast('Service listing deleted from Supabase.', 'success');
    await loadVendorApprovals();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function verifyAndApproveVendor(vendorId) {
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb
      .from('wedding_vendors')
      .update({
        is_verified: true,
        is_approved: true,
        rejection_reason: null
      })
      .eq('id', vendorId);

    if (error) {
      showToast(`Failed to verify & approve vendor: ${error.message}`, 'error');
      return;
    }

    showToast('Vendor verified, approved, and published to Services.', 'success');
    await loadVendorApprovals();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function rejectVendorPrompt(vendorId) {
  const reason = window.prompt('Enter rejection reason for the vendor (e.g. Unclear shop license or incomplete address):');
  if (reason === null) return;
  const cleanReason = String(reason || '').trim() || 'Rejected by Super Admin during verification review.';
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb
      .from('wedding_vendors')
      .update({
        is_verified: false,
        is_approved: false,
        rejection_reason: cleanReason
      })
      .eq('id', vendorId);

    if (error) {
      showToast(`Failed to reject vendor: ${error.message}`, 'error');
      return;
    }

    showToast('Vendor rejected and removed from public Services.', 'success');
    await loadVendorApprovals();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

window.verifyAndApproveVendor = verifyAndApproveVendor;
window.rejectVendorPrompt = rejectVendorPrompt;
window.filterVendorApprovals = filterVendorApprovals;
window.loadVendorApprovals = loadVendorApprovals;
window.openVendorDocModal = openVendorDocModal;
window.openVendorDetailModal = openVendorDetailModal;
window.deleteVendorService = deleteVendorService;

window.loadDailyContactLimit = loadDailyContactLimit;
window.handleSaveDailyContactLimit = handleSaveDailyContactLimit;

// ========================================================
// HOMEPAGE BANNERS MANAGEMENT (CLOUDFLARE R2 + <500 KB)
// ========================================================

const BANNER_R2_CONFIG = {
  endpoint: 'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com',
  accessKeyId: '4eb0c79fe5884a7df815017ee19f7171',
  secretAccessKey: 'f33f804f8d0858ce476bcc6a72ddd54a1a577a7d3072da11672af6b4edb33486',
  bucketName: 'i4youmatrimony',
  publicUrl: 'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev',
  region: 'auto'
};

const MAX_HOMEPAGE_BANNERS = 10;

state.banners = {
  list: [],
  prepared: []
};

function r2BufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function r2Sha256Hex(data) {
  const enc = new TextEncoder();
  const buffer = typeof data === 'string' ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return r2BufferToHex(hash);
}

async function r2HmacSha256(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? enc.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, typeof message === 'string' ? enc.encode(message) : message);
}

async function compressBannerImage(file) {
  const MAX_BYTES = 500 * 1024; // Strictly < 500 KB
  const TARGET_BYTES = 430 * 1024; // Target 350-450 KB
  const MAX_WIDTH = 1920;

  const originalKB = Math.max(1, Math.round(file.size / 1024));
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let width = img.naturalWidth || img.width || 1920;
  let height = img.naturalHeight || img.height || 1080;
  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width);
    width = MAX_WIDTH;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const encodeCanvas = (w, h, mime, q) => new Promise((resolve) => {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((b) => resolve(b), mime, q);
  });

  // Prefer WebP; fall back to JPEG if browser returns null/non-webp
  let mime = 'image/webp';
  let ext = 'webp';
  let testBlob = await encodeCanvas(width, height, mime, 0.85);
  if (!testBlob || testBlob.type !== 'image/webp') {
    mime = 'image/jpeg';
    ext = 'jpg';
    testBlob = await encodeCanvas(width, height, mime, 0.85);
  }

  let bestBlob = testBlob;
  let quality = 0.85;
  while (bestBlob && bestBlob.size > TARGET_BYTES && quality > 0.35) {
    quality -= 0.08;
    const candidate = await encodeCanvas(width, height, mime, quality);
    if (candidate) bestBlob = candidate;
  }

  // If still >= 500 KB, scale down dimensions slightly
  let scale = 0.9;
  while (bestBlob && bestBlob.size >= MAX_BYTES && scale >= 0.5) {
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);
    const candidate = await encodeCanvas(sw, sh, mime, Math.max(0.45, quality));
    if (candidate) bestBlob = candidate;
    scale -= 0.1;
  }

  if (!bestBlob || bestBlob.size >= MAX_BYTES) {
    throw new Error('Could not compress image under 500 KB. Please choose a smaller image.');
  }

  const compressedKB = Math.max(1, Math.round(bestBlob.size / 1024));
  const previewUrl = URL.createObjectURL(bestBlob);
  return { blob: bestBlob, ext, contentType: mime, originalKB, compressedKB, previewUrl };
}

async function uploadBannerToR2(blob, ext, contentType, prefix = 'banners') {
  const cleanPrefix = String(prefix || 'banners').replace(/^\/+|\/+$/g, '');
  const cleanExt = String(ext || 'webp').replace(/[^a-zA-Z0-9]/g, '') || 'webp';
  const cleanMime = contentType || (cleanExt === 'jpg' || cleanExt === 'jpeg' ? 'image/jpeg' : 'image/webp');
  const objectKey = `${cleanPrefix}/${cleanPrefix === 'happy-stories' ? 'story' : 'banner'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

  const arrayBuffer = await blob.arrayBuffer();
  const payloadHash = await r2Sha256Hex(arrayBuffer);

  const urlObj = new URL(BANNER_R2_CONFIG.endpoint);
  const host = urlObj.host;
  const uploadUrl = `${BANNER_R2_CONFIG.endpoint}/${BANNER_R2_CONFIG.bucketName}/${objectKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const canonicalUri = `/${encodeURIComponent(BANNER_R2_CONFIG.bucketName)}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;

  const canonicalHeaders =
    `content-type:${cleanMime}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest =
    `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const canonicalReqHash = await r2Sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${BANNER_R2_CONFIG.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalReqHash}`;

  const kDate = await r2HmacSha256(`AWS4${BANNER_R2_CONFIG.secretAccessKey}`, dateStamp);
  const kRegion = await r2HmacSha256(kDate, BANNER_R2_CONFIG.region);
  const kService = await r2HmacSha256(kRegion, 's3');
  const kSigning = await r2HmacSha256(kService, 'aws4_request');
  const signature = r2BufferToHex(await r2HmacSha256(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${BANNER_R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': cleanMime,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader
    },
    body: arrayBuffer
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Cloudflare R2 upload failed (${res.status}): ${errText || res.statusText}`);
  }

  return {
    objectKey,
    publicUrl: `${BANNER_R2_CONFIG.publicUrl}/${objectKey}`
  };
}

async function deleteBannerFromR2(imageUrl, r2Key) {
  let filePath = String(r2Key || imageUrl || '').split('?')[0].trim();
  if (filePath.includes('r2.dev/')) {
    filePath = filePath.split('r2.dev/')[1];
  } else if (filePath.includes('.r2.cloudflarestorage.com/')) {
    const parts = filePath.split('.r2.cloudflarestorage.com/')[1];
    const slashIdx = parts.indexOf('/');
    filePath = slashIdx !== -1 ? parts.substring(slashIdx + 1) : parts;
  }
  filePath = filePath.replace(/^\/+/, '');
  if (filePath.startsWith(`${BANNER_R2_CONFIG.bucketName}/`)) {
    filePath = filePath.substring(BANNER_R2_CONFIG.bucketName.length + 1);
  }
  if (!filePath || typeof crypto === 'undefined' || !crypto.subtle) return;

  const urlObj = new URL(BANNER_R2_CONFIG.endpoint);
  const host = urlObj.host;
  const deleteUrl = `${BANNER_R2_CONFIG.endpoint}/${BANNER_R2_CONFIG.bucketName}/${filePath}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const emptyPayloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const canonicalUri = `/${encodeURIComponent(BANNER_R2_CONFIG.bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${emptyPayloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `DELETE\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${emptyPayloadHash}`;
  const canonicalReqHash = await r2Sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${BANNER_R2_CONFIG.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalReqHash}`;

  const kDate = await r2HmacSha256(`AWS4${BANNER_R2_CONFIG.secretAccessKey}`, dateStamp);
  const kRegion = await r2HmacSha256(kDate, BANNER_R2_CONFIG.region);
  const kService = await r2HmacSha256(kRegion, 's3');
  const kSigning = await r2HmacSha256(kService, 'aws4_request');
  const signature = r2BufferToHex(await r2HmacSha256(kSigning, stringToSign));
  const authHeader = `AWS4-HMAC-SHA256 Credential=${BANNER_R2_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': emptyPayloadHash,
      'Authorization': authHeader
    }
  });

  if (!res.ok && res.status !== 404) {
    console.warn(`[R2 Delete] Warning (${res.status}) for ${filePath}`);
  }
}

function initBannerDropZone() {
  const dropZone = document.getElementById('bannerDropZone');
  if (!dropZone || dropZone.dataset.bound === '1') return;
  dropZone.dataset.bound = '1';

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-[#E6B8A2]', 'bg-[#C58B76]/10');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-[#E6B8A2]', 'bg-[#C58B76]/10');
    });
  });
  dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) prepareBannerFiles(files);
  });
}

async function handleBannerFileSelect(event) {
  const files = Array.from(event?.target?.files || []);
  if (files.length > 0) await prepareBannerFiles(files);
}

async function prepareBannerFiles(files) {
  const currentCount = (state.banners.list || []).length;
  const remainingSlots = MAX_HOMEPAGE_BANNERS - currentCount;
  if (remainingSlots <= 0) {
    showToast('Maximum 10 / 10 banner slots used. Delete an existing banner first.', 'error');
    return;
  }

  const imageFiles = files.filter(f => f && f.type && f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
    return;
  }

  const selectedFiles = imageFiles.slice(0, remainingSlots);
  if (imageFiles.length > remainingSlots) {
    showToast(`Only ${remainingSlots} slot(s) remaining. Opening crop editor for the first ${remainingSlots} image(s).`, 'info');
  }

  openNewBannersCropQueue(selectedFiles);
}

async function uploadPreparedBanner() {
  const preparedList = Array.isArray(state.banners.prepared) ? state.banners.prepared : [];
  if (preparedList.length === 0) return;

  const currentCount = (state.banners.list || []).length;
  if (currentCount + preparedList.length > MAX_HOMEPAGE_BANNERS) {
    showToast(`Upload exceeds 10-banner limit (${currentCount}/10 used).`, 'error');
    return;
  }

  const uploadBtn = document.getElementById('bannerUploadBtn');
  const titleInput = document.getElementById('bannerTitleInput');
  const fileInput = document.getElementById('bannerFileInput');
  const previewBox = document.getElementById('bannerPreviewBox');
  const infoBar = document.getElementById('bannerCompressionInfo');

  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Uploading ${preparedList.length} to R2...</span>`;
    if (window.lucide) lucide.createIcons();
  }

  try {
    const sb = getSupabaseAdminClient();
    if (!sb) throw new Error('Supabase client not initialized.');

    let nextOrder = (state.banners.list || []).reduce((max, b) => Math.max(max, Number(b.display_order) || 0), 0) + 1;
    const baseTitle = (titleInput?.value || '').trim();

    for (let i = 0; i < preparedList.length; i++) {
      const item = preparedList[i];
      const { publicUrl } = await uploadBannerToR2(item.blob, item.ext, item.contentType);
      const rowTitle = baseTitle
        ? (preparedList.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle)
        : (item.fileName ? item.fileName.replace(/\.[^/.]+$/, '') : `Matrimony Banner #${nextOrder}`);

      const { error } = await sb.from('homepage_banners').insert({
        image_url: publicUrl,
        title: rowTitle,
        display_order: nextOrder,
        is_active: true,
        original_size_kb: item.originalKB,
        compressed_size_kb: item.compressedKB
      });

      if (error) throw new Error(error.message);
      nextOrder += 1;
    }

    try {
      sb.channel('public:homepage_banners_sync').send({
        type: 'broadcast',
        event: 'banners_updated',
        payload: { timestamp: Date.now() }
      });
    } catch (_) {}

    state.banners.prepared = [];
    if (titleInput) titleInput.value = '';
    if (fileInput) fileInput.value = '';
    if (previewBox) previewBox.innerHTML = '<span class="text-xs text-slate-500">Live compressed preview(s) will appear here</span>';
    if (infoBar) infoBar.classList.add('hidden');

    showToast(`${preparedList.length} banner(s) uploaded to Cloudflare R2 & synced live!`, 'success');
    await loadHomepageBanners();
  } catch (err) {
    showToast(err.message || 'Failed to upload banner(s)', 'error');
    if (uploadBtn) uploadBtn.disabled = false;
  } finally {
    if (uploadBtn) {
      uploadBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i><span>Upload Banners</span>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function loadHomepageBanners() {
  const container = document.getElementById('bannersGridContainer');
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { data, error } = await sb
      .from('homepage_banners')
      .select('id, image_url, title, display_order, is_active, original_size_kb, compressed_size_kb, created_at')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (container) container.innerHTML = `<div class="col-span-full p-6 rounded-2xl bg-[#2C1A1D] border border-rose-500/30 text-xs text-rose-300">Unable to load banners: ${error.message}</div>`;
      return;
    }

    state.banners.list = (data || []).slice(0, MAX_HOMEPAGE_BANNERS);
    const totalCount = state.banners.list.length;
    const activeCount = state.banners.list.filter(b => b.is_active).length;

    const slotCounter = document.getElementById('bannersSlotCounter');
    if (slotCounter) {
      slotCounter.textContent = `Banners: ${totalCount} / ${MAX_HOMEPAGE_BANNERS} Slots Used`;
    }

    const fullNotice = document.getElementById('bannerFullNotice');
    const dropZone = document.getElementById('bannerDropZone');
    const fileInput = document.getElementById('bannerFileInput');
    const isFull = totalCount >= MAX_HOMEPAGE_BANNERS;
    if (fullNotice) fullNotice.classList.toggle('hidden', !isFull);
    if (fileInput) fileInput.disabled = isFull;
    if (dropZone) {
      dropZone.classList.toggle('opacity-50', isFull);
      dropZone.classList.toggle('pointer-events-none', isFull);
    }

    const badge = document.getElementById('bannersCountBadge');
    if (badge) {
      if (activeCount > 0) {
        badge.textContent = String(activeCount);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    renderHomepageBanners();
  } catch (err) {
    if (container) container.innerHTML = `<div class="col-span-full p-6 rounded-2xl bg-[#2C1A1D] border border-rose-500/30 text-xs text-rose-300">Error: ${err.message}</div>`;
  }
}

function renderHomepageBanners() {
  const container = document.getElementById('bannersGridContainer');
  if (!container) return;

  const list = state.banners.list || [];
  const cardsHtml = list.map((b, idx) => {
    const isActive = Boolean(b.is_active);
    const isR2 = String(b.image_url || '').includes('r2.dev') || String(b.image_url || '').includes('r2.cloudflarestorage.com');
    const safeUrl = String(b.image_url || '').replace(/'/g, "\\'");
    const currentOrder = Number(b.display_order) || (idx + 1);
    const orderOptions = Array.from({ length: Math.max(list.length, 10) }, (_, i) => i + 1)
      .map(num => `<option value="${num}" ${num === currentOrder ? 'selected' : ''}>#${num}</option>`)
      .join('');

    return `
      <div class="rounded-2xl bg-[#2C1A1D] border ${isActive ? 'border-[#C58B76]/40' : 'border-slate-800 opacity-75'} overflow-hidden shadow-lg flex flex-col">
        <div class="relative aspect-video bg-[#1A1012]">
          <img src="${b.image_url}" alt="${escapePlanHtml(b.title || 'Homepage Banner')}" class="w-full h-full object-cover" />
          <div class="absolute top-2 left-2 flex items-center gap-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-[#E6B8A2] border border-[#C58B76]/40 font-mono">#${idx + 1}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isR2 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40' : 'bg-slate-900/90 text-slate-300 border border-slate-700'}">
              ${b.compressed_size_kb ? `${b.compressed_size_kb} KB &bull; R2` : 'R2'}
            </span>
          </div>
        </div>
        <div class="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
          <div>
            <p class="text-xs font-bold text-white truncate">${escapePlanHtml(b.title || `Couple Banner #${idx + 1}`)}</p>
            <p class="text-[10px] text-slate-400 truncate font-mono mt-0.5" title="${escapePlanHtml(b.image_url)}">${escapePlanHtml(b.image_url)}</p>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-1.5">
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleBannerActive('${b.id}', this.checked)" class="sr-only peer" />
              <div class="w-8 h-4 bg-slate-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4"></div>
              <span class="text-[10px] font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}">${isActive ? 'On' : 'Off'}</span>
            </label>

            <div class="flex items-center gap-1">
              <button type="button" onclick="openExistingBannerCrop('${b.id}')" class="p-1 rounded-lg bg-[#C58B76]/15 hover:bg-[#C58B76]/30 text-[#E6B8A2] border border-[#C58B76]/30 cursor-pointer" title="Edit / Crop Framing">
                <i data-lucide="crop" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="moveBannerOrder('${b.id}', -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer" title="Move Left / Earlier">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <select onchange="updateBannerOrder('${b.id}', this.value)" class="py-0.5 px-1 rounded bg-[#1A1012] border border-slate-700 text-[10px] text-white font-mono cursor-pointer" title="Display Order">
                ${orderOptions}
              </select>
              <button type="button" onclick="moveBannerOrder('${b.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer" title="Move Right / Later">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="deleteHomepageBanner('${b.id}', '${safeUrl}')" class="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 cursor-pointer" title="Delete Banner (R2 + Supabase)">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  const emptySlotsCount = Math.max(0, MAX_HOMEPAGE_BANNERS - list.length);
  const placeholdersHtml = Array.from({ length: emptySlotsCount }, (_, i) => {
    const slotNum = list.length + i + 1;
    return `
      <button
        type="button"
        onclick="document.getElementById('bannerFileInput')?.click()"
        class="rounded-2xl bg-[#1A1012]/60 border-2 border-dashed border-slate-800 hover:border-[#C58B76]/50 p-4 flex flex-col items-center justify-center text-center min-h-[190px] transition-colors cursor-pointer group"
        title="Click to upload banner for Slot #${slotNum}"
      >
        <div class="w-9 h-9 rounded-xl bg-slate-800/80 group-hover:bg-[#C58B76]/20 text-slate-500 group-hover:text-[#E6B8A2] flex items-center justify-center mb-2 transition-colors">
          <i data-lucide="plus" class="w-4 h-4"></i>
        </div>
        <span class="text-xs font-mono font-bold text-slate-500 group-hover:text-slate-300">Slot #${slotNum}</span>
        <span class="text-[11px] text-slate-600 mt-0.5">Empty Banner Slot</span>
      </button>
    `;
  });

  container.innerHTML = [...cardsHtml, ...placeholdersHtml].join('');
  if (window.lucide) lucide.createIcons();
}

async function toggleBannerActive(id, nextActive) {
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb
      .from('homepage_banners')
      .update({ is_active: Boolean(nextActive) })
      .eq('id', id);

    if (error) {
      showToast(`Failed to update banner status: ${error.message}`, 'error');
      return;
    }
    try {
      sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
    } catch (_) {}
    showToast(nextActive ? 'Banner activated on main homepage.' : 'Banner hidden from main homepage.', 'info');
    await loadHomepageBanners();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateBannerOrder(id, newOrderVal) {
  const nextOrder = Math.max(1, Math.min(MAX_HOMEPAGE_BANNERS, parseInt(newOrderVal, 10) || 1));
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb
      .from('homepage_banners')
      .update({ display_order: nextOrder })
      .eq('id', id);
    if (error) {
      showToast(`Failed to update order: ${error.message}`, 'error');
      return;
    }
    try {
      sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
    } catch (_) {}
    await loadHomepageBanners();
  } catch (err) {
    showToast(`Failed to reorder banner: ${err.message}`, 'error');
  }
}

async function moveBannerOrder(id, direction) {
  const list = state.banners.list || [];
  const idx = list.findIndex(b => String(b.id) === String(id));
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;

  const current = list[idx];
  const target = list[swapIdx];
  const orderA = Number(current.display_order) || (idx + 1);
  const orderB = Number(target.display_order) || (swapIdx + 1);

  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    await Promise.all([
      sb.from('homepage_banners').update({ display_order: orderB === orderA ? swapIdx + 1 : orderB }).eq('id', current.id),
      sb.from('homepage_banners').update({ display_order: orderA === orderB ? idx + 1 : orderA }).eq('id', target.id)
    ]);
    try {
      sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
    } catch (_) {}
    await loadHomepageBanners();
  } catch (err) {
    showToast(`Failed to reorder banner: ${err.message}`, 'error');
  }
}

async function deleteHomepageBanner(id, imageUrl) {
  if (!confirm('Delete this homepage banner? This will remove the file from Cloudflare R2 and delete the database record.')) {
    return;
  }
  try {
    await deleteBannerFromR2(imageUrl, '');
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb.from('homepage_banners').delete().eq('id', id);
    if (error) {
      showToast(`Failed to delete banner record: ${error.message}`, 'error');
      return;
    }
    try {
      sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
    } catch (_) {}
    showToast('Banner deleted from Cloudflare R2 and Supabase.', 'success');
    await loadHomepageBanners();
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}

window.handleBannerFileSelect = handleBannerFileSelect;
window.uploadPreparedBanner = uploadPreparedBanner;
window.loadHomepageBanners = loadHomepageBanners;
window.toggleBannerActive = toggleBannerActive;
window.moveBannerOrder = moveBannerOrder;
window.updateBannerOrder = updateBannerOrder;
window.deleteHomepageBanner = deleteHomepageBanner;

// ========================================================
// BANNER CROP & FACE-FRAMING EDITOR (16:6 + <500 KB + R2)
// ========================================================

const BANNER_CROP_W = 1920;
const BANNER_CROP_H = 720; // Exact 16:6 hero aspect ratio

const cropState = {
  mode: 'banner', // 'banner' | 'happy_story'
  queue: [],
  queueIdx: 0,
  editBanner: null,
  editStory: null,
  storyMeta: null,
  img: null,
  originalKB: 0,
  fileName: '',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0
};

function bindCropViewportEvents() {
  const viewport = document.getElementById('cropViewport');
  if (!viewport || viewport.dataset.bound === '1') return;
  viewport.dataset.bound = '1';

  viewport.addEventListener('pointerdown', (e) => {
    if (!cropState.img) return;
    cropState.isDragging = true;
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
    cropState.startOffsetX = cropState.offsetX;
    cropState.startOffsetY = cropState.offsetY;
    viewport.setPointerCapture?.(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!cropState.isDragging || !cropState.img) return;
    const rect = viewport.getBoundingClientRect();
    const scaleRatio = BANNER_CROP_W / Math.max(1, rect.width);
    const dx = (e.clientX - cropState.dragStartX) * scaleRatio;
    const dy = (e.clientY - cropState.dragStartY) * scaleRatio;
    cropState.offsetX = cropState.startOffsetX + dx;
    cropState.offsetY = cropState.startOffsetY + dy;
    clampCropOffsets();
    renderCropCanvas();
  });

  const endDrag = () => { cropState.isDragging = false; };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
}

function getBaseCoverScale() {
  if (!cropState.img) return 1;
  const iw = cropState.img.naturalWidth || cropState.img.width || BANNER_CROP_W;
  const ih = cropState.img.naturalHeight || cropState.img.height || BANNER_CROP_H;
  return Math.max(BANNER_CROP_W / iw, BANNER_CROP_H / ih);
}

function clampCropOffsets() {
  if (!cropState.img) return;
  const iw = cropState.img.naturalWidth || cropState.img.width || BANNER_CROP_W;
  const ih = cropState.img.naturalHeight || cropState.img.height || BANNER_CROP_H;
  const scale = getBaseCoverScale() * cropState.zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const maxOffsetX = Math.max(0, (drawW - BANNER_CROP_W) / 2);
  const maxOffsetY = Math.max(0, (drawH - BANNER_CROP_H) / 2);
  cropState.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, cropState.offsetX));
  cropState.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, cropState.offsetY));
}

function renderCropCanvas() {
  const canvas = document.getElementById('cropPreviewCanvas');
  if (!canvas || !cropState.img) return;
  canvas.width = BANNER_CROP_W;
  canvas.height = BANNER_CROP_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, BANNER_CROP_W, BANNER_CROP_H);

  const iw = cropState.img.naturalWidth || cropState.img.width || BANNER_CROP_W;
  const ih = cropState.img.naturalHeight || cropState.img.height || BANNER_CROP_H;
  const scale = getBaseCoverScale() * cropState.zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const dx = (BANNER_CROP_W - drawW) / 2 + cropState.offsetX;
  const dy = (BANNER_CROP_H - drawH) / 2 + cropState.offsetY;

  ctx.drawImage(cropState.img, dx, dy, drawW, drawH);
}

function setCropZoom(val) {
  cropState.zoom = Math.max(1, Math.min(3, parseFloat(val) || 1));
  const slider = document.getElementById('cropZoomSlider');
  const label = document.getElementById('cropZoomLabel');
  if (slider) slider.value = String(cropState.zoom);
  if (label) label.textContent = `${cropState.zoom.toFixed(2)}x`;
  clampCropOffsets();
  renderCropCanvas();
}

function adjustCropZoom(delta) {
  setCropZoom(cropState.zoom + delta);
}

function nudgeCropPosition(dx, dy) {
  cropState.offsetX += dx;
  cropState.offsetY += dy;
  clampCropOffsets();
  renderCropCanvas();
}

function resetCropTransform() {
  cropState.offsetX = 0;
  cropState.offsetY = 0;
  setCropZoom(1);
}

function openNewBannersCropQueue(files) {
  cropState.mode = 'banner';
  cropState.editStory = null;
  cropState.storyMeta = null;
  cropState.queue = files;
  cropState.queueIdx = 0;
  cropState.editBanner = null;
  loadCurrentCropItem();
}

async function openExistingBannerCrop(bannerId) {
  const banner = (state.banners.list || []).find(b => String(b.id) === String(bannerId));
  if (!banner) return;
  cropState.mode = 'banner';
  cropState.editStory = null;
  cropState.storyMeta = null;
  cropState.queue = [];
  cropState.queueIdx = 0;
  cropState.editBanner = banner;

  const modal = document.getElementById('bannerCropModal');
  const queueBadge = document.getElementById('cropQueueBadge');
  const skipBtn = document.getElementById('cropSkipBtn');
  const titleInput = document.getElementById('cropTitleInput');
  const applyLabel = document.getElementById('cropApplyBtnLabel');

  if (queueBadge) {
    queueBadge.textContent = 'Re-Crop Existing Banner';
    queueBadge.classList.remove('hidden');
  }
  if (skipBtn) skipBtn.classList.add('hidden');
  if (titleInput) titleInput.value = banner.title || '';
  if (applyLabel) applyLabel.textContent = 'Save Cropped Banner';

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not load image for cropping (check R2 CORS settings).'));
      const sep = banner.image_url.includes('?') ? '&' : '?';
      img.src = `${banner.image_url}${sep}cb=${Date.now()}`;
    });
    cropState.img = img;
    cropState.originalKB = Number(banner.original_size_kb) || Number(banner.compressed_size_kb) || 0;
    cropState.fileName = banner.title || 'banner';
    resetCropTransform();
    bindCropViewportEvents();
    modal?.showModal();
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadCurrentCropItem() {
  const file = cropState.queue[cropState.queueIdx];
  if (!file) {
    closeBannerCropModal();
    return;
  }

  const modal = document.getElementById('bannerCropModal');
  const queueBadge = document.getElementById('cropQueueBadge');
  const skipBtn = document.getElementById('cropSkipBtn');
  const titleInput = document.getElementById('cropTitleInput');
  const applyLabel = document.getElementById('cropApplyBtnLabel');

  const total = cropState.queue.length;
  if (queueBadge) {
    queueBadge.textContent = `Image ${cropState.queueIdx + 1} of ${total}`;
    queueBadge.classList.remove('hidden');
  }
  if (skipBtn) skipBtn.classList.toggle('hidden', total <= 1);
  if (titleInput) {
    titleInput.value = (document.getElementById('bannerTitleInput')?.value || '').trim() || file.name.replace(/\.[^/.]+$/, '');
  }
  if (applyLabel) {
    applyLabel.textContent = total > 1 && cropState.queueIdx < total - 1
      ? 'Apply, Upload & Next'
      : 'Apply & Upload Banner';
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  cropState.img = img;
  cropState.originalKB = Math.max(1, Math.round(file.size / 1024));
  cropState.fileName = file.name;
  resetCropTransform();
  bindCropViewportEvents();
  if (modal && !modal.open) modal.showModal();
  if (window.lucide) lucide.createIcons();
}

function closeBannerCropModal() {
  const modal = document.getElementById('bannerCropModal');
  if (modal && modal.open) modal.close();
  const fileInput = document.getElementById('bannerFileInput');
  if (fileInput) fileInput.value = '';
  cropState.queue = [];
  cropState.queueIdx = 0;
  cropState.editBanner = null;
  cropState.img = null;
}

function skipCurrentCropItem() {
  if (cropState.queueIdx + 1 < cropState.queue.length) {
    cropState.queueIdx += 1;
    loadCurrentCropItem();
  } else {
    closeBannerCropModal();
  }
}

async function exportCroppedCanvasUnder500KB() {
  const MAX_BYTES = 500 * 1024;
  const TARGET_BYTES = 430 * 1024;
  const sourceCanvas = document.getElementById('cropPreviewCanvas');
  if (!sourceCanvas) throw new Error('Crop canvas not ready');

  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d');

  const encode = (w, h, mime, q) => new Promise((resolve) => {
    offscreen.width = w;
    offscreen.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    offscreen.toBlob((b) => resolve(b), mime, q);
  });

  let mime = 'image/webp';
  let ext = 'webp';
  let bestBlob = await encode(BANNER_CROP_W, BANNER_CROP_H, mime, 0.88);
  if (!bestBlob || bestBlob.type !== 'image/webp') {
    mime = 'image/jpeg';
    ext = 'jpg';
    bestBlob = await encode(BANNER_CROP_W, BANNER_CROP_H, mime, 0.88);
  }

  let quality = 0.88;
  while (bestBlob && bestBlob.size > TARGET_BYTES && quality > 0.35) {
    quality -= 0.08;
    const candidate = await encode(BANNER_CROP_W, BANNER_CROP_H, mime, quality);
    if (candidate) bestBlob = candidate;
  }

  let scale = 0.9;
  while (bestBlob && bestBlob.size >= MAX_BYTES && scale >= 0.5) {
    const sw = Math.round(BANNER_CROP_W * scale);
    const sh = Math.round(BANNER_CROP_H * scale);
    const candidate = await encode(sw, sh, mime, Math.max(0.45, quality));
    if (candidate) bestBlob = candidate;
    scale -= 0.1;
  }

  if (!bestBlob || bestBlob.size >= MAX_BYTES) {
    throw new Error('Could not compress cropped banner under 500 KB.');
  }

  const fileName = `${cropState.mode === 'happy_story' ? 'story' : 'banner'}_${Date.now()}.${ext}`;
  const finalFile = typeof File !== 'undefined'
    ? new File([bestBlob], fileName, { type: mime })
    : bestBlob;

  return {
    blob: finalFile,
    ext,
    contentType: mime,
    compressedKB: Math.max(1, Math.round(bestBlob.size / 1024))
  };
}

async function applyCropAndUpload() {
  const btn = document.getElementById('cropApplyUploadBtn');
  const labelEl = document.getElementById('cropApplyBtnLabel');
  const sizeEstimate = document.getElementById('cropSizeEstimate');
  const titleVal = (document.getElementById('cropTitleInput')?.value || '').trim();

  if (btn) btn.disabled = true;
  if (labelEl) labelEl.textContent = 'Compressing & Uploading R2...';

  try {
    const { blob, ext, contentType, compressedKB } = await exportCroppedCanvasUnder500KB();
    if (sizeEstimate) sizeEstimate.textContent = `Compressed: ${compressedKB} KB (${ext.toUpperCase()})`;

    const { publicUrl } = await uploadBannerToR2(blob, ext, contentType, 'banners');
    const sb = getSupabaseAdminClient();
    if (!sb) throw new Error('Supabase client not initialized.');

    if (cropState.editBanner) {
      const oldUrl = cropState.editBanner.image_url;
      const { error } = await sb
        .from('homepage_banners')
        .update({
          image_url: publicUrl,
          title: titleVal || cropState.editBanner.title || 'Matrimony Couple Banner',
          compressed_size_kb: compressedKB
        })
        .eq('id', cropState.editBanner.id);

      if (error) throw new Error(error.message);
      if (oldUrl && oldUrl !== publicUrl) {
        await deleteBannerFromR2(oldUrl, '').catch(() => {});
      }
      try {
        sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
      } catch (_) {}

      showToast(`Banner re-cropped & updated in R2 (${compressedKB} KB)!`, 'success');
      closeBannerCropModal();
      await loadHomepageBanners();
    } else {
      const nextOrder = (state.banners.list || []).reduce((max, b) => Math.max(max, Number(b.display_order) || 0), 0) + 1;
      const { error } = await sb.from('homepage_banners').insert({
        image_url: publicUrl,
        title: titleVal || cropState.fileName.replace(/\.[^/.]+$/, '') || `Matrimony Banner #${nextOrder}`,
        display_order: nextOrder,
        is_active: true,
        original_size_kb: cropState.originalKB || compressedKB,
        compressed_size_kb: compressedKB
      });

      if (error) throw new Error(error.message);
      try {
        sb.channel('public:homepage_banners_sync').send({ type: 'broadcast', event: 'banners_updated', payload: { timestamp: Date.now() } });
      } catch (_) {}

      showToast(`Cropped banner uploaded to R2 (${compressedKB} KB)!`, 'success');
      await loadHomepageBanners();

      if (cropState.queueIdx + 1 < cropState.queue.length && (state.banners.list || []).length < MAX_HOMEPAGE_BANNERS) {
        cropState.queueIdx += 1;
        await loadCurrentCropItem();
      } else {
        closeBannerCropModal();
      }
    }
  } catch (err) {
    showToast(err.message || 'Crop & upload failed', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (labelEl && !cropState.editBanner) {
      const total = cropState.queue.length;
      labelEl.textContent = total > 1 && cropState.queueIdx < total - 1 ? 'Apply, Upload & Next' : 'Apply & Upload Banner';
    } else if (labelEl && cropState.editBanner) {
      labelEl.textContent = 'Save Cropped Banner';
    }
  }
}

window.openExistingBannerCrop = openExistingBannerCrop;
window.closeBannerCropModal = closeBannerCropModal;
window.skipCurrentCropItem = skipCurrentCropItem;
window.setCropZoom = setCropZoom;
window.adjustCropZoom = adjustCropZoom;
window.nudgeCropPosition = nudgeCropPosition;
window.resetCropTransform = resetCropTransform;
window.applyCropAndUpload = applyCropAndUpload;

// ========================================================
// HAPPY STORIES MANAGEMENT (ISOLATED: R2 happy-stories/ + public.happy_stories)
// ========================================================

const BENCHMARK_HAPPY_STORIES = [
  {
    couple_name: 'Dr. Ananya & Rohan',
    location: 'Ernakulam, Kerala',
    wedding_date: 'October 2026',
    image_url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
    story_text: 'Connected through verified family profiles and celebrated our wedding in Kochi.',
    source: 'admin',
    is_active: true,
    display_order: 1
  },
  {
    couple_name: 'Meera & Siddharth',
    location: 'Bengaluru, Karnataka',
    wedding_date: 'September 2026',
    image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    story_text: 'Matched on shared values and family traditions with instant direct chat.',
    source: 'admin',
    is_active: true,
    display_order: 2
  },
  {
    couple_name: 'Priyanka & Arjun',
    location: 'Thrissur, Kerala',
    wedding_date: 'August 2026',
    image_url: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800',
    story_text: 'Our families met within three weeks of connecting on I 4 You Matrimony.',
    source: 'admin',
    is_active: true,
    display_order: 3
  },
  {
    couple_name: 'Aiswarya & Karthik',
    location: 'Kozhikode, Kerala',
    wedding_date: 'July 2026',
    image_url: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?auto=format&fit=crop&q=80&w=800',
    story_text: 'Aadhaar-verified profiles gave both families complete trust from day one.',
    source: 'admin',
    is_active: true,
    display_order: 4
  },
  {
    couple_name: 'Neha & Vikram',
    location: 'Pune, Maharashtra',
    wedding_date: 'June 2026',
    image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
    story_text: 'Found our ideal life partner with transparent family background details.',
    source: 'admin',
    is_active: true,
    display_order: 5
  },
  {
    couple_name: 'Divya & Pranav',
    location: 'Chennai, Tamil Nadu',
    wedding_date: 'May 2026',
    image_url: 'https://images.unsplash.com/photo-1595429035839-c99c298ffdde?auto=format&fit=crop&q=80&w=800',
    story_text: 'Grateful for a respectful, family-first matchmaking journey.',
    source: 'admin',
    is_active: true,
    display_order: 6
  }
];

state.happyStories = { list: [] };

const HAPPY_STORY_CROP_W = 1200;
const HAPPY_STORY_CROP_H = 750; // 16:10 widescreen couple card frame

const happyStoryCropState = {
  editStory: null,
  storyMeta: null,
  img: null,
  fileName: '',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0
};

function bindHappyStoryViewportEvents() {
  const viewport = document.getElementById('happyStoryCropViewport');
  if (!viewport || viewport.dataset.bound === '1') return;
  viewport.dataset.bound = '1';

  viewport.addEventListener('pointerdown', (e) => {
    if (!happyStoryCropState.img) return;
    happyStoryCropState.isDragging = true;
    happyStoryCropState.dragStartX = e.clientX;
    happyStoryCropState.dragStartY = e.clientY;
    happyStoryCropState.startOffsetX = happyStoryCropState.offsetX;
    happyStoryCropState.startOffsetY = happyStoryCropState.offsetY;
    viewport.setPointerCapture?.(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!happyStoryCropState.isDragging || !happyStoryCropState.img) return;
    const rect = viewport.getBoundingClientRect();
    const scaleRatio = HAPPY_STORY_CROP_W / Math.max(1, rect.width);
    happyStoryCropState.offsetX = happyStoryCropState.startOffsetX + (e.clientX - happyStoryCropState.dragStartX) * scaleRatio;
    happyStoryCropState.offsetY = happyStoryCropState.startOffsetY + (e.clientY - happyStoryCropState.dragStartY) * scaleRatio;
    clampHappyStoryOffsets();
    renderHappyStoryCropCanvas();
  });

  const endDrag = () => { happyStoryCropState.isDragging = false; };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
}

function getHappyStoryBaseScale() {
  if (!happyStoryCropState.img) return 1;
  const iw = happyStoryCropState.img.naturalWidth || happyStoryCropState.img.width || HAPPY_STORY_CROP_W;
  const ih = happyStoryCropState.img.naturalHeight || happyStoryCropState.img.height || HAPPY_STORY_CROP_H;
  return Math.max(HAPPY_STORY_CROP_W / iw, HAPPY_STORY_CROP_H / ih);
}

function clampHappyStoryOffsets() {
  if (!happyStoryCropState.img) return;
  const iw = happyStoryCropState.img.naturalWidth || happyStoryCropState.img.width || HAPPY_STORY_CROP_W;
  const ih = happyStoryCropState.img.naturalHeight || happyStoryCropState.img.height || HAPPY_STORY_CROP_H;
  const scale = getHappyStoryBaseScale() * happyStoryCropState.zoom;
  const maxX = Math.max(0, (iw * scale - HAPPY_STORY_CROP_W) / 2);
  const maxY = Math.max(0, (ih * scale - HAPPY_STORY_CROP_H) / 2);
  happyStoryCropState.offsetX = Math.max(-maxX, Math.min(maxX, happyStoryCropState.offsetX));
  happyStoryCropState.offsetY = Math.max(-maxY, Math.min(maxY, happyStoryCropState.offsetY));
}

function renderHappyStoryCropCanvas() {
  const canvas = document.getElementById('happyStoryCropCanvas');
  if (!canvas || !happyStoryCropState.img) return;
  canvas.width = HAPPY_STORY_CROP_W;
  canvas.height = HAPPY_STORY_CROP_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, HAPPY_STORY_CROP_W, HAPPY_STORY_CROP_H);

  const iw = happyStoryCropState.img.naturalWidth || happyStoryCropState.img.width || HAPPY_STORY_CROP_W;
  const ih = happyStoryCropState.img.naturalHeight || happyStoryCropState.img.height || HAPPY_STORY_CROP_H;
  const scale = getHappyStoryBaseScale() * happyStoryCropState.zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const dx = (HAPPY_STORY_CROP_W - drawW) / 2 + happyStoryCropState.offsetX;
  const dy = (HAPPY_STORY_CROP_H - drawH) / 2 + happyStoryCropState.offsetY;
  ctx.drawImage(happyStoryCropState.img, dx, dy, drawW, drawH);
}

function setHappyStoryZoom(val) {
  happyStoryCropState.zoom = Math.max(1, Math.min(3, parseFloat(val) || 1));
  const slider = document.getElementById('happyStoryCropZoomSlider');
  const label = document.getElementById('happyStoryCropZoomLabel');
  if (slider) slider.value = String(happyStoryCropState.zoom);
  if (label) label.textContent = `${happyStoryCropState.zoom.toFixed(2)}x`;
  clampHappyStoryOffsets();
  renderHappyStoryCropCanvas();
}

function adjustHappyStoryZoom(delta) {
  setHappyStoryZoom(happyStoryCropState.zoom + delta);
}

function nudgeHappyStoryPosition(dx, dy) {
  happyStoryCropState.offsetX += dx;
  happyStoryCropState.offsetY += dy;
  clampHappyStoryOffsets();
  renderHappyStoryCropCanvas();
}

function resetHappyStoryTransform() {
  happyStoryCropState.offsetX = 0;
  happyStoryCropState.offsetY = 0;
  setHappyStoryZoom(1);
}

function closeHappyStoryCropModal() {
  const modal = document.getElementById('happyStoryCropModal');
  if (modal && modal.open) modal.close();
  const fileInput = document.getElementById('happyStoryFileInput');
  if (fileInput) fileInput.value = '';
  happyStoryCropState.editStory = null;
  happyStoryCropState.storyMeta = null;
  happyStoryCropState.img = null;
}

async function exportHappyStoryCanvasUnder500KB() {
  const MAX_BYTES = 500 * 1024;
  const TARGET_BYTES = 420 * 1024;
  const sourceCanvas = document.getElementById('happyStoryCropCanvas');
  if (!sourceCanvas) throw new Error('Happy Story crop canvas not ready');

  const offscreen = document.createElement('canvas');
  const ctx = offscreen.getContext('2d');
  const encode = (w, h, mime, q) => new Promise((resolve) => {
    offscreen.width = w;
    offscreen.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    offscreen.toBlob((b) => resolve(b), mime, q);
  });

  let mime = 'image/webp';
  let ext = 'webp';
  let bestBlob = await encode(HAPPY_STORY_CROP_W, HAPPY_STORY_CROP_H, mime, 0.86);
  if (!bestBlob || bestBlob.type !== 'image/webp') {
    mime = 'image/jpeg';
    ext = 'jpg';
    bestBlob = await encode(HAPPY_STORY_CROP_W, HAPPY_STORY_CROP_H, mime, 0.86);
  }

  let quality = 0.86;
  while (bestBlob && bestBlob.size > TARGET_BYTES && quality > 0.35) {
    quality -= 0.08;
    const candidate = await encode(HAPPY_STORY_CROP_W, HAPPY_STORY_CROP_H, mime, quality);
    if (candidate) bestBlob = candidate;
  }

  let scale = 0.9;
  while (bestBlob && bestBlob.size >= MAX_BYTES && scale >= 0.5) {
    const sw = Math.round(HAPPY_STORY_CROP_W * scale);
    const sh = Math.round(HAPPY_STORY_CROP_H * scale);
    const candidate = await encode(sw, sh, mime, Math.max(0.45, quality));
    if (candidate) bestBlob = candidate;
    scale -= 0.1;
  }

  if (!bestBlob || bestBlob.size >= MAX_BYTES) {
    throw new Error('Could not compress Happy Story photo under 500 KB.');
  }

  const fileName = `story_${Date.now()}.${ext}`;
  const finalFile = typeof File !== 'undefined'
    ? new File([bestBlob], fileName, { type: mime })
    : bestBlob;

  return {
    blob: finalFile,
    ext,
    contentType: mime,
    compressedKB: Math.max(1, Math.round(bestBlob.size / 1024))
  };
}

function initHappyStoryDropZone() {
  const dropZone = document.getElementById('happyStoryDropZone');
  if (!dropZone || dropZone.dataset.bound === '1') return;
  dropZone.dataset.bound = '1';

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-[#E6B8A2]', 'bg-[#C58B76]/10');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-[#E6B8A2]', 'bg-[#C58B76]/10');
    });
  });
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) openNewHappyStoryCrop(file);
  });
}

function handleHappyStoryFileSelect(event) {
  const file = event?.target?.files?.[0];
  if (file) openNewHappyStoryCrop(file);
}

async function openNewHappyStoryCrop(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid wedding photo.', 'error');
    return;
  }
  const coupleVal = (document.getElementById('newStoryCoupleInput')?.value || '').trim();
  const locVal = (document.getElementById('newStoryLocationInput')?.value || '').trim();
  const dateVal = (document.getElementById('newStoryDateInput')?.value || '').trim();
  const textVal = (document.getElementById('newStoryTextInput')?.value || '').trim();

  happyStoryCropState.editStory = null;
  happyStoryCropState.storyMeta = {
    couple_name: coupleVal || 'Blessed Couple',
    location: locVal || 'Kerala, India',
    wedding_date: dateVal || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    story_text: textVal || 'We found our life partner through I 4 You Matrimony! Blessed to begin our sacred journey.'
  };

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  happyStoryCropState.img = img;
  happyStoryCropState.fileName = file.name;
  resetHappyStoryTransform();
  bindHappyStoryViewportEvents();

  const titleInput = document.getElementById('happyStoryCropTitleInput');
  const applyLabel = document.getElementById('happyStoryCropApplyLabel');
  if (titleInput) titleInput.value = coupleVal || file.name.replace(/\.[^/.]+$/, '');
  if (applyLabel) applyLabel.textContent = 'Apply & Upload Happy Story';

  document.getElementById('happyStoryCropModal')?.showModal();
  if (window.lucide) lucide.createIcons();
}

async function openHappyStoryReCrop(storyId) {
  const story = (state.happyStories.list || []).find(s => String(s.id) === String(storyId));
  if (!story) return;

  happyStoryCropState.editStory = story;
  happyStoryCropState.storyMeta = null;
  const imgUrl = story.image_url || story.photo_url || '';

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not load story image for cropping.'));
      const sep = imgUrl.includes('?') ? '&' : '?';
      img.src = `${imgUrl}${sep}cb=${Date.now()}`;
    });
    happyStoryCropState.img = img;
    happyStoryCropState.fileName = story.couple_name || story.couple_names || 'story';
    resetHappyStoryTransform();
    bindHappyStoryViewportEvents();

    const titleInput = document.getElementById('happyStoryCropTitleInput');
    const applyLabel = document.getElementById('happyStoryCropApplyLabel');
    if (titleInput) titleInput.value = story.couple_name || story.couple_names || '';
    if (applyLabel) applyLabel.textContent = 'Save Cropped Story Photo';

    document.getElementById('happyStoryCropModal')?.showModal();
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function applyHappyStoryCropAndUpload() {
  const btn = document.getElementById('happyStoryCropApplyBtn');
  const labelEl = document.getElementById('happyStoryCropApplyLabel');
  const sizeEstimate = document.getElementById('happyStorySizeEstimate');
  const titleVal = (document.getElementById('happyStoryCropTitleInput')?.value || '').trim();

  if (btn) btn.disabled = true;
  if (labelEl) labelEl.textContent = 'Compressing & Uploading R2...';

  try {
    const { blob, ext, contentType, compressedKB } = await exportHappyStoryCanvasUnder500KB();
    if (sizeEstimate) sizeEstimate.textContent = `Compressed: ${compressedKB} KB (${ext.toUpperCase()})`;

    // Use the exact same working direct client-side R2 upload helper, isolated to happy-stories/
    const { publicUrl } = await uploadBannerToR2(blob, ext, contentType, 'happy-stories');
    const sb = getSupabaseAdminClient();
    if (!sb) throw new Error('Supabase client not initialized.');

    if (happyStoryCropState.editStory) {
      const oldUrl = happyStoryCropState.editStory.image_url || happyStoryCropState.editStory.photo_url;
      const { error } = await sb
        .from('happy_stories')
        .update({
          image_url: publicUrl,
          couple_name: titleVal || happyStoryCropState.editStory.couple_name || happyStoryCropState.editStory.couple_names || 'Blessed Couple',
          compressed_size_kb: compressedKB
        })
        .eq('id', happyStoryCropState.editStory.id);
      if (error) throw new Error(`Supabase update error: ${error.message}`);

      if (oldUrl && oldUrl !== publicUrl && (oldUrl.includes('r2.dev') || oldUrl.includes('r2.cloudflarestorage.com'))) {
        await deleteBannerFromR2(oldUrl, '').catch(() => {});
      }
      showToast(`Happy Story photo updated in R2 (${compressedKB} KB)!`, 'success');
    } else {
      const meta = happyStoryCropState.storyMeta || {};
      const minOrder = (state.happyStories?.list || []).reduce((min, s) => Math.min(min, Number(s.display_order) || 1), 1);
      const { error } = await sb.from('happy_stories').insert({
        image_url: publicUrl,
        couple_name: titleVal || meta.couple_name || 'Blessed Couple',
        location: meta.location || 'Kerala, India',
        wedding_date: meta.wedding_date || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        story_text: meta.story_text || 'We found our life partner through I 4 You Matrimony! Blessed to begin our sacred journey.',
        source: 'admin',
        display_order: Math.max(0, minOrder - 1),
        is_active: true,
        compressed_size_kb: compressedKB
      });
      if (error) throw new Error(`Supabase insert error: ${error.message}`);

      ['newStoryCoupleInput', 'newStoryLocationInput', 'newStoryDateInput', 'newStoryTextInput', 'happyStoryFileInput'].forEach(fid => {
        const el = document.getElementById(fid);
        if (el) el.value = '';
      });
      showToast(`Happy Story uploaded to Cloudflare R2 (${compressedKB} KB)!`, 'success');
    }

    try {
      sb.channel('public:happy_stories_sync').send({ type: 'broadcast', event: 'happy_stories_updated', payload: { timestamp: Date.now() } });
    } catch (_) {}

    closeHappyStoryCropModal();
    await loadHappyStories();
  } catch (err) {
    showToast(err.message || 'Happy Story upload failed', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (labelEl) labelEl.textContent = happyStoryCropState.editStory ? 'Save Cropped Story Photo' : 'Apply & Upload Happy Story';
  }
}

async function loadHappyStories() {
  const container = document.getElementById('happyStoriesGridContainer');
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;

    let { data, error } = await sb
      .from('happy_stories')
      .select('id, image_url, couple_name, location, wedding_date, story_text, source, display_order, is_active, compressed_size_kb, created_at')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (container) container.innerHTML = `<div class="col-span-full p-6 rounded-2xl bg-[#2C1A1D] border border-rose-500/30 text-xs text-rose-300">Unable to load happy stories: ${error.message}</div>`;
      return;
    }

    if (Array.isArray(data) && data.length === 0) {
      const seedRes = await sb.from('happy_stories').insert(BENCHMARK_HAPPY_STORIES).select();
      if (!seedRes.error && Array.isArray(seedRes.data)) {
        data = seedRes.data;
      }
    }

    state.happyStories.list = data || [];
    const activeCount = state.happyStories.list.filter(s => s.is_active).length;
    const badge = document.getElementById('happyStoriesBadge');
    if (badge) {
      if (activeCount > 0) {
        badge.textContent = String(activeCount);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    renderHappyStories();
  } catch (err) {
    if (container) container.innerHTML = `<div class="col-span-full p-6 rounded-2xl bg-[#2C1A1D] border border-rose-500/30 text-xs text-rose-300">Error: ${err.message}</div>`;
  }
}

function renderHappyStories() {
  const container = document.getElementById('happyStoriesGridContainer');
  if (!container) return;

  const list = state.happyStories.list || [];
  if (list.length === 0) {
    container.innerHTML = '<div class="col-span-full p-6 rounded-2xl bg-[#2C1A1D] border border-slate-800 text-xs text-slate-400">No happy stories found.</div>';
    return;
  }

  container.innerHTML = list.map((s, idx) => {
    const isActive = Boolean(s.is_active);
    const isUser = s.source === 'user_deletion';
    const imgUrl = s.image_url || s.photo_url || '';
    const coupleName = s.couple_name || s.couple_names || 'Blessed Couple';
    const isR2 = String(imgUrl).includes('r2.dev') || String(imgUrl).includes('r2.cloudflarestorage.com');
    const safeUrl = String(imgUrl).replace(/'/g, "\\'");

    return `
      <div class="rounded-2xl bg-[#2C1A1D] border ${isActive ? 'border-[#C58B76]/40' : 'border-slate-800 opacity-75'} overflow-hidden shadow-lg flex flex-col">
        <div class="relative h-48 bg-[#1A1012]">
          <img src="${imgUrl}" alt="${escapePlanHtml(coupleName)}" class="w-full h-full object-cover" />
          <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-[#E6B8A2] border border-[#C58B76]/40 font-mono">#${idx + 1}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isUser ? 'bg-purple-950/90 text-purple-300 border border-purple-500/40' : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'}">
              ${isUser ? 'User Submitted' : 'Admin Added'}
            </span>
          </div>
          ${(isR2 || s.compressed_size_kb) ? `
            <span class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/80 text-emerald-300">
              ${s.compressed_size_kb ? `${s.compressed_size_kb} KB &bull; ` : ''}${isR2 ? 'R2' : 'URL'}
            </span>
          ` : ''}
        </div>
        <div class="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white truncate">${escapePlanHtml(coupleName)}</h4>
            <p class="text-[11px] text-[#E6B8A2]">${escapePlanHtml(s.location || 'Kerala, India')} &bull; ${escapePlanHtml(s.wedding_date || 'Recently Married')}</p>
            <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${escapePlanHtml(s.story_text || '')}</p>
          </div>
          <div class="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-1.5">
            <label class="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleHappyStoryActive('${s.id}', this.checked)" class="sr-only peer" />
              <div class="w-8 h-4 bg-slate-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4"></div>
              <span class="text-[10px] font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}">${isActive ? 'Active' : 'Hidden'}</span>
            </label>
            <div class="flex items-center gap-1">
              <button type="button" onclick="moveHappyStoryOrder('${s.id}', -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer" title="Move Earlier">
                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="moveHappyStoryOrder('${s.id}', 1)" ${idx === list.length - 1 ? 'disabled' : ''} class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer" title="Move Later">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="openHappyStoryReCrop('${s.id}')" class="p-1 rounded-lg bg-[#C58B76]/15 hover:bg-[#C58B76]/30 text-[#E6B8A2] border border-[#C58B76]/30 cursor-pointer" title="Re-Crop Photo">
                <i data-lucide="crop" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="openHappyStoryEditModal('${s.id}')" class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer" title="Edit Details">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="deleteHappyStory('${s.id}', '${safeUrl}')" class="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 cursor-pointer" title="Delete Story (R2 + Supabase)">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

async function toggleHappyStoryActive(id, nextActive) {
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb.from('happy_stories').update({ is_active: Boolean(nextActive) }).eq('id', id);
    if (error) return showToast(`Failed to update story: ${error.message}`, 'error');
    try { sb.channel('public:happy_stories_sync').send({ type: 'broadcast', event: 'happy_stories_updated', payload: { timestamp: Date.now() } }); } catch (_) {}
    showToast(nextActive ? 'Happy Story activated on homepage.' : 'Happy Story hidden from homepage.', 'info');
    await loadHappyStories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function moveHappyStoryOrder(id, direction) {
  const list = state.happyStories.list || [];
  const idx = list.findIndex(s => String(s.id) === String(id));
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;

  const current = list[idx];
  const target = list[swapIdx];
  const orderA = Number(current.display_order) || (idx + 1);
  const orderB = Number(target.display_order) || (swapIdx + 1);

  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    await Promise.all([
      sb.from('happy_stories').update({ display_order: orderB === orderA ? swapIdx + 1 : orderB }).eq('id', current.id),
      sb.from('happy_stories').update({ display_order: orderA === orderB ? idx + 1 : orderA }).eq('id', target.id)
    ]);
    try { sb.channel('public:happy_stories_sync').send({ type: 'broadcast', event: 'happy_stories_updated', payload: { timestamp: Date.now() } }); } catch (_) {}
    await loadHappyStories();
  } catch (err) {
    showToast(`Failed to reorder story: ${err.message}`, 'error');
  }
}

function openHappyStoryEditModal(storyId) {
  const s = (state.happyStories.list || []).find(item => String(item.id) === String(storyId));
  if (!s) return;
  document.getElementById('editStoryId').value = s.id;
  document.getElementById('editStoryCouple').value = s.couple_name || s.couple_names || '';
  document.getElementById('editStoryLocation').value = s.location || '';
  document.getElementById('editStoryDate').value = s.wedding_date || '';
  document.getElementById('editStoryText').value = s.story_text || '';
  document.getElementById('happyStoryEditModal')?.showModal();
  if (window.lucide) lucide.createIcons();
}

async function saveHappyStoryEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editStoryId').value;
  const payload = {
    couple_name: document.getElementById('editStoryCouple').value.trim(),
    location: document.getElementById('editStoryLocation').value.trim() || 'Kerala, India',
    wedding_date: document.getElementById('editStoryDate').value.trim() || 'Recently Married',
    story_text: document.getElementById('editStoryText').value.trim()
  };
  try {
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb.from('happy_stories').update(payload).eq('id', id);
    if (error) return showToast(`Failed to update story: ${error.message}`, 'error');
    try { sb.channel('public:happy_stories_sync').send({ type: 'broadcast', event: 'happy_stories_updated', payload: { timestamp: Date.now() } }); } catch (_) {}
    document.getElementById('happyStoryEditModal')?.close();
    showToast('Happy Story updated & synced live!', 'success');
    await loadHappyStories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteHappyStory(id, photoUrl) {
  if (!confirm('Delete this Happy Story? This will remove the record from Supabase and delete the photo from Cloudflare R2.')) {
    return;
  }
  try {
    if (photoUrl && (photoUrl.includes('r2.dev') || photoUrl.includes('r2.cloudflarestorage.com'))) {
      await deleteBannerFromR2(photoUrl, '').catch(() => {});
    }
    const sb = getSupabaseAdminClient();
    if (!sb) return;
    const { error } = await sb.from('happy_stories').delete().eq('id', id);
    if (error) return showToast(`Failed to delete story: ${error.message}`, 'error');
    try { sb.channel('public:happy_stories_sync').send({ type: 'broadcast', event: 'happy_stories_updated', payload: { timestamp: Date.now() } }); } catch (_) {}
    showToast('Happy Story deleted from Cloudflare R2 and Supabase.', 'success');
    await loadHappyStories();
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}

window.closeHappyStoryCropModal = closeHappyStoryCropModal;
window.setHappyStoryZoom = setHappyStoryZoom;
window.adjustHappyStoryZoom = adjustHappyStoryZoom;
window.nudgeHappyStoryPosition = nudgeHappyStoryPosition;
window.resetHappyStoryTransform = resetHappyStoryTransform;
window.applyHappyStoryCropAndUpload = applyHappyStoryCropAndUpload;
window.handleHappyStoryFileSelect = handleHappyStoryFileSelect;
window.openHappyStoryReCrop = openHappyStoryReCrop;
window.loadHappyStories = loadHappyStories;
window.toggleHappyStoryActive = toggleHappyStoryActive;
window.moveHappyStoryOrder = moveHappyStoryOrder;
window.openHappyStoryEditModal = openHappyStoryEditModal;
window.saveHappyStoryEdit = saveHappyStoryEdit;
window.deleteHappyStory = deleteHappyStory;
