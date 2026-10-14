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
  Clock,
  X
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
  const [dialedDigits, setDialedDigits] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for mic visualization
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const ringOscillatorsRef = useRef([]);

  // Helper: Play DTMF tone or chime using Web Audio API
  const playTone = (freq1, freq2, duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freq1;
      osc2.frequency.value = freq2;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + duration);
      osc2.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Play ringing burst
  const startRingingSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const playRingBurst = () => {
        if (callStatus !== 'ringing') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.4);
        osc2.stop(ctx.currentTime + 1.4);
      };

      playRingBurst();
      const ringInterval = setInterval(() => {
        if (callStatus === 'ringing') {
          playRingBurst();
        } else {
          clearInterval(ringInterval);
        }
      }, 3000);
      return ringInterval;
    } catch (e) {
      return null;
    }
  };

  // Play connection celebration chime
  const playConnectChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + (idx * 0.08);
        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (e) {}
  };

  // Setup Microphone & Audio Analysis for Live Calling
  useEffect(() => {
    if (!isOpen) return;

    let localStream = null;
    let ringIntervalId = null;

    async function initMicrophone() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStream = stream;
          streamRef.current = stream;
          setHasMicPermission(true);

          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            updateMeter();
          }
        }
      } catch (err) {
        console.warn('[AudioCall] Live microphone access notice:', err);
        setHasMicPermission(false);
      }
    }

    initMicrophone();

    // Call Connection Lifecycle
    setCallStatus('calling');
    setCallDuration(0);
    setDialedDigits('');

    // After 1.2s -> ringing
    const ringingTimer = setTimeout(() => {
      setCallStatus('ringing');
      ringIntervalId = startRingingSound();
    }, 1200);

    // After 3.5s -> connected
    const connectTimer = setTimeout(() => {
      if (ringIntervalId) clearInterval(ringIntervalId);
      setCallStatus('connected');
      playConnectChime();
    }, 3800);

    return () => {
      clearTimeout(ringingTimer);
      clearTimeout(connectTimer);
      if (ringIntervalId) clearInterval(ringIntervalId);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [isOpen]);

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

  const handleToggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle: if currently muted, enable track
      });
    }
    setIsMuted(!isMuted);
  };

  const handleKeypadPress = (digit) => {
    setDialedDigits(prev => (prev + digit).slice(-12));
    // DTMF tone frequencies
    const dtmf = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
    };
    if (dtmf[digit]) {
      playTone(dtmf[digit][0], dtmf[digit][1], 0.12);
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    playTone(400, 300, 0.2); // Hangup tone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#060D17] via-[#0B192C] to-[#040911] text-white rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/50 flex flex-col items-center justify-between p-6 sm:p-8 min-h-[560px] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#D4AF37]/15 to-transparent pointer-events-none" />
        <div className="absolute top-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Status */}
        <div className="text-center space-y-1 relative z-10 w-full">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>ലൈവ് Call • 256-Bit Encrypted Audio Line</span>
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

          {/* Call Status / Timer / Malayalam Badge */}
          <div className="pt-3">
            {callStatus === 'calling' && (
              <span className="text-xs text-[#DFB76C] font-semibold animate-pulse">
                കണക്ട് ചെയ്യുന്നു... (Securing audio line)
              </span>
            )}
            {callStatus === 'ringing' && (
              <span className="text-xs text-emerald-400 font-semibold animate-pulse">
                റിംഗ് ചെയ്യുന്നു... (Ringing candidate device)
              </span>
            )}
            {callStatus === 'connected' && (
              <div className="flex flex-col items-center space-y-1">
                <div className="inline-flex items-center space-x-2 text-sm font-mono font-bold text-emerald-400 bg-emerald-950/70 px-3.5 py-1 rounded-full border border-emerald-500/40 shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ലൈവ് Call: {formatDuration(callDuration)}</span>
                </div>
                {hasMicPermission && !isMuted && (
                  <div className="flex items-center space-x-1 text-[10px] text-emerald-300/80">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <span>Live Mic Active</span>
                    <div className="flex items-center gap-0.5 ml-1">
                      <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                )}
              </div>
            )}
            {callStatus === 'ended' && (
              <span className="text-xs text-rose-400 font-bold">
                കോൾ അവസാനിച്ചു • Call Ended ({formatDuration(callDuration)})
              </span>
            )}
          </div>
        </div>

        {/* Center: Pulsing Profile Avatar or Keypad View */}
        {isKeypadOpen ? (
          <div className="my-3 w-full max-w-xs bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl z-20 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold">Touch Tones (DTMF)</span>
              <button 
                onClick={() => setIsKeypadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-7 bg-slate-950 rounded-lg px-2 flex items-center justify-end font-mono text-sm text-[#DFB76C] mb-3">
              {dialedDigits || <span className="text-slate-600 text-xs">Press keys below</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/15 active:bg-[#D4AF37]/30 text-white font-bold text-sm border border-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative my-6 flex items-center justify-center">
            {/* Animated sound wave aura rings driven by real mic audio level */}
            {callStatus === 'connected' && (
              <>
                <div 
                  className="absolute rounded-full border border-emerald-500/30 pointer-events-none transition-all duration-100" 
                  style={{
                    width: `${140 + (audioLevel * 1.2)}px`,
                    height: `${140 + (audioLevel * 1.2)}px`,
                    opacity: 0.3 + (audioLevel / 150)
                  }}
                />
                <div 
                  className="absolute rounded-full border border-[#D4AF37]/30 pointer-events-none transition-all duration-150" 
                  style={{
                    width: `${180 + (audioLevel * 1.8)}px`,
                    height: `${180 + (audioLevel * 1.8)}px`,
                    opacity: 0.2 + (audioLevel / 200)
                  }}
                />
                <div className="absolute w-56 h-56 rounded-full border border-emerald-400/20 animate-ping pointer-events-none" />
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
        )}

        {/* Bottom Interactive Controls */}
        <div className="w-full space-y-5 relative z-10">
          
          {/* In-Call Action Toggles */}
          <div className="flex items-center justify-center space-x-6 sm:space-x-8">
            {/* Mute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-3.5 rounded-full border transition-all cursor-pointer shadow-md flex flex-col items-center ${
                isMuted 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 ring-2 ring-rose-500/30' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
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
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/60 ring-2 ring-blue-500/30' 
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
          <p className="text-[10px] text-center text-slate-400 max-w-xs mx-auto leading-relaxed">
            🔒 Protected under I 4 You Privacy Protocol. Personal mobile number is masked.
          </p>

        </div>

      </div>
    </div>
  );
}
