import React from 'react';
import { 
  Crown, 
  X, 
  MessageCircle, 
  Phone, 
  Video, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Lock
} from 'lucide-react';

export default function PremiumUpgradePromptModal({
  isOpen,
  onClose,
  onOpenPlans,
  feature = 'chat', // 'chat' | 'call' | 'video'
  candidateName = 'Matches'
}) {
  if (!isOpen) return null;

  const featureLabels = {
    chat: {
      title: 'Direct 1-to-1 Matrimonial Chat',
      icon: MessageCircle,
      desc: 'Send unlimited instant messages, exchange family backgrounds, and connect directly with verified candidates.'
    },
    call: {
      title: 'Private Matrimonial Voice Calls',
      icon: Phone,
      desc: 'Speak directly with verified matches over a secure, number-protected matrimonial audio line.'
    },
    video: {
      title: 'Family Video Meetings',
      icon: Video,
      desc: 'Conduct face-to-face video meetings between families before taking the next steps in your matrimony journey.'
    }
  };

  const currentFeature = featureLabels[feature] || featureLabels.chat;
  const FeatureIcon = currentFeature.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-amber-200/80 animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Banner */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#DFB76C]/20 rounded-full blur-2xl pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] mx-auto flex items-center justify-center shadow-lg mb-3">
            <Crown className="w-7 h-7 fill-[#0B192C]" />
          </div>

          <div className="inline-flex items-center space-x-1 px-3 py-0.5 rounded-full bg-[#DFB76C]/20 border border-[#DFB76C]/40 text-[#DFB76C] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 fill-[#DFB76C]" />
            <span>Premium Member Exclusive</span>
          </div>

          <h3 className="font-serif font-bold text-xl text-white">
            Unlock {currentFeature.title}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Connect directly with {candidateName} and start meaningful family conversations.
          </p>
        </div>

        {/* Benefits List */}
        <div className="p-5 space-y-4 text-left">
          
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-slate-700 leading-relaxed flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-[#8C6D1F] shrink-0 mt-0.5">
              <FeatureIcon className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-slate-900 text-sm mb-0.5">{currentFeature.title}</strong>
              <p className="text-[11px] text-slate-600">{currentFeature.desc}</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">All Premium Plans Include:</p>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited 1-on-1 Chat with Verified Matches</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Private Matrimonial Audio Calling (Number Masked)</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Face-to-Face Family Video Meetings</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlocked Verified Contact Numbers & Native Addresses</span>
              </div>
            </div>
          </div>

          {/* Pricing Highlight Pill */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs text-slate-500 line-through">₹ 3,999</span>
              <span className="text-base font-extrabold text-[#0B192C]">From ₹ 1,999 only</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                50% OFF Limited Offer
              </span>
            </div>
            <p className="text-[10px] text-slate-500">GST Invoice & Instant Contact Unlocks included</p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPlans();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#B89228] text-[#0B192C] font-extrabold text-sm shadow-lg shadow-[#D4AF37]/30 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer btn-luxury-shimmer"
            >
              <span>View Membership Plans & Unlock Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
