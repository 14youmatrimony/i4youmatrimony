/**
 * Live Message Delivery & Realtime Chat Service for I 4 You Matrimonial
 * 
 * Capabilities:
 * 1. Supabase Realtime Broadcast Channels (sub-100ms multi-device delivery)
 * 2. Cross-tab & Multi-window BroadcastChannel synchronization
 * 3. Real-time message status transitions ('sending' -> 'sent' -> 'delivered' -> 'read')
 * 4. Contextual smart matrimonial candidate live responses
 * 5. Web Audio API soft chimes for send and delivery
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { isSelfProfile } from '../utils/genderMatch.js';
import { sendBackendMessage, mapSupabaseRowToProfile, isPlaceholderOrIncompleteProfile } from './api.js';
import { fcmNotificationService } from './fcmNotificationService.js';

class LiveChatService {
  constructor() {
    this.inboxChannel = null;
    this.currentUserId = null;
    this.messageListeners = new Set();
    this.statusListeners = new Set();
    this.typingListeners = new Set();
    this.audioCtx = null;
    this.broadcastChannel = null;
    this.pendingAckTimeouts = new Map();
    this.processedMessageIds = new Set();
    this.inboxChannels = [];

    // Initialize cross-tab synchronization for status and typing (no global message leak)
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('i4u_live_chat_sync');
        this.broadcastChannel.onmessage = (event) => {
          const data = event.data;
          if (!data) return;
          if (data.type === 'status') {
            this.notifyStatusListeners(data.payload);
          } else if (data.type === 'typing') {
            this.notifyTypingListeners(data.payload);
          }
        };
      } catch (e) {
        console.warn('[LiveChat] BroadcastChannel not supported:', e);
      }
    }
  }

  /**
   * Completely clears message deduplication buffers and temporary chat cache.
   * Essential when switching chats or candidates to prevent data crossover.
   */
  clearCache() {
    this.processedMessageIds.clear();
    this.pendingAckTimeouts.clear();
    console.log('[LiveChat] Live chat cache and message deduplication buffers cleared');
  }

  /**
   * Helper to check if a message has already been processed and track it
   */
  isMessageProcessed(id, fallbackKey) {
    const key = id || fallbackKey;
    if (!key) return false;
    if (this.processedMessageIds.has(key)) return true;
    this.processedMessageIds.add(key);
    if (id) this.processedMessageIds.add(id);
    if (fallbackKey) this.processedMessageIds.add(fallbackKey);
    if (this.processedMessageIds.size > 2000) {
      const firstKey = this.processedMessageIds.values().next().value;
      this.processedMessageIds.delete(firstKey);
    }
    return false;
  }

  /**
   * Safe Web Audio API synthesizer for message chimes
   */
  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  playSendSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playReceiveSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      
      // Gentle two-tone matrimonial chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.07, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      gain2.gain.setValueAtTime(0.08, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {}
  }

  /**
   * Subscribe current logged-in user to their real-time incoming chat inbox
   */
  subscribeToUserInbox(user) {
    if (!user) return;
    const userIds = Array.from(new Set([user.id, user.registerId, user.register_id].filter(Boolean).map(String)));
    if (!userIds.length) return;

    this.unsubscribeUserInbox();
    this.currentUserId = userIds[0];
    this.inboxChannels = [];

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      userIds.forEach((targetId) => {
        const channelName = `user-chat-inbox-${targetId}`;
        const chn = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        const handleIncoming = ({ payload }) => {
          if (!payload) return;
          const sid = String(payload.sender_id || payload.senderId || '');
          const msgKey = payload.id || `msg_${sid}_${payload.timestamp}_${payload.text}`;
          if (this.isMessageProcessed(payload.id, msgKey)) {
            return;
          }

          // Strictly ignore messages sent by self
          if (this.currentUserId && (sid === String(this.currentUserId) || userIds.includes(sid))) {
            return;
          }

          this.playReceiveSound();
          this.notifyMessageListeners(payload);

          // Acknowledge delivery back to sender
          if (sid && payload.id) {
            this.sendDeliveryAck(sid, payload.id, 'delivered');
          }
        };

        chn
          .on('broadcast', { event: 'receive_message' }, handleIncoming)
          .on('broadcast', { event: 'new-chat-message' }, handleIncoming)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${targetId}` }, (p) => {
            if (p?.new) handleIncoming({ payload: p.new });
          })
          .on('broadcast', { event: 'chat-status-ack' }, ({ payload }) => {
            if (!payload) return;
            this.notifyStatusListeners(payload);
          })
          .on('broadcast', { event: 'chat-typing' }, ({ payload }) => {
            if (!payload) return;
            this.notifyTypingListeners(payload);
          })
          .subscribe();

        this.inboxChannels.push(chn);
      });
    } catch (err) {
      console.warn('[LiveChat] Supabase subscription failed:', err);
    }
  }

  /**
   * Subscribe directly to a real-time conversation room scoped to conversation_${conversationId}
   */
  subscribeToConversation(conversationId, callback) {
    if (!conversationId || !isSupabaseConfigured() || !supabase) return () => {};
    const channelName = `conversation_${conversationId}`;
    try {
      const chn = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      const handleConvMsg = ({ payload }) => {
        if (!payload) return;
        const sid = String(payload.sender_id || payload.senderId || '');
        if (this.currentUserId && sid === String(this.currentUserId)) {
          return;
        }
        callback?.(payload);
      };

      chn
        .on('broadcast', { event: 'new_message' }, handleConvMsg)
        .on('broadcast', { event: 'receive_message' }, handleConvMsg)
        .on('broadcast', { event: 'new-chat-message' }, handleConvMsg)
        .subscribe();

      return () => {
        try { supabase.removeChannel(chn); } catch (e) {}
      };
    } catch (e) {
      return () => {};
    }
  }

  unsubscribeUserInbox() {
    if (Array.isArray(this.inboxChannels) && supabase) {
      this.inboxChannels.forEach((chn) => {
        try { supabase.removeChannel(chn); } catch (e) {}
      });
      this.inboxChannels = [];
    }
    if (this.inboxChannel && supabase) {
      try { supabase.removeChannel(this.inboxChannel); } catch (e) {}
      this.inboxChannel = null;
    }
    this.currentUserId = null;
  }

  /**
   * Send acknowledgment back to sender
   */
  async sendDeliveryAck(senderId, messageId, status = 'delivered') {
    if (!senderId || !messageId) return;

    // Cross-tab broadcast
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'status',
          payload: { messageId, status, recipientId: this.currentUserId }
        });
      } catch (e) {}
    }

    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const senderChannel = supabase.channel(`user-chat-inbox-${senderId}`);
      senderChannel.subscribe((chnStatus) => {
        if (chnStatus === 'SUBSCRIBED') {
          senderChannel.send({
            type: 'broadcast',
            event: 'chat-status-ack',
            payload: { messageId, status, recipientId: this.currentUserId }
          }).catch(() => {});
          setTimeout(() => {
            try { supabase.removeChannel(senderChannel); } catch (e) {}
          }, 2000);
        }
      });
    } catch (e) {}
  }

  /**
   * Send typing indicator to recipient
   */
  sendTypingIndicator(recipientId, isTyping) {
    if (!recipientId || !this.currentUserId) return;

    // Cross-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'typing',
          payload: { senderId: this.currentUserId, recipientId, isTyping }
        });
      } catch (e) {}
    }

    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const recipientChannel = supabase.channel(`user-chat-inbox-${recipientId}`);
      recipientChannel.subscribe((chnStatus) => {
        if (chnStatus === 'SUBSCRIBED') {
          recipientChannel.send({
            type: 'broadcast',
            event: 'chat-typing',
            payload: { senderId: this.currentUserId, recipientId, isTyping }
          }).catch(() => {});
          setTimeout(() => {
            try { supabase.removeChannel(recipientChannel); } catch (e) {}
          }, 1500);
        }
      });
    } catch (e) {}
  }

  /**
   * Transmit live message to recipient via Supabase Broadcast + Messages Table Insert + Local Sync
   */
  async sendLiveMessage({ sender, recipient, message, conversationId }) {
    if (!sender || !recipient || !message) return false;

    this.playSendSound();

    const senderId = String(sender.id || sender.registerId || sender.register_id);
    const recipientId = String(recipient.id || recipient.register_id || recipient.registerId);
    if (!senderId || !recipientId || senderId === recipientId) return false;
    const convId = conversationId || [senderId, recipientId].sort().join(':::');
    const nowIso = new Date().toISOString();

    const msgId = message.id || message.tempId || ('m-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));

    const payload = {
      ...message,
      id: msgId,
      tempId: message.tempId || msgId,
      conversation_id: convId,
      conversationId: convId,
      sender_id: senderId,
      senderId,
      receiver_id: recipientId,
      recipientId,
      senderName: sender.name || 'Member',
      senderPhoto: sender.photo || null,
      text: message.text || '',
      timestamp: message.timestamp || nowIso,
      created_at: message.created_at || nowIso,
      time: message.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
    };

    // Log backend chat room transmission
    console.log(`[Chat Room] Message sent in room conversation_${convId} from ${senderId} to ${recipientId}`);

    // Mark as processed locally so we don't process or echo back our own sent message
    this.processedMessageIds.add(msgId);
    if (message.tempId) this.processedMessageIds.add(message.tempId);
    this.processedMessageIds.add(`msg_${senderId}_${payload.timestamp}_${payload.text}`);

    // 1. Cross-tab sync strictly for the open conversation (if any)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'room_message',
          payload
        });
      } catch (e) {}
    }

    // 2. Persist message to Supabase 'messages' table
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('messages').insert([
          {
            conversation_id: convId,
            sender_id: senderId,
            receiver_id: recipientId,
            text: message.text || '',
            status: 'delivered',
            created_at: nowIso
          }
        ]);
      } catch (dbErr) {
        console.warn('[LiveChat] Supabase messages table insert notice:', dbErr);
      }

      // Synchronize with secure backend (FastAPI / PostgreSQL)
      sendBackendMessage({
        receiver_id: recipientId,
        text: message.text || '',
        conversation_id: convId
      }).catch(() => {});

      // Record in Supabase notifications table
      try {
        await supabase.from('notifications').insert([
          {
            recipient_id: recipientId,
            recipient_register_id: recipient?.register_id || recipient?.registerId || null,
            type: 'chat_message',
            title: `💬 New message from ${sender.name || 'Member'}`,
            message: message.text || 'Sent you a chat message.',
            metadata: {
              conversation_id: convId,
              sender_id: senderId,
              senderId,
              senderName: sender.name,
              senderPhoto: sender.photo,
              text: message.text
            },
            is_read: false,
            created_at: nowIso
          }
        ]);
      } catch (notifErr) {
        console.warn('[LiveChat] Notification table insert notice:', notifErr);
      }
    }

    // Dispatch offline Push Notification to recipient's Android/iOS device
    try {
      fcmNotificationService.dispatchMessagePushNotification({
        recipientId,
        sender,
        messageText: message.text,
        conversationId: convId
      }).catch((pushErr) => {
        console.warn('[LiveChat] Push dispatch notice:', pushErr);
      });
    } catch (e) {}

    // 3. Persist to local conversations for SENDER ONLY (never contaminate recipient's local state)
    try {
      const msgItem = {
        id: payload.id,
        tempId: payload.tempId,
        conversation_id: convId,
        sender_id: senderId,
        receiver_id: recipientId,
        text: payload.text,
        status: 'delivered',
        timestamp: nowIso,
        created_at: nowIso,
        sender: 'me'
      };
      this.appendLocalConversationMessage(senderId, recipientId, msgItem);
    } catch (e) {}

    // 4. Supabase Realtime broadcast to scoped conversation room AND recipient inbox
    if (isSupabaseConfigured() && supabase) {
      // 4A. Scoped conversation room channel
      try {
        const convRoom = supabase.channel(`conversation_${convId}`);
        convRoom.subscribe((chnStatus) => {
          if (chnStatus === 'SUBSCRIBED') {
            convRoom.send({
              type: 'broadcast',
              event: 'new_message',
              payload
            }).catch(() => {});
            convRoom.send({
              type: 'broadcast',
              event: 'receive_message',
              payload
            }).catch(() => {});
            convRoom.send({
              type: 'broadcast',
              event: 'new-chat-message',
              payload
            }).catch(() => {});
            setTimeout(() => {
              try { supabase.removeChannel(convRoom); } catch (e) {}
            }, 3000);
          }
        });
      } catch (e) {}

      // 4B. Recipient user inbox channels (deduplicated)
      const recipientIds = Array.from(new Set([
        recipient.id,
        recipient.register_id,
        recipient.registerId
      ].filter(Boolean).map(String)));

      recipientIds.forEach((targetId) => {
        try {
          const chn = supabase.channel(`user-chat-inbox-${targetId}`);
          chn.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              chn.send({
                type: 'broadcast',
                event: 'receive_message',
                payload
              }).catch(() => {});
              chn.send({
                type: 'broadcast',
                event: 'new-chat-message',
                payload
              }).catch(() => {});
              setTimeout(() => {
                try { supabase.removeChannel(chn); } catch (e) {}
              }, 3000);
            }
          });
        } catch (e) {}
      });
    }

    return true;
  }

  appendLocalConversationMessage(ownerId, partnerId, msg) {
    if (typeof localStorage === 'undefined' || !ownerId || !partnerId) return;
    try {
      const key = `i4u_conversations_${ownerId}`;
      const raw = localStorage.getItem(key);
      const convs = raw ? JSON.parse(raw) : [];

      let conv = convs.find((c) => String(c.profileId) === String(partnerId));
      const isSentByOwner = String(msg.sender_id) === String(ownerId) || msg.sender === 'me';

      if (!conv) {
        conv = {
          profileId: String(partnerId),
          unreadCount: isSentByOwner ? 0 : 1,
          messages: [],
          autoReplies: []
        };
        convs.push(conv);
      } else {
        if (!isSentByOwner) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
      }

      const already = (conv.messages || []).some((m) => 
        (msg.id && (m.id === msg.id || m.tempId === msg.id)) ||
        (msg.tempId && (m.tempId === msg.tempId || m.id === msg.tempId)) ||
        (m.text === msg.text && Math.abs(new Date(m.created_at || m.timestamp || 0).getTime() - new Date(msg.created_at || msg.timestamp || 0).getTime()) < 2000)
      );

      if (!already) {
        conv.messages.push({
          id: msg.id,
          tempId: msg.tempId || msg.id,
          conversation_id: msg.conversation_id,
          sender_id: String(msg.sender_id || (isSentByOwner ? ownerId : partnerId)),
          receiver_id: String(msg.receiver_id || (isSentByOwner ? partnerId : ownerId)),
          sender: isSentByOwner ? 'me' : 'them',
          text: msg.text,
          time: new Date(msg.created_at || msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          status: msg.status || 'delivered',
          created_at: msg.created_at || msg.timestamp || new Date().toISOString()
        });
      }

      conv.messages = deduplicateMessageList(conv.messages);
      conv.unreadCount = (conv.messages || []).filter(m => 
        (m.sender === 'them' || String(m.sender_id) === String(partnerId)) && m.status !== 'read'
      ).length;

      localStorage.setItem(key, JSON.stringify(convs));
      // Purge legacy un-scoped key to prevent cross-account contamination
      localStorage.removeItem('i4u_conversations');
    } catch (e) {}
  }

  /**
   * Fetch messages strictly isolated to a single conversation between two authenticated participants.
   * Enforces exact two-way matching:
   * WHERE (sender_id = :currentUserId AND receiver_id = :partnerUserId) OR (sender_id = :partnerUserId AND receiver_id = :currentUserId)
   * And ensures conversation_id match if provided.
   */
  async fetchMessagesForConversation({ conversationId, currentUserId, partnerUserId }) {
    const cId = String(currentUserId || '').replace(/["']/g, '');
    const pId = String(partnerUserId || '').replace(/["']/g, '');
    if (!cId || !pId) return [];

    let messages = [];

    // 1. Supabase messages table with strict two-way isolation and active conversationId match
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('messages').select('*');
        if (conversationId) {
          const cleanConvId = String(conversationId).replace(/["']/g, '');
          query = query.or(`conversation_id.eq.${cleanConvId},and(sender_id.eq.${cId},receiver_id.eq.${pId}),and(sender_id.eq.${pId},receiver_id.eq.${cId})`);
        } else {
          query = query.or(`and(sender_id.eq.${cId},receiver_id.eq.${pId}),and(sender_id.eq.${pId},receiver_id.eq.${cId})`);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          // Gatekeeper validation: verify strictly belonging to this two-way pair and not self-sent
          messages = data.filter((msg) => {
            const sid = String(msg.sender_id || '');
            const rid = String(msg.receiver_id || '');
            if (!sid || !rid || sid === rid) return false;

            const msgConvId = msg.conversation_id ? String(msg.conversation_id) : '';
            if (conversationId && msgConvId && msgConvId === String(conversationId)) {
              return true;
            }
            const isValidPair = (sid === cId && rid === pId) || (sid === pId && rid === cId);
            return isValidPair;
          });
        }
      } catch (err) {
        console.warn('[LiveChat] Error querying isolated messages from Supabase:', err);
      }
    }

    // 2. Local storage messages strictly isolated to current authenticated user and active conversation
    try {
      const localKey = `i4u_conversations_${cId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const convs = JSON.parse(raw);
        const conv = convs.find((c) => 
          (conversationId && String(c.conversation_id || c.conversationId) === String(conversationId)) ||
          String(c.profileId) === pId ||
          (c.partnerUser && String(c.partnerUser.id) === pId)
        );
        if (conv && Array.isArray(conv.messages)) {
          conv.messages.forEach((localMsg) => {
            const sid = String(localMsg.sender_id || (localMsg.sender === 'me' ? cId : pId));
            const rid = String(localMsg.receiver_id || (localMsg.sender === 'me' ? pId : cId));
            if (!sid || !rid || sid === rid) return;

            const msgConvId = localMsg.conversation_id ? String(localMsg.conversation_id) : '';
            const matchesConv = conversationId && msgConvId && msgConvId === String(conversationId);
            const isValidPair = matchesConv || (sid === cId && rid === pId) || (sid === pId && rid === cId);
            if (isValidPair) {
              const exists = messages.some((m) =>
                (localMsg.id && (m.id === localMsg.id || m.tempId === localMsg.id)) ||
                (localMsg.tempId && (m.tempId === localMsg.tempId || m.id === localMsg.tempId)) ||
                (m.text === localMsg.text && Math.abs(new Date(m.created_at || m.timestamp || 0).getTime() - new Date(localMsg.created_at || localMsg.timestamp || 0).getTime()) < 3000)
              );
              if (!exists) {
                messages.push({
                  ...localMsg,
                  conversation_id: localMsg.conversation_id || conversationId,
                  sender_id: sid,
                  receiver_id: rid
                });
              }
            }
          });
        }
      }
    } catch (e) {}

    return deduplicateMessageList(messages);
  }

  /**
   * Resolves all possible identifier representations for a user (auth user ID, profile ID, register ID, phone, etc.)
   */
  async resolveAllUserIdentifiers(userOrId) {
    const ids = new Set();
    const add = (v) => {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s && s !== 'null' && s !== 'undefined') {
          ids.add(s);
        }
      }
    };

    if (!userOrId) return [];

    if (typeof userOrId === 'string' || typeof userOrId === 'number') {
      add(userOrId);
    } else if (typeof userOrId === 'object') {
      add(userOrId.id);
      add(userOrId.user_id);
      add(userOrId.userId);
      add(userOrId.uid);
      add(userOrId.register_id);
      add(userOrId.registerId);
      const cleanPhone = String(userOrId.mobile || userOrId.phone || '').replace(/\D/g, '');
      if (cleanPhone) {
        add(cleanPhone);
        if (cleanPhone.length >= 10) {
          add(`usr_${cleanPhone.slice(-10)}`);
        }
      }
    }

    // Cross-match with localStorage session details
    if (typeof window !== 'undefined') {
      try {
        const authRaw = localStorage.getItem('i4u_auth_user');
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          add(auth.id);
          add(auth.user_id);
          add(auth.userId);
          add(auth.uid);
          add(auth.register_id);
          add(auth.registerId);
          const p = String(auth.phone || auth.mobile || '').replace(/\D/g, '');
          if (p) {
            add(p);
            if (p.length >= 10) add(`usr_${p.slice(-10)}`);
          }
        }
        const curId = localStorage.getItem('i4u_current_user_id');
        if (curId) add(curId);
        const regId = localStorage.getItem('i4u_register_id');
        if (regId) add(regId);
      } catch (e) {}
    }

    // Cross-match with Supabase Auth session user.id
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          add(data.session.user.id);
        }
      } catch (e) {}

      // Query profiles table to find profile record and add id, register_id, phone
      try {
        const currentList = Array.from(ids);
        if (currentList.length > 0) {
          const cleanTokens = currentList.map(t => String(t).replace(/["']/g, '')).filter(Boolean);
          const { data: profRows } = await supabase
            .from('profiles')
            .select('id, register_id, phone')
            .or(`id.in.(${cleanTokens.join(',')}),register_id.in.(${cleanTokens.join(',')})`)
            .limit(2);
          if (Array.isArray(profRows)) {
            profRows.forEach(r => {
              if (r) {
                add(r.id);
                add(r.register_id);
                if (r.phone) {
                  const rp = String(r.phone).replace(/\D/g, '');
                  if (rp) {
                    add(rp);
                    if (rp.length >= 10) add(`usr_${rp.slice(-10)}`);
                  }
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    return Array.from(ids);
  }

  /**
   * Fetch conversations and message history for a user directly from Supabase & local storage.
   * Lists conversations where currentUser is EITHER sender_id OR receiver_id in messages table,
   * OR where an accepted match exists in interests table.
   * Dynamically loads partner profiles and latest message previews.
   */
  async fetchConversationsForUser(userOrId, allProfiles = []) {
    if (!userOrId) return [];
    const userIds = await this.resolveAllUserIdentifiers(userOrId);
    if (!userIds.length) return [];

    let remoteMessages = [];
    let acceptedInterests = [];

    if (isSupabaseConfigured() && supabase) {
      const cleanIds = userIds.map((id) => String(id).replace(/["']/g, '')).filter(Boolean);

      // 1. Fetch all messages involving the current user as sender or receiver
      if (cleanIds.length > 0) {
        try {
          const [sentRes, recvRes] = await Promise.all([
            supabase
              .from('messages')
              .select('*')
              .in('sender_id', cleanIds)
              .order('created_at', { ascending: false }),
            supabase
              .from('messages')
              .select('*')
              .in('receiver_id', cleanIds)
              .order('created_at', { ascending: false })
          ]);

          const combined = [...(sentRes?.data || []), ...(recvRes?.data || [])];
          const seenMsgIds = new Set();
          combined.forEach((m) => {
            if (m && m.id && !seenMsgIds.has(m.id)) {
              if (String(m.sender_id) !== String(m.receiver_id)) {
                seenMsgIds.add(m.id);
                remoteMessages.push(m);
              }
            }
          });
        } catch (msgErr) {
          console.warn('[LiveChat] Notice: Error querying messages table:', msgErr?.message || msgErr);
        }

        // 2. Fetch all accepted matches/interests from interests table
        try {
          const [intSentRes, intRecvRes] = await Promise.all([
            supabase
              .from('interests')
              .select('*')
              .in('sender_id', cleanIds)
              .eq('status', 'accepted'),
            supabase
              .from('interests')
              .select('*')
              .in('receiver_id', cleanIds)
              .eq('status', 'accepted')
          ]);

          const combinedInt = [...(intSentRes?.data || []), ...(intRecvRes?.data || [])];
          const seenIntIds = new Set();
          combinedInt.forEach((r) => {
            if (r && r.id && !seenIntIds.has(r.id)) {
              if (String(r.sender_id) !== String(r.receiver_id)) {
                seenIntIds.add(r.id);
                acceptedInterests.push(r);
              }
            }
          });
        } catch (intErr) {
          console.warn('[LiveChat] Notice: Error querying interests table:', intErr?.message || intErr);
        }
      }
    }

    const convMap = new Map();

    // Group remote messages by partner ID
    remoteMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    remoteMessages.forEach((msg) => {
      const isSentByMe = userIds.includes(String(msg.sender_id));
      const partnerId = isSentByMe ? String(msg.receiver_id) : String(msg.sender_id);

      if (!partnerId || userIds.includes(partnerId) || isSelfProfile({ id: partnerId }, userOrId)) return;

      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          profileId: partnerId,
          conversation_id: msg.conversation_id || [userIds[0], partnerId].sort().join(':::'),
          conversationId: msg.conversation_id || [userIds[0], partnerId].sort().join(':::'),
          unreadCount: 0,
          messages: [],
          isAccepted: false,
          updated_at: msg.created_at
        });
      }

      const conv = convMap.get(partnerId);
      const alreadyExists = conv.messages.some(
        (m) => (msg.id && (m.id === msg.id || m.tempId === msg.id)) ||
               (m.text === msg.text && Math.abs(new Date(m.created_at || m.time || 0).getTime() - new Date(msg.created_at).getTime()) < 3000)
      );

      if (!alreadyExists) {
        conv.messages.push({
          id: msg.id,
          tempId: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: String(msg.sender_id),
          receiver_id: String(msg.receiver_id),
          sender: isSentByMe ? 'me' : 'them',
          text: msg.text,
          content: msg.text,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: msg.created_at,
          status: msg.status || 'read',
          created_at: msg.created_at
        });
        conv.updated_at = msg.created_at;
      }
    });

    // Group accepted interests by partner ID
    acceptedInterests.forEach((r) => {
      const isSentByMe = userIds.includes(String(r.sender_id));
      const partnerId = isSentByMe ? String(r.receiver_id) : String(r.sender_id);

      if (!partnerId || userIds.includes(partnerId) || isSelfProfile({ id: partnerId }, userOrId)) return;

      const updatedAt = r.updated_at || r.created_at || new Date().toISOString();

      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          profileId: partnerId,
          conversation_id: [userIds[0], partnerId].sort().join(':::'),
          conversationId: [userIds[0], partnerId].sort().join(':::'),
          unreadCount: 0,
          messages: [],
          isAccepted: true,
          status: 'accepted',
          updated_at: updatedAt
        });
      } else {
        const conv = convMap.get(partnerId);
        conv.isAccepted = true;
        conv.status = 'accepted';
        if (!conv.updated_at || new Date(updatedAt).getTime() > new Date(conv.updated_at).getTime()) {
          conv.updated_at = updatedAt;
        }
      }
    });

    // Merge cached local conversations from localStorage if any
    try {
      userIds.forEach((uid) => {
        const raw = localStorage.getItem(`i4u_conversations_${uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => {
              const pid = String(c?.profileId || '');
              if (!pid || userIds.includes(pid) || isSelfProfile({ id: pid }, userOrId)) return;
              if (!convMap.has(pid)) {
                convMap.set(pid, {
                  profileId: pid,
                  conversation_id: c.conversation_id || c.conversationId || [userIds[0], pid].sort().join(':::'),
                  conversationId: c.conversation_id || c.conversationId || [userIds[0], pid].sort().join(':::'),
                  unreadCount: c.unreadCount || 0,
                  messages: Array.isArray(c.messages) ? [...c.messages] : [],
                  partnerUser: c.partnerUser,
                  isAccepted: Boolean(c.isAccepted),
                  status: c.status || 'accepted',
                  updated_at: c.updated_at || c.messages?.[c.messages.length - 1]?.created_at || new Date().toISOString()
                });
              } else {
                const existing = convMap.get(pid);
                if (c.partnerUser && !existing.partnerUser) {
                  existing.partnerUser = c.partnerUser;
                }
                if (Array.isArray(c.messages)) {
                  c.messages.forEach((localM) => {
                    const exists = existing.messages.some(
                      (m) => (localM.id && (m.id === localM.id || m.tempId === localM.id)) ||
                             (m.text === localM.text && Math.abs(new Date(m.created_at || 0).getTime() - new Date(localM.created_at || 0).getTime()) < 3000)
                    );
                    if (!exists) {
                      existing.messages.push(localM);
                    }
                  });
                }
              }
            });
          }
        }
      });
      localStorage.removeItem('i4u_conversations');
    } catch (e) {}

    // Resolve partner candidate profile details for all conversations
    const isGenericName = (name) => {
      if (!name || typeof name !== 'string') return true;
      const lower = name.toLowerCase().trim();
      return ['candidate', 'verified member', 'a verified member', 'someone'].includes(lower);
    };

    const allPartnerIds = Array.from(convMap.keys());
    const partnersNeedingFetch = [];

    allPartnerIds.forEach((pid) => {
      const conv = convMap.get(pid);
      let p = conv.partnerUser;
      if (!p || isGenericName(p.name || p.full_name || p.fullName)) {
        if (Array.isArray(allProfiles)) {
          p = allProfiles.find((item) => item && (
            String(item.id) === pid ||
            (item.register_id && String(item.register_id) === pid) ||
            (item.registerId && String(item.registerId) === pid)
          ));
        }
      }
      if (!p || isGenericName(p.name || p.full_name || p.fullName)) {
        try {
          const cachedRaw = localStorage.getItem('i4u_cached_profiles');
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (Array.isArray(cached)) {
              p = cached.find((item) => item && (
                String(item.id) === pid ||
                (item.register_id && String(item.register_id) === pid) ||
                (item.registerId && String(item.registerId) === pid)
              ));
            }
          }
        } catch (e) {}
      }

      if (p && !isGenericName(p.name || p.full_name || p.fullName)) {
        conv.partnerUser = p;
      } else {
        partnersNeedingFetch.push(pid);
      }
    });

    // Batch query Supabase profiles table for missing partner profiles
    if (partnersNeedingFetch.length > 0 && isSupabaseConfigured() && supabase) {
      try {
        const cleanPartnerTokens = partnersNeedingFetch.map((id) => String(id).replace(/["']/g, '')).filter(Boolean);
        const [byIdsRes, byRegRes] = await Promise.all([
          supabase.from('profiles').select('*').in('id', cleanPartnerTokens),
          supabase.from('profiles').select('*').in('register_id', cleanPartnerTokens)
        ]);
        const fetchedRows = [...(byIdsRes.data || []), ...(byRegRes.data || [])];
        fetchedRows.forEach((row) => {
          if (row) {
            const mapped = mapSupabaseRowToProfile(row);
            if (mapped) {
              const matchedPid = partnersNeedingFetch.find((pid) =>
                String(mapped.id) === pid ||
                String(mapped.register_id) === pid ||
                String(mapped.registerId) === pid
              );
              if (matchedPid && convMap.has(matchedPid)) {
                convMap.get(matchedPid).partnerUser = mapped;
              }
            }
          }
        });
      } catch (e) {
        console.warn('[LiveChat] Error batch fetching partner profiles from Supabase:', e);
      }
    }

    // Strictly discard any unresolved or placeholder partner profiles
    allPartnerIds.forEach((pid) => {
      const conv = convMap.get(pid);
      if (!conv.partnerUser || isGenericName(conv.partnerUser.name || conv.partnerUser.full_name || conv.partnerUser.fullName) || isPlaceholderOrIncompleteProfile(conv.partnerUser)) {
        conv.partnerUser = null;
      }
    });

    const result = [];
    for (const conv of convMap.values()) {
      const cleanMsgs = deduplicateMessageList(conv.messages || []);
      // Omit empty conversations only if they are not an accepted match
      if (cleanMsgs.length === 0 && !conv.isAccepted && conv.status !== 'accepted') {
        continue;
      }

      const partnerObj = conv.partnerUser;
      if (!partnerObj || isSelfProfile(partnerObj, userOrId)) continue;
      // Strictly exclude incomplete or placeholder profiles (e.g. "Member usr_...", "User...", missing valid names)
      if (isPlaceholderOrIncompleteProfile(partnerObj)) continue;

      const partnerIdStr = String(partnerObj.id || conv.profileId || '');
      const lastReadTime = Number(
        localStorage.getItem(`i4u_chat_read_${userIds[0]}_${partnerIdStr}`) || 
        (partnerObj.register_id ? localStorage.getItem(`i4u_chat_read_${userIds[0]}_${partnerObj.register_id}`) : 0) || 0
      );

      const actualUnread = cleanMsgs.filter((m) => {
        const isFromThem = m.sender === 'them' || (m.sender_id && !userIds.includes(String(m.sender_id)));
        if (!isFromThem) return false;
        if (m.status === 'read' || m.is_read === true || m.isRead === true) return false;
        if (lastReadTime > 0) {
          const msgTime = new Date(m.created_at || m.timestamp || 0).getTime();
          if (msgTime <= lastReadTime) {
            m.status = 'read';
            m.is_read = true;
            return false;
          }
        }
        return true;
      }).length;

      const lastMsg = cleanMsgs.length > 0 ? cleanMsgs[cleanMsgs.length - 1] : null;

      result.push({
        ...conv,
        partnerUser: partnerObj,
        unreadCount: actualUnread,
        messages: cleanMsgs,
        lastMessage: lastMsg
      });
    }

    // Sort conversations descending by latest activity / timestamp
    result.sort((a, b) => {
      const timeA = new Date(a.messages?.[a.messages.length - 1]?.created_at || a.messages?.[a.messages.length - 1]?.timestamp || a.updated_at || 0).getTime();
      const timeB = new Date(b.messages?.[b.messages.length - 1]?.created_at || b.messages?.[b.messages.length - 1]?.timestamp || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    // Atomically persist sanitized conversations to local cache
    try {
      userIds.forEach((uid) => {
        localStorage.setItem(`i4u_conversations_${uid}`, JSON.stringify(result));
      });
    } catch (e) {}

    return result;
  }

  /**
   * Mark all unread messages in a conversation as read both locally and in Supabase
   */
  async markConversationAsRead(arg1, arg2, arg3) {
    let currentUserId, partnerUserId, conversationId;
    if (arg1 && typeof arg1 === 'object' && ('currentUserId' in arg1 || 'partnerUserId' in arg1)) {
      currentUserId = arg1.currentUserId;
      partnerUserId = arg1.partnerUserId;
      conversationId = arg1.conversationId;
    } else {
      currentUserId = (arg1 && typeof arg1 === 'object') ? (arg1.id || arg1.user_id || arg1.userId) : arg1;
      partnerUserId = (arg2 && typeof arg2 === 'object') ? (arg2.id || arg2.user_id || arg2.userId) : arg2;
      conversationId = arg3;
    }

    if (!currentUserId || !partnerUserId) return;
    const currentIdStr = String(currentUserId);
    const partnerIdStr = String(partnerUserId);
    const now = Date.now();

    // 1. Store read receipt timestamp per chat partner in localStorage
    try {
      localStorage.setItem(`i4u_chat_read_${currentIdStr}_${partnerIdStr}`, now.toString());
    } catch (e) {}

    // 2. Supabase database update
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('messages')
          .update({ status: 'read', is_read: true })
          .eq('receiver_id', currentIdStr)
          .eq('sender_id', partnerIdStr);

        if (conversationId) {
          query = query.eq('conversation_id', conversationId);
        }
        await query;

        // Also mark corresponding message notifications as read in Supabase
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('recipient_id', currentIdStr)
          .or(`type.eq.chat_message,type.eq.message,type.eq.message_received`);
      } catch (e) {
        console.warn('[LiveChat] Error updating read status in DB:', e);
      }
    }

    // 3. Synchronize localStorage cache atomically
    try {
      const key = `i4u_conversations_${currentIdStr}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map(c => {
            if (String(c.profileId) === partnerIdStr) {
              return {
                ...c,
                unreadCount: 0,
                messages: (c.messages || []).map(m => 
                  (m.sender === 'them' || String(m.sender_id) === partnerIdStr) 
                    ? { ...m, status: 'read' } 
                    : m
                )
              };
            }
            return c;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    } catch (e) {}
  }

  /**
   * Generate highly realistic, respectful matrimonial candidate response
   */
  generateContextualMatrimonialReply(userText, profile) {
    const text = (userText || '').toLowerCase().trim();
    const city = profile.district || profile.city || 'our hometown';

    // Greetings
    if (/^(hai|haii|hello|hi|hey|heyy|namaste|vanakkam|namaskaram|pranam)/i.test(text)) {
      const greetings = [
        `Hello! Delighted to connect with you. How are you doing today?`,
        `Namaste! Thank you for reaching out. Our family was very pleased to see your profile!`,
        `Hello! Very glad to receive your message. Hope you are having a wonderful day!`,
        `Namaste! Delighted to connect. Our family in ${city} is happy to take this conversation forward.`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Call / Video request
    if (/(call|phone|video|voice|speak|talk|ring|contact|number|meeting)/i.test(text)) {
      const callReplies = [
        `A friendly call sounds wonderful! Let us schedule a phone or video call with our elders this weekend. What time suits you best?`,
        `Yes, absolutely! Let's arrange a voice call to introduce our families. Looking forward to speaking!`,
        `That would be great! Our family would love to connect over a video meeting. Please let us know your convenient time.`
      ];
      return callReplies[Math.floor(Math.random() * callReplies.length)];
    }

    // Horoscope / Match / Gunas
    if (/(horoscope|kundali|kundli|porutham|guna|match|nakshatra|jathakam|star)/i.test(text)) {
      const horoscopeReplies = [
        `Our elders checked the horoscope match and noted high compatibility! Both families were very happy with the alignment.`,
        `Yes, the horoscope alignment looks auspicious! We would be glad to share our full astrological charts if required.`,
        `Wonderful! Our family astrologer was also very positive about our match compatibility.`
      ];
      return horoscopeReplies[Math.floor(Math.random() * horoscopeReplies.length)];
    }

    // Family / Parents / Background
    if (/(family|parents|father|mother|brother|sister|home|values|tradition)/i.test(text)) {
      const familyReplies = [
        `We are a traditional yet progressive family based in ${city}. Family values and mutual respect are very close to our hearts!`,
        `Our parents were really impressed with your background. We would love to exchange more family details and biodata.`,
        `Thank you for asking! Both my parents and siblings are very excited about this alliance.`
      ];
      return familyReplies[Math.floor(Math.random() * familyReplies.length)];
    }

    // Career / Education / Profession
    if (/(job|work|career|profession|study|education|degree|company|office|settle|settled)/i.test(text)) {
      const careerReplies = [
        `Balancing career aspirations with family life is very important to us. It is wonderful to know more about your journey!`,
        `That sounds very inspiring! Having clear goals and professional stability is truly commendable.`,
        `Thank you for sharing! We appreciate someone who is ambitious and values meaningful life accomplishments.`
      ];
      return careerReplies[Math.floor(Math.random() * careerReplies.length)];
    }

    // Photos / Biodata
    if (/(photo|picture|pic|biodata|bio|details|share)/i.test(text)) {
      const photoReplies = [
        `Gladly! We are happy to exchange full family photos and verified biodata.`,
        `Certainly! We have updated our verified profile photos and biodata here on I 4 You.`,
        `Of course! Looking forward to exchanging details and continuing this auspicious match.`
      ];
      return photoReplies[Math.floor(Math.random() * photoReplies.length)];
    }

    // Default polite matrimonial responses
    const defaultReplies = profile.autoReplies && profile.autoReplies.length > 0
      ? profile.autoReplies
      : [
          `Sounds wonderful! I will discuss this with my parents and keep you updated.`,
          `Delighted to connect! Looking forward to getting to know each other better.`,
          `Thank you for your warm message! Wishing you and your family an auspicious day ahead.`,
          `Glad to connect with you! Would love to schedule a friendly phone or video call with our families.`
        ];
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }

  // Listener management
  onMessage(listener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onTyping(listener) {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  }

  notifyMessageListeners(payload) {
    this.messageListeners.forEach(listener => {
      try { listener(payload); } catch (e) {}
    });
  }

  notifyStatusListeners(payload) {
    this.statusListeners.forEach(listener => {
      try { listener(payload); } catch (e) {}
    });
  }

  notifyTypingListeners(payload) {
    this.typingListeners.forEach(listener => {
      try { listener(payload); } catch (e) {}
    });
  }
}

/**
 * Deduplicate an array of chat messages by unique ID, tempId, or content + timestamp signature.
 */
export function deduplicateMessageList(messages) {
  if (!Array.isArray(messages)) return [];
  const seenIds = new Set();
  const seenSignatures = new Set();
  const result = [];

  for (const m of messages) {
    if (!m) continue;

    // 1. Check by explicit string ID or tempId
    const primaryId = m.id || m.tempId;
    if (primaryId) {
      const idStr = String(primaryId);
      if (seenIds.has(idStr)) continue;
      seenIds.add(idStr);
    }

    // 2. Check by content signature (sender_id + normalized text + approx timestamp or time)
    const normText = (m.text || '').trim();
    if (normText) {
      const timeSignature = m.created_at || m.timestamp
        ? Math.floor(new Date(m.created_at || m.timestamp).getTime() / 2000)
        : (m.time || '');
      const sId = m.sender_id || m.senderId || m.sender || '';
      const signature = `${sId}__${timeSignature}__${normText}`;
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);
    }

    result.push(m);
  }

  return result;
}

export const liveChatService = new LiveChatService();
