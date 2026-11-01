import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';
import { fcmNotificationService } from './fcmNotificationService.js';

/**
 * Robust STUN and TURN server configuration with unified-plan semantics.
 * Includes multi-region Google STUN servers and open-source TURN relay servers (UDP/TCP)
 * to ensure media flow across mobile 4G/5G, restrictive firewalls, and carrier-grade NATs.
 */
export const getRTCConfig = () => {
  const iceServers = [
    // Google Public STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Cloudflare Public STUN
    { urls: 'stun:stun.cloudflare.com:3478' },
    // OpenRelay / Metered TURN relay servers (UDP & TCP fallback)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:5349?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_URL) {
    const urls = import.meta.env.VITE_TURN_URL.includes(',')
      ? import.meta.env.VITE_TURN_URL.split(',').map((u) => u.trim())
      : import.meta.env.VITE_TURN_URL;
    iceServers.push({
      urls,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    sdpSemantics: 'unified-plan',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};

/**
 * Standard Audio & Video Constraints
 * Universal cross-platform constraints compatible with iOS Safari, Android WebKit, and Desktop browsers.
 */
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

export const VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 640 },
  height: { ideal: 480 }
};

/**
 * Global AudioContext unlocker for iOS Safari and mobile browsers.
 * Unlocks Web Audio playback upon the very first user interaction anywhere in the app.
 */
export function unlockAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!window.__agyAudioContext || window.__agyAudioContext.state === 'closed') {
        window.__agyAudioContext = new AudioCtx();
      }
      if (window.__agyAudioContext.state === 'suspended') {
        window.__agyAudioContext.resume().catch(() => {});
      }
      const osc = window.__agyAudioContext.createOscillator();
      const gain = window.__agyAudioContext.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(window.__agyAudioContext.destination);
      osc.start(0);
      osc.stop(0.01);
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
  window.addEventListener('click', unlockAudioContext, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true, passive: true });
}

/**
 * RTCVideoRenderer
 * Cross-platform renderer abstraction supporting initialization lifecycle,
 * media element attachment, track play-out, and clean resource disposal.
 */
export class RTCVideoRenderer {
  constructor(name = 'renderer') {
    this.name = name;
    this._element = null;
    this._srcObject = null;
    this.isInitialized = false;
    this.muted = false;
    this.mirror = false;
    this.onTrackUpdate = null;
  }

  async initialize() {
    this.isInitialized = true;
    console.log(`[RTCVideoRenderer:${this.name}] Initialized`);
    return true;
  }

  attachElement(element, { muted = false, mirror = false } = {}) {
    this._element = element;
    this.muted = muted;
    this.mirror = mirror;

    if (element) {
      element.playsInline = true;
      element.setAttribute('playsinline', 'true');
      element.setAttribute('webkit-playsinline', 'true');
      element.autoplay = true;
      element.controls = false;
      element.muted = muted;
      if (mirror) {
        element.style.transform = 'scaleX(-1)';
      }
      if (this._srcObject) {
        try {
          element.srcObject = this._srcObject;
          element.play().catch((err) => {
            console.warn(`[RTCVideoRenderer:${this.name}] Auto-play on attach notice:`, err?.message);
          });
        } catch (e) {
          console.warn(`[RTCVideoRenderer:${this.name}] attachElement error:`, e?.message);
        }
      }
    }
  }

  get srcObject() {
    return this._srcObject;
  }

  set srcObject(stream) {
    if (!this.isInitialized) {
      this.isInitialized = true;
    }
    this._srcObject = stream;
    console.log(`[RTCVideoRenderer:${this.name}] Assigned srcObject with ${stream?.getTracks?.().length || 0} track(s)`);

    if (this._element) {
      try {
        this._element.playsInline = true;
        this._element.setAttribute('playsinline', 'true');
        this._element.setAttribute('webkit-playsinline', 'true');
        this._element.autoplay = true;
        this._element.controls = false;
        this._element.srcObject = stream;
        if (stream) {
          this._element.play().catch((err) => {
            console.warn(`[RTCVideoRenderer:${this.name}] Play failed on srcObject update:`, err?.message);
          });
        }
      } catch (e) {
        console.warn(`[RTCVideoRenderer:${this.name}] Element srcObject assignment notice:`, e?.message);
      }
    }

    if (typeof this.onTrackUpdate === 'function') {
      this.onTrackUpdate(stream);
    }
  }

  get stream() {
    return this._srcObject;
  }

  dispose() {
    console.log(`[RTCVideoRenderer:${this.name}] Disposed`);
    if (this._element) {
      try {
        this._element.srcObject = null;
      } catch (e) {}
    }
    this._srcObject = null;
    this.isInitialized = false;
  }
}

/**
 * Audio Routing Helper for Loudspeaker & Speakerphone Management
 * Handles audio output routing and ensures sound is not routed to a dead earpiece.
 */
