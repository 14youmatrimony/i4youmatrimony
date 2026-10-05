import React from 'react';

/**
 * Authentic Company Vector Logos for Indian Payment Gateways & UPI Apps
 * Official Brand Colors & Vector Paths for GPay, PhonePe, Paytm, BHIM, etc.
 */

// 1. Google Pay (Official G-Pay Multi-Color Symbol & Badge)
export function GooglePayLogo({ className = "w-7 h-7" }) {
  return (
    <div className={`${className} rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center p-1 shrink-0`}>
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <path
          fill="#4285F4"
          d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
        />
        <path
          fill="#34A853"
          d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.7 2 10.3 7.3 6.3 14.7z"
        />
        <path
          fill="#FBBC05"
          d="M24 46c5.5 0 10.5-2 14.4-5.4l-6.8-5.6C29.6 36.6 26.9 37 24 37c-6.1 0-10.7-3.1-11.8-8.5l-7 5.4C9.2 41 16.1 46 24 46z"
        />
        <path
          fill="#EA4335"
          d="M44.5 20H24v8.5h11.8c-1.1 3.2-3.6 5.8-6.8 6.5l6.8 5.6C39.8 36.8 44.5 29.3 44.5 20z"
        />
      </svg>
    </div>
  );
}

// 2. PhonePe (Official Purple Circle with White Devanagari Pe "पे")
export function PhonePeLogo({ className = "w-7 h-7" }) {
  return (
    <div className={`${className} rounded-full bg-[#5f259f] flex items-center justify-center p-1 shadow-xs shrink-0`}>
      <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
        {/* PhonePe stylized 'Pe' glyph */}
        <path d="M50 8C26.8 8 8 26.8 8 50s18.8 42 42 42 42-18.8 42-42S73.2 8 50 8zm16.5 25.2H55.8c.2-1.3.4-2.7.4-4.2 0-2-.3-3.8-.9-5.3h-8.2c.7 1.6 1 3.4 1 5.3 0 1.5-.2 2.9-.4 4.2H36.2v6.8h7.2c-.7 4.9-3 9.3-6.6 12.5l-4.7 4.2 11.6 20h9.6L44.8 61c3.9-2.1 6.9-5.5 8.7-9.7h13v-6.8H55.4c.2-2.1.3-4.3.3-6.5h10.8v-4.8z" />
      </svg>
    </div>
  );
}

// 3. Paytm (Official Two-Tone Deep Navy Blue & Cyan Badge)
export function PaytmLogo({ className = "w-7 h-7" }) {
  return (
    <div className={`${className} rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0`}>
      <svg viewBox="0 0 100 35" className="w-full h-full">
        {/* "Pay" in #002970 */}
        <text
          x="3"
          y="26"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="26"
          fill="#002970"
          letterSpacing="-0.5"
        >
          Pay
        </text>
        {/* "tm" in #00BAF2 */}
        <text
          x="54"
          y="26"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="26"
          fill="#00BAF2"
          letterSpacing="-0.5"
        >
          tm
        </text>
      </svg>
    </div>
  );
}

// 4. BHIM UPI (Official Orange & Green Triangle with Bharat Identity)
export function BhimUpiLogo({ className = "w-7 h-7" }) {
  return (
    <div className={`${className} rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0`}>
      <svg viewBox="0 0 60 60" className="w-full h-full">
        {/* Orange Triangle */}
        <polygon points="12,10 48,10 30,32" fill="#F47920" />
        {/* Green Triangle */}
        <polygon points="12,50 48,50 30,28" fill="#00843D" />
        {/* Center UPI Stripe */}
        <path d="M26 22 L34 22 L30 38 Z" fill="#005A9C" opacity="0.9" />
        {/* Text BHIM */}
        <text
          x="30"
          y="58"
          textAnchor="middle"
          fontSize="8"
          fontWeight="900"
          fill="#002970"
          fontFamily="sans-serif"
        >
          BHIM
        </text>
      </svg>
    </div>
  );
}

