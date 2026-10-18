import { supabase } from './supabase';

// High-reliability public STUN & TURN servers for seamless NAT traversal across mobile networks (Jio, Airtel, Vi, etc.)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.activeSessionChannel = null;
    this.inboxChannel = null;
    this.currentCallId = null;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;
    this.isInitiator = false;
    this.callType = 'audio'; // 'audio' | 'video'
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
    this.broadcastInterval = null;
  }

  /**
   * Listen for incoming calls for a specific user ID via Supabase Realtime Broadcast
   */
  subscribeToUserInbox(userId, onIncomingCall) {
    if (!userId || !supabase) return null;

    if (this.inboxChannel) {
      try {
        supabase.removeChannel(this.inboxChannel);
      } catch (e) {}
    }

    const inboxChannelName = `user-call-inbox-${userId}`;
    this.inboxChannel = supabase.channel(inboxChannelName, {
      config: { broadcast: { self: false } }
    });

    this.inboxChannel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (payload && onIncomingCall) {
          onIncomingCall(payload);
        }
      })
      .subscribe((status) => {
        console.log(`[WebRTC] Inbox subscription for user ${userId}:`, status);
      });

    return this.inboxChannel;
  }

  unsubscribeUserInbox() {
    if (this.inboxChannel && supabase) {
      try {
        supabase.removeChannel(this.inboxChannel);
        this.inboxChannel = null;
      } catch (e) {}
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
          console.log(`[WebRTC] Added local track (${track.kind}) to peer connection`);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      }
    });
  }

  /**
   * Acquire camera/microphone stream with progressive fallbacks
   */
  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    if (this.localStream) {
      const hasVideo = this.localStream.getVideoTracks().length > 0;
      if (callType !== 'video' || hasVideo) {
        this.attachTracksToPeerConnection();
        return this.localStream;
      }
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[WebRTC] getUserMedia not supported in this environment');
      return null;
    }

    const isVideo = callType === 'video';

    // Progressive attempts for video + audio
    const attemptConstraints = isVideo ? [
      {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } }
      },
      {
        audio: true,
        video: { facingMode: { ideal: facingMode } }
      },
      {
        audio: true,
        video: true
      }
    ] : [
      {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      },
      {
        audio: true
      }
    ];

    let stream = null;
    for (const constraints of attemptConstraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) {
          console.log('[WebRTC] Acquired local media successfully with constraints:', constraints);
          break;
        }
      } catch (err) {
        console.warn('[WebRTC] getUserMedia attempt failed, trying fallback:', constraints, err);
      }
    }

    // If combined audio+video failed, attempt independent audio and video streams
    if (!stream && isVideo) {
      try {
        let aStream = null;
        let vStream = null;
        try {
          aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn('[WebRTC] Standalone audio fallback failed:', e);
        }
        try {
          vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } });
        } catch (e) {
          console.warn('[WebRTC] Standalone video fallback failed:', e);
        }
        if (aStream || vStream) {
          stream = new MediaStream();
          if (aStream) aStream.getAudioTracks().forEach((t) => stream.addTrack(t));
          if (vStream) vStream.getVideoTracks().forEach((t) => stream.addTrack(t));
        }
      } catch (fallbackErr) {
        console.warn('[WebRTC] Split media fallback error:', fallbackErr);
      }
    }

    this.localStream = stream;
    this.attachTracksToPeerConnection();
    return stream;
  }

  /**
   * Initialize RTCPeerConnection with STUN & TURN servers
   */
  initPeerConnection() {
    if (typeof RTCPeerConnection === 'undefined') {
      console.warn('[WebRTC] RTCPeerConnection not supported');
      return;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (e) {}
      this.peerConnection = null;
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Attach local tracks immediately
    this.attachTracksToPeerConnection();

    // Handle incoming remote tracks (both audio and video)
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] ontrack received track:', event.track.kind, event.track.id);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => {
          if (!this.remoteStream.getTracks().some((cur) => cur.id === t.id)) {
            this.remoteStream.addTrack(t);
          }
        });
      }

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const payload = { candidate: event.candidate.toJSON() };
        if (this.activeSessionChannel && this.isChannelSubscribed) {
          this.activeSessionChannel.send({
            type: 'broadcast',
            event: 'webrtc-ice-candidate',
            payload
          });
        } else {
          this.outgoingIceCandidateQueue.push(payload);
        }
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }
      } else if (
        this.peerConnection.connectionState === 'disconnected' ||
        this.peerConnection.connectionState === 'failed' ||
        this.peerConnection.connectionState === 'closed'
      ) {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended');
        }
      }
    };
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
    this.isInitiator = true;
    this.callType = callType;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;

    // 1. Immediately request camera/mic in parallel so user sees preview right away
    this.initLocalMedia(callType).then(() => {
      this.initPeerConnection();
    }).catch((e) => console.warn('[WebRTC] Immediate media init on startCall:', e));

    const sessionChannelName = `call-session-${this.currentCallId}`;

    // 2. Join call session channel
    this.activeSessionChannel = supabase.channel(sessionChannelName, {
      config: { broadcast: { self: false } }
    });

    // Setup session event listeners
    this.activeSessionChannel
      .on('broadcast', { event: 'call-accepted' }, async () => {
        console.log('[WebRTC] Callee accepted call. Creating WebRTC offer...');
        if (this.broadcastInterval) {
          clearInterval(this.broadcastInterval);
          this.broadcastInterval = null;
        }
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }
        await this.createAndSendOffer();
      })
      .on('broadcast', { event: 'call-declined' }, ({ payload }) => {
        console.log('[WebRTC] Callee declined call:', payload?.reason);
        if (this.broadcastInterval) {
          clearInterval(this.broadcastInterval);
          this.broadcastInterval = null;
        }
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('declined', payload?.reason);
        }
        this.cleanup();
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        console.log('[WebRTC] Remote user ended call');
        if (this.broadcastInterval) {
          clearInterval(this.broadcastInterval);
          this.broadcastInterval = null;
        }
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended');
        }
        this.cleanup();
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        console.log('[WebRTC] Received WebRTC Answer');
        await this.handleRemoteAnswer(payload.sdp);
      })
      .on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
        if (payload?.candidate) {
          await this.handleRemoteIceCandidate(payload.candidate);
        }
      });

    // 3. Subscribe to session channel & send call invitation
    return new Promise((resolve) => {
      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to session channel:', sessionChannelName);
          this.isChannelSubscribed = true;

          // Flush any queued outgoing ICE candidates
          while (this.outgoingIceCandidateQueue.length > 0) {
            const queued = this.outgoingIceCandidateQueue.shift();
            this.activeSessionChannel.send({
              type: 'broadcast',
              event: 'webrtc-ice-candidate',
              payload: queued
            });
          }

          // Broadcast incoming call to callee's inbox (with auto-retry)
          const calleeInbox = supabase.channel(`user-call-inbox-${callee.id}`);
          const sendInvitation = () => {
            calleeInbox.send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: {
                callId: this.currentCallId,
                channelName: sessionChannelName,
                callType,
                caller: {
                  id: caller.id,
                  name: caller.name,
                  photo: caller.photo || caller.photo_url,
                  city: caller.city,
                  profession: caller.profession
                },
                calleeId: callee.id,
                timestamp: Date.now()
              }
            }).catch((err) => console.warn('[WebRTC] Send invite notice:', err));
          };

          calleeInbox.subscribe((inboxStatus) => {
            if (inboxStatus === 'SUBSCRIBED') {
              sendInvitation();
              // Periodic broadcast for up to 30s while awaiting answer
              let attempts = 0;
              this.broadcastInterval = setInterval(() => {
                attempts += 1;
                if (attempts > 8 || !this.activeSessionChannel) {
                  clearInterval(this.broadcastInterval);
                  this.broadcastInterval = null;
                } else {
                  sendInvitation();
                }
              }, 3500);
            }
          });

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
    this.isInitiator = false;
    this.callType = callData.callType || 'audio';
    this.currentCallId = callData.callId;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onStatusChange;
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;

    // Immediately initialize local media & peer connection with tracks
    await this.initLocalMedia(this.callType);
    this.initPeerConnection();

    const sessionChannelName = callData.channelName || `call-session-${callData.callId}`;

    this.activeSessionChannel = supabase.channel(sessionChannelName, {
      config: { broadcast: { self: false } }
    });

    this.activeSessionChannel
      .on('broadcast', { event: 'call-ended' }, () => {
        console.log('[WebRTC] Remote user ended call');
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended');
        }
        this.cleanup();
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        console.log('[WebRTC] Received WebRTC Offer from caller');
        await this.handleRemoteOffer(payload.sdp);
      })
      .on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
        if (payload?.candidate) {
          await this.handleRemoteIceCandidate(payload.candidate);
        }
      });

    return new Promise((resolve) => {
      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Receiver connected to session channel:', sessionChannelName);
          this.isChannelSubscribed = true;

          // Inform caller that receiver accepted
          await this.activeSessionChannel.send({
            type: 'broadcast',
            event: 'call-accepted',
            payload: {
              callId: this.currentCallId,
              responderId: currentUser.id
            }
          });

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
    if (!callData || !supabase) return;
    const sessionChannelName = callData.channelName || `call-session-${callData.callId}`;
    const channel = supabase.channel(sessionChannelName);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call-declined',
          payload: { reason }
        }).then(() => {
          setTimeout(() => {
            try { supabase.removeChannel(channel); } catch (e) {}
          }, 1000);
        });
      }
    });
  }

  /**
   * End current active call
   */
  async endCall() {
    if (this.activeSessionChannel) {
      try {
        await this.activeSessionChannel.send({
          type: 'broadcast',
          event: 'call-ended',
          payload: { timestamp: Date.now() }
        });
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
    try {
      this.attachTracksToPeerConnection();

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video'
      });
      await this.peerConnection.setLocalDescription(offer);

      if (this.activeSessionChannel) {
        await this.activeSessionChannel.send({
          type: 'broadcast',
          event: 'webrtc-offer',
          payload: { sdp: offer }
        });
      }
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  }

  /**
   * Callee handles SDP Offer and creates SDP Answer
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
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Process any queued incoming ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] Queued ICE candidate error:', e);
        }
      }

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video'
      });
      await this.peerConnection.setLocalDescription(answer);

      if (this.activeSessionChannel) {
        await this.activeSessionChannel.send({
          type: 'broadcast',
          event: 'webrtc-answer',
          payload: { sdp: answer }
        });
      }
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
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      }

      // Process any queued incoming ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
      } else {
        this.iceCandidateQueue.push(candidateData);
      }
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  /**
   * Toggle local audio track (mute/unmute)
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
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
    }
  }

  /**
   * Flip camera facing mode
   */
  async switchCamera(facingMode = 'user') {
    if (this.callType !== 'video' || !this.peerConnection) return null;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
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
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
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
    this.iceCandidateQueue = [];
    this.outgoingIceCandidateQueue = [];
    this.isChannelSubscribed = false;
    this.isInitiator = false;
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
