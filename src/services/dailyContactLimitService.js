import { supabase, isSupabaseConfigured } from './supabase';

/**
 * dailyContactLimitService.js
 * 
 * Manages the dynamic Daily Contact View Limit feature:
 * 1. Fetches and updates the dynamic daily_contact_limit from Supabase admin_settings.
 * 2. Tracks contact views in Supabase daily_contact_views log table.
 * 3. Maintains daily count (views_today & last_view_date) with automatic daily reset.
 * 4. Provides real-time synchronization across browser tabs and administrative updates.
 */

const DEFAULT_DAILY_LIMIT = 5;
const STORAGE_LIMIT_KEY = 'i4u_daily_contact_limit';

/**
 * Gets the current date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches the dynamic daily contact view limit.
 * First checks Supabase admin_settings table, falling back to localStorage and default (5).
 */
export async function getDailyContactLimit() {
  let limit = DEFAULT_DAILY_LIMIT;

  // 1. Check local cache first for immediate responsiveness
  try {
    const cached = localStorage.getItem(STORAGE_LIMIT_KEY);
    if (cached) {
      const parsed = parseInt(cached, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
  } catch (e) {}

  // 2. Query Supabase admin_settings if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'daily_contact_limit')
        .maybeSingle();

      if (!error && data && data.value !== undefined && data.value !== null) {
        let dbLimit = DEFAULT_DAILY_LIMIT;
        if (typeof data.value === 'number') {
          dbLimit = data.value;
        } else if (typeof data.value === 'string') {
          dbLimit = parseInt(data.value, 10) || DEFAULT_DAILY_LIMIT;
        } else if (typeof data.value === 'object') {
          dbLimit = parseInt(data.value.limit ?? data.value.daily_contact_limit, 10) || DEFAULT_DAILY_LIMIT;
        }

        if (dbLimit > 0) {
          limit = dbLimit;
          try {
            localStorage.setItem(STORAGE_LIMIT_KEY, String(limit));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('[dailyContactLimitService] Supabase fetch error, using cached limit:', err);
    }
  }

  return limit;
}

/**
 * Updates the dynamic daily contact view limit in Supabase and locally.
 * Called by Super Admin.
 */
export async function updateDailyContactLimit(newLimit, adminEmail = 'admin') {
  const cleanLimit = Math.max(1, parseInt(newLimit, 10) || DEFAULT_DAILY_LIMIT);

  // Update local storage immediately
  try {
    localStorage.setItem(STORAGE_LIMIT_KEY, String(cleanLimit));
  } catch (e) {}

  // Broadcast update to all components and tabs
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('i4u-daily-limit-updated', { detail: cleanLimit }));
    } catch (e) {}
  }

  // Persist to Supabase admin_settings table
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'daily_contact_limit',
          value: cleanLimit,
          updated_at: new Date().toISOString(),
          updated_by: adminEmail || 'admin'
        }, { onConflict: 'key' });

      if (error) {
        console.warn('[dailyContactLimitService] Supabase upsert notice:', error);
      }
    } catch (err) {
      console.error('[dailyContactLimitService] Failed to save to Supabase:', err);
    }
  }

  return { success: true, limit: cleanLimit };
}

/**
 * Returns the count of contacts viewed by the given user today.
 * Cross-references Supabase daily_contact_views log table, user state, and localStorage.
 */
export async function getTodayViewCount(userId, currentUser = null) {
  if (!userId) return 0;
  const uid = String(userId);
  const todayStr = getTodayDateString();

  // 1. Check local storage tracking
  const localKey = `i4u_daily_views_${uid}_${todayStr}`;
  let localCount = 0;
  try {
    localCount = parseInt(localStorage.getItem(localKey) || '0', 10);
  } catch (e) {}

  // 2. Check currentUser object (if last_view_date matches today)
  let userCount = 0;
  if (currentUser) {
    const userLastDate = currentUser.last_view_date || currentUser.lastViewDate;
    if (userLastDate === todayStr) {
      userCount = parseInt(currentUser.views_today || currentUser.viewsToday || '0', 10);
    }
  }

  let dbCount = 0;
  // 3. Query Supabase daily_contact_views log table for records created today
  if (isSupabaseConfigured() && supabase) {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('daily_contact_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', startOfDay.toISOString());

      if (!error && typeof count === 'number') {
        dbCount = count;
      }
    } catch (err) {
      console.warn('[dailyContactLimitService] DB count query error:', err);
    }
  }

  // The accurate view count is the maximum recorded across db and local caches
  const finalCount = Math.max(dbCount, localCount, userCount);

  // Sync back to local storage for fast access
  try {
    localStorage.setItem(localKey, String(finalCount));
  } catch (e) {}

  return finalCount;
}

