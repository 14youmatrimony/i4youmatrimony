import { supabase } from './supabase';

// Public Google STUN servers for NAT traversal (100% Free)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
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
    this.isInitiator = false;
    this.callType = 'audio'; // 'audio' | 'video'
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
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

    const sessionChannelName = `call-session-${this.currentCallId}`;

    // Join call session channel
    this.activeSessionChannel = supabase.channel(sessionChannelName, {
      config: { broadcast: { self: false } }
    });

    // Setup session event listeners
    this.activeSessionChannel
      .on('broadcast', { event: 'call-accepted' }, async () => {
        console.log('[WebRTC] Callee accepted call. Creating WebRTC offer...');
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected');
        }
        await this.createAndSendOffer();
      })
      .on('broadcast', { event: 'call-declined' }, ({ payload }) => {
        console.log('[WebRTC] Callee declined call:', payload?.reason);
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('declined', payload?.reason);
        }
        this.cleanup();
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        console.log('[WebRTC] Remote user ended call');
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

    // Subscribe to session channel, then send incoming call notification to callee's inbox
    return new Promise((resolve, reject) => {
      this.activeSessionChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to session channel:', sessionChannelName);

          // Broadcast incoming call to callee's inbox
          const calleeInbox = supabase.channel(`user-call-inbox-${callee.id}`);
          calleeInbox.subscribe((inboxStatus) => {
            if (inboxStatus === 'SUBSCRIBED') {
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
              }).then(() => {
                try { supabase.removeChannel(calleeInbox); } catch (e) {}
              });
            }
          });

          // Acquire local media
          try {
            await this.initLocalMedia(callType);
            this.initPeerConnection();
            resolve({
              callId: this.currentCallId,
              channelName: sessionChannelName
            });
          } catch (mediaErr) {
            console.warn('[WebRTC] Media initialization error:', mediaErr);
            resolve({
              callId: this.currentCallId,
              channelName: sessionChannelName
            });
          }
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

          // Inform caller that call is accepted
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

          // Acquire local media & create peer connection
          try {
            await this.initLocalMedia(this.callType);
            this.initPeerConnection();
          } catch (e) {
            console.warn('[WebRTC] Media init warning:', e);
          }

          resolve(true);
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
          try { supabase.removeChannel(channel); } catch (e) {}
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
   * Acquire camera/microphone stream
   */
  async initLocalMedia(callType = 'audio', facingMode = 'user') {
    if (this.localStream) {
      return this.localStream;
    }

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: callType === 'video' ? {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    };

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream = stream;
        return stream;
      }
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed, trying audio-only fallback:', err);
      if (callType === 'video') {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.localStream = audioOnlyStream;
          return audioOnlyStream;
        } catch (audioErr) {
          console.warn('[WebRTC] Microphone access denied or unavailable:', audioErr);
        }
      }
    }
    return null;
  }

  /**
   * Initialize RTCPeerConnection with Google STUN servers
   */
  initPeerConnection() {
    if (typeof RTCPeerConnection === 'undefined') {
      console.warn('[WebRTC] RTCPeerConnection not supported in this environment');
      return;
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] ontrack received remote media stream:', event.streams);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.activeSessionChannel) {
        this.activeSessionChannel.send({
          type: 'broadcast',
          event: 'webrtc-ice-candidate',
          payload: { candidate: event.candidate.toJSON() }
        });
      }
    };

    // Connection state change
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
   * Caller creates SDP Offer
   */
  async createAndSendOffer() {
    if (!this.peerConnection) return;
    try {
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
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Process any queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await this.peerConnection.createAnswer();
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
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));

      // Process any queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
      if (this.peerConnection && this.peerConnection.remoteDescription) {
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
        video: { facingMode },
        audio: true
      });

      const oldVideoTrack = this.localStream.getVideoTracks()[0];
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (oldVideoTrack && newVideoTrack) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (sender) {
          sender.replaceTrack(newVideoTrack);
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
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
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
    this.isInitiator = false;
  }
}

export const webrtcCallService = new WebRTCCallService();
export default webrtcCallService;
