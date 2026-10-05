import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Phone, 
  Video, 
  ChevronLeft, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  CheckCheck, 
  MessageCircle,
  MessageSquareOff,
  Lock,
  Crown
} from 'lucide-react';
import { sanitizeChatMessage } from '../../utils/security';
import { getAppMode } from '../../config/appConfig';
import { useTheme } from '../../context/ThemeContext';
import { getTargetCandidateGender, isCandidateMatchingTarget } from '../../utils/genderMatch';

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
  onOpenOffers
}) {
  const isProduction = getAppMode();
  const { bottomBarStyle, accent, isDarkMode } = useTheme();
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');
  const [inConversation, setInConversation] = useState(isDirectChatOpen);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  // Conversations List Profiles (Strictly Opposite Gender Matches)
  const chatProfiles = useMemo(() => {
    const matchingConvs = validProfiles.filter(p => conversations.some(c => c.profileId === p.id && (c.messages?.length > 0 || !isProduction)));
    return matchingConvs.length > 0 ? matchingConvs : validProfiles.slice(0, 6);
  }, [validProfiles, conversations, isProduction]);

  const activeProfile = validProfiles.find(p => p.id === activeProfileId) || validProfiles[0] || {
    id: 'placeholder',
    name: 'Candidate',
    city: 'India',
    state: ''
  };

  const existingConv = conversations.find(c => c.profileId === activeProfile.id);
  const activeConv = existingConv || {
    profileId: activeProfile.id,
    unreadCount: 0,
    messages: isProduction ? [] : [
      {
        id: 'init-1',
        sender: 'them',
        text: `Namaste! Thank you for connecting on I 4 You. I noticed your profile and our family values align very well.`,
        time: 'Just now',
        status: 'read'
      }
    ],
    autoReplies: isProduction ? [] : [
      "Thank you so much! It is wonderful connecting with you.",
      `Yes, my parents here in ${activeProfile.city || 'our hometown'} also had a look and were very pleased.`,
      "Would love to speak further! Let's arrange a time that works best for you.",
      "Wishing you an auspicious day ahead!"
    ]
  };

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
  }, [activeConv?.messages, isTyping]);

  useEffect(() => {
    if (inConversation) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [inConversation]);

  const handleSend = (textToSend) => {
    if (!hasPaidPlan) {
      onOpenOffers?.();
      return;
    }

    const rawText = textToSend || inputText;
    const cleanText = sanitizeChatMessage(rawText);
    if (!cleanText) return;

    const newMsg = {
      id: 'm-' + Date.now(),
      sender: 'me',
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
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
              `Namaste! Thank you for reaching out. Our family in ${activeProfile.city || 'India'} is happy to take this forward.`,
              `Glad to connect with you! Would love to schedule a friendly phone or video call with our families.`,
              `Wishing you and your family an auspicious day ahead!`
            ]
          }
        ];
      }
    });

    setInputText('');

    // In demo mode, simulate automated bot response for testing. In production mode, real messages are sent to live backend.
    if (!isProduction) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyList = activeConv.autoReplies || [
          "Sounds wonderful! Looking forward to talking more.",
          "Glad to connect! I will also share this with my family."
        ];
        const randomReply = replyList[Math.floor(Math.random() * replyList.length)];

        const replyMsg = {
          id: 'rep-' + Date.now(),
          sender: 'them',
          text: randomReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };

        setConversations(prev => {
          const exists = prev.find(c => c.profileId === activeProfile.id);
          if (exists) {
            return prev.map(c => {
              if (c.profileId === activeProfile.id) {
                return {
                  ...c,
                  messages: [...c.messages, replyMsg]
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
      }, 1500);
    }
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
              <div className="flex items-center space-x-1">
                <h3 className="font-serif font-bold text-xs sm:text-sm text-white truncate">
                  {activeProfile.name}
                </h3>
                {activeProfile.verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-slate-300 truncate">
                Online • {activeProfile.district || activeProfile.city}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => alert(`Calling ${activeProfile.name} via secure matrimony call...`)}
              className="p-2 text-slate-300 hover:text-emerald-400"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert(`Starting video meeting with ${activeProfile.name}...`)}
              className="p-2 text-slate-300 hover:text-blue-400"
            >
              <Video className="w-4 h-4" />
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
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
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

        {/* Icebreakers (Subscribed Only) */}
        {hasPaidPlan ? (
          <div className={`px-3 py-1.5 border-t flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 ${
            isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100/70 border-slate-200'
          }`}>
            {[
              "Namaste! Delighted to connect.",
              "Loved your profile & background!",
              "Are you open to a weekend call?",
              "Discuss horoscope with family?"
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-[#D4AF37]' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-[#D4AF37]'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {/* Bottom Input - Active Form or Subscribed Gate */}
        {!hasPaidPlan ? (
          <div 
            className={`p-3.5 border-t text-center space-y-2 shrink-0 ${
              isDarkMode ? 'bg-[#0B192C] border-white/10' : 'bg-gradient-to-b from-amber-50/95 to-orange-50/95 border-amber-200'
            }`}
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-amber-900">
              <Lock className="w-4 h-4 text-[#8C6D1F]" />
              <span>Direct Matrimonial Chat Requires an Active Subscription</span>
            </div>
            <p className="text-[11px] text-slate-600 max-w-xs mx-auto leading-relaxed">
              Upgrade to send unlimited direct messages and coordinate family video meetings with verified candidates.
            </p>
            <button
              type="button"
              onClick={() => onOpenOffers?.()}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] font-extrabold text-xs shadow-md hover:brightness-105 cursor-pointer flex items-center justify-center space-x-1.5 mx-auto"
            >
              <Crown className="w-4 h-4 text-[#0B192C]" />
              <span>View Plans & Unlock Chat (50% OFF)</span>
            </button>
          </div>
        ) : (
          <div 
            className={`px-3 pt-2.5 pb-2.5 sm:pb-3 shrink-0 border-t transition-colors ${
              isDarkMode ? 'bg-[#0B192C] border-white/10' : 'bg-white border-slate-200'
            }`}
            style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
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
                className="p-2.5 rounded-xl bg-[#D4AF37] text-[#0B192C] disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
                style={{
                  backgroundColor: accent?.primary || '#D4AF37',
                  color: accent?.badgeText === 'text-white' ? '#FFFFFF' : '#0B192C'
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

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
    </div>
  );
}

