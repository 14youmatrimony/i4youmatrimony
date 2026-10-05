// Matrimonial Membership Plans, Promotional Offers & Payment Gateway Mock Data

export const PROMOTIONAL_OFFERS = [
  {
    id: 'vivah-mahotsav',
    badge: 'SHUBH VIVAH SPECIAL',
    title: 'Festive Vivah Mahotsav: Flat 50% OFF',
    subtitle: 'Unlock verified candidate contact numbers, family horoscopes & unlimited chats',
    code: 'VIVAH50',
    discountPercent: 50,
    expiresInHours: 3,
    highlight: true,
    bannerGradient: 'from-amber-600 via-amber-500 to-yellow-500'
  },
  {
    id: 'first-match',
    badge: 'NEW MEMBER BONUS',
    title: 'First Match Welcome Offer: Extra 30 Days Free',
    subtitle: 'Get +15 bonus contact unlocks on Diamond & Platinum plans',
    code: 'FIRSTMATCH',
    discountFlat: 400,
    highlight: false,
    bannerGradient: 'from-blue-600 via-indigo-600 to-violet-600'
  }
];

export const VALID_COUPONS = {
  'VIVAH50': {
    code: 'VIVAH50',
    discountType: 'percentage',
    discountValue: 50,
    maxDiscount: 2500,
    minAmount: 1000,
    description: 'Flat 50% discount on all quarterly & annual plans'
  },
  'FIRSTMATCH': {
    code: 'FIRSTMATCH',
    discountType: 'flat',
    discountValue: 400,
    minAmount: 1200,
    description: '₹400 instant welcome savings on first upgrade'
  },
  'SHUBH2026': {
    code: 'SHUBH2026',
    discountType: 'percentage',
    discountValue: 30,
    maxDiscount: 1500,
    minAmount: 1000,
    description: '30% savings for 2026 auspicious wedding season'
  },
  'SAVE500': {
    code: 'SAVE500',
    discountType: 'flat',
    discountValue: 500,
    minAmount: 2000,
    description: '₹500 flat discount on Diamond & VIP plans'
  }
};