/**
 * Checks whether the user is permitted to view a new contact today.
 * Returns { allowed: boolean, viewsToday: number, limit: number, remaining: number }
 */
export async function canViewContactToday(userId, currentUser = null) {
  const limit = await getDailyContactLimit();
  const viewsToday = await getTodayViewCount(userId, currentUser);

  const allowed = viewsToday < limit;
  const remaining = Math.max(0, limit - viewsToday);

  return {
    allowed,
    viewsToday,
    limit,
    remaining
  };
}

/**
 * Records a contact view event:
 * 1. Inserts an audit log into Supabase daily_contact_views table.
 * 2. Increments local user view counter for today.
 * 3. Syncs updated views_today & last_view_date to Supabase profiles table.
 */
export async function recordContactView(userId, viewedProfileId, currentUser = null) {
  if (!userId) return { viewsToday: 1, last_view_date: getTodayDateString() };
  const uid = String(userId);
  const targetId = String(viewedProfileId || '');
  const todayStr = getTodayDateString();

  // Increment local storage count
  const localKey = `i4u_daily_views_${uid}_${todayStr}`;
  let currentLocal = 0;
  try {
    currentLocal = parseInt(localStorage.getItem(localKey) || '0', 10);
  } catch (e) {}
  const nextCount = currentLocal + 1;
  try {
    localStorage.setItem(localKey, String(nextCount));
  } catch (e) {}

  // 1. Insert audit log into Supabase daily_contact_views
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('daily_contact_views')
        .insert([{
          user_id: uid,
          viewed_profile_id: targetId,
          created_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.warn('[dailyContactLimitService] Log insert notice:', err);
    }

    // 2. Sync to public.profiles columns if possible
    try {
      await supabase
        .from('profiles')
        .update({
          views_today: nextCount,
          last_view_date: todayStr
        })
        .eq('id', uid);
    } catch (e) {}
  }

  return {
    viewsToday: nextCount,
    last_view_date: todayStr
  };
}

/**
 * Real-time subscription to admin_settings changes.
 */
export function subscribeToDailyLimitChanges(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event) => {
    if (typeof callback === 'function' && event?.detail !== undefined) {
      callback(event.detail);
    }
  };

  const handleStorageEvent = (event) => {
    if (event.key === STORAGE_LIMIT_KEY && event.newValue) {
      const parsed = parseInt(event.newValue, 10);
      if (!isNaN(parsed) && typeof callback === 'function') {
        callback(parsed);
      }
    }
  };

  window.addEventListener('i4u-daily-limit-updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  let sbChannel = null;
  if (isSupabaseConfigured() && supabase) {
    try {
      sbChannel = supabase
        .channel('admin_settings_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_settings', filter: 'key=eq.daily_contact_limit' },
          (payload) => {
            const newVal = payload?.new?.value;
            let parsed = DEFAULT_DAILY_LIMIT;
            if (typeof newVal === 'number') parsed = newVal;
            else if (typeof newVal === 'string') parsed = parseInt(newVal, 10) || DEFAULT_DAILY_LIMIT;
            else if (newVal && typeof newVal === 'object') parsed = parseInt(newVal.limit ?? newVal.daily_contact_limit, 10) || DEFAULT_DAILY_LIMIT;
            
            try {
              localStorage.setItem(STORAGE_LIMIT_KEY, String(parsed));
            } catch (e) {}
            if (typeof callback === 'function') {
              callback(parsed);
            }
          }
        )
        .subscribe();
    } catch (e) {}
  }

  return () => {
    window.removeEventListener('i4u-daily-limit-updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (sbChannel && supabase) {
      supabase.removeChannel(sbChannel);
    }
  };
}

export const dailyContactLimitService = {
  getDailyContactLimit,
  updateDailyContactLimit,
  getTodayViewCount,
  canViewContactToday,
  recordContactView,
  getTodayDateString,
  subscribeToDailyLimitChanges
};

export default dailyContactLimitService;
