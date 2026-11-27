/**
 * Wedding Services & Vendor Portal Service
 * Handles Supabase queries for wedding_vendors, vendor_media, vendor_inquiries,
 * plus push notifications and Cloudflare R2 media uploads.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { uploadVendorMediaToR2, uploadPhotoToR2, deletePhotoFromR2 } from '../utils/r2Upload';
import { STATES_AND_CITIES, getDistrictsForState } from '../data/locationData';

export const VENDOR_CATEGORIES = [
  {
    id: 'all',
    label: 'All Services',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'event_management',
    label: 'Event Management & Wedding Planner',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'invitation_cards',
    label: 'Invitation & Digital Card',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bridal_groom_wear',
    label: 'Bridal & Groom Wear',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'clothing_stitching',
    label: 'Clothing & Stitching',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jewellery_ornaments',
    label: 'Jewellery & Ornaments',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'dress_jewellery_rental',
    label: 'Dress & Jewellery Rental',
    image: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'mehndi_artist',
    label: 'Mehndi Artist',
    image: 'https://images.unsplash.com/photo-1595429035839-c99c298ffdde?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'auditorium_convention',
    label: 'Auditorium & Convention Centre',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'stage_hall_decoration',
    label: 'Stage & Hall Decoration',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'flowers_garlands',
    label: 'Flowers & Wedding Garlands',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'sound_lighting_sfx',
    label: 'Sound, Lighting & Special Effects',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bridal_makeup_hair',
    label: 'Bridal Makeup & Hair Styling',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'photography_video_drone',
    label: 'Photography, Videography & Drone',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'catering_food',
    label: 'Catering (Food Service)',
    image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'wedding_cake_sweets',
    label: 'Wedding Cake & Sweets',
    image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'bridal_groom_car',
    label: 'Bridal & Groom Rental Car',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'tourist_bus',
    label: 'Tourist Bus (Long Trip)',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'guest_accommodation',
    label: 'Guest Accommodation',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'percussion_melam',
    label: 'Traditional Percussion & Melam',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'music_dj_anchors',
    label: 'Music Band, DJ & Anchors',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'security_valet',
    label: 'Security & Valet Parking',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'return_gifts_hampers',
    label: 'Return Gifts & Hampers',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'honeymoon_travel',
    label: 'Honeymoon Travel Packages',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80'
  }
];

export const SERVICE_AREA_OPTIONS = [
  'Local Town',
  'Entire District',
  'All Kerala',
  'All India'
];

const EXTRA_STATES_AND_UTS = {
  'Andaman & Nicobar Islands (UT)': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Arunachal Pradesh': ['Itanagar Capital Complex', 'Papum Pare', 'Tawang', 'West Kameng'],
  'Dadra & Nagar Haveli and Daman & Diu (UT)': ['Dadra & Nagar Haveli', 'Daman', 'Diu'],
  'Ladakh (UT)': ['Kargil', 'Leh'],
  'Lakshadweep (UT)': ['Lakshadweep'],
  'Manipur': ['Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['East Khasi Hills', 'West Garo Hills', 'Ri-Bhoi'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Puducherry (UT)': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  'Tripura': ['West Tripura', 'Gomati', 'Sepahijala', 'North Tripura']
};

export const INDIAN_STATES_AND_UTS = [
  'All States',
  ...Array.from(
    new Set([
      ...STATES_AND_CITIES.map(s => s.state),
      ...Object.keys(EXTRA_STATES_AND_UTS)
    ])
  ).sort((a, b) => a.localeCompare(b))
];

export function getServiceDistrictsForState(stateName) {
  if (!stateName || stateName === 'All States') {
    const all = new Set(getDistrictsForState('All States'));
    Object.values(EXTRA_STATES_AND_UTS).forEach(list => list.forEach(d => all.add(d)));
    return ['All Districts', ...Array.from(all).sort((a, b) => a.localeCompare(b))];
  }
  const fromData = getDistrictsForState(stateName);
  const extra = EXTRA_STATES_AND_UTS[stateName] || [];
  const merged = Array.from(new Set([...fromData, ...extra])).sort((a, b) => a.localeCompare(b));
  return ['All Districts', ...merged];
}

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
];

export const SERVICE_DISTRICT_OPTIONS = [
  'All Districts',
  ...KERALA_DISTRICTS,
  'All India'
];

export function getCategoryLabel(categoryId) {
  const found = VENDOR_CATEGORIES.find(c => c.id === categoryId);
  return found ? found.label : categoryId;
}

export function isYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim());
}

export function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function buildWhatsAppVendorUrl(whatsappNumber, businessName = '') {
  const digits = String(whatsappNumber || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Hello${businessName ? ` ${businessName}` : ''}, I found your profile on I 4 You Matrimony and would like to enquire about your wedding services.`
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

/**
 * Fetch approved vendors for the Customer-Facing Services tab.
 * Free users fetch from `wedding_vendors_public` (only id, business_name, category, district).
 * Premium users fetch full details from `wedding_vendors` + `vendor_media`.
 */