export const AudioRoutingHelper = {
  isSpeakerOn: true,
  audioContext: null,

  async setSpeakerphoneOn(enable = true, mediaElement = null) {
    this.isSpeakerOn = enable;
    console.log('[WebRTC AudioRouting] setSpeakerphoneOn:', enable);

    // 1. Select loudspeaker device via setSinkId if supported by the browser
    if (mediaElement && typeof mediaElement.setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

        if (enable) {
          const speaker = audioOutputs.find(
            (d) =>
              d.label.toLowerCase().includes('speaker') ||
              d.label.toLowerCase().includes('loudspeaker') ||
              d.deviceId === 'speaker'
          );
          if (speaker) {
            await mediaElement.setSinkId(speaker.deviceId);
            console.log('[WebRTC AudioRouting] setSinkId selected loudspeaker:', speaker.label);
          } else if (audioOutputs.length > 0) {
            await mediaElement.setSinkId('');
          }
        } else {
          const receiver = audioOutputs.find(
            (d) =>
              d.label.toLowerCase().includes('earpiece') ||
              d.label.toLowerCase().includes('receiver') ||
              d.label.toLowerCase().includes('phone')
          );
          if (receiver) {
            await mediaElement.setSinkId(receiver.deviceId);
            console.log('[WebRTC AudioRouting] setSinkId selected earpiece:', receiver.label);
          }
        }
      } catch (err) {
        console.warn('[WebRTC AudioRouting] setSinkId notice:', err?.message);
      }
    }

    // 2. Ensure AudioContext is active and not suspended to prevent mobile OS browser muting
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }
    } catch (e) {}

    return true;
  }
};

export const Helper = {
  setSpeakerphoneOn: (enabled, mediaElement = null) => AudioRoutingHelper.setSpeakerphoneOn(enabled, mediaElement)
};

/**
 * Safe Resilient Media Acquisition (Multi-tier fallback):
 * Step 1: Try requested media (Audio + Video for video calls, Audio only for voice calls).
 * Step 2: If camera is locked/busy on laptop (NotReadableError) or missing, fallback to Audio-Only.
 * Step 3: Even if both fail on same-laptop testing, return an empty MediaStream so the call signaling and remote stream ALWAYS connect without blocking!
 */
