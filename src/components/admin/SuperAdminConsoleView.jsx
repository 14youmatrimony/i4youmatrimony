import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  ShieldAlert,
  Users,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Download,
  Key,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Smartphone,
  Globe,
  Settings,
  DollarSign,
  Tag,
  CreditCard,
  FileSpreadsheet,
  LogOut,
  AlertTriangle,
  UserCheck,
  Building,
  Check,
  X
} from 'lucide-react';
import { MEMBERSHIP_PLANS } from '../../data/plansData';
import { INITIAL_PROFILES } from '../../data/mockProfiles';
import { fetchLiveProfiles } from '../../services/api';

const DEFAULT_ADMIN_STAFF = [
  { id: 1, name: 'Arun Thomas', email: 'admin@i4you.com', role: 'Super Admin', status: 'Active', lastActive: 'Just now', permissions: 'Full Root Access (All 20 Modules)' },
  { id: 2, name: 'Priya Nair', email: 'crm@i4you.com', role: 'CRM Manager', status: 'Active', lastActive: '12m ago', permissions: 'Candidate & Plan Management' },
  { id: 3, name: 'Kavita Iyer', email: 'finance@i4you.com', role: 'Finance Manager', status: 'Active', lastActive: '1 hour ago', permissions: 'Payments, Ledgers & Invoices' },
  { id: 4, name: 'Arun Kumar', email: 'support@i4you.com', role: 'Support Executive', status: 'Active', lastActive: '3 hours ago', permissions: 'Aadhaar Verification & Tickets' },
  { id: 5, name: 'Security Officer', email: 'security@i4you.com', role: 'Security Admin', status: 'Active', lastActive: 'Yesterday', permissions: 'Audit Trail & Encryption' }
];

