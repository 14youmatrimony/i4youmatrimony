import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Crown, 
  Tag, 
  Clock, 
  ArrowRight, 
  Lock, 
  Phone, 
  FileText 
} from 'lucide-react';
import { 
  MEMBERSHIP_PLANS, 
  VALID_COUPONS 
} from '../../data/plansData';

export default function MobileOffersAndPlansSheet({
  isOpen,
  onClose,
  isWebsiteModal = false,
  currentUser,
  onSelectPlanForPayment,
  onViewInvoices,
  plans = MEMBERSHIP_PLANS,
  offers = []
}) {
  const [selectedDuration, setSelectedDuration] = useState(6); // 1 | 3 | 6 | 12

  // Derive dynamic featured offer from Python Admin Database
  const featuredOffer = (offers && offers.length > 0)
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1' || o.is_active === undefined) || offers[0])
    : null;
  const defaultPromoCode = featuredOffer?.code || '';
  const defaultDiscountPercent = featuredOffer ? (Number(featuredOffer.discount_percent) || 0) : 0;
  const defaultOfferTitle = featuredOffer?.title || '';
  const defaultOfferDesc = featuredOffer?.description || '';

  const [activeCoupon, setActiveCoupon] = useState(defaultPromoCode);
  const [couponInput, setCouponInput] = useState(defaultPromoCode);
  const [couponFeedback, setCouponFeedback] = useState(
    defaultPromoCode ? `Coupon ${defaultPromoCode} applied! Flat ${defaultDiscountPercent}% Discount active` : ''
  );

  // Update coupon when live offers update from backend
  useEffect(() => {
    if (featuredOffer?.code) {
      setActiveCoupon(featuredOffer.code);
      setCouponInput(featuredOffer.code);
      setCouponFeedback(`Coupon ${featuredOffer.code} applied! Flat ${defaultDiscountPercent}% Discount active`);
    } else {
      setActiveCoupon('');
      setCouponInput('');
      setCouponFeedback('');
    }
  }, [featuredOffer?.code, defaultDiscountPercent]);

  const planList = Array.isArray(plans) ? plans : MEMBERSHIP_PLANS;
  const availablePlans = planList
    .filter(p => p.id !== 'free' && p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  const recommendedPlan = availablePlans.find(p => p.isPopular) || availablePlans.find(p => p.id === 'diamond') || availablePlans[0];
  
  // Festive countdown timer state (2 hours 45 minutes)
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

  const handleApplyCoupon = (e) => {
    e?.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setActiveCoupon('');
      setCouponFeedback('');
      return;
    }

    // 1. Check live admin backend offers first
    const liveMatched = offers.find(o => o.code?.toUpperCase() === code && (o.is_active === undefined || o.is_active === 1 || o.is_active === true));
    if (liveMatched) {
      setActiveCoupon(liveMatched.code);
      setCouponFeedback(`✓ ${liveMatched.code} applied successfully! (Flat ${liveMatched.discount_percent}% Discount)`);
      return;
    }

    // 2. Check static fallback coupons
    if (VALID_COUPONS[code]) {
      setActiveCoupon(code);
      setCouponFeedback(`✓ ${code} applied successfully! (${VALID_COUPONS[code].description})`);
      return;
    }

    setCouponFeedback(`❌ Invalid code.${defaultPromoCode ? ` Try ${defaultPromoCode}` : ''}`);
  };

  if (!isOpen) return null;

  const sheetContent = (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
      
      {/* Top Header Bar */}
      <header className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white px-3.5 py-2.5 sm:py-3 flex items-center justify-between border-b border-[#D4AF37]/30 shadow-md shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center font-bold shrink-0">
            <Crown className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <span>{featuredOffer ? 'Matrimony Plans & Special Offers' : 'Matrimony Membership Plans'}</span>
              {featuredOffer && (
                <span className="text-[9px] font-sans font-extrabold px-1.5 py-0.2 rounded-full bg-rose-600 text-white animate-pulse">
                  {defaultDiscountPercent}% OFF
                </span>
              )}
            </h2>
            <p className="text-[9.5px] text-slate-300 truncate">
              Upgrade to connect directly with brides, grooms & families
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Close"
          title="Close"
        >
          <X className="w-5 h-5 text-[#DFB76C]" />
        </button>
      </header>

      {/* Scrollable Offers Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 sm:space-y-3.5 pb-6">

        {/* ── Festive Shubh Vivah Hero Promo Banner (Only if featuredOffer active) ── */}
        {featuredOffer && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#1E3A8A] to-[#0B192C] border border-[#D4AF37]/60 text-white p-3.5 shadow-md">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#DFB76C]/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>{defaultOfferTitle}</span>
              </span>

              {/* Countdown Clock */}
              <div className="flex items-center space-x-1 font-mono text-[10px] sm:text-[11px] font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-lg border border-amber-300/30">
                <Clock className="w-3 h-3 text-[#DFB76C]" />
                <span>Ends in: {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>

            <div className="mt-2.5 space-y-0.5">
              <h3 className="font-serif font-extrabold text-sm sm:text-base text-white leading-tight">
                Flat {defaultDiscountPercent}% OFF + Bonus Contact Unlocks
              </h3>
              <p className="text-[11px] text-slate-200 leading-snug">
                {defaultOfferDesc}
              </p>
            </div>

            {/* Applied Coupon Pill */}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span className="text-[10.5px] text-slate-300 font-medium">Coupon:</span>
                <span className="font-mono font-bold text-[11px] text-[#DFB76C] bg-white/10 px-1.5 py-0.2 rounded border border-[#D4AF37]/40">
                  {activeCoupon || defaultPromoCode}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetPlan = recommendedPlan || availablePlans[0];
                  if (targetPlan) onSelectPlanForPayment(targetPlan, selectedDuration, activeCoupon);
                }}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-[11px] hover:opacity-95 shadow-sm flex items-center space-x-1 cursor-pointer"
              >
                <span>Claim Offer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Active Membership Status Banner ── */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#8C6D1F] border border-amber-200 flex items-center justify-center font-bold shrink-0">
              {currentUser?.membership === 'vip' ? '👑' : currentUser?.membership === 'diamond' ? '💎' : currentUser?.membership === 'gold' ? '⭐' : '👤'}
            </div>
            <div>
              <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">Current Status</span>
              <h4 className="font-bold text-slate-900 text-[11.5px]">
                {currentUser?.membershipPlan || (currentUser?.membership ? `${currentUser.membership.toUpperCase()} Member` : 'Free Basic Member')}
              </h4>
              <p className="text-[9.5px] text-slate-500">
                Contact Unlocks: <strong className="text-[#8C6D1F] font-bold">
                  {currentUser?.membership && currentUser?.membership !== 'free'
                    ? (currentUser?.contactCredits === 999 ? 'Unlimited' : `${currentUser?.contactCredits ?? 0} remaining`)
                    : '0 (Subscription Required)'}
                </strong>
              </p>
            </div>
          </div>

          {onViewInvoices && currentUser?.paymentHistory?.length > 0 && (
            <button
              type="button"
              onClick={onViewInvoices}
              className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[10.5px] font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3 h-3 text-[#8C6D1F]" />
              <span>Invoices ({currentUser.paymentHistory.length})</span>
            </button>
          )}
        </div>

        {/* ── Duration Switcher ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Select Plan Validity:</span>
            <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
              Save up to 55%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-center">
            {[
              { months: 1, label: '1 Month', badge: 'Trial' },
              { months: 3, label: '3 Months', badge: 'Starter' },
              { months: 6, label: '6 Months', badge: 'Popular ⭐' },
              { months: 12, label: '12 Months', badge: 'Best Value' }
            ].map(d => (
              <button
                key={d.months}
                type="button"
                onClick={() => setSelectedDuration(d.months)}
                className={`py-1.5 px-0.5 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                  selectedDuration === d.months
                    ? 'bg-[#0B192C] text-[#DFB76C] shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{d.label}</span>
                <span className={`text-[9px] leading-none mt-0.5 ${selectedDuration === d.months ? 'text-amber-200 font-extrabold' : 'text-slate-500 font-medium'}`}>
                  {d.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Membership Plan Cards ── */}
        <div className="space-y-2.5">
          {availablePlans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Crown className="w-10 h-10 text-amber-500 mx-auto opacity-40" />
              <h4 className="font-bold text-slate-800 text-sm">No Active Plans Available</h4>
              <p className="text-xs text-slate-500">Please check back soon or contact support for personalized assistance.</p>
            </div>
          ) : (
            availablePlans.map(plan => {
              const pricing = (plan.pricing && plan.pricing[selectedDuration]) || (plan.pricing && plan.pricing[6]) || {
                originalPrice: 1999,
                offerPrice: 999,
                perMonth: 333,
                discount: '50% OFF'
              };

            return (
              <div 
                key={plan.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-2xs hover:shadow-xs relative ${
                  plan.isPopular 
                    ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' 
                    : plan.accentBorder || 'border-slate-200'
                }`}
              >
                {/* Popular / Best Value Ribbon */}
                {plan.badge && (
                  <div className={`py-0.5 px-2.5 text-center text-[9.5px] font-extrabold tracking-wider uppercase ${
                    plan.id === 'diamond' || plan.isPopular
                      ? 'bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C]'
                      : plan.id === 'silver'
                        ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                        : 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="p-3 sm:p-3.5 space-y-2">
                  
                  {/* Card Title & Pricing */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-base sm:text-lg">
                          {plan.id === 'vip' ? '👑' : plan.id === 'diamond' ? '💎' : plan.id === 'silver' ? '🥈' : '⭐'}
                        </span>
                        <h4 className="font-serif font-extrabold text-sm sm:text-base text-[#0B192C]">{plan.name}</h4>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">{plan.tagline}</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline space-x-1 justify-end">
                        <span className="text-[10px] text-slate-400 line-through">₹{(pricing?.originalPrice || 0).toLocaleString('en-IN')}</span>
                        <span className="font-serif font-black text-base sm:text-lg text-[#0B192C]">₹{(pricing?.offerPrice || pricing?.discountedPrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <span className="inline-block text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        ₹{pricing?.perMonth || Math.round((pricing?.offerPrice || 1999) / (selectedDuration || 6))}/mo ({pricing?.discount || '50% OFF'})
                      </span>
                    </div>
                  </div>

                  {/* Highlights Banner */}
                  <div className="bg-amber-50/70 rounded-lg p-2 border border-amber-200/70 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#8C6D1F] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#8C6D1F]" />
                      <span>{plan.contactCredits === 999 ? 'Unlimited' : (plan.contactCredits || pricing?.contacts || 30)} Verified Contact Unlocks</span>
                    </span>
                    <span className="text-[9.5px] font-semibold text-slate-500">
                      {selectedDuration} {selectedDuration === 1 ? 'Month' : 'Months'}
                    </span>
                  </div>

                  {/* Dedicated Advisor Highlight if applicable */}
                  {(plan.hasAdvisor || plan.has_advisor) && (
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-300 text-amber-900 text-[10.5px] font-bold">
                      <span className="flex items-center gap-1.5">
                        <span>🤵</span> Dedicated Relationship Manager
                      </span>
                      <span className="text-[9px] uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">VIP</span>
                    </div>
                  )}

                  {/* Privileges & Quota Chips */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                      💌 {plan.dailyInterests || plan.daily_interests || 'Unlimited'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium truncate max-w-[150px]">
                      🔮 {plan.kundaliReports || plan.kundali_reports || 'Kundali Milan'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      ⚡ {plan.searchBoost || plan.search_boost || '1x'}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-1 pt-0.5">
                    {plan.features?.slice(0, 3).map((f, i) => {
                      const featText = typeof f === 'object' ? f.text : f;
                      return (
                        <div key={i} className="flex items-center space-x-1.5 text-[10.5px] text-slate-700">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{featText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Select Plan Button */}
                  <button
                    type="button"
                    onClick={() => onSelectPlanForPayment(plan, selectedDuration, activeCoupon)}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-2xs ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] hover:opacity-95'
                        : 'bg-[#0B192C] text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>Choose {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>
            );
          }))}
        </div>

        {/* ── Coupon Code Bar ── */}
        <form onSubmit={handleApplyCoupon} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#8C6D1F]" /> Have a Promo Code?
            </span>
            {defaultPromoCode ? (
              <span className="text-[9.5px] text-[#8C6D1F] font-bold">Try: {defaultPromoCode}</span>
            ) : null}
          </div>

          <div className="flex items-center space-x-1.5">
            <input 
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder={defaultPromoCode ? `e.g. ${defaultPromoCode}` : "Enter promo code"}
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-wider uppercase focus:outline-hidden focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#0B192C] text-[#DFB76C] rounded-lg font-bold text-xs hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>

          {couponFeedback && (
            <p className="text-[9.5px] text-emerald-700 font-medium">{couponFeedback}</p>
          )}
        </form>

        {/* ── Trust & Security Credentials ── */}
        <div className="p-2.5 bg-gradient-to-r from-amber-50/80 to-slate-100 rounded-xl border border-amber-200/80 text-center space-y-1">
          <div className="flex items-center justify-center space-x-2 text-[10.5px] font-bold text-slate-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Aadhaar Verified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#8C6D1F]" />
              256-Bit Bank Encryption
            </span>
          </div>
          <p className="text-[9.5px] text-slate-500 leading-snug">
            Protected under Indian consumer guidelines. Includes 7-day money-back guarantee & GST invoice.
          </p>
        </div>

      </div>

      {/* Fixed Bottom Action Dock */}
      <footer className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 shadow-lg">
        <div>
          <span className="text-[9.5px] text-slate-400 font-semibold block">Recommended Plan</span>
          <span className="font-serif font-extrabold text-xs sm:text-sm text-[#0B192C]">
            {recommendedPlan ? `${recommendedPlan.name} • ₹${(recommendedPlan.pricing && recommendedPlan.pricing[selectedDuration]?.offerPrice) || (recommendedPlan.pricing && recommendedPlan.pricing[6]?.offerPrice) || 2499}` : 'Diamond VIP • ₹2,499'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const targetPlan = recommendedPlan || availablePlans[0];
            if (targetPlan) onSelectPlanForPayment(targetPlan, selectedDuration, activeCoupon);
          }}
          className="py-2 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] font-extrabold text-xs shadow-md shadow-[#D4AF37]/30 hover:opacity-95 transition-all flex items-center space-x-1 cursor-pointer"
        >
          <span>Upgrade Now (50% OFF)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </footer>

    </div>
  );

  if (isWebsiteModal) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg md:max-w-xl max-h-[88vh] h-full sm:h-auto bg-slate-50 rounded-2xl shadow-2xl border border-[#D4AF37]/35 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {sheetContent}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {sheetContent}
    </div>
  );
}
