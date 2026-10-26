import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Phone, 
  Video, 
  ChevronLeft, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Check,
  CheckCheck, 
  Clock,
  MessageCircle,
  Lock,
  Smile
} from 'lucide-react';

import { sanitizeChatMessage } from '../../utils/security';
import { useTheme } from '../../context/ThemeContext';
import { isSelfProfile } from '../../utils/genderMatch';
import { liveChatService, deduplicateMessageList } from '../../services/liveChatService';
import { useInterestStatus } from '../../services/interestService';
import { getActiveConversations } from '../../utils/conversationUtils';
import { fcmNotificationService } from '../../services/fcmNotificationService';

const POPULAR_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹'];

export default function MobileChatScreen({
  profiles,
  currentUser,
  conversations,
  setConversations,
  activeProfileId,
  setActiveProfileId,
  activeChatId = null,
  setActiveChatId,
  onSelectProfile,
  isDirectChatOpen = false,
  setIsDirectChatOpen,
  onOpenOffers,
  onOpenLogin,
  onStartAudioCall,
  onStartVideoCall,
  onRequestSendInterest,
  onToggleInterest,
  declinedReceivedIds = [],
  acceptedInterests = [],
  isConnected = false
}) {
  const { bottomBarStyle, accent, isDarkMode } = useTheme();
  const [inConversation, setInConversation] = useState(isDirectChatOpen);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Keep inConversation synchronized with isDirectChatOpen from parent
  useEffect(() => {
    setInConversation(Boolean(isDirectChatOpen));
  }, [isDirectChatOpen]);

  // Ensure parent knows if inConversation becomes active
  useEffect(() => {
    if (inConversation && !isDirectChatOpen) {
      setIsDirectChatOpen?.(true);
    }
  }, [inConversation, isDirectChatOpen, setIsDirectChatOpen]);

  // Real-time foreground FCM push notification & Live Chat message stream listener
  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Subscribe to FCM foreground push notifications to automatically refresh the chat list in real-time
    const unsubFCM = fcmNotificationService.subscribeToForegroundFCM(() => {
      liveChatService.fetchConversationsForUser(currentUser, profiles).then((freshConvs) => {
        if (Array.isArray(freshConvs)) {
          setConversations(freshConvs);
        }
      }).catch(() => {});
    });

    // 2. Subscribe to incoming live messages via Supabase Realtime / WebSockets
    const unsubMsg = liveChatService.onMessage(() => {
      liveChatService.fetchConversationsForUser(currentUser, profiles).then((freshConvs) => {
        if (Array.isArray(freshConvs)) {
          setConversations(freshConvs);
        }
      }).catch(() => {});
    });

    return () => {
      unsubFCM();
      unsubMsg();
    };
  }, [currentUser, profiles, setConversations]);

  // Active, verified conversations with valid messages (Strictly aligned with badge count)
  const activeConversationsList = useMemo(() => {
    return getActiveConversations(conversations, currentUser, profiles, declinedReceivedIds);
  }, [conversations, currentUser, profiles, declinedReceivedIds]);

  const [searchQuery, setSearchQuery] = useState('');

  // Strictly filtered active conversations excluding current user's own profile and matching search query
  const filteredChatConversations = useMemo(() => {
    return activeConversationsList.filter(conv => {
      const partner = conv.partnerUser;
      if (!partner || isSelfProfile(partner, currentUser)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = partner.name?.toLowerCase().includes(q);
      const lastMsg = conv?.messages?.[conv.messages.length - 1];
      const msgMatch = lastMsg?.text?.toLowerCase().includes(q);
      return nameMatch || msgMatch;
    });
  }, [activeConversationsList, currentUser, searchQuery]);

  // Strictly resolve chat partner (partnerUser), ensuring currentUser is never resolved as partner
  const partnerUser = useMemo(() => {
    if (!currentUser || !activeProfileId) return null;
    const currentUserId = String(currentUser.id);
    const currentUserRegId = currentUser.register_id || currentUser.registerId ? String(currentUser.register_id || currentUser.registerId) : null;
    const targetId = String(activeProfileId);

    // Strictly ensure partner is NOT current user (WHERE user_id != current_user_id)
    if (
      targetId === currentUserId || 
      (currentUserRegId && targetId === currentUserRegId) ||
      isSelfProfile({ id: targetId }, currentUser)
    ) {
      return null;
    }

    const found = profiles.find(p => 
      p && !isSelfProfile(p, currentUser) && (
        String(p.id) === targetId ||
        (p.register_id && String(p.register_id) === targetId) ||
        (p.registerId && String(p.registerId) === targetId)
      )
    );

    if (found) {
      return {
        ...found,
        id: String(found.id || targetId),
        name: found.name || 'Candidate',
        photo: found.photo || found.photo_url || 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg',
        onlineStatus: found.onlineStatus || 'Online'
      };
    }

    // Check if partner exists in active conversation object
    const conv = conversations.find(c => String(c.profileId) === targetId || (activeChatId && c.conversation_id === activeChatId));
    if (conv?.partnerUser && !isSelfProfile(conv.partnerUser, currentUser)) {
      return conv.partnerUser;
    }

    // Fallback: If targetId is provided from notification or direct route, provide an authentic partner representation
    return {
      id: targetId,
      name: (conv?.partnerUser?.name && !['verified member', 'a verified member', 'member'].includes(conv.partnerUser.name.toLowerCase().trim())) ? conv.partnerUser.name : 'Candidate',
      photo: 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg',
      onlineStatus: 'Online'
    };
  }, [profiles, currentUser, activeProfileId, conversations, activeChatId]);

  const activeProfile = partnerUser;

  const activeConversationId = useMemo(() => {
    if (activeChatId) return String(activeChatId);
    if (!currentUser?.id || !partnerUser?.id) return '';
    return [String(currentUser.id), String(partnerUser.id)].sort().join(':::');
  }, [currentUser?.id, partnerUser?.id, activeChatId]);

  const { status: interestStatus, isAccepted: hookIsCallingUnlocked } = useInterestStatus(currentUser, activeProfile);

  // Multi-layered connection unlock verification (hook + prop + local persistent records)
  const isCallingUnlocked = useMemo(() => {
    if (hookIsCallingUnlocked || isConnected || interestStatus === 'accepted') return true;
    if (!currentUser || !activeProfile) return false;
    const targetUid = String(activeProfile?.id || activeProfileId || '');
    const targetReg = String(activeProfile?.registerId || activeProfile?.register_id || '');
    const accList = Array.isArray(acceptedInterests) ? acceptedInterests.map(String) : [];
    if ((targetUid && accList.includes(targetUid)) || (targetReg && accList.includes(targetReg))) {
      return true;
    }
    try {
      const uId = currentUser.id;
      const rawStored = localStorage.getItem(`i4u_accepted_interests_${uId}`) || localStorage.getItem('i4u_accepted_interests');
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (Array.isArray(parsed) && ((targetUid && parsed.includes(targetUid)) || (targetReg && parsed.includes(targetReg)))) {
          return true;
        }
      }
      const rawPairs = localStorage.getItem('i4u_accepted_pairs');
      if (rawPairs) {
        const pairs = JSON.parse(rawPairs);
        const pairKey = [String(currentUser.id), targetUid].sort().join(':::');
        if (Array.isArray(pairs) && pairs.includes(pairKey)) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }, [hookIsCallingUnlocked, isConnected, interestStatus, currentUser, activeProfile, activeProfileId, acceptedInterests]);

  const [callAuthAlert, setCallAuthAlert] = useState(null);

  const handleAttemptCall = (type = 'audio') => {
    if (!activeProfile) return;
    if (isCallingUnlocked) {
      if (type === 'video' && onStartVideoCall) {
        onStartVideoCall(activeProfile);
      } else if (onStartAudioCall) {
        onStartAudioCall(activeProfile);
      }
      return;
    }

    if (interestStatus === 'pending') {
      setCallAuthAlert({
        title: 'Interest Pending Acceptance',
        message: 'Interest is pending acceptance. You can call once they accept your interest.',
        status: 'pending'
      });
    } else if (interestStatus === 'rejected') {
      setCallAuthAlert({
        title: 'Calling Unavailable',
        message: 'Calling is unavailable as the interest was not accepted.',
        status: 'rejected'
      });
    } else {
      setCallAuthAlert({
        title: 'Send Interest to Unlock Calling',
        message: 'Send an Interest first. Calling is unlocked once accepted.',
        status: 'none'
      });
    }
  };

  const existingConv = partnerUser?.id ? conversations.find(c => 
    String(c.profileId) === String(partnerUser.id) || 
    (partnerUser.register_id && String(c.profileId) === String(partnerUser.register_id)) ||
    (partnerUser.registerId && String(c.profileId) === String(partnerUser.registerId))
  ) : null;

  // Dedicated messages state strictly isolated to the currently active conversation
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load and synchronize messages strictly for the active conversation
  useEffect(() => {
    // 5. STATE CLEANUP ON ROUTE / PROFILE CHANGE:
    // Immediately clear messages state on switch or unmount to eliminate lingering messages
    setMessages([]);
    setInputText('');
    setShowEmojiPicker(false);
    setIsTyping(false);

    if (!inConversation || !currentUser?.id || !partnerUser?.id || !activeConversationId) {
      return;
    }

    // Mark conversation and messages as read atomically
    liveChatService.markConversationAsRead({
      currentUserId: currentUser.id,
      partnerUserId: partnerUser.id,
      conversationId: activeConversationId
    });

    setConversations(prev => (prev || []).map(c => {
      const pid = String(c.profileId);
      const isMatch = pid === String(partnerUser.id) || 
        (partnerUser.register_id && pid === String(partnerUser.register_id)) ||
        (partnerUser.registerId && pid === String(partnerUser.registerId));
      if (isMatch) {
        return {
          ...c,
          unreadCount: 0,
          messages: (c.messages || []).map(m => 
            (m.sender === 'them' || String(m.sender_id) === String(partnerUser.id)) 
              ? { ...m, status: 'read' } 
              : m
          )
        };
      }
      return c;
    }));

    let isMounted = true;
    setIsLoadingMessages(true);

    // 2. STRICT DATABASE QUERY ISOLATION:
    // Strictly fetch messages belonging to this unique conversation / two-way pair
    liveChatService.fetchMessagesForConversation({
      conversationId: activeConversationId,
      currentUserId: currentUser.id,
      partnerUserId: partnerUser.id
    }).then((loadedMsgs) => {
      if (isMounted) {
        setMessages(loadedMsgs);
        setIsLoadingMessages(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingMessages(false);
    });

    const matchId = String(partnerUser.id);
    const matchRegId = partnerUser.register_id || partnerUser.registerId ? String(partnerUser.register_id || partnerUser.registerId) : null;
    const currentUserId = String(currentUser.id);

    // 3. & 4. WEBSOCKET / REAL-TIME ROOM ISOLATION & FRONTEND CONVERSATION MATCH CHECK
    const handleIncoming = (incoming) => {
      if (!incoming) return;
      const incomingConvId = incoming.conversation_id || incoming.conversationId;

      // Gatekeeper 1: conversation_id match check
      if (incomingConvId && String(incomingConvId) !== String(activeConversationId)) {
        return; // Ignore messages intended for other chats/rooms
      }

      const sId = String(incoming.sender_id || incoming.senderId || '');
      const rId = String(incoming.receiver_id || incoming.recipientId || '');

      // Gatekeeper 2: exact two-way match check between current user and active partner
      const isValidPair = 
        (sId === currentUserId && (rId === matchId || (matchRegId && rId === matchRegId))) ||
        ((sId === matchId || (matchRegId && sId === matchRegId)) && rId === currentUserId);

      if (!isValidPair) return;

      setIsTyping(false);

      const isIncomingFromMe = sId === currentUserId;

      const incomingMsg = {
        id: incoming.id || incoming.tempId || ('m-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
        tempId: incoming.tempId || incoming.id,
        conversation_id: activeConversationId,
        sender_id: sId,
        receiver_id: rId || (isIncomingFromMe ? matchId : currentUserId),
        sender: isIncomingFromMe ? 'me' : 'them',
        text: incoming.text,
        time: incoming.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: isIncomingFromMe ? (incoming.status || 'delivered') : 'read',
        timestamp: incoming.timestamp || new Date().toISOString(),
        created_at: incoming.created_at || incoming.timestamp || new Date().toISOString()
      };

      setMessages(prev => deduplicateMessageList([...prev, incomingMsg]));

      // Keep parent conversation list updated
      setConversations(prev => {
        const targetId = matchId;
        const exists = prev.find(c => String(c.profileId) === matchId || (matchRegId && String(c.profileId) === matchRegId));
        if (exists) {
          return prev.map(c => {
            if (String(c.profileId) === matchId || (matchRegId && String(c.profileId) === matchRegId)) {
              return {
                ...c,
                unreadCount: 0,
                messages: deduplicateMessageList([...(c.messages || []), incomingMsg])
              };
            }
            return c;
          });
        } else {
          return [
            ...prev,
            {
              profileId: targetId,
              partnerUser: partnerUser,
              unreadCount: 0,
              messages: [incomingMsg],
              autoReplies: []
            }
          ];
        }
      });
    };

    const unsubscribeConv = liveChatService.subscribeToConversation(activeConversationId, handleIncoming);

    const unsubscribeStatus = liveChatService.onStatus(({ messageId, status }) => {
      setMessages(prev => prev.map(m => (m.id === messageId || m.tempId === messageId) ? { ...m, status } : m));
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => (m.id === messageId || m.tempId === messageId) ? { ...m, status } : m)
      })));
    });

    const unsubscribeTyping = liveChatService.onTyping(({ senderId, isTyping: typingState }) => {
      if (String(senderId) === matchId || (matchRegId && String(senderId) === matchRegId)) {
        setIsTyping(Boolean(typingState));
      }
    });

    return () => {
      isMounted = false;
      unsubscribeConv();
      unsubscribeStatus();
      unsubscribeTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setMessages([]); // Reset state on cleanup
    };
  }, [inConversation, currentUser?.id, partnerUser?.id, partnerUser?.register_id, partnerUser?.registerId, activeConversationId, setConversations]);

  const displayMessages = useMemo(() => {
    return deduplicateMessageList(messages);
  }, [messages]);

  // Live Message is fully active for matrimonial connections
  const canSendMessages = true;

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    scrollToBottom('smooth');
  }, [displayMessages.length, isTyping, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    if (inConversation) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [inConversation, currentUser]);

  const typingTimerRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (activeProfile?.id) {
      liveChatService.sendTypingIndicator(activeProfile.id, true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        liveChatService.sendTypingIndicator(activeProfile.id, false);
      }, 1500);
    }
  };

  // If user is not logged in, display the Login Required screen immediately
  if (!currentUser) {
    return (
      <div className={`p-4 min-h-[460px] flex items-center justify-center ${isDarkMode ? 'bg-[#060D17] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`w-full max-w-sm p-6 rounded-3xl border text-center shadow-lg ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Lock className="w-8 h-8 text-[#DFB76C]" />
          </div>
          <h3 className="font-serif font-bold text-lg mb-2">Login Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Please log in or register to view your messages and chat directly with verified matches.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Log In / Register</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSend = (textToSend) => {
    if (!canSendMessages) {
      onOpenOffers?.();
      return;
    }

    if (!partnerUser || !currentUser) return;

    const rawText = textToSend || inputText;
    const cleanText = sanitizeChatMessage(rawText);
    if (!cleanText) return;

    const msgId = 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const nowIso = new Date().toISOString();
    const newMsg = {
      id: msgId,
      tempId: msgId,
      conversation_id: activeConversationId,
      sender_id: String(currentUser.id),
      receiver_id: String(partnerUser.id),
      sender: 'me',
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      timestamp: nowIso,
      created_at: nowIso
    };

    // Update isolated messages state immediately
    setMessages(prev => deduplicateMessageList([...prev, newMsg]));

    setConversations(prev => {
      const targetId = String(partnerUser.id);
      const targetRegId = partnerUser.register_id || partnerUser.registerId ? String(partnerUser.register_id || partnerUser.registerId) : null;
      const exists = prev.find(c => String(c.profileId) === targetId || (targetRegId && String(c.profileId) === targetRegId));
      if (exists) {
        return prev.map(c => {
          if (String(c.profileId) === targetId || (targetRegId && String(c.profileId) === targetRegId)) {
            const currentMsgs = c.messages || [];
            if (currentMsgs.some(m => m.id === msgId || m.tempId === msgId)) {
              return c;
            }
            return {
              ...c,
              unreadCount: 0,
              messages: deduplicateMessageList([...currentMsgs, newMsg])
            };
          }
          return c;
        });
      } else {
        return [
          ...prev,
          {
            profileId: targetId,
            partnerUser: partnerUser,
            unreadCount: 0,
            messages: [newMsg],
            autoReplies: []
          }
        ];
      }
    });

    setInputText('');

    // Transmit strictly via LiveChatService with canonical fields
    liveChatService.sendLiveMessage({
      sender: currentUser,
      recipient: partnerUser,
      message: newMsg,
      conversationId: activeConversationId
    });

    // 1. Live status: Sending -> Sent (single tick)
    setTimeout(() => {
      setMessages(prev => prev.map(m => (m.id === msgId || m.tempId === msgId) && m.status === 'sending' ? { ...m, status: 'sent' } : m));
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => (m.id === msgId || m.tempId === msgId) && m.status === 'sending' ? { ...m, status: 'sent' } : m)
      })));
    }, 280);

    // 2. Live status: Sent -> Delivered (double tick)
    setTimeout(() => {
      setMessages(prev => prev.map(m => (m.id === msgId || m.tempId === msgId) && (m.status === 'sending' || m.status === 'sent') ? { ...m, status: 'delivered' } : m));
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => (m.id === msgId || m.tempId === msgId) && (m.status === 'sending' || m.status === 'sent') ? { ...m, status: 'delivered' } : m)
      })));
    }, 650);
  };

  // View 1A: Loading Skeleton when inConversation but profile is still loading / undefined
  if (inConversation && !partnerUser) {
    return (
      <div className={`flex-1 flex flex-col h-full min-h-0 relative overflow-hidden ${
        isDarkMode ? 'bg-[#081220] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* Loading Skeleton Header */}
        <div className="bg-[#0B192C] text-white px-3 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setInConversation(false);
                setIsDirectChatOpen?.(false);
                setActiveProfileId?.(null);
              }}
              className="p-1 rounded-full text-slate-300 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-700/60 animate-pulse ring-1 ring-amber-500/30 shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="w-28 h-3.5 bg-slate-700/70 rounded-md animate-pulse" />
              <div className="w-16 h-2.5 bg-slate-800 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 animate-pulse" />
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 animate-pulse" />
          </div>
        </div>

        {/* Loading Skeleton Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          <div className="w-48 h-7 mx-auto bg-amber-500/10 rounded-xl animate-pulse" />
          <div className="flex justify-start">
            <div className="w-3/5 h-12 bg-slate-200 dark:bg-slate-800/60 rounded-2xl rounded-bl-none animate-pulse" />
          </div>
          <div className="flex justify-end">
            <div className="w-1/2 h-10 bg-slate-300 dark:bg-slate-700/60 rounded-2xl rounded-br-none animate-pulse" />
          </div>
          <div className="flex justify-start">
            <div className="w-2/3 h-14 bg-slate-200 dark:bg-slate-800/60 rounded-2xl rounded-bl-none animate-pulse" />
          </div>
        </div>

        {/* Loading Skeleton Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 flex items-center space-x-2 shrink-0">
          <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="w-10 h-10 bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  // View 1B: Active Chat Conversation
  if (inConversation && partnerUser) {
    return (
      <div 
        key={`chat-room-${activeConversationId || partnerUser.id}`}
        className={`flex-1 flex flex-col h-full min-h-0 relative overflow-hidden transition-colors duration-200 ${
          isDarkMode ? 'bg-[#081220] text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
      >
        
        {/* Native Mobile Chat Header */}
        <div className="bg-[#0B192C] text-white px-3 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={() => {
                setActiveProfileId?.(null);
                setInConversation(false);
                setIsDirectChatOpen?.(false);
                setMessages([]);
                setInputText('');
              }}
              className="p-1 rounded-full text-slate-300 hover:text-white cursor-pointer"
              title="Back to all conversations"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div 
              className="relative cursor-pointer shrink-0" 
              onClick={() => onSelectProfile(partnerUser)}
            >
              <img 
                src={partnerUser.photo} 
                alt={partnerUser.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-[#DFB76C]" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1.5 ring-[#0B192C]"></span>
            </div>

            <div className="min-w-0" onClick={() => onSelectProfile(partnerUser)}>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-serif font-bold text-xs sm:text-sm text-white truncate">
                  {partnerUser.name}
                </h3>
                {partnerUser.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded-full border border-emerald-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate">
                {isTyping ? (
                  <span className="text-emerald-400 font-medium animate-pulse">typing...</span>
                ) : (
                  partnerUser.onlineStatus || `Online • ${partnerUser.district || partnerUser.city || 'India'}`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => handleAttemptCall('audio')}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                isCallingUnlocked
                  ? 'text-slate-300 hover:text-emerald-400 hover:bg-white/10 active:scale-90'
                  : 'text-slate-400/50 hover:bg-white/5 opacity-60'
              }`}
              title={isCallingUnlocked ? "Live Call (Voice Call)" : "Voice Call locked - requires accepted interest"}
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              {!isCallingUnlocked && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-xs">
                  <Lock className="w-2 h-2 text-slate-950 stroke-[3]" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleAttemptCall('video')}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                isCallingUnlocked
                  ? 'text-slate-300 hover:text-blue-400 hover:bg-white/10 active:scale-90'
                  : 'text-slate-400/50 hover:bg-white/5 opacity-60'
              }`}
              title={isCallingUnlocked ? "Live Video Call (Family Video Meeting)" : "Video Call locked - requires accepted interest"}
            >
              <Video className="w-4 h-4 text-blue-400" />
              {!isCallingUnlocked && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-xs">
                  <Lock className="w-2 h-2 text-slate-950 stroke-[3]" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-center text-[10px] text-amber-900">
            <span className="font-bold">Horoscope Match: {partnerUser.gunasMatch || 'Compatible'} ({partnerUser.matchScore || 85}% Match)</span>
            <p className="text-slate-500 mt-0.5">End-to-end encrypted under I 4 You matrimonial privacy guarantee.</p>
          </div>

          {isLoadingMessages ? (
            <div className="py-6 space-y-4">
              <div className="flex justify-start">
                <div className="w-3/5 h-10 bg-slate-200 dark:bg-slate-800/60 rounded-2xl rounded-bl-none animate-pulse" />
              </div>
              <div className="flex justify-end">
                <div className="w-1/2 h-10 bg-slate-300 dark:bg-slate-700/60 rounded-2xl rounded-br-none animate-pulse" />
              </div>
              <div className="flex justify-start">
                <div className="w-2/3 h-12 bg-slate-200 dark:bg-slate-800/60 rounded-2xl rounded-bl-none animate-pulse" />
              </div>
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-100 to-yellow-50 border border-amber-200 text-[#8C6D1F] mx-auto flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-[#DFB76C]" />
              </div>
              <h4 className="font-serif font-bold text-sm text-slate-800">
                Start your conversation with {partnerUser.name}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Send a respectful message or choose an auspicious conversation starter below.
              </p>
            </div>
          ) : (
            displayMessages.map((m, index) => {
              const isMe = String(m.sender_id) === String(currentUser.id) || (!m.sender_id && m.sender === 'me');
              const uniqueKey = m.id || m.tempId || `msg_${isMe ? 'me' : 'them'}_${index}_${m.time || ''}`;
              return (
                <div key={uniqueKey} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe 
                      ? 'bg-[#0B192C] text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}>
                    {m.text}
                  </div>
                  <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-400 px-1">
                    <span>{m.time}</span>
                    {isMe && (
                      <span className="inline-flex items-center ml-0.5" title={m.status || 'read'}>
                        {m.status === 'sending' && <Clock className="w-3 h-3 text-slate-400 animate-spin" />}
                        {m.status === 'sent' && <Check className="w-3 h-3 text-slate-400" />}
                        {m.status === 'delivered' && <CheckCheck className="w-3 h-3 text-slate-400" />}
                        {(m.status === 'read' || !m.status) && <CheckCheck className="w-3 h-3 text-blue-500" />}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="text-[11px] text-slate-500 bg-white px-3 py-1.5 rounded-xl w-fit border border-slate-200 animate-pulse">
              {partnerUser.name.split(' ')[0]} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Live Instant Message Starters (English) */}
        <div className={`px-3 py-1.5 border-t flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 ${
          isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100/70 border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-[#DFB76C] flex items-center gap-1 shrink-0 px-1">
            ⚡ Instant:
          </span>
          {[
            "Hello! Nice to connect 🙏",
            "Would love to know more about your family! 😊",
            "Interested in taking this proposal forward?",
            "Loved your profile & background! ✨",
            "Can we schedule a quick call? 📞"
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition-colors active:scale-95 ${
                isDarkMode 
                  ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-[#D4AF37]' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:text-[#0B192C]'
              }`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Bottom Input - Always Active Live Chat Form */}
        <div 
          className={`px-3 pt-2 pb-2 sm:pb-3 shrink-0 border-t transition-colors ${
            isDarkMode ? 'bg-[#0B192C] border-white/10' : 'bg-white border-slate-200'
          }`}
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
        >
            {/* Quick Emojis Drawer */}
            {showEmojiPicker && (
              <div className={`mb-2 p-1.5 rounded-xl border flex items-center gap-1 overflow-x-auto scrollbar-none animate-in fade-in ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-bold text-slate-400 pl-1 pr-1.5 shrink-0 flex items-center gap-0.5 select-none">
                  <Smile className="w-3 h-3 text-[#DFB76C]" /> Emojis:
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInputText(prev => prev + emoji)}
                      className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-white/10 active:scale-90 transition-all cursor-pointer select-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-1.5"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  showEmojiPicker ? 'bg-amber-400/20 text-[#DFB76C]' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Add Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              <input 
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={"Message " + (partnerUser?.name || 'partner') + "..."}
                className={`flex-1 px-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:bg-slate-800' 
                    : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-[#D4AF37] text-[#0B192C] disabled:opacity-40 cursor-pointer active:scale-95 transition-transform shrink-0"
                style={{
                  backgroundColor: accent?.primary || '#D4AF37',
                  color: accent?.badgeText === 'text-white' ? '#FFFFFF' : '#0B192C'
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

      </div>
    );
  }

  // View 2: Conversations List (Strictly Opposite Gender Matches)
  return (
    <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${
      bottomBarStyle === 'classic' ? 'pb-8' : 'pb-24'
    }`}>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search matches & chats..."
          className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none shadow-sm ${
            isDarkMode ? 'bg-slate-900 border border-slate-800 text-white placeholder-slate-400' : 'bg-white border border-slate-200'
          }`}
        />
      </div>

      {filteredChatConversations.length === 0 ? (
        <div className={`py-16 px-6 text-center space-y-3.5 rounded-2xl border shadow-xs mt-2 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-100 to-yellow-50 border border-[#D4AF37]/40 text-[#8C6D1F] mx-auto flex items-center justify-center shadow-xs">
            <MessageCircle className="w-7 h-7 text-[#DFB76C]" />
          </div>
          <h3 className={`font-serif font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {searchQuery.trim() ? 'No Matching Chats' : 'No Conversations Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {searchQuery.trim() 
              ? `No chats found matching "${searchQuery}".` 
              : 'Send an interest to compatible profiles or accept incoming requests to start private, family-verified chats.'}
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden divide-y shadow-sm ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
        }`}>
          {filteredChatConversations.map(conv => {
            const profile = conv.partnerUser;
            if (!profile || isSelfProfile(profile, currentUser)) return null;

            const lastMsg = conv?.messages?.[conv.messages.length - 1];
            const isLastMsgFromMe = lastMsg && (lastMsg.sender === 'me' || String(lastMsg.sender_id) === String(currentUser?.id));

            return (
              <div
                key={conv.profileId || profile.id}
                onClick={() => {
                  setActiveProfileId(profile.id);
                  setInConversation(true);
                  setIsDirectChatOpen?.(true);

                  // Mark this conversation as read immediately on click
                  setConversations(prev => (prev || []).map(c => {
                    const pid = String(c.profileId);
                    const isTarget = pid === String(profile.id) || 
                      (profile.register_id && pid === String(profile.register_id)) ||
                      (profile.registerId && pid === String(profile.registerId));
                    if (isTarget) {
                      return {
                        ...c,
                        unreadCount: 0,
                        messages: (c.messages || []).map(m => ({ ...m, status: 'read' }))
                      };
                    }
                    return c;
                  }));
                }}
                className={`p-3 flex items-center space-x-3 cursor-pointer transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={profile.photo || profile.photo_url || 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg'} 
                    alt={profile.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#DFB76C]/50" 
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <h4 className={`font-serif font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {profile.name}
                      </h4>
                      {profile.verified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {lastMsg?.time || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-[12px] truncate pr-2 ${
                      conv.unreadCount > 0 
                        ? 'font-semibold text-slate-900 dark:text-white' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {isLastMsgFromMe && (
                        <span className="text-slate-400 font-normal">You: </span>
                      )}
                      {lastMsg?.text || 'No messages yet'}
                    </p>

                    {conv?.unreadCount > 0 && (
                      <span 
                        className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ml-2"
                        style={{
                          backgroundColor: accent?.primary || '#D4AF37',
                          color: accent?.badgeText === 'text-white' ? '#FFFFFF' : '#0B192C'
                        }}
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calling Authorization Required Alert Modal */}
      {callAuthAlert && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCallAuthAlert(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-[#DFB76C]" />
            </div>

            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white mb-2">
              {callAuthAlert.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {callAuthAlert.message}
            </p>

            <div className="flex items-center gap-2">
              {callAuthAlert.status === 'none' && (
                <button
                  type="button"
                  onClick={() => {
                    setCallAuthAlert(null);
                    if (onRequestSendInterest) {
                      onRequestSendInterest(activeProfile);
                    } else if (onToggleInterest) {
                      onToggleInterest(activeProfile.id);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Send Interest</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCallAuthAlert(null)}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${
                  callAuthAlert.status === 'none' ? 'flex-none px-5' : 'w-full'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

