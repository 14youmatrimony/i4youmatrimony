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
    order: 'desc'
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

// Format Phone for Direct Phone Dialer
function getCleanPhoneForCall(phone) {
  if (!phone || phone === 'N/A') return '';
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
  if (!phone || phone === 'N/A') return '';
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
      toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border bg-[#122238]/95 text-emerald-200 border-emerald-800';
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
  startLiveSyncPolling();

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
    if (targetTab && ['overview', 'users', 'aadhaar', 'offers', 'plans', 'payments', 'settings'].includes(targetTab)) {
      setTimeout(() => switchTab(targetTab), 50);
    }
  } catch (e) {}
});

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      state.admin = {
        id: 1,
        username: 'admin',
        name: 'Arun Thomas',
        full_name: 'Arun Thomas',
        email: 'admin@i4you.com',
        role: 'Super Admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
        permissions: ['*']
      };
      updateAdminProfileUI();
      return;
    }
    const data = await res.json();
    state.admin = data.user || data;
    updateAdminProfileUI();
  } catch (err) {
    state.admin = {
      id: 1,
      username: 'admin',
      name: 'Arun Thomas',
      full_name: 'Arun Thomas',
      email: 'admin@i4you.com',
      role: 'Super Admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      permissions: ['*']
    };
    updateAdminProfileUI();
  }
}

function canAccessTab(tabId) {
  if (!state.admin) return true;
  const role = state.admin.role;
  if (role === 'Super Admin') return true;
  const perms = state.admin.permissions || [];
  if (tabId === 'overview') return true;
  if (tabId === 'users' || tabId === 'aadhaar') return perms.includes('users:view');
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
      roleEl.className = 'text-[10px] text-[#DFB76C] font-bold truncate';
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
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Signed out successfully', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (e) {
    window.location.reload();
  }
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
      btn.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner';
    } else {
      btn.className = 'w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-300 hover:text-white hover:bg-white/5 border border-transparent';
    }
  });

  // Toggle views
  const viewPanels = ['overview', 'users', 'aadhaar', 'offers', 'plans', 'payments', 'settings'];
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
    loadPlans();
  } else if (tabId === 'payments') {
    loadPayments();
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
    const res = await fetch('/api/system/database-status');
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
    const res = await fetch('/api/analytics');
    if (!res.ok) return;
    const data = await res.json();

    // 1. Update KPI Counters
    document.getElementById('kpiTotalUsers').textContent = data.kpi.total_users;
    document.getElementById('kpiActiveUsers').textContent = data.kpi.active_users;
    document.getElementById('kpiTotalRevenue').textContent = formatINR(data.kpi.total_revenue);
    document.getElementById('kpiCompletedTxns').textContent = data.kpi.completed_payments;
    document.getElementById('kpiActiveOffers').textContent = data.kpi.active_offers;
    document.getElementById('kpiPendingVerifications').textContent = data.kpi.pending_verifications;
    document.getElementById('kpiVerificationRate').textContent = `${data.kpi.verification_rate}%`;

    const aadhaarBadge = document.getElementById('aadhaarPendingBadge');
    if (aadhaarBadge) {
      const pendingCount = data.kpi.pending_verifications || 0;
      aadhaarBadge.textContent = pendingCount;
      if (pendingCount > 0) {
        aadhaarBadge.classList.remove('hidden');
      } else {
        aadhaarBadge.classList.add('hidden');
      }
    }

    // 2. Render Charts
    renderGrowthChart(data.monthly_trend);
    renderRevenueChart(data.monthly_trend);
    renderVerificationChart(data.verification_breakdown);
    renderRegionalChart(data.regional_distribution);

  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function renderGrowthChart(monthlyTrend) {
  const ctx = document.getElementById('userGrowthChart');
  if (!ctx) return;

  if (state.charts.growth) {
    state.charts.growth.destroy();
  }

  const labels = monthlyTrend.map(item => item.month);
  const data = monthlyTrend.map(item => item.signups);

  state.charts.growth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'New Verified Signups',
        data: data,
        borderColor: '#DFB76C',
        backgroundColor: 'rgba(223, 183, 108, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#0B192C',
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
          backgroundColor: '#0B192C',
          borderColor: '#D4AF37',
          borderWidth: 1,
          padding: 10,
          titleColor: '#DFB76C',
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
          ticks: { color: '#94a3b8', stepSize: 20 }
        }
      }
    }
  });
}

