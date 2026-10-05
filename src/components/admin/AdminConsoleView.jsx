import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Search,
  Users,
  LayoutDashboard,
  Crown,
  Sparkles,
  Smartphone,
  Monitor,
  FileText,
  Download,
  ExternalLink,
  Check,
  X,
  MapPin,
  Clock,
  Eye,
  UserCheck,
  Tag,
  CreditCard,
  Database,
  Award,
  DollarSign
} from 'lucide-react';
import { MEMBERSHIP_PLANS } from '../../data/plansData';

export default function AdminConsoleView({
  profiles = [],
  setProfiles,
  currentUser: _currentUser,
  membershipPlans = MEMBERSHIP_PLANS,
  onSwitchToWebsite,
  onSwitchToApp,
  isProduction = false,
  onToggleProductionMode,
  onSelectProfile: _onSelectProfile
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'verifications' | 'plans' | 'offers' | 'system'
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all'); // 'all' | 'verified' | 'unverified'
  const [genderFilter, setGenderFilter] = useState('all');
  const [religionFilter, setReligionFilter] = useState('all');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [serverStatus, setServerStatus] = useState({ checking: true, online: false, url: 'http://localhost:5000' });
  const [selectedProfileDetail, setSelectedProfileDetail] = useState(null);

  // New coupon state for Offers Tab
  const [promoCodes, setPromoCodes] = useState([
    { id: 'c1', code: 'FESTIVE50', discount: '50% OFF', description: 'Vivah Mahotsav Special', active: true, uses: 142 },
    { id: 'c2', code: 'FIRSTMATCH', discount: '₹ 1,000 OFF', description: 'New Member Welcome Discount', active: true, uses: 89 },
    { id: 'c3', code: 'ELITECLUB', discount: '30% OFF', description: 'Relationship Manager Plan', active: true, uses: 34 }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('25% OFF');

  // Simulated Transactions Ledger
  const [transactions] = useState([
    { id: 'TXN-9021', name: 'Dr. Ananya Kulkarni', plan: 'Vivah Elite (Annual)', amount: '₹ 14,999', method: 'UPI / PhonePe', status: 'Success', date: 'Today, 11:20 AM' },
    { id: 'TXN-9020', name: 'Rohan Jayasimha', plan: 'Vivah Diamond (6 Mos)', amount: '₹ 8,999', method: 'HDFC NetBanking', status: 'Success', date: 'Today, 09:45 AM' },
    { id: 'TXN-9019', name: 'Meera Venkatraman', plan: 'Vivah Gold (3 Mos)', amount: '₹ 4,999', method: 'Google Pay', status: 'Success', date: 'Yesterday' },
    { id: 'TXN-9018', name: 'Kabir Singh Sodhi', plan: 'Vivah Elite (Annual)', amount: '₹ 14,999', method: 'Axis Credit Card', status: 'Success', date: 'Yesterday' },
    { id: 'TXN-9017', name: 'Priyanka Rathore', plan: 'Vivah Diamond (6 Mos)', amount: '₹ 8,999', method: 'UPI / Paytm', status: 'Success', date: '2 days ago' }
  ]);

  // Check if Python Flask server is reachable on port 5000
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/public/profiles', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (isMounted) {
          setServerStatus({ checking: false, online: res.ok, url: 'http://localhost:5000' });
        }
      } catch {
        if (isMounted) {
          setServerStatus({ checking: false, online: false, url: 'http://localhost:5000' });
        }
      }
    };
    checkServer();
    return () => { isMounted = false; };
  }, []);

  const showNotification = (msg) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(''), 3500);
  };

  // Toggle Aadhaar verification status for a profile
  const handleToggleAadhaar = (profileId) => {
    if (!setProfiles) return;
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const newStatus = !p.aadhaarVerified;
        showNotification(`${p.name}'s Aadhaar UID verification set to ${newStatus ? 'VERIFIED ✅' : 'PENDING ⚠️'}`);
        return {
          ...p,
          aadhaarVerified: newStatus,
          verified: newStatus || p.governmentIdVerified
        };
      }
      return p;
    }));
  };

  // Toggle Govt ID verification status for a profile
  const handleToggleGovtId = (profileId) => {
    if (!setProfiles) return;
    setProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const newStatus = !p.governmentIdVerified;
        showNotification(`${p.name}'s Govt ID verification set to ${newStatus ? 'VERIFIED ✅' : 'PENDING ⚠️'}`);
        return {
          ...p,
          governmentIdVerified: newStatus,
          verified: newStatus || p.aadhaarVerified
        };
      }
      return p;
    }));
  };

  // Delete a profile
  const handleDeleteProfile = (profileId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}'s profile from directory?`)) return;
    if (setProfiles) {
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      showNotification(`Profile ${name} removed from registry.`);
    }
  };

  // Approve all pending verifications
  const handleApproveAllPending = () => {
    if (!setProfiles) return;
    setProfiles(prev => prev.map(p => ({
      ...p,
      aadhaarVerified: true,
      governmentIdVerified: true,
      verified: true
    })));
    showNotification('All pending matrimonial profiles verified with full trust badge! ✅');
  };

  // Add promo coupon
  const handleAddCoupon = (e) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const newCoupon = {
      id: `c_${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discount: newCouponDiscount,
      description: 'Custom Seasonal Campaign',
      active: true,
      uses: 0
    };
    setPromoCodes([newCoupon, ...promoCodes]);
    setNewCouponCode('');
    showNotification(`Promo code ${newCoupon.code} created & activated! 🏷️`);
  };

  const handleToggleCoupon = (couponId) => {
    setPromoCodes(prev => prev.map(c => c.id === couponId ? { ...c, active: !c.active } : c));
  };

  // Export profiles as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `i4you_profiles_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Registry JSON exported successfully! 📁');
  };

  // Computed metrics
  const totalUsers = profiles.length;
  const verifiedUsersCount = profiles.filter(p => p.aadhaarVerified || p.verified).length;
  const pendingVerificationCount = profiles.filter(p => !p.aadhaarVerified && !p.governmentIdVerified).length;

  // Filtered profiles for Directory table
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q)) ||
        (p.profession && p.profession.toLowerCase().includes(q)) ||
        (p.religion && p.religion.toLowerCase().includes(q)) ||
        (p.caste && p.caste.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (verificationFilter === 'verified' && !p.aadhaarVerified && !p.verified) return false;
      if (verificationFilter === 'unverified' && (p.aadhaarVerified || p.verified)) return false;

      if (genderFilter !== 'all' && p.gender && p.gender.toLowerCase() !== genderFilter.toLowerCase()) return false;
      if (religionFilter !== 'all' && p.religion && p.religion.toLowerCase() !== religionFilter.toLowerCase()) return false;

      return true;
    });
  }, [profiles, searchQuery, verificationFilter, genderFilter, religionFilter]);

  // Unique religions
  const availableReligions = useMemo(() => {
    const set = new Set(profiles.map(p => p.religion).filter(Boolean));
    return Array.from(set);
  }, [profiles]);

  return (
    <div className="min-h-screen bg-[#07111E] text-slate-100 flex flex-col font-sans selection:bg-[#DFB76C]/30 selection:text-[#0B192C]">
      
      {/* ========================================================
          TOP GLOBAL ADMIN HEADER & VIEW SWITCHER BAR
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-xl px-4 sm:px-6 py-3">
        <div className="w-[90%] max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0B192C] rounded-[14px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#DFB76C]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-serif font-black tracking-wide text-white">I 4 You</span>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#DFB76C] border border-[#D4AF37]/40 text-[10px] font-bold uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Matrimonial Verification & CRM Engine • Port 5000 / In-App Console
              </p>
            </div>
          </div>

          {/* Center: System Status Indicator */}
          <div className="hidden md:flex items-center space-x-2 text-xs bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10">
            <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">
              {serverStatus.online ? 'Backend Connected (Flask :5000)' : 'In-App Live Mode (Ready)'}
            </span>
            <a
              href="http://localhost:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#DFB76C] hover:underline flex items-center space-x-0.5 text-[11px] ml-1.5"
              title="Open standalone Flask port 5000 in new tab"
            >
              <span>Port 5000</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Right: Master View Mode Switcher Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Switch to Website */}
            {onSwitchToWebsite && (
              <button
                type="button"
                onClick={onSwitchToWebsite}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 text-xs font-bold transition-all cursor-pointer hover:text-white active:scale-95 shadow-sm"
                title="Switch back to Website Presentation Mode"
              >
                <Monitor className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span className="hidden sm:inline">Website</span>
              </button>
            )}

            {/* Switch to Mobile Simulator */}
            {onSwitchToApp && (
              <button
                type="button"
                onClick={onSwitchToApp}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 text-xs font-bold transition-all cursor-pointer hover:text-white active:scale-95 shadow-sm"
                title="Switch to Mobile Smartphone Simulator"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span className="hidden sm:inline">Mobile App</span>
              </button>
            )}

            {/* Production / Demo Toggle */}
            {onToggleProductionMode && (
              <button
                type="button"
                onClick={onToggleProductionMode}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border active:scale-95 ${
                  isProduction
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
                title={isProduction ? 'Live Production Mode' : 'Demo Test Mode'}
              >
                <span>{isProduction ? '🚀 Live' : '🧪 Demo'}</span>
              </button>
            )}

          </div>

        </div>

        {/* Action toast notification */}
        {actionSuccessMessage && (
          <div className="w-[90%] max-w-[1800px] mx-auto mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{actionSuccessMessage}</span>
              </div>
              <button onClick={() => setActionSuccessMessage('')} className="text-emerald-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </header>

      {/* ========================================================
          SUB-NAV TABS & QUICK CONTROLS
          ======================================================== */}
      <nav className="bg-[#0B192C]/70 border-b border-white/10 px-4 sm:px-6 overflow-x-auto scrollbar-none">
        <div className="w-[90%] max-w-[1800px] mx-auto flex items-center space-x-1 py-2">
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidate Directory ({totalUsers})</span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'verifications'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Aadhaar Queue ({pendingVerificationCount} pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'plans'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Ledger & Subscriptions</span>
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'offers'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Offers & Promos ({promoCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>System & Sync</span>
          </button>

        </div>
      </nav>

      {/* ========================================================
          MAIN ADMIN CONTENT AREA
          ======================================================== */}
      <main className="flex-1 w-[90%] max-w-[1800px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Card 1: Total Candidates */}
              <div className="bg-gradient-to-br from-[#0F223D] to-[#0B192C] rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +18% this month
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-white">{totalUsers}</span>
                  <p className="text-xs text-slate-300 mt-1">Total Registered Profiles</p>
                </div>
              </div>

              {/* Card 2: Aadhaar Verified */}
              <div className="bg-gradient-to-br from-[#0F223D] to-[#0B192C] rounded-3xl p-5 border border-[#D4AF37]/30 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/30">
                    {Math.round((verifiedUsersCount / (totalUsers || 1)) * 100)}% Verified
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-white">{verifiedUsersCount}</span>
                  <p className="text-xs text-slate-300 mt-1">UIDAI Aadhaar Verified</p>
                </div>
              </div>

              {/* Card 3: Pending Queue */}
              <div className="bg-gradient-to-br from-[#0F223D] to-[#0B192C] rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => setActiveTab('verifications')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 cursor-pointer"
                  >
                    Review Queue →
                  </button>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-white">{pendingVerificationCount}</span>
                  <p className="text-xs text-slate-300 mt-1">Pending Authentication</p>
                </div>
              </div>

              {/* Card 4: Gross Revenue */}
              <div className="bg-gradient-to-br from-[#0F223D] to-[#0B192C] rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Ledger
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-white">₹ 47,995</span>
                  <p className="text-xs text-slate-300 mt-1">Recent Membership Sales</p>
                </div>
              </div>

            </div>

            {/* Quick Management Banner */}
            <div className="bg-gradient-to-r from-[#0F223D] via-[#152E52] to-[#0F223D] rounded-3xl p-6 border border-[#D4AF37]/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-base font-serif font-bold text-white flex items-center justify-center md:justify-start space-x-2">
                  <Sparkles className="w-4 h-4 text-[#DFB76C]" />
                  <span>Administrative Operations Shortcut</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Instant tools to mass-verify candidates, backup profile records, or manage promo discounts.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleApproveAllPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Verify All Pending ({pendingVerificationCount})</span>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Demographic Distribution Charts / Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Religions Breakdown */}
              <div className="bg-[#0B192C] rounded-3xl p-6 border border-white/10 shadow-lg space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#DFB76C]" />
                  <span>Matrimonial Distribution by Religion</span>
                </h4>
                <div className="space-y-3">
                  {availableReligions.slice(0, 5).map(rel => {
                    const count = profiles.filter(p => p.religion === rel).length;
                    const pct = Math.round((count / (totalUsers || 1)) * 100);
                    return (
                      <div key={rel} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-200 font-semibold">{rel}</span>
                          <span className="text-[#DFB76C] font-mono">{count} profiles ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* City Tier Breakdown */}
              <div className="bg-[#0B192C] rounded-3xl p-6 border border-white/10 shadow-lg space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#DFB76C]" />
                  <span>All India Access Coverage</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[11px]">Tier 1 Metros</span>
                    <span className="text-lg font-bold text-white mt-1 block">Mumbai, Delhi, Pune</span>
                    <p className="text-[10px] text-emerald-400 mt-1">High Tech & Corporate</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[11px]">Tier 2 Cities</span>
                    <span className="text-lg font-bold text-white mt-1 block">Nashik, Mysuru, Surat</span>
                    <p className="text-[10px] text-emerald-400 mt-1">Traditional Family Roots</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[11px]">Tier 3 & 4 Towns</span>
                    <span className="text-lg font-bold text-white mt-1 block">Kolhapur, Salem, Morbi</span>
                    <p className="text-[10px] text-emerald-400 mt-1">Regional Community Ties</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[11px]">Kundali Matching</span>
                    <span className="text-lg font-bold text-white mt-1 block">36 Gunas Engine</span>
                    <p className="text-[10px] text-[#DFB76C] mt-1">Vedic Astrological Sync</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: CANDIDATE DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Filter and Search Bar */}
            <div className="bg-[#0B192C] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Search query */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, phone, city, caste..."
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#D4AF37]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Verification Filter */}
                <div>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="all">All Verification States</option>
                    <option value="verified">✅ Verified Only</option>
                    <option value="unverified">⚠️ Pending Verification</option>
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="all">All Genders</option>
                    <option value="female">Brides (Female)</option>
                    <option value="male">Grooms (Male)</option>
                  </select>
                </div>

                {/* Religion Filter */}
                <div>
                  <select
                    value={religionFilter}
                    onChange={(e) => setReligionFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="all">All Religions</option>
                    {availableReligions.map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Showing {filteredProfiles.length} of {profiles.length} profiles</span>
                {(searchQuery || verificationFilter !== 'all' || genderFilter !== 'all' || religionFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setVerificationFilter('all');
                      setGenderFilter('all');
                      setReligionFilter('all');
                    }}
                    className="text-[#DFB76C] hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Profiles Table */}
            <div className="bg-[#0B192C] rounded-3xl border border-white/10 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/40 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Profile & Candidate</th>
                      <th className="py-3.5 px-4">Location & Religion</th>
                      <th className="py-3.5 px-4">Profession & Income</th>
                      <th className="py-3.5 px-4">Aadhaar Status</th>
                      <th className="py-3.5 px-4">Govt ID Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No profiles matching current search or filters.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          
                          {/* Candidate info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={p.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                                alt={p.name}
                                className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-white block text-sm">{p.name}</span>
                                <span className="text-[11px] text-slate-400">
                                  {p.age} yrs • {p.height || "5'6\""} • {p.gender}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Location & Religion */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="text-white font-medium block">
                                {p.city || p.district}, {p.state}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {p.religion} • {p.caste || 'General'}
                              </span>
                            </div>
                          </td>

                          {/* Profession & Income */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="text-white font-medium block truncate max-w-[150px]">
                                {p.profession || 'Professional'}
                              </span>
                              <span className="text-[11px] text-[#DFB76C] font-mono">
                                {p.annualIncome || '₹ 15 - 20 LPA'}
                              </span>
                            </div>
                          </td>

                          {/* Aadhaar Toggle */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleAadhaar(p.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex items-center space-x-1 ${
                                p.aadhaarVerified
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                              title="Click to toggle Aadhaar verification status"
                            >
                              {p.aadhaarVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>UIDAI Verified</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Pending</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Govt ID Toggle */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleGovtId(p.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex items-center space-x-1 ${
                                p.governmentIdVerified
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                                  : 'bg-slate-700/50 text-slate-400 border-white/10 hover:bg-slate-700'
                              }`}
                              title="Click to toggle Government ID proof status"
                            >
                              {p.governmentIdVerified ? (
                                <>
                                  <Check className="w-3 h-3 text-blue-400" />
                                  <span>Govt ID OK</span>
                                </>
                              ) : (
                                <span>Unverified</span>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setSelectedProfileDetail(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                                title="Inspect candidate file"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProfile(p.id, p.name)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100"
                                title="Delete from registry"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: AADHAAR VERIFICATION QUEUE */}
        {activeTab === 'verifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0B192C] p-6 rounded-3xl border border-[#D4AF37]/30 shadow-lg">
              <div>
                <h3 className="text-base font-serif font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#DFB76C]" />
                  <span>Aadhaar UIDAI Matrimonial Trust Queue</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Candidates waiting for Aadhaar UID and photo authentication. Click to approve and grant the verified green badge.
                </p>
              </div>

              <button
                onClick={handleApproveAllPending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve All Pending ({pendingVerificationCount})</span>
              </button>
            </div>

            {/* Verification Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.filter(p => !p.aadhaarVerified).length === 0 ? (
                <div className="col-span-full py-12 text-center bg-[#0B192C] rounded-3xl border border-white/10 p-8 space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">All Matrimonial Profiles are 100% Verified!</h4>
                  <p className="text-xs text-slate-400">Zero profiles pending in the UIDAI authentication queue.</p>
                </div>
              ) : (
                profiles.filter(p => !p.aadhaarVerified).map(p => (
                  <div key={p.id} className="bg-[#0B192C] rounded-3xl p-5 border border-amber-500/30 shadow-lg flex flex-col justify-between space-y-4">
                    <div className="flex items-start space-x-3.5">
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#D4AF37]/40 shrink-0"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-white text-sm block">{p.name}</span>
                        <span className="text-[11px] text-slate-400 block">{p.age} yrs • {p.city}, {p.state}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block">
                          UID: XXXX-XXXX-4819
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Profession:</span>
                        <span className="text-white font-medium">{p.profession}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Religion:</span>
                        <span className="text-white font-medium">{p.religion} ({p.caste})</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleToggleAadhaar(p.id)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Badge</span>
                      </button>

                      <button
                        onClick={() => setSelectedProfileDetail(p)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 4: FINANCIAL LEDGER & PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Membership Tiers Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {membershipPlans.map((plan) => (
                <div key={plan.id} className="bg-[#0B192C] rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#DFB76C]">{plan.name}</span>
                    {plan.tag && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {plan.tag}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-2xl font-serif font-bold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400 block">{plan.duration}</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1.5 pt-2 border-t border-white/10">
                    <li className="flex items-center space-x-1.5">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{plan.contactsCount} Verified Contacts</span>
                    </li>
                    <li className="flex items-center space-x-1.5">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{plan.astroMatching}</span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>

            {/* Financial Transactions Ledger */}
            <div className="bg-[#0B192C] rounded-3xl border border-white/10 shadow-xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#DFB76C]" />
                  <span>Recent Payment Invoices & Transaction Ledger</span>
                </h4>
                <span className="text-xs text-[#DFB76C] font-mono">5 Recent Payments</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/40 text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Txn ID</th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Membership Plan</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {transactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#DFB76C]">{txn.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{txn.name}</td>
                        <td className="py-3 px-4">{txn.plan}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{txn.amount}</td>
                        <td className="py-3 px-4 text-slate-400">{txn.method}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{txn.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: OFFERS & PROMOS */}
        {activeTab === 'offers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Create Coupon Form */}
            <div className="bg-[#0B192C] p-6 rounded-3xl border border-[#D4AF37]/30 shadow-lg space-y-4">
              <h3 className="text-base font-serif font-bold text-white flex items-center space-x-2">
                <Tag className="w-5 h-5 text-[#DFB76C]" />
                <span>Create Matrimonial Promo Code</span>
              </h3>
              
              <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. VIVAH2026"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white uppercase focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Discount Value</label>
                  <input
                    type="text"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    placeholder="e.g. 50% OFF or ₹ 1000"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
                  >
                    Activate Coupon
                  </button>
                </div>
              </form>
            </div>

            {/* Active Coupons List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promoCodes.map(c => (
                <div key={c.id} className="bg-[#0B192C] rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#DFB76C] tracking-wider px-2.5 py-1 rounded-xl bg-black/50 border border-[#D4AF37]/30">
                      {c.code}
                    </span>
                    <button
                      onClick={() => handleToggleCoupon(c.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                        c.active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {c.active ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>
                  <div>
                    <span className="text-xl font-bold text-white">{c.discount}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                    <span>{c.uses} redemptions</span>
                    <span className="text-emerald-400">Vivah Ready</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 6: SYSTEM & SYNC */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-[#0B192C] p-6 rounded-3xl border border-white/10 shadow-lg space-y-4">
              <h3 className="text-base font-serif font-bold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-[#DFB76C]" />
                <span>Backend Engine & SQLite / PostgreSQL Synchronizer</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Active Engine</span>
                  <span className="text-base font-bold text-white block">
                    {serverStatus.online ? 'Python Flask (Port 5000)' : 'Client SQLite / React'}
                  </span>
                  <p className="text-[10px] text-emerald-400">Offline Fallback Ready</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Aadhaar Security</span>
                  <span className="text-base font-bold text-white block">AES-256 Customer Key</span>
                  <p className="text-[10px] text-[#DFB76C]">Patented Anti-Screenshot Shutter</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Astrology Engine</span>
                  <span className="text-base font-bold text-white block">36 Gunas Ashtakoot</span>
                  <p className="text-[10px] text-blue-400">Vedic Algorithm Active</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={() => {
                    handleExportJSON();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Complete Database Backup</span>
                </button>

                <a
                  href="http://localhost:5000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all flex items-center space-x-1.5"
                >
                  <span>Open Standalone Flask Portal</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#DFB76C]" />
                </a>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ========================================================
          CANDIDATE DETAIL MODAL (INSPECT PROFILE)
          ======================================================== */}
      {selectedProfileDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B192C] border border-[#D4AF37]/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedProfileDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-300 hover:text-white"
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
                  {selectedProfileDetail.age} yrs • {selectedProfileDetail.city}, {selectedProfileDetail.state}
                </p>
                <span className="text-[10px] font-semibold text-[#DFB76C] mt-0.5 block">
                  {selectedProfileDetail.religion} • {selectedProfileDetail.caste}
                </span>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Education:</span>
                <span className="text-white">{selectedProfileDetail.education}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Profession:</span>
                <span className="text-white">{selectedProfileDetail.profession}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Annual Income:</span>
                <span className="text-[#DFB76C] font-mono">{selectedProfileDetail.annualIncome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Phone:</span>
                <span className="text-white font-mono">{selectedProfileDetail.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gunas Match Score:</span>
                <span className="text-emerald-400 font-bold">{selectedProfileDetail.gunasMatch || '32/36 Gunas'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  handleToggleAadhaar(selectedProfileDetail.id);
                  setSelectedProfileDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs shadow-md cursor-pointer"
              >
                {selectedProfileDetail.aadhaarVerified ? 'Revoke Aadhaar' : 'Approve Aadhaar UID'}
              </button>
              <button
                onClick={() => setSelectedProfileDetail(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
