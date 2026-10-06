import React, { useState } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  X,
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Copy,
  Clock,
  HeartHandshake,
  Lock
} from 'lucide-react';
import { MEMBERSHIP_PLANS } from '../../data/plansData';

export default function WebsitePricingSection({ 
  plans = MEMBERSHIP_PLANS, 
  offers = [], 
  currentUser,
  onOpenLogin,
  onSelectPlanForPayment, 
  onOpenRegister 
}) {
  const [selectedDuration, setSelectedDuration] = useState(6); // 3 | 6 | 12 months
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [infoToast, setInfoToast] = useState('');

  const planList = Array.isArray(plans) ? plans : MEMBERSHIP_PLANS;
  const activePlans = planList
    .filter(p => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  // Dynamic Featured Offer from Python Admin Database
  const featuredOffer = (offers && offers.length > 0)
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1' || o.is_active === undefined) || offers[0])
    : null;
  const activePromoCode = featuredOffer?.code || '';
  const activeDiscountPercent = featuredOffer ? (Number(featuredOffer.discount_percent) || 0) : 0;
  const activeOfferTitle = featuredOffer?.title || '';
  const activeOfferDesc = featuredOffer?.description || '';

  const handleCopyCoupon = () => {
    if (activePromoCode) {
      navigator.clipboard?.writeText(activePromoCode);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2000);
    }
  };

  const showToast = (msg) => {
    setInfoToast(msg);
    setTimeout(() => setInfoToast(''), 3000);
  };

  const getPlanPricing = (plan) => {
    if (plan.pricing && plan.pricing[selectedDuration]) {
      const p = plan.pricing[selectedDuration];
      return {
        original: p.originalPrice || 0,
        discounted: p.offerPrice || 0,
        perMonth: p.perMonth || 0,
        discount: featuredOffer ? (p.discount || `${activeDiscountPercent}% OFF`) : null
      };
    }
    const base = plan.price || 1999;
    return {
      original: base,
      discounted: featuredOffer ? Math.round(base * (1 - activeDiscountPercent / 100)) : base,
      perMonth: featuredOffer ? Math.round((base * (1 - activeDiscountPercent / 100)) / selectedDuration) : Math.round(base / selectedDuration),
      discount: featuredOffer ? `${activeDiscountPercent}% OFF` : null
    };
  };

  const handleSelectPlan = (plan) => {
    if (!currentUser) {
      showToast('Please log in or register to select or activate a membership plan.');
      if (onOpenLogin) {
        onOpenLogin();
      } else if (onOpenRegister) {
        onOpenRegister();
      }
      return;
    }

    const pricing = getPlanPricing(plan);
    if (pricing.discounted === 0) {
      showToast('You already have Free Basic access! Upgrade to Gold or Diamond for direct contacts.');
      return;
    }
    if (onSelectPlanForPayment) {
      onSelectPlanForPayment(plan, selectedDuration, activePromoCode);
    }
  };

  return (
    <section id="plans-section" className="py-12 lg:py-20 bg-slate-50 text-slate-900 border-b border-slate-200 relative overflow-hidden">
      
      {/* Dynamic Toast Feedback */}
      {infoToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none max-w-md w-[90%]">
          <div className="bg-[#0B192C]/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#D4AF37]/50 flex items-center space-x-2.5 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#DFB76C] shrink-0" />
            <span>{infoToast}</span>
          </div>
        </div>
      )}

      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 space-y-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#DFB76C]/15 border border-[#D4AF37]/30 text-[#8C6D1F] text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-[#8C6D1F]" />
            <span>Transparent Matrimonial Memberships</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-[#0B192C]">
            Invest in a Lifetime of Happiness
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            Unlock direct candidate telephone numbers, verified family horoscopes, and unlimited chats with zero hidden fees.
          </p>

          {!currentUser && (
            <div className="pt-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-50/90 border border-amber-300 text-amber-900 text-xs font-semibold shadow-xs">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>View-Only Mode: Please log in or register to select and activate membership plans</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Admin-Managed Offer Banner (Only if featuredOffer active) */}
        {featuredOffer && (
          <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white rounded-3xl p-5 sm:p-7 border border-[#D4AF37]/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="relative z-10 space-y-1.5 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-[#D4AF37] text-[#0B192C] text-[11px] font-extrabold uppercase">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>{activeOfferTitle}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                Flat {activeDiscountPercent}% Savings on All Plans
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                {activeOfferDesc} Use promo code <strong className="text-[#DFB76C]">{activePromoCode}</strong> at checkout.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-black/50 border border-[#D4AF37]/40 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Promo Code</span>
                <span className="text-base font-mono font-bold text-[#DFB76C]">{activePromoCode}</span>
              </div>

              <button
                onClick={handleCopyCoupon}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs hover:opacity-95 transition-all shadow-md cursor-pointer active:scale-95"
              >
                {copiedCoupon ? 'Copied to Clipboard! ✓' : 'Copy Coupon Code'}
              </button>
            </div>

            {/* Decorative Backdrops */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        )}

        {/* Duration Billing Toggle */}
        <div className="flex justify-center">
          <div className="flex items-center bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-md text-sm sm:text-base font-bold">
            <button
              onClick={() => setSelectedDuration(3)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer ${
                selectedDuration === 3 ? 'bg-[#0B192C] text-[#DFB76C] shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              3 Months Plan
            </button>
            <button
              onClick={() => setSelectedDuration(6)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer relative ${
                selectedDuration === 6 ? 'bg-[#0B192C] text-[#DFB76C] shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              <span>6 Months (Most Popular)</span>
              {featuredOffer && (
                <span className="absolute -top-3 right-1.5 sm:right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] sm:text-xs font-black uppercase shadow-xs tracking-wider">
                  Save {activeDiscountPercent}%
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedDuration(12)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer ${
                selectedDuration === 12 ? 'bg-[#0B192C] text-[#DFB76C] shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              12 Months (Best Value)
            </button>
          </div>
        </div>

        {/* Plans Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${activePlans.length >= 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'} gap-5`}>
          {activePlans.length === 0 ? (
            <div className="col-span-full max-w-md mx-auto text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 space-y-3">
              <Crown className="w-12 h-12 text-[#DFB76C] mx-auto opacity-50" />
              <h3 className="text-lg font-bold text-slate-800">Membership Plans Under Update</h3>
              <p className="text-xs text-slate-500">Our packages are currently being updated. Please check back shortly.</p>
            </div>
          ) : (
            activePlans.map((plan) => {
              const pricing = getPlanPricing(plan);
              const isPopular = plan.id === 'diamond' || plan.isPopular;

              return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`bg-white rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between relative group hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer ${
                  isPopular
                    ? 'border-[#D4AF37] shadow-xl ring-2 ring-[#D4AF37]/40'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                
                {/* Popular / Promo Pill */}
                {isPopular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    Most Recommended
                  </div>
                ) : plan.badge ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    {plan.badge}
                  </div>
                ) : null}

                <div className="space-y-3.5">
                  
                  {/* Plan Title & Tag */}
                  <div>
                    <h3 className="text-xl font-serif font-bold text-[#0B192C] group-hover:text-[#8C6D1F] transition-colors">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {plan.tagline || 'Comprehensive matchmaking package'}
                    </p>
                  </div>

                  {/* Pricing Box with Direct CTA Button */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 group-hover:border-[#D4AF37]/30 transition-colors">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-serif font-extrabold text-[#0B192C]">
                        ₹{pricing.discounted}
                      </span>
                      {pricing.original > 0 && pricing.original !== pricing.discounted && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{pricing.original}
                        </span>
                      )}
                    </div>
                    {pricing.discounted > 0 ? (
                      <>
                        <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                          {pricing.discount ? `${pricing.discount} • ` : ''}₹{pricing.perMonth}/mo
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Valid for {selectedDuration} Months • Incl. GST
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                        Free forever exploratory plan
                      </span>
                    )}

                    {/* Immediate Action Button directly under price */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs mt-3 flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer ${
                        !currentUser
                          ? 'bg-slate-100 hover:bg-[#0B192C] text-slate-700 hover:text-white border border-slate-200 hover:border-[#0B192C]'
                          : isPopular
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] hover:opacity-95'
                            : pricing.discounted === 0
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-[#0B192C] text-white hover:bg-slate-800'
                      }`}
                    >
                      {!currentUser ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#8C6D1F]" />
                          <span>{pricing.discounted === 0 ? 'Login to Get Started' : 'Login to Upgrade'}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {pricing.discounted === 0 
                              ? 'Start Free Account' 
                              : `Upgrade • ₹${pricing.discounted}`}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Features List (Compact Spacing) */}
                  <div className="space-y-2 pt-1 text-xs">
                    {plan.features?.map((feat, idx) => {
                      const isIncluded = typeof feat === 'object' ? feat.included : true;
                      const featText = typeof feat === 'object' ? feat.text : feat;
                      return (
                        <div key={idx} className="flex items-start space-x-2">
                          {isIncluded ? (
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                              <X className="w-2 h-2 stroke-[2]" />
                            </div>
                          )}
                          <span className={`leading-tight text-[11px] ${isIncluded ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}`}>
                            {featText}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Bottom Card Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm ${
                      !currentUser
                        ? 'bg-slate-50 hover:bg-amber-50/80 text-slate-600 hover:text-amber-900 border border-slate-200'
                        : isPopular
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] hover:opacity-95'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {!currentUser ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pricing.discounted === 0 ? 'Login for Free Access' : `Login to Select ${plan.name}`}</span>
                      </>
                    ) : (
                      <>
                        <span>{pricing.discounted === 0 ? 'Current Free Plan' : `Select ${plan.name}`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          }))}
        </div>

        {/* Payment Assurance Banner */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Safe UPI & 256-Bit SSL Checkout
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600" /> Instant Contact Unlock & GST Invoice
          </span>
          <span className="flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-blue-600" /> 30-Day Matrimony Guarantee
          </span>
        </div>

      </div>

    </section>
  );
}
