import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SwitchCamera,
  ShieldCheck,
  Volume2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { webrtcCallService, AudioRoutingHelper, RTCVideoRenderer } from '../../services/webrtcCallService';
import SafeAvatar from '../common/SafeAvatar';
import { resolveProfilePhoto, fetchLiveUserProfile } from '../../services/api';
import { formatR2PublicUrl } from '../../utils/r2Upload';

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
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(candidate);
  const [candidateImgFailed, setCandidateImgFailed] = useState(false);

  // Picture-in-Picture ("You" box) WhatsApp-style docking and drag state: null | 'right' | 'left'
  const [dockedSide, setDockedSide] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const pipContainerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0, initialDocked: null });
  const isDraggingRef = useRef(false);

  // Renderers instantiated via RTCVideoRenderer
  const localRendererRef = useRef(new RTCVideoRenderer('localVideo'));
  const remoteRendererRef = useRef(new RTCVideoRenderer('remoteVideo'));
  const remoteStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const toneAudioContextRef = useRef(null);
  const activeOscillatorsRef = useRef([]);
  const isAlreadyConnectedRef = useRef(false);

  // Strict helper to completely silence and stop all video call tones and chimes
  const stopAllCallTones = () => {
    if (Array.isArray(activeOscillatorsRef.current)) {
      activeOscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      activeOscillatorsRef.current = [];
    }

    if (toneAudioContextRef.current && toneAudioContextRef.current.state !== 'closed') {
      try {
        if (toneAudioContextRef.current.state === 'running') {
          toneAudioContextRef.current.suspend().catch(() => {});
        }
      } catch (e) {}
    }
  };

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

  // Play pleasant chime on connect (runs at most once per connected call)
  const playVideoChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = toneAudioContextRef.current || new AudioCtx();
      toneAudioContextRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        activeOscillatorsRef.current.push(osc);
        osc.onended = () => {
          activeOscillatorsRef.current = activeOscillatorsRef.current.filter((o) => o !== osc);
        };

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

  // Measure dock offsets dynamically based on screen width and box width
  const calculateDockOffsets = useCallback(() => {
    if (typeof window === 'undefined') return { rightDockX: 84, leftDockX: -300, tabWidth: 32 };
    const el = pipContainerRef.current;
    const boxWidth = el?.offsetWidth || 112;
    const screenWidth = window.innerWidth;
    const isSm = screenWidth >= 640;
    const marginRight = isSm ? 20 : 12;
    const tabWidth = 32;

    const rightDockX = boxWidth + marginRight - tabWidth;
    const leftDockX = -(screenWidth - marginRight - tabWidth);

    return { rightDockX, leftDockX, tabWidth };
  }, []);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      initialDocked: dockedSide
    };
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - dragStartRef.current.x;
    setDragOffset(deltaX);
  };

  const handleTouchEnd = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const touch = e.changedTouches?.[0];
    const endX = touch ? touch.clientX : dragStartRef.current.x + dragOffset;
    const deltaX = endX - dragStartRef.current.x;
    const dt = Math.max(1, Date.now() - dragStartRef.current.time);
    const velocityX = deltaX / dt;
    const initial = dragStartRef.current.initialDocked;

    const isTap = Math.abs(deltaX) < 8 && dt < 280;
    if (isTap) {
      if (initial !== null) {
        setDockedSide(null);
      }
      setDragOffset(0);
      return;
    }

    if (initial === null) {
      if (deltaX > 40 || velocityX > 0.3) {
        setDockedSide('right');
      } else if (deltaX < -40 || velocityX < -0.3) {
        setDockedSide('left');
      } else {
        setDockedSide(null);
      }
    } else if (initial === 'right') {
      if (deltaX < -20 || velocityX < -0.2) {
        setDockedSide(null);
      } else {
        setDockedSide('right');
      }
    } else if (initial === 'left') {
      if (deltaX > 20 || velocityX > 0.2) {
        setDockedSide(null);
      } else {
        setDockedSide('left');
      }
    }

    setDragOffset(0);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      initialDocked: dockedSide
    };
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragOffset(0);

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      setDragOffset(deltaX);
    };

    const onMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const deltaX = upEvent.clientX - dragStartRef.current.x;
      const dt = Math.max(1, Date.now() - dragStartRef.current.time);
      const velocityX = deltaX / dt;
      const initial = dragStartRef.current.initialDocked;

      const isTap = Math.abs(deltaX) < 6 && dt < 250;
      if (isTap) {
        if (initial !== null) {
          setDockedSide(null);
        }
        setDragOffset(0);
        return;
      }

      if (initial === null) {
        if (deltaX > 40 || velocityX > 0.3) {
          setDockedSide('right');
        } else if (deltaX < -40 || velocityX < -0.3) {
          setDockedSide('left');
        } else {
          setDockedSide(null);
        }
      } else if (initial === 'right') {
        if (deltaX < -20 || velocityX < -0.2) {
          setDockedSide(null);
        } else {
          setDockedSide('right');
        }
      } else if (initial === 'left') {
        if (deltaX > 20 || velocityX > 0.2) {
          setDockedSide(null);
        } else {
          setDockedSide('left');
        }
      }

      setDragOffset(0);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Dedicated helper to reliably bind local stream to DOM video element with iOS/mobile compliance
  const bindLocalVideoElement = useCallback((videoEl, stream) => {
    if (!videoEl) return;
    try {
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.volume = 0;
      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.autoplay = true;

      const activeStream = stream || localStream || webrtcCallService.localStream;
      if (activeStream) {
        if (videoEl.srcObject !== activeStream) {
          videoEl.srcObject = activeStream;
        }
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[VideoCall] localVideo autoplay catch:', err?.message);
          });
        }
      }
    } catch (e) {
      console.warn('[VideoCall] bindLocalVideoElement notice:', e?.message);
    }
  }, [localStream]);

  const setLocalVideoRef = useCallback((el) => {
    localVideoRef.current = el;
    if (el) {
      const stream = localStream || webrtcCallService.localStream;
      bindLocalVideoElement(el, stream);
    }
  }, [localStream, bindLocalVideoElement]);

  // Keep local video element bound across callStatus transitions, facingMode switch, or camera toggle
  useEffect(() => {
    const stream = localStream || webrtcCallService.localStream;
    if (localVideoRef.current && stream) {
      bindLocalVideoElement(localVideoRef.current, stream);
    }
  }, [localStream, callStatus, facingMode, isCameraOff, bindLocalVideoElement]);

  // Hydrate candidate full profile from Supabase if photo or details are missing
  useEffect(() => {
    setCandidateProfile(candidate);
    setCandidateImgFailed(false);
    const candidateId =
      candidate?.id ||
      candidate?.user_id ||
      candidate?.caller_id ||
      candidate?.callerId ||
      candidate?.register_id ||
      candidate?.registerId;

    if (candidateId && !resolveProfilePhoto(candidate)) {
      let isMounted = true;
      fetchLiveUserProfile(candidateId)
        .then((fullUser) => {
          if (isMounted && fullUser) {
            setCandidateProfile((prev) => ({ ...prev, ...fullUser }));
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [candidate?.id, candidate?.caller_id, candidate?.user_id]);

  // Attach local stream to localRenderer and local video DOM element
  const attachLocalStream = useCallback((customStream = null) => {
    const stream = customStream || webrtcCallService.localStream;
    if (stream) {
      if (customStream && webrtcCallService.localStream !== customStream) {
        webrtcCallService.localStream = customStream;
      }
      stream.getTracks().forEach((track) => {
        if (!isCameraOff && track.kind === 'video') {
          track.enabled = true;
        } else if (track.kind === 'audio') {
          track.enabled = !isMicMuted;
        }
      });

      setLocalStream(stream);
      setHasCameraPermission(true);

      // Set srcObject on localRenderer
      if (localRendererRef.current) {
        localRendererRef.current.srcObject = stream;
      }
      if (webrtcCallService.localRenderer) {
        webrtcCallService.localRenderer.srcObject = stream;
      }

      if (localVideoRef.current) {
        bindLocalVideoElement(localVideoRef.current, stream);
      }
    }
  }, [isCameraOff, isMicMuted, bindLocalVideoElement]);

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

    stopAllCallTones();
    if (!isAlreadyConnectedRef.current) {
      isAlreadyConnectedRef.current = true;
      setCallStatus('connected');
      playVideoChime();
    }
  };

  // Lifecycle & WebRTC session
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    let callTimeoutTimer = null;

    const setupCall = async () => {
      // Reset connected guard
      isAlreadyConnectedRef.current = false;

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
        localRendererRef.current.attachElement(localVideoRef.current, { muted: true, mirror: false });
        webrtcCallService.localRenderer.attachElement(localVideoRef.current, { muted: true, mirror: false });
      }
      if (remoteVideoRef.current) {
        remoteRendererRef.current.attachElement(remoteVideoRef.current, { muted: false, mirror: false });
        webrtcCallService.remoteRenderer.attachElement(remoteVideoRef.current, { muted: false, mirror: false });
      }

      // Configure speakerphone by default for video calls
      AudioRoutingHelper.setSpeakerphoneOn(true, remoteAudioRef.current || remoteVideoRef.current);

      // 2. Strict Runtime Permission Flow: verify local media stream immediately
      try {
        let stream = webrtcCallService.localStream;
        const hasLiveVideo = stream && stream.getVideoTracks && stream.getVideoTracks().some((t) => t.readyState === 'live');
        if (!hasLiveVideo) {
          if (navigator?.mediaDevices?.getUserMedia) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode || 'user' },
                audio: true
              });
            } catch (gumErr) {
              console.warn('[VideoCall] Standard getUserMedia fallback:', gumErr?.message);
              stream = await webrtcCallService.initLocalMedia('video', facingMode);
            }
          } else {
            stream = await webrtcCallService.initLocalMedia('video', facingMode);
          }
        }
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
          stopAllCallTones();
          setCallStatus('ended');
          setTimeout(() => onClose(), 1000);
        } else if (status === 'connected') {
          stopAllCallTones();
          if (!isAlreadyConnectedRef.current) {
            isAlreadyConnectedRef.current = true;
            setCallStatus('connected');
            attachLocalStream(webrtcCallService.localStream);
            playVideoChime();
          }
        } else if (status === 'declined' || status === 'ended' || status === 'rejected') {
          stopAllCallTones();
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
              stopAllCallTones();
              setCallStatus('ended');
              setTimeout(() => onClose(), 1000);
              return;
            }
            attachLocalStream(webrtcCallService.localStream);
            setCallStatus((prev) => (prev === 'connected' || prev === 'ended' || isAlreadyConnectedRef.current ? prev : 'ringing'));
            if (webrtcCallService.hardwareError === 'permission_denied') {
              setCameraNotice('Camera permission required. Please allow access.');
            }
          });

        callTimeoutTimer = setTimeout(() => {
          if (isSubscribed) {
            setCallStatus((prev) => {
              if (prev === 'connected' || prev === 'ended' || isAlreadyConnectedRef.current) return prev;
              stopAllCallTones();
              setTimeout(() => onClose(), 1200);
              return 'ended';
            });
          }
        }, 45000);
      } else {
        stopAllCallTones();
        isAlreadyConnectedRef.current = true;
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
            callData: {
              ...callSession,
              callType: 'video',
              call_type: 'video'
            },
            currentUser,
            onRemoteStream: handleRemoteStream,
            onStatusChange: handleStatusChange
          })
          .then(() => {
            stopAllCallTones();
            setCallStatus('connected');
            if (remoteAudioRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
            attachLocalStream(webrtcCallService.localStream);
            if (webrtcCallService.hardwareError === 'permission_denied') {
              setCameraNotice('Camera permission required. Please allow access.');
            }
          });
      }
    };

    setupCall();

    return () => {
      isSubscribed = false;
      stopAllCallTones();
      clearTimeout(callTimeoutTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      localRendererRef.current.dispose();
      remoteRendererRef.current.dispose();
      remoteStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      webrtcCallService.cleanup();
      if (toneAudioContextRef.current && toneAudioContextRef.current.state !== 'closed') {
        try {
          toneAudioContextRef.current.close();
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
    if (!nextCameraOff) {
      const stream = localStream || webrtcCallService.localStream;
      if (stream && localVideoRef.current) {
        bindLocalVideoElement(localVideoRef.current, stream);
      }
    }
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    try {
      const updatedStream = await webrtcCallService.switchCamera(nextMode);
      if (updatedStream) {
        attachLocalStream(updatedStream);
        if (localVideoRef.current) {
          bindLocalVideoElement(localVideoRef.current, updatedStream);
        }
      }
    } catch (e) {
      console.warn('[VideoCall] handleFlipCamera notice:', e?.message);
    }
  };

  const handleEndCall = () => {
    stopAllCallTones();
    setCallStatus('ended');
    webrtcCallService.endCall();
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const candidatePhoto = formatR2PublicUrl(resolveProfilePhoto(candidateProfile || candidate));
  const currentUserPhoto = formatR2PublicUrl(resolveProfilePhoto(currentUser));

  const activeLocalStream = localStream || webrtcCallService.localStream;
  const hasLiveVideoTrack = Boolean(
    activeLocalStream &&
    activeLocalStream.getVideoTracks &&
    activeLocalStream.getVideoTracks().some((t) => t.readyState === 'live')
  );
  const showCameraFeed = (hasCameraPermission || hasLiveVideoTrack) && !isCameraOff;

  const { rightDockX, leftDockX } = calculateDockOffsets();
  let currentTranslateX = 0;
  if (isDragging) {
    const baseX = dockedSide === 'right' ? rightDockX : dockedSide === 'left' ? leftDockX : 0;
    const targetX = baseX + dragOffset;
    currentTranslateX = Math.max(leftDockX - 25, Math.min(rightDockX + 25, targetX));
  } else {
    if (dockedSide === 'right') currentTranslateX = rightDockX;
    else if (dockedSide === 'left') currentTranslateX = leftDockX;
    else currentTranslateX = 0;
  }

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

        {/* Candidate Placeholder shown when remote video is connecting */}
        {!hasRemoteVideo && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950">
            {candidatePhoto && !candidateImgFailed ? (
              <img
                src={candidatePhoto}
                alt={candidateProfile?.name || candidate?.name || 'Candidate'}
                onError={() => setCandidateImgFailed(true)}
                className="w-full h-full object-cover filter brightness-90 animate-subtle-scale"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <SafeAvatar
                  src={candidatePhoto}
                  alt={candidateProfile?.name || candidate?.name || 'Candidate'}
                  gender={candidateProfile?.gender || candidate?.gender}
                  size="2xl"
                  className="w-28 h-28 shadow-2xl"
                />
              </div>
            )}
          </div>
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
                <span>{candidateProfile?.name || candidate?.name || 'Candidate'}</span>
                {(candidateProfile?.verified || candidate?.verified) && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-black/40 backdrop-blur-xs px-4">
            <div className="relative">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-2xl bg-slate-900">
                <SafeAvatar
                  src={candidatePhoto}
                  alt={candidateProfile?.name || candidate?.name || 'Candidate'}
                  gender={candidateProfile?.gender || candidate?.gender}
                  size="2xl"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping" />
            </div>

            <div className="text-center text-white space-y-1">
              <h3 className="font-serif font-bold text-base sm:text-xl">{candidateProfile?.name || candidate?.name || 'Candidate'}</h3>
              <p className="text-xs sm:text-sm text-[#DFB76C] font-semibold animate-pulse">
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'ringing' && 'Ringing...'}
                {callStatus === 'ended' && 'Call Ended'}
              </p>
            </div>
          </div>
        )}

        {/* Local User Picture-in-Picture (PIP) Window with WhatsApp-Style Swipe-to-Dock */}
        <div
          ref={pipContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            e.stopPropagation();
            if (dockedSide !== null) {
              setDockedSide(null);
            }
          }}
          style={{
            transform: `translateX(${currentTranslateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: 'none'
          }}
          className={`absolute bottom-3 right-3 sm:bottom-5 sm:right-5 w-24 h-32 sm:w-32 sm:h-44 md:w-36 md:h-48 max-h-[35%] rounded-2xl overflow-hidden bg-slate-950 border-2 border-[#D4AF37] shadow-2xl z-30 group select-none ${
            dockedSide
              ? 'cursor-pointer ring-2 ring-[#D4AF37]/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_20px_rgba(212,175,55,0.4)]'
              : 'cursor-grab active:cursor-grabbing hover:border-[#DFB76C]'
          }`}
          title={dockedSide ? 'Tap or swipe to restore camera preview' : 'Swipe left or right to dock to edge'}
        >
          {/* Main Local Video Feed - Always mounted to avoid black screen on restore */}
          <video
            ref={setLocalVideoRef}
            autoPlay={true}
            playsInline={true}
            webkit-playsinline="true"
            controls={false}
            muted={true}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 z-10 ${
              facingMode === 'user' ? 'scale-x-[-1]' : 'scale-x-100'
            } ${
              showCameraFeed ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Fallback Display: Shown strictly when camera is off or initializing */}
          {!showCameraFeed && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-300 space-y-1.5 z-20 pointer-events-none">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-md flex items-center justify-center bg-slate-800">
                <SafeAvatar
                  src={currentUserPhoto}
                  alt={currentUser?.name || 'You'}
                  gender={currentUser?.gender}
                  size="md"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
                {isCameraOff ? 'Camera Off' : 'Starting camera...'}
              </span>
            </div>
          )}

          {/* Standard "You" Badge & Indicators (Shown when NOT docked) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-200 z-30 ${
              dockedSide === null ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Top drag hint bar */}
            <div className="absolute top-1.5 inset-x-0 flex justify-center">
              <div className="w-6 h-1 rounded-full bg-white/40 group-hover:bg-[#DFB76C] transition-colors" />
            </div>

            {/* Bottom-left You label with active status dot */}
            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white backdrop-blur-xs flex items-center gap-1 shadow-sm border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${showCameraFeed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>You</span>
            </div>

            {/* Subtle swipe direction hints on hover */}
            <div className="absolute inset-y-0 right-1 flex items-center opacity-0 group-hover:opacity-60 transition-opacity">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="absolute inset-y-0 left-1 flex items-center opacity-0 group-hover:opacity-60 transition-opacity">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Right-Edge Dock Pull-Tab Handle (Visible on screen's right edge when docked to right) */}
          <div
            className={`absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0B192C] via-[#0B192C]/95 to-slate-950/80 border-r border-[#D4AF37]/70 flex flex-col items-center justify-center cursor-pointer transition-opacity z-40 ${
              dockedSide === 'right' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setDockedSide(null);
            }}
            title="Restore camera preview"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mb-1" />
            <ChevronLeft className="w-4 h-4 text-[#DFB76C] animate-pulse" />
            <span className="text-[8px] font-bold text-[#DFB76C] tracking-tighter mt-1 [writing-mode:vertical-rl] rotate-180">
              YOU
            </span>
          </div>

          {/* Left-Edge Dock Pull-Tab Handle (Visible on screen's left edge when docked to left) */}
          <div
            className={`absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0B192C] via-[#0B192C]/95 to-slate-950/80 border-l border-[#D4AF37]/70 flex flex-col items-center justify-center cursor-pointer transition-opacity z-40 ${
              dockedSide === 'left' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setDockedSide(null);
            }}
            title="Restore camera preview"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mb-1" />
            <ChevronRight className="w-4 h-4 text-[#DFB76C] animate-pulse" />
            <span className="text-[8px] font-bold text-[#DFB76C] tracking-tighter mt-1 [writing-mode:vertical-rl] rotate-180">
              YOU
            </span>
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
