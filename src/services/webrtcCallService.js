import { supabase, isSupabaseConfigured } from './supabase.js';
import { interestService } from './interestService.js';

/**
 * Robust STUN and TURN server configuration.
 * Includes Google & Cloudflare STUN servers, plus open-source/Metered TURN relay servers
 * to enable media traversal across mobile 4G/5G, carrier-grade NATs, and restrictive firewalls.
 */
export const getRTCConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_URL) {
    iceServers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    });
  } else {
    // Free open-source TURN relay template for NAT/firewall traversal on mobile networks
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
    iceCandidatePoolSize: 10
  };
};

const RTC_CONFIG = getRTCConfig();

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

    // Filter rule: must target one of my registered identifiers
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
      this.onCallStatusChangeCallback?.('connected');
      try {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: this.callType === 'video'
        });
        await this.peerConnection.setLocalDescription(offer);
        await this.sendSignal('webrtc-offer', { sdp: offer });
      } catch (e) {
        console.error('[WebRTC] Create offer error:', e);
      }
    }
    // 3. SDP Offer (Callee handles caller offer -> sends SDP answer)
    else if (payload.type === 'webrtc-offer' && this.peerConnection && payload.data?.sdp) {
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
      } catch (e) {
        console.error('[WebRTC] Handle offer error:', e);
      }
    }
    // 4. SDP Answer (Caller handles callee answer)
    else if (payload.type === 'webrtc-answer' && this.peerConnection && payload.data?.sdp) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data.sdp));
        this.isRemoteDescriptionSet = true;
        await this.flushIceCandidates();
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

    if (this.peerConnection && this.isRemoteDescriptionSet && this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC] addIceCandidate failed, queueing:', err.message);
        this.iceCandidateQueue.push(candidateInit);
      }
    } else {
      this.iceCandidateQueue.push(candidateInit);
    }
  }

  async flushIceCandidates() {
    if (!this.peerConnection || !this.isRemoteDescriptionSet || !this.peerConnection.remoteDescription) return;
    const queue = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];
    for (const c of queue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(c));
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
        this.peerConnection.close();
      } catch (e) {}
    }
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    this.isRemoteDescriptionSet = false;
    this.iceCandidateQueue = [];

    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal('ice-candidate', { candidate: e.candidate });
      }
    };

    this.peerConnection.ontrack = (e) => {
      console.log('[WebRTC] ontrack received track:', e.track?.kind, 'stream count:', e.streams?.length);
      if (e.streams && e.streams[0]) {
        this.remoteStream = e.streams[0];
      } else {
        if (!this.remoteStream) this.remoteStream = new MediaStream();
        this.remoteStream.addTrack(e.track);
      }
      this.onRemoteStreamCallback?.(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] PeerConnection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.onCallStatusChangeCallback?.('connected');
      }
    };
  }

  createSyntheticTrack(kind = 'audio') {
    try {
      if (kind === 'audio') {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const ctx = new Ctx();
        const dst = ctx.createMediaStreamDestination();
        ctx.createOscillator().connect(dst);
        const t = dst.stream.getAudioTracks()[0];
        if (t) {
          t.enabled = false;
          return t;
        }
      } else if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 640;
        c.height = 480;
        return c.captureStream ? c.captureStream(10).getVideoTracks()[0] : null;
      }
    } catch (e) {}
    return null;
  }

  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    this.hardwareError = null;
    const isVideo = callType === 'video';

    // If active stream already exists with requested kind, reuse it
    if (this.localStream) {
      const liveAudio = this.localStream.getAudioTracks().filter(t => t.readyState === 'live');
      const liveVideo = this.localStream.getVideoTracks().filter(t => t.readyState === 'live');
      if (liveAudio.length > 0 && (!isVideo || liveVideo.length > 0)) {
        return this.localStream;
      }
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.hardwareError = 'hardware_unavailable';
      const s = new MediaStream();
      const a = this.createSyntheticTrack('audio');
      const v = isVideo ? this.createSyntheticTrack('video') : null;
      if (a) s.addTrack(a);
      if (v) s.addTrack(v);
      this.localStream = s;
      return s;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo ? { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      return this.localStream;
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed with constraints, trying fallback:', err.name);
      if (isVideo) {
        try {
          this.hardwareError = 'camera_denied';
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const v = this.createSyntheticTrack('video');
          if (v) this.localStream.addTrack(v);
          return this.localStream;
        } catch (e) {
          this.hardwareError = 'permission_denied';
        }
      } else {
        this.hardwareError = 'permission_denied';
      }

      const s = new MediaStream();
      const a = this.createSyntheticTrack('audio');
      const v = isVideo ? this.createSyntheticTrack('video') : null;
      if (a) s.addTrack(a);
      if (v) s.addTrack(v);
      this.localStream = s;
      return s;
    }
  }

  async requestMediaAccess(callType = 'audio', facingMode = 'user') {
    const stream = await this.initLocalMedia(callType, facingMode);
    if (this.peerConnection && stream) {
      const senders = this.peerConnection.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track).catch(() => {});
        else this.peerConnection.addTrack(track, stream);
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
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;

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

    // 1. Acquire local media before creating RTCPeerConnection
    await this.initLocalMedia(callType);

    // 2. Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // 3. Attach all local tracks to peerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
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
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;

    this.setSelfUser(currentUser);
    this.currentCallId = callData.callId;
    this.remoteUserId = String(callData.callerId || callData.caller?.id || callData.senderId);
    this.callType = callData.callType || 'audio';
    this.isCaller = false;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    onStatusChange?.('connected');

    // 1. Acquire local media before creating RTCPeerConnection
    await this.initLocalMedia(this.callType);

    // 2. Initialize RTCPeerConnection with STUN & TURN
    this.createPeerConnection();

    // 3. Attach all local tracks to peerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          this.peerConnection.addTrack(track, this.localStream);
        } catch (e) {
          console.warn('[WebRTC] addTrack warning:', e);
        }
      });
    }

    // 4. Emit call-accepted back to caller
    await this.sendSignal('call-accepted', { callId: this.currentCallId });
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
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
  }

  cleanup() {
    this.cleanupCallState();
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
