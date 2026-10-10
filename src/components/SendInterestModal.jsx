import React, { useState } from 'react';
import { 
  Heart, 
  Send, 
  X, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Languages, 
  MessageCircle,
  Clock,
  MapPin,
  Smile
} from 'lucide-react';

export const AUTHENTIC_INTEREST_TEMPLATES = [
  {
    id: 'family_values',
    category: 'കുടുംബ മൂല്യങ്ങൾ / Family Values',
    titleEn: 'Traditional & Family Alignment',
    titleMl: 'കുടുംബ പാരമ്പര്യവും സംസ്കാരവും',
    textEn: 'Namaste! My family and I have reviewed your profile and find our values and background to be very well aligned. We would be honored to connect and take things forward.',
    textMl: 'നമസ്കാരം! ഞങ്ങളുടെ കുടുംബം താങ്കളുടെ പ്രൊഫൈൽ കാണുകയും നമ്മുടെ മൂല്യങ്ങളും കുടുംബ പശ്ചാത്തലവും യോജിക്കുന്നതായി കാണുകയും ചെയ്തു. കൂടുതൽ സംസാരിക്കാൻ താല്പര്യപ്പെടുന്നു.'
  },
  {
    id: 'career_goals',
    category: 'വിദ്യാഭ്യാസവും കരിയറും / Career & Education',
    titleEn: 'Career & Mutual Life Goals',
    titleMl: 'വിദ്യാഭ്യാസവും കരിയർ കാഴ്ചപ്പാടും',
    textEn: 'Hello! I came across your profile and was very impressed by your educational background and career achievements. I feel we share similar life goals and would love to get to know you better.',
    textMl: 'നമസ്കാരം! നിങ്ങളുടെ വിദ്യാഭ്യാസവും കരിയറും വളരെ അഭിനന്ദനാർഹമാണ്. നമ്മുടെ ജീവിത കാഴ്ചപ്പാടുകൾ ഒരുപോലെയാണെന്ന് തോന്നുന്നു. സൗഹൃദപരമായി സംസാരിക്കാൻ ആഗ്രഹിക്കുന്നു.'
  },
  {
    id: 'horoscope_match',
    category: 'ജാതക പൊരുത്തം / Horoscope Compatibility',
    titleEn: 'Horoscope & Astrological Alignment',
    titleMl: 'ജാതകവും നക്ഷത്ര പൊരുത്തവും',
    textEn: 'Namaste! Our elders looked at your horoscope and family details, and our Gunas and astrological charts match auspiciously. We would be delighted to exchange horoscopes and arrange a friendly conversation.',
    textMl: 'നമസ്കാരം! ഞങ്ങളുടെ മുതിർന്നവർ ജാതകവും വിവരങ്ങളും നോക്കി, വളരെ നല്ല പൊരുത്തം കാണുന്നുണ്ട്. കുടുംബങ്ങൾ തമ്മിൽ സംസാരിച്ച് മുന്നോട്ട് പോകാൻ താല്പര്യപ്പെടുന്നു.'
  },
  {
    id: 'warm_connect',
    category: 'സൗഹൃദപരമായ താല്പര്യം / Friendly Connect',
    titleEn: 'Warm & Respectful Connection',
    titleMl: 'ഊഷ്മളമായ സൗഹൃദ സംഭാഷണം',
    textEn: 'Hi! I really liked your profile, passions, and outlook on life. If you feel there is a good match, I would be glad to connect for a respectful conversation.',
    textMl: 'ഹലോ! നിങ്ങളുടെ പ്രൊഫൈലും ചിന്താഗതികളും എനിക്ക് വളരെ ഇഷ്ടമായി. പരസ്പരം സംസാരിച്ച് അറിയാൻ താല്പര്യമുണ്ടെങ്കിൽ ദയവായി മറുപടി നൽകുക.'
  }
];

