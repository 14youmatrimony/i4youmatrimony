import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';

/**
 * UUID utility functions to guarantee strict compliance with PostgreSQL UUID types
 */
export const isValidUUID = (str) => {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
};

export const toValidUUID = (input) => {
  if (!input) return null;
  const str = String(input).trim();
  if (isValidUUID(str)) {
    return str.toLowerCase();
  }
  // Deterministic UUID for arbitrary string IDs
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (Math.imul(h1, 31) >>> 0).toString(16).padStart(8, '0') +
    (Math.imul(h2, 37) >>> 0).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Robust STUN and TURN server configuration with unified-plan semantics.
 */
export const getRTCConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
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

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 }
};

export const VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 640 },
  height: { ideal: 480 }
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
          element.play().catch(() => {});
        } catch (e) {}
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

    if (this._element) {
      try {
        this._element.playsInline = true;
        this._element.setAttribute('playsinline', 'true');
        this._element.setAttribute('webkit-playsinline', 'true');
        this._element.autoplay = true;
        this._element.controls = false;
        this._element.srcObject = stream;
        if (stream) {
          this._element.play().catch(() => {});
        }
      } catch (e) {}
    }

    if (typeof this.onTrackUpdate === 'function') {
      this.onTrackUpdate(stream);
    }
  }

  get stream() {
    return this._srcObject;
  }

  dispose() {
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
 */
export const AudioRoutingHelper = {
  isSpeakerOn: true,
  audioContext: null,

  async setSpeakerphoneOn(enable = true, mediaElement = null) {
    this.isSpeakerOn = enable;

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
          }
        }
      } catch (err) {}
    }

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
 * Safe Resilient Media Acquisition:
 * Step 1: Try requested media (Audio + Video for video calls, Audio only for voice calls).
 * Step 2: Fallback to Audio-Only.
 * Step 3: Fallback to empty MediaStream so connection is never blocked.
 */
