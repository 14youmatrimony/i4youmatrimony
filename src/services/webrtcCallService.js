import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';

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
 * Standard Audio Constraints
 * Explicitly enables echoCancellation, noiseSuppression, and autoGainControl.
 */
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 }
};

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
      element.autoplay = true;
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

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.localRenderer = new RTCVideoRenderer('local');
    this.remoteRenderer = new RTCVideoRenderer('remote');
    this.channel = null;
    this.isSubscribed = false;
    this.currentUser = null;
    this.myIds = [];
    this.myPrimaryId = '';
    this.currentCallId = '';
    this.remoteUserId = '';
    this.callType = 'audio';
    this.isCaller = false;
    this.isRemoteDescriptionSet = false;
    this.incomingIceCandidateQueue = [];
    this.localIceCandidateQueue = [];
    this.hardwareError = null;
    this.mediaAcquisitionPromise = null;
    this.handledCallIds = new Set();
    this.inboxCallback = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
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
      console.warn('[WebRTC] Failed to initialize signaling channel:', e);
      return null;
    }
  }

  async ensureSubscribed() {
    this.getChannel();
    for (let i = 0; !this.isSubscribed && i < 30; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  subscribeToUserInbox(user, onIncomingCall) {
    this.setSelfUser(user);
    this.inboxCallback = onIncomingCall;
    this.getChannel();
  }

  unsubscribeUserInbox() {
    this.inboxCallback = null;
  }

  async sendSignal(type, data = {}) {
    await this.ensureSubscribed();
    const ch = this.getChannel();
    if (ch) {
      try {
        await ch.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            callId: this.currentCallId,
            senderId: this.myPrimaryId,
            targetId: this.remoteUserId,
            type,
            data
          }
        });
      } catch (e) {
        console.warn('[WebRTC] sendSignal failed:', type, e);
      }
    }
  }

  async handleIncomingSignal(payload) {
    if (!payload?.targetId) return;

    // Filter rule: target must match one of my registered identifiers
    const isTarget =
      this.myIds.includes(String(payload.targetId)) ||
      (Array.isArray(payload.data?.targetIds) && payload.data.targetIds.some((id) => this.myIds.includes(String(id))));
    if (!isTarget || this.myIds.includes(String(payload.senderId))) return;

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
        const offer = await this.peerConnection.createOffer();
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

        const answer = await this.peerConnection.createAnswer();
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
   * otherwise queues the candidate in incomingIceCandidateQueue.
   */
  async addIceCandidateSafe(candidateData) {
    if (!candidateData) return;
    const candidateInit = typeof candidateData === 'string' ? { candidate: candidateData } : candidateData;
    if (!candidateInit.candidate && candidateInit.candidate !== '') return;

    const hasRemoteDesc = !!(this.peerConnection?.remoteDescription);

    if (this.peerConnection && this.isRemoteDescriptionSet && hasRemoteDesc) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate error, buffering candidate:', err?.message);
        this.incomingIceCandidateQueue.push(candidateInit);
      }
    } else {
      console.log('[WebRTC] Buffering incoming ICE candidate until setRemoteDescription (Total queued:', this.incomingIceCandidateQueue.length + 1, ')');
      this.incomingIceCandidateQueue.push(candidateInit);
    }
  }

  /**
   * Flush incoming buffered ICE candidates after setRemoteDescription succeeds.
   */
  async flushIncomingIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    const queue = [...this.incomingIceCandidateQueue];
    this.incomingIceCandidateQueue = [];

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
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia is not supported on this browser or environment');
        }

        let stream = null;

        if (!isVideo) {
          // Voice Call: ONLY request audio, DO NOT request camera
          console.log('[WebRTC] Requesting Voice Call (Audio-only) permissions:', {
            audio: AUDIO_CONSTRAINTS,
            video: false
          });

          stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false
          });
        } else {
          // Video Call: Request both camera and audio
          const videoConstraints = {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 }
          };

          console.log('[WebRTC] Requesting Video Call permissions:', {
            audio: AUDIO_CONSTRAINTS,
            video: videoConstraints
          });

          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: AUDIO_CONSTRAINTS,
              video: videoConstraints
            });
          } catch (camErr) {
            console.warn('[WebRTC] Video stream acquisition error:', camErr.name, camErr.message);

            // If user explicitly denied permissions, rethrow so UI can notify cleanly
            if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
              throw camErr;
            }

            // Automatic fallback: If camera is busy (NotReadableError e.g. testing two tabs on same laptop),
            // or no camera device found (NotFoundError), automatically fall back to audio-only stream
            // so the call STILL connects with clear audio instead of blocking!
            console.log('[WebRTC] Camera unavailable or busy. Automatically falling back to audio-only stream...');
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: false
              });
              this.hardwareError = 'camera_fallback';
            } catch (audioErr) {
              console.error('[WebRTC] Audio fallback also failed:', audioErr.name, audioErr.message);
              throw audioErr;
            }
          }
        }

        // Ensure all local tracks are explicitly enabled
        stream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        // Verify active live tracks
        const audioTracks = stream.getAudioTracks().filter((t) => t.readyState === 'live');
        const videoTracks = stream.getVideoTracks().filter((t) => t.readyState === 'live');
        if (audioTracks.length === 0 && videoTracks.length === 0) {
          throw new Error('No active live media tracks acquired');
        }

        this.localStream = stream;
        if (this.hardwareError !== 'camera_fallback') {
          this.hardwareError = null;
        }

        // Store persistent permission grant in localStorage
        try {
          localStorage.setItem('app_permissions_granted', 'true');
        } catch (e) {}

        // Initialize localRenderer BEFORE assigning srcObject
        if (this.localRenderer) {
          if (!this.localRenderer.isInitialized) {
            await this.localRenderer.initialize();
          }
          this.localRenderer.srcObject = stream;
        }

        console.log(
          '[WebRTC] Local media stream acquired. Audio tracks:',
          audioTracks.length,
          'Video tracks:',
          videoTracks.length
        );
        return stream;
      } catch (err) {
        console.error('[WebRTC] getUserMedia failed:', err.name, err.message);
        this.hardwareError =
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'permission_denied'
            : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'hardware_unavailable'
            : 'media_error';
        throw err;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { exact: facingMode } }
      });
      const newTrack = stream.getVideoTracks()[0];
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

    // Strict Runtime Permission Flow: Verify active local stream
    try {
      await this.initLocalMedia(callType);
    } catch (err) {
      console.error('[WebRTC] Cannot start call without media permissions:', err);
      onStatusChange?.('permission_denied');
      return { error: 'PERMISSION_DENIED', message: 'Microphone and/or camera permission denied' };
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

    // Strict Runtime Permission Flow: Verify active local stream before accepting
    try {
      await this.initLocalMedia(this.callType);
    } catch (err) {
      console.error('[WebRTC] Cannot accept call without media permissions:', err);
      onStatusChange?.('permission_denied');
      return { error: 'PERMISSION_DENIED', message: 'Microphone and/or camera permission denied' };
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

    // Emit call-accepted back to caller so caller can create the SDP offer
    await this.sendSignal('call-accepted', { callId: this.currentCallId });
    return { success: true };
  }

  async declineCall({ callData, reason = 'declined' }) {
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
              callId: callData.callId,
              senderId: this.myPrimaryId,
              targetId,
              type: 'call-declined',
              data: { reason }
            }
          });
        } catch (e) {}
      }
    }
    this.cleanupCallState(false);
  }

  async endCall() {
    if (this.currentCallId && this.remoteUserId) {
      await this.sendSignal('call-ended', { callId: this.currentCallId });
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
    this.incomingIceCandidateQueue = [];
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