export async function fetchApprovedVendors({ isPremium = false, category = 'all', state = 'All States', district = 'All Districts' } = {}) {
  if (!isSupabaseConfigured()) return [];

  const stateDistricts = (state && state !== 'All States')
    ? getServiceDistrictsForState(state).filter(d => d !== 'All Districts')
    : [];

  if (!isPremium) {
    let query = supabase
      .from('wedding_vendors_public')
      .select('id, business_name, category, district, is_verified');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (district && district !== 'All Districts' && district !== 'All India') {
      query = query.eq('district', district);
    } else if (stateDistricts.length > 0) {
      query = query.in('district', [...stateDistricts, 'All India']);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[vendorService] fetchApprovedVendors (public) error:', error.message);
      return [];
    }
    return (data || []).map(v => ({ ...v, is_approved: true, is_verified: true, media: [] }));
  }

  let query = supabase
    .from('wedding_vendors')
    .select(`
      id,
      owner_user_id,
      business_name,
      owner_name,
      phone,
      whatsapp_number,
      state,
      district,
      city_address,
      address,
      service_area,
      experience_years,
      license_number,
      category,
      description,
      staff_details,
      pricing_range,
      is_mobile_verified,
      is_verified,
      is_approved,
      created_at,
      vendor_media (
        id,
        vendor_id,
        media_type,
        media_url,
        sort_order,
        created_at
      )
    `)
    .eq('is_verified', true)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (district && district !== 'All Districts' && district !== 'All India') {
    query = query.eq('district', district);
  } else if (stateDistricts.length > 0) {
    query = query.in('district', [...stateDistricts, 'All India']);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[vendorService] fetchApprovedVendors (premium) error:', error.message);
    return [];
  }

  return (data || []).map(v => ({
    ...v,
    media: Array.isArray(v.vendor_media)
      ? [...v.vendor_media].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      : []
  }));
}

/**
 * Send an in-app inquiry from a Premium customer to a vendor and trigger push notification if available.
 */
export async function sendVendorInquiry({ vendorId, vendorOwnerUserId, businessName, customerId, customerName, customerPhone, message }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) {
    throw new Error('Please enter a message before sending.');
  }

  const payload = {
    vendor_id: vendorId,
    customer_id: customerId,
    customer_name: customerName || 'Premium Member',
    customer_phone: customerPhone || '',
    sender_role: 'customer',
    sender_name: customerName || 'Premium Member',
    message: cleanMessage,
    is_read: false
  };

  const { data, error } = await supabase
    .from('vendor_inquiries')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to send inquiry.');
  }

  // Trigger existing Supabase Edge Function `send-push` if available (best-effort)
  if (vendorOwnerUserId) {
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          receiver_id: vendorOwnerUserId,
          title: `New Wedding Service Inquiry${businessName ? ` - ${businessName}` : ''}`,
          body: `${payload.customer_name}: ${cleanMessage.slice(0, 120)}`,
          type: 'message',
          url: '/?tab=account'
        }
      });
    } catch (pushErr) {
      console.warn('[vendorService] Optional send-push notice:', pushErr?.message || pushErr);
    }
  }

  return data;
}

/**
 * Fetch the logged-in vendor's own business profile, media, and inquiries.
 */
export async function fetchMyVendorProfile(ownerUserId) {
  if (!isSupabaseConfigured() || !ownerUserId) return null;

  const { data, error } = await supabase
    .from('wedding_vendors')
    .select(`
      *,
      vendor_media (
        id,
        vendor_id,
        media_type,
        media_url,
        sort_order,
        created_at
      )
    `)
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[vendorService] fetchMyVendorProfile error:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    media: Array.isArray(data.vendor_media)
      ? [...data.vendor_media].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      : []
  };
}

/**
 * Upload vendor verification document (Owner ID or Shop License) to Cloudflare R2.
 */
