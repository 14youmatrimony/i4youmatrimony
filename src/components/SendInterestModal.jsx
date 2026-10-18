import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Send, 
  X, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare, 
  Lock, 
  MapPin, 
  Smile, 
  Zap, 
  CheckCheck 
} from 'lucide-react';

const POPULAR_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹'];

const INSTANT_TEMPLATES = [
  {
    lang: 'English',
    label: 'Family Match',
    text: 'Namaste! I reviewed your profile and our family values align wonderfully. Would love to connect.'
  },
  {
    lang: 'English',
    label: 'Horoscope & Values',
    text: 'Hello, our horoscope, background, and cultural values match well. Looking forward to connecting.'
  },
  {
    lang: 'English',
    label: 'Mutual Interest',
    text: 'Hi! I found your profile very interesting and would love to take this proposal forward.'
  },
  {
    lang: 'English',
    label: 'Connect Call',
    text: 'Hello! Our family is keen on this proposal. Let us schedule a friendly voice or video call.'
  }
];

export default function SendInterestModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  onSendInterest,
  isAlreadyInterested = false,
  isWebsiteModal = false
}) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const maxLength = 500;

  // Auto-focus textarea on open
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !candidate) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) return;
    onSendInterest(candidate.id, cleanMsg);
    onClose();
  };

  const handleSelectTemplate = (text) => {
    setMessage(text);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleAddEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      if (message.length + emoji.length <= maxLength) {
        setMessage((prev) => prev + emoji);
      }
      return;
    }

    const start = textarea.selectionStart ?? message.length;
    const end = textarea.selectionEnd ?? message.length;
    const newText = message.slice(0, start) + emoji + message.slice(end);

    if (newText.length <= maxLength) {
      setMessage(newText);
      setTimeout(() => {
        textarea.focus();
        const nextPos = start + emoji.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 10);
    }
  };

  return (
    <div 
      className={isWebsiteModal 
        ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        : "absolute inset-0 z-[70] bg-black/75 backdrop-blur-xs flex flex-col justify-end w-full max-w-full overflow-hidden animate-in fade-in duration-200"
      }
      onClick={onClose}
    >
      {/* Background touch dismiss area for mobile bottom sheet */}
      {!isWebsiteModal && (
        <div className="flex-1 min-h-[30px]" onClick={onClose} />
      )}

      <div 
        className={isWebsiteModal
          ? "bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
          : "bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-full sm:max-w-md mx-auto shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[92%] sm:max-h-[86%] overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white px-4 py-3 sm:p-4 relative shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Pull handle indicator for mobile sheet */}
          {!isWebsiteModal && (
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2 shrink-0" />
          )}

          <div className="flex items-center space-x-1.5 text-[11px] text-[#DFB76C] font-bold uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5 fill-[#DFB76C] text-[#DFB76C]" />
            <span>Live Instant Message • Express Interest</span>
          </div>

          <h3 className="font-serif font-bold text-base sm:text-lg text-white truncate pr-8">
            Instant Message to {candidate.name}
          </h3>

          {/* Candidate Mini Card */}
          <div className="mt-2.5 bg-white/10 border border-white/15 rounded-2xl p-2 sm:p-2.5 flex items-center space-x-2.5 backdrop-blur-md">
            <div className="relative shrink-0">
              <img 
                src={candidate.photo} 
                alt={candidate.name} 
                className="w-11 h-11 rounded-xl object-cover ring-1 ring-[#DFB76C]"
              />
              {candidate.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-1 ring-white">
                  <ShieldCheck className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center space-x-1.5">
                <p className="font-bold text-xs sm:text-sm text-white truncate">{candidate.name}</p>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-400/20 text-[#DFB76C] border border-[#DFB76C]/30 font-bold shrink-0">
                  {candidate.matchScore || 90}% Match
                </span>
              </div>
              <p className="text-[10.5px] text-slate-300 truncate">
                {candidate.age} Yrs, {candidate.height} • {candidate.profession || 'Professional'}
              </p>
              <p className="text-[9.5px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-2.5 h-2.5 text-[#DFB76C] shrink-0" />
                <span className="truncate">{candidate.district || candidate.city}, {candidate.state}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden text-left">
          
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-2.5 min-h-0">
            
            {/* Quick 1-Tap Instant Message Presets */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold text-slate-700 flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>1-Tap Instant Templates:</span>
                </label>
                <span className="text-[10px] text-slate-400">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {INSTANT_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.text)}
                    className="p-2 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/70 hover:border-[#D4AF37] text-[11px] transition-all cursor-pointer active:scale-98 group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between font-bold text-[10px] text-[#0B192C] group-hover:text-[#8C6D1F]">
                      <span className="truncate">{tmpl.label}</span>
                      <span className="text-[8.5px] text-slate-400 shrink-0 ml-1">{tmpl.lang}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">{tmpl.text}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#8C6D1F]" />
                <span>Your Live Message</span>
              </label>
              <span className={`text-[10px] font-semibold ${
                message.length >= maxLength ? 'text-rose-500 font-bold' : 'text-slate-400'
              }`}>
                {message.length} / {maxLength}
              </span>
            </div>
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
              rows={3}
              placeholder="Type your personal message here or tap an instant template above..."
              className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-50 border-2 border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-3 focus:ring-[#DFB76C]/20 shadow-inner leading-relaxed transition-all resize-none min-h-[70px]"
            />

            {/* Quick Emoji Bar */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500 pl-1 pr-1.5 border-r border-slate-300/80 shrink-0 select-none">
                <Smile className="w-3.5 h-3.5 text-[#8C6D1F]" />
                <span>Emojis:</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddEmoji(emoji)}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-white hover:shadow-xs active:scale-90 transition-all cursor-pointer hover:border hover:border-amber-200 select-none shrink-0"
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Note */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[10.5px] text-amber-950 flex items-start space-x-2 shadow-2xs">
              <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Lock className="w-2.5 h-2.5 text-[#8C6D1F]" />
              </div>
              <p className="leading-snug text-slate-600 text-[10.5px]">
                <strong className="text-[#0B192C] font-semibold">100% Instant Delivery:</strong> This message will appear directly in {candidate.name}'s chat inbox and dispatch an instant notification.
              </p>
            </div>
          </div>

          {/* Sticky Pinned Footer Actions */}
          <div className="p-3 sm:px-4 sm:py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!message.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] via-45% to-[#D4AF37] hover:from-[#dfb76c] hover:via-[#faebd7] hover:to-[#b89228] text-[#0B192C] font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4AF37]/50"
            >
              <Zap className="w-3.5 h-3.5 fill-[#0B192C] text-[#0B192C]" />
              <span className="truncate">⚡ Send Live Instant Message</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
