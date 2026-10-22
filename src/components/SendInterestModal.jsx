import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Send, 
  CheckCheck, 
  Zap, 
  MessageSquare
} from 'lucide-react';

const ESSENTIAL_TEMPLATES = [
  {
    id: 'family',
    label: 'Family & Values',
    text: 'Namaste! I reviewed your profile and our family values align wonderfully. Would love to connect.'
  },
  {
    id: 'interest',
    label: 'Mutual Interest',
    text: 'Hi! I found your profile very interesting and would love to take this proposal forward.'
  }
];

export default function SendInterestModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  onSendInterest,
  onAcceptInterest,
  isAlreadyInterested = false,
  isIncomingInterest = false,
  isWebsiteModal = false
}) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const maxLength = 500;

  // Resolve whether interest was already sent by currentUser to candidate
  const isSent = useMemo(() => {
    if (isAlreadyInterested) return true;
    if (!currentUser || !candidate) return false;
    try {
      const sentList = JSON.parse(
        localStorage.getItem(`i4u_interests_sent_${currentUser.id}`) ||
        localStorage.getItem('i4u_interests_sent') ||
        '[]'
      );
      const candIds = [candidate.id, candidate.registerId, candidate.register_id].filter(Boolean).map(String);
      if (Array.isArray(candIds) && Array.isArray(sentList) && candIds.some(id => sentList.includes(id))) return true;

      const records = JSON.parse(localStorage.getItem('i4u_interests_records') || '[]');
      const userIds = [currentUser.id, currentUser.registerId, currentUser.register_id].filter(Boolean).map(String);
      return Array.isArray(records) && records.some(r =>
        r &&
        userIds.includes(String(r.senderId)) &&
        candIds.includes(String(r.receiverId))
      );
    } catch {
      return false;
    }
  }, [isAlreadyInterested, currentUser, candidate]);

  // Resolve whether there is an incoming interest from candidate to currentUser
  const isIncoming = useMemo(() => {
    if (isIncomingInterest) return true;
    if (!currentUser || !candidate) return false;
    try {
      const recList = JSON.parse(
        localStorage.getItem(`i4u_received_interests_${currentUser.id}`) || '[]'
      );
      const candIds = [candidate.id, candidate.registerId, candidate.register_id].filter(Boolean).map(String);
      if (Array.isArray(candIds) && Array.isArray(recList) && candIds.some(id => recList.includes(id))) return true;

      const records = JSON.parse(localStorage.getItem('i4u_interests_records') || '[]');
      const userIds = [currentUser.id, currentUser.registerId, currentUser.register_id].filter(Boolean).map(String);
      return Array.isArray(records) && records.some(r =>
        r &&
        candIds.includes(String(r.senderId)) &&
        userIds.includes(String(r.receiverId)) &&
        r.status !== 'accepted'
      );
    } catch {
      return false;
    }
  }, [isIncomingInterest, currentUser, candidate]);

  // Auto-focus textarea on open (when in compose mode)
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      if (!isSent && !isIncoming) {
        const timer = setTimeout(() => {
          textareaRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isSent, isIncoming]);

  if (!isOpen || !candidate) return null;

  const handleSend = (e) => {
    e?.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) return;
    if (onSendInterest) {
      onSendInterest(candidate.id, cleanMsg);
    }
    onClose();
  };

  const handleAccept = (e) => {
    e?.preventDefault();
    const cleanMsg = message.trim();
    if (onAcceptInterest) {
      onAcceptInterest(candidate.id, cleanMsg);
    } else if (onSendInterest) {
      onSendInterest(candidate.id, cleanMsg || 'Accepted your interest');
    }
    onClose();
  };

  const handleSelectTemplate = (text) => {
    setMessage(text);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
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
        <div className="flex-1 min-h-[40px]" onClick={onClose} />
      )}

      <div 
        className={isWebsiteModal
          ? "bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col"
          : "bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-full sm:max-w-md mx-auto shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 flex flex-col overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle (Mobile) */}
        {!isWebsiteModal && (
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>
        )}

        {/* Minimal Header Bar (All bulky headings and match card removed) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 text-sm">
              {isIncoming ? 'Incoming Interest' : isSent ? 'Interest Status' : 'Instant Message'}
            </span>
            {candidate?.name && (
              <span className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
                • {candidate.name}
              </span>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATE 1: Already Sent State (Sender View) */}
        {isSent && (
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Interest Sent</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                You have already expressed interest in {candidate.name || 'this member'}.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: Delivered & Received</span>
            </div>
            <div className="pt-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: Received Interest State (Receiver View) */}
        {!isSent && isIncoming && (
          <form onSubmit={handleAccept} className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <p className="font-medium">
                <strong className="text-slate-800">{candidate.name || 'This member'}</strong> has sent you an interest.
              </p>
            </div>

            {/* Simple message input bar alongside Accept button (templates hidden) */}
            <div className="flex items-center gap-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                placeholder="Add a reply note (optional)..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Accept</span>
              </button>
            </div>
          </form>
        )}

        {/* STATE 3: Default Compose State (Initial Sender View) */}
        {!isSent && !isIncoming && (
          <form onSubmit={handleSend} className="p-4 space-y-3">
            {/* Reduced 1-Tap Templates: Exactly 2 Essential Options */}
            <div>
              <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Quick Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ESSENTIAL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.text)}
                    className="p-2 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/70 hover:border-[#D4AF37] text-[11px] transition-all cursor-pointer active:scale-98"
                  >
                    <div className="font-bold text-[10.5px] text-slate-800">{tmpl.label}</div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{tmpl.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700 flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>Message</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {message.length} / {maxLength}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                rows={3}
                placeholder="Type your personal message here..."
                className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/20 transition-all resize-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-1 flex items-center justify-end gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-[#0B192C] font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#D4AF37]/40"
              >
                <Zap className="w-3.5 h-3.5 fill-[#0B192C]" />
                <span>Send Instant Message</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
