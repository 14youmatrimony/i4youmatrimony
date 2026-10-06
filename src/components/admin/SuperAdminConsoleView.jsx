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
  X,
  Phone,
  Clock,
  Sparkles,
  FileText,
  Edit3,
  Undo2,
  FileCheck2,
  FileQuestion,
  Receipt
} from 'lucide-react';
import { MEMBERSHIP_PLANS } from '../../data/plansData';
import { INITIAL_PROFILES } from '../../data/mockProfiles';
import { fetchLiveProfiles } from '../../services/api';

// Exact candidates from user's system including both Mattayi profiles shown in screenshot
const SEEDED_SUPER_ADMIN_PROFILES = [
  {
    id: 'p_1791044904217',
    name: 'Mattayi',
    age: 25,
    gender: 'Male',
    city: 'Kollam',
    district: 'Kollam',
    phone: '9876543210',
    email: '',
    photo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    aadhaar_front_image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=400',
    aadhaar_back_image: null,
    maskedAadhaar: 'XXXX XXXX 5928',
    aadhaarVerified: false,
    aadhaar_verified: 0,
    aadhaar_status: 'sent_back',
    aadhaar_rejection_reason: 'Photo is blurry or unreadable',
    verified: false,
    profession: 'Software Engineer',
    education: 'B.Tech Computer Science',
    religion: 'Christian',
    caste: 'Knanaya Catholic',
    status: 'active'
  },
  {
    id: 'p_1791044904221',
    name: 'Mattayi',
    age: 25,
    gender: 'Male',
    city: 'Kollam',
    district: 'Kollam',
    phone: '9876543210',
    email: '',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    aadhaar_front_image: null,
    aadhaar_back_image: null,
    maskedAadhaar: 'XXXX XXXX 5928',
    aadhaarVerified: false,
    aadhaar_verified: 0,
    aadhaar_status: 'sent_back',
    aadhaar_rejection_reason: 'Glare or reflection covers Aadhaar details. Please re-take in proper lighting.',
    verified: false,
    profession: 'Senior Pediatric Specialist',
    education: 'BDS / MDS (Dental)',
    religion: 'Christian',
    caste: 'Knanaya Catholic',
    status: 'active'
  },
  ...INITIAL_PROFILES.map((p, idx) => ({
    ...p,
    aadhaarVerified: true,
    aadhaar_verified: 1,
    aadhaar_status: 'approved',
    maskedAadhaar: `XXXX XXXX ${4000 + idx}`,
    aadhaar_front_image: p.photo,
    phone: p.phone || '+91 98201 44521',
    email: p.email || `${p.name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    status: 'active'
  }))
];

export default function SuperAdminConsoleView({
  onSwitchToWebsite = () => { window.location.href = '/'; },
  onSwitchToApp = () => { window.location.href = '/app'; },
  onSwitchToAdmin = () => { window.location.href = '/admin'; }
}) {
  // Tabs: 'overview' | 'users' | 'aadhaar' | 'offers' | 'plans' | 'payments' | 'settings'
  // Default to 'aadhaar' to match user's screenshot exactly
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    return tabParam || hash || 'aadhaar';
  });

  // Profiles State
  const [profiles, setProfiles] = useState(SEEDED_SUPER_ADMIN_PROFILES);

  // Aadhaar Filter: 'pending' | 'sent_back' | 'approved' | 'all'
  const [aadhaarFilter, setAadhaarFilter] = useState('pending');
  const [aadhaarSearch, setAadhaarSearch] = useState('');
  const [aadhaarViewMode, setAadhaarViewMode] = useState('table'); // 'table' | 'cards'

  // Modals & Details
  const [selectedProfileDetail, setSelectedProfileDetail] = useState(null);
  const [selectedAadhaarCard, setSelectedAadhaarCard] = useState(null);
  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const [sendBackTarget, setSendBackTarget] = useState(null);
  const [sendBackReason, setSendBackReason] = useState('Photo is blurry or unreadable');

  // Search input in top bar
  const [globalSearch, setGlobalSearch] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Sync profiles if live backend is reachable
  useEffect(() => {
    let isMounted = true;
    fetchLiveProfiles().then(liveData => {
      if (isMounted && liveData && liveData.length > 0) {
        // Merge so Mattayi profiles remain visible
        setProfiles(prev => {
          const mattayiOnes = prev.filter(p => p.name === 'Mattayi');
          const others = liveData.filter(p => p.name !== 'Mattayi');
          return [...mattayiOnes, ...others];
        });
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // KPI Calculations
  const totalCandidates = profiles.length;
  const pendingCandidates = profiles.filter(p => !p.aadhaarVerified || p.aadhaar_status === 'sent_back').length;
  const approvedCandidates = profiles.filter(p => p.aadhaarVerified && p.aadhaar_status !== 'sent_back').length;
  const verificationRate = totalCandidates > 0 ? Math.round((approvedCandidates / totalCandidates) * 100) : 90;

  // Filtered Aadhaar List
  const filteredAadhaarCandidates = useMemo(() => {
    return profiles.filter(p => {
      // 1. Status Filter
      if (aadhaarFilter === 'pending') {
        if (p.aadhaarVerified && p.aadhaar_status !== 'sent_back') return false;
      } else if (aadhaarFilter === 'sent_back') {
        if (p.aadhaar_status !== 'sent_back') return false;
      } else if (aadhaarFilter === 'approved') {
        if (!p.aadhaarVerified || p.aadhaar_status === 'sent_back') return false;
      }
      // 2. Search Filter
      if (aadhaarSearch.trim()) {
        const q = aadhaarSearch.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').includes(q);
        const matchDistrict = (p.district || p.city || '').toLowerCase().includes(q);
        const matchId = (p.id || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchDistrict && !matchId) return false;
      }
      return true;
    });
  }, [profiles, aadhaarFilter, aadhaarSearch]);

  // Toggle Aadhaar Approval Switch
  const handleToggleAadhaar = (profileId, isChecked) => {
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        showToast(`${p.name} Aadhaar status: ${isChecked ? 'APPROVED' : 'PENDING'}`);
        return {
          ...p,
          aadhaarVerified: isChecked,
          aadhaar_verified: isChecked ? 1 : 0,
          aadhaar_status: isChecked ? 'approved' : 'pending'
        };
      }
      return p;
    }));
  };

  // Open Send Back modal
  const handleOpenSendBack = (profile) => {
    setSendBackTarget(profile);
    setIsSendBackModalOpen(true);
  };

  // Confirm Send Back
  const handleConfirmSendBack = () => {
    if (!sendBackTarget) return;
    setProfiles(prev => prev.map(p => {
      if (p.id === sendBackTarget.id) {
        return {
          ...p,
          aadhaarVerified: false,
          aadhaar_verified: 0,
          aadhaar_status: 'sent_back',
          aadhaar_rejection_reason: sendBackReason
        };
      }
      return p;
    }));
    showToast(`Aadhaar request sent back to ${sendBackTarget.name}`);
    setIsSendBackModalOpen(false);
    setSendBackTarget(null);
  };

  // Approve all visible pending
  const handleApproveVisiblePending = () => {
    const pendingIds = filteredAadhaarCandidates.map(p => p.id);
    if (pendingIds.length === 0) {
      showToast('No pending candidates in visible view.');
      return;
    }
    setProfiles(prev => prev.map(p => {
      if (pendingIds.includes(p.id)) {
        return {
          ...p,
          aadhaarVerified: true,
          aadhaar_verified: 1,
          aadhaar_status: 'approved'
        };
      }
      return p;
    }));
    showToast(`Approved ${pendingIds.length} candidate Aadhaar authentications!`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-slate-100 bg-[#070F1E] flex font-sans selection:bg-[#DFB76C]/30 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border bg-[#122238] text-white border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          SIDEBAR NAVIGATION (EXACT SCREENSHOT MATCH)
          ===================================================================== */}
      <aside className="w-64 bg-[#0B192C] border-r border-[#D4AF37]/20 flex flex-col justify-between shrink-0 select-none">
        
        {/* Top Brand Section */}
        <div>
          <div className="h-20 flex items-center px-6 border-b border-slate-800/80 justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer" 
              onClick={() => setActiveTab('overview')}
            >
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] p-0.5 shadow-md shadow-[#D4AF37]/20 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#0B192C] flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[#DFB76C]" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DFB76C]"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-serif font-bold text-white tracking-wide">I 4 You</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Executive Console</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-sm">
            
            {/* 1. Overview & Analytics */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview & Analytics</span>
            </button>

            {/* 2. User Directory */}
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Directory</span>
            </button>

            {/* 3. Aadhaar Approval (ACTIVE IN SCREENSHOT) */}
            <button
              onClick={() => setActiveTab('aadhaar')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'aadhaar'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Aadhaar Approval</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCandidates}
              </span>
            </button>

            {/* 4. Offers & Discounts */}
            <button
              onClick={() => setActiveTab('offers')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'offers'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Offers & Discounts</span>
            </button>

            {/* 5. Membership Plans */}
            <button
              onClick={() => setActiveTab('plans')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Membership Plans</span>
            </button>

            {/* 6. Payment History */}
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment History</span>
            </button>

            {/* 7. System Settings */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>System Settings</span>
            </button>

          </nav>
        </div>

        {/* Sidebar Footer: Arun Thomas Profile */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"
                alt="Arun Thomas"
                className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
              />
              <div className="min-w-0 truncate">
                <p className="text-xs font-bold text-white truncate">Arun Th...</p>
                <p className="text-[10px] text-[#DFB76C] font-medium truncate">Super Ad...</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setActiveTab('settings')}
                className="p-1 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear local cache and refresh database?')) {
                    localStorage.removeItem('i4you_admin_master_db');
                    window.location.reload();
                  }
                }}
                className="p-1 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer"
                title="Reset Local Cache"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onSwitchToWebsite}
                className="p-1 hover:text-amber-400 rounded hover:bg-slate-800 cursor-pointer"
                title="Switch to Website"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </aside>

      {/* =====================================================================
          MAIN SCREEN CONTAINER
          ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP HEADER BAR (EXACT SCREENSHOT MATCH) */}
        <header className="h-16 bg-[#0B192C]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between shrink-0">
          
          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search profiles, coupons, or transactions... (Press Ctrl + K)"
              className="w-full pl-9 pr-14 py-2 bg-[#070F1E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#D4AF37]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 border border-slate-700 px-1 rounded">
              Ctrl K
            </span>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center space-x-3 text-xs">
            
            {/* Live Sync Active Pill */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Sync Active</span>
              <RefreshCw className="w-3 h-3 ml-0.5 text-emerald-400 cursor-pointer hover:rotate-180 transition-transform" />
            </div>

            {/* + Add User Button */}
            <button
              onClick={() => setActiveTab('users')}
              className="px-3.5 py-1.5 rounded-xl bg-[#DFB76C] hover:bg-[#D4AF37] text-slate-950 font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Add User</span>
            </button>

            {/* New Offer Button */}
            <button
              onClick={() => setActiveTab('offers')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>New Offer</span>
            </button>

            {/* Payment Button */}
            <button
              onClick={() => setActiveTab('payments')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-500/40 font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 text-teal-300" />
              <span>Payment</span>
            </button>

          </div>

        </header>

        {/* ===================================================================
            VIEW CONTENT: AADHAAR MANUAL VERIFICATION (EXACT SCREENSHOT MATCH)
            =================================================================== */}
        {activeTab === 'aadhaar' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* View Title & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
                    Aadhaar Manual Verification
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                    UIDAI Compliant
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  Inspect candidate profiles, review pending Aadhaar identity verification, and approve or revoke authentications using 1-click manual approval switches.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => {
                    showToast('Refreshing Aadhaar candidate records...');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleApproveVisiblePending}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 cursor-pointer transition-all"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Approve Visible Pending</span>
                </button>
              </div>
            </div>

            {/* 4 KPI METRIC CARDS (EXACT SCREENSHOT MATCH) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Candidates */}
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    TOTAL CANDIDATES
                  </span>
                  <div className="text-3xl font-black text-white mt-1">
                    {totalCandidates}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Card 2: Pending Review (Amber) */}
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#DFB76C] uppercase tracking-wider block">
                    PENDING REVIEW
                  </span>
                  <div className="text-3xl font-black text-[#DFB76C] mt-1">
                    {pendingCandidates}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#DFB76C]" />
                </div>
              </div>

              {/* Card 3: Aadhaar Approved (Emerald) */}
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    AADHAAR APPROVED
                  </span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">
                    {approvedCandidates}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Card 4: Verification Rate */}
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                    VERIFICATION RATE
                  </span>
                  <div className="text-3xl font-black text-purple-300 mt-1">
                    {verificationRate}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>

            </div>

            {/* FILTER & SEARCH BAR (EXACT SCREENSHOT MATCH) */}
            <div className="bg-[#0B192C] p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              
              {/* Search input */}
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={aadhaarSearch}
                  onChange={(e) => setAadhaarSearch(e.target.value)}
                  placeholder="Search candidate name, mobile, district..."
                  className="w-full pl-9 pr-3 py-2 bg-[#070F1E] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-[#D4AF37]"
                />
              </div>

              {/* Filter Tabs: Pending Review | Sent Back | Approved | All Profiles */}
              <div className="flex items-center space-x-1.5 bg-[#070F1E] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setAadhaarFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    aadhaarFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending Review
                </button>

                <button
                  onClick={() => setAadhaarFilter('sent_back')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    aadhaarFilter === 'sent_back'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sent Back
                </button>

                <button
                  onClick={() => setAadhaarFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    aadhaarFilter === 'approved'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Approved
                </button>

                <button
                  onClick={() => setAadhaarFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    aadhaarFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Profiles
                </button>
              </div>

              {/* View Toggle: Table vs View Aadhaar Cards */}
              <div className="flex items-center space-x-1.5 bg-[#070F1E] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setAadhaarViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    aadhaarViewMode === 'table'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>

                <button
                  onClick={() => setAadhaarViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    aadhaarViewMode === 'cards'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Aadhaar Cards</span>
                </button>
              </div>

            </div>

            {/* CANDIDATES TABLE (EXACT SCREENSHOT MATCH) */}
            <div className="bg-[#0B192C] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  
                  {/* Table Headers */}
                  <thead className="bg-[#070F1E] text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">CANDIDATE PROFILE</th>
                      <th className="py-3.5 px-4">CONTACT PHONE & WHATSAPP</th>
                      <th className="py-3.5 px-4">AADHAAR CARD DOCUMENT</th>
                      <th className="py-3.5 px-4">CURRENT STATUS</th>
                      <th className="py-3.5 px-4 text-center">VERIFICATION & SEND BACK</th>
                      <th className="py-3.5 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAadhaarCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 space-y-1">
                          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
                          <p className="text-sm font-medium text-white">All Clear! No candidates found.</p>
                          <p className="text-xs text-slate-500">Switch filter to "All Profiles" to review verified users.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAadhaarCandidates.map(candidate => {
                        const isApproved = Boolean(candidate.aadhaarVerified);
                        const isSentBack = candidate.aadhaar_status === 'sent_back';

                        return (
                          <tr key={candidate.id} className="hover:bg-slate-800/40 transition-colors">
                            
                            {/* 1. Candidate Profile */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-[#D4AF37]/30 bg-slate-800">
                                  <img
                                    src={candidate.photo}
                                    alt={candidate.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span 
                                      onClick={() => setSelectedProfileDetail(candidate)}
                                      className="font-medium text-white text-sm hover:text-[#DFB76C] cursor-pointer truncate"
                                    >
                                      {candidate.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      #{candidate.id}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <span>{candidate.age} yrs</span> &bull; 
                                    <span>{candidate.gender}</span> &bull; 
                                    <span className="text-slate-300 font-medium">{candidate.district || candidate.city || 'Kollam'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Contact Phone & WhatsApp */}
                            <td className="py-3 px-4 text-xs text-slate-300">
                              <div className="flex items-center gap-1.5 font-mono text-slate-200">
                                <span className="font-medium">{candidate.phone || '9876543210'}</span>
                                <a
                                  href={`tel:${candidate.phone || '9876543210'}`}
                                  className="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center shrink-0"
                                  title="Call candidate"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${(candidate.phone || '9876543210').replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 transition-all flex items-center justify-center shrink-0"
                                  title="WhatsApp candidate"
                                >
                                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.201.3-.778.977-.954 1.177-.176.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.632-.928-2.234-.244-.588-.493-.509-.677-.518-.175-.009-.376-.009-.577-.009-.201 0-.527.075-.803.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.23 1.378.197 1.897.12.579-.086 1.777-.727 2.028-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.602 0-3.093-.456-4.364-1.246l-.313-.194-2.956.775.789-2.883-.213-.339A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                                  </svg>
                                </a>
                              </div>
                              <div className="text-slate-400 truncate max-w-[160px] text-[11px] mt-0.5">
                                {candidate.email || 'No email registered'}
                              </div>
                            </td>

                            {/* 3. Aadhaar Card Document */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {candidate.aadhaar_front_image ? (
                                  <div
                                    onClick={() => setSelectedAadhaarCard(candidate)}
                                    className="relative group/thumb cursor-pointer shrink-0"
                                    title="Click to view authentic uploaded Aadhaar card"
                                  >
                                    <img
                                      src={candidate.aadhaar_front_image}
                                      alt="Aadhaar Front"
                                      className="w-16 h-10 object-cover rounded-lg border border-amber-400/40 shadow-sm transition-all group-hover/thumb:scale-105"
                                    />
                                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => setSelectedAadhaarCard(candidate)}
                                    className="w-16 h-10 rounded-lg border border-dashed border-slate-700 bg-slate-800/40 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer"
                                    title="No card scan uploaded yet"
                                  >
                                    <FileQuestion className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                                    <FileText className={`w-3.5 h-3.5 ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`} />
                                    <span className="font-medium">{candidate.maskedAadhaar || 'XXXX XXXX 5928'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 4. Current Status */}
                            <td className="py-3 px-4">
                              {isApproved ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                                  Aadhaar Approved
                                </span>
                              ) : isSentBack ? (
                                <span 
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                  title={candidate.aadhaar_rejection_reason || 'Photo blurry'}
                                >
                                  <Undo2 className="w-3 h-3 mr-1 text-rose-400" />
                                  Sent Back
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
                                  Review Pending
                                </span>
                              )}
                            </td>

                            {/* 5. Verification & Send Back Column */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                
                                {/* Toggle switch */}
                                <label className="relative inline-flex items-center cursor-pointer select-none group">
                                  <input
                                    type="checkbox"
                                    checked={isApproved}
                                    onChange={(e) => handleToggleAadhaar(candidate.id, e.target.checked)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                  <span className={`ml-2 text-xs font-bold ${isApproved ? 'text-emerald-400' : 'text-slate-400'} min-w-[55px] text-left`}>
                                    {isApproved ? 'Approved' : 'Pending'}
                                  </span>
                                </label>

                                {/* Sent Back Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSendBack(candidate)}
                                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 shrink-0 ${
                                    isSentBack
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:border-rose-400/40'
                                  }`}
                                >
                                  <Undo2 className={`w-3.5 h-3.5 ${isSentBack ? 'text-rose-400' : 'text-slate-400'}`} />
                                  <span>Sent Back</span>
                                </button>

                              </div>
                            </td>

                            {/* 6. Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => setSelectedAadhaarCard(candidate)}
                                  className="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                                  title="View Aadhaar Card Document"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedProfileDetail(candidate)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                  title="View Full Profile Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedProfileDetail(candidate)}
                                  className="p-1.5 text-slate-400 hover:text-[#DFB76C] hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Candidate Details"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>

              {/* Table Footer: Pagination */}
              <div className="p-4 bg-[#070F1E] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {filteredAadhaarCandidates.length} of {filteredAadhaarCandidates.length} candidates
                </span>
                <div className="flex items-center space-x-2">
                  <button disabled className="px-3 py-1 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed">
                    Previous
                  </button>
                  <span className="font-mono text-white font-bold px-2">1 / 1</span>
                  <button disabled className="px-3 py-1 rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>

            </div>

          </main>
        )}

        {/* ===================================================================
            VIEW 2: USER DIRECTORY
            =================================================================== */}
        {activeTab === 'users' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-white">User Directory</h2>
                <p className="text-xs text-slate-400">All registered candidates with phone numbers and community profiles.</p>
              </div>
            </div>

            <div className="bg-[#0B192C] rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070F1E] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Candidate</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Profession</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Aadhaar</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {profiles.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 flex items-center space-x-3">
                        <img src={p.photo} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                        <div>
                          <div className="font-bold text-white">{p.name}</div>
                          <span className="text-[10px] text-slate-500">{p.id}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">{p.city || 'Kerala'}</td>
                      <td className="p-3.5 text-slate-300">{p.profession}</td>
                      <td className="p-3.5 font-mono text-slate-300">{p.phone}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.aadhaarVerified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {p.aadhaarVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedProfileDetail(p)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {/* ===================================================================
            VIEW 3: OVERVIEW & ANALYTICS
            =================================================================== */}
        {activeTab === 'overview' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
            <h2 className="text-2xl font-serif font-bold text-white">Overview & Executive Analytics</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Total Registered Members</span>
                <div className="text-3xl font-black text-white mt-1">{totalCandidates}</div>
              </div>
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Pending Review</span>
                <div className="text-3xl font-black text-amber-400 mt-1">{pendingCandidates}</div>
              </div>
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Active Paid Subscriptions</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">{approvedCandidates}</div>
              </div>
              <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Gross Revenue</span>
                <div className="text-3xl font-black text-[#DFB76C] mt-1">₹ 1,48,990</div>
              </div>
            </div>

            <div className="bg-[#0B192C] p-6 rounded-2xl border border-slate-800">
              <h3 className="font-serif font-bold text-white mb-2">Administrative Quick Switch</h3>
              <p className="text-xs text-slate-400 mb-4">Jump directly into Aadhaar approval queue or user directory.</p>
              <button
                onClick={() => setActiveTab('aadhaar')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                Go to Aadhaar Verification Desk →
              </button>
            </div>
          </main>
        )}

        {/* ===================================================================
            VIEW 4: OFFERS & DISCOUNTS
            =================================================================== */}
        {activeTab === 'offers' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <h2 className="text-2xl font-serif font-bold text-white">Offers & Discounts Engine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['FESTIVE50 (50% OFF)', 'SUPER2026 (₹1000 OFF)', 'FIRSTMATCH (30% OFF)'].map((code, idx) => (
                <div key={idx} className="bg-[#0B192C] p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="font-mono text-sm text-[#DFB76C] font-bold">{code}</div>
                  <p className="text-xs text-slate-400">Super Admin Campaign Active</p>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ===================================================================
            VIEW 5: MEMBERSHIP PLANS
            =================================================================== */}
        {activeTab === 'plans' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <h2 className="text-2xl font-serif font-bold text-white">Membership Plans Master</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {MEMBERSHIP_PLANS.map(plan => (
                <div key={plan.id} className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-serif font-bold text-white">{plan.name}</h4>
                  <div className="text-2xl font-black text-[#DFB76C]">₹{plan.price}</div>
                  <p className="text-xs text-slate-400">{plan.validity}</p>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ===================================================================
            VIEW 6: PAYMENT HISTORY
            =================================================================== */}
        {activeTab === 'payments' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <h2 className="text-2xl font-serif font-bold text-white">Payment Transactions Ledger</h2>
            <div className="bg-[#0B192C] p-5 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400">Total 18 completed customer transactions logged.</p>
            </div>
          </main>
        )}

        {/* ===================================================================
            VIEW 7: SYSTEM SETTINGS
            =================================================================== */}
        {activeTab === 'settings' && (
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <h2 className="text-2xl font-serif font-bold text-white">System Settings & Governance</h2>
            <div className="bg-[#0B192C] p-6 rounded-2xl border border-slate-800 space-y-4 max-w-2xl">
              <div>
                <span className="text-xs text-slate-400">Super Administrator</span>
                <p className="text-base font-bold text-white">Arun Thomas (admin@i4you.com)</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Clearance Level</span>
                <p className="text-sm font-bold text-[#DFB76C]">Root Super Admin (All Permissions)</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profiles, null, 2));
                    const a = document.createElement('a');
                    a.href = dataStr;
                    a.download = `i4you_superadmin_backup_${Date.now()}.json`;
                    a.click();
                    showToast('Database exported as JSON!');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
                >
                  Download Full Database Backup
                </button>
              </div>
            </div>
          </main>
        )}

      </div>

      {/* =====================================================================
          SEND BACK MODAL (FOR AADHAAR RESUBMISSION)
          ===================================================================== */}
      {isSendBackModalOpen && sendBackTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsSendBackModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif font-bold text-base text-white flex items-center space-x-2">
              <Undo2 className="w-4 h-4 text-rose-400" />
              <span>Send Back Aadhaar to Candidate</span>
            </h3>

            <p className="text-xs text-slate-300">
              Provide a clear reason for sending back the Aadhaar verification to <strong>{sendBackTarget.name}</strong>:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Photo is blurry or unreadable',
                'Card edges or critical portions are cut off',
                'Glare or reflection covers Aadhaar details',
                'Document does not match candidate name'
              ].map((reason, idx) => (
                <label key={idx} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700">
                  <input
                    type="radio"
                    name="reason"
                    checked={sendBackReason === reason}
                    onChange={() => setSendBackReason(reason)}
                    className="accent-amber-500"
                  />
                  <span className="text-slate-200">{reason}</span>
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setIsSendBackModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSendBack}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Send Back Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          AADHAAR CARD PREVIEW MODAL
          ===================================================================== */}
      {selectedAadhaarCard && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-[#D4AF37]/40 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              onClick={() => setSelectedAadhaarCard(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-serif font-bold text-base text-white">
                Official Aadhaar Document • {selectedAadhaarCard.name}
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 flex items-center justify-center min-h-[220px]">
              {selectedAadhaarCard.aadhaar_front_image ? (
                <img
                  src={selectedAadhaarCard.aadhaar_front_image}
                  alt="Aadhaar Document"
                  className="max-h-64 object-contain rounded-xl shadow-lg border border-slate-700"
                />
              ) : (
                <div className="text-center text-slate-500 space-y-1">
                  <FileQuestion className="w-10 h-10 mx-auto opacity-50" />
                  <p>Physical card scan pending candidate upload</p>
                  <p className="font-mono text-[11px] text-amber-400">{selectedAadhaarCard.maskedAadhaar || 'XXXX XXXX 5928'}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
              <span>Masked ID: <strong className="text-white font-mono">{selectedAadhaarCard.maskedAadhaar || 'XXXX XXXX 5928'}</strong></span>
              <button
                onClick={() => {
                  handleToggleAadhaar(selectedAadhaarCard.id, !selectedAadhaarCard.aadhaarVerified);
                  setSelectedAadhaarCard(null);
                }}
                className={`px-4 py-2 rounded-xl font-bold ${
                  selectedAadhaarCard.aadhaarVerified
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedAadhaarCard.aadhaarVerified ? 'Revoke Approval' : 'Approve Aadhaar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CANDIDATE DETAIL MODAL
          ===================================================================== */}
      {selectedProfileDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-[#D4AF37]/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProfileDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-4">
              <img
                src={selectedProfileDetail.photo}
                alt={selectedProfileDetail.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37]"
              />
              <div>
                <h3 className="text-lg font-serif font-bold text-white">{selectedProfileDetail.name}</h3>
                <p className="text-xs text-slate-300">
                  {selectedProfileDetail.age} Yrs • {selectedProfileDetail.gender} • {selectedProfileDetail.district || selectedProfileDetail.city || 'Kollam'}
                </p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedProfileDetail.aadhaarVerified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {selectedProfileDetail.aadhaarVerified ? 'Aadhaar Verified' : 'Aadhaar Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-mono">{selectedProfileDetail.phone || '9876543210'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Education:</span>
                <span className="text-white">{selectedProfileDetail.education || 'Graduate'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Profession:</span>
                <span className="text-white">{selectedProfileDetail.profession || 'Professional'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Community / Religion:</span>
                <span className="text-white">{selectedProfileDetail.religion || 'Hindu'} ({selectedProfileDetail.caste || 'General'})</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  handleToggleAadhaar(selectedProfileDetail.id, !selectedProfileDetail.aadhaarVerified);
                  setSelectedProfileDetail(prev => ({ ...prev, aadhaarVerified: !prev.aadhaarVerified }));
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-slate-950 font-extrabold text-xs shadow-md cursor-pointer"
              >
                {selectedProfileDetail.aadhaarVerified ? 'Revoke Aadhaar' : 'Approve Aadhaar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