export default function SendInterestModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  onSendInterest,
  isAlreadyInterested = false
}) {
  const [lang, setLang] = useState('ml'); // 'ml' | 'en'
  const [selectedTemplateId, setSelectedTemplateId] = useState('family_values');
  const [customMessage, setCustomMessage] = useState(AUTHENTIC_INTEREST_TEMPLATES[0].textMl);

  if (!isOpen || !candidate) return null;

  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setCustomMessage(lang === 'ml' ? template.textMl : template.textEn);
  };

  const handleToggleLang = (newLang) => {
    setLang(newLang);
    const tmpl = AUTHENTIC_INTEREST_TEMPLATES.find(t => t.id === selectedTemplateId) || AUTHENTIC_INTEREST_TEMPLATES[0];
    setCustomMessage(newLang === 'ml' ? tmpl.textMl : tmpl.textEn);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalMessage = customMessage.trim() || (lang === 'ml' ? AUTHENTIC_INTEREST_TEMPLATES[0].textMl : AUTHENTIC_INTEREST_TEMPLATES[0].textEn);
    onSendInterest(candidate.id, finalMessage);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white p-4 sm:p-5 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs text-[#DFB76C] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 fill-[#DFB76C]" />
            <span>Express Matrimonial Interest</span>
          </div>

          <h3 className="font-serif font-bold text-lg sm:text-xl text-white">
            Send Interest to {candidate.name}
          </h3>

          {/* Candidate Mini Card */}
          <div className="mt-3 bg-white/10 border border-white/15 rounded-2xl p-2.5 flex items-center space-x-3 backdrop-blur-md">
            <div className="relative shrink-0">
              <img 
                src={candidate.photo} 
                alt={candidate.name} 
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-[#DFB76C]"
              />
              {candidate.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-1 ring-white">
                  <ShieldCheck className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center space-x-1.5">
                <p className="font-bold text-sm text-white truncate">{candidate.name}</p>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-[#DFB76C] border border-[#DFB76C]/30 font-bold shrink-0">
                  {candidate.matchScore || 90}% Match
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {candidate.age} Yrs, {candidate.height} • {candidate.profession || 'Professional'}
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-2.5 h-2.5 text-[#DFB76C]" />
                <span>{candidate.district || candidate.city}, {candidate.state}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-left flex-1">
          
          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <Languages className="w-4 h-4 text-[#8C6D1F]" />
              <span>Select Interest Template / താല്പര്യ സന്ദേശം:</span>
            </div>
            
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleToggleLang('ml')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === 'ml' 
                    ? 'bg-gradient-to-r from-[#0B192C] to-[#152E52] text-[#DFB76C] shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                മലയാളം
              </button>
              <button
                type="button"
                onClick={() => handleToggleLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  lang === 'en' 
                    ? 'bg-gradient-to-r from-[#0B192C] to-[#152E52] text-[#DFB76C] shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Template Choice Cards */}
          <div className="grid grid-cols-1 gap-2">
            {AUTHENTIC_INTEREST_TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left space-y-1 ${
                    isSelected
                      ? 'bg-amber-50/70 border-[#D4AF37] ring-2 ring-[#DFB76C]/30 shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B192C] flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#D4AF37]' : 'bg-slate-300'}`} />
                      <span>{lang === 'ml' ? tmpl.titleMl : tmpl.titleEn}</span>
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-200/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Selected</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-3.5">
                    "{lang === 'ml' ? tmpl.textMl : tmpl.textEn}"
                  </p>
                </div>
              );
            })}
          </div>

          {/* Editable Custom Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <MessageCircle className="w-3.5 h-3.5 text-[#8C6D1F]" />
                <span>Personalize Your Message / സന്ദേശം തിരുത്താം:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">{customMessage.length} characters</span>
            </div>
            
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              placeholder="Write your respectful personal note..."
              className="w-full p-3 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/25 shadow-inner leading-relaxed transition-all"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Your phone number remains protected until contact details are unlocked. This message is delivered instantly to the candidate's account and email.
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!customMessage.trim()}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#B89228] text-[#0B192C] font-extrabold text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Heart className="w-4 h-4 fill-[#0B192C]" />
            <span>{isAlreadyInterested ? 'Update Interest Message' : 'Send Express Interest 💖'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
