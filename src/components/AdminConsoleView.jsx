import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, ShieldCheck, ShieldAlert, RefreshCw, 
  Trash2, ExternalLink, Filter, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import SafeAvatar from './common/SafeAvatar';

/**
 * AdminConsoleView
 * Direct Supabase Admin Dashboard component for managing registered candidate profiles.
 * Features:
 * - Direct Supabase real-time queries with automatic `created_at DESC` sorting
 * - Resilient avatar thumbnail rendering with broken-link fallbacks
 * - Row Level Security (RLS) compliant queries
 * - Instant profile status toggles (Active / Pending / Suspended)
 */
export default function AdminConsoleView() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);

  // Fetch profiles from Supabase with exact sorting and filtering
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError('Supabase credentials are not configured in environment variables.');
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (genderFilter !== 'all') {
        query = query.eq('gender', genderFilter);
      }
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%,phone.ilike.%${searchTerm.trim()}%,city.ilike.%${searchTerm.trim()}%`);
      }

      const { data, count, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setProfiles(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[AdminConsoleView] Fetch error:', err);
      setError(err.message || 'Failed to load registered profiles');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, genderFilter, searchTerm]);

  // Real-time listener: instantly adds/updates newly registered profiles on top
  useEffect(() => {
    fetchProfiles();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Admin Live Sync] Event received:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            setProfiles((prev) => [payload.new, ...prev]);
            setTotalCount((cnt) => cnt + 1);
          } else if (payload.eventType === 'UPDATE') {
            setProfiles((prev) =>
              prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setProfiles((prev) => prev.filter((p) => p.id === payload.old.id));
            setTotalCount((cnt) => Math.max(0, cnt - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfiles]);

  const handleToggleAadhaar = async (id, currentStatus) => {
    const nextStatus = currentStatus ? 0 : 1;
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          aadhaar_verified: nextStatus,
          verified: nextStatus,
          aadhaar_status: nextStatus ? 'approved' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updErr) throw updErr;
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, aadhaar_verified: nextStatus, verified: nextStatus } : p))
      );
    } catch (e) {
      alert(`Could not update verification: ${e.message}`);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updErr) throw updErr;
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p))
      );
    } catch (e) {
      alert(`Could not update status: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070F1E] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-serif font-bold text-white">Member Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Supabase DB
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Displaying {profiles.length} of {totalCount} registered matrimonial profiles (Latest first)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div className="p-4 rounded-2xl bg-[#0B192C] border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#070F1E] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#DFB76C]"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#070F1E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFB76C]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Review</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>

        <div>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#070F1E] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFB76C]"
          >
            <option value="all">All Genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Profiles Data Table */}
      <div className="rounded-3xl bg-[#0B192C] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs uppercase font-semibold">
                <th className="py-3.5 px-4">Candidate Photo & Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Demographics</th>
                <th className="py-3.5 px-4">Profession & Income</th>
                <th className="py-3.5 px-4">Aadhaar Status</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading && profiles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-[#DFB76C] border-t-transparent rounded-full mb-2"></div>
                    <p className="text-xs">Fetching registered candidates from Supabase...</p>
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No registered profiles found</p>
                  </td>
                </tr>
              ) : (
                profiles.map((user) => {
                  const avatarUrl = user.photo_url || user.photo;
                  const isAadhaarVerified = Boolean(user.aadhaar_verified);
                  const isMale = String(user.gender).toLowerCase() === 'male';

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Photo & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <SafeAvatar
                            src={avatarUrl}
                            alt={user.name}
                            gender={user.gender}
                            size="md"
                            className="border-2 border-[#D4AF37]/40 shadow-sm"
                          />
                          <div>
                            <p className="font-semibold text-white text-xs hover:text-[#DFB76C] transition-colors truncate max-w-[160px]">
                              {user.name || 'Anonymous Member'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {user.register_id || user.id?.slice(0, 10)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-200">{user.phone || 'No phone'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{user.email || 'No email'}</p>
                      </td>

                      {/* Demographics */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-300">
                          {user.age ? `${user.age} yrs` : 'Age N/A'}, {user.gender}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {user.religion || 'Hindu'}, {user.city || user.state || 'India'}
                        </p>
                      </td>

                      {/* Profession */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-200 truncate max-w-[160px]">{user.profession || 'Self Employed'}</p>
                        <p className="text-[10px] text-[#DFB76C] font-semibold">{user.annual_income || 'N/A'}</p>
                      </td>

                      {/* Aadhaar Badge */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAadhaar(user.id, isAadhaarVerified)}
                          className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                            isAadhaarVerified
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                          }`}
                          title="Click to toggle verification status"
                        >
                          {isAadhaarVerified ? (
                            <>
                              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                              <span>Verified ✓</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 mr-1 text-amber-400" />
                              <span>Pending Approval</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              user.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {user.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-colors"
                          >
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
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
      </div>
    </div>
  );
}
