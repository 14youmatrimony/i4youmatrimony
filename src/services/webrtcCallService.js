import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';
import { fcmNotificationService } from './fcmNotificationService.js';

/**
 * Reliable public Google and Mozilla STUN servers for robust NAT traversal
 */
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ],
  iceCandidatePoolSize: 10
};

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.activeSessionChannel = null;
    this.inboxChannels = [];
    this.currentCallId = null;
    this.currentSessionChannelName = null;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;
    this.isInitiator = false;
    this.callType = 'audio'; // 'audio' | 'video'
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
    this.broadcastInterval = null;
    this.offerInterval = null;
    this.dbPollInterval = null;
    this.invitationChannels = [];
    this.mediaPromise = null;
    this.hardwareError = null;
    this.callHandshakeEstablished = false;
    this.isOfferSent = false;
    this.handledIncomingCallIds = new Set();
    this.listeningUserIds = [];

    // Cross-tab synchronization via BroadcastChannel for zero-latency multi-tab testing
    this.crossTabChannel = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.crossTabChannel = new BroadcastChannel('i4u_call_signaling');
        this.crossTabChannel.onmessage = (event) => {
          this.handleCrossTabMessage(event.data);
        };
      } catch (e) {
        console.warn('[WebRTC] BroadcastChannel not supported:', e);
      }
    }
  }

  /**
   * Prime audio playback on user interaction to bypass browser autoplay restrictions
   */
  primeAudioPlayback() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        // Play very short silent oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn('[WebRTC] Audio priming warning:', e);
    }
  }

  /**
   * Helper to generate synthetic silent audio track for fallback negotiation
   */
  createSilentAudioTrack() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      const track = dst.stream.getAudioTracks()[0];
      if (track) {
        track.enabled = false;
        return track;
      }
    } catch (e) {
      console.warn('[WebRTC] Silent track creation failed:', e);
    }
    return null;
  }

  /**
   * Helper to generate synthetic video track for fallback negotiation
   */
  createSilentVideoTrack() {
    try {
      if (typeof document === 'undefined') return null;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#060D17';
        ctx.fillRect(0, 0, 640, 480);
      }
      const stream = canvas.captureStream ? canvas.captureStream(10) : null;
      return stream ? stream.getVideoTracks()[0] : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Helper to normalize user identifiers
   */
  getUserIdentifiers(userOrId) {
    if (!userOrId) return [];
    if (typeof userOrId === 'string') return [userOrId.trim()].filter(Boolean);
    const ids = [];
    if (userOrId.id) ids.push(String(userOrId.id));
    if (userOrId.register_id && !ids.includes(String(userOrId.register_id))) {
      ids.push(String(userOrId.register_id));
    }
    if (userOrId.registerId && !ids.includes(String(userOrId.registerId))) {
      ids.push(String(userOrId.registerId));
    }
    if (userOrId.user_id && !ids.includes(String(userOrId.user_id))) {
      ids.push(String(userOrId.user_id));
    }
    if (userOrId.userId && !ids.includes(String(userOrId.userId))) {
      ids.push(String(userOrId.userId));
    }
    return ids;
  }

  /**
   * Listen for incoming calls for a user across all their registered IDs
   */
  subscribeToUserInbox(userOrId, onIncomingCall) {
    const ids = this.getUserIdentifiers(userOrId);
    if (!ids.length) return null;

    this.unsubscribeUserInbox();
    this.inboxCallback = onIncomingCall;
    this.listeningUserIds = ids;

    const handleIncoming = async (payload) => {
      if (!payload || !payload.callId) return;
      if (this.handledIncomingCallIds.has(payload.callId)) return;

      console.log('[WebRTC] Received incoming call invite:', payload);
      // Signaling security barrier: Drop call immediately if interest is not accepted
      const authCheck = await interestService.verifyCallAuthorization(userOrId, payload.caller);
      if (!authCheck.authorized) {
        console.warn('[WebRTC Signaling Security] Dropped unauthorized incoming call invite from:', payload.caller?.id, authCheck.reason);
        return;
      }

      this.handledIncomingCallIds.add(payload.callId);
      if (this.inboxCallback) {
        this.inboxCallback(payload);
      }
    };

    if (!isSupabaseConfigured() || !supabase) {
      console.log('[WebRTC] Supabase not configured, listening via BroadcastChannel only');
      return null;
    }

    // 1. Supabase Realtime Broadcast on user-call-inbox-${id}
    ids.forEach((id) => {
      try {
        const inboxChannelName = `user-call-inbox-${id}`;
        const channel = supabase.channel(inboxChannelName, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'incoming-call' }, ({ payload }) => handleIncoming(payload))
          .on('broadcast', { event: 'call-user' }, ({ payload }) => handleIncoming(payload))
          .subscribe((status) => {
            console.log(`[WebRTC] Inbox subscription for ID [${id}] status:`, status);
          });

        this.inboxChannels.push(channel);
      } catch (err) {
        console.warn(`[WebRTC] Failed to subscribe to inbox for ID [${id}]:`, err);
      }
    });

    // 2. Realtime Postgres Changes on 'call_requests' table
    ids.forEach((id) => {
      try {
        const dbChannel = supabase.channel(`call-req-db-${id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'call_requests',
              filter: `callee_id=eq.${id}`
            },
            (change) => {
              const rec = change.new;
              if (rec && rec.status === 'ringing') {
                handleIncoming({
                  callId: rec.id,
                  channelName: rec.channel_name,
                  callType: rec.call_type || 'audio',
                  caller: {
                    id: rec.caller_id,
                    name: rec.caller_name,
                    photo: rec.caller_photo
                  },
                  calleeId: rec.callee_id,
                  timestamp: new Date(rec.created_at).getTime()
                });
              }
            }
          )
          .subscribe();
        this.inboxChannels.push(dbChannel);
      } catch (e) {}
    });

    // 3. Fallback active polling on 'call_requests' table (every 2.5s)
    this.dbPollInterval = setInterval(async () => {
      try {
        if (!isSupabaseConfigured() || !supabase) return;
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { data, error } = await supabase
          .from('call_requests')
          .select('*')
          .in('callee_id', ids)
          .eq('status', 'ringing')
          .gte('created_at', oneMinuteAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const rec = data[0];
          if (!this.handledIncomingCallIds.has(rec.id)) {
            handleIncoming({
              callId: rec.id,
              channelName: rec.channel_name,
              callType: rec.call_type || 'audio',
              caller: {
                id: rec.caller_id,
                name: rec.caller_name,
                photo: rec.caller_photo
              },
              calleeId: rec.callee_id,
              timestamp: new Date(rec.created_at).getTime()
            });
          }
        }
      } catch (e) {}
    }, 2500);

    return this.inboxChannels;
  }

  unsubscribeUserInbox() {
    if (this.dbPollInterval) {
      clearInterval(this.dbPollInterval);
      this.dbPollInterval = null;
    }
    if (this.inboxChannels && this.inboxChannels.length && supabase) {
      this.inboxChannels.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      });
      this.inboxChannels = [];
    }
    this.inboxCallback = null;
    this.listeningUserIds = [];
  }

  /**
   * Handle cross-tab messages for testing between two tabs on same device
   */
  handleCrossTabMessage(data) {
    if (!data || !data.event) return;

    // Incoming call invitation
    if (data.event === 'incoming-call' || data.event === 'call-user') {
      const payload = data.payload;
      if (!payload || !payload.callId) return;
      const targetId = String(payload.calleeId);
      const isTarget = this.listeningUserIds && this.listeningUserIds.some((id) => String(id) === targetId);
      if (isTarget) {
        if (this.handledIncomingCallIds.has(payload.callId)) return;
        interestService.verifyCallAuthorization(targetId, payload.caller).then((authCheck) => {
          if (!authCheck.authorized) {
            console.warn('[WebRTC CrossTab Signaling Security] Dropped unauthorized incoming call invite from:', payload.caller?.id, authCheck.reason);
            return;
          }
          this.handledIncomingCallIds.add(payload.callId);
          console.log('[WebRTC CrossTab] Received incoming call for matching authorized user:', payload);
          if (this.inboxCallback) {
            this.inboxCallback(payload);
          }
        });
      }
      return;
    }

    // Call session events
    if (this.currentCallId && data.callId === this.currentCallId) {
      if (data.event === 'call-accepted' || data.event === 'answer-call') {
        this.handleCallAcceptedEvent();
      } else if (data.event === 'call-declined' || data.event === 'call-rejected') {
        this.handleCallDeclinedEvent(data.payload?.reason);
      } else if (data.event === 'call-ended') {
        this.handleCallEndedEvent();
      } else if (data.event === 'webrtc-offer' || data.event === 'call-made') {
        if (!this.isInitiator && data.payload?.sdp) {
          this.handleRemoteOffer(data.payload.sdp);
        }
      } else if (data.event === 'webrtc-answer') {
        if (this.isInitiator && data.payload?.sdp) {
          this.handleRemoteAnswer(data.payload.sdp);
        }
      } else if (data.event === 'webrtc-ice-candidate' || data.event === 'ice-candidate') {
        if (data.payload?.candidate) {
          this.handleRemoteIceCandidate(data.payload.candidate);
        }
      }
    }
  }

  /**
   * Send a signaling event via both Supabase Realtime session channel and BroadcastChannel
   */
  async sendSessionBroadcast(event, payload = {}) {
    const message = {
      callId: this.currentCallId,
      event,
      payload
    };

    // 1. Cross-tab sync
    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage(message);
      } catch (e) {}
    }

    // 2. Supabase Realtime
    if (this.activeSessionChannel && this.isChannelSubscribed) {
      try {
        await this.activeSessionChannel.send({
          type: 'broadcast',
          event,
          payload
        });
      } catch (err) {
        console.warn(`[WebRTC] Failed to send broadcast [${event}]:`, err);
      }
    }
  }

  /**
   * Attach all local tracks to peer connection
   */
  attachTracksToPeerConnection() {
    if (!this.peerConnection || !this.localStream) return;
    const currentSenders = this.peerConnection.getSenders();
    this.localStream.getTracks().forEach((track) => {
      const existingSender = currentSenders.find(
        (s) => s.track && s.track.kind === track.kind
      );
      if (existingSender) {
        existingSender.replaceTrack(track).catch((e) => console.warn('[WebRTC] replaceTrack error:', e));
      } else {
        try {
          this.peerConnection.addTrack(track, this.localStream);
          console.log(`[WebRTC] Attached local track (${track.kind}) to RTCPeerConnection`);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      }
    });
  }

  /**
   * Direct media re-request from user gesture (e.g. tapping "Allow Microphone / Camera")
   */
  async requestMediaAccess(callType = 'audio', facingMode = 'user') {
    const isVideo = callType === 'video';
    try {
      let newStream;
      if (isVideo) {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: { ideal: facingMode } }
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
      }

      this.hardwareError = null;

      // Replace existing tracks on peer connection senders seamlessly
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        newStream.getTracks().forEach((newTrack) => {
          const sender = senders.find(s => s.track && s.track.kind === newTrack.kind);
          if (sender) {
            sender.replaceTrack(newTrack).catch((e) => console.warn('[WebRTC] replaceTrack error:', e));
          } else {
            try {
              this.peerConnection.addTrack(newTrack, newStream);
            } catch (e) {}
          }
        });
      }

      // Stop old tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
      }
      this.localStream = newStream;
      return newStream;
    } catch (err) {
      console.warn('[WebRTC] requestMediaAccess failed:', err);
      this.hardwareError = err.name === 'NotAllowedError' ? 'permission_denied' : 'device_unavailable';
      throw err;
    }
  }

  /**
   * Acquire camera/microphone stream with graceful fallback to silent track so signaling always succeeds
   */
  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    if (this.mediaPromise) {
      return this.mediaPromise;
    }

    this.mediaPromise = (async () => {
      const isVideo = callType === 'video';

      // If localStream already exists and satisfies requirements, reuse it
      if (this.localStream) {
        const hasVideo = this.localStream.getVideoTracks().some(t => t.readyState === 'live');
        const hasAudio = this.localStream.getAudioTracks().some(t => t.readyState === 'live');
        if ((!isVideo && hasAudio) || (isVideo && hasVideo && hasAudio)) {
          this.attachTracksToPeerConnection();
          return this.localStream;
        }
        this.localStream.getTracks().forEach((t) => t.stop());
        this.localStream = null;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[WebRTC] getUserMedia is not supported in this browser environment');
        this.hardwareError = 'unsupported';
        const fallbackTracks = [];
        const silentAudio = this.createSilentAudioTrack();
        if (silentAudio) fallbackTracks.push(silentAudio);
        if (isVideo) {
          const silentVideo = this.createSilentVideoTrack();
          if (silentVideo) fallbackTracks.push(silentVideo);
        }
        if (fallbackTracks.length) {
          this.localStream = new MediaStream(fallbackTracks);
          this.attachTracksToPeerConnection();
          return this.localStream;
        }
        return null;
      }

      // Voice call: strictly request audio only
      if (!isVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          this.localStream = stream;
          this.hardwareError = null;
          this.attachTracksToPeerConnection();
          console.log('[WebRTC] Successfully acquired audio stream');
          return stream;
        } catch (err) {
          console.warn('[WebRTC] Audio constraints failed, trying basic audio:', err);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.localStream = stream;
            this.hardwareError = null;
            this.attachTracksToPeerConnection();
            return stream;
          } catch (audioErr) {
            console.error('[WebRTC] Microphone permission denied or unavailable:', audioErr);
            this.hardwareError = audioErr.name === 'NotAllowedError' ? 'permission_denied' : 'device_unavailable';

            // Fallback silent audio track so WebRTC offer/answer negotiation always has an audio track
            const silentTrack = this.createSilentAudioTrack();
            if (silentTrack) {
              this.localStream = new MediaStream([silentTrack]);
              this.attachTracksToPeerConnection();
              return this.localStream;
            }
            return null;
          }
        }
      }

      // Video call: request high-quality video with graceful fallbacks
      const videoAttempts = [
        {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: facingMode || 'user' }
          }
        },
        {
          audio: true,
          video: { facingMode: { ideal: facingMode || 'user' } }
        },
        {
          audio: true,
          video: true
        }
      ];

      let stream = null;
      for (const constraints of videoAttempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) {
            console.log('[WebRTC] Successfully acquired video stream with constraints:', constraints);
            break;
          }
        } catch (err) {
          console.warn('[WebRTC] Video getUserMedia attempt failed, trying fallback:', err);
        }
      }

      // If combined video+audio failed, try falling back to audio-only + silent video
      if (!stream) {
        console.warn('[WebRTC] Camera unavailable or permission denied, falling back to audio-only');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.hardwareError = 'camera_denied';
          const silentVideo = this.createSilentVideoTrack();
          if (silentVideo) stream.addTrack(silentVideo);
        } catch (err) {
          console.error('[WebRTC] Both camera and microphone are unavailable:', err);
          this.hardwareError = err.name === 'NotAllowedError' ? 'permission_denied' : 'hardware_unavailable';
          const fallbackTracks = [];
          const silentAudio = this.createSilentAudioTrack();
          if (silentAudio) fallbackTracks.push(silentAudio);
          const silentVideo = this.createSilentVideoTrack();
          if (silentVideo) fallbackTracks.push(silentVideo);
          if (fallbackTracks.length) {
            stream = new MediaStream(fallbackTracks);
          }
        }
      } else {
        this.hardwareError = null;
      }

      this.localStream = stream;
      this.attachTracksToPeerConnection();
      return stream;
    })().finally(() => {
      this.mediaPromise = null;
    });

    return this.mediaPromise;
  }

  /**
   * Initialize RTCPeerConnection with STUN servers and event tracking
   */
  initPeerConnection() {
    if (typeof RTCPeerConnection === 'undefined') {
      console.error('[WebRTC] RTCPeerConnection is not supported in this browser');
      return null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    console.log('[WebRTC] Initializing RTCPeerConnection with STUN servers:', RTC_CONFIG.iceServers);
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();

    // Attach local media tracks
    this.attachTracksToPeerConnection();

    // Handle incoming remote media tracks (Audio & Video)
    this.peerConnection.ontrack = (event) => {
      console.log(`[WebRTC ontrack] Received remote track: kind=${event.track.kind}, id=${event.track.id}`);

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const candidatePayload = { candidate: event.candidate.toJSON() };
        console.log('[WebRTC onicecandidate] Generated candidate:', event.candidate.candidate.slice(0, 50));
        if (this.activeSessionChannel && this.isChannelSubscribed) {
          this.sendSessionBroadcast('webrtc-ice-candidate', candidatePayload);
        } else {
          this.outgoingIceCandidateQueue.push(candidatePayload);
        }
      } else {
        console.log('[WebRTC onicecandidate] ICE candidate gathering complete');
      }
    };

    // State Change Handlers
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      console.log(`[WebRTC] Connection state: %c${state.toUpperCase()}`, 'font-weight: bold; color: #10B981');
      if (state === 'connected') {
        if (this.broadcastInterval) {
          clearInterval(this.broadcastInterval);
          this.broadcastInterval = null;
        }
        if (this.offerInterval) {
          clearInterval(this.offerInterval);
          this.offerInterval = null;
        }
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended');
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection ? this.peerConnection.iceConnectionState : 'closed';
      console.log(`[WebRTC] ICE connection state: %c${iceState.toUpperCase()}`, 'font-weight: bold; color: #3B82F6');
      if (iceState === 'failed') {
        console.warn('[WebRTC] ICE connection failed. Restarting ICE...');
        if (this.isInitiator && this.peerConnection && typeof this.peerConnection.restartIce === 'function') {
          this.peerConnection.restartIce();
        }
      }
    };

    return this.peerConnection;
  }

  handleCallAcceptedEvent() {
    if (this.isOfferSent && this.peerConnection && this.peerConnection.signalingState !== 'stable') {
      console.log('[WebRTC] Offer already initiated and negotiation in progress, skipping duplicate call-accepted event');
      return;
    }
    console.log('[WebRTC] Callee accepted call. Creating WebRTC offer...');
    this.callHandshakeEstablished = true;
    this.isOfferSent = true;
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.onCallStatusChangeCallback) {
      this.onCallStatusChangeCallback('connected');
    }
    this.createAndSendOffer();
  }

  handleCallDeclinedEvent(reason = 'busy') {
    console.log('[WebRTC] Callee declined call:', reason);
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
      this.offerInterval = null;
    }
    if (this.onCallStatusChangeCallback) {
      this.onCallStatusChangeCallback('declined', reason);
    }
    this.cleanup();
  }

  handleCallEndedEvent() {
    console.log('[WebRTC] Remote user ended call');
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
      this.offerInterval = null;
    }
    if (this.onCallStatusChangeCallback) {
      this.onCallStatusChangeCallback('ended');
    }
    this.cleanup();
  }

  /**
   * Initiate an outgoing call session
   */
  async startCall({
    caller,
    callee,
    callType = 'audio',
    onRemoteStream,
    onStatusChange
  }) {
    const normalizedCallType = (callType === 'video') ? 'video' : 'audio';

    this.isInitiator = true;
    this.callType = normalizedCallType;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.callHandshakeEstablished = false;

    // 0. SIGNALING SECURITY GATE: Calling is strictly permitted only if interest status is 'accepted'
    const authCheck = await interestService.verifyCallAuthorization(caller, callee);
    if (!authCheck.authorized) {
      console.warn('[WebRTC Signaling Security] Outgoing call blocked:', authCheck.reason);
      if (onStatusChange) {
        onStatusChange('blocked', {
          error: 'CALL_BLOCKED',
          message: 'Interest not accepted by recipient',
          details: authCheck.reason,
          status: authCheck.status
        });
      }
      return {
        success: false,
        error: 'CALL_BLOCKED',
        message: 'Interest not accepted by recipient',
        details: authCheck.reason,
        status: authCheck.status
      };
    }

    this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.currentSessionChannelName = `call-session-${this.currentCallId}`;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;

    // 1. Prime audio context on caller interaction
    this.primeAudioPlayback();

    // 2. Acquire media & init RTCPeerConnection immediately
    await this.initLocalMedia(this.callType);
    this.initPeerConnection();

    // 3. Connect to Supabase Realtime session channel
    const sessionChannelName = this.currentSessionChannelName;
    if (isSupabaseConfigured() && supabase) {
      this.activeSessionChannel = supabase.channel(sessionChannelName, {
        config: { broadcast: { self: false } }
      });

      this.activeSessionChannel
        .on('broadcast', { event: 'call-accepted' }, () => this.handleCallAcceptedEvent())
        .on('broadcast', { event: 'answer-call' }, () => this.handleCallAcceptedEvent())
        .on('broadcast', { event: 'call-declined' }, ({ payload }) => this.handleCallDeclinedEvent(payload?.reason))
        .on('broadcast', { event: 'call-rejected' }, ({ payload }) => this.handleCallDeclinedEvent(payload?.reason))
        .on('broadcast', { event: 'call-ended' }, () => this.handleCallEndedEvent())
        .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
          if (payload?.sdp) {
            await this.handleRemoteAnswer(payload.sdp);
          }
        })
        .on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
          if (payload?.candidate) {
            await this.handleRemoteIceCandidate(payload.candidate);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload?.candidate) {
            await this.handleRemoteIceCandidate(payload.candidate);
          }
        });
    }

    // 4. Construct comprehensive call invitation payload
    const calleeIds = this.getUserIdentifiers(callee);
    const invitePayload = {
      callId: this.currentCallId,
      channelName: sessionChannelName,
      callType: this.callType,
      caller: {
        id: caller.id,
        register_id: caller.register_id || caller.registerId,
        registerId: caller.registerId || caller.register_id,
        user_id: caller.user_id || caller.userId || caller.id,
        name: caller.name,
        photo: caller.photo || caller.photo_url,
        city: caller.city || caller.district,
        profession: caller.profession,
        age: caller.age,
        state: caller.state
      },
      calleeId: callee.id || callee.register_id || callee.registerId,
      timestamp: Date.now()
    };

    // 5. Insert record into Supabase 'call_requests' table
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('call_requests').insert([{
          id: this.currentCallId,
          caller_id: String(caller.id || caller.register_id || caller.registerId || ''),
          callee_id: String(callee.id || callee.register_id || callee.registerId || ''),
          caller_name: caller.name || 'Member',
          caller_photo: caller.photo || caller.photo_url || '',
          call_type: this.callType,
          channel_name: sessionChannelName,
          status: 'ringing',
          created_at: new Date().toISOString()
        }]);
      } catch (err) {
        console.warn('[WebRTC] Supabase call_requests insert notice:', err);
      }
    }

    // 6. Pre-subscribe callee inbox channels and ensure 'SUBSCRIBED' state before sending broadcasts
    if (isSupabaseConfigured() && supabase) {
      this.invitationChannels = calleeIds.map((id) => {
        const inboxChannelName = `user-call-inbox-${id}`;
        const ch = supabase.channel(inboxChannelName, {
          config: { broadcast: { self: false } }
        });
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event: 'incoming-call', payload: invitePayload }).catch(() => {});
            ch.send({ type: 'broadcast', event: 'call-user', payload: invitePayload }).catch(() => {});
          }
        });
        return ch;
      });
    }

    const dispatchInvitation = () => {
      // Cross-tab broadcast for localhost / multi-tab testing
      if (this.crossTabChannel) {
        try {
          this.crossTabChannel.postMessage({
            event: 'incoming-call',
            payload: invitePayload
          });
          this.crossTabChannel.postMessage({
            event: 'call-user',
            payload: invitePayload
          });
        } catch (e) {}
      }

      // Re-broadcast on subscribed invitation channels
      if (this.invitationChannels && this.invitationChannels.length) {
        this.invitationChannels.forEach((ch) => {
          try {
            ch.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: invitePayload
            }).catch(() => {});
            ch.send({
              type: 'broadcast',
              event: 'call-user',
              payload: invitePayload
            }).catch(() => {});
          } catch (e) {}
        });
      }

      // Dispatch push notification for native background devices
      try {
        const primaryCalleeId = String(callee.id || callee.register_id || callee.registerId || '');
        if (primaryCalleeId) {
          fcmNotificationService.dispatchCallPushNotification({
            calleeId: primaryCalleeId,
            caller: invitePayload.caller,
            callType: this.callType,
            callId: this.currentCallId,
            channelName: sessionChannelName
          }).catch(() => {});
        }
      } catch (e) {}
    };

    // 7. Subscribe to session channel and begin broadcast loop
    return new Promise((resolve) => {
      const startBroadcastLoop = () => {
        dispatchInvitation();
        let attempts = 0;
        this.broadcastInterval = setInterval(() => {
          attempts += 1;
          if (attempts > 15 || !this.currentCallId || this.callHandshakeEstablished) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
          } else {
            dispatchInvitation();
          }
        }, 2500);

        resolve({
          callId: this.currentCallId,
          channelName: sessionChannelName,
          localStream: this.localStream
        });
      };

      if (!this.activeSessionChannel) {
        this.isChannelSubscribed = true;
        startBroadcastLoop();
        return;
      }

      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to session channel:', sessionChannelName);
          this.isChannelSubscribed = true;

          // Flush any queued outgoing ICE candidates
          while (this.outgoingIceCandidateQueue.length > 0) {
            const queued = this.outgoingIceCandidateQueue.shift();
            this.sendSessionBroadcast('webrtc-ice-candidate', queued);
          }

          startBroadcastLoop();
        }
      });
    });
  }

  /**
   * Accept an incoming call session
   */
  async acceptCall({
    callData,
    currentUser,
    onRemoteStream,
    onStatusChange
  }) {
    // Prime audio context immediately on the accept click
    this.primeAudioPlayback();

    const normalizedCallType = (callData.callType === 'video') ? 'video' : 'audio';

    this.isInitiator = false;
    this.callType = normalizedCallType;
    this.currentCallId = callData.callId;
    this.currentSessionChannelName = callData.channelName || `call-session-${callData.callId}`;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;
    this.callHandshakeEstablished = false;

    // Acquire local media & peer connection with tracks
    await this.initLocalMedia(this.callType);
    this.initPeerConnection();

    // Update status in call_requests database
    if (isSupabaseConfigured() && supabase && this.currentCallId) {
      try {
        await supabase
          .from('call_requests')
          .update({ status: 'accepted' })
          .eq('id', this.currentCallId);
      } catch (e) {}
    }

    const sessionChannelName = this.currentSessionChannelName;

    if (isSupabaseConfigured() && supabase) {
      this.activeSessionChannel = supabase.channel(sessionChannelName, {
        config: { broadcast: { self: false } }
      });

      this.activeSessionChannel
        .on('broadcast', { event: 'call-ended' }, () => this.handleCallEndedEvent())
        .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
          if (payload?.sdp) {
            console.log('[WebRTC] Received WebRTC Offer from caller');
            await this.handleRemoteOffer(payload.sdp);
          }
        })
        .on('broadcast', { event: 'call-made' }, async ({ payload }) => {
          if (payload?.sdp) {
            console.log('[WebRTC] Received WebRTC Offer (call-made) from caller');
            await this.handleRemoteOffer(payload.sdp);
          }
        })
        .on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
          if (payload?.candidate) {
            await this.handleRemoteIceCandidate(payload.candidate);
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload?.candidate) {
            await this.handleRemoteIceCandidate(payload.candidate);
          }
        });
    }

    const ackPayload = {
      callId: this.currentCallId,
      responderId: currentUser?.id
    };

    const sendAcceptedAck = async () => {
      await this.sendSessionBroadcast('call-accepted', ackPayload);
    };

    return new Promise((resolve) => {
      const onChannelReady = () => {
        this.isChannelSubscribed = true;
        sendAcceptedAck();

        // Send confirmation ACK up to 3 times or until offer arrives
        let ackCount = 0;
        const ackInterval = setInterval(() => {
          ackCount++;
          if (ackCount >= 3 || this.callHandshakeEstablished || !this.currentCallId) {
            clearInterval(ackInterval);
          } else {
            sendAcceptedAck();
          }
        }, 1500);

        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }

        resolve({
          callId: this.currentCallId,
          localStream: this.localStream
        });
      };

      if (!this.activeSessionChannel) {
        onChannelReady();
        return;
      }

      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Receiver joined session channel:', sessionChannelName);
          onChannelReady();
        }
      });
    });
  }

  /**
   * Decline an incoming call
   */
  async declineCall({ callData, reason = 'busy' }) {
    if (!callData) return;
    const sessionChannelName = callData.channelName || `call-session-${callData.callId}`;
    const payload = { reason, callId: callData.callId };

    if (this.crossTabChannel) {
      try {
        this.crossTabChannel.postMessage({
          callId: callData.callId,
          event: 'call-declined',
          payload
        });
        this.crossTabChannel.postMessage({
          callId: callData.callId,
          event: 'call-rejected',
          payload
        });
      } catch (e) {}
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('call_requests')
          .update({ status: 'declined', ended_at: new Date().toISOString() })
          .eq('id', callData.callId);

        const channel = supabase.channel(sessionChannelName);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'call-declined',
              payload
            }).catch(() => {});
            channel.send({
              type: 'broadcast',
              event: 'call-rejected',
              payload
            }).catch(() => {});
            setTimeout(() => {
              try { supabase.removeChannel(channel); } catch (e) {}
            }, 1000);
          }
        });
      } catch (err) {}
    }
  }

  /**
   * End current active call
   */
  async endCall() {
    await this.sendSessionBroadcast('call-ended', { timestamp: Date.now() });
    if (isSupabaseConfigured() && supabase && this.currentCallId) {
      try {
        await supabase
          .from('call_requests')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', this.currentCallId);
      } catch (e) {}
    }
    this.cleanup();
  }

  /**
   * Caller creates SDP Offer with bidirectional audio/video
   */
  async createAndSendOffer() {
    if (!this.peerConnection) {
      this.initPeerConnection();
    }
    if (!this.localStream) {
      await this.initLocalMedia(this.callType);
    }
    this.attachTracksToPeerConnection();

    try {
      const isVideo = this.callType === 'video';
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });

      console.log('[WebRTC] Created SDP Offer. Setting local description...');
      await this.peerConnection.setLocalDescription(offer);

      const offerPayload = { sdp: offer };
      await this.sendSessionBroadcast('webrtc-offer', offerPayload);
      await this.sendSessionBroadcast('call-made', offerPayload);

      // Repeat offer every 1500ms until answer is received or connected
      if (this.offerInterval) clearInterval(this.offerInterval);
      let offerTries = 0;
      this.offerInterval = setInterval(() => {
        offerTries++;
        if (offerTries > 8 || this.peerConnection?.remoteDescription || !this.currentCallId) {
          clearInterval(this.offerInterval);
          this.offerInterval = null;
        } else {
          this.sendSessionBroadcast('webrtc-offer', offerPayload);
        }
      }, 1500);
    } catch (err) {
      console.error('[WebRTC] Error creating or sending offer:', err);
    }
  }

  /**
   * Callee handles SDP Offer and responds with SDP Answer
   */
  async handleRemoteOffer(offerSdp) {
    this.callHandshakeEstablished = true;
    if (!this.peerConnection) {
      this.initPeerConnection();
    }
    if (!this.localStream) {
      await this.initLocalMedia(this.callType);
    }
    this.attachTracksToPeerConnection();

    try {
      if (this.peerConnection.remoteDescription && this.peerConnection.signalingState === 'stable') {
        console.log('[WebRTC] Peer connection already established and stable, ignoring duplicate offer');
        return;
      }

      console.log('[WebRTC] Setting remote description from Offer...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Drain any queued ICE candidates received before remote description was set
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          const rawCandidate = (candidate && candidate.candidate && typeof candidate.candidate === 'object')
            ? candidate.candidate
            : candidate;
          if (rawCandidate && (rawCandidate.candidate || typeof rawCandidate === 'string')) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(rawCandidate));
            console.log('[WebRTC] Successfully added queued ICE candidate');
          }
        } catch (e) {
          console.warn('[WebRTC] Queued ICE candidate error:', e);
        }
      }

      const isVideo = this.callType === 'video';
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });

      console.log('[WebRTC] Setting local description from Answer...');
      await this.peerConnection.setLocalDescription(answer);

      const answerPayload = { sdp: answer };
      await this.sendSessionBroadcast('webrtc-answer', answerPayload);
    } catch (err) {
      console.error('[WebRTC] Error handling remote offer:', err);
    }
  }

  /**
   * Caller handles SDP Answer
   */
  async handleRemoteAnswer(answerSdp) {
    if (!this.peerConnection) return;
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
      this.offerInterval = null;
    }
    try {
      this.attachTracksToPeerConnection();
      if (this.peerConnection.signalingState === 'have-local-offer') {
        console.log('[WebRTC] Setting remote description from Answer...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      } else {
        console.log(`[WebRTC] Skipping setRemoteDescription(answer), signalingState is ${this.peerConnection.signalingState}`);
      }

      // Drain queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          const rawCandidate = (candidate && candidate.candidate && typeof candidate.candidate === 'object')
            ? candidate.candidate
            : candidate;
          if (rawCandidate && (rawCandidate.candidate || typeof rawCandidate === 'string')) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(rawCandidate));
            console.log('[WebRTC] Successfully added queued ICE candidate in answer handler');
          }
        } catch (e) {
          console.warn('[WebRTC] Queued ICE candidate error in answer:', e);
        }
      }
    } catch (err) {
      console.error('[WebRTC] Error handling remote answer:', err);
    }
  }

  /**
   * Handle incoming remote ICE candidates
   */
  async handleRemoteIceCandidate(candidateData) {
    if (!candidateData) return;
    const candidateObj = (candidateData.candidate && typeof candidateData.candidate === 'object')
      ? candidateData.candidate
      : candidateData;
    if (!candidateObj || (!candidateObj.candidate && typeof candidateObj !== 'string')) return;

    try {
      if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        console.log('[WebRTC] Added remote ICE candidate');
      } else {
        this.iceCandidateQueue.push(candidateObj);
      }
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  /**
   * Toggle local audio track (mute/unmute microphone)
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log(`[WebRTC] Microphone ${enabled ? 'unmuted' : 'muted'}`);
    }
  }

  /**
   * Toggle local video track (camera on/off)
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log(`[WebRTC] Camera ${enabled ? 'turned on' : 'turned off'}`);
    }
  }

  /**
   * Flip camera facing mode (mobile devices)
   */
  async switchCamera(facingMode = 'user') {
    if (this.callType !== 'video' || !this.peerConnection) return null;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: facingMode }
        },
        audio: false
      });

      const oldVideoTrack = this.localStream?.getVideoTracks()[0];
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (oldVideoTrack && newVideoTrack) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }

        oldVideoTrack.stop();
        this.localStream.removeTrack(oldVideoTrack);
        this.localStream.addTrack(newVideoTrack);
        console.log(`[WebRTC] Successfully switched camera to ${facingMode}`);
      }

      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] Camera switch failed:', err);
      return null;
    }
  }

  /**
   * Cleanup streams, channels and peer connection
   */
  cleanup() {
    console.log('[WebRTC] Cleaning up call session');
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.offerInterval) {
      clearInterval(this.offerInterval);
      this.offerInterval = null;
    }
    if (this.dbPollInterval) {
      clearInterval(this.dbPollInterval);
      this.dbPollInterval = null;
    }

    if (this.invitationChannels && this.invitationChannels.length && supabase) {
      this.invitationChannels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch (e) {}
      });
      this.invitationChannels = [];
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    if (this.activeSessionChannel && supabase) {
      try {
        supabase.removeChannel(this.activeSessionChannel);
      } catch (e) {}
      this.activeSessionChannel = null;
    }

    this.currentCallId = null;
    this.currentSessionChannelName = null;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;
    this.isInitiator = false;
    this.isOfferSent = false;
    this.callHandshakeEstablished = false;
    this.hardwareError = null;
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