export async function uploadVendorVerificationDoc({ vendorKey = 'vendor', file }) {
  if (!file) throw new Error('No verification document selected.');
  const safeKey = String(vendorKey || 'vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const res = await uploadPhotoToR2(file, safeKey, `vendors/${safeKey}/verification-docs`);
  if (!res?.success || !res?.publicUrl) {
    throw new Error(res?.error || 'Failed to upload verification document.');
  }
  return res.publicUrl;
}

/**
 * Create or update the vendor's business profile.
 */
export async function saveVendorProfile(ownerUserId, formData, existingVendorId = null) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  if (!ownerUserId) throw new Error('Please sign in to save your vendor profile.');

  const payload = {
    owner_user_id: ownerUserId,
    business_name: String(formData.business_name || '').trim(),
    owner_name: String(formData.owner_name || '').trim(),
    phone: String(formData.phone || '').trim(),
    whatsapp_number: String(formData.whatsapp_number || formData.phone || '').trim(),
    state: String(formData.state || '').trim(),
    district: String(formData.district || '').trim(),
    city_address: String(formData.city_address || '').trim(),
    address: String(formData.address || '').trim(),
    service_area: String(formData.service_area || '').trim(),
    experience_years: String(formData.experience_years || '').trim(),
    license_number: String(formData.license_number || '').trim(),
    category: String(formData.category || 'event_management').trim(),
    description: String(formData.description || '').trim(),
    staff_details: String(formData.staff_details || '').trim(),
    pricing_range: String(formData.pricing_range || '').trim(),
    verification_doc_url: String(formData.verification_doc_url || '').trim() || null,
    is_mobile_verified: Boolean(formData.is_mobile_verified)
  };

  if (existingVendorId) {
    const { data, error } = await supabase
      .from('wedding_vendors')
      .update({ ...payload, rejection_reason: null })
      .eq('id', existingVendorId)
      .eq('owner_user_id', ownerUserId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('wedding_vendors')
    .insert({ ...payload, is_verified: false, is_approved: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Upload vendor image or video to R2 and insert into vendor_media.
 */
export async function addVendorMediaFile({ vendorId, file, mediaType = 'image', sortOrder = 0 }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const uploadRes = await uploadVendorMediaToR2(file, vendorId, mediaType);
  const { data, error } = await supabase
    .from('vendor_media')
    .insert({
      vendor_id: vendorId,
      media_type: mediaType,
      media_url: uploadRes.publicUrl,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Save an optional YouTube video URL into vendor_media.
 */
export async function addVendorYouTubeUrl({ vendorId, youtubeUrl, sortOrder = 0 }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const cleanUrl = String(youtubeUrl || '').trim();
  if (!isYouTubeUrl(cleanUrl)) {
    throw new Error('Please enter a valid YouTube video URL.');
  }

  const { data, error } = await supabase
    .from('vendor_media')
    .insert({
      vendor_id: vendorId,
      media_type: 'video',
      media_url: cleanUrl,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a vendor_media row and remove from R2 if hosted on R2.
 */
export async function removeVendorMedia(mediaItem) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  if (mediaItem?.media_url && !isYouTubeUrl(mediaItem.media_url)) {
    await deletePhotoFromR2(mediaItem.media_url).catch(() => {});
  }
  const { error } = await supabase
    .from('vendor_media')
    .delete()
    .eq('id', mediaItem.id);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Send a reply from a Vendor to a Matrimony customer in the same two-way thread.
 */
export async function sendVendorReply({ vendorId, businessName, customerId, customerName, customerPhone, message }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) {
    throw new Error('Please enter a reply before sending.');
  }

  const payload = {
    vendor_id: vendorId,
    customer_id: customerId,
    customer_name: customerName || 'Member',
    customer_phone: customerPhone || '',
    sender_role: 'vendor',
    sender_name: businessName || 'Wedding Service',
    message: cleanMessage,
    is_read: false
  };

  const { data, error } = await supabase
    .from('vendor_inquiries')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Unable to send reply.');
  }

  if (customerId) {
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          receiver_id: customerId,
          title: `${businessName || 'Wedding Service'} replied`,
          body: cleanMessage.slice(0, 120),
          type: 'message',
          url: '/?tab=chat'
        }
      });
    } catch (pushErr) {
      console.warn('[vendorService] Optional send-push notice:', pushErr?.message || pushErr);
    }
  }

  return data;
}

/**
 * Fetch incoming customer inquiries & two-way messages for a vendor.
 */
export async function fetchVendorInquiries(vendorId) {
  if (!isSupabaseConfigured() || !vendorId) return [];
  const { data, error } = await supabase
    .from('vendor_inquiries')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[vendorService] fetchVendorInquiries error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Mark an inquiry as read.
 */
export async function markVendorInquiryRead(inquiryId) {
  if (!isSupabaseConfigured() || !inquiryId) return;
  await supabase
    .from('vendor_inquiries')
    .update({ is_read: true })
    .eq('id', inquiryId);
}