function renderRevenueChart(monthlyTrend) {
  const ctx = document.getElementById('revenueTrendChart');
  if (!ctx) return;

  if (state.charts.revenue) {
    state.charts.revenue.destroy();
  }

  const labels = monthlyTrend.map(item => item.month);
  const data = monthlyTrend.map(item => item.revenue);

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
          backgroundColor: '#0B192C',
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
  if (!ctx) return;

  if (state.charts.verification) {
    state.charts.verification.destroy();
  }

  state.charts.verification = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Aadhaar Verified', 'Govt ID Verified', 'Basic Verified', 'Pending Verification'],
      datasets: [{
        data: [
          breakdown.aadhaar_verified,
          breakdown.govt_id_only,
          breakdown.basic_verified,
          breakdown.unverified
        ],
        backgroundColor: [
          '#10b981', // Emerald
          '#3b82f6', // Blue
          '#DFB76C', // Gold
          '#f43f5e'  // Rose
        ],
        borderColor: '#0B192C',
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
          backgroundColor: '#0B192C',
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });
}

function renderRegionalChart(regionalData) {
  const ctx = document.getElementById('regionalChart');
  if (!ctx) return;

  if (state.charts.region) {
    state.charts.region.destroy();
  }

  const labels = regionalData.map(r => r.state);
  const data = regionalData.map(r => r.count);

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
          backgroundColor: '#0B192C',
          borderColor: '#D4AF37',
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
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#DFB76C] border-t-transparent rounded-full mb-2"></div>
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

    const res = await fetch(`/api/users?${params.toString()}`);
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
          <td class="py-3 px-4">
            <div class="flex items-center space-x-3">
              <div 
                class="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border ${hasRealPhoto ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-[#D4AF37]/30'} bg-slate-800 cursor-pointer group"
                onclick="event.stopPropagation(); openPhotoInspectModal('${userPhotoUrl}', 'Original Portrait Photo', '${safeUserName}', 'Portrait Photo')"
                title="Click to view original photo"
              >
                <img src="${userPhotoUrl}" alt="${u.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
                ${hasRealPhoto ? `<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" title="Authentic Photo Uploaded"></span>` : ''}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-medium text-white text-sm hover:text-[#DFB76C] cursor-pointer truncate" onclick="openViewProfileModal('${u.id}')">${u.name}</span>
                  ${u.match_score >= 95 ? '<span class="text-[10px] px-1 rounded bg-[#D4AF37]/20 text-[#DFB76C] font-mono">95%+</span>' : ''}
                  ${hasRealPhoto ? `<button type="button" onclick="event.stopPropagation(); openViewProfileModal('${u.id}')" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-[#DFB76C] border border-[#D4AF37]/40 font-medium hover:bg-amber-500/30 transition-colors cursor-pointer" title="Candidate has authentic uploaded photos">📸 ${totalPhotoCount > 0 ? totalPhotoCount + ' Photos' : 'Original'}</button>` : ''}
                </div>
                <div class="text-xs text-slate-400 flex items-center gap-1">
                  <span>${u.age} yrs</span> &bull; 
                  <span>${u.gender}</span> &bull; 
                  <span class="truncate max-w-[120px]">${u.religion || 'Hindu'}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- Contact Coordinates -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="flex items-center gap-1.5 font-mono text-slate-200">
              <span class="font-medium">${u.phone || 'N/A'}</span>
              ${hasPhone ? `
                <a 
                  href="tel:${callPhone}" 
                  class="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" 
                  title="Direct Phone Call: ${safeUserName} (${u.phone})"
                >
                  <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                </a>
                <a 
                  href="${waUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 transition-all hover:scale-110 flex items-center justify-center shrink-0" 
                  title="WhatsApp Chat: ${safeUserName} (${u.phone})"
                >
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                  </svg>
                </a>
              ` : ''}
            </div>
            <div class="text-slate-400 truncate max-w-[160px]">${u.email || 'No email registered'}</div>
          </td>

          <!-- Location -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="font-medium text-slate-200">${u.city || 'N/A'}</div>
            <div class="text-slate-400">${u.state || ''}</div>
          </td>

          <!-- Profession & Education -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="font-medium text-slate-200 truncate max-w-[170px]">${u.profession || 'Not Specified'}</div>
            <div class="text-emerald-400 font-mono text-[11px]">${u.annual_income || ''}</div>
          </td>

          <!-- Verification Badges -->
          <td class="py-3 px-4">
            <div class="flex flex-wrap gap-1">
              ${aadhaarBadge || govtBadge || (isVerified ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">Verified</span>' : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Unverified</span>')}
            </div>
          </td>

          <!-- Status -->
          <td class="py-3 px-4">
            ${statusBadge}
          </td>

          <!-- Actions -->
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end space-x-1.5">
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
                class="p-1.5 text-slate-400 hover:text-[#DFB76C] hover:bg-slate-700/60 rounded-lg transition-colors" 
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
  const { type, id, name } = state.pendingDelete;
  if (!id) return;

  try {
    let url = '';
    if (type === 'user') url = `/api/users/${id}`;
    else if (type === 'offer') url = `/api/offers/${id}`;
    else if (type === 'plan') url = `/api/plans/${id}`;
    else if (type === 'payment') url = `/api/payments/${id}`;
    else if (type === 'admin') url = `/api/admin/users/${id}`;

    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed');

    showToast(data.message, 'success');
    document.getElementById('deleteModal').close();

    if (type === 'user') {
      loadUsers();
      loadAnalytics();
    } else if (type === 'offer') {
      loadOffers();
      loadAnalytics();
    } else if (type === 'plan') {
      loadPlans();
    } else if (type === 'payment') {
      loadPayments();
      loadAnalytics();
    } else if (type === 'admin') {
      if (data.logout) {
        showToast('Your admin account has been removed. Signing out...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        loadAdminUsers();
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
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
            <div class="relative group rounded-xl overflow-hidden border ${isPrimary ? 'border-[#DFB76C] ring-1 ring-[#DFB76C]/40' : 'border-slate-700'} bg-black aspect-square flex items-center justify-center cursor-pointer shadow-md" onclick="openPhotoInspectModal('${pUrl}', '${isPrimary ? 'Primary Portrait Photo' : 'Portrait Photo #' + (idx + 1)}', '${safeName}', '${isPrimary ? 'Primary Portrait' : 'Single Photo #' + (idx + 1)}')">
              <img src="${pUrl}" alt="Photo ${idx + 1}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition-all">
                <i data-lucide="zoom-in" class="w-3.5 h-3.5 text-[#DFB76C]"></i>
                <span class="text-[10px]">Inspect</span>
              </div>
              <div class="absolute bottom-1 left-1 pointer-events-none">
                <span class="text-[8px] font-bold px-1.5 py-0.5 rounded shadow ${isPrimary ? 'bg-[#DFB76C] text-slate-950' : 'bg-black/75 text-slate-300 border border-white/20'}">
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

    const res = await fetch(`/api/users?${params.toString()}`);
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
  // Auto-sync every 6 seconds seamlessly in the background
  liveSyncTimer = setInterval(() => {
    syncLiveUpdates(true);
  }, 6000);
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
    const res = await fetch('/api/offers');
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
              <span class="font-mono text-sm font-bold text-[#DFB76C] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30 tracking-wider">
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
              <div class="bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] h-full rounded-full" style="width: ${usagePercent}%"></div>
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
                onclick="openEditOfferModal(${o.id})"
                class="p-1.5 text-slate-400 hover:text-[#DFB76C] hover:bg-slate-700/60 rounded-lg transition-colors"
                title="Edit Offer"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="toggleOfferActive(${o.id})"
                class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 rounded-lg transition-colors"
                title="Toggle Active / Inactive"
              >
                <i data-lucide="power" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openDeleteOfferModal(${o.id}, '${o.code}')"
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
    const res = await fetch(`/api/offers/${id}`);
    if (!res.ok) return showToast('Offer not found', 'error');
    const offer = await res.json();

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
    document.getElementById('offerActive').checked = Boolean(offer.is_active);

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
    is_active: document.getElementById('offerActive').checked
  };

  try {
    const url = isEdit ? `/api/offers/${id}` : '/api/offers';
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
    loadOffers();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleOfferActive(id) {
  try {
    const res = await fetch(`/api/offers/${id}/toggle`, {
      method: 'PATCH'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle offer');

    showToast(data.message, 'info');
    loadOffers();
    loadAnalytics();
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

async function loadPlans() {
  const cardsContainer = document.getElementById('plansCardsContainer');
  const tableBody = document.getElementById('plansTableBody');
  if (!cardsContainer && !tableBody) return;

  if (!state.plans || state.plans.length === 0) {
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 bg-[#0B192C] rounded-3xl border border-slate-800">
          <div class="flex items-center gap-3">
            <i data-lucide="loader-2" class="w-6 h-6 animate-spin text-[#DFB76C]"></i>
            <span class="text-sm font-semibold text-slate-300">Loading membership packages...</span>
          </div>
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') lucide.createIcons();
    }
  }

  try {
    const res = await fetch('/api/plans');
    if (!res.ok) throw new Error('Failed to load membership plans');
    const data = await res.json();
    state.plans = data.plans || [];

    renderPlans();
  } catch (err) {
    if (cardsContainer) {
      cardsContainer.innerHTML = `
        <div class="col-span-full text-center py-8 text-rose-400 text-xs">
          Failed to load membership plans. Please click refresh to retry.
        </div>
      `;
    }
  }
}

function renderPlans() {
  try {
    const plans = state.plans || [];
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
          <div class="col-span-full text-center py-12 text-slate-400 bg-[#0B192C] rounded-3xl border border-slate-800">
            <i data-lucide="crown" class="w-8 h-8 mx-auto text-[#DFB76C] mb-2 opacity-50"></i>
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
              cardBorder: p.is_popular ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' : 'border-blue-500/30 hover:border-blue-400/70',
              headerBg: 'bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C]',
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
          <div class="rounded-3xl bg-[#0B192C] border ${theme.cardBorder} shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl">
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
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#D4AF37]/30 text-[#DFB76C] border border-[#D4AF37]/50">
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
                    <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/40 text-[#DFB76C] text-[11px] font-bold">
                      <span class="flex items-center gap-1.5">
                        <span>🤵</span> Dedicated Matchmaking Manager
                      </span>
                      <span class="text-[9px] uppercase tracking-wider bg-[#D4AF37]/30 px-1.5 py-0.5 rounded">VIP</span>
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
                      <div class="p-1.5 rounded-xl bg-slate-900 border border-[#D4AF37]/40 shadow-inner">
                        <span class="block text-[9.5px] text-[#DFB76C] font-bold">6-Mo ⭐</span>
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
                <div class="p-2.5 rounded-xl bg-[#070F1E] border border-slate-800/80 space-y-1.5 text-[11px]">
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
                  class="sr-only switch-input"
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
                ${p.is_popular ? '<span class="text-[10px] text-[#DFB76C]">⭐</span>' : ''}
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
                  class="sr-only switch-input"
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
        <th class="py-3 px-4 text-center font-bold min-w-[170px] ${p.id === 'vip' ? 'text-purple-400' : p.id === 'diamond' ? 'text-[#DFB76C]' : p.id === 'gold' ? 'text-amber-400' : 'text-slate-300'}">
          <div class="space-y-1">
            <div class="text-sm font-extrabold uppercase tracking-wide flex items-center justify-center gap-1">
              <span>${p.name}</span>
              ${p.is_popular ? '<span class="text-xs" title="Most Popular">⭐</span>' : ''}
            </div>
            ${p.is_popular ? '<span class="text-[9px] font-extrabold text-[#DFB76C] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 inline-block">MOST POPULAR</span>' : ''}
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
                class="sr-only switch-input"
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
                class="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-[#DFB76C]/20 hover:text-[#DFB76C] text-slate-300 text-[10.5px] font-bold flex items-center gap-1 transition-all border border-slate-700 hover:border-[#DFB76C]/40 cursor-pointer shadow-xs active:scale-95" 
                title="Edit ${p.name}"
              >
                <i data-lucide="edit-3" class="w-3 h-3 text-[#DFB76C]"></i>
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
                class="sr-only switch-input"
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
        getter: p => p.contact_credits >= 999 ? '<strong class="text-purple-300">Unlimited</strong>' : `<strong class="text-white">${p.contact_credits} Numbers</strong>`
      },
      {
        label: '1-Month Offer Price',
        icon: 'tag',
        getter: p => p.offer_price_1m === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-400 font-mono font-bold">₹${p.offer_price_1m}</span>`
      },
      {
        label: '6-Month Popular Offer',
        icon: 'tag',
        getter: p => p.offer_price_6m === 0 ? '<span class="text-emerald-400 font-bold">Free</span>' : `<span class="text-emerald-300 font-mono font-bold">₹${p.offer_price_6m}</span>`
      },
      {
        label: 'Daily Direct Interests Quota',
        icon: 'heart',
        getter: p => `<span class="font-medium text-slate-200">${p.daily_interests || 'Unlimited'}</span>`
      },
      {
        label: 'Vedic Kundali Matching',
        icon: 'sparkles',
        getter: p => `<span class="font-medium text-slate-200">${p.kundali_reports || 'Basic Ashtakoot'}</span>`
      },
      {
        label: 'Search Visibility / Boost',
        icon: 'zap',
        getter: p => `<span class="font-bold text-amber-300">${p.search_boost || '1x Standard'}</span>`
      },
      {
        label: 'Dedicated Relationship Manager',
        icon: 'user-check',
        getter: p => p.has_advisor 
          ? '<span class="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">✓ Included Handpicked</span>' 
          : '<span class="text-slate-500 font-mono">✕</span>'
      },
      {
        label: 'Photo & Profile Privacy Shield',
        icon: 'shield-check',
        getter: p => `<span class="text-slate-300">${p.privacy_shield || 'Standard'}</span>`
      },
      {
        label: 'Customer Support SLA',
        icon: 'headphones',
        getter: p => `<span class="text-slate-300">${p.support_level || 'Priority'}</span>`
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
              class="py-1.5 px-3 rounded-xl bg-[#DFB76C]/15 hover:bg-[#DFB76C]/25 text-[#DFB76C] border border-[#D4AF37]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95" 
              title="Edit ${p.name} Attributes"
            >
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-[#DFB76C]"></i>
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
          <i data-lucide="${row.icon}" class="w-3.5 h-3.5 text-[#DFB76C]"></i>
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
    const res = await fetch(`/api/plans/${id}`);
    if (!res.ok) return showToast('Plan not found', 'error');
    const data = await res.json();
    const plan = data.plan;

    const modal = document.getElementById('planModal');
    const title = document.getElementById('planModalTitle');
    const isEdit = document.getElementById('planIsEdit');
    const idInput = document.getElementById('planId');

    title.textContent = `Edit Membership Plan: ${plan.name}`;
    isEdit.value = '1';

    idInput.value = plan.id;
    idInput.disabled = true;
    idInput.classList.add('opacity-50', 'cursor-not-allowed');

    document.getElementById('planName').value = plan.name || '';
    document.getElementById('planTagline').value = plan.tagline || '';
    document.getElementById('planBadge').value = plan.badge || '';
    document.getElementById('planColor').value = plan.color || 'amber';
    document.getElementById('planContactCredits').value = plan.contact_credits !== undefined ? plan.contact_credits : 30;
    document.getElementById('planSortOrder').value = plan.sort_order || 1;

    document.getElementById('planPrice1m').value = plan.price_1m !== undefined ? plan.price_1m : 0;
    document.getElementById('planOfferPrice1m').value = plan.offer_price_1m !== undefined ? plan.offer_price_1m : 0;
    document.getElementById('planPrice3m').value = plan.price_3m !== undefined ? plan.price_3m : 0;
    document.getElementById('planOfferPrice3m').value = plan.offer_price_3m !== undefined ? plan.offer_price_3m : 0;
    document.getElementById('planPrice6m').value = plan.price_6m !== undefined ? plan.price_6m : 0;
    document.getElementById('planOfferPrice6m').value = plan.offer_price_6m !== undefined ? plan.offer_price_6m : 0;
    document.getElementById('planPrice12m').value = plan.price_12m !== undefined ? plan.price_12m : 0;
    document.getElementById('planOfferPrice12m').value = plan.offer_price_12m !== undefined ? plan.offer_price_12m : 0;

    document.getElementById('planDailyInterests').value = plan.daily_interests || 'Unlimited';
    document.getElementById('planKundaliReports').value = plan.kundali_reports || 'Basic Ashtakoot';
    document.getElementById('planSearchBoost').value = plan.search_boost || '1x Standard';
    document.getElementById('planPrivacyShield').value = plan.privacy_shield || 'Standard Public';
    document.getElementById('planSupportLevel').value = plan.support_level || 'Priority Chat & Email (24h)';
    document.getElementById('planHasAdvisor').checked = Boolean(plan.has_advisor);

    // Format features as line items (+ or -)
    const features = plan.features_parsed || [];
    const featureLines = features.map(f => {
      const isInc = typeof f === 'object' ? f.included : true;
      const text = typeof f === 'object' ? f.text : f;
      return `${isInc ? '+' : '-'} ${text}`;
    }).join('\n');
    document.getElementById('planFeatures').value = featureLines;

    document.getElementById('planIsPopular').checked = Boolean(plan.is_popular);
    document.getElementById('planActive').checked = Boolean(plan.is_active);

    modal.showModal();
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load plan details', 'error');
  }
}

async function savePlan(e) {
  e.preventDefault();
  const isEdit = document.getElementById('planIsEdit').value === '1';
  const planId = document.getElementById('planId').value.trim().toLowerCase().replace(/\s+/g, '_');

  // Parse feature lines
  const rawFeatures = document.getElementById('planFeatures').value.split('\n');
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
    name: document.getElementById('planName').value.trim(),
    tagline: document.getElementById('planTagline').value.trim(),
    badge: document.getElementById('planBadge').value.trim() || null,
    color: document.getElementById('planColor').value,
    contact_credits: parseInt(document.getElementById('planContactCredits').value) || 0,
    sort_order: parseInt(document.getElementById('planSortOrder').value) || 1,
    price_1m: parseInt(document.getElementById('planPrice1m').value) || 0,
    offer_price_1m: parseInt(document.getElementById('planOfferPrice1m').value) || 0,
    price_3m: parseInt(document.getElementById('planPrice3m').value) || 0,
    offer_price_3m: parseInt(document.getElementById('planOfferPrice3m').value) || 0,
    price_6m: parseInt(document.getElementById('planPrice6m').value) || 0,
    offer_price_6m: parseInt(document.getElementById('planOfferPrice6m').value) || 0,
    price_12m: parseInt(document.getElementById('planPrice12m').value) || 0,
    offer_price_12m: parseInt(document.getElementById('planOfferPrice12m').value) || 0,
    daily_interests: document.getElementById('planDailyInterests').value.trim() || 'Unlimited',
    kundali_reports: document.getElementById('planKundaliReports').value.trim() || 'Basic Ashtakoot',
    search_boost: document.getElementById('planSearchBoost').value,
    privacy_shield: document.getElementById('planPrivacyShield').value,
    support_level: document.getElementById('planSupportLevel').value,
    has_advisor: document.getElementById('planHasAdvisor').checked ? 1 : 0,
    features: features,
    is_popular: document.getElementById('planIsPopular').checked,
    is_active: document.getElementById('planActive').checked
  };

  try {
    const url = isEdit ? `/api/plans/${planId}` : '/api/plans';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save membership plan');

    showToast(isEdit ? 'Membership plan updated successfully!' : 'New membership plan created!', 'success');
    document.getElementById('planModal').close();
    loadPlans();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function syncPlanToggleUI(id, isActive) {
  const isAct = (isActive === 1 || isActive === true || isActive === '1');
  document.querySelectorAll(`input[data-plan-toggle="${id}"]`).forEach(cb => {
    cb.checked = isAct;
  });
  document.querySelectorAll(`[data-plan-status-text="${id}"]`).forEach(span => {
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
  });
  const activeCountEl = document.getElementById('activePlansCount');
  if (activeCountEl) {
    activeCountEl.textContent = (state.plans || []).filter(p => p.is_active === 1 || p.is_active === true).length;
  }
  const workspaceEl = document.getElementById('mainWorkspace');
  if (workspaceEl) workspaceEl.scrollTop = 0;
}

let isTogglingPlan = false;
async function togglePlanActive(id, inputEl) {
  if (isTogglingPlan) return;
  isTogglingPlan = true;

  const workspaceEl = document.getElementById('mainWorkspace');
  if (workspaceEl) workspaceEl.scrollTop = 0;

  const plan = (state.plans || []).find(p => p.id === id);
  const oldActive = plan ? (plan.is_active === 1 || plan.is_active === true) : false;
  const newActive = oldActive ? 0 : 1;

  if (plan) {
    plan.is_active = newActive;
  }

  // Optimistic UI synchronization across cards, summary table, and comparison matrix
  syncPlanToggleUI(id, newActive);

  try {
    const res = await fetch(`/api/plans/${id}/toggle`, { 
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle plan status');

    if (plan && data.plan) {
      Object.assign(plan, data.plan);
    }

    if (plan && typeof plan.features === 'string' && (!plan.features_parsed || !plan.features_parsed.length)) {
      try { plan.features_parsed = JSON.parse(plan.features); } catch (e) { plan.features_parsed = []; }
    }

    const finalActive = plan ? (plan.is_active === 1 || plan.is_active === true ? 1 : 0) : newActive;
    syncPlanToggleUI(id, finalActive);
    showToast(data.message || 'Plan status updated successfully', 'success');
  } catch (err) {
    if (plan) {
      plan.is_active = oldActive ? 1 : 0;
      syncPlanToggleUI(id, plan.is_active);
    }
    showToast(err.message || 'Error toggling plan status', 'error');
  } finally {
    isTogglingPlan = false;
  }
}

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
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-10 text-slate-400">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#DFB76C] border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Loading transaction history...</p>
      </td>
    </tr>
  `;

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

    updatePaymentPaginationControls();

    if (!data.payments || data.payments.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-slate-400">
            <i data-lucide="receipt" class="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-50"></i>
            <p class="text-sm font-medium text-slate-300">No payment records found</p>
            <p class="text-xs text-slate-500 mt-1">Try clearing your filters or search term</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
      return;
    }

    tableBody.innerHTML = data.payments.map(p => {
      let statusBadge = '';
      if (p.status === 'completed') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>Completed</span>`;
      } else if (p.status === 'refunded') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><span class="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5"></span>Refunded</span>`;
      } else if (p.status === 'failed') {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>Failed</span>`;
      } else {
        statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>Pending</span>`;
      }

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors">
          <!-- Txn ID & Invoice -->
          <td class="py-3 px-4">
            <div class="font-mono text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>${p.transaction_id}</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono">${p.invoice_no}</div>
          </td>

          <!-- Customer / Profile -->
          <td class="py-3 px-4">
            <div class="font-medium text-white text-sm">${p.user_name}</div>
            <div class="text-xs text-slate-400">${p.plan_name}</div>
          </td>

          <!-- Amount -->
          <td class="py-3 px-4">
            <div class="text-sm font-extrabold text-white font-mono">
              ${formatINR(p.amount)}
            </div>
            <div class="text-[10px] text-slate-400 uppercase font-mono">${p.currency}</div>
          </td>

          <!-- Payment Method -->
          <td class="py-3 px-4 text-xs text-slate-300">
            <div class="flex items-center gap-1.5">
              <i data-lucide="credit-card" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${p.payment_method}</span>
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
            <div class="flex items-center justify-end space-x-1">
              <button 
                onclick="openReceiptModal(${p.id})"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors"
                title="View Invoice & Printable Receipt"
              >
                <i data-lucide="file-text" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openEditPaymentModal(${p.id})"
                class="p-1.5 text-slate-400 hover:text-[#DFB76C] hover:bg-slate-700/60 rounded-lg transition-colors"
                title="Edit Payment / Change Status"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="openDeletePaymentModal(${p.id}, '${p.transaction_id}', '${p.user_name}', ${p.amount})"
                class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Delete Transaction Record"
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
        <td colspan="7" class="text-center py-6 text-rose-400 text-xs">
          Error loading payment history.
        </td>
      </tr>
    `;
  }
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

  title.textContent = 'Record Manual / Offline Payment';
  form.reset();
  document.getElementById('paymentId').value = '';
  document.getElementById('paymentTxnId').value = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  document.getElementById('paymentStatus').value = 'completed';

  modal.showModal();
  lucide.createIcons();
}

async function openEditPaymentModal(id) {
  try {
    const res = await fetch(`/api/payments/${id}`);
    if (!res.ok) return showToast('Payment record not found', 'error');
    const p = await res.json();

    const modal = document.getElementById('paymentModal');
    const title = document.getElementById('paymentModalTitle');

    title.textContent = `Edit Transaction: ${p.transaction_id}`;
    document.getElementById('paymentId').value = p.id;
    document.getElementById('paymentTxnId').value = p.transaction_id;
    document.getElementById('paymentUserName').value = p.user_name;
    document.getElementById('paymentPlanName').value = p.plan_name;
    document.getElementById('paymentAmount').value = p.amount;
    document.getElementById('paymentMethod').value = p.payment_method;
    document.getElementById('paymentStatus').value = p.status;
    document.getElementById('paymentNotes').value = p.notes || '';

    modal.showModal();
    lucide.createIcons();
  } catch (e) {
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
    const url = isEdit ? `/api/payments/${id}` : '/api/payments';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save payment');

    showToast(isEdit ? 'Payment record updated!' : 'New payment recorded!', 'success');
    document.getElementById('paymentModal').close();
    loadPayments();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeletePaymentModal(id, txnId, userName, amount) {
  state.pendingDelete = {
    type: 'payment',
    id,
    name: `${txnId} (${userName} - ${formatINR(amount)})`
  };
  document.getElementById('deleteConfirmTarget').textContent = `Transaction: ${txnId} for ${userName} (${formatINR(amount)})`;
  document.getElementById('deleteModal').showModal();
}

async function openReceiptModal(id) {
  try {
    const res = await fetch(`/api/payments/${id}`);
    if (!res.ok) return showToast('Payment not found', 'error');
    const p = await res.json();

    document.getElementById('receiptInvoiceNo').textContent = p.invoice_no;
    document.getElementById('receiptDate').textContent = formatDateTime(p.payment_date);
    document.getElementById('receiptTxnId').textContent = p.transaction_id;
    document.getElementById('receiptCustomerName').textContent = p.user_name;
    document.getElementById('receiptPlanName').textContent = p.plan_name;
    document.getElementById('receiptMethod').textContent = p.payment_method;
    document.getElementById('receiptStatus').textContent = p.status.toUpperCase();
    document.getElementById('receiptSubtotal').textContent = formatINR(p.amount);
    document.getElementById('receiptTotal').textContent = formatINR(p.amount);
    document.getElementById('receiptNotes').textContent = p.notes || 'Official online payment receipt from I 4 You Matrimonial Portal.';

    document.getElementById('receiptModal').showModal();
    lucide.createIcons();
  } catch (e) {
    showToast('Failed to generate receipt', 'error');
  }
}

// Print Receipt helper
function printReceipt() {
  window.print();
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
    const res = await fetch('/api/admin/users');
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
        ? 'bg-amber-500/10 text-[#DFB76C] border-amber-500/20'
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

      return `
        <tr class="hover:bg-white/[0.02] transition-colors">
          <td class="py-3 px-3">
            <div class="flex items-center space-x-3">
              <img src="${escapeHtml(avatarUrl)}" alt="Avatar" class="w-8 h-8 rounded-full object-cover border border-[#DFB76C]/30 flex-shrink-0" />
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
  if (!state.admin) return;
  openEditAdminModal(state.admin.id);
}

async function openEditAdminModal(adminId) {
  try {
    const res = await fetch(`/api/admin/users/${adminId}`);
    if (!res.ok) throw new Error('Administrator not found');
    const admin = await res.json();

    document.getElementById('adminFormId').value = admin.id;
    document.getElementById('adminFormMode').value = 'edit';
    document.getElementById('adminModalTitle').textContent = 'Edit Administrator Profile';
    document.getElementById('adminModalSubtitle').textContent = `Editing credentials for ${admin.full_name}`;
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

    document.getElementById('adminModal').showModal();
    lucide.createIcons();
  } catch (e) {
    showToast(e.message, 'error');
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

  document.getElementById('adminModal').showModal();
  lucide.createIcons();
}

async function saveAdminForm(event) {
  event.preventDefault();
  const id = document.getElementById('adminFormId').value;
  const mode = document.getElementById('adminFormMode').value;
  const fullName = document.getElementById('adminFormFullName').value.trim();
  const username = document.getElementById('adminFormUsername').value.trim();
  const email = document.getElementById('adminFormEmail').value.trim();
  const role = document.getElementById('adminFormRole').value;
  const avatar = document.getElementById('adminFormAvatar').value.trim();
  const password = document.getElementById('adminFormPassword').value;
  const passwordConfirm = document.getElementById('adminFormPasswordConfirm').value;

  if (password || mode === 'create') {
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showToast('Passwords do not match. Please re-enter identical passwords.', 'error');
      return;
    }
  }

  const payload = {
    full_name: fullName,
    username: username,
    email: email,
    role: role,
    avatar: avatar
  };
  if (password) {
    payload.password = password;
  }

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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save administrator');

    showToast(data.message || 'Administrator saved successfully', 'success');
    document.getElementById('adminModal').close();

    // If updating current logged-in user, refresh state.admin and sidebar
    if (state.admin && (state.admin.id == id || (!id && data.admin && data.admin.id == state.admin.id) || (data.admin && state.admin.email === email))) {
      state.admin = data.admin;
      updateAdminProfileUI();
    }

    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openDeleteCurrentAdminModal() {
  if (!state.admin) return;
  openDeleteAdminUserModal(state.admin.id, state.admin.full_name || state.admin.username);
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
    lucide.createIcons();
  }
  document.getElementById('deleteModal').showModal();
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
        <div class="inline-block animate-spin w-6 h-6 border-2 border-[#DFB76C] border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Loading Aadhaar verification candidates...</p>
      </td>
    </tr>
  `;

  try {
    // 1. Fetch metrics from analytics
    fetch('/api/analytics').then(r => r.json()).then(data => {
      if (data && data.kpi) {
        const total = data.kpi.total_users || 0;
        const pending = data.kpi.pending_verifications || 0;
        const approved = (data.verification_breakdown && data.verification_breakdown.aadhaar_verified) || 0;
        const rate = data.kpi.verification_rate || 0;

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

    const res = await fetch(`/api/users?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch verification list');
    const data = await res.json();

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
              <div class="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#D4AF37]/30 bg-slate-800">
                <img src="${u.photo || (String(u.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')}" alt="${u.name}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"/>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-white text-sm hover:text-[#DFB76C] cursor-pointer truncate" onclick="openViewProfileModal('${u.id}')">${u.name}</span>
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
              <span class="font-medium">${u.phone || 'N/A'}</span>
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
                class="p-1.5 text-slate-400 hover:text-[#DFB76C] hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer" 
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
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-rose-400 text-xs">
          Error loading verification candidates: ${err.message}. Please retry.
        </td>
      </tr>
    `;
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
      <div class="col-span-full text-center py-12 text-slate-400 bg-[#0B192C] rounded-3xl border border-slate-800 p-8">
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
      <div class="rounded-3xl bg-[#0B192C] border ${isApproved ? 'border-emerald-500/40' : 'border-amber-500/40'} p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#DFB76C]/60 transition-all">
        <!-- Top Profile & Status Bar -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center space-x-3 min-w-0">
            <img 
              src="${u.photo || (String(u.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')}" 
              alt="${u.name}" 
              class="w-12 h-12 rounded-2xl object-cover border border-[#D4AF37]/50 flex-shrink-0"
              onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h4 class="font-bold text-white text-sm hover:text-[#DFB76C] cursor-pointer truncate" onclick="openViewProfileModal('${u.id}')">${u.name}</h4>
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
        <div class="bg-[#070F1E] p-3 rounded-2xl border border-slate-800 space-y-2">
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
    const res = await fetch(`/api/users/${userId}?_t=${Date.now()}`);
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
    <div class="w-full max-w-[620px] bg-[#070F1E] rounded-2xl border border-emerald-500/40 shadow-2xl overflow-hidden p-4 space-y-3.5 animate-in fade-in duration-150">
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
            <i data-lucide="external-link" class="w-3 h-3 text-[#DFB76C]"></i>
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
          <i data-lucide="camera" class="w-3.5 h-3.5 text-[#DFB76C]"></i>
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
      <div id="aadhaarCardPaper" class="w-full max-w-[560px] bg-[#FEFEFE] text-[#0B192C] rounded-2xl shadow-2xl border-2 border-slate-300 overflow-hidden relative select-none font-sans transition-all duration-200">
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
          <div class="relative w-24 h-28 sm:w-28 sm:h-34 rounded-xl overflow-hidden border-2 border-[#D4AF37] shadow-sm flex-shrink-0 bg-slate-200">
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
          <p class="text-[11px] text-slate-600 font-mono pt-1">Registered Contact: ${u.phone || 'Verified'}</p>
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
      headers: { 'Content-Type': 'application/json' },
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
  const activeGoldClass = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-[#DFB76C] text-slate-950 shadow-sm cursor-pointer';
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
      headers: { 'Content-Type': 'application/json' },
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