export const MEMBERSHIP_PLANS = [
  {
    id: 'free',
    name: 'Free Basic',
    tagline: 'Standard exploratory access',
    badge: null,
    isPopular: false,
    color: 'slate',
    accentBorder: 'border-slate-300',
    headerBg: 'bg-slate-800 text-white',
    pricing: {
      1: { originalPrice: 0, offerPrice: 0, perMonth: 0, durationMonths: 1 },
      3: { originalPrice: 0, offerPrice: 0, perMonth: 0, durationMonths: 3 },
      6: { originalPrice: 0, offerPrice: 0, perMonth: 0, durationMonths: 6 },
      12: { originalPrice: 0, offerPrice: 0, perMonth: 0, durationMonths: 12 }
    },
    contactCredits: 0,
    dailyInterests: '5 / day',
    kundaliReports: 'Basic Ashtakoot Milan',
    searchBoost: '1x Standard',
    hasAdvisor: false,
    privacyShield: 'Standard Public',
    supportLevel: 'Basic Email (48-72h)',
    features: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send up to 5 Interests per day', included: true },
      { text: 'Basic Ashtakoot Milan Summary', included: true },
      { text: 'View Verified Contact Numbers (Subscription Required)', included: false },
      { text: 'Direct WhatsApp & Phone Connect', included: false },
      { text: 'Unlimited Chat & Messages', included: false },
      { text: '3x Search Visibility Profile Boost', included: false },
      { text: 'Personal Matchmaking Advisor', included: false }
    ]
  },
  {
    id: 'silver',
    name: 'Silver Starter',
    tagline: 'Standard exploratory access',
    badge: 'MUST USE',
    isPopular: false,
    color: 'amber',
    accentBorder: 'border-amber-300',
    headerBg: 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white',
    pricing: {
      1: { originalPrice: 1499, offerPrice: 999, perMonth: 999, durationMonths: 1, discount: '33% OFF' },
      3: { originalPrice: 1999, offerPrice: 1499, perMonth: 500, durationMonths: 3, discount: '25% OFF' },
      6: { originalPrice: 2499, offerPrice: 1999, perMonth: 333, durationMonths: 6, discount: '20% OFF' },
      12: { originalPrice: 2999, offerPrice: 2499, perMonth: 208, durationMonths: 12, discount: '17% OFF' }
    },
    contactCredits: 10,
    dailyInterests: 'Unlimited',
    kundaliReports: 'Basic Ashtakoot',
    searchBoost: '1x Standard',
    hasAdvisor: false,
    privacyShield: 'Standard Public',
    supportLevel: 'Priority Chat & Email (24h)',
    features: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 10 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Unlimited Direct Matrimonial Chat', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: 'Personal Matchmaking Advisor', included: false }
    ]
  },
  {
    id: 'gold',
    name: 'Gold Match',
    tagline: 'Ideal for serious marriage seekers',
    badge: 'POPULAR CHOICE',
    isPopular: false,
    color: 'amber',
    accentBorder: 'border-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
    pricing: {
      1: { originalPrice: 999, offerPrice: 499, perMonth: 499, durationMonths: 1, discount: '50% OFF' },
      3: { originalPrice: 2499, offerPrice: 1299, perMonth: 433, durationMonths: 3, discount: '48% OFF' },
      6: { originalPrice: 3999, offerPrice: 1999, perMonth: 333, durationMonths: 6, discount: '50% OFF' },
      12: { originalPrice: 6999, offerPrice: 3299, perMonth: 275, durationMonths: 12, discount: '53% OFF' }
    },
    contactCredits: 30,
    dailyInterests: '25 / day',
    kundaliReports: '15 Detailed Reports',
    searchBoost: '2x Priority',
    hasAdvisor: false,
    privacyShield: 'Photo Blur until Accepted',
    supportLevel: 'Priority Chat & Email (24h)',
    features: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Shortlists', included: true },
      { text: 'View 30 Verified Mobile Numbers & Addresses', included: true },
      { text: 'Full 36 Gunas Ashtakoot Astrological Dossier', included: true },
      { text: 'Unlimited Direct Matrimonial Chat', included: true },
      { text: 'Instant WhatsApp Family Connect Link', included: true },
      { text: '3x Search Visibility Profile Boost', included: false },
      { text: 'Personal Matchmaking Advisor', included: false }
    ]
  },
  {
    id: 'diamond',
    name: 'Diamond VIP',
    tagline: 'Fastest matches with 3x visibility',
    badge: 'MOST POPULAR ⭐',
    isPopular: true,
    color: 'blue',
    accentBorder: 'border-[#D4AF37]',
    headerBg: 'bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white',
    pricing: {
      1: { originalPrice: 1599, offerPrice: 799, perMonth: 799, durationMonths: 1, discount: '50% OFF' },
      3: { originalPrice: 3999, offerPrice: 1999, perMonth: 666, durationMonths: 3, discount: '50% OFF' },
      6: { originalPrice: 4999, offerPrice: 2499, perMonth: 416, durationMonths: 6, discount: '50% OFF' },
      12: { originalPrice: 8999, offerPrice: 3999, perMonth: 333, durationMonths: 12, discount: '55% OFF' }
    },
    contactCredits: 75,
    dailyInterests: '50 / day',
    kundaliReports: '50 Reports + PDF Download',
    searchBoost: '3x Spotlight',
    hasAdvisor: false,
    privacyShield: 'Protected Contact Access',
    supportLevel: 'Priority Phone & WhatsApp (12h)',
    features: [
      { text: 'Browse 100% Aadhaar Verified Profiles', included: true },
      { text: 'Send Unlimited Interests & Follow-ups', included: true },
      { text: 'View 75 Verified Contact Numbers + Parents Contacts', included: true },
      { text: 'Full 36 Gunas Vedic Horoscope & Dosha Analysis', included: true },
      { text: 'Priority Chat Badge & Read Receipts', included: true },
      { text: 'Instant WhatsApp Connect & Family Contact Access', included: true },
      { text: '3x Search Visibility & Spotlight in Match Feed', included: true },
      { text: 'VIP Aadhaar Golden Shield on Profile', included: true },
      { text: 'Dedicated Matrimonial Relationship Manager', included: false }
    ]
  },
  {
    id: 'vip',
    name: 'Platinum Royal',
    tagline: 'White-glove concierge matchmaking',
    badge: 'ELITE CONCIERGE 👑',
    isPopular: false,
    color: 'purple',
    accentBorder: 'border-purple-500',
    headerBg: 'bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white',
    pricing: {
      1: { originalPrice: 2999, offerPrice: 1499, perMonth: 1499, durationMonths: 1, discount: '50% OFF' },
      3: { originalPrice: 6999, offerPrice: 3499, perMonth: 1166, durationMonths: 3, discount: '50% OFF' },
      6: { originalPrice: 9999, offerPrice: 4999, perMonth: 833, durationMonths: 6, discount: '50% OFF' },
      12: { originalPrice: 14999, offerPrice: 6999, perMonth: 583, durationMonths: 12, discount: '53% OFF' }
    },
    contactCredits: 999, // Unlimited
    dailyInterests: 'Unlimited',
    kundaliReports: 'Unlimited + Astrologer Consultation',
    searchBoost: '5x VIP Top Rank #1',
    hasAdvisor: true,
    privacyShield: '100% Strict VIP Shield',
    supportLevel: '24/7 Dedicated VIP Concierge',
    features: [
      { text: 'Unlimited Verified Contact Numbers & Native Addresses', included: true },
      { text: 'Personal Dedicated Matrimonial Relationship Manager', included: true },
      { text: 'Handpicked Verified Matches Introduced Every Weekend', included: true },
      { text: 'Top #1 Spotlight in All District Searches', included: true },
      { text: '100% Complete Privacy Shield (Hidden to Uninvited)', included: true },
      { text: 'Unlimited Direct WhatsApp & Video Call Arranged', included: true },
      { text: 'Senior Astrologer Kundali Matching Consultation', included: true },
      { text: 'Complimentary Professional Matrimonial Photo Session', included: true }
    ]
  }
];