export async function getSafeMediaStream(isVideoCall, facingMode = 'user') {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('[WebRTC] mediaDevices.getUserMedia not supported in environment, returning empty MediaStream');
    return new MediaStream();
  }

  // Step 1: Try requested media (Audio + Video for video calls, Audio only for voice calls)
  try {
    const videoConstraint = isVideoCall
      ? {
          facingMode: typeof facingMode === 'string' ? facingMode : 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      : false;
    console.log('[WebRTC] getSafeMediaStream: Requesting primary media stream:', { isVideoCall });
    return await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: videoConstraint
    });
  } catch (err1) {
    console.warn('[WebRTC] Primary media request failed, trying audio-only fallback:', err1?.name, err1?.message);
    // Step 2: If camera is locked/busy on laptop (NotReadableError) or missing, fallback to Audio-Only
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false
      });
    } catch (err2) {
      console.warn('[WebRTC] Audio-only also failed, creating empty MediaStream so call STILL connects:', err2?.name, err2?.message);
      // Step 3: Even if both fail on same-laptop testing, return an empty MediaStream so the call signaling and remote stream ALWAYS connect without blocking!
      return new MediaStream();
    }
  }
}

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.localRenderer = new RTCVideoRenderer('local');
    this.remoteRenderer = new RTCVideoRenderer('remote');
    this.channel = null;
    this.userChannel = null;
    this.dbChannel = null;
    this.isSubscribed = false;
    this.currentUser = null;
    this.myIds = [];
    this.myPrimaryId = '';
    this.currentCallId = '';
    this.remoteUserId = '';
    this.callType = 'audio';
    this.isCaller = false;
    this.isRemoteDescriptionSet = false;
    this.pendingCandidates = [];
    this.incomingIceCandidateQueue = this.pendingCandidates;
    this.localIceCandidateQueue = [];
    this.hardwareError = null;
    this.mediaAcquisitionPromise = null;
    this.handledCallIds = new Set();
    this.inboxCallback = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
    this.pollTimer = null;
    this.lifecycleListenersAttached = false;
    this.removeLifecycleListeners = null;
  }

  setSelfUser(user) {
    if (!user) return;
    this.currentUser = user;
    const ids = [
      user.id,
      user.uid,
      user.register_id,
      user.registerId,
      user.user_id,
      user.userId,
      user.mobile?.replace(/\D/g, ''),
      user.phone?.replace(/\D/g, '')
    ].filter(Boolean).map(String);
    this.myIds = Array.from(new Set(ids));
    this.myPrimaryId = String(user.id || user.uid || user.register_id || user.registerId || this.myIds[0] || '');
  }

  getChannel() {
    if (this.channel) return this.channel;
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      this.channel = supabase.channel('global_webrtc_signaling', { config: { broadcast: { self: false } } });
      this.channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => this.handleIncomingSignal(payload))
        .on('broadcast', { event: 'call_signal' }, ({ payload }) => this.handleIncomingSignal(payload))
        .subscribe((status) => {
          this.isSubscribed = status === 'SUBSCRIBED';
        });
      return this.channel;
    } catch (e) {
      console.warn('[WebRTC] Failed to initialize global signaling channel:', e);
      return null;
    }
  }

  async ensureSubscribed() {
    this.getChannel();
    for (let i = 0; !this.isSubscribed && i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /**
   * Universal Cross-Platform Inbox Subscription:
   * 1. Direct Realtime broadcast channel: user_calls:${currentUserId}
   * 2. Realtime postgres_changes on call_requests table (filtered/checked for callee_id)
   * 3. Global WebRTC signaling channel fallback
   * 4. Active 3-second polling fallback for ringing calls created within 45s
   * 5. iOS Safari / Android lifecycle resume reconnect (visibilitychange & focus)
   */
  subscribeToUserInbox(user, onIncomingCall) {
    this.setSelfUser(user);
    this.inboxCallback = onIncomingCall;

    if (!isSupabaseConfigured() || !supabase || !this.myPrimaryId) return;

    // 1. Subscribe to Global Signaling Channel
    this.getChannel();

    // 2. Subscribe to Direct User Broadcast Channel
    try {
      if (this.userChannel) {
        try { supabase.removeChannel(this.userChannel); } catch (e) {}
      }
      this.userChannel = supabase.channel(`user_calls:${this.myPrimaryId}`, {
        config: { broadcast: { self: false } }
      });
      this.userChannel
        .on('broadcast', { event: 'signal' }, ({ payload }) => this.handleIncomingSignal(payload))
        .on('broadcast', { event: 'call_signal' }, ({ payload }) => this.handleIncomingSignal(payload))
        .subscribe();
    } catch (e) {
      console.warn('[WebRTC] Failed to subscribe to direct user broadcast channel:', e);
    }

    // 3. Subscribe to Realtime postgres_changes on call_requests table
    try {
      if (this.dbChannel) {
        try { supabase.removeChannel(this.dbChannel); } catch (e) {}
      }
      this.dbChannel = supabase.channel(`user_db_calls:${this.myPrimaryId}`);
      this.dbChannel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'call_requests' },
          (payload) => this.handleDatabaseCallRecord(payload.new)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'call_requests' },
          (payload) => this.handleDatabaseCallRecord(payload.new)
        )
        .subscribe();
    } catch (e) {
      console.warn('[WebRTC] Failed to subscribe to postgres_changes on call_requests:', e);
    }

    // 4. Lightweight 3-second active fallback poll for ringing calls created within last 45 seconds
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = setInterval(() => {
      this.checkActiveRingingCalls();
    }, 3000);
    this.checkActiveRingingCalls();

    // 5. iOS Safari & Android WebKit lifecycle resume & wake handler
    this.setupLifecycleListeners();
  }

  unsubscribeUserInbox() {
    this.inboxCallback = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (typeof this.removeLifecycleListeners === 'function') {
      this.removeLifecycleListeners();
      this.removeLifecycleListeners = null;
    }
    if (this.userChannel && supabase) {
      try { supabase.removeChannel(this.userChannel); } catch (e) {}
      this.userChannel = null;
    }
    if (this.dbChannel && supabase) {
      try { supabase.removeChannel(this.dbChannel); } catch (e) {}
      this.dbChannel = null;
    }
  }

  /**
   * Active fallback polling to query ringing calls from call_requests.
   * Catches calls on iOS/Android if WebSocket was suspended or dropped in background.
   */
  async checkActiveRingingCalls() {
    if (!isSupabaseConfigured() || !supabase || !this.inboxCallback || !this.myPrimaryId) return;
    try {
      const fortyFiveSecsAgo = new Date(Date.now() - 45000).toISOString();
      const { data, error } = await supabase
        .from('call_requests')
        .select('*')
        .eq('status', 'ringing')
        .gte('created_at', fortyFiveSecsAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !Array.isArray(data)) return;

      for (const row of data) {
        await this.handleDatabaseCallRecord(row);
      }
    } catch (e) {
      // Non-blocking fallback
    }
  }

  /**
   * Handle incoming call records from database realtime or fallback polling.
   */
  async handleDatabaseCallRecord(record) {
    if (!record) return;
    const receiverId = String(record.callee_id || record.receiver_id || '');
    const isForMe = this.myIds.some((id) => String(id) === receiverId);
    if (!isForMe) return;

    const senderId = String(record.caller_id || '');
    if (this.myIds.some((id) => String(id) === senderId)) return;

    if (record.status === 'ringing') {
      if (!record.id || this.handledCallIds.has(record.id)) return;
      this.handledCallIds.add(record.id);

      const callerObj = {
        id: senderId,
        name: record.caller_name || 'Candidate',
        photo: record.caller_photo || ''
      };

      try {
        const auth = await interestService.verifyCallAuthorization(this.currentUser, callerObj);
        if (!auth.authorized) return;
      } catch (e) {}

      console.log('[WebRTC] Triggering incoming call from DB record / poll:', record.id, callerObj.name);
      this.inboxCallback?.({
        callId: record.id,
        callType: record.call_type || 'audio',
        caller: callerObj,
        callerId: senderId,
        targetId: receiverId,
        timestamp: record.created_at ? new Date(record.created_at).getTime() : Date.now()
      });
    } else if (record.status === 'declined' || record.status === 'ended') {
      if (this.currentCallId && record.id === this.currentCallId) {
        this.onCallStatusChangeCallback?.(record.status);
        this.cleanupCallState(false);
      }
    }
  }

  /**
   * iOS Safari & Android lifecycle reconnection (visibilitychange & focus).
   */
  setupLifecycleListeners() {
    if (this.lifecycleListenersAttached || typeof document === 'undefined') return;
    this.lifecycleListenersAttached = true;

    const handleResume = () => {
      if (document.visibilityState === 'visible' || (typeof document.hasFocus === 'function' && document.hasFocus())) {
        console.log('[WebRTC] App resumed / focused (iOS/Android), checking channel state & ringing calls...');
        try {
          if (this.userChannel && this.userChannel.state !== 'joined') {
            this.userChannel.subscribe();
          }
          if (this.dbChannel && this.dbChannel.state !== 'joined') {
            this.dbChannel.subscribe();
          }
          if (this.channel && this.channel.state !== 'joined') {
            this.channel.subscribe();
          }
        } catch (e) {}

        this.checkActiveRingingCalls();
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleResume);
    }

    this.removeLifecycleListeners = () => {
      document.removeEventListener('visibilitychange', handleResume);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleResume);
      }
      this.lifecycleListenersAttached = false;
    };
  }

  async sendSignal(type, data = {}) {
    await this.ensureSubscribed();
    const payload = {
      callId: this.currentCallId,
      senderId: String(this.myPrimaryId),
      targetId: String(this.remoteUserId),
      type,
      data
    };

    // 1. Direct user broadcast channel
    if (isSupabaseConfigured() && supabase && this.remoteUserId) {
      try {
        const directChan = supabase.channel(`user_calls:${this.remoteUserId}`);
        await directChan.send({
          type: 'broadcast',
          event: 'signal',
          payload
        });
      } catch (e) {}
    }

    // 2. Global WebRTC signaling broadcast
    const ch = this.getChannel();
    if (ch) {
      try {
        await ch.send({
          type: 'broadcast',
          event: 'signal',
          payload
        });
      } catch (e) {
        console.warn('[WebRTC] sendSignal broadcast error:', type, e);
      }
    }
  }

  async handleIncomingSignal(payload) {
    if (!payload?.targetId) return;

    // Filter rule: target must match one of my registered identifiers
    const targetIdStr = String(payload.targetId);
    const isTarget =
      this.myIds.some((id) => String(id) === targetIdStr) ||
      (Array.isArray(payload.data?.targetIds) &&
        payload.data.targetIds.some((tId) => this.myIds.some((myId) => String(myId) === String(tId))));

    const senderIdStr = String(payload.senderId || '');
    const isFromMe = this.myIds.some((id) => String(id) === senderIdStr);
    if (!isTarget || isFromMe) return;

    // 1. Incoming Call Invitation
    if (payload.type === 'incoming-call') {
      if (!payload.callId || this.handledCallIds.has(payload.callId)) return;
      this.handledCallIds.add(payload.callId);
      try {
        const auth = await interestService.verifyCallAuthorization(
          this.currentUser,
          payload.data?.caller || { id: payload.senderId }
        );
        if (!auth.authorized) return;
      } catch (e) {}

      this.inboxCallback?.({
        callId: payload.callId,
        callType: payload.data?.callType || 'audio',
        caller: payload.data?.caller || {
          id: payload.senderId,
          name: payload.data?.callerName || 'Candidate',
          photo: payload.data?.callerAvatar || ''
        },
        callerId: payload.senderId,
        targetId: payload.targetId,
        timestamp: Date.now()
      });
      return;
    }

    if (this.currentCallId && payload.callId && payload.callId !== this.currentCallId) return;

    // 2. Call Accepted (Caller handles callee acceptance -> sends SDP offer)
    if (payload.type === 'call-accepted' && this.isCaller && this.peerConnection) {
      console.log('[WebRTC] Callee accepted call. Initializing SDP offer creation...');
      this.onCallStatusChangeCallback?.('connected');

      // Ensure local tracks are published BEFORE creating SDP Offer
      this.attachLocalTracksToPeerConnection();

      try {
        const isVideo = this.callType === 'video';
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo
        });
        await this.peerConnection.setLocalDescription(offer);
        console.log('[WebRTC] Local description (offer) set. Sending webrtc-offer...');
        await this.sendSignal('webrtc-offer', {
          sdp: offer.sdp,
          type: offer.type || 'offer'
        });
      } catch (e) {
        console.error('[WebRTC] Create offer error:', e);
      }
    }
    // 3. SDP Offer (Callee handles caller offer -> sets remote description -> flushes ICE candidates -> sends SDP answer)
    else if (payload.type === 'webrtc-offer' && this.peerConnection && payload.data?.sdp) {
      console.log('[WebRTC] Received SDP offer. Setting remote description...');
      try {
        const sdpData = payload.data.sdp;
        const sdpType = payload.data.type || 'offer';
        const sdpString = typeof sdpData === 'string' ? sdpData : sdpData?.sdp || sdpData;
        const offerDesc = new RTCSessionDescription({
          type: sdpType,
          sdp: sdpString
        });

        await this.peerConnection.setRemoteDescription(offerDesc);
        this.isRemoteDescriptionSet = true;
        console.log('[WebRTC] Callee remote description set. Flushing queued ICE candidates...');
        
        // Exchange ICE candidates only AFTER setRemoteDescription has been called
        await this.flushIncomingIceCandidates();
        await this.flushLocalIceCandidates();

        // Ensure local tracks are published BEFORE creating SDP Answer
        this.attachLocalTracksToPeerConnection();

        const isVideo = this.callType === 'video';
        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo
        });
        await this.peerConnection.setLocalDescription(answer);
        console.log('[WebRTC] Local description (answer) set. Sending webrtc-answer...');
        await this.sendSignal('webrtc-answer', {
          sdp: answer.sdp,
          type: answer.type || 'answer'
        });

        // Flush any candidates generated during setLocalDescription
        await this.flushLocalIceCandidates();
      } catch (e) {
        console.error('[WebRTC] Handle offer error:', e);
      }
    }
    // 4. SDP Answer (Caller handles callee answer -> sets remote description -> flushes ICE candidates)
    else if (payload.type === 'webrtc-answer' && this.peerConnection && payload.data?.sdp) {
      console.log('[WebRTC] Received SDP answer. Setting remote description...');
      try {
        const sdpData = payload.data.sdp;
        const sdpType = payload.data.type || 'answer';
        const sdpString = typeof sdpData === 'string' ? sdpData : sdpData?.sdp || sdpData;
        const answerDesc = new RTCSessionDescription({
          type: sdpType,
          sdp: sdpString
        });

        await this.peerConnection.setRemoteDescription(answerDesc);
        this.isRemoteDescriptionSet = true;
        console.log('[WebRTC] Caller remote description set. Flushing queued ICE candidates...');
        
        // Exchange ICE candidates only AFTER setRemoteDescription has been called
        await this.flushIncomingIceCandidates();
        await this.flushLocalIceCandidates();
      } catch (e) {
        console.error('[WebRTC] Handle answer error:', e);
      }
    }
    // 5. ICE Candidate (Queued until setRemoteDescription succeeds)
    else if (payload.type === 'ice-candidate') {
      await this.addIceCandidateSafe(payload.data?.candidate);
    }
    // 6. Call Ended / Declined
    else if (payload.type === 'call-ended' || payload.type === 'call-declined') {
      this.onCallStatusChangeCallback?.(payload.type === 'call-declined' ? 'declined' : 'ended');
      this.cleanupCallState(false);
    }
  }

  /**
   * Safe ICE Candidate Handling:
   * Adds candidate immediately if setRemoteDescription has succeeded;
   * otherwise queues the candidate in pendingCandidates.
   */
  async addIceCandidateSafe(candidateData) {
    if (!candidateData) return;
    const candidateInit = typeof candidateData === 'string' ? { candidate: candidateData } : candidateData;
    if (!candidateInit.candidate && candidateInit.candidate !== '') return;

    const hasRemoteDesc = !!(this.peerConnection?.remoteDescription && this.peerConnection.remoteDescription.type);

    if (this.peerConnection && this.isRemoteDescriptionSet && hasRemoteDesc) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate error, buffering candidate:', err?.message);
        this.pendingCandidates.push(candidateInit);
      }
    } else {
      console.log('[WebRTC] Buffering incoming ICE candidate until setRemoteDescription (Total queued:', this.pendingCandidates.length + 1, ')');
      this.pendingCandidates.push(candidateInit);
    }
  }

  /**
   * Flush incoming buffered ICE candidates after setRemoteDescription succeeds.
   */
  async flushIncomingIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    const queue = [...this.pendingCandidates];
    this.pendingCandidates = [];
    this.incomingIceCandidateQueue = this.pendingCandidates;

    if (queue.length > 0) {
      console.log(`[WebRTC] Flushing ${queue.length} incoming buffered ICE candidate(s)...`);
      for (const candidate of queue) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Failed to add buffered ICE candidate:', e?.message);
        }
      }
    }
  }

  /**
   * Flush locally generated ICE candidates to peer after setRemoteDescription succeeds.
   */
  async flushLocalIceCandidates() {
    if (!this.isRemoteDescriptionSet || !this.peerConnection?.remoteDescription) return;

    const queue = [...this.localIceCandidateQueue];
    this.localIceCandidateQueue = [];

    if (queue.length > 0) {
      console.log(`[WebRTC] Sending ${queue.length} local buffered ICE candidate(s) to remote peer...`);
      for (const candidate of queue) {
        await this.sendSignal('ice-candidate', { candidate });
      }
    }
  }

  /**
   * Publishing Local Tracks:
   * Loops through localStream.getTracks() and ensures:
   * 1. track.enabled = true
   * 2. Track is published to peerConnection via replaceTrack (if sender exists) or addTrack.
   * This is executed BEFORE createOffer and BEFORE createAnswer.
   */
  attachLocalTracksToPeerConnection() {
    if (!this.peerConnection || !this.localStream) {
      console.warn('[WebRTC] Cannot attach local tracks: peerConnection or localStream is missing');
      return;
    }

    const tracks = this.localStream.getTracks();
    console.log(`[WebRTC] Publishing ${tracks.length} local track(s) to RTCPeerConnection...`);

    tracks.forEach((track) => {
      // Ensure track is enabled
      track.enabled = true;

      const existingSenders = typeof this.peerConnection.getSenders === 'function'
        ? this.peerConnection.getSenders()
        : [];

      // Check if a sender exists for this kind
      const existingSender = existingSenders.find(
        (s) => s.track === track || (s.track && s.track.kind === track.kind)
      );

      if (existingSender) {
        if (existingSender.track !== track) {
          console.log(`[WebRTC] Replacing ${track.kind} track on existing sender`);
          existingSender.replaceTrack(track).catch((err) => {
            console.warn(`[WebRTC] replaceTrack warning for ${track.kind}:`, err?.message);
          });
        }
      } else {
        // Also check if any transceiver has a null track sender
        const transceivers = typeof this.peerConnection.getTransceivers === 'function'
          ? this.peerConnection.getTransceivers()
          : [];
        const unusedTransceiver = transceivers.find(
          (t) => (t.receiver?.track?.kind === track.kind || !t.sender?.track) && !t.sender?.track
        );

        if (unusedTransceiver && unusedTransceiver.sender) {
          console.log(`[WebRTC] Reusing existing transceiver for ${track.kind}`);
          unusedTransceiver.sender.replaceTrack(track).catch((err) => {
            console.warn(`[WebRTC] replaceTrack on transceiver notice:`, err?.message);
          });
          if (unusedTransceiver.direction !== 'sendrecv') {
            unusedTransceiver.direction = 'sendrecv';
          }
        } else {
          try {
            console.log(`[WebRTC] Publishing ${track.kind} track via addTrack:`, track.label);
            this.peerConnection.addTrack(track, this.localStream);
          } catch (err) {
            console.warn(`[WebRTC] addTrack warning for ${track.kind}:`, err?.message);
          }
        }
      }
    });

    // Ensure audio & video transceivers exist so remote tracks can be negotiated/received
    // even if localStream is empty (e.g. during same-laptop testing or missing local hardware)
    try {
      const transceivers = typeof this.peerConnection.getTransceivers === 'function'
        ? this.peerConnection.getTransceivers()
        : [];
      const hasAudio = transceivers.some(
        (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
      );
      if (!hasAudio && typeof this.peerConnection.addTransceiver === 'function') {
        this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      }
      if (this.callType === 'video') {
        const hasVideo = transceivers.some(
          (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
        );
        if (!hasVideo && typeof this.peerConnection.addTransceiver === 'function') {
          this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
        }
      }
    } catch (e) {
      console.warn('[WebRTC] Fallback transceiver initialization notice:', e?.message);
    }
  }

  createPeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch (e) {}
    }

    const config = getRTCConfig();
    this.peerConnection = new RTCPeerConnection(config);
    this.isRemoteDescriptionSet = false;
    this.incomingIceCandidateQueue = [];
    this.localIceCandidateQueue = [];

    // Polyfill getRemoteDescription() if needed
    if (typeof this.peerConnection.getRemoteDescription !== 'function') {
      this.peerConnection.getRemoteDescription = () => this.peerConnection.remoteDescription;
    }

    // ICE Candidate Generator:
    // Only send immediately if setRemoteDescription has been called;
    // otherwise queue locally until setRemoteDescription has completed.
    this.peerConnection.onicecandidate = async (e) => {
      if (e.candidate) {
        const candidatePayload = {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          usernameFragment: e.candidate.usernameFragment
        };

        if (this.isRemoteDescriptionSet && this.peerConnection?.remoteDescription) {
          await this.sendSignal('ice-candidate', { candidate: candidatePayload });
        } else {
          console.log('[WebRTC] Buffering local ICE candidate until remote description is set');
          this.localIceCandidateQueue.push(candidatePayload);
        }
      }
    };

    // Receiving & Rendering Remote Tracks:
    // Listen to peerConnection.ontrack, assign incoming stream to remoteRenderer.srcObject,
    // ensure tracks are enabled, and trigger UI state update immediately.
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] peerConnection.ontrack event received:', {
        kind: event.track?.kind,
        streamsCount: event.streams?.length,
        trackId: event.track?.id
      });

      if (event.track) {
        event.track.enabled = true;
      }

      let stream = event.streams && event.streams[0] ? event.streams[0] : null;

      if (!stream) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        const existing = this.remoteStream.getTracks().find((t) => t.id === event.track.id || t.kind === event.track.kind);
        if (existing) {
          try {
            this.remoteStream.removeTrack(existing);
          } catch (err) {}
        }
        this.remoteStream.addTrack(event.track);
        stream = this.remoteStream;
      } else {
        this.remoteStream = stream;
      }

      // Ensure all remote tracks are enabled
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });

      // Assign to remoteRenderer.srcObject
      if (this.remoteRenderer) {
        this.remoteRenderer.srcObject = stream;
      }

      // Automatically enable speakerphone routing
      AudioRoutingHelper.setSpeakerphoneOn(true);

      // Trigger UI callback immediately with the live remote stream
      if (typeof this.onRemoteStreamCallback === 'function') {
        this.onRemoteStreamCallback(stream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] PeerConnection state:', state);
      if (state === 'connected') {
        AudioRoutingHelper.setSpeakerphoneOn(true);
        this.onCallStatusChangeCallback?.('connected');
      } else if (state === 'failed' || state === 'closed') {
        console.warn('[WebRTC] PeerConnection entered', state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', iceState);
      if (iceState === 'connected' || iceState === 'completed') {
        AudioRoutingHelper.setSpeakerphoneOn(true);
      }
    };
  }

  /**
   * Strict Runtime Permission Flow & Media Initialization:
   * Requests camera and microphone permissions BEFORE creating or joining call sessions.
   * Ensures getUserMedia local audio and video tracks are properly initialized and enabled (enabled = true).
   */
  async requestMediaPermissions(callType = 'audio', facingMode = 'user') {
    return this.initLocalMedia(callType, facingMode);
  }

  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    const isVideo = callType === 'video';

    // 1. Re-use existing live local stream if valid and matching requested call type
    if (this.localStream) {
      const liveAudio = this.localStream.getAudioTracks().filter((t) => t.readyState === 'live');
      const liveVideo = this.localStream.getVideoTracks().filter((t) => t.readyState === 'live');
      if (liveAudio.length > 0 && (!isVideo || liveVideo.length > 0)) {
        console.log('[WebRTC] Reusing verified active local stream');
        this.localStream.getTracks().forEach((track) => {
          track.enabled = true;
        });
        if (this.localRenderer && this.localRenderer.srcObject !== this.localStream) {
          this.localRenderer.srcObject = this.localStream;
        }
        return this.localStream;
      }

      // If existing stream cannot be reused (e.g. upgrading to video or tracks inactive),
      // cleanly stop old media tracks so the device hardware is never locked by browser
      try {
        this.localStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      this.localStream = null;
    }

    // 2. Concurrency lock
    if (this.mediaAcquisitionPromise) {
      return this.mediaAcquisitionPromise;
    }

    this.mediaAcquisitionPromise = (async () => {
      try {
        const stream = await getSafeMediaStream(isVideo, facingMode);

        // Ensure all local tracks are explicitly enabled
        stream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        this.localStream = stream;
        this.hardwareError = null;

        // Store persistent permission grant in localStorage if any tracks were obtained
        try {
          if (stream.getTracks().length > 0) {
            localStorage.setItem('app_permissions_granted', 'true');
          }
        } catch (e) {}

        // Initialize localRenderer BEFORE assigning srcObject
        if (this.localRenderer) {
          if (!this.localRenderer.isInitialized) {
            await this.localRenderer.initialize();
          }
          this.localRenderer.srcObject = stream;
        }

        console.log(
          '[WebRTC] Safe local media stream ready. Audio tracks:',
          stream.getAudioTracks().length,
          'Video tracks:',
          stream.getVideoTracks().length
        );
        return stream;
      } catch (err) {
        console.warn('[WebRTC] Unexpected media acquisition fallback error, using empty stream:', err);
        const emptyFallback = new MediaStream();
        this.localStream = emptyFallback;
        return emptyFallback;
      } finally {
        this.mediaAcquisitionPromise = null;
      }
    })();

    return this.mediaAcquisitionPromise;
  }

  async requestMediaAccess(callType = 'audio', facingMode = 'user') {
    const stream = await this.initLocalMedia(callType, facingMode);
    this.attachLocalTracksToPeerConnection();
    return stream;
  }

  async switchCamera(facingMode = 'user') {
    if (!navigator?.mediaDevices?.getUserMedia) return this.localStream;
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true
        });
      }
      const newTrack = stream?.getVideoTracks?.()[0];
      if (newTrack && this.localStream) {
        newTrack.enabled = true;
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        this.localStream.addTrack(newTrack);
        const senders = this.peerConnection?.getSenders ? this.peerConnection.getSenders() : [];
        const s = senders.find((sn) => sn.track?.kind === 'video');
        if (s) await s.replaceTrack(newTrack);
      }
      return this.localStream;
    } catch (e) {
      return this.localStream;
    }
  }

  toggleAudio(enabled) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  toggleVideo(enabled) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  primeAudioPlayback() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {}
  }

  /**
   * Start Call (Caller):
   * 1. Preserves newly acquired localStream.
   * 2. Requests and verifies active localStream with live tracks (enabled = true).
   * 3. Initializes localRenderer and remoteRenderer.
   * 4. Creates PeerConnection with STUN/TURN.
   * 5. Publishes local tracks BEFORE sending invitation and creating offer.
   * 6. Sends incoming-call signal to callee.
   */
  async startCall({ caller, callee, callType = 'audio', onRemoteStream, onStatusChange }) {
    // Preserve local tracks if they were already acquired in user click
    this.cleanupCallState(true);

    this.setSelfUser(caller);
    const targetIds = [callee?.id, callee?.register_id, callee?.registerId, callee?.uid, callee?.userId]
      .filter(Boolean)
      .map(String);
    this.remoteUserId = targetIds[0] || String(callee);
    this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.callType = callType;
    this.isCaller = true;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;

    try {
      const auth = await interestService.verifyCallAuthorization(caller, callee);
      if (!auth.authorized) {
        onStatusChange?.('blocked');
        return { error: 'CALL_BLOCKED', reason: auth.reason };
      }
    } catch (e) {}

    // Safe Runtime Permission Flow: Verify active local stream
    try {
      await this.initLocalMedia(callType);
    } catch (err) {
      console.warn('[WebRTC] Local media acquisition notice in startCall:', err?.message);
    }

    // Initialize renderers
    await this.localRenderer.initialize();
    await this.remoteRenderer.initialize();
    this.localRenderer.srcObject = this.localStream;

    // Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // Publish all local tracks to peerConnection BEFORE SDP Offer
    this.attachLocalTracksToPeerConnection();

    // Enable speakerphone
    AudioRoutingHelper.setSpeakerphoneOn(true);

    // Send incoming call invite to target peer
    await this.sendSignal('incoming-call', {
      callId: this.currentCallId,
      callerId: this.myPrimaryId,
      callerName: caller.name || 'Caller',
      callerAvatar: caller.photo || caller.photo_url || caller.photos?.[0] || '',
      caller: {
        id: this.myPrimaryId,
        name: caller.name || 'Caller',
        photo: caller.photo || caller.photo_url || caller.photos?.[0] || '',
        profession: caller.profession || '',
        city: caller.city || caller.district || '',
        age: caller.age || '',
        verified: !!caller.verified
      },
      targetId: this.remoteUserId,
      targetIds,
      callType
    });

    // 1. Supabase call_requests record for Realtime postgres_changes + active fallback polling
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('call_requests').upsert({
          id: this.currentCallId,
          caller_id: String(this.myPrimaryId),
          callee_id: String(this.remoteUserId),
          caller_name: String(caller.name || 'Caller'),
          caller_photo: String(caller.photo || caller.photo_url || caller.photos?.[0] || ''),
          call_type: callType,
          channel_name: `call-session-${this.currentCallId}`,
          status: 'ringing',
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('[WebRTC] Supabase call_requests upsert notice:', dbErr?.message);
      }
    }

    // 2. Dispatch FCM native push notification to wake up device if screen is locked or idle
    try {
      fcmNotificationService?.dispatchCallPushNotification?.({
        calleeId: this.remoteUserId,
        caller,
        callType,
        callId: this.currentCallId,
        channelName: `call-session-${this.currentCallId}`
      }).catch(() => {});
    } catch (e) {}

    return { success: true, callId: this.currentCallId };
  }

  /**
   * Accept Call (Receiver):
   * 1. Preserves newly acquired localStream.
   * 2. Requests and verifies active localStream with live tracks (enabled = true).
   * 3. Initializes localRenderer and remoteRenderer.
   * 4. Creates PeerConnection with STUN/TURN.
   * 5. Publishes local tracks BEFORE sending call-accepted and creating SDP answer.
   * 6. Sends call-accepted signal to caller.
   */
  async acceptCall({ callData, currentUser, onRemoteStream, onStatusChange }) {
    // Preserve local tracks if they were already acquired in user accept gesture
    this.cleanupCallState(true);

    this.setSelfUser(currentUser);
    this.currentCallId = callData.callId;
    this.remoteUserId = String(callData.callerId || callData.caller?.id || callData.senderId);
    this.callType = callData.callType || 'audio';
    this.isCaller = false;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;

    // Safe Runtime Permission Flow: Verify active local stream before accepting
    try {
      await this.initLocalMedia(this.callType);
    } catch (err) {
      console.warn('[WebRTC] Local media acquisition notice in acceptCall:', err?.message);
    }

    // Initialize renderers
    await this.localRenderer.initialize();
    await this.remoteRenderer.initialize();
    this.localRenderer.srcObject = this.localStream;

    // Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // Publish all local tracks to peerConnection BEFORE SDP Answer
    this.attachLocalTracksToPeerConnection();

    // Enable speakerphone
    AudioRoutingHelper.setSpeakerphoneOn(true);

    // Notify connected status
    onStatusChange?.('connected');

    // Update database status to accepted
    if (isSupabaseConfigured() && supabase && this.currentCallId) {
      try {
        await supabase.from('call_requests').update({
          status: 'accepted'
        }).eq('id', this.currentCallId);
      } catch (e) {}
    }

    // Emit call-accepted back to caller so caller can create the SDP offer
    await this.sendSignal('call-accepted', { callId: this.currentCallId });
    return { success: true };
  }

  async declineCall({ callData, reason = 'declined' }) {
    const cId = callData?.callId || this.currentCallId;
    if (callData) {
      const targetId = String(callData.callerId || callData.caller?.id || callData.senderId);
      const ch = this.getChannel();
      if (ch) {
        await this.ensureSubscribed();
        try {
          await ch.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              callId: cId,
              senderId: this.myPrimaryId,
              targetId,
              type: 'call-declined',
              data: { reason }
            }
          });
        } catch (e) {}
      }
    }
    if (isSupabaseConfigured() && supabase && cId) {
      try {
        await supabase.from('call_requests').update({
          status: 'declined',
          ended_at: new Date().toISOString()
        }).eq('id', cId);
      } catch (e) {}
    }
    this.cleanupCallState(false);
  }

  async endCall() {
    if (this.currentCallId && this.remoteUserId) {
      await this.sendSignal('call-ended', { callId: this.currentCallId });
    }
    if (isSupabaseConfigured() && supabase && this.currentCallId) {
      try {
        await supabase.from('call_requests').update({
          status: 'ended',
          ended_at: new Date().toISOString()
        }).eq('id', this.currentCallId);
      } catch (e) {}
    }
    this.cleanupCallState(false);
  }

  /**
   * Clean Disposal:
   * When call ends, stops all local tracks, closes peerConnection, and disposes renderers.
   * If preserveLocalTracks is true (e.g. during call start/accept handoff), keeps the active
   * stream so getUserMedia does not have to be re-prompted outside a user gesture.
   */
  cleanupCallState(preserveLocalTracks = false) {
    if (this.peerConnection) {
      try {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    if (!preserveLocalTracks && this.localStream) {
      try {
        this.localStream.getTracks().forEach((t) => {
          t.stop();
          console.log(`[WebRTC] Stopped local track: ${t.kind} (${t.label})`);
        });
      } catch (e) {}
      this.localStream = null;
    }

    if (this.localRenderer) {
      this.localRenderer.dispose();
    }
    if (this.remoteRenderer) {
      this.remoteRenderer.dispose();
    }
    this.remoteStream = null;
    this.currentCallId = '';
    this.remoteUserId = '';
    this.pendingCandidates = [];
    this.incomingIceCandidateQueue = this.pendingCandidates;
    this.localIceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.isCaller = false;
    this.hardwareError = null;
    this.mediaAcquisitionPromise = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
  }

  cleanup() {
    this.cleanupCallState(false);
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