export default function SuperAdminConsoleView({
  onSwitchToWebsite = () => { window.location.href = '/'; },
  onSwitchToApp = () => { window.location.href = '/app'; },
  onSwitchToAdmin = () => { window.location.href = '/admin'; }
}) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('i4you_super_admin_auth') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('admin@i4you.com');
  const [loginPassword, setLoginPassword] = useState('Admin@12345');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Super Admin Tabs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'verifications' | 'plans' | 'offers' | 'staff' | 'audit'

  // Profiles State
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedProfileDetail, setSelectedProfileDetail] = useState(null);

  // Staff State
  const [staffList, setStaffList] = useState(DEFAULT_ADMIN_STAFF);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('CRM Manager');

  // Coupon Engine State
  const [promoCodes, setPromoCodes] = useState([
    { id: 'c1', code: 'SUPER50', discount: '50% OFF', description: 'Executive Super Admin Campaign', active: true, uses: 312 },
    { id: 'c2', code: 'FESTIVE50', discount: '50% OFF', description: 'Vivah Mahotsav Special', active: true, uses: 142 },
    { id: 'c3', code: 'FIRSTMATCH', discount: '₹ 1,000 OFF', description: 'New Member Welcome Discount', active: true, uses: 89 },
    { id: 'c4', code: 'ELITECLUB', discount: '30% OFF', description: 'Relationship Manager Plan', active: true, uses: 45 }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('25% OFF');

  // Membership Plans
  const [plans, setPlans] = useState(MEMBERSHIP_PLANS);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState('');

  // Server Status
  const [serverStatus, setServerStatus] = useState({ checking: true, online: false, url: 'http://localhost:5000' });

  // Sync profiles from live API
  useEffect(() => {
    let isMounted = true;
    fetchLiveProfiles().then(liveData => {
      if (isMounted && liveData && liveData.length > 0) {
        setProfiles(liveData);
      }
    }).catch(() => {});

    // Check backend health
    fetch('/api/public/profiles')
      .then(res => {
        if (isMounted) setServerStatus({ checking: false, online: res.ok, url: 'http://localhost:5000' });
      })
      .catch(() => {
        if (isMounted) setServerStatus({ checking: false, online: false, url: 'http://localhost:5000' });
      });

    return () => { isMounted = false; };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Login handler
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');

    // Try backend authentication first
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    })
      .then(res => res.json())
      .then(data => {
        setIsAuthenticating(false);
        if (data.success && (data.user?.role === 'Super Admin' || data.admin?.role === 'Super Admin')) {
          sessionStorage.setItem('i4you_super_admin_auth', 'true');
          setIsAuthenticated(true);
          showToast('Welcome back, Super Admin Arun Thomas!');
        } else if (
          (loginEmail.toLowerCase() === 'admin@i4you.com' || loginEmail.toLowerCase() === 'admin') &&
          loginPassword === 'Admin@12345'
        ) {
          // Master Fallback for Client / Vercel Live Deployment
          sessionStorage.setItem('i4you_super_admin_auth', 'true');
          setIsAuthenticated(true);
          showToast('Master Key Accepted: Super Admin Access Granted!');
        } else {
          setAuthError(data.error || 'Invalid Super Admin credentials. Please check Email and Password.');
        }
      })
      .catch(() => {
        setIsAuthenticating(false);
        // Offline / Vercel direct fallback
        if (
          (loginEmail.toLowerCase() === 'admin@i4you.com' || loginEmail.toLowerCase() === 'admin') &&
          loginPassword === 'Admin@12345'
        ) {
          sessionStorage.setItem('i4you_super_admin_auth', 'true');
          setIsAuthenticated(true);
          showToast('Master Key Accepted: Super Admin Access Granted!');
        } else {
          setAuthError('Invalid credentials. Default Super Admin: admin@i4you.com / Admin@12345');
        }
      });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('i4you_super_admin_auth');
    setIsAuthenticated(false);
    showToast('Super Admin logged out securely.');
  };

  // Aadhaar Toggle
  const handleToggleAadhaar = (profileId) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const newStatus = !p.aadhaarVerified;
        showToast(`Aadhaar status updated for ${p.name}: ${newStatus ? 'VERIFIED' : 'PENDING'}`);
        return { ...p, aadhaarVerified: newStatus, aadhaarStatus: newStatus ? 'approved' : 'pending' };
      }
      return p;
    }));
  };

  // Profile Verified Badge Toggle
  const handleToggleVerified = (profileId) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const newVerified = !p.verified;
        showToast(`Candidate Trust Badge: ${p.name} is now ${newVerified ? 'VERIFIED' : 'UNVERIFIED'}`);
        return { ...p, verified: newVerified };
      }
      return p;
    }));
  };

  // Delete Profile
  const handleDeleteProfile = (profileId, name) => {
    if (window.confirm(`⚠️ SUPER ADMIN ACTION: Are you sure you want to permanently delete candidate "${name}"?`)) {
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      showToast(`Candidate ${name} was permanently removed by Super Admin.`);
      if (selectedProfileDetail?.id === profileId) {
        setSelectedProfileDetail(null);
      }
    }
  };

  // Add Staff Member
  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      alert('Please provide name and email.');
      return;
    }
    const newStaff = {
      id: Date.now(),
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      status: 'Active',
      lastActive: 'Invited just now',
      permissions: newStaffRole === 'Super Admin' ? 'Full Root Access' : `${newStaffRole} Delegated Modules`
    };
    setStaffList(prev => [...prev, newStaff]);
    setNewStaffName('');
    setNewStaffEmail('');
    setIsAddStaffModalOpen(false);
    showToast(`New administrator "${newStaff.name}" added with role ${newStaffRole}!`);
  };

  // Remove Staff Member
  const handleRemoveStaff = (id, name) => {
    if (id === 1) {
      alert('Root Super Admin (Arun Thomas) cannot be deleted.');
      return;
    }
    if (window.confirm(`Revoke administrative access for ${name}?`)) {
      setStaffList(prev => prev.filter(s => s.id !== id));
      showToast(`Administrative privileges revoked for ${name}.`);
    }
  };

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.profession && p.profession.toLowerCase().includes(q));
      
      const matchGender = genderFilter === 'all' || (p.gender && p.gender.toLowerCase() === genderFilter);
      return matchQuery && matchGender;
    });
  }, [profiles, searchQuery, genderFilter]);

  // Export JSON Database
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `i4you_superadmin_database_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Master Database Backup downloaded as JSON!');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Age', 'Gender', 'Religion', 'Caste', 'City', 'Phone', 'AadhaarVerified', 'Verified'];
    const rows = profiles.map(p => [
      p.id,
      `"${p.name || ''}"`,
      p.age || '',
      p.gender || '',
      `"${p.religion || ''}"`,
      `"${p.caste || ''}"`,
      `"${p.city || ''}"`,
      `"${p.phone || ''}"`,
      p.aadhaarVerified ? 'YES' : 'NO',
      p.verified ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `i4you_candidates_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Candidate records exported as CSV spreadsheet!');
  };

  // =========================================================================
  // VIEW 1: SUPER ADMIN LOGIN GATE SCREEN (When unauthenticated)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans selection:bg-[#DFB76C]/30 selection:text-white">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-[#D4AF37]/15 to-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full relative z-10 space-y-6">
          {/* Logo & Super Admin Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] shadow-xl shadow-[#D4AF37]/20 border border-amber-300/40">
              <Crown className="w-8 h-8 text-[#050B14]" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-extrabold uppercase tracking-widest mb-1.5">
                Root Executive Clearance
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
                Super Admin Portal
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                I 4 You Matrimonial Global Governance & Control Suite
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-[#0B1526]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-white/10 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#DFB76C]" />
              <span>Restricted to Authorized Master Administrators</span>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Super Admin Email / Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full bg-[#050B14] border border-white/15 focus:border-[#DFB76C] rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-hidden transition-all"
                    placeholder="admin@i4you.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Master Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full bg-[#050B14] border border-white/15 focus:border-[#DFB76C] rounded-xl py-2.5 px-3.5 text-white placeholder-slate-500 focus:outline-hidden transition-all"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#C59B27] text-[#050B14] font-extrabold text-sm shadow-lg shadow-[#D4AF37]/25 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#050B14]" />
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-[#050B14]" />
                      <span>Authenticate as Super Admin</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Preset Hint */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-300 text-[11px] space-y-1">
                <span className="font-semibold text-amber-300 block">Default Super Admin Credentials:</span>
                <div className="flex justify-between text-slate-400">
                  <span>Username: <strong className="text-white">admin@i4you.com</strong></span>
                  <span>Password: <strong className="text-white">Admin@12345</strong></span>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={onSwitchToWebsite}
                className="hover:text-amber-300 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Main Website</span>
              </button>
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="hover:text-amber-300 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Standard Admin Console</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED SUPER ADMIN MASTER CONSOLE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#050B14] text-slate-100 flex flex-col font-sans selection:bg-[#DFB76C]/30 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-[#050B14]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP EXECUTIVE BAR */}
      <header className="sticky top-0 z-40 bg-[#0B1526]/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Super Admin Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-md flex items-center justify-center">
              <Crown className="w-5 h-5 text-[#050B14]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-serif font-black text-white tracking-wide">
                  I 4 You
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-[10px] tracking-widest uppercase">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged in: <strong className="text-slate-200">Arun Thomas</strong> (Root Executive)
              </p>
            </div>
          </div>

          {/* Quick Cross-Navigation & Controls */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <button
              onClick={onSwitchToWebsite}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#DFB76C]" />
              <span>Website</span>
            </button>

            <button
              onClick={onSwitchToApp}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>App</span>
            </button>

            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standard Admin</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Exit</span>
            </button>
          </div>

        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="bg-[#070F1E] border-b border-white/10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-2.5 no-scrollbar text-xs">
          {[
            { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
            { id: 'users', label: 'Candidate Master', icon: Users, badge: profiles.length },
            { id: 'verifications', label: 'Aadhaar / KYC', icon: ShieldCheck, badge: profiles.filter(p => !p.aadhaarVerified).length },
            { id: 'plans', label: 'Plans & Pricing', icon: DollarSign },
            { id: 'offers', label: 'Coupons & Sales', icon: Tag },
            { id: 'staff', label: 'Admin Staff & Roles', icon: Key, badge: staffList.length },
            { id: 'audit', label: 'Diagnostics & Backup', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] shadow-md shadow-[#D4AF37]/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-[#050B14] text-[#DFB76C]' : 'bg-white/10 text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN BODY AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ===================================================================
            TAB 1: EXECUTIVE OVERVIEW
            =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 shadow-lg space-y-1">
                <span className="text-slate-400 text-xs">Total Registered Candidates</span>
                <div className="text-2xl sm:text-3xl font-black text-white">{profiles.length}</div>
                <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% active profiles</span>
                </span>
              </div>

              <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 shadow-lg space-y-1">
                <span className="text-slate-400 text-xs">Pending Aadhaar KYC</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  {profiles.filter(p => !p.aadhaarVerified).length}
                </div>
                <span className="text-[11px] text-amber-400">Requires review</span>
              </div>

              <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 shadow-lg space-y-1">
                <span className="text-slate-400 text-xs">Gross Membership Revenue</span>
                <div className="text-2xl sm:text-3xl font-black text-[#DFB76C]">₹ 1,48,990</div>
                <span className="text-[11px] text-emerald-400">+18% this month</span>
              </div>

              <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 shadow-lg space-y-1">
                <span className="text-slate-400 text-xs">Administrative Team</span>
                <div className="text-2xl sm:text-3xl font-black text-white">{staffList.length}</div>
                <span className="text-[11px] text-purple-400">All modules manned</span>
              </div>
            </div>

            {/* Quick Executive Actions */}
            <div className="bg-[#0B1526] p-5 rounded-3xl border border-[#D4AF37]/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-[#DFB76C]" />
                  <h3 className="font-serif font-bold text-base text-white">Super Admin Command Center</h3>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Full Authority Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <button
                  onClick={() => setActiveTab('verifications')}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer space-y-1"
                >
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Approve Pending Aadhaar</span>
                  </span>
                  <p className="text-[11px] text-slate-400">Fast-track identity review for candidate safety.</p>
                </button>

                <button
                  onClick={() => setActiveTab('staff')}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer space-y-1"
                >
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>Manage Staff & Roles</span>
                  </span>
                  <p className="text-[11px] text-slate-400">Add or revoke permissions for sub-administrators.</p>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer space-y-1"
                >
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Download className="w-4 h-4 text-[#DFB76C]" />
                    <span>Export Full Database Backup</span>
                  </span>
                  <p className="text-[11px] text-slate-400">Download complete candidate and telemetry records.</p>
                </button>
              </div>
            </div>

            {/* Candidate Quick Feed */}
            <div className="bg-[#0B1526] rounded-3xl border border-white/10 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-white">Recent Candidate Registrations</h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-[#DFB76C] hover:underline cursor-pointer"
                >
                  View All Candidates →
                </button>
              </div>

              <div className="divide-y divide-white/5 text-xs">
                {profiles.slice(0, 5).map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#DFB76C]/40"
                      />
                      <div>
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{p.name}</span>
                          {p.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                          {p.aadhaarVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400">{p.age} Yrs • {p.city || 'Kerala'} • {p.profession}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedProfileDetail(p)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ===================================================================
            TAB 2: CANDIDATE MASTER DATABASE
            =================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Search & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1526] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, city, profession, or ID..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="bg-[#050B14] border border-white/15 rounded-xl px-2.5 py-1.5 text-white focus:outline-hidden"
                >
                  <option value="all">All Genders</option>
                  <option value="female">Women</option>
                  <option value="male">Men</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-[#0B1526] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050B14] text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5">Age/Gender</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Profession</th>
                      <th className="p-3.5">Aadhaar</th>
                      <th className="p-3.5">Trust Badge</th>
                      <th className="p-3.5 text-right">Super Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProfiles.map(p => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 flex items-center space-x-3">
                          <img
                            src={p.photo}
                            alt={p.name}
                            className="w-9 h-9 rounded-xl object-cover border border-white/10"
                          />
                          <div>
                            <div className="font-bold text-white">{p.name}</div>
                            <span className="text-[10px] text-slate-500">{p.id}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {p.age} Yrs • <span className="capitalize">{p.gender}</span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {p.city || 'Kerala'}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {p.profession}
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleAadhaar(p.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                              p.aadhaarVerified
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                          >
                            {p.aadhaarVerified ? '✓ Verified' : '⏳ Pending'}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleVerified(p.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                              p.verified
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {p.verified ? '✓ Official' : 'Standard'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedProfileDetail(p)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p.id, p.name)}
                            className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/20 cursor-pointer"
                            title="Super Admin: Permanently Delete Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ===================================================================
            TAB 3: AADHAAR / KYC VERIFICATION DESK
            =================================================================== */}
        {activeTab === 'verifications' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-sm">Aadhaar & Government ID Verification Desk</h3>
                <p className="text-xs text-slate-400">Review pending identity submissions to guarantee safety for Kerala families.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                {profiles.filter(p => !p.aadhaarVerified).length} Pending Candidates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map(p => (
                <div key={p.id} className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 shadow-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <img src={p.photo} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-[11px] text-slate-400">{p.age} Yrs • {p.city || 'Kerala'} • {p.phone || '+91 98201 44521'}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Aadhaar Status:</span>
                      <strong className={p.aadhaarVerified ? 'text-emerald-400' : 'text-amber-400'}>
                        {p.aadhaarVerified ? 'Approved' : 'Pending Verification'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Encryption Key:</span>
                      <span className="text-slate-300 font-mono text-[10px]">AES-256 Customer Key</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1 text-xs">
                    <button
                      onClick={() => handleToggleAadhaar(p.id)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                        p.aadhaarVerified
                          ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{p.aadhaarVerified ? 'Mark as Pending' : 'Approve Aadhaar'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedProfileDetail(p)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: PLANS & PRICING MASTER
            =================================================================== */}
        {activeTab === 'plans' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-sm">Membership Plans & Pricing Master Control</h3>
                <p className="text-xs text-slate-400">Live tariff rates currently published to the mobile app and website.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                {plans.length} Active Tiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="bg-[#0B1526] p-5 rounded-2xl border border-white/10 space-y-3 relative">
                  {plan.isPopular && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#DFB76C] text-[#050B14] font-black text-[9px] uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}
                  <h4 className="font-serif font-bold text-white text-base">{plan.name}</h4>
                  <div className="text-2xl font-black text-[#DFB76C]">
                    ₹{plan.price}
                    <span className="text-xs text-slate-400 font-normal"> / {plan.validity}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs text-slate-300">
                    <p>• {plan.contactsLimit || 'Limited'} Contacts</p>
                    <p>• {plan.chatsLimit || 'Unlimited'} Direct Chats</p>
                    <p>• {plan.horoscopeLimit || 'Full'} Astro Matches</p>
                  </div>

                  <button
                    onClick={() => {
                      const newPrice = prompt(`Enter new price for ${plan.name}:`, plan.price);
                      if (newPrice && !isNaN(newPrice)) {
                        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price: parseInt(newPrice) } : p));
                        showToast(`Price for ${plan.name} updated to ₹${newPrice}!`);
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>Edit Tariff Price</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: PROMOTIONAL OFFERS & COUPONS
            =================================================================== */}
        {activeTab === 'offers' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-sm">Promotional Discount Engine & Promo Codes</h3>
                <p className="text-xs text-slate-400">Manage promo codes redeemable during checkout on website and app.</p>
              </div>
            </div>

            {/* Create Coupon Bar */}
            <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE (e.g. KERALA40)"
                className="bg-[#050B14] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden uppercase"
              />
              <input
                type="text"
                value={newCouponDiscount}
                onChange={(e) => setNewCouponDiscount(e.target.value)}
                placeholder="Discount (e.g. 40% OFF or ₹1500 OFF)"
                className="bg-[#050B14] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden"
              />
              <button
                onClick={() => {
                  if (!newCouponCode.trim()) return;
                  setPromoCodes(prev => [
                    ...prev,
                    {
                      id: `c_${Date.now()}`,
                      code: newCouponCode.trim(),
                      discount: newCouponDiscount.trim() || '20% OFF',
                      description: 'Super Admin Special Campaign',
                      active: true,
                      uses: 0
                    }
                  ]);
                  setNewCouponCode('');
                  showToast(`Promo code "${newCouponCode}" activated!`);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-extrabold text-xs cursor-pointer shadow-md"
              >
                + Add Promo Code
              </button>
            </div>

            {/* Coupons List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {promoCodes.map(c => (
                <div key={c.id} className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#DFB76C]">{c.code}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {c.discount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{c.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                    <span>{c.uses} redemptions</span>
                    <button
                      onClick={() => {
                        setPromoCodes(prev => prev.filter(x => x.id !== c.id));
                        showToast(`Promo code ${c.code} removed.`);
                      }}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: ADMIN STAFF & ROLES (SUPER ADMIN EXCLUSIVE)
            =================================================================== */}
        {activeTab === 'staff' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1526] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-white text-sm">Administrative Staff & Role Governance</h3>
                <p className="text-xs text-slate-400">Exclusive Super Admin control over sub-admins, CRM managers, and finance officers.</p>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-extrabold text-xs shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Administrator</span>
              </button>
            </div>

            <div className="bg-[#0B1526] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050B14] text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Administrator</th>
                      <th className="p-3.5">Assigned Role</th>
                      <th className="p-3.5">Permissions Module</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Last Seen</th>
                      <th className="p-3.5 text-right">Super Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staffList.map(staff => (
                      <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{staff.name}</span>
                            {staff.role === 'Super Admin' && <Crown className="w-3.5 h-3.5 text-[#DFB76C]" />}
                          </div>
                          <span className="text-[11px] text-slate-400">{staff.email}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            staff.role === 'Super Admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{staff.permissions}</td>
                        <td className="p-3.5 text-emerald-400 font-bold">{staff.status}</td>
                        <td className="p-3.5 text-slate-400">{staff.lastActive}</td>
                        <td className="p-3.5 text-right">
                          {staff.id !== 1 ? (
                            <button
                              onClick={() => handleRemoveStaff(staff.id, staff.name)}
                              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/20 cursor-pointer"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-bold">Root Master</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 7: DIAGNOSTICS & BACKUP
            =================================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1526] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <h3 className="font-serif font-bold text-base text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#DFB76C]" />
                <span>System Architecture, Encryption & Backup Inspector</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Database Status</span>
                  <span className="text-base font-bold text-white block">
                    {serverStatus.online ? 'Python Flask (Port 5000)' : 'Client SQLite / React'}
                  </span>
                  <span className="text-[10px] text-emerald-400">Real-Time Sync Ready</span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Aadhaar Data Protection</span>
                  <span className="text-base font-bold text-white block">AES-256 Customer Key</span>
                  <span className="text-[10px] text-[#DFB76C]">Watermarked Privacy Shutter</span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Global Deployment CDN</span>
                  <span className="text-base font-bold text-white block">Vercel Edge Network</span>
                  <span className="text-[10px] text-blue-400">Live SSL Certified</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-extrabold text-xs shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Master Database (.JSON)</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 cursor-pointer flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export Candidates (.CSV)</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* =====================================================================
          ADD STAFF MODAL (SUPER ADMIN EXCLUSIVE)
          ===================================================================== */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1526] border border-[#D4AF37]/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddStaffModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-[#DFB76C]" />
              <h3 className="font-serif font-bold text-base text-white">Add New Administrator</h3>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Rahul Menon"
                  required
                  className="w-full bg-[#050B14] border border-white/15 rounded-xl py-2 px-3 text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="rahul@i4you.com"
                  required
                  className="w-full bg-[#050B14] border border-white/15 rounded-xl py-2 px-3 text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Administrative Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full bg-[#050B14] border border-white/15 rounded-xl py-2 px-3 text-white focus:outline-hidden"
                >
                  <option value="CRM Manager">CRM Manager (Matchmaking & Profiles)</option>
                  <option value="Finance Manager">Finance Manager (Payments & Ledgers)</option>
                  <option value="Support Executive">Support Executive (Aadhaar & Verification)</option>
                  <option value="Security Admin">Security Admin (Audit Logs & Encryption)</option>
                  <option value="Super Admin">Super Admin (Full Root Authority)</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Create Administrative Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CANDIDATE INSPECT MODAL
          ===================================================================== */}
      {selectedProfileDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1526] border border-[#D4AF37]/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs">
            <button
              onClick={() => setSelectedProfileDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-4">
              <img
                src={selectedProfileDetail.photo}
                alt={selectedProfileDetail.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#DFB76C]"
              />
              <div>
                <h3 className="text-lg font-serif font-bold text-white">{selectedProfileDetail.name}</h3>
                <p className="text-xs text-slate-300">
                  {selectedProfileDetail.age} Yrs • {selectedProfileDetail.gender} • {selectedProfileDetail.city || 'Kerala'}
                </p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {selectedProfileDetail.aadhaarVerified ? 'Aadhaar Verified' : 'Aadhaar Pending'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    {selectedProfileDetail.verified ? 'Official Badge' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Education:</span>
                <span className="text-white font-medium">{selectedProfileDetail.education || 'Graduate'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Profession:</span>
                <span className="text-white font-medium">{selectedProfileDetail.profession || 'Professional'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Annual Income:</span>
                <span className="text-[#DFB76C] font-bold">{selectedProfileDetail.annualIncome || '₹ 15 - 20 LPA'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Community / Religion:</span>
                <span className="text-white">{selectedProfileDetail.religion || 'Hindu'} ({selectedProfileDetail.caste || 'General'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone Contact:</span>
                <span className="text-white font-mono">{selectedProfileDetail.phone || '+91 98201 00000'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  handleToggleAadhaar(selectedProfileDetail.id);
                  setSelectedProfileDetail(prev => ({ ...prev, aadhaarVerified: !prev.aadhaarVerified }));
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#050B14] font-extrabold text-xs cursor-pointer shadow-md"
              >
                {selectedProfileDetail.aadhaarVerified ? 'Revoke Aadhaar' : 'Approve Aadhaar'}
              </button>

              <button
                onClick={() => handleDeleteProfile(selectedProfileDetail.id, selectedProfileDetail.name)}
                className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/20 font-bold text-xs cursor-pointer"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
