import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  HeartHandshake, 
  PhoneCall, 
  Mail, 
  MapPin, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function Footer({ setCurrentScreen }) {
  return (
    <footer className="bg-[#0B192C] text-slate-300 border-t border-[#D4AF37]/30 mt-auto">
      
      {/* Top Value Propositions */}
      <div className="border-b border-white/10 py-8 bg-[#07111E]">
        <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center sm:text-left">
            
            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="w-11 h-11 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">100% Verified Profiles</h4>
                <p className="text-xs text-slate-400">Manual screening & Aadhaar checks</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="w-11 h-11 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Strict Privacy Controls</h4>
                <p className="text-xs text-slate-400">Photos & contact details secured</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="w-11 h-11 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ashtakoot Gunas Milan</h4>
                <p className="text-xs text-slate-400">Vedic horoscope compatibility</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 justify-center sm:justify-start">
              <div className="w-11 h-11 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pan-India Coverage</h4>
                <p className="text-xs text-slate-400">Tier 1, 2, 3 & 4 towns & cities</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-serif font-extrabold text-white">I 4 You</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40 font-medium">
                Matrimony
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              "I 4 You" is India’s most trusted matrimonial matchmaking platform, bringing together brides and grooms across metro cities and vibrant tier 2, 3, and 4 towns with cultural authenticity and contemporary dignity.
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1.5">
              <p className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#DFB76C]" /> Toll Free: <a href="tel:8968926566" className="text-white hover:underline font-semibold">8968926566</a> (9 AM - 9 PM IST)
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#DFB76C]" /> <a href="mailto:i4youmatrimony@gmail.com" className="text-white hover:underline font-semibold">i4youmatrimony@gmail.com</a>
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentScreen('feed')} className="hover:text-white transition-colors">
                  Match Feed Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('search')} className="hover:text-white transition-colors">
                  Advanced State & City Search
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('register')} className="hover:text-white transition-colors">
                  Multi-Step Registration
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('chat')} className="hover:text-white transition-colors">
                  In-App Member Chat
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentScreen('login')} className="hover:text-white transition-colors">
                  Mobile Login & OTP
                </button>
              </li>
            </ul>
          </div>

          {/* Regional Portals */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider mb-3">
              Regional Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-white cursor-pointer">Maharashtra & Goa Matrimony</li>
              <li className="hover:text-white cursor-pointer">Karnataka & South India</li>
              <li className="hover:text-white cursor-pointer">Delhi NCR, Punjab & North India</li>
              <li className="hover:text-white cursor-pointer">Gujarat & Rajasthan Matrimony</li>
              <li className="hover:text-white cursor-pointer">Tamil Nadu & Kerala Portals</li>
              <li className="hover:text-white cursor-pointer">Bengal & Eastern India</li>
            </ul>
          </div>

          {/* City Tiers Covered */}
          <div>
            <h4 className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider mb-3">
              Tier 1 to Tier 4 Towns
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><span className="font-semibold text-slate-200">Tier 1:</span> Mumbai, Bengaluru, Delhi, Pune</li>
              <li><span className="font-semibold text-slate-200">Tier 2:</span> Nashik, Mysuru, Surat, Jaipur</li>
              <li><span className="font-semibold text-slate-200">Tier 3:</span> Kolhapur, Salem, Belagavi, Alwar</li>
              <li><span className="font-semibold text-slate-200">Tier 4:</span> Baramati, Pollachi, Udupi, Morbi</li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 mt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} I 4 You Matrimony Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Safeguards</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Community Guidelines</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
