import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Grid, 
  User, 
  MapPin,
  Clock
} from 'lucide-react';

export default function AudioCallModal({
  isOpen,
  onClose,
  candidate,
  currentUser
}) {
  const [callStatus, setCallStatus] = useState('calling'); // 'calling' | 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Call connection lifecycle simulation
  useEffect(() => {
    if (!isOpen || !candidate) {
      setCallStatus('calling');
      setCallDuration(0);
      return;
    }

    setCallStatus('calling');
    setCallDuration(0);

    // After 1.2s -> ringing
    const ringingTimer = setTimeout(() => {
      setCallStatus('ringing');
    }, 1200);

    // After 3.5s -> connected
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 3500);

    return () => {
      clearTimeout(ringingTimer);
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, candidate]);

  // Duration timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  if (!isOpen || !candidate) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#060D17] via-[#0B192C] to-[#040911] text-white rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 flex flex-col items-center justify-between p-6 sm:p-8 min-h-[540px] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#D4AF37]/15 to-transparent pointer-events-none" />
        <div className="absolute top-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Status */}
        <div className="text-center space-y-1 relative z-10">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Encrypted Matrimonial Voice Line</span>
          </div>

          <div className="pt-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
              {candidate.name}
            </h2>
            <p className="text-xs text-slate-300 flex items-center justify-center gap-1 mt-0.5">
              <span>{candidate.age} yrs • {candidate.profession || 'Professional'}</span>
            </p>
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-[#DFB76C]" />
              <span>{candidate.district || candidate.city}, {candidate.state}</span>
            </p>
          </div>

          {/* Call Status / Timer */}
          <div className="pt-3">
            {callStatus === 'calling' && (
              <span className="text-xs text-[#DFB76C] font-semibold animate-pulse">
                Securing audio line...
              </span>
            )}
            {callStatus === 'ringing' && (
              <span className="text-xs text-emerald-400 font-semibold animate-pulse">
                Ringing candidate device...
              </span>
            )}
            {callStatus === 'connected' && (
              <div className="inline-flex items-center space-x-2 text-sm font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            )}
            {callStatus === 'ended' && (
              <span className="text-xs text-rose-400 font-bold">
                Call Ended • {formatDuration(callDuration)}
              </span>
            )}
          </div>
        </div>

        {/* Center: Pulsing Profile Avatar */}
        <div className="relative my-8 flex items-center justify-center">
          {/* Animated sound wave aura rings */}
          {callStatus === 'connected' && (
            <>
              <div className="absolute w-44 h-44 rounded-full border border-emerald-500/25 animate-ping pointer-events-none" />
              <div className="absolute w-56 h-56 rounded-full border border-[#D4AF37]/20 animate-pulse pointer-events-none" />
            </>
          )}

          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-[#D4AF37] shadow-2xl">
            <img 
              src={candidate.photo} 
              alt={candidate.name} 
              className="w-full h-full object-cover"
            />
            {candidate.verified && (
              <div className="absolute bottom-2 right-2 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-[#0B192C] shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Interactive Controls */}
        <div className="w-full space-y-6 relative z-10">
          
          {/* Middle In-Call Action Toggles */}
          <div className="flex items-center justify-center space-x-6 sm:space-x-8">
            {/* Mute Button */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-md flex flex-col items-center ${
                isMuted 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 ring-2 ring-rose-500/30' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[10px] mt-1 font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* Speakerphone Button */}
            <button
              type="button"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-md flex flex-col items-center ${
                isSpeakerOn 
                  ? 'bg-[#DFB76C]/20 text-[#DFB76C] border-[#D4AF37]/60 ring-2 ring-[#DFB76C]/30' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/20'
              }`}
              title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-[10px] mt-1 font-medium">{isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
            </button>

            {/* Keypad Toggle Button */}
            <button
              type="button"
              onClick={() => setIsKeypadOpen(!isKeypadOpen)}
              className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-md flex flex-col items-center ${
                isKeypadOpen 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/60' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/20'
              }`}
              title="Keypad"
            >
              <Grid className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">Keypad</span>
            </button>
          </div>

          {/* Red End Call Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-900/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-4 ring-rose-500/30"
              title="End Voice Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>

          {/* Privacy Disclaimer */}
          <p className="text-[10px] text-center text-slate-400 max-w-xs mx-auto">
            Your personal mobile number is masked and protected under I 4 You Privacy Protocol.
          </p>

        </div>

      </div>
    </div>
  );
}
