import React from 'react';
import { 
  Users, 
  Search, 
  MessageCircle, 
  UserPlus, 
  LogIn,
  Layers
} from 'lucide-react';

export default function ScreenSwitcher({ currentScreen, setCurrentScreen, currentUser }) {
  const isLoggedIn = Boolean(currentUser && (currentUser.id || currentUser.name || currentUser.mobile));

  const screens = [
    { id: 'feed', name: 'Match Feed', icon: Users },
    { id: 'search', name: 'Advanced Search', icon: Search },
    { id: 'chat', name: 'In-App Chat', icon: MessageCircle },
    ...(!isLoggedIn ? [
      { id: 'register', name: 'Multi-Step Register', icon: UserPlus },
      { id: 'login', name: 'Login & OTP', icon: LogIn }
    ] : [])
  ];

  return (
    <aside aria-label="Screen Switcher" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#0B192C]/90 backdrop-blur-md border border-[#D4AF37]/50 rounded-full shadow-2xl p-1.5 flex items-center space-x-1 max-w-[95vw] overflow-x-auto">
      <div className="hidden sm:flex items-center space-x-1.5 px-3 text-[11px] font-semibold text-[#DFB76C] uppercase tracking-wider border-r border-[#D4AF37]/30">
        <Layers className="w-3.5 h-3.5" />
        <span>Screens</span>
      </div>
      {screens.map(s => {
        const Icon = s.icon;
        const active = currentScreen === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setCurrentScreen(s.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              active
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#0B192C]' : 'text-slate-400'}`} />
            <span>{s.name}</span>
          </button>
        );
      })}
    </aside>
  );
}
