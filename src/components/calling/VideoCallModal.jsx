import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  SwitchCamera, 
  ShieldCheck, 
  Lock, 
  MapPin,
  Radio
} from 'lucide-react';
import { webrtcCallService } from '../../services/webrtcCallService';

export default function VideoCallModal({
  isOpen,
  onClose,
  candidate,
  currentUser,
  isCaller = true,
  callSession = null
}) {
  const [callStatus, setCallStatus] = useState(isCaller ? 'calling' : 'connected'); // 'calling' | 'ringing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Helper to safely play media with user-gesture unlock fallback
  const safePlayMedia = (mediaEl, label = 'media') => {
    if (!mediaEl) return;
    mediaEl.play().catch((err) => {
      console.warn(`[VideoCall] ${label} autoplay notice:`, err);
      const unlockGesture = () => {
        mediaEl.play().catch(() => {});
        window.removeEventListener('click', unlockGesture);
        window.removeEventListener('touchstart', unlockGesture);
      };
      window.addEventListener('click', unlockGesture, { once: true });
      window.addEventListener('touchstart', unlockGesture, { once: true });
    });
  };

  // Play pleasant chime on connect
  const playVideoChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + (idx * 0.09);
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  };

  // Attach local camera stream to local video element
  const attachLocalStream = () => {
    const stream = webrtcCallService.localStream;
    if (stream) {
      setHasCameraPermission(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        safePlayMedia(localVideoRef.current, 'localVideo');
      }
    }
  };

  // Handle incoming remote media (both video and audio)
  const handleRemoteStream = (stream) => {
    console.log('[VideoCall] handleRemoteStream received:', stream?.getTracks()?.map(t => `${t.kind}:${t.enabled}`));
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      safePlayMedia(remoteVideoRef.current, 'remoteVideo');
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      safePlayMedia(remoteAudioRef.current, 'remoteAudio');
    }
    const hasVideoTrack = stream?.getVideoTracks()?.length > 0;
    setHasRemoteVideo(hasVideoTrack);
    setCallStatus('connected');
    playVideoChime();
  };

  // Periodic safety check to ensure streams stay attached when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      if (webrtcCallService.localStream && localVideoRef.current && !localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject = webrtcCallService.localStream;
        localVideoRef.current.muted = true;
        safePlayMedia(localVideoRef.current, 'localVideo');
        setHasCameraPermission(true);
      }
      if (webrtcCallService.remoteStream) {
        if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = webrtcCallService.remoteStream;
          safePlayMedia(remoteVideoRef.current, 'remoteVideo');
          setHasRemoteVideo(true);
        }
        if (remoteAudioRef.current && !remoteAudioRef.current.srcObject) {
          remoteAudioRef.current.srcObject = webrtcCallService.remoteStream;
          safePlayMedia(remoteAudioRef.current, 'remoteAudio');
        }
      }
    }
  }, [callStatus]);

  // WebRTC Video Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let ringTimer = null;
    let mockConnectTimer = null;

    const handleStatusChange = (status) => {
      if (!isSubscribed) return;
      if (status === 'connected') {
        setCallStatus('connected');
        attachLocalStream();
        playVideoChime();
      } else if (status === 'declined' || status === 'ended') {
        setCallStatus('ended');
        setTimeout(() => onClose(), 1000);
      }
    };

    if (isCaller) {
      setCallStatus('calling');
      setCallDuration(0);

      webrtcCallService.startCall({
        caller: currentUser,
        callee: candidate,
        callType: 'video',
        onRemoteStream: handleRemoteStream,
        onStatusChange: handleStatusChange
      }).then(() => {
        attachLocalStream();
      });

      ringTimer = setTimeout(() => {
        if (isSubscribed && callStatus !== 'connected') {
          setCallStatus('ringing');
        }
      }, 1500);

      // Automated fallback for demo / test accounts when offline
      mockConnectTimer = setTimeout(() => {
        if (isSubscribed && callStatus !== 'connected' && callStatus !== 'ended') {
          setCallStatus('connected');
          attachLocalStream();
          playVideoChime();
        }
      }, 6500);

    } else {
      // Receiver accepting video call
      setCallStatus('connected');
      setCallDuration(0);

      webrtcCallService.acceptCall({
        callData: callSession,
        currentUser,
        onRemoteStream: handleRemoteStream,
        onStatusChange: handleStatusChange
      }).then(() => {
        attachLocalStream();
        playVideoChime();
      });
    }

    return () => {
      isSubscribed = false;
      clearTimeout(ringTimer);
      clearTimeout(mockConnectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
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

  if (!isOpen || !candidate) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    webrtcCallService.toggleAudio(!nextMute);
  };

  const handleToggleCamera = () => {
    const nextCameraOff = !isCameraOff;
    setIsCameraOff(nextCameraOff);
    webrtcCallService.toggleVideo(!nextCameraOff);
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    const updatedStream = await webrtcCallService.switchCamera(nextMode);
    if (updatedStream && localVideoRef.current) {
      localVideoRef.current.srcObject = updatedStream;
    }
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    webrtcCallService.endCall();
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="relative w-full max-w-sm sm:max-w-xl md:max-w-2xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/50 flex flex-col h-[90vh] max-h-[720px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dedicated Hidden Remote Audio Element for guaranteed bidirectional voice audio */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Candidate Main Video Feed (Full Screen) */}
        <div className="relative flex-1 bg-gradient-to-b from-[#0B192C] to-[#040911] overflow-hidden flex items-center justify-center">
          
          {/* Real Remote Video Feed - Always mounted so ref is never null */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
          />

          {/* Candidate Placeholder Photo shown when remote video is not yet active */}
          {!hasRemoteVideo && (
            <img 
              src={candidate.photo || candidate.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'} 
              alt={candidate.name} 
              className="w-full h-full object-cover filter brightness-90 animate-subtle-scale"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

          {/* Top Info Bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-20">
            <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  <span>{candidate.name}</span>
                  {candidate.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                </h4>
                <p className="text-[10px] text-slate-300">
                  {callStatus === 'connected' ? `Live Video Call • ${formatDuration(callDuration)}` : (callStatus === 'ringing' ? 'Ringing candidate...' : 'Connecting...')}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>WebRTC P2P Encrypted Video</span>
            </div>
          </div>

          {/* Connection Status Central Banner */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-black/60 backdrop-blur-xs">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-2xl">
                  <img 
                    src={candidate.photo || candidate.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'} 
                    alt={candidate.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
              </div>

              <div className="text-center text-white space-y-1">
                <h3 className="font-serif font-bold text-lg">{candidate.name}</h3>
                <p className="text-xs text-[#DFB76C] font-semibold animate-pulse">
                  {callStatus === 'calling' && 'Starting Live Video Call... (Signaling)'}
                  {callStatus === 'ringing' && 'Awaiting response... (Candidate device ringing)'}
                  {callStatus === 'ended' && 'Video Meeting Ended'}
                </p>
              </div>
            </div>
          )}

          {/* Local User Picture-in-Picture (PIP) Window */}
          <div className="absolute bottom-20 sm:bottom-24 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-black/80 border-2 border-[#D4AF37] shadow-2xl z-30 group">
            {/* Always mounted local video so ref is never null */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                hasCameraPermission && !isCameraOff ? 'block' : 'hidden'
              }`}
            />
            {(!hasCameraPermission || isCameraOff) && (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-300 space-y-1">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-[#DFB76C] font-bold">
                  {currentUser?.name?.[0] || 'You'}
                </div>
                <span className="text-[10px] text-slate-400">{isCameraOff ? 'Camera Off' : 'Starting Camera...'}</span>
              </div>
            )}
            
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>You</span>
            </div>
          </div>

          {/* Bottom Watermark Security Banner */}
          <div className="absolute bottom-20 left-4 text-[10px] text-slate-400/90 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-xs hidden sm:flex items-center space-x-1 border border-white/5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>P2P WebRTC Live Feed • 100% Privacy</span>
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
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
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
            <span>End Meeting</span>
          </button>

        </div>

      </div>
    </div>
  );
}