export async function getSafeMediaStream(isVideoCall, facingMode = 'user') {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('[WebRTC] mediaDevices.getUserMedia not supported in environment, returning empty MediaStream');
    return new MediaStream();
  }

  try {
    const videoConstraint = isVideoCall ? { facingMode: { ideal: facingMode } } : false;
    return await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: videoConstraint
    });
  } catch (err1) {
    console.warn('[WebRTC] Primary media request failed, attempting audio-only fallback:', err1?.name, err1?.message);
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false
      });
    } catch (err2) {
      console.warn('[WebRTC] Audio-only fallback failed, returning empty MediaStream to keep signaling alive:', err2?.name, err2?.message);
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

    this.currentUser = null;
    this.myIds = [];
    this.myValidUUIDs = [];
    this.myPrimaryUUID = '';

    this.currentCallId = '';
    this.remoteUserId = '';
    this.callType = 'audio';
    this.isCaller = false;

    this.isRemoteDescriptionSet = false;
    this.incomingIceCandidateQueue = [];
    this.localCallerCandidates = [];
    this.localReceiverCandidates = [];
    this.processedRemoteCandidateSignatures = new Set();

    this.dbInboxChannel = null;
    this.activeCallChannel = null;
    this.inboxPollInterval = null;
    this.sessionPollInterval = null;
    this.candidateSyncTimeout = null;

    this.handledCallIds = new Set();
    this.inboxCallback = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
    this.mediaAcquisitionPromise = null;
    this.hardwareError = null;
  }

  setSelfUser(user) {
    if (!user) return;
    this.currentUser = user;
    const rawIds = [
      user.id,
      user.uid,
      user.register_id,
      user.registerId,
      user.user_id,
      user.userId,
      user.mobile?.replace(/\D/g, ''),
      user.phone?.replace(/\D/g, '')
    ].filter(Boolean).map(String);

    this.myIds = Array.from(new Set(rawIds));
    this.myValidUUIDs = Array.from(new Set(rawIds.map(toValidUUID).filter(Boolean)));
    this.myPrimaryUUID = toValidUUID(user.id || user.uid || user.register_id || user.registerId || rawIds[0] || '');
  }

  isMatchingReceiver(receiverId) {
    if (!receiverId) return false;
    const cleanId = String(receiverId).toLowerCase().trim();
    if (this.myPrimaryUUID && cleanId === this.myPrimaryUUID.toLowerCase()) return true;
    if (this.myValidUUIDs.some((u) => u.toLowerCase() === cleanId)) return true;
    const candidateUUID = toValidUUID(cleanId);
    if (candidateUUID && this.myValidUUIDs.includes(candidateUUID)) return true;
    return false;
  }

  /**
   * Listen globally for incoming calls on public.calls table:
   * 1. postgres_changes (INSERT and UPDATE) on public.calls
   * 2. 2-second fallback poll for receiver_id = currentUser.id AND status = 'ringing'
   */
  subscribeToUserInbox(user, onIncomingCall) {
    if (!user) return () => {};
    this.setSelfUser(user);
    this.inboxCallback = onIncomingCall;

    if (isSupabaseConfigured() && supabase) {
      // 1. Realtime postgres_changes on public.calls table
      if (!this.dbInboxChannel) {
        try {
          this.dbInboxChannel = supabase.channel(`calls_global_inbox_${this.myPrimaryUUID}`);
          this.dbInboxChannel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'calls'
              },
              (payload) => {
                const row = payload.new;
                if (!row) return;
                if (this.isMatchingReceiver(row.receiver_id) && row.status === 'ringing') {
                  console.log('[WebRTC] Realtime postgres_changes detected ringing call in public.calls:', row);
                  this.handleIncomingCallFromDb(row);
                }
              }
            )
            .subscribe((status) => {
              console.log('[WebRTC] calls inbox channel status:', status);
            });
        } catch (dbSubErr) {
          console.warn('[WebRTC] Supabase postgres_changes subscription notice:', dbSubErr);
        }
      }

      // 2. 2-second fallback active database polling on public.calls table
      if (!this.inboxPollInterval) {
        const pollPendingCalls = async () => {
          if (this.currentCallId || !this.currentUser || !this.inboxCallback) return;
          try {
            const fortyFiveSecAgo = new Date(Date.now() - 45000).toISOString();
            const { data, error } = await supabase
              .from('calls')
              .select('*')
              .in('receiver_id', this.myValidUUIDs)
              .eq('status', 'ringing')
              .gte('created_at', fortyFiveSecAgo)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && Array.isArray(data) && data.length > 0) {
              const row = data[0];
              if (!this.handledCallIds.has(row.id)) {
                console.log('[WebRTC] 2s fallback poll found ringing call in public.calls:', row);
                this.handleIncomingCallFromDb(row);
              }
            }
          } catch (pollErr) {}
        };

        pollPendingCalls();
        this.inboxPollInterval = setInterval(pollPendingCalls, 2000);
      }
    }

    return () => {
      this.unsubscribeUserInbox();
    };
  }

  listenForIncomingCalls(user, onIncomingCall) {
    return this.subscribeToUserInbox(user, onIncomingCall);
  }

  unsubscribeUserInbox() {
    this.inboxCallback = null;
    if (this.inboxPollInterval) {
      clearInterval(this.inboxPollInterval);
      this.inboxPollInterval = null;
    }
    if (this.dbInboxChannel) {
      try {
        this.dbInboxChannel.unsubscribe();
      } catch (e) {}
      this.dbInboxChannel = null;
    }
  }

  handleIncomingCallFromDb(row) {
    if (!row || !row.id || this.handledCallIds.has(row.id)) return;
    this.handledCallIds.add(row.id);

    const callData = {
      callId: row.id,
      id: row.id,
      callType: row.call_type || 'audio',
      callerId: row.caller_id,
      receiverId: row.receiver_id,
      callerName: row.caller_name || 'Candidate',
      callerPhoto: row.caller_photo || '',
      status: row.status,
      offer: row.offer,
      caller_candidates: Array.isArray(row.caller_candidates) ? row.caller_candidates : [],
      receiver_candidates: Array.isArray(row.receiver_candidates) ? row.receiver_candidates : [],
      caller: {
        id: row.caller_id,
        name: row.caller_name || 'Candidate',
        photo: row.caller_photo || '',
        photo_url: row.caller_photo || '',
        verified: true
      },
      timestamp: new Date(row.created_at || Date.now()).getTime(),
      rawCall: row
    };

    console.log('[WebRTC] Presenting incoming call immediately with caller info:', callData);
    if (typeof this.inboxCallback === 'function') {
      this.inboxCallback(callData);
    }
  }

  /**
   * Safe ICE Candidate Handling:
   * Adds candidate to RTCPeerConnection if remoteDescription has been set;
   * otherwise buffers candidate in incomingIceCandidateQueue.
   */
  async addIceCandidateSafe(candidateData) {
    if (!candidateData) return;
    const candidateInit = typeof candidateData === 'string' ? { candidate: candidateData } : candidateData;
    if (!candidateInit.candidate && candidateInit.candidate !== '') return;

    const sig = `${candidateInit.candidate}|${candidateInit.sdpMid}|${candidateInit.sdpMLineIndex}`;
    if (this.processedRemoteCandidateSignatures.has(sig)) return;
    this.processedRemoteCandidateSignatures.add(sig);

    const hasRemoteDesc = !!(this.peerConnection?.remoteDescription || this.peerConnection?.currentRemoteDescription);

    if (this.peerConnection && this.isRemoteDescriptionSet && hasRemoteDesc) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate error, buffering candidate:', err?.message);
        this.incomingIceCandidateQueue.push(candidateInit);
      }
    } else {
      this.incomingIceCandidateQueue.push(candidateInit);
    }
  }

  async flushIncomingIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    const queue = [...this.incomingIceCandidateQueue];
    this.incomingIceCandidateQueue = [];

    if (queue.length > 0) {
      console.log(`[WebRTC] Flushing ${queue.length} buffered incoming ICE candidate(s)...`);
      for (const candidate of queue) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Failed to add buffered ICE candidate:', e?.message);
        }
      }
    }
  }

  attachLocalTracksToPeerConnection() {
    if (!this.peerConnection || !this.localStream) return;

    const tracks = this.localStream.getTracks();
    console.log(`[WebRTC] Publishing ${tracks.length} local track(s) to RTCPeerConnection...`);

    tracks.forEach((track) => {
      track.enabled = true;
      const existingSenders = typeof this.peerConnection.getSenders === 'function'
        ? this.peerConnection.getSenders()
        : [];

      const existingSender = existingSenders.find(
        (s) => s.track === track || (s.track && s.track.kind === track.kind)
      );

      if (existingSender) {
        if (existingSender.track !== track) {
          existingSender.replaceTrack(track).catch((err) => {
            console.warn(`[WebRTC] replaceTrack notice for ${track.kind}:`, err?.message);
          });
        }
      } else {
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (err) {
          console.warn(`[WebRTC] addTrack notice for ${track.kind}:`, err?.message);
        }
      }
    });

    try {
      const transceivers = typeof this.peerConnection.getTransceivers === 'function'
        ? this.peerConnection.getTransceivers()
        : [];
      const hasAudio = transceivers.some((t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio');
      if (!hasAudio && typeof this.peerConnection.addTransceiver === 'function') {
        this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
      }
      if (this.callType === 'video') {
        const hasVideo = transceivers.some((t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video');
        if (!hasVideo && typeof this.peerConnection.addTransceiver === 'function') {
          this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });
        }
      }
    } catch (e) {}
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
    this.processedRemoteCandidateSignatures = new Set();

    if (typeof this.peerConnection.getRemoteDescription !== 'function') {
      this.peerConnection.getRemoteDescription = () => this.peerConnection.remoteDescription;
    }

    // ICE Candidate generation:
    // Append locally gathered candidate to the appropriate role array and sync to public.calls row
    this.peerConnection.onicecandidate = async (e) => {
      if (e.candidate) {
        const candPayload = e.candidate.toJSON
          ? e.candidate.toJSON()
          : {
              candidate: e.candidate.candidate,
              sdpMid: e.candidate.sdpMid,
              sdpMLineIndex: e.candidate.sdpMLineIndex,
              usernameFragment: e.candidate.usernameFragment
            };

        if (this.isCaller) {
          this.localCallerCandidates.push(candPayload);
          await this.syncCallerCandidates();
        } else {
          this.localReceiverCandidates.push(candPayload);
          await this.syncReceiverCandidates();
        }
      }
    };

    // Receiving & Rendering Remote Tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] peerConnection.ontrack received remote media track:', {
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

      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });

      if (this.remoteRenderer) {
        this.remoteRenderer.srcObject = stream;
      }

      AudioRoutingHelper.setSpeakerphoneOn(true);

      if (typeof this.onRemoteStreamCallback === 'function') {
        this.onRemoteStreamCallback(stream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] PeerConnection state changed:', state);
      if (state === 'connected') {
        AudioRoutingHelper.setSpeakerphoneOn(true);
        this.onCallStatusChangeCallback?.('connected');
      } else if (state === 'failed' || state === 'closed') {
        console.warn('[WebRTC] PeerConnection state entered', state);
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

  async syncCallerCandidates(immediate = false) {
    if (!this.currentCallId || !isSupabaseConfigured() || !supabase) return;
    if (immediate) {
      if (this.candidateSyncTimeout) {
        clearTimeout(this.candidateSyncTimeout);
        this.candidateSyncTimeout = null;
      }
      try {
        await supabase
          .from('calls')
          .update({
            caller_candidates: [...this.localCallerCandidates],
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentCallId);
      } catch (e) {}
      return;
    }
    if (this.candidateSyncTimeout) return;
    this.candidateSyncTimeout = setTimeout(async () => {
      this.candidateSyncTimeout = null;
      if (!this.currentCallId) return;
      try {
        await supabase
          .from('calls')
          .update({
            caller_candidates: [...this.localCallerCandidates],
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentCallId);
      } catch (e) {}
    }, 60);
  }

  async syncReceiverCandidates(immediate = false) {
    if (!this.currentCallId || !isSupabaseConfigured() || !supabase) return;
    if (immediate) {
      if (this.candidateSyncTimeout) {
        clearTimeout(this.candidateSyncTimeout);
        this.candidateSyncTimeout = null;
      }
      try {
        await supabase
          .from('calls')
          .update({
            receiver_candidates: [...this.localReceiverCandidates],
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentCallId);
      } catch (e) {}
      return;
    }
    if (this.candidateSyncTimeout) return;
    this.candidateSyncTimeout = setTimeout(async () => {
      this.candidateSyncTimeout = null;
      if (!this.currentCallId) return;
      try {
        await supabase
          .from('calls')
          .update({
            receiver_candidates: [...this.localReceiverCandidates],
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentCallId);
      } catch (e) {}
    }, 60);
  }

  async requestMediaPermissions(callType = 'audio', facingMode = 'user') {
    return this.initLocalMedia(callType, facingMode);
  }

  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    const isVideo = callType === 'video';

    if (this.localStream) {
      const liveAudio = this.localStream.getAudioTracks().filter((t) => t.readyState === 'live');
      const liveVideo = this.localStream.getVideoTracks().filter((t) => t.readyState === 'live');
      if (liveAudio.length > 0 && (!isVideo || liveVideo.length > 0)) {
        this.localStream.getTracks().forEach((track) => {
          track.enabled = true;
        });
        if (this.localRenderer && this.localRenderer.srcObject !== this.localStream) {
          this.localRenderer.srcObject = this.localStream;
        }
        return this.localStream;
      }

      try {
        this.localStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      this.localStream = null;
    }

    if (this.mediaAcquisitionPromise) {
      return this.mediaAcquisitionPromise;
    }

    this.mediaAcquisitionPromise = (async () => {
      try {
        const stream = await getSafeMediaStream(isVideo, facingMode);
        stream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        this.localStream = stream;
        this.hardwareError = null;

        if (this.localRenderer) {
          if (!this.localRenderer.isInitialized) {
            await this.localRenderer.initialize();
          }
          this.localRenderer.srcObject = stream;
        }

        return stream;
      } catch (err) {
        console.warn('[WebRTC] Unexpected media acquisition fallback, using empty stream:', err);
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
   * Caller (startCall):
   * 1. Get media via getSafeMediaStream(callType === 'video')
   * 2. Create RTCPeerConnection, add tracks, and gather local ICE candidates into caller_candidates
   * 3. Create SDP offer and insert a row into public.calls
   * 4. Whenever caller generates an ICE candidate, append it to caller_candidates in that row
   * 5. Listen to postgres_changes (UPDATE on public.calls where id=eq.${callId}) PLUS 1.5s fallback poll
   *    - As soon as row.answer is present and !peerConnection.currentRemoteDescription,
   *      call peerConnection.setRemoteDescription(new RTCSessionDescription(row.answer)) and change UI state to 'connected'
   *    - Add any new candidates from row.receiver_candidates
   *    - When status is 'rejected' or 'ended', close call UI and stop media tracks immediately
   */
  async startCall({ caller, callee, callType = 'audio', onRemoteStream, onStatusChange }) {
    this.cleanupCallState(true);

    this.setSelfUser(caller);
    const callerUUID = toValidUUID(caller?.id || caller?.uid || caller?.register_id || caller?.registerId || this.myPrimaryUUID);
    const receiverUUID = toValidUUID(
      callee?.id ||
      callee?.user_id ||
      callee?.userId ||
      callee?.register_id ||
      callee?.registerId ||
      callee
    );

    this.currentCallId = generateUUID();
    this.remoteUserId = receiverUUID;
    this.callType = callType;
    this.isCaller = true;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.localCallerCandidates = [];
    this.localReceiverCandidates = [];
    this.processedRemoteCandidateSignatures = new Set();

    console.log('[WebRTC] Starting call:', {
      callId: this.currentCallId,
      caller_id: callerUUID,
      receiver_id: receiverUUID,
      call_type: callType
    });

    try {
      const auth = await interestService.verifyCallAuthorization(caller, callee);
      if (!auth.authorized) {
        onStatusChange?.('blocked');
        return { error: 'CALL_BLOCKED', reason: auth.reason };
      }
    } catch (e) {}

    // 1. Get media via getSafeMediaStream(callType === 'video')
    try {
      await this.initLocalMedia(callType);
    } catch (err) {
      console.warn('[WebRTC] Local media acquisition notice in startCall:', err?.message);
    }

    await this.localRenderer.initialize();
    await this.remoteRenderer.initialize();
    this.localRenderer.srcObject = this.localStream;

    // 2. Create RTCPeerConnection and add tracks
    this.createPeerConnection();
    this.attachLocalTracksToPeerConnection();
    AudioRoutingHelper.setSpeakerphoneOn(true);

    // 3. Create SDP offer
    let offer = null;
    try {
      offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] SDP offer created successfully');
    } catch (offerErr) {
      console.error('[WebRTC] Error creating SDP offer:', offerErr);
      return { error: 'OFFER_CREATION_FAILED' };
    }

    const callerName = caller.name || 'Caller';
    const callerPhoto = caller.photo || caller.photo_url || caller.photos?.[0] || '';

    // 4. Insert row into public.calls with exact schema
    if (isSupabaseConfigured() && supabase) {
      const callRow = {
        id: this.currentCallId,
        caller_id: callerUUID,
        receiver_id: receiverUUID,
        caller_name: String(callerName),
        caller_photo: String(callerPhoto),
        call_type: callType,
        status: 'ringing',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        answer: null,
        caller_candidates: [...this.localCallerCandidates],
        receiver_candidates: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const { error: insErr } = await supabase.from('calls').insert([callRow]);
        if (insErr) {
          console.error('[WebRTC] Error inserting into public.calls:', insErr);
        } else {
          console.log('[WebRTC] Inserted row into public.calls successfully:', this.currentCallId);
        }
      } catch (err) {
        console.error('[WebRTC] Exception inserting into public.calls:', err);
      }

      // 5. Listen to postgres_changes (UPDATE on public.calls where id=eq.${callId}) PLUS 1.5s fallback poll
      const handleCallerRowUpdate = async (row) => {
        if (!row || row.id !== this.currentCallId) return;

        // Check if call was rejected or ended
        if (row.status === 'rejected' || row.status === 'ended') {
          console.log(`[WebRTC] Call status changed to ${row.status} in public.calls`);
          this.onCallStatusChangeCallback?.(row.status);
          this.cleanupCallState(false);
          return;
        }

        // As soon as row.answer is present and !peerConnection.currentRemoteDescription
        const hasRemoteDesc = !!(this.peerConnection?.remoteDescription || this.peerConnection?.currentRemoteDescription);
        if (row.answer && this.peerConnection && !hasRemoteDesc) {
          console.log('[WebRTC] Caller found answer in public.calls row. Setting remote description...');
          try {
            const answerDesc = new RTCSessionDescription(row.answer);
            await this.peerConnection.setRemoteDescription(answerDesc);
            this.isRemoteDescriptionSet = true;
            console.log('[WebRTC] Caller remote description set successfully');

            // Change UI state to 'connected'
            this.onCallStatusChangeCallback?.('connected');

            // Flush buffered candidates
            await this.flushIncomingIceCandidates();
          } catch (err) {
            console.error('[WebRTC] Caller error setting remote description from answer:', err);
          }
        }

        // Add any new candidates from row.receiver_candidates
        if (Array.isArray(row.receiver_candidates) && row.receiver_candidates.length > 0) {
          for (const cand of row.receiver_candidates) {
            await this.addIceCandidateSafe(cand);
          }
        }
      };

      try {
        this.activeCallChannel = supabase.channel(`call_session_${this.currentCallId}`);
        this.activeCallChannel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'calls',
              filter: `id=eq.${this.currentCallId}`
            },
            (payload) => {
              console.log('[WebRTC] Realtime UPDATE on public.calls row:', payload.new);
              handleCallerRowUpdate(payload.new);
            }
          )
          .subscribe();
      } catch (subErr) {
        console.warn('[WebRTC] activeCallChannel subscription notice:', subErr);
      }

      // 1.5-second fallback poll on that row
      if (this.sessionPollInterval) clearInterval(this.sessionPollInterval);
      this.sessionPollInterval = setInterval(async () => {
        if (!this.isCaller || !this.currentCallId) {
          if (this.sessionPollInterval) clearInterval(this.sessionPollInterval);
          this.sessionPollInterval = null;
          return;
        }
        try {
          const { data, error } = await supabase
            .from('calls')
            .select('*')
            .eq('id', this.currentCallId)
            .single();

          if (!error && data) {
            handleCallerRowUpdate(data);
          }
        } catch (pollErr) {}
      }, 1500);
    }

    return { success: true, callId: this.currentCallId };
  }

  /**
   * Receiver (acceptCall):
   * 1. Get media via getSafeMediaStream(call.call_type === 'video')
   * 2. Create RTCPeerConnection, add local tracks, call setRemoteDescription(new RTCSessionDescription(call.offer))
   * 3. Add all ICE candidates from call.caller_candidates
   * 4. Create SDP answer, update public.calls setting answer: answer and status: 'accepted',
   *    and append receiver ICE candidates to receiver_candidates
   * 5. Immediately transition Receiver's UI to 'connected' and render remote audio/video
   * 6. Listen for call termination ('rejected' / 'ended') or additional caller_candidates
   */
  async acceptCall({ callData, currentUser, onRemoteStream, onStatusChange }) {
    this.cleanupCallState(true);

    this.setSelfUser(currentUser);
    this.currentCallId = callData?.callId || callData?.id;
    this.remoteUserId = String(callData?.callerId || callData?.caller_id || callData?.caller?.id || '');
    this.callType = callData?.callType || callData?.call_type || 'audio';
    this.isCaller = false;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.localCallerCandidates = [];
    this.localReceiverCandidates = [];
    this.processedRemoteCandidateSignatures = new Set();

    console.log('[WebRTC] Receiver accepting call:', this.currentCallId, 'from:', this.remoteUserId);

    // 1. Get media via getSafeMediaStream(call.call_type === 'video')
    try {
      await this.initLocalMedia(this.callType);
    } catch (err) {
      console.warn('[WebRTC] Local media acquisition notice in acceptCall:', err?.message);
    }

    await this.localRenderer.initialize();
    await this.remoteRenderer.initialize();
    this.localRenderer.srcObject = this.localStream;

    // 2. Create RTCPeerConnection and add local tracks
    this.createPeerConnection();
    this.attachLocalTracksToPeerConnection();
    AudioRoutingHelper.setSpeakerphoneOn(true);

    // Retrieve full row if offer or caller_candidates are missing in memory
    let offer = callData?.offer || callData?.rawCall?.offer;
    let callerCandidates = callData?.caller_candidates || callData?.rawCall?.caller_candidates || [];

    if ((!offer || !callerCandidates.length) && isSupabaseConfigured() && supabase && this.currentCallId) {
      try {
        const { data: freshCall } = await supabase
          .from('calls')
          .select('*')
          .eq('id', this.currentCallId)
          .single();
        if (freshCall) {
          if (!offer) offer = freshCall.offer;
          if (Array.isArray(freshCall.caller_candidates) && freshCall.caller_candidates.length > 0) {
            callerCandidates = freshCall.caller_candidates;
          }
        }
      } catch (e) {}
    }

    // Call setRemoteDescription(new RTCSessionDescription(call.offer))
    if (offer) {
      try {
        const offerDesc = new RTCSessionDescription(offer);
        await this.peerConnection.setRemoteDescription(offerDesc);
        this.isRemoteDescriptionSet = true;
        console.log('[WebRTC] Callee remote description set successfully');
      } catch (err) {
        console.error('[WebRTC] Error setting remote description from offer:', err);
      }
    }

    // 3. Add all ICE candidates from call.caller_candidates
    if (Array.isArray(callerCandidates) && callerCandidates.length > 0) {
      console.log(`[WebRTC] Adding ${callerCandidates.length} upfront candidate(s) from caller_candidates`);
      for (const cand of callerCandidates) {
        await this.addIceCandidateSafe(cand);
      }
    }
    await this.flushIncomingIceCandidates();

    // 4. Create SDP answer
    let answer = null;
    try {
      answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Created SDP answer successfully');
    } catch (ansErr) {
      console.error('[WebRTC] Error creating SDP answer:', ansErr);
    }

    // Update public.calls row setting answer: answer and status: 'accepted', append receiver_candidates
    if (isSupabaseConfigured() && supabase && this.currentCallId && answer) {
      try {
        const { error: updErr } = await supabase
          .from('calls')
          .update({
            answer: {
              type: answer.type,
              sdp: answer.sdp
            },
            status: 'accepted',
            receiver_candidates: [...this.localReceiverCandidates],
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentCallId);

        if (updErr) {
          console.error('[WebRTC] Error updating public.calls with answer:', updErr);
        } else {
          console.log('[WebRTC] Updated public.calls status to accepted and stored answer');
        }
      } catch (e) {
        console.error('[WebRTC] Exception updating public.calls with answer:', e);
      }
    }

    // 5. Immediately transition Receiver's UI to 'connected' and render remote audio/video
    this.onCallStatusChangeCallback?.('connected');

    // 6. Listen to updates on this row for hangup ('rejected' / 'ended') or additional caller_candidates
    if (isSupabaseConfigured() && supabase && this.currentCallId) {
      const handleReceiverRowUpdate = async (row) => {
        if (!row || row.id !== this.currentCallId) return;

        if (row.status === 'rejected' || row.status === 'ended') {
          console.log(`[WebRTC] Active call was ${row.status}`);
          this.onCallStatusChangeCallback?.(row.status);
          this.cleanupCallState(false);
          return;
        }

        if (Array.isArray(row.caller_candidates) && row.caller_candidates.length > 0) {
          for (const cand of row.caller_candidates) {
            await this.addIceCandidateSafe(cand);
          }
        }
      };

      try {
        this.activeCallChannel = supabase.channel(`call_receiver_session_${this.currentCallId}`);
        this.activeCallChannel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'calls',
              filter: `id=eq.${this.currentCallId}`
            },
            (payload) => {
              handleReceiverRowUpdate(payload.new);
            }
          )
          .subscribe();
      } catch (e) {}

      // 1.5-second fallback poll
      if (this.sessionPollInterval) clearInterval(this.sessionPollInterval);
      this.sessionPollInterval = setInterval(async () => {
        if (!this.currentCallId) {
          if (this.sessionPollInterval) clearInterval(this.sessionPollInterval);
          this.sessionPollInterval = null;
          return;
        }
        try {
          const { data, error } = await supabase
            .from('calls')
            .select('*')
            .eq('id', this.currentCallId)
            .single();

          if (!error && data) {
            handleReceiverRowUpdate(data);
          }
        } catch (pollErr) {}
      }, 1500);
    }

    return { success: true };
  }

  /**
   * Helper for incoming call modals to dismiss immediately if caller cancels while ringing
   */
  listenToCallStatus(callId, callback) {
    if (!callId || !isSupabaseConfigured() || !supabase) return () => {};
    const channel = supabase.channel(`call_status_${callId}`);
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`
        },
        (payload) => {
          const row = payload.new;
          if (row && (row.status === 'ended' || row.status === 'rejected')) {
            callback(row.status);
          }
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('calls')
          .select('status')
          .eq('id', callId)
          .single();
        if (data && (data.status === 'ended' || data.status === 'rejected')) {
          clearInterval(interval);
          callback(data.status);
        }
      } catch (e) {}
    }, 1500);

    return () => {
      clearInterval(interval);
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }

  /**
   * Ending / Declining Call:
   * Updating status to 'rejected' or 'ended' immediately closes the call UI
   * and stops media tracks on both devices.
   */
  async declineCall({ callData, reason = 'rejected' }) {
    const cId = callData?.callId || callData?.id || this.currentCallId;
    console.log('[WebRTC] Declining call in public.calls:', cId);

    if (isSupabaseConfigured() && supabase && cId) {
      try {
        await supabase
          .from('calls')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', cId);
      } catch (e) {
        console.warn('[WebRTC] Error declining call in DB:', e);
      }
    }

    this.onCallStatusChangeCallback?.('rejected');
    this.cleanupCallState(false);
  }

  async endCall() {
    const cId = this.currentCallId;
    console.log('[WebRTC] Ending call in public.calls:', cId);

    if (isSupabaseConfigured() && supabase && cId) {
      try {
        await supabase
          .from('calls')
          .update({
            status: 'ended',
            updated_at: new Date().toISOString()
          })
          .eq('id', cId);
      } catch (e) {
        console.warn('[WebRTC] Error ending call in DB:', e);
      }
    }

    this.onCallStatusChangeCallback?.('ended');
    this.cleanupCallState(false);
  }

  cleanupCallState(preserveLocalTracks = false) {
    if (this.sessionPollInterval) {
      clearInterval(this.sessionPollInterval);
      this.sessionPollInterval = null;
    }
    if (this.candidateSyncTimeout) {
      clearTimeout(this.candidateSyncTimeout);
      this.candidateSyncTimeout = null;
    }
    if (this.activeCallChannel) {
      try {
        this.activeCallChannel.unsubscribe();
      } catch (e) {}
      this.activeCallChannel = null;
    }
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
          try {
            t.stop();
          } catch (e) {}
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
    this.localCallerCandidates = [];
    this.localReceiverCandidates = [];
    this.processedRemoteCandidateSignatures = new Set();
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
