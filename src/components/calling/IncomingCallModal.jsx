import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, Lock, MapPin } from 'lucide-react';

export default function IncomingCallModal({
  incomingCall,
  onAccept,
  onDecline
}) {
  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Play pleasant incoming ringtone using Web Audio API
  useEffect(() => {
    if (!incomingCall) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const playRingSequence = () => {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
          if (ctx.state === 'suspended') ctx.resume();

          // Two-tone British/US style ring: 440Hz + 480Hz
          const tones = [
            { f1: 440, f2: 480, start: 0, dur: 0.9 },
            { f1: 440, f2: 480, start: 1.2, dur: 0.9 }
          ];

          tones.forEach(({ f1, f2, start, dur }) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.frequency.value = f1;
            osc2.frequency.value = f2;

            const t = ctx.currentTime + start;
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.linearRampToValueAtTime(0.08, t + dur - 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + dur);
            osc2.stop(t + dur);
          });
        };

        playRingSequence();
        ringIntervalRef.current = setInterval(playRingSequence, 3800);
      }
    } catch (e) {
      console.warn('[IncomingCall] Audio ringtone notice:', e);
    }

    // Auto decline if not answered within 45 seconds
    const autoDeclineTimer = setTimeout(() => {
      if (onDecline && incomingCall) {
        onDecline(incomingCall, 'timeout');
      }
    }, 45000);

    return () => {
      clearTimeout(autoDeclineTimer);
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const { caller, callType = 'audio' } = incomingCall;
  const isVideo = callType === 'video';

  const stopAudio = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
  };

  const handleAcceptClick = () => {
    stopAudio();
    if (onAccept) onAccept(incomingCall);
  };

  const handleDeclineClick = () => {
    stopAudio();
    if (onDecline) onDecline(incomingCall, 'declined');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in select-none">
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#0B192C] via-[#060D17] to-[#040911] text-white rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D4AF37] flex flex-col items-center justify-between p-6 sm:p-8 min-h-[520px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#D4AF37]/20 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Top Header */}
        <div className="text-center space-y-2 relative z-10 w-full">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-lg animate-bounce">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Incoming {isVideo ? 'Live Video Call' : 'Live Voice Call'}</span>
          </div>

          <div className="pt-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              {caller?.name || 'Candidate'}
            </h2>
            {caller?.profession && (
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {caller.profession}
              </p>
            )}
            {caller?.city && (
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#DFB76C]" />
                <span>{caller.city}</span>
              </p>
            )}
          </div>

          <p className="text-xs text-[#DFB76C] font-semibold pt-1">
            {isVideo ? '📹 Incoming Live Video Meeting invitation...' : '📞 Incoming Live Audio Call invitation...'}
          </p>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-48 h-48 rounded-full border-2 border-emerald-500/40 animate-ping pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full border border-[#D4AF37]/50 animate-pulse pointer-events-none" />
          
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-[#D4AF37] shadow-2xl">
            <img 
              src={caller?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'} 
              alt={caller?.name || 'Caller'} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-[#0B192C]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Bottom Accept / Decline Actions */}
        <div className="w-full space-y-6 relative z-10">
          <div className="flex items-center justify-around px-4">
            
            {/* Decline Button */}
            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={handleDeclineClick}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-900/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-4 ring-rose-500/30"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-rose-300 font-semibold">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={handleAcceptClick}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-900/60 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-4 ring-emerald-400/40 animate-pulse"
                title="Accept Call"
              >
                {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </button>
              <span className="text-xs text-emerald-300 font-semibold">Accept</span>
            </div>

          </div>

          <p className="text-[10px] text-center text-slate-400 leading-relaxed">
            🔒 Protected under I 4 You Privacy Protocol • End-to-End Encrypted WebRTC
          </p>
        </div>

      </div>
    </div>
  );
}
