import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';

/**
 * Robust STUN and TURN server configuration with unified-plan semantics.
 * Includes Google STUN servers and open-source TURN relay servers (UDP/TCP)
 * to ensure media flow across mobile 4G/5G, restrictive firewalls, and carrier-grade NATs.
 */
export const getRTCConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_URL) {
    iceServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    });
  } else {
    // Open-source TURN relay template with TCP/UDP transports for mobile traversal
    iceServers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
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
 * Audio Routing Helper for Loudspeaker & Speakerphone Management
 * Handles audio output routing and ensures sound is not routed to a dead earpiece.
 */
export const AudioRoutingHelper = {
  isSpeakerOn: true,
  audioContext: null,

  async setSpeakerphoneOn(enable = true, mediaElement = null) {
    this.isSpeakerOn = enable;
    console.log('[WebRTC AudioRouting] setSpeakerphoneOn:', enable);

    // 1. If media element supports setSinkId, select the appropriate output device
    if (mediaElement && typeof mediaElement.setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        if (enable) {
          const speaker = audioOutputs.find(d => 
            d.label.toLowerCase().includes('speaker') || 
            d.label.toLowerCase().includes('loudspeaker') ||
            d.deviceId === 'speaker'
          );
          if (speaker) {
            await mediaElement.setSinkId(speaker.deviceId);
            console.log('[WebRTC AudioRouting] setSinkId selected loudspeaker:', speaker.label);
            return true;
          } else if (audioOutputs.length > 0) {
            await mediaElement.setSinkId('');
          }
        } else {
          const receiver = audioOutputs.find(d => 
            d.label.toLowerCase().includes('earpiece') || 
            d.label.toLowerCase().includes('receiver') || 
            d.label.toLowerCase().includes('phone')
          );
          if (receiver) {
            await mediaElement.setSinkId(receiver.deviceId);
            console.log('[WebRTC AudioRouting] setSinkId selected earpiece:', receiver.label);
            return true;
          }
        }
      } catch (err) {
        console.warn('[WebRTC AudioRouting] setSinkId notice:', err);
      }
    }

    // 2. Ensure AudioContext is alive to prevent browser muting
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
    this.iceCandidateQueue = [];
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
      await new Promise(r => setTimeout(r, 100));
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
    const isTarget = this.myIds.includes(String(payload.targetId)) ||
      (Array.isArray(payload.data?.targetIds) && payload.data.targetIds.some(id => this.myIds.includes(String(id))));
    if (!isTarget || this.myIds.includes(String(payload.senderId))) return;

    // 1. Incoming Call Invitation
    if (payload.type === 'incoming-call') {
      if (!payload.callId || this.handledCallIds.has(payload.callId)) return;
      this.handledCallIds.add(payload.callId);
      try {
        const auth = await interestService.verifyCallAuthorization(this.currentUser, payload.data?.caller || { id: payload.senderId });
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
      console.log('[WebRTC] Callee accepted call. Creating SDP offer...');
      this.onCallStatusChangeCallback?.('connected');
      try {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.callType === 'video'
        });
        await this.peerConnection.setLocalDescription(offer);
        await this.sendSignal('webrtc-offer', { sdp: offer });
        console.log('[WebRTC] SDP offer sent successfully.');
      } catch (e) {
        console.error('[WebRTC] Create offer error:', e);
      }
    }
    // 3. SDP Offer (Callee handles caller offer -> sets remote description -> sends SDP answer)
    else if (payload.type === 'webrtc-offer' && this.peerConnection && payload.data?.sdp) {
      console.log('[WebRTC] Received SDP offer. Setting remote description...');
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
        this.isRemoteDescriptionSet = true;
        await this.flushIceCandidates();

        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.callType === 'video'
        });
        await this.peerConnection.setLocalDescription(answer);
        await this.sendSignal('webrtc-answer', { sdp: answer });
        console.log('[WebRTC] SDP answer created and sent.');
      } catch (e) {
        console.error('[WebRTC] Handle offer error:', e);
      }
    }
    // 4. SDP Answer (Caller handles callee answer -> sets remote description)
    else if (payload.type === 'webrtc-answer' && this.peerConnection && payload.data?.sdp) {
      console.log('[WebRTC] Received SDP answer. Setting remote description...');
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
        this.isRemoteDescriptionSet = true;
        await this.flushIceCandidates();
        console.log('[WebRTC] Remote description set and ICE candidates flushed on caller.');
      } catch (e) {
        console.error('[WebRTC] Handle answer error:', e);
      }
    }
    // 5. ICE Candidate
    else if (payload.type === 'ice-candidate') {
      await this.addIceCandidateSafe(payload.data?.candidate);
    }
    // 6. Call Ended / Declined
    else if (payload.type === 'call-ended' || payload.type === 'call-declined') {
      this.onCallStatusChangeCallback?.(payload.type === 'call-declined' ? 'declined' : 'ended');
      this.cleanupCallState();
    }
  }

  async addIceCandidateSafe(candidateData) {
    if (!candidateData) return;
    const candidateInit = typeof candidateData === 'string' ? { candidate: candidateData } : candidateData;
    if (!candidateInit.candidate && candidateInit.candidate !== '') return;

    const remoteDesc = this.peerConnection?.remoteDescription || 
      (typeof this.peerConnection?.getRemoteDescription === 'function' ? this.peerConnection.getRemoteDescription() : null);

    if (this.peerConnection && remoteDesc && this.isRemoteDescriptionSet) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate failed, queueing candidate:', err?.message);
        this.iceCandidateQueue.push(candidateInit);
      }
    } else {
      // Buffer incoming ICE candidates in an array if remote description is null
      this.iceCandidateQueue.push(candidateInit);
    }
  }

  async flushIceCandidates() {
    if (!this.peerConnection) return;
    const remoteDesc = this.peerConnection.remoteDescription || 
      (typeof this.peerConnection.getRemoteDescription === 'function' ? this.peerConnection.getRemoteDescription() : null);
    if (!remoteDesc) return;

    const queue = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];

    for (const candidate of queue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] flush candidate notice:', e);
      }
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
    this.iceCandidateQueue = [];

    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal('ice-candidate', { candidate: e.candidate });
      }
    };

    this.peerConnection.ontrack = (e) => {
      console.log('[WebRTC] ontrack event triggered. Track kind:', e.track?.kind, 'streams:', e.streams?.length);
      let stream = (e.streams && e.streams[0]) ? e.streams[0] : null;
      if (!stream) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(e.track);
        stream = this.remoteStream;
      } else {
        this.remoteStream = stream;
      }

      if (e.track) {
        e.track.enabled = true;
      }

      // Trigger UI state rebuild (calls setState in React components)
      this.onRemoteStreamCallback?.(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] PeerConnection state:', state);
      if (state === 'connected') {
        this.onCallStatusChangeCallback?.('connected');
      } else if (state === 'failed' || state === 'closed') {
        console.warn('[WebRTC] PeerConnection entered', state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  /**
   * Strict Runtime Permission Flow
   * Explicitly requests Microphone and Camera permissions before creating SDP Offer/Answer.
   * Ensures active localStream with live tracks is acquired.
   */
  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    const isVideo = callType === 'video';

    // 1. Check if we already have an active, live localStream with required tracks
    if (this.localStream) {
      const liveAudio = this.localStream.getAudioTracks().filter(t => t.readyState === 'live');
      const liveVideo = this.localStream.getVideoTracks().filter(t => t.readyState === 'live');
      if (liveAudio.length > 0 && (!isVideo || liveVideo.length > 0)) {
        console.log('[WebRTC] Reusing existing live local stream');
        return this.localStream;
      }
    }

    // 2. Prevent concurrent duplicate getUserMedia requests
    if (this.mediaAcquisitionPromise) {
      return this.mediaAcquisitionPromise;
    }

    this.mediaAcquisitionPromise = (async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia is not supported on this browser or environment');
        }

        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        };

        const videoConstraints = isVideo ? {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        } : false;

        console.log('[WebRTC] Requesting media permissions at call action:', { audio: audioConstraints, video: videoConstraints });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints
        });

        // Verify active tracks
        const audioTracks = stream.getAudioTracks().filter(t => t.readyState === 'live');
        const videoTracks = stream.getVideoTracks().filter(t => t.readyState === 'live');
        if (audioTracks.length === 0 && (!isVideo || videoTracks.length === 0)) {
          throw new Error('No active media tracks acquired');
        }

        this.localStream = stream;
        this.hardwareError = null;
        console.log('[WebRTC] Local media stream acquired. Audio tracks:', audioTracks.length, 'Video tracks:', videoTracks.length);
        return stream;
      } catch (err) {
        console.error('[WebRTC] getUserMedia failed:', err.name, err.message);
        this.hardwareError = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' 
          ? 'permission_denied' 
          : (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' ? 'hardware_unavailable' : 'media_error');
        throw err;
      } finally {
        this.mediaAcquisitionPromise = null;
      }
    })();

    return this.mediaAcquisitionPromise;
  }

  async requestMediaAccess(callType = 'audio', facingMode = 'user') {
    const stream = await this.initLocalMedia(callType, facingMode);
    if (this.peerConnection && stream) {
      const senders = this.peerConnection.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          this.peerConnection.addTrack(track, stream);
        }
      });
    }
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
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        this.localStream.addTrack(newTrack);
        const s = this.peerConnection?.getSenders().find(sn => sn.track?.kind === 'video');
        if (s) await s.replaceTrack(newTrack);
      }
      return this.localStream;
    } catch (e) {
      return this.localStream;
    }
  }

  toggleAudio(enabled) {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  toggleVideo(enabled) {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
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

  async startCall({ caller, callee, callType = 'audio', onRemoteStream, onStatusChange }) {
    this.cleanupCallState();

    this.setSelfUser(caller);
    const targetIds = [callee?.id, callee?.register_id, callee?.registerId, callee?.uid, callee?.userId].filter(Boolean).map(String);
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

    // 1. Strict Runtime Permission Flow: Explicitly request and verify active local stream
    try {
      await this.initLocalMedia(callType);
    } catch (err) {
      console.error('[WebRTC] Cannot start call without media permissions:', err);
      onStatusChange?.('permission_denied');
      return { error: 'PERMISSION_DENIED', message: 'Microphone and/or camera permission denied' };
    }

    // 2. Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // 3. Attach all local tracks to peerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          console.log('[WebRTC] Attaching local track to caller peerConnection:', track.kind, track.label);
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('[WebRTC] addTrack warning:', e);
        }
      });
    }

    // 4. Send incoming call invite to target peer
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

  async acceptCall({ callData, currentUser, onRemoteStream, onStatusChange }) {
    this.cleanupCallState();

    this.setSelfUser(currentUser);
    this.currentCallId = callData.callId;
    this.remoteUserId = String(callData.callerId || callData.caller?.id || callData.senderId);
    this.callType = callData.callType || 'audio';
    this.isCaller = false;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;

    // 1. Strict Runtime Permission Flow: Request and verify active local stream before accepting
    try {
      await this.initLocalMedia(this.callType);
    } catch (err) {
      console.error('[WebRTC] Cannot accept call without media permissions:', err);
      onStatusChange?.('permission_denied');
      return { error: 'PERMISSION_DENIED', message: 'Microphone and/or camera permission denied' };
    }

    // 2. Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // 3. Attach all local tracks to peerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          console.log('[WebRTC] Attaching local track to callee peerConnection:', track.kind, track.label);
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('[WebRTC] addTrack warning:', e);
        }
      });
    }

    // 4. Update status to connected
    onStatusChange?.('connected');

    // 5. Emit call-accepted back to caller
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
    this.cleanupCallState();
  }

  async endCall() {
    if (this.currentCallId && this.remoteUserId) {
      await this.sendSignal('call-ended', { callId: this.currentCallId });
    }
    this.cleanupCallState();
  }

  cleanupCallState() {
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
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.localStream = null;
    }
    this.remoteStream = null;
    this.currentCallId = '';
    this.remoteUserId = '';
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
    this.isCaller = false;
    this.hardwareError = null;
    this.mediaAcquisitionPromise = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
  }

  cleanup() {
    this.cleanupCallState();
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
