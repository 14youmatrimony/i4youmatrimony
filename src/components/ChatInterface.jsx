import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Smile, 
  Paperclip, 
  Check,
  CheckCheck, 
  Clock,
  ShieldCheck, 
  Sparkles, 
  Eye, 
  MapPin, 
  Briefcase,
  ChevronLeft,
  Lock
} from 'lucide-react';
import { sanitizeChatMessage } from '../utils/security';
import { liveChatService, deduplicateMessageList } from '../services/liveChatService';
import { useInterestStatus } from '../services/interestService';

export default function ChatInterface({ 
  profiles, 
  currentUser,
  conversations, 
  setConversations, 
  activeProfileId, 
  setActiveProfileId, 
  onSelectProfile,
  onStartAudioCall,
  onStartVideoCall,
  onRequestSendInterest,
  onToggleInterest
}) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const CHAT_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹', '😍', '👍'];

  // Strictly resolve partnerUser excluding currentUser
  const partnerUser = useMemo(() => {
    if (!currentUser) return null;
    const currentUserId = String(currentUser.id);
    const currentUserRegId = currentUser.register_id || currentUser.registerId ? String(currentUser.register_id || currentUser.registerId) : null;

    if (activeProfileId) {
      const targetId = String(activeProfileId);
      if (targetId !== currentUserId && (!currentUserRegId || targetId !== currentUserRegId)) {
        const found = profiles.find(p => 
          p && (
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
            photo: found.photo || found.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
            onlineStatus: found.onlineStatus || 'Online'
          };
        }
      }
    }

    const otherCandidates = profiles.filter(p => {
      if (!p) return false;
      const pid = String(p.id);
      if (pid === currentUserId || (currentUserRegId && (pid === currentUserRegId || String(p.register_id) === currentUserRegId || String(p.registerId) === currentUserRegId))) return false;
      return true;
    });
    return otherCandidates[0] || null;
  }, [profiles, currentUser, activeProfileId]);

  const activeProfile = partnerUser;

  const activeConversationId = useMemo(() => {
    if (!currentUser?.id || !partnerUser?.id) return '';
    return [String(currentUser.id), String(partnerUser.id)].sort().join(':::');
  }, [currentUser?.id, partnerUser?.id]);

  const { status: interestStatus, isAccepted: isCallingUnlocked } = useInterestStatus(currentUser, activeProfile);
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
  
  // Find or initialize conversation for active profile
  const existingConv = partnerUser?.id ? conversations.find(c => 
    String(c.profileId) === String(partnerUser.id) || 
    (partnerUser.register_id && String(c.profileId) === String(partnerUser.register_id)) ||
    (partnerUser.registerId && String(c.profileId) === String(partnerUser.registerId))
  ) : null;

  // Isolated messages state strictly for the active conversation
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load and synchronize messages strictly for the active conversation
  useEffect(() => {
    // 5. STATE CLEANUP ON ROUTE / PROFILE CHANGE:
    // Immediately clear messages state on switch or unmount to eliminate lingering messages
    setMessages([]);

    if (!currentUser?.id || !partnerUser?.id || !activeConversationId) {
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
        id: incoming.id || incoming.tempId || ('msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
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
      setMessages([]); // Reset state on cleanup
    };
  }, [currentUser?.id, partnerUser?.id, partnerUser?.register_id, partnerUser?.registerId, activeConversationId, setConversations]);

  const displayMessages = useMemo(() => {
    return deduplicateMessageList(messages);
  }, [messages]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [displayMessages.length, isTyping]);

  const handleSendMessage = (textToSend) => {
    if (!currentUser || !partnerUser) return;
    const rawText = textToSend || messageInput;
    const cleanText = sanitizeChatMessage(rawText);
    if (!cleanText) return;

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const nowIso = new Date().toISOString();
    const newMessage = {
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
    setMessages(prev => deduplicateMessageList([...prev, newMessage]));

    // Update conversation
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
              messages: deduplicateMessageList([...currentMsgs, newMessage])
            };
          }
          return c;
        });
      } else {
        return [...prev, {
          profileId: targetId,
          partnerUser: partnerUser,
          unreadCount: 0,
          messages: [newMessage],
          autoReplies: []
        }];
      }
    });

    setMessageInput('');

    // Send strictly via LiveChatService with canonical fields
    liveChatService.sendLiveMessage({
      sender: currentUser,
      recipient: partnerUser,
      message: newMessage,
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

  const icebreakers = [
    "Namaste! Delighted to connect with you.",
    "Loved your profile and family background.",
    "Our horoscope match showed high compatibility!",
    "Would you be open to a weekend video call with family?"
  ];

  return (
    <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-6">
      
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex h-[78vh] relative">
        
        {/* Left Sidebar: Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif font-bold text-lg text-[#0B192C]">
                Connected Matches
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DFB76C]/20 text-[#8C6D1F] font-bold border border-[#D4AF37]/30">
                {profiles.length} Available
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {profiles.slice(0, 8).map(profile => {
              const conv = conversations.find(c => c.profileId === profile.id);
              const lastMsg = conv?.messages?.[conv.messages.length - 1];
              const isSelected = profile.id === activeProfile.id;

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    setActiveProfileId(profile.id);
                    setMobileShowChat(true);
                  }}
                  className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/70 border-l-4 border-[#D4AF37]' : 'hover:bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={profile.photo} 
                      alt={profile.name} 
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" title="Online now"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {profile.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {lastMsg ? lastMsg.time : profile.lastActive}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : `${profile.district || profile.city}, ${profile.state}`}
                    </p>

                    <div className="flex items-center space-x-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 font-medium">
                        {profile.gunasMatch}
                      </span>
                      <span className="text-[10px] text-[#8C6D1F] font-semibold">
                        {profile.matchScore}% Match
                      </span>
                    </div>
                  </div>

                  {conv?.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#0B192C] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Active Chat Window */}
        <div className={`flex-1 flex flex-col bg-white ${
          !mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Chat Window Top Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative cursor-pointer" onClick={() => partnerUser && onSelectProfile(partnerUser)}>
                <img 
                  src={partnerUser?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'} 
                  alt={partnerUser?.name || 'Partner'}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#DFB76C]" 
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-slate-900 cursor-pointer hover:underline" onClick={() => partnerUser && onSelectProfile(partnerUser)}>
                    {partnerUser?.name || 'Candidate'}
                  </h3>
                  {partnerUser?.verified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" title="Verified Profile" />
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Chat Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>{partnerUser?.onlineStatus || 'Online'}</span>
                  <span>•</span>
                  <span>{partnerUser?.district || partnerUser?.city || 'India'}, {partnerUser?.state || ''}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button 
                onClick={() => partnerUser && onSelectProfile(partnerUser)}
                className="p-2 rounded-xl text-slate-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                title="View Full Matrimonial Profile"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button 
                type="button"
                onClick={() => handleAttemptCall('audio')}
                className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 border relative ${
                  isCallingUnlocked
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:shadow-sm border-emerald-200'
                    : 'text-slate-400 bg-slate-100 border-slate-200 opacity-60'
                }`}
                title={isCallingUnlocked ? "Live Call (Voice Call)" : "Voice Call locked - requires accepted interest"}
              >
                <Phone className="w-4 h-4" />
                {!isCallingUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-xs">
                    <Lock className="w-2 h-2 text-slate-950 stroke-[3]" />
                  </span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => handleAttemptCall('video')}
                className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 border relative ${
                  isCallingUnlocked
                    ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:shadow-sm border-indigo-200'
                    : 'text-slate-400 bg-slate-100 border-slate-200 opacity-60'
                }`}
                title={isCallingUnlocked ? "Live Video Call" : "Video Call locked - requires accepted interest"}
              >
                <Video className="w-4 h-4" />
                {!isCallingUnlocked && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-xs">
                    <Lock className="w-2 h-2 text-slate-950 stroke-[3]" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
            
            {/* Safety & Horoscope Notice */}
            <div className="max-w-md mx-auto bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center space-x-1 text-[#8C6D1F] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Horoscope Compatibility: {partnerUser?.gunasMatch || 'Compatible'} ({partnerUser?.matchScore || 85}% Match)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Messages are confidential and end-to-end encrypted under I 4 You matrimonial privacy policy.
              </p>
            </div>

            {/* Message Bubbles / Loading Skeleton / Empty State */}
            {isLoadingMessages ? (
              <div className="py-6 space-y-4">
                <div className="flex justify-start">
                  <div className="w-3/5 h-12 bg-slate-200 rounded-2xl rounded-bl-none animate-pulse" />
                </div>
                <div className="flex justify-end">
                  <div className="w-1/2 h-10 bg-slate-300 rounded-2xl rounded-br-none animate-pulse" />
                </div>
                <div className="flex justify-start">
                  <div className="w-2/3 h-14 bg-slate-200 rounded-2xl rounded-bl-none animate-pulse" />
                </div>
              </div>
            ) : displayMessages.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-[#8C6D1F] mx-auto flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-[#DFB76C]" />
                </div>
                <h4 className="font-serif font-bold text-base text-slate-800">
                  Start your conversation with {partnerUser?.name || 'Candidate'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Send a respectful proposal message or click one of the auspicious icebreakers below.
                </p>
              </div>
            ) : (
              displayMessages.map((msg, index) => {
                const isMe = String(msg.sender_id) === String(currentUser?.id) || (!msg.sender_id && msg.sender === 'me');
                const uniqueKey = msg.id || msg.tempId || `msg_${isMe ? 'me' : 'them'}_${index}_${msg.time || ''}`;
                return (
                  <div 
                    key={uniqueKey}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-gradient-to-r from-[#0B192C] to-[#1E3A8A] text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-400 px-1">
                      <span>{msg.time}</span>
                      {isMe && (
                        <span className="inline-flex items-center ml-0.5" title={msg.status || 'read'}>
                          {msg.status === 'sending' && <Clock className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                          {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-slate-400" />}
                          {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-slate-400" />}
                          {(msg.status === 'read' || !msg.status) && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white px-3.5 py-2 rounded-2xl w-fit border border-slate-200 animate-pulse">
                <span className="font-semibold text-[#0B192C]">{partnerUser?.name ? partnerUser.name.split(' ')[0] : 'Candidate'}</span> is typing a response...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Icebreakers Bar */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#DFB76C]" /> Icebreakers:
            </span>
            {icebreakers.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-[#D4AF37] hover:bg-amber-50/50 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
            {/* Quick Emojis Drawer */}
            {showEmojiPicker && (
              <div className="mb-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2">
                <span className="text-[11px] font-bold text-slate-500 pl-1 pr-2 border-r border-slate-300 shrink-0 flex items-center gap-1 select-none">
                  <Smile className="w-3.5 h-3.5 text-[#8C6D1F]" /> Emojis:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {CHAT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMessageInput(prev => prev + emoji)}
                      className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-white hover:shadow-xs active:scale-90 transition-all cursor-pointer hover:border hover:border-amber-200 select-none"
                      title={`Add ${emoji}`}
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
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showEmojiPicker ? 'bg-amber-100 text-[#8C6D1F]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title="Add Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => alert("Photo or Horoscope sharing is available once initial contact is verified.")}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                title="Attach Document / Kundali"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={"Message " + (partnerUser?.name || 'partner') + "..."}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#D4AF37] focus:outline-none"
              />

              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] font-bold text-xs sm:text-sm hover:from-[#dfb76c] hover:to-[#b89228] transition-all disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20"
              >
                <span className="hidden sm:inline">Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Calling Authorization Required Alert Modal */}
      {callAuthAlert && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setCallAuthAlert(null)}
        >
          <div 
            className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-[#DFB76C]" />
            </div>

            <h3 className="font-serif font-bold text-base text-slate-900 mb-2">
              {callAuthAlert.title}
            </h3>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
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
                className={`py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer ${
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