export const POPULAR_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', logo: '🏦', popular: true },
  { id: 'sbi', name: 'State Bank of India', logo: '🏛️', popular: true },
  { id: 'icici', name: 'ICICI Bank', logo: '💳', popular: true },
  { id: 'axis', name: 'Axis Bank', logo: '🟣', popular: true },
  { id: 'kotak', name: 'Kotak Mahindra', logo: '🔴', popular: true },
  { id: 'pnb', name: 'Punjab National Bank', logo: '🏢', popular: false },
  { id: 'bob', name: 'Bank of Baroda', logo: '🟠', popular: false }
];

export const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', icon: '🟢', sub: 'Tez UPI' },
  { id: 'phonepe', name: 'PhonePe', icon: '🟣', sub: 'UPI Payment' },
  { id: 'paytm', name: 'Paytm UPI', icon: '🔵', sub: 'Instant' },
  { id: 'bhim', name: 'BHIM UPI', icon: '🇮🇳', sub: 'Govt NPCI' }
];

/**
 * Calculates pricing, coupon discounts and GST (18%) for checkout
 */
export function calculateOrderDetails(plan, durationMonths = 6, couponCode = '', activeOffers = []) {
  if (!plan || plan.id === 'free') {
    return {
      planId: 'free',
      planName: 'Free Basic',
      durationMonths: durationMonths || 6,
      originalPrice: 0,
      baseOfferPrice: 0,
      discountedBase: 0,
      basePrice: 0,
      discount: 0,
      couponDiscount: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      gst: 0,
      totalAmount: 0,
      couponApplied: null,
      savingsTotal: 0
    };
  }

  const pricingObj = (plan.pricing && (plan.pricing[durationMonths] || plan.pricing[6] || plan.pricing[3])) || {
    originalPrice: plan.price || 1999,
    offerPrice: plan.offerPrice || Math.round((plan.price || 1999) * 0.5)
  };
  const baseOfferPrice = Number(pricingObj.offerPrice) || 0;
  const originalPrice = Number(pricingObj.originalPrice) || 0;

  let couponDiscount = 0;
  let couponApplied = null;
  const cleanCode = (couponCode || '').trim().toUpperCase();

  if (cleanCode) {
    // 1. Check live active offers from admin database first
    const dynamicOffer = Array.isArray(activeOffers)
      ? activeOffers.find(o => o.code?.toUpperCase() === cleanCode && (o.is_active === undefined || o.is_active === 1 || o.is_active === true))
      : null;

    if (dynamicOffer) {
      const percent = Number(dynamicOffer.discount_percent) || 0;
      couponDiscount = Math.round((baseOfferPrice * percent) / 100);
      couponApplied = {
        code: dynamicOffer.code,
        discountType: 'percentage',
        discountValue: percent,
        description: dynamicOffer.title || `${percent}% Discount`
      };
    } else if (VALID_COUPONS[cleanCode]) {
      const coupon = VALID_COUPONS[cleanCode];
      if (baseOfferPrice >= (coupon.minAmount || 0)) {
        if (coupon.discountType === 'percentage') {
          const calculated = Math.round((baseOfferPrice * coupon.discountValue) / 100);
          couponDiscount = Math.min(calculated, coupon.maxDiscount || calculated);
        } else {
          couponDiscount = coupon.discountValue;
        }
        couponApplied = coupon;
      }
    }
  }

  const discountedBase = Math.max(0, baseOfferPrice - couponDiscount);
  // 18% GST calculation (9% CGST + 9% SGST)
  const gst = Math.round(discountedBase * 0.18);
  const totalAmount = discountedBase + gst;

  return {
    planId: plan.id,
    planName: plan.name,
    durationMonths,
    originalPrice,
    baseOfferPrice,
    couponDiscount,
    couponApplied,
    discountedBase,
    cgst: Math.round(gst / 2),
    sgst: Math.round(gst / 2),
    gst,
    totalAmount,
    savingsTotal: (originalPrice - baseOfferPrice) + couponDiscount
  };
}

