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
  Smile
} from 'lucide-react';

const POPULAR_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹'];

export default function SendInterestModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  onSendInterest,
  isAlreadyInterested = false
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white p-4 sm:p-5 relative shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs text-[#DFB76C] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 fill-[#DFB76C]" />
            <span>Express Interest</span>
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

        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4 text-left">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-[#8C6D1F]" />
                <span>Your Message</span>
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
              rows={5}
              placeholder="Type your personal message here..."
              className="w-full p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#DFB76C]/20 shadow-inner leading-relaxed transition-all resize-none"
            />

            {/* Quick Emoji Bar */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 pl-1.5 pr-2 border-r border-slate-300/80 shrink-0 select-none">
                <Smile className="w-3.5 h-3.5 text-[#8C6D1F]" />
                <span>Emojis:</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddEmoji(emoji)}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-white hover:shadow-xs active:scale-90 transition-all cursor-pointer hover:border hover:border-amber-200 select-none"
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Type what you'd like to share with {candidate.name} and their family.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 flex items-start space-x-2.5 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Lock className="w-3 h-3 text-[#8C6D1F]" />
            </div>
            <p className="leading-relaxed text-slate-600">
              <strong className="text-[#0B192C] font-semibold">100% Privacy Protected:</strong> Your phone number is never shared without consent. This message will be sent directly to {candidate.name}.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!message.trim()}
              className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] via-45% to-[#D4AF37] hover:from-[#dfb76c] hover:via-[#faebd7] hover:to-[#b89228] text-[#0B192C] font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4AF37]/50"
            >
              <Heart className="w-4 h-4 fill-[#0B192C]" />
              <span>{isAlreadyInterested ? 'Update Message' : 'Send Interest'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
