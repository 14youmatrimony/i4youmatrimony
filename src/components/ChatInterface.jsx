import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Smile, 
  Paperclip, 
  CheckCheck, 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  MapPin, 
  Briefcase,
  ChevronLeft
} from 'lucide-react';
import { sanitizeChatMessage } from '../utils/security';

export default function ChatInterface({ 
  profiles, 
  conversations, 
  setConversations, 
  activeProfileId, 
  setActiveProfileId, 
  onSelectProfile,
  onStartAudioCall,
  onStartVideoCall
}) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const CHAT_EMOJIS = ['🙏', '💖', '✨', '🌸', '💐', '💍', '🤝', '😊', '🌺', '🌟', '💫', '🕊️', '❤️', '🌹', '😍', '👍'];

  // Active profile
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  
  // Find or initialize conversation for active profile
  const activeConv = conversations.find(c => c.profileId === activeProfile.id) || {
    profileId: activeProfile.id,
    unreadCount: 0,
    messages: [
      {
        id: 'init-1',
        sender: 'them',
        text: `Namaste! Thank you for connecting on I 4 You. I noticed your profile and our backgrounds align very well.`,
        time: 'Just now',
        status: 'read'
      }
    ],
    autoReplies: [
      "Thank you for your message! It is wonderful to hear from you.",
      "Yes, absolutely. My family in " + activeProfile.city + " also reviewed the details and they were very pleased.",
      "Would love to speak further! Let's arrange a time that works best for you.",
      "Wishing you a peaceful and auspicious week ahead!"
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

  const handleSendMessage = (textToSend) => {
    const rawText = textToSend || messageInput;
    const cleanText = sanitizeChatMessage(rawText);
    if (!cleanText) return;

    const newMessage = {
      id: 'msg-' + Date.now(),
      sender: 'me',
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered'
    };

    // Update conversation
    setConversations(prev => {
      const exists = prev.find(c => c.profileId === activeProfile.id);
      if (exists) {
        return prev.map(c => {
          if (c.profileId === activeProfile.id) {
            return {
              ...c,
              unreadCount: 0,
              messages: [...c.messages, newMessage]
            };
          }
          return c;
        });
      } else {
        return [...prev, {
          profileId: activeProfile.id,
          unreadCount: 0,
          messages: [newMessage],
          autoReplies: activeConv.autoReplies
        }];
      }
    });

    setMessageInput('');

    // Simulate auto-reply from match
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyList = activeConv.autoReplies || [
        "That sounds wonderful! I will discuss this with my parents as well.",
        "Glad to connect! Looking forward to learning more about your passions and life goals."
      ];
      const randomReply = replyList[Math.floor(Math.random() * replyList.length)];

      const replyMessage = {
        id: 'reply-' + Date.now(),
        sender: 'them',
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };

      setConversations(prev => prev.map(c => {
        if (c.profileId === activeProfile.id) {
          return {
            ...c,
            messages: [...c.messages, replyMessage]
          };
        }
        return c;
      }));
    }, 1600);
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

              <div className="relative cursor-pointer" onClick={() => onSelectProfile(activeProfile)}>
                <img 
                  src={activeProfile.photo} 
                  alt={activeProfile.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#DFB76C]" 
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-slate-900 cursor-pointer hover:underline" onClick={() => onSelectProfile(activeProfile)}>
                    {activeProfile.name}
                  </h3>
                  {activeProfile.verified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" title="Verified Profile" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>{activeProfile.profession}</span>
                  <span>•</span>
                  <span>{activeProfile.district || activeProfile.city}, {activeProfile.state}</span>
                </p>
              </div>
            </div>

            {/* Quick Mock Actions in Header */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button 
                onClick={() => onSelectProfile(activeProfile)}
                className="p-2 rounded-xl text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                title="View Full Matrimonial Profile"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button 
                onClick={() => onStartAudioCall ? onStartAudioCall(activeProfile) : alert(`Simulating safe matrimony audio call with ${activeProfile.name}...`)}
                className="p-2 rounded-xl text-slate-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all cursor-pointer active:scale-95"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button 
                onClick={() => onStartVideoCall ? onStartVideoCall(activeProfile) : alert(`Simulating safe family video meeting with ${activeProfile.name}...`)}
                className="p-2 rounded-xl text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all cursor-pointer active:scale-95"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
            
            {/* Safety & Horoscope Notice */}
            <div className="max-w-md mx-auto bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center space-x-1 text-[#8C6D1F] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Horoscope Compatibility: {activeProfile.gunasMatch} ({activeProfile.matchScore}% Match)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Messages are confidential and end-to-end encrypted under I 4 You matrimonial privacy policy.
              </p>
            </div>

            {/* Message Bubbles */}
            {activeConv.messages.map((msg) => {
              const isMe = msg.sender === 'me';
              return (
                <div 
                  key={msg.id}
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
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white px-3.5 py-2 rounded-2xl w-fit border border-slate-200 animate-pulse">
                <span className="font-semibold text-[#0B192C]">{activeProfile.name.split(' ')[0]}</span> is typing a response...
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
                placeholder={`Type a respectful message to ${activeProfile.name.split(' ')[0]}...`}
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

    </div>
  );
}