/**
 * Transforms a raw plan from the Python SQLite database into the frontend format
 */
export function formatBackendPlan(p) {
  const p1m = Number(p.price_1m) || 0;
  const o1m = Number(p.offer_price_1m) || 0;
  const p3m = Number(p.price_3m) || 0;
  const o3m = Number(p.offer_price_3m) || 0;
  const p6m = Number(p.price_6m) || 0;
  const o6m = Number(p.offer_price_6m) || 0;
  const p12m = Number(p.price_12m) || 0;
  const o12m = Number(p.offer_price_12m) || 0;

  let features = [];
  if (Array.isArray(p.features_parsed)) {
    features = p.features_parsed;
  } else if (typeof p.features === 'string') {
    try {
      features = JSON.parse(p.features);
    } catch {
      features = [];
    }
  } else if (Array.isArray(p.features)) {
    features = p.features;
  }

  const isFree = p3m === 0 && p6m === 0 && p12m === 0;

  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline || (isFree ? 'Standard exploratory access' : 'Curated matrimonial membership'),
    badge: p.badge || null,
    isPopular: Boolean(p.is_popular),
    color: p.color || (p.id === 'diamond' ? 'blue' : p.id === 'vip' ? 'purple' : 'amber'),
    accentBorder: p.color === 'blue' || p.id === 'diamond' 
      ? 'border-[#D4AF37]' 
      : p.color === 'purple' || p.id === 'vip' 
        ? 'border-purple-400' 
        : (isFree ? 'border-slate-300' : 'border-amber-400'),
    headerBg: p.color === 'blue' || p.id === 'diamond'
      ? 'bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] text-white'
      : p.color === 'purple' || p.id === 'vip'
        ? 'bg-gradient-to-r from-purple-900 to-indigo-950 text-white'
        : (isFree ? 'bg-slate-800 text-white' : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'),
    pricing: {
      1: { 
        originalPrice: p1m, 
        offerPrice: o1m, 
        perMonth: o1m, 
        durationMonths: 1, 
        discount: p1m > 0 ? `${Math.round((1 - o1m / p1m) * 100)}% OFF` : '50% OFF' 
      },
      3: { 
        originalPrice: p3m, 
        offerPrice: o3m, 
        perMonth: Math.round(o3m / 3), 
        durationMonths: 3, 
        discount: p3m > 0 ? `${Math.round((1 - o3m / p3m) * 100)}% OFF` : '0%' 
      },
      6: { 
        originalPrice: p6m, 
        offerPrice: o6m, 
        perMonth: Math.round(o6m / 6), 
        durationMonths: 6, 
        discount: p6m > 0 ? `${Math.round((1 - o6m / p6m) * 100)}% OFF` : '50% OFF' 
      },
      12: { 
        originalPrice: p12m, 
        offerPrice: o12m, 
        perMonth: Math.round(o12m / 12), 
        durationMonths: 12, 
        discount: p12m > 0 ? `${Math.round((1 - o12m / p12m) * 100)}% OFF` : '0%' 
      }
    },
    contactCredits: p.contact_credits !== undefined ? p.contact_credits : 30,
    features: features.map(f => typeof f === 'object' ? f : { text: String(f), included: true }),
    isActive: Boolean(p.is_active !== undefined ? p.is_active : true),
    sortOrder: Number(p.sort_order) || 99
  };
}
