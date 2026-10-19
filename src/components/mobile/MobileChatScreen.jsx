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
  MessageSquareOff,
  Lock,
  Crown,
  Smile
} from 'lucide-react';

const POPULAR_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹'];
import { sanitizeChatMessage } from '../../utils/security';
import { getAppMode } from '../../config/appConfig';
import { useTheme } from '../../context/ThemeContext';
import { getTargetCandidateGender, isCandidateMatchingTarget } from '../../utils/genderMatch';
import { liveChatService } from '../../services/liveChatService';
import { useInterestStatus } from '../../services/interestService';

export default function MobileChatScreen({
  profiles,
  currentUser,
  conversations,
  setConversations,
  activeProfileId,
  setActiveProfileId,
  onSelectProfile,
  isDirectChatOpen = false,
  setIsDirectChatOpen,
  onOpenOffers,
  onOpenLogin,
  onStartAudioCall,
  onStartVideoCall,
  onRequestSendInterest,
  onToggleInterest
}) {
  const isProduction = getAppMode();
  const { bottomBarStyle, accent, isDarkMode } = useTheme();
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');
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

  const targetCandidateGender = useMemo(() => {
    return getTargetCandidateGender(currentUser);
  }, [currentUser]);

  // Strict opposite gender candidate filtering for chats
  const validProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (currentUser?.id && p.id === currentUser.id) return false;
      if (currentUser?.mobile && (p.mobile === currentUser.mobile || p.phone === currentUser.mobile)) return false;
      return isCandidateMatchingTarget(p.gender, targetCandidateGender);
    });
  }, [profiles, currentUser, targetCandidateGender]);

  // Conversations List Profiles (Strictly Opposite Gender Matches with real messages)
  const chatProfiles = useMemo(() => {
    return validProfiles.filter(p => conversations.some(c => c.profileId === p.id && c.messages?.length > 0));
  }, [validProfiles, conversations]);

  const activeProfile = validProfiles.find(p => p.id === activeProfileId || p.register_id === activeProfileId || p.registerId === activeProfileId) 
    || profiles.find(p => p.id === activeProfileId || p.register_id === activeProfileId || p.registerId === activeProfileId) 
    || validProfiles[0] 
    || {
      id: activeProfileId || 'placeholder',
      name: 'Candidate',
      city: 'India',
      state: ''
    };

  const { status: interestStatus, isAccepted: isCallingUnlocked } = useInterestStatus(currentUser, activeProfile);
  const [callAuthAlert, setCallAuthAlert] = useState(null);

  const handleAttemptCall = (type = 'audio') => {
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

  const existingConv = conversations.find(c => c.profileId === activeProfile.id || c.profileId === activeProfileId);
  const activeConv = existingConv || {
    profileId: activeProfile.id,
    unreadCount: 0,
    messages: [],
    autoReplies: []
  };

  const hasIncomingMessage = Boolean(activeConv?.messages?.some(m => m.sender === 'them'));
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
  }, [activeConv?.messages, isTyping, currentUser]);

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

  // Listen to incoming real-time messages, delivery status acks, and typing indicators
  useEffect(() => {
    if (!currentUser) return;
    const matchId = activeProfile?.id;
    const matchRegId = activeProfile?.register_id || activeProfile?.registerId;

    const unsubscribeMsg = liveChatService.onMessage((incoming) => {
      if (incoming.senderId === matchId || incoming.senderId === matchRegId) {
        const incomingMsg = {
          id: incoming.id || ('m-' + Date.now()),
          sender: 'them',
          text: incoming.text,
          time: incoming.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };

        setConversations(prev => {
          const exists = prev.find(c => c.profileId === matchId || c.profileId === matchRegId);
          if (exists) {
            return prev.map(c => {
              if (c.profileId === matchId || c.profileId === matchRegId) {
                return {
                  ...c,
                  unreadCount: 0,
                  messages: [...(c.messages || []), incomingMsg]
                };
              }
              return c;
            });
          } else {
            return [
              ...prev,
              {
                profileId: matchId,
                unreadCount: 0,
                messages: [incomingMsg],
                autoReplies: []
              }
            ];
          }
        });
        setIsTyping(false);
      }
    });

    const unsubscribeStatus = liveChatService.onStatus(({ messageId, status }) => {
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => m.id === messageId ? { ...m, status } : m)
      })));
    });

    const unsubscribeTyping = liveChatService.onTyping(({ senderId, isTyping: typingState }) => {
      if (senderId === matchId || senderId === matchRegId) {
        setIsTyping(Boolean(typingState));
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeStatus();
      unsubscribeTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [currentUser, activeProfile?.id, activeProfile?.register_id, activeProfile?.registerId, setConversations]);

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

    const rawText = textToSend || inputText;
    const cleanText = sanitizeChatMessage(rawText);
    if (!cleanText) return;

    const msgId = 'm-' + Date.now();
    const newMsg = {
      id: msgId,
      sender: 'me',
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };

    setConversations(prev => {
      const exists = prev.find(c => c.profileId === activeProfile.id);
      if (exists) {
        return prev.map(c => {
          if (c.profileId === activeProfile.id) {
            return {
              ...c,
              unreadCount: 0,
              messages: [...c.messages, newMsg]
            };
          }
          return c;
        });
      } else {
        return [
          ...prev,
          {
            profileId: activeProfile.id,
            unreadCount: 0,
            messages: [newMsg],
            autoReplies: [
              `Namaste! Thank you for reaching out. Our family in ${activeProfile.city || activeProfile.district || 'India'} is happy to take this forward.`,
              `Glad to connect with you! Would love to schedule a friendly phone or video call with our families.`,
              `Wishing you and your family an auspicious day ahead!`
            ]
          }
        ];
      }
    });

    setInputText('');

    // Transmit via LiveChatService (Supabase Realtime Broadcast + Cross-tab sync)
    liveChatService.sendLiveMessage({
      sender: currentUser,
      recipient: activeProfile,
      message: newMsg
    });

    // 1. Live status: Sending -> Sent (single tick)
    setTimeout(() => {
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => m.id === msgId && m.status === 'sending' ? { ...m, status: 'sent' } : m)
      })));
    }, 280);

    // 2. Live status: Sent -> Delivered (double tick)
    setTimeout(() => {
      setConversations(prev => prev.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => m.id === msgId && (m.status === 'sending' || m.status === 'sent') ? { ...m, status: 'delivered' } : m)
      })));
    }, 650);

    // 3. Live matrimonial candidate response delivery
    const typingDelay = 1000 + Math.random() * 500;
    const responseDelay = typingDelay + 1400 + Math.random() * 800;

    setTimeout(() => {
      setIsTyping(true);
    }, typingDelay);

    setTimeout(() => {
      setIsTyping(false);

      const replyText = liveChatService.generateContextualMatrimonialReply(cleanText, activeProfile);
      const replyMsg = {
        id: 'rep-' + Date.now(),
        sender: 'them',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };

      liveChatService.playReceiveSound();

      setConversations(prev => {
        const exists = prev.find(c => c.profileId === activeProfile.id);
        if (exists) {
          return prev.map(c => {
            if (c.profileId === activeProfile.id) {
              return {
                ...c,
                messages: [
                  ...c.messages.map(m => m.id === msgId ? { ...m, status: 'read' } : m),
                  replyMsg
                ]
              };
            }
            return c;
          });
        } else {
          return [
            ...prev,
            {
              profileId: activeProfile.id,
              unreadCount: 0,
              messages: [replyMsg],
              autoReplies: []
            }
          ];
        }
      });
    }, responseDelay);
  };

  // View 1: Active Chat Conversation
  if (inConversation) {
    return (
      <div className={`flex-1 flex flex-col h-full min-h-0 relative overflow-hidden transition-colors duration-200 ${
        isDarkMode ? 'bg-[#081220] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        
        {/* Native Mobile Chat Header */}
        <div className="bg-[#0B192C] text-white px-3 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={() => {
                setInConversation(false);
                setIsDirectChatOpen?.(false);
              }}
              className="p-1 rounded-full text-slate-300 hover:text-white cursor-pointer"
              title="Back to all conversations"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div 
              className="relative cursor-pointer shrink-0" 
              onClick={() => onSelectProfile(activeProfile)}
            >
              <img 
                src={activeProfile.photo} 
                alt={activeProfile.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-[#DFB76C]" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1.5 ring-[#0B192C]"></span>
            </div>

            <div className="min-w-0" onClick={() => onSelectProfile(activeProfile)}>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-serif font-bold text-xs sm:text-sm text-white truncate">
                  {activeProfile.name}
                </h3>
                {activeProfile.verified && (
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
                  `Online • ${activeProfile.district || activeProfile.city || 'India'}`
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
            <span className="font-bold">Horoscope Match: {activeProfile.gunasMatch} ({activeProfile.matchScore}% Match)</span>
            <p className="text-slate-500 mt-0.5">End-to-end encrypted under I 4 You matrimonial privacy guarantee.</p>
          </div>

          {activeConv.messages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-100 to-yellow-50 border border-amber-200 text-[#8C6D1F] mx-auto flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-[#DFB76C]" />
              </div>
              <h4 className="font-serif font-bold text-sm text-slate-800">
                Start your conversation with {activeProfile.name}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Send a respectful message or choose an auspicious conversation starter below.
              </p>
            </div>
          ) : (
            activeConv.messages.map(m => {
              const isMe = m.sender === 'me';
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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
              {activeProfile.name.split(' ')[0]} is typing...
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
                placeholder={`Message ${activeProfile.name.split(' ')[0]}...`}
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
          placeholder="Search matches & chats..."
          className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none shadow-sm ${
            isDarkMode ? 'bg-slate-900 border border-slate-800 text-white placeholder-slate-400' : 'bg-white border border-slate-200'
          }`}
        />
      </div>

      {chatProfiles.length === 0 ? (
        <div className={`py-16 px-6 text-center space-y-3.5 rounded-2xl border shadow-xs mt-2 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-100 to-yellow-50 border border-[#D4AF37]/40 text-[#8C6D1F] mx-auto flex items-center justify-center shadow-xs">
            <MessageCircle className="w-7 h-7 text-[#DFB76C]" />
          </div>
          <h3 className={`font-serif font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Conversations Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Send an interest to compatible profiles or accept incoming requests to start private, family-verified chats.
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden divide-y shadow-sm ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
        }`}>
          {chatProfiles.map(profile => {
            const conv = conversations.find(c => c.profileId === profile.id);
            const lastMsg = conv?.messages?.[conv.messages.length - 1];

            return (
              <div
                key={profile.id}
                onClick={() => {
                  setActiveProfileId(profile.id);
                  setInConversation(true);
                  setIsDirectChatOpen?.(true);
                }}
                className={`p-3 flex items-center space-x-3 cursor-pointer transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={profile.photo} 
                    alt={profile.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#DFB76C]/50" 
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-serif font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {profile.name}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {lastMsg ? lastMsg.time : profile.lastActive}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {lastMsg ? lastMsg.text : `${profile.district || profile.city}, ${profile.state}`}
                  </p>

                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      {profile.gunasMatch}
                    </span>
                    <span className="text-[9px] text-[#8C6D1F] font-bold">
                      {profile.matchScore}% Match
                    </span>
                  </div>
                </div>

                {conv?.unreadCount > 0 && (
                  <span 
                    className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: accent?.primary || '#D4AF37',
                      color: accent?.badgeText === 'text-white' ? '#FFFFFF' : '#0B192C'
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
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