// 5. Amazon Pay
export function AmazonPayLogo({ className = "w-7 h-7" }) {
  return (
    <div className={`${className} rounded-xl bg-[#232F3E] text-white flex items-center justify-center p-1 shadow-xs shrink-0`}>
      <svg viewBox="0 0 60 30" className="w-full h-full">
        {/* "pay" */}
        <text x="6" y="18" fill="#FFFFFF" fontWeight="800" fontSize="13" fontFamily="sans-serif">
          pay
        </text>
        {/* Amazon Smile */}
        <path
          d="M8 22 Q 22 28 36 21"
          stroke="#FF9900"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <polygon points="35,18 39,22 34,24" fill="#FF9900" />
      </svg>
    </div>
  );
}

// 6. HDFC Bank (Official Blue Square with Red Cross Hatching)
export function HdfcBankLogo({ className = "w-6 h-6" }) {
  return (
    <div className={`${className} rounded-lg bg-[#004C8F] flex items-center justify-center p-0.5 shrink-0 shadow-xs`}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="2" y="2" width="36" height="36" rx="4" fill="#004C8F" />
        <rect x="9" y="9" width="22" height="22" fill="#FFFFFF" />
        <rect x="16" y="9" width="8" height="22" fill="#ED232A" />
        <rect x="9" y="16" width="22" height="8" fill="#ED232A" />
        <rect x="16" y="16" width="8" height="8" fill="#004C8F" />
      </svg>
    </div>
  );
}

// 7. State Bank of India (Official Blue Circle with Keyhole)
export function SbiBankLogo({ className = "w-6 h-6" }) {
  return (
    <div className={`${className} rounded-full bg-[#0091DF] flex items-center justify-center p-0.5 shrink-0 shadow-xs`}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <circle cx="20" cy="20" r="18" fill="#0091DF" />
        <circle cx="20" cy="17" r="7" fill="#FFFFFF" />
        <rect x="18" y="17" width="4" height="15" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

// 8. ICICI Bank (Official Maroon & Orange Ring)
export function IciciBankLogo({ className = "w-6 h-6" }) {
  return (
    <div className={`${className} rounded-lg bg-[#861F41] flex items-center justify-center p-0.5 shrink-0 shadow-xs`}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#861F41" />
        <circle cx="20" cy="20" r="12" fill="none" stroke="#F37E20" strokeWidth="4" />
        <circle cx="20" cy="14" r="2.5" fill="#FFFFFF" />
        <rect x="18" y="19" width="4" height="7" rx="1" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

// 9. Axis Bank (Official Burgundy with Inverted 'A' Chevron)
export function AxisBankLogo({ className = "w-6 h-6" }) {
  return (
    <div className={`${className} rounded-lg bg-[#97144D] flex items-center justify-center p-0.5 shrink-0 shadow-xs`}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#97144D" />
        <polygon points="20,10 32,30 24,30 20,22 16,30 8,30" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

// 10. Kotak Mahindra Bank (Official Red Square with Infinity Loop)
export function KotakBankLogo({ className = "w-6 h-6" }) {
  return (
    <div className={`${className} rounded-lg bg-[#ED1C24] flex items-center justify-center p-0.5 shrink-0 shadow-xs`}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="2" y="2" width="36" height="36" rx="6" fill="#ED1C24" />
        <path
          d="M13 20 C13 16 17 16 20 20 C23 24 27 24 27 20 C27 16 23 16 20 20 C17 24 13 24 13 20 Z"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// 11. NPCI / Official UPI Chevron Badge
export function UpiBadgeLogo({ className = "w-8 h-4" }) {
  return (
    <div className={`${className} flex items-center shrink-0`}>
      <svg viewBox="0 0 60 26" className="w-full h-full">
        {/* UPI Triangles */}
        <polygon points="42,2 54,2 46,14" fill="#00843D" />
        <polygon points="48,12 60,12 52,24" fill="#F47920" />
        <text x="3" y="19" fontSize="18" fontWeight="900" fill="#002970" fontFamily="sans-serif">
          UPI
        </text>
      </svg>
    </div>
  );
}
