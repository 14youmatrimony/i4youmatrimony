import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  X, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  HeartHandshake, 
  Lock,
  Clock,
  Tag,
  Copy
} from 'lucide-react';
import { MEMBERSHIP_PLANS, VALID_COUPONS } from '../../data/plansData';

export default function WebsitePricingSection({ 
  plans = MEMBERSHIP_PLANS, 
  offers = [], 
  currentUser,
  onOpenLogin,
  onSelectPlanForPayment, 
  onOpenRegister,
  onOpenOffers
}) {
  const [selectedDuration, setSelectedDuration] = useState(6); // 1 | 3 | 6 | 12 months
  const [copiedCoupon, setCopiedCoupon] = useState('');
  const [infoToast, setInfoToast] = useState('');

  const planList = Array.isArray(plans) ? plans : MEMBERSHIP_PLANS;
  const activePlans = planList
    .filter(p => p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  // Dynamic Active Offers from Supabase Database
  const activeOffersList = Array.isArray(offers)
    ? offers.filter(o => o && (o.is_active === 1 || o.is_active === true || o.is_active === '1'))
    : [];
  const featuredOffer = activeOffersList.length > 0 ? activeOffersList[0] : null;

  const defaultPromoCode = featuredOffer?.code || '';
  const defaultDiscountPercent = featuredOffer ? (Number(featuredOffer.discount_percent) || 0) : 0;

  const [activeCoupon, setActiveCoupon] = useState(defaultPromoCode);
  const [activeDiscountPercent, setActiveDiscountPercent] = useState(defaultDiscountPercent);
  const [couponInput, setCouponInput] = useState(defaultPromoCode);
  const [couponFeedback, setCouponFeedback] = useState(
    defaultPromoCode ? `Coupon ${defaultPromoCode} active! Flat ${defaultDiscountPercent}% Discount` : ''
  );

  // Synchronize state when backend offers update
  useEffect(() => {
    if (featuredOffer?.code) {
      setActiveCoupon(featuredOffer.code);
      setActiveDiscountPercent(Number(featuredOffer.discount_percent) || 0);
      setCouponInput(featuredOffer.code);
      setCouponFeedback(`Coupon ${featuredOffer.code} active! Flat ${featuredOffer.discount_percent}% Discount`);
    }
  }, [featuredOffer?.code, featuredOffer?.discount_percent]);

  // Festive countdown timer state (matching mobile app)
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 30
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCoupon = (code) => {
    const targetCode = code || activeCoupon || defaultPromoCode;
    if (targetCode) {
      navigator.clipboard?.writeText(targetCode);
      setCopiedCoupon(targetCode);
      showToast(`Coupon code ${targetCode} copied to clipboard! ✓`);
      setTimeout(() => setCopiedCoupon(''), 2500);
    }
  };

  const showToast = (msg) => {
    setInfoToast(msg);
    setTimeout(() => setInfoToast(''), 3000);
  };

  const handleApplyCoupon = (e) => {
    e?.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setActiveCoupon('');
      setActiveDiscountPercent(0);
      setCouponFeedback('');
      return;
    }

    // 1. Check live admin backend offers first
    const liveMatched = activeOffersList.find(o => o.code?.toUpperCase() === code);
    if (liveMatched) {
      const pct = Number(liveMatched.discount_percent) || 0;
      setActiveCoupon(liveMatched.code);
      setActiveDiscountPercent(pct);
      setCouponFeedback(`✓ ${liveMatched.code} applied successfully! (Flat ${pct}% Discount)`);
      showToast(`Promo ${liveMatched.code} applied: ${pct}% OFF!`);
      return;
    }

    // 2. Check static fallback coupons
    if (VALID_COUPONS[code]) {
      const c = VALID_COUPONS[code];
      const pct = c.discountType === 'percentage' ? c.discountValue : 20;
      setActiveCoupon(code);
      setActiveDiscountPercent(pct);
      setCouponFeedback(`✓ ${code} applied successfully! (${c.description})`);
      showToast(`Coupon ${code} applied!`);
      return;
    }

    setCouponFeedback(`❌ Invalid code.${defaultPromoCode ? ` Try ${defaultPromoCode}` : ''}`);
  };

  const getPlanPricing = (plan) => {
    const hasDiscount = activeDiscountPercent > 0;
    if (plan.pricing && plan.pricing[selectedDuration]) {
      const p = plan.pricing[selectedDuration];
      const orig = p.originalPrice || 0;
      let disc = p.offerPrice || 0;
      if (hasDiscount && orig > 0) {
        disc = Math.round(orig * (1 - activeDiscountPercent / 100));
      }
      return {
        original: orig,
        discounted: disc,
        perMonth: Math.round(disc / (selectedDuration || 1)),
        discount: hasDiscount ? `${activeDiscountPercent}% OFF` : (p.discount || null)
      };
    }
    const base = plan.price || 1999;
    const discounted = hasDiscount ? Math.round(base * (1 - activeDiscountPercent / 100)) : base;
    return {
      original: base,
      discounted: discounted,
      perMonth: Math.round(discounted / (selectedDuration || 1)),
      discount: hasDiscount ? `${activeDiscountPercent}% OFF` : null
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
      onSelectPlanForPayment(plan, selectedDuration, activeCoupon || defaultPromoCode);
    }
  };

  return (
    <section id="plans-section" className="py-3 md:py-4 bg-[#FFF7FA] text-[#5A4463] relative overflow-hidden">
      
      {/* Dynamic Toast Feedback */}
      {infoToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none max-w-md w-[90%]">
          <div className="bg-[#C76B85] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#8064A2]/50 flex items-center space-x-2.5 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#E8C6D1] shrink-0" />
            <span>{infoToast}</span>
          </div>
        </div>
      )}

      <div className="w-full md:w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 space-y-3 sm:space-y-4">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#F9EBF0] border border-[#E8C6D1] text-[#C76B85] text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 text-[#8064A2]" />
            <span>Transparent Matrimonial Memberships</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-[#2E1A36]">
            Invest in a Lifetime of Happiness
          </h2>
        </div>

        {/* Dynamic Admin-Managed Festive Offer Banner */}
        {featuredOffer && (
          <div
            className="text-[#FFFFFF] rounded-3xl p-5 sm:p-7 border border-[#E8C6D1]/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #C76B85 0%, #8064A2 100%)' }}
          >
            <div className="relative z-10 space-y-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-white/20 text-[#FFFFFF] text-[11px] font-extrabold uppercase shadow-xs">
                  <Sparkles className="w-3 h-3 fill-current text-[#FFF7FA]" />
                  <span>{featuredOffer.title || 'Special Promotion'}</span>
                </span>

                {/* Countdown Clock */}
                <div className="inline-flex items-center space-x-1.5 font-mono text-[11px] font-bold text-[#FFF7FA] bg-white/20 px-2.5 py-0.5 rounded-lg border border-white/20">
                  <Clock className="w-3.5 h-3.5 text-[#FFF7FA]" />
                  <span>Ends in: {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#FFFFFF]">
                Flat {featuredOffer.discount_percent}% Savings on All Matrimonial Packages
              </h3>
              <p className="text-xs text-[#FFF7FA] max-w-xl leading-relaxed">
                {featuredOffer.description || 'Special discount active across all quarterly and annual membership tiers.'} Use promo code <strong className="text-[#E6E6FA] font-mono">{featuredOffer.code}</strong> at checkout.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-white/16 border border-white/20 text-center">
                <span className="text-[10px] text-[#FFF7FA] uppercase tracking-wider block">Promo Code</span>
                <span className="text-base font-mono font-bold text-[#E6E6FA]">{featuredOffer.code}</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCoupon(featuredOffer.code)}
                className="px-5 py-2.5 rounded-2xl bg-[#FFF7FA] hover:bg-[#FFFFFF] text-[#8064A2] font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95 flex items-center space-x-1.5"
              >
                {copiedCoupon === featuredOffer.code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#8064A2]" />
                    <span>Copied! ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#8064A2]" />
                    <span>Copy Coupon Code</span>
                  </>
                )}
              </button>

              {onOpenOffers && (
                <button
                  type="button"
                  onClick={onOpenOffers}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer shadow-md flex items-center space-x-1"
                >
                  <span>View All Offers</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E8C6D1]" />
                </button>
              )}
            </div>

            {/* Decorative Backdrops */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#8064A2]/15 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        )}

        {/* All Available Active Promo Codes Carousel / Strip */}
        {activeOffersList.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#C76B85]" /> Active Special Offers ({activeOffersList.length})
              </span>
              <span className="text-slate-500 font-normal text-[11px]">Click any coupon to apply</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeOffersList.map((offer) => {
                const isSelected = activeCoupon === offer.code;
                return (
                  <div 
                    key={offer.id || offer.code}
                    onClick={() => {
                      setActiveCoupon(offer.code);
                      setActiveDiscountPercent(Number(offer.discount_percent) || 0);
                      setCouponInput(offer.code);
                      setCouponFeedback(`✓ ${offer.code} applied! Flat ${offer.discount_percent}% Discount`);
                      handleCopyCoupon(offer.code);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                      isSelected 
                        ? 'bg-[#F9EBF0] border-[#C76B85] ring-2 ring-[#8064A2]/40' 
                        : 'bg-white border-[#E8C6D1] hover:border-[#8064A2]'
                    }`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#C76B85] bg-[#FFF7FA] px-1.5 py-0.5 rounded border border-[#E8C6D1]">
                          {offer.code}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {offer.discount_percent}% OFF
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#2E1A36] truncate">{offer.title}</p>
                      <p className="text-[10px] text-[#5A4463] truncate">{offer.description || offer.plan_type}</p>
                    </div>
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        isSelected ? 'bg-[#C76B85] text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Apply coupon"
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Tag className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Promo Code Input & Instant Validation Form */}
        <div className="max-w-xl mx-auto w-full">
          <form onSubmit={handleApplyCoupon} className="p-3 bg-white rounded-2xl border border-[#E8C6D1] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2E1A36] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#8064A2]" /> Have a Promotional Code?
              </span>
              {defaultPromoCode && (
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput(defaultPromoCode);
                    setActiveCoupon(defaultPromoCode);
                    setActiveDiscountPercent(defaultDiscountPercent);
                    setCouponFeedback(`✓ ${defaultPromoCode} applied! Flat ${defaultDiscountPercent}% Discount`);
                  }}
                  className="text-[11px] text-[#C76B85] font-bold hover:underline cursor-pointer"
                >
                  Use {defaultPromoCode} ({defaultDiscountPercent}% OFF)
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder={defaultPromoCode ? `e.g. ${defaultPromoCode}` : "Enter promo code"}
                className="flex-1 px-3 py-2 bg-[#FFF7FA] border border-[#E8C6D1] rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-[#2E1A36] focus:outline-hidden focus:border-[#8064A2]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#C76B85] hover:bg-[#B35872] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Apply Coupon
              </button>
            </div>

            {couponFeedback && (
              <p className={`text-[11px] font-semibold ${couponFeedback.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>
                {couponFeedback}
              </p>
            )}
          </form>
        </div>

        {/* Duration Billing Toggle */}
        <div className="flex justify-center">
          <div className="flex items-center bg-white p-1.5 sm:p-2 rounded-2xl border border-[#E8C6D1] shadow-md text-xs sm:text-sm font-bold flex-wrap justify-center gap-1">
            {[
              { duration: 1, label: '1 Month', badge: 'Trial' },
              { duration: 3, label: '3 Months', badge: 'Starter' },
              { duration: 6, label: '6 Months', badge: 'Most Popular ⭐', highlight: true },
              { duration: 12, label: '12 Months', badge: 'Best Value' }
            ].map((d) => (
              <button
                key={d.duration}
                type="button"
                onClick={() => setSelectedDuration(d.duration)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer relative ${
                  selectedDuration === d.duration 
                    ? 'bg-[#C76B85] text-white shadow-xs font-extrabold' 
                    : 'text-[#5A4463] hover:text-[#C76B85] font-bold'
                }`}
              >
                <span>{d.label}</span>
                {d.highlight && activeDiscountPercent > 0 && (
                  <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase shadow-xs">
                    {activeDiscountPercent}% OFF
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${activePlans.length >= 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'} gap-5`}>
          {activePlans.length === 0 ? (
            <div className="col-span-full max-w-md mx-auto text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 space-y-3">
              <Crown className="w-12 h-12 text-[#8064A2] mx-auto opacity-50" />
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
                className={`bg-white rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between relative group hover:-translate-y-1.5 hover:shadow-xl cursor-pointer ${
                  isPopular
                    ? 'border-[#8064A2] shadow-md ring-2 ring-[#8064A2]/40'
                    : 'border-[#E8C6D1] shadow-xs'
                }`}
              >
                
                {/* Popular / Promo Pill */}
                {isPopular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#C76B85] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    Most Recommended
                  </div>
                ) : plan.badge ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#8064A2] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    {plan.badge}
                  </div>
                ) : null}

                <div className="space-y-3.5">
                  
                  {/* Plan Title & Tag */}
                  <div>
                    <h3 className="text-xl font-serif font-bold text-[#2E1A36] group-hover:text-[#C76B85] transition-colors">
                      {plan.name}
                    </h3>
                    <p className="text-[11px] text-[#5A4463] mt-0.5 leading-snug">
                      {plan.tagline || 'Comprehensive matchmaking package'}
                    </p>
                  </div>

                  {/* Pricing Box with Direct CTA Button */}
                  <div className="p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] group-hover:border-[#8064A2] transition-colors">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-serif font-extrabold text-[#2E1A36]">
                        ₹{pricing.discounted}
                      </span>
                      {pricing.original > 0 && pricing.original !== pricing.discounted && (
                        <span className="text-xs text-[#AA98A9] line-through">
                          ₹{pricing.original}
                        </span>
                      )}
                    </div>
                    {pricing.discounted > 0 ? (
                      <>
                        <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                          {pricing.discount ? `${pricing.discount} • ` : ''}₹{pricing.perMonth}/mo
                        </span>
                        <span className="text-[10px] text-[#AA98A9] block mt-0.5">
                          Valid for {selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'} • Incl. GST
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#5A4463] font-bold block mt-0.5">
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
                          ? 'bg-[#FFF7FA] hover:bg-[#C76B85] text-[#C76B85] hover:text-white border border-[#E8C6D1]'
                          : isPopular
                            ? 'bg-[#C76B85] hover:bg-[#B35872] text-white'
                            : pricing.discounted === 0
                              ? 'bg-[#F9EBF0] text-[#C76B85] hover:bg-[#f7ddd4]'
                              : 'bg-[#C76B85] text-white hover:bg-[#B35872]'
                      }`}
                    >
                      {!currentUser ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#8064A2]" />
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
                          <span className={`leading-tight text-[11px] ${isIncluded ? 'text-[#5A4463] font-medium' : 'text-[#AA98A9] line-through'}`}>
                            {featText}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Bottom Card Footer Action */}
                <div className="pt-4 mt-4 border-t border-[#E8C6D1]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm ${
                      !currentUser
                        ? 'bg-[#FDF2F6] hover:bg-[#F9EBF0] text-[#C76B85] border border-[#E8C6D1]'
                        : isPopular
                          ? 'bg-[#C76B85] hover:bg-[#B35872] text-white shadow-xs'
                          : 'bg-[#FDF2F6] text-[#C76B85] hover:bg-[#F9EBF0] border border-[#E8C6D1]'
                    }`}
                  >
                    {!currentUser ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-[#AA98A9]" />
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
      </div>

    </section>
  );
}
