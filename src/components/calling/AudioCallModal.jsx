import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Grid, 
  MapPin,
  X,
  Radio
} from 'lucide-react';
import { webrtcCallService } from '../../services/webrtcCallService';

export default function AudioCallModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  isCaller = true,
  callSession = null
}) {
  const [callStatus, setCallStatus] = useState(isCaller ? 'calling' : 'connected'); // 'calling' | 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [dialedDigits, setDialedDigits] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isConnectedPeer, setIsConnectedPeer] = useState(false);

  const timerRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Helper to safely play media with user-gesture unlock fallback
  const safePlayMedia = (mediaEl, label = 'media') => {
    if (!mediaEl) return;
    mediaEl.play()
      .then(() => {
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        console.warn(`[AudioCall] ${label} autoplay blocked by browser:`, err);
        setAutoplayBlocked(true);
        const unlockGesture = () => {
          if (mediaEl) {
            mediaEl.play()
              .then(() => setAutoplayBlocked(false))
              .catch(() => {});
          }
          window.removeEventListener('click', unlockGesture);
          window.removeEventListener('touchstart', unlockGesture);
        };
        window.addEventListener('click', unlockGesture, { once: true });
        window.addEventListener('touchstart', unlockGesture, { once: true });
      });
  };

  // Web Audio Tone generator
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
    } catch (e) {}
  };

  // Ringing Sound
  const startRingingSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const playRingBurst = () => {
        if (callStatus === 'connected' || callStatus === 'ended') return;
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
      const interval = setInterval(playRingBurst, 3200);
      ringIntervalRef.current = interval;
      return interval;
    } catch (e) {
      return null;
    }
  };

  // Connect chime
  const playConnectChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.50];
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

  // Mic analyser setup
  const setupMicAnalyser = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !stream) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

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
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      setHasMicPermission(true);
      setMicPermissionError(false);
    } catch (err) {
      console.warn('[AudioCall] Mic analyser warning:', err);
    }
  };

  // Explicit microphone permission request handler
  const handleRequestMicPermission = async () => {
    try {
      const stream = await webrtcCallService.requestMediaAccess('audio');
      if (stream) {
        setMicPermissionError(false);
        setupMicAnalyser(stream);
      }
    } catch (err) {
      console.warn('[AudioCall] Manual mic permission request notice:', err);
      setMicPermissionError(true);
    }
  };

  // WebRTC & Audio Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let ringTimer = null;
    let callTimeoutTimer = null;

    // Callback when remote audio stream is received
    const handleRemoteStream = (stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        safePlayMedia(remoteAudioRef.current, 'remoteAudio');
      }
      if (ringTimer) clearTimeout(ringTimer);
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      setIsConnectedPeer(true);
      setCallStatus('connected');
      playConnectChime();
    };

    // Callback for status change from WebRTC signaling
    const handleStatusChange = (status) => {
      if (!isSubscribed) return;
      if (status === 'blocked') {
        if (ringTimer) clearTimeout(ringTimer);
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
        setCallStatus('ended');
        playTone(380, 280, 0.3);
        setTimeout(() => onClose(), 1200);
      } else if (status === 'connected') {
        if (ringTimer) clearTimeout(ringTimer);
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
        setCallStatus('connected');
        setIsConnectedPeer(true);
        playConnectChime();
      } else if (status === 'declined' || status === 'ended') {
        if (ringTimer) clearTimeout(ringTimer);
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
        setCallStatus('ended');
        playTone(380, 280, 0.3);
        setTimeout(() => onClose(), 1200);
      }
    };

    // Initiate or Accept
    if (isCaller) {
      setCallStatus('calling');
      setCallDuration(0);
      setDialedDigits('');

      webrtcCallService.startCall({
        caller: currentUser,
        callee: candidate,
        callType: 'audio',
        onRemoteStream: handleRemoteStream,
        onStatusChange: handleStatusChange
      }).then((res) => {
        if (res && res.error === 'CALL_BLOCKED') {
          if (ringTimer) clearTimeout(ringTimer);
          if (ringIntervalRef.current) {
            clearInterval(ringIntervalRef.current);
            ringIntervalRef.current = null;
          }
          setCallStatus('ended');
          playTone(380, 280, 0.3);
          setTimeout(() => onClose(), 1200);
          return;
        }
        if (webrtcCallService.localStream) {
          setupMicAnalyser(webrtcCallService.localStream);
        }
        if (webrtcCallService.hardwareError === 'permission_denied') {
          setMicPermissionError(true);
        }
      });

      ringTimer = setTimeout(() => {
        if (isSubscribed) {
          setCallStatus((prev) => {
            if (prev === 'connected' || prev === 'ended') return prev;
            startRingingSound();
            return 'ringing';
          });
        }
      }, 1200);

      // Awaiting recipient answer timeout (45s)
      callTimeoutTimer = setTimeout(() => {
        if (isSubscribed) {
          setCallStatus((prev) => {
            if (prev === 'connected' || prev === 'ended') return prev;
            if (ringIntervalRef.current) {
              clearInterval(ringIntervalRef.current);
              ringIntervalRef.current = null;
            }
            playTone(380, 280, 0.3);
            setTimeout(() => onClose(), 1200);
            return 'ended';
          });
        }
      }, 45000);

    } else {
      // Receiver answering incoming call
      setCallStatus('connected');
      setCallDuration(0);

      webrtcCallService.acceptCall({
        callData: callSession,
        currentUser,
        onRemoteStream: handleRemoteStream,
        onStatusChange: handleStatusChange
      }).then(() => {
        if (webrtcCallService.localStream) {
          setupMicAnalyser(webrtcCallService.localStream);
        }
        if (webrtcCallService.hardwareError === 'permission_denied') {
          setMicPermissionError(true);
        }
        playConnectChime();
      });
    }

    return () => {
      isSubscribed = false;
      clearTimeout(ringTimer);
      clearTimeout(callTimeoutTimer);
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      webrtcCallService.cleanup();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [isOpen, isCaller]);

  // Duration Timer
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

  // Safety check to ensure remote audio stays attached and playing when connected
  useEffect(() => {
    if (callStatus === 'connected' && webrtcCallService.remoteStream && remoteAudioRef.current) {
      if (!remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.srcObject = webrtcCallService.remoteStream;
      }
      safePlayMedia(remoteAudioRef.current, 'remoteAudio');
    }
  }, [callStatus]);

  if (!isOpen || !candidate) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    webrtcCallService.toggleAudio(!nextMute);
  };

  const handleKeypadPress = (digit) => {
    setDialedDigits(prev => (prev + digit).slice(-12));
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
    playTone(400, 300, 0.2);
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    webrtcCallService.endCall();
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div 
      className="fixed inset-0 z-50 w-full h-[100dvh] bg-gradient-to-b from-[#060D17] via-[#0B192C] to-[#040911] text-white overflow-hidden select-none flex flex-col items-center justify-between animate-in fade-in"
      style={{
        height: '100dvh',
        width: '100%',
        maxHeight: '100dvh',
        maxWidth: '100vw',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hidden WebRTC Remote Audio Output */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Ambient Top Glow */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#D4AF37]/15 to-transparent pointer-events-none" />
      <div className="absolute top-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Inner Responsive Column */}
      <div className="w-full max-w-md h-full flex flex-col items-center justify-between relative z-10">

        {/* Top Header Status */}
        <div className="text-center space-y-1 relative z-10 w-full shrink-0 pt-2 sm:pt-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              {candidate.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center gap-1 mt-0.5">
              <span>{candidate.age} yrs • {candidate.profession || 'Professional'}</span>
            </p>
            {(candidate.district || candidate.city) && (
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span>{candidate.district || candidate.city}, {candidate.state || 'India'}</span>
              </p>
            )}
          </div>

          {/* Call Status / Timer */}
          <div className="pt-2">
            {callStatus === 'calling' && (
              <span className="text-xs sm:text-sm text-[#DFB76C] font-semibold animate-pulse">
                Calling...
              </span>
            )}
            {callStatus === 'ringing' && (
              <span className="text-xs sm:text-sm text-emerald-400 font-semibold animate-pulse">
                Ringing...
              </span>
            )}
            {callStatus === 'connected' && (
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center space-x-2 text-sm font-mono font-bold text-emerald-400 bg-emerald-950/70 px-3.5 py-1 rounded-full border border-emerald-500/40 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
              </div>
            )}
            {callStatus === 'ended' && (
              <span className="text-xs sm:text-sm text-rose-400 font-bold">
                Call Ended ({formatDuration(callDuration)})
              </span>
            )}
          </div>

          {/* Autoplay blocked banner */}
          {autoplayBlocked && (
            <button
              type="button"
              onClick={() => {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.play()
                    .then(() => setAutoplayBlocked(false))
                    .catch(() => {});
                }
              }}
              className="w-full mt-2 py-1.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center justify-center space-x-2 animate-bounce cursor-pointer shadow-lg"
            >
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Audio paused by browser • Tap to unmute</span>
            </button>
          )}

          {/* Microphone permission alert with direct user-gesture Allow button */}
          {micPermissionError && (
            <div className="w-full mt-2 py-2 px-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
              <span className="truncate">Microphone access needed</span>
              <button
                type="button"
                onClick={handleRequestMicPermission}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all active:scale-95 shadow"
              >
                Allow Mic
              </button>
            </div>
          )}
        </div>

        {/* Center: Pulsing Profile Avatar or Keypad View */}
        {isKeypadOpen ? (
          <div className="my-auto py-2 w-full max-w-xs bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl z-20 animate-in zoom-in-95 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold">Touch Tones (DTMF)</span>
              <button 
                type="button"
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
          <div className="relative my-auto py-3 sm:py-6 flex items-center justify-center shrink-0">
            {callStatus === 'connected' && (
              <>
                <div 
                  className="absolute rounded-full border border-emerald-500/30 pointer-events-none transition-all duration-100" 
                  style={{
                    width: `${120 + (audioLevel * 1.0)}px`,
                    height: `${120 + (audioLevel * 1.0)}px`,
                    opacity: 0.3 + (audioLevel / 150)
                  }}
                />
                <div 
                  className="absolute rounded-full border border-[#D4AF37]/30 pointer-events-none transition-all duration-150" 
                  style={{
                    width: `${150 + (audioLevel * 1.4)}px`,
                    height: `${150 + (audioLevel * 1.4)}px`,
                    opacity: 0.2 + (audioLevel / 200)
                  }}
                />
                <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-emerald-400/20 animate-ping pointer-events-none" />
              </>
            )}

            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-[#D4AF37] shadow-2xl">
              <img 
                src={candidate.photo || candidate.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'} 
                alt={candidate.name} 
                className="w-full h-full object-cover"
              />
              {candidate.verified && (
                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-[#0B192C] shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Interactive Controls */}
        <div className="w-full space-y-4 sm:space-y-5 relative z-10 shrink-0 pb-3 sm:pb-1">
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

          {/* End Call Button */}
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
        </div>

      </div>
    </div>
  );
}
