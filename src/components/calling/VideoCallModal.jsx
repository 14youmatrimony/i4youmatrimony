import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { webrtcCallService, AudioRoutingHelper, Helper, RTCVideoRenderer } from '../../services/webrtcCallService';

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [cameraNotice, setCameraNotice] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  // Renderers instantiated via RTCVideoRenderer
  const localRendererRef = useRef(new RTCVideoRenderer('localVideo'));
  const remoteRendererRef = useRef(new RTCVideoRenderer('remoteVideo'));
  const remoteStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Helper to safely play media with user-gesture unlock fallback
  const safePlayMedia = (mediaEl, label = 'media') => {
    if (!mediaEl) return;
    mediaEl
      .play()
      .then(() => setAutoplayBlocked(false))
      .catch((err) => {
        console.warn(`[VideoCall] ${label} autoplay blocked:`, err?.message);
        setAutoplayBlocked(true);
        const unlockGesture = () => {
          if (mediaEl) {
            mediaEl
              .play()
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
        const startTime = ctx.currentTime + idx * 0.09;
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  };

  // Attach local stream to localRenderer and local video DOM element
  const attachLocalStream = (customStream = null) => {
    const stream = customStream || webrtcCallService.localStream;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });

      setLocalStream(stream);
      setHasCameraPermission(true);

      // Set srcObject on localRenderer
      localRendererRef.current.srcObject = stream;
      webrtcCallService.localRenderer.srcObject = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        safePlayMedia(localVideoRef.current, 'localVideo');
      }
    }
  };

  // Manual camera permission re-prompt handler
  const handleRequestCameraPermission = async () => {
    try {
      const stream = await webrtcCallService.requestMediaAccess('video', facingMode);
      if (stream) {
        attachLocalStream(stream);
        setCameraNotice(null);
      }
    } catch (err) {
      console.warn('[VideoCall] Manual camera request notice:', err?.message);
    }
  };

  // Handle incoming remote media (both video and audio)
  const handleRemoteStream = (stream) => {
    if (!stream) return;
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }

    if (typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        track.enabled = true;
        const existing = remoteStreamRef.current.getTracks().find((t) => t.id === track.id);
        if (!existing) {
          remoteStreamRef.current.addTrack(track);
        }
      });
    }

    const activeStream = remoteStreamRef.current;
    setRemoteStream(activeStream);

    const checkTracks = () => {
      const vTracks = activeStream.getVideoTracks().filter((t) => t.readyState === 'live');
      if (vTracks.length > 0) {
        setHasRemoteVideo(true);
      }
    };

    activeStream.onaddtrack = checkTracks;
    activeStream.onremovetrack = checkTracks;
    checkTracks();

    // Assign to remoteRenderer.srcObject
    if (remoteRendererRef.current) {
      remoteRendererRef.current.srcObject = activeStream;
    }
    if (webrtcCallService.remoteRenderer) {
      webrtcCallService.remoteRenderer.srcObject = activeStream;
    }

    // Attach to video element for rendering remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = activeStream;
      remoteVideoRef.current.play().catch(() => {});
    }

    // Dedicated audio element for clean, direct incoming voice routed to speakerphone
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = activeStream;
      remoteAudioRef.current.muted = false;
      AudioRoutingHelper.setSpeakerphoneOn(true, remoteAudioRef.current);
      remoteAudioRef.current.play().catch(() => {});
    }

    setCallStatus('connected');
    playVideoChime();
  };

  // Lifecycle & WebRTC session
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let callTimeoutTimer = null;

    const setupCall = async () => {
      // Reset any prior media element sources before starting or accepting
      remoteStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

      // 1. Initialize localRenderer and remoteRenderer BEFORE setting srcObject
      await localRendererRef.current.initialize();
      await remoteRendererRef.current.initialize();

      // Attach elements to renderers
      if (localVideoRef.current) {
        localRendererRef.current.attachElement(localVideoRef.current, { muted: true, mirror: facingMode === 'user' });
        webrtcCallService.localRenderer.attachElement(localVideoRef.current, { muted: true, mirror: facingMode === 'user' });
      }
      if (remoteVideoRef.current) {
        remoteRendererRef.current.attachElement(remoteVideoRef.current, { muted: false, mirror: false });
        webrtcCallService.remoteRenderer.attachElement(remoteVideoRef.current, { muted: false, mirror: false });
      }

      // Configure speakerphone by default for video calls
      AudioRoutingHelper.setSpeakerphoneOn(true, remoteAudioRef.current || remoteVideoRef.current);

      // 2. Strict Runtime Permission Flow: verify local media stream
      try {
        const stream = await webrtcCallService.initLocalMedia('video', facingMode);
        if (isSubscribed && stream) {
          attachLocalStream(stream);
        }
      } catch (err) {
        console.warn('[VideoCall] Local camera stream acquisition error:', err?.message);
        if (webrtcCallService.hardwareError === 'permission_denied') {
          setCameraNotice('Camera and microphone permission required. Please enable in settings.');
        }
      }

      const handleStatusChange = (status) => {
        if (!isSubscribed) return;
        if (status === 'blocked') {
          setCallStatus('ended');
          setTimeout(() => onClose(), 1000);
        } else if (status === 'connected') {
          setCallStatus('connected');
          attachLocalStream();
          playVideoChime();
        } else if (status === 'declined' || status === 'ended' || status === 'rejected') {
          setCallStatus('ended');
          setTimeout(() => onClose(), 1000);
        }
      };

      if (isCaller) {
        setCallStatus('calling');
        setCallDuration(0);

        webrtcCallService
          .startCall({
            caller: currentUser,
            callee: candidate,
            callType: 'video',
            onRemoteStream: handleRemoteStream,
            onStatusChange: handleStatusChange
          })
          .then((res) => {
            if (!isSubscribed) return;
            if (res && res.error === 'CALL_BLOCKED') {
              setCallStatus('ended');
              setTimeout(() => onClose(), 1000);
              return;
            }
            attachLocalStream();
            setCallStatus((prev) => (prev === 'connected' || prev === 'ended' ? prev : 'ringing'));
            if (webrtcCallService.hardwareError === 'permission_denied') {
              setCameraNotice('Camera permission required. Please allow access.');
            }
          });

        callTimeoutTimer = setTimeout(() => {
          if (isSubscribed) {
            setCallStatus((prev) => {
              if (prev === 'connected' || prev === 'ended') return prev;
              setTimeout(() => onClose(), 1200);
              return 'ended';
            });
          }
        }, 45000);
      } else {
        setCallStatus('connected');
        setCallDuration(0);

        if (remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.play().catch(() => {});
        }

        webrtcCallService
          .acceptCall({
            callData: callSession,
            currentUser,
            onRemoteStream: handleRemoteStream,
            onStatusChange: handleStatusChange
          })
          .then(() => {
            setCallStatus('connected');
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
            attachLocalStream();
            playVideoChime();
            if (webrtcCallService.hardwareError === 'permission_denied') {
              setCameraNotice('Camera permission required. Please allow access.');
            }
          });
      }
    };

    setupCall();

    return () => {
      isSubscribed = false;
      clearTimeout(callTimeoutTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      localRendererRef.current.dispose();
      remoteRendererRef.current.dispose();
      remoteStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      webrtcCallService.cleanup();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, [isOpen, isCaller]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
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
    if (updatedStream) {
      attachLocalStream(updatedStream);
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
    <div
      className="fixed inset-0 z-50 w-full h-[100dvh] bg-slate-950 overflow-hidden select-none flex flex-col justify-between"
      style={{
        height: '100dvh',
        width: '100%',
        maxHeight: '100dvh',
        maxWidth: '100vw'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (remoteAudioRef.current && remoteAudioRef.current.paused) {
          remoteAudioRef.current.play().catch(() => {});
        }
      }}
    >
      {/* Dedicated Remote Audio Element for guaranteed loudspeaker voice routing */}
      <audio
        ref={remoteAudioRef}
        autoPlay={true}
        playsInline={true}
        webkit-playsinline="true"
        controls={false}
      />

      {/* Main Remote Video Container */}
      <div className="relative flex-1 min-h-0 w-full bg-gradient-to-b from-[#0B192C] to-[#040911] overflow-hidden flex items-center justify-center">
        {/* Remote Video Feed */}
        <video
          ref={remoteVideoRef}
          autoPlay={true}
          playsInline={true}
          webkit-playsinline="true"
          controls={false}
          onLoadedMetadata={() => setHasRemoteVideo(true)}
          onLoadedData={() => setHasRemoteVideo(true)}
          onCanPlay={() => setHasRemoteVideo(true)}
          onPlaying={() => setHasRemoteVideo(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasRemoteVideo ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Autoplay blocked notification */}
        {autoplayBlocked && (
          <div className="absolute top-20 inset-x-4 z-40 flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (remoteVideoRef.current) remoteVideoRef.current.play().catch(() => {});
                if (remoteAudioRef.current) remoteAudioRef.current.play().catch(() => {});
                setAutoplayBlocked(false);
              }}
              className="py-2 px-4 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-xl animate-bounce flex items-center space-x-2 cursor-pointer hover:bg-amber-400"
            >
              <Volume2 className="w-4 h-4" />
              <span>Tap to unmute incoming audio</span>
            </button>
          </div>
        )}

        {/* Camera permission banner */}
        {cameraNotice && (
          <div
            className="absolute top-16 sm:top-20 inset-x-3 sm:inset-x-6 z-30 flex justify-center"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="py-2 px-3.5 rounded-2xl bg-rose-600/90 backdrop-blur-md text-white text-xs font-semibold shadow-xl flex items-center gap-2 max-w-sm">
              <span className="truncate">{cameraNotice}</span>
              <button
                type="button"
                onClick={handleRequestCameraPermission}
                className="px-2.5 py-0.5 bg-white text-rose-700 rounded-md text-[11px] font-bold hover:bg-slate-100 cursor-pointer shadow active:scale-95 shrink-0"
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {/* Candidate Placeholder Photo shown when remote video is connecting */}
        {!hasRemoteVideo && (
          <img
            src={candidate.photo || candidate.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
            alt={candidate.name}
            className="absolute inset-0 w-full h-full object-cover filter brightness-90 animate-subtle-scale"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

        {/* Top Info Bar */}
        <div
          className="absolute top-3 sm:top-5 inset-x-3 sm:inset-x-5 flex items-center justify-between text-white z-20 pointer-events-auto"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>{candidate.name}</span>
                {candidate.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-300">
                {callStatus === 'connected'
                  ? formatDuration(callDuration)
                  : callStatus === 'ringing'
                  ? 'Ringing...'
                  : 'Connecting...'}
              </p>
            </div>
          </div>
        </div>

        {/* Connecting Ringing State Center Graphic */}
        {callStatus !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-black/50 backdrop-blur-xs px-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-2xl">
                <img
                  src={candidate.photo || candidate.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                  alt={candidate.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
            </div>

            <div className="text-center text-white space-y-1">
              <h3 className="font-serif font-bold text-base sm:text-xl">{candidate.name}</h3>
              <p className="text-xs sm:text-sm text-[#DFB76C] font-semibold animate-pulse">
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'ringing' && 'Ringing...'}
                {callStatus === 'ended' && 'Call Ended'}
              </p>
            </div>
          </div>
        )}

        {/* Local User Picture-in-Picture (PIP) Window */}
        <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 w-24 h-32 sm:w-32 sm:h-44 md:w-36 md:h-48 max-h-[35%] rounded-2xl overflow-hidden bg-black/80 border-2 border-[#D4AF37] shadow-2xl z-30 group">
          <video
            ref={localVideoRef}
            autoPlay={true}
            playsInline={true}
            webkit-playsinline="true"
            controls={false}
            muted
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-200 ${
              hasCameraPermission && !isCameraOff ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />
          {(!hasCameraPermission || isCameraOff) && (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-300 space-y-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-[#DFB76C] font-bold text-xs sm:text-sm">
                {currentUser?.name?.[0] || 'You'}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400">
                {isCameraOff ? 'Camera Off' : 'Starting...'}
              </span>
            </div>
          )}

          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>You</span>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div
        className="w-full shrink-0 z-40 bg-[#060D17]/95 backdrop-blur-md border-t border-slate-800/80 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-center space-x-3 sm:space-x-5"
        style={{
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Mute Mic */}
        <button
          type="button"
          onClick={handleToggleMic}
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center justify-center ${
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
          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md flex items-center justify-center ${
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
          className="p-3 sm:p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-md flex items-center justify-center"
          title="Flip Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={handleEndCall}
          className="px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-rose-900/50 hover:brightness-110 active:scale-95 transition-all cursor-pointer ring-2 ring-rose-500/40"
          title="End Video Call"
        >
          <PhoneOff className="w-5 h-5" />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
