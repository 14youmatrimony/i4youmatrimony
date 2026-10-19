import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';

/**
 * Reliable public Google STUN servers for robust NAT traversal
 */
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
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
    this.invitationChannels = [];
    this.mediaPromise = null;
    this.hardwareError = null;

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
   * Helper to normalize user identifiers
   */
  getUserIdentifiers(userOrId) {
    if (!userOrId) return [];
    if (typeof userOrId === 'string') return [userOrId];
    const ids = [];
    if (userOrId.id) ids.push(String(userOrId.id));
    if (userOrId.register_id && !ids.includes(String(userOrId.register_id))) {
      ids.push(String(userOrId.register_id));
    }
    if (userOrId.registerId && !ids.includes(String(userOrId.registerId))) {
      ids.push(String(userOrId.registerId));
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

    if (!isSupabaseConfigured() || !supabase) {
      console.log('[WebRTC] Supabase not configured, listening via BroadcastChannel');
      return null;
    }

    ids.forEach((id) => {
      try {
        const inboxChannelName = `user-call-inbox-${id}`;
        const channel = supabase.channel(inboxChannelName, {
          config: { broadcast: { self: false } }
        });

        const handleIncoming = async ({ payload }) => {
          if (!payload) return;
          console.log(`[WebRTC] Received incoming call invite on ${inboxChannelName}:`, payload);
          // Signaling security barrier: Drop call immediately if interest is not accepted
          const authCheck = await interestService.verifyCallAuthorization(userOrId, payload.caller);
          if (!authCheck.authorized) {
            console.warn('[WebRTC Signaling Security] Dropped unauthorized incoming call invite from:', payload.caller?.id, authCheck.reason);
            return;
          }
          if (this.inboxCallback) {
            this.inboxCallback(payload);
          }
        };

        // Listen for both event conventions
        channel
          .on('broadcast', { event: 'incoming-call' }, handleIncoming)
          .on('broadcast', { event: 'call-user' }, handleIncoming)
          .subscribe((status) => {
            console.log(`[WebRTC] Inbox subscription for ID [${id}] status:`, status);
          });

        this.inboxChannels.push(channel);
      } catch (err) {
        console.warn(`[WebRTC] Failed to subscribe to inbox for ID [${id}]:`, err);
      }
    });

    return this.inboxChannels;
  }

  unsubscribeUserInbox() {
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
      if (!payload) return;
      const targetId = String(payload.calleeId);
      const isTarget = this.listeningUserIds && this.listeningUserIds.some((id) => String(id) === targetId);
      if (isTarget) {
        // Signaling security barrier for cross-tab invitations
        interestService.verifyCallAuthorization(targetId, payload.caller).then((authCheck) => {
          if (!authCheck.authorized) {
            console.warn('[WebRTC CrossTab Signaling Security] Dropped unauthorized incoming call invite from:', payload.caller?.id, authCheck.reason);
            return;
          }
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
   * Acquire camera/microphone stream with concurrency lock and graceful fallbacks
   */
  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    // If a request is already in-flight, return the existing promise to prevent device locking
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
        // Stop outdated tracks before re-requesting
        this.localStream.getTracks().forEach((t) => t.stop());
        this.localStream = null;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[WebRTC] getUserMedia is not supported in this browser environment');
        this.hardwareError = 'unsupported';
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
            return null;
          }
        }
      }

      // Video call: request high-quality video (1280x720) with graceful fallbacks
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

      // If combined video+audio failed, try falling back to audio-only so the call can still connect
      if (!stream) {
        console.warn('[WebRTC] Camera unavailable or permission denied, falling back to audio-only');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.hardwareError = 'camera_denied';
        } catch (err) {
          console.error('[WebRTC] Both camera and microphone are unavailable:', err);
          this.hardwareError = 'hardware_unavailable';
          return null;
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
   * Initialize RTCPeerConnection with Google STUN servers and event tracking
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
      console.log(`[WebRTC ontrack] Received remote track: kind=${event.track.kind}, id=${event.track.id}, readyState=${event.track.readyState}`);

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
      if (event.candidate) {
        const candidatePayload = { candidate: event.candidate.toJSON() };
        console.log('[WebRTC onicecandidate] Generated candidate:', event.candidate.candidate?.slice(0, 50));
        if (this.activeSessionChannel && this.isChannelSubscribed) {
          this.sendSessionBroadcast('webrtc-ice-candidate', candidatePayload);
          this.sendSessionBroadcast('ice-candidate', candidatePayload);
        } else {
          this.outgoingIceCandidateQueue.push(candidatePayload);
        }
      } else {
        console.log('[WebRTC onicecandidate] ICE candidate gathering complete');
      }
    };

    // State Change Handlers for transparent debugging
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection ? this.peerConnection.connectionState : 'closed';
      console.log(`[WebRTC] Connection state: %c${state.toUpperCase()}`, 'font-weight: bold; color: #10B981');
      if (state === 'connected') {
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

    this.peerConnection.onsignalingstatechange = () => {
      const sigState = this.peerConnection ? this.peerConnection.signalingState : 'closed';
      console.log(`[WebRTC] Signaling state: ${sigState}`);
    };

    this.peerConnection.onicegatheringstatechange = () => {
      const gatherState = this.peerConnection ? this.peerConnection.iceGatheringState : 'closed';
      console.log(`[WebRTC] ICE gathering state: ${gatherState}`);
    };

    return this.peerConnection;
  }

  handleCallAcceptedEvent() {
    console.log('[WebRTC] Callee accepted call. Creating WebRTC offer...');
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
    // Normalize callType: 'voice' -> 'audio'
    const normalizedCallType = (callType === 'video') ? 'video' : 'audio';

    this.isInitiator = true;
    this.callType = normalizedCallType;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;

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

    // 4. Send call invitation payload to callee's inbox channels and BroadcastChannel
    const calleeIds = this.getUserIdentifiers(callee);
    const invitePayload = {
      callId: this.currentCallId,
      channelName: sessionChannelName,
      callType: this.callType,
      caller: {
        id: caller.id,
        register_id: caller.register_id || caller.registerId,
        name: caller.name,
        photo: caller.photo || caller.photo_url,
        city: caller.city || caller.district,
        profession: caller.profession
      },
      calleeId: callee.id || callee.register_id || callee.registerId,
      timestamp: Date.now()
    };

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

      // Supabase Realtime broadcast across all callee ID inboxes
      if (isSupabaseConfigured() && supabase) {
        calleeIds.forEach((id) => {
          try {
            const inboxChannelName = `user-call-inbox-${id}`;
            const inboxChannel = supabase.channel(inboxChannelName);
            inboxChannel.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: invitePayload
            }).catch(() => {});
            inboxChannel.send({
              type: 'broadcast',
              event: 'call-user',
              payload: invitePayload
            }).catch(() => {});
            this.invitationChannels.push(inboxChannel);
          } catch (e) {}
        });
      }
    };

    // Subscribe to session channel
    return new Promise((resolve) => {
      if (!this.activeSessionChannel) {
        this.isChannelSubscribed = true;
        dispatchInvitation();
        // Periodic retry for up to 30 seconds
        let attempts = 0;
        this.broadcastInterval = setInterval(() => {
          attempts += 1;
          if (attempts > 9 || !this.currentCallId) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
          } else {
            dispatchInvitation();
          }
        }, 3000);

        resolve({
          callId: this.currentCallId,
          channelName: sessionChannelName,
          localStream: this.localStream
        });
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

          dispatchInvitation();

          let attempts = 0;
          this.broadcastInterval = setInterval(() => {
            attempts += 1;
            if (attempts > 9 || !this.currentCallId || !this.activeSessionChannel) {
              clearInterval(this.broadcastInterval);
              this.broadcastInterval = null;
            } else {
              dispatchInvitation();
            }
          }, 3000);

          resolve({
            callId: this.currentCallId,
            channelName: sessionChannelName,
            localStream: this.localStream
          });
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

    // Acquire local media & peer connection with tracks
    await this.initLocalMedia(this.callType);
    this.initPeerConnection();

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

    const sendAcceptedAck = async () => {
      const ackPayload = {
        callId: this.currentCallId,
        responderId: currentUser?.id
      };
      await this.sendSessionBroadcast('call-accepted', ackPayload);
      await this.sendSessionBroadcast('answer-call', ackPayload);
    };

    return new Promise((resolve) => {
      if (!this.activeSessionChannel) {
        this.isChannelSubscribed = true;
        sendAcceptedAck();
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }
        resolve({
          callId: this.currentCallId,
          localStream: this.localStream
        });
        return;
      }

      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Receiver joined session channel:', sessionChannelName);
          this.isChannelSubscribed = true;

          await sendAcceptedAck();

          if (this.onCallStatusChangeCallback) {
            this.onCallStatusChangeCallback('connected');
          }

          resolve({
            callId: this.currentCallId,
            localStream: this.localStream
          });
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

      await this.sendSessionBroadcast('webrtc-offer', { sdp: offer });
      await this.sendSessionBroadcast('call-made', { sdp: offer });
    } catch (err) {
      console.error('[WebRTC] Error creating or sending offer:', err);
    }
  }

  /**
   * Callee handles SDP Offer and responds with SDP Answer
   */
  async handleRemoteOffer(offerSdp) {
    if (!this.peerConnection) {
      this.initPeerConnection();
    }
    if (!this.localStream) {
      await this.initLocalMedia(this.callType);
    }
    this.attachTracksToPeerConnection();

    try {
      console.log('[WebRTC] Setting remote description from Offer...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Drain any queued ICE candidates received before remote description was set
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Successfully added queued ICE candidate');
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

      await this.sendSessionBroadcast('webrtc-answer', { sdp: answer });
    } catch (err) {
      console.error('[WebRTC] Error handling remote offer:', err);
    }
  }

  /**
   * Caller handles SDP Answer
   */
  async handleRemoteAnswer(answerSdp) {
    if (!this.peerConnection) return;
    try {
      this.attachTracksToPeerConnection();
      if (this.peerConnection.signalingState !== 'stable') {
        console.log('[WebRTC] Setting remote description from Answer...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      }

      // Drain queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Successfully added queued ICE candidate in answer handler');
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
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
        console.log('[WebRTC] Added remote ICE candidate');
      } else {
        this.iceCandidateQueue.push(candidateData);
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
    this.hardwareError = null;
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
