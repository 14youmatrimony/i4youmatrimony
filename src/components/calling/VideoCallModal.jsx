import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  SwitchCamera, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Maximize2, 
  Minimize2,
  MapPin,
  Clock
} from 'lucide-react';

export default function VideoCallModal({
  isOpen,
  onClose,
  candidate,
  currentUser
}) {
  const [callStatus, setCallStatus] = useState('calling'); // 'calling' | 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize WebRTC User Media Camera
  useEffect(() => {
    if (!isOpen) return;

    let currentStream = null;

    async function initCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: true
          });
          currentStream = stream;
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('[VideoCall] Camera permission or device access notice:', err);
        setHasCameraPermission(false);
      }
    }

    initCamera();

    // Call Connection Lifecycle
    setCallStatus('calling');
    setCallDuration(0);

    const ringingTimer = setTimeout(() => {
      setCallStatus('ringing');
    }, 1500);

    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 3800);

    return () => {
      clearTimeout(ringingTimer);
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

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

  if (!isOpen || !candidate) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMicMuted;
      });
    }
    setIsMicMuted(!isMicMuted);
  };

  const handleToggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isCameraOff;
      });
    }
    setIsCameraOff(!isCameraOff);
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-sm sm:max-w-xl md:max-w-2xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/50 flex flex-col h-[90vh] max-h-[720px] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Candidate Main Video Feed (Full Screen) */}
        <div className="relative flex-1 bg-gradient-to-b from-[#0B192C] to-[#040911] overflow-hidden flex items-center justify-center">
          
          {/* Candidate High-Resolution Visual Feed */}
          <img 
            src={candidate.photo} 
            alt={candidate.name} 
            className="w-full h-full object-cover filter brightness-90 animate-subtle-scale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

          {/* Top Info Bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-20">
            <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>{candidate.name}</span>
                  {candidate.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                </h4>
                <p className="text-[10px] text-slate-300">
                  {callStatus === 'connected' ? `Live • ${formatDuration(callDuration)}` : (callStatus === 'ringing' ? 'Ringing candidate...' : 'Connecting...')}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">256-Bit Encrypted Video</span>
              <span className="sm:hidden">Encrypted</span>
            </div>
          </div>

          {/* Connection Status Central Banner */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-black/40 backdrop-blur-xs">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-2xl">
                  <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
              </div>

              <div className="text-center text-white space-y-1">
                <h3 className="font-serif font-bold text-lg">{candidate.name}</h3>
                <p className="text-xs text-[#DFB76C] font-semibold animate-pulse">
                  {callStatus === 'calling' && 'Initiating Private Video Line...'}
                  {callStatus === 'ringing' && 'Candidate Phone Ringing...'}
                  {callStatus === 'ended' && 'Call Ended'}
                </p>
              </div>
            </div>
          )}

          {/* Local User Picture-in-Picture (PIP) Window */}
          <div className="absolute bottom-20 sm:bottom-24 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-[#D4AF37] shadow-2xl z-30 group">
            {hasCameraPermission && !isCameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-300 space-y-1">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-[#DFB76C] font-bold">
                  {currentUser?.name?.[0] || 'You'}
                </div>
                <span className="text-[10px] text-slate-400">{isCameraOff ? 'Camera Off' : 'Connecting'}</span>
              </div>
            )}
            
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-xs">
              You
            </div>
          </div>

          {/* Bottom Watermark Security Banner */}
          <div className="absolute bottom-20 left-4 text-[10px] text-slate-400/80 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-xs hidden sm:flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Protected Matrimonial Video Meet • Recording Restricted</span>
          </div>

        </div>

        {/* Bottom Control Bar */}
        <div className="bg-[#060D17] border-t border-slate-800 p-3 sm:p-4 shrink-0 flex items-center justify-center space-x-3 sm:space-x-5 z-20">
          
          {/* Mute Mic */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center space-x-1.5 ${
              isMicMuted 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 ring-2 ring-rose-500/30' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            title={isMicMuted ? 'Unmute' : 'Mute'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On / Off */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center space-x-1.5 ${
              isCameraOff 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 ring-2 ring-rose-500/30' 
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Flip Camera */}
          <button
            type="button"
            onClick={handleFlipCamera}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-md"
            title="Flip Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-rose-900/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-2 ring-rose-500/40"
            title="End Video Meeting"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>

        </div>

      </div>
    </div>
  );
}
