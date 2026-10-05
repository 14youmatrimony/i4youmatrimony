import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  PhoneCall, 
  Mail, 
  MapPin, 
  HeartHandshake, 
  MessageSquare,
  Award,
  ChevronRight,
  Smartphone,
  LogOut,
  FileText,
  Scale
} from 'lucide-react';
import TermsAndConditionsModal from '../common/TermsAndConditionsModal';

export default function WebsiteFooter({ 
  onScrollToSection, 
  onOpenLogin, 
  onOpenRegister, 
  onOpenOffers,
  offers = [],
  selectedReligion = 'All Religions',
  onSelectReligion,
  currentUser,
  onLogout
}) {
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState('terms');

  const featuredOffer = (offers && offers.length > 0)
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1' || o.is_active === undefined) || offers[0])
    : null;

  const religionOptions = [
    { label: 'Hindu Matrimony', value: 'Hindu' },
    { label: 'Muslim Matrimony', value: 'Muslim' },
    { label: 'Christian Matrimony', value: 'Christian' },
    { label: 'Sikh Matrimony', value: 'Sikh' },
    { label: 'Jain Matrimony', value: 'Jain' },
    { label: 'Buddhist & Parsi Matrimony', value: 'Buddhist & Parsi' }
  ];

  return (
    <footer className="bg-[#060D17] text-slate-300 border-t border-[#D4AF37]/30">
      
      {/* 1. Value Proposition Banner */}
      <div className="border-b border-white/10 py-10 bg-[#0B192C]/80">
        <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">100% Aadhaar Verified</h4>
                <p className="text-xs text-slate-400">Zero fake profiles or catfishing</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Photo Privacy Shield</h4>
                <p className="text-xs text-slate-400">Screenshot-proof albums</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Direct Family Connect</h4>
                <p className="text-xs text-slate-400">Verified telephone numbers & chat</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pan-India Town Reach</h4>
                <p className="text-xs text-slate-400">700+ Indian districts connected</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Main Directory & Links Columns */}
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] p-0.5 shadow-md">
                <img src="/brand-logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <span className="text-2xl font-serif font-extrabold text-white">I 4 You</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/30 uppercase font-bold">
                  Matrimony
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-sm font-normal">
              "I 4 You" is India's most trusted matrimonial platform, uniting brides, grooms, and respected families with sacred Vedic compatibility, 100% Aadhaar verification, and uncompromising photo confidentiality.
            </p>

            <div className="space-y-2.5 text-sm text-slate-200 pt-2">
              <p className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#DFB76C] shrink-0" /> Toll Free Helpline: <strong className="text-white"><a href="tel:8968926566" className="hover:underline">8968926566</a></strong> (9 AM - 9 PM IST)
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#DFB76C] shrink-0" /> Support: <strong className="text-white"><a href="mailto:i4youmatrimony@gmail.com" className="hover:underline">i4youmatrimony@gmail.com</a></strong>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#DFB76C] shrink-0" /> Headquarters: i4youmatrimony, Alakode, Kannur, Kerala
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#DFB76C] uppercase tracking-wider mb-4 sm:mb-5">
              Explore Portal
            </h4>
            <ul className="space-y-3 sm:space-y-3.5 text-sm sm:text-[15px] font-medium text-slate-300">
              <li>
                <button onClick={() => onScrollToSection('matches-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Browse Verified Profiles
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('plans-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Membership Plans & Offers
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('download-section')} className="text-[#DFB76C] font-semibold hover:text-white transition-colors cursor-pointer text-left flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Download Mobile App (APK)
                </button>
              </li>
              {currentUser && (
                <li>
                  <button onClick={() => onScrollToSection('stories-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                    Candidate Video Statuses
                  </button>
                </li>
              )}
              <li>
                <button onClick={onOpenOffers} className="hover:text-white transition-colors cursor-pointer text-left">
                  {featuredOffer ? `Festive Plans & Offers (${featuredOffer.discount_percent}% Off)` : 'Membership Plans & Upgrades'}
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('matches-section')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Instant Match Finder
                </button>
              </li>
              {!currentUser ? (
                <>
                  <li>
                    <button onClick={onOpenLogin} className="hover:text-white transition-colors cursor-pointer text-left">
                      Member Login
                    </button>
                  </li>
                  <li>
                    <button onClick={onOpenRegister} className="hover:text-white transition-colors cursor-pointer text-left">
                      Register Free
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <button onClick={onLogout} className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-left flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log Out ({currentUser.name?.split(' ')[0] || 'Member'})</span>
                  </button>
                </li>
              )}
              <li>
                <button 
                  type="button"
                  onClick={() => {
                    setTermsTab('terms');
                    setIsTermsOpen(true);
                  }}
                  className="hover:text-white transition-colors cursor-pointer text-left flex items-center gap-1.5 text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Terms & Conditions</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Matrimony by Religion */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#DFB76C] uppercase tracking-wider mb-4 sm:mb-5 flex items-center justify-between">
              <span>By Religion</span>
              {selectedReligion !== 'All Religions' && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectReligion?.('All Religions');
                    onScrollToSection?.('matches-section');
                  }}
                  className="text-xs text-amber-300 hover:text-white underline cursor-pointer normal-case"
                >
                  Reset
                </button>
              )}
            </h4>
            <ul className="space-y-2.5 sm:space-y-3 text-sm sm:text-[15px] font-medium">
              {religionOptions.map((item) => {
                const isActive = selectedReligion === item.value;
                return (
                  <li key={item.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectReligion?.(item.value);
                        onScrollToSection?.('matches-section');
                      }}
                      className={`group flex items-center space-x-2.5 text-sm sm:text-[15px] transition-all cursor-pointer text-left w-full py-0.5 ${
                        isActive
                          ? 'text-[#DFB76C] font-bold pl-1'
                          : 'text-slate-300 hover:text-white hover:translate-x-1'
                      }`}
                    >
                      <span className={`text-xs transition-colors ${isActive ? 'text-[#DFB76C]' : 'text-slate-500 group-hover:text-[#DFB76C]'}`}>
                        ▸
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] border border-[#D4AF37]/40 font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* 3. Security Certifications & Compliance Footer Note */}
        <div className="pt-10 mt-10 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ISO 27001 Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-blue-400" /> 256-Bit SSL Encryption
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Award className="w-3.5 h-3.5 text-[#DFB76C]" /> UIDAI Aadhaar Compliant
            </span>
            <span>•</span>
            {/* Terms and Conditions Switch / Button */}
            <button
              type="button"
              onClick={() => {
                setTermsTab('terms');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#DFB76C] hover:text-white font-bold transition-all cursor-pointer shadow-xs active:scale-95 group text-xs"
              title="Click to view official Terms and Conditions & Legal Compliance"
            >
              <FileText className="w-3.5 h-3.5 text-[#DFB76C] group-hover:scale-110 transition-transform" />
              <span>Terms & Conditions</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setTermsTab('privacy');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-[#DFB76C] transition-colors cursor-pointer text-xs"
              title="Click to view Privacy Policy"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Privacy Policy</span>
            </button>
          </div>

          <p>© {new Date().getFullYear()} I 4 You Matrimonial Technologies Pvt. Ltd. All rights reserved.</p>
        </div>

      </div>

      {/* Interactive Terms & Conditions Modal */}
      <TermsAndConditionsModal 
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        initialTab={termsTab}
      />
    </footer>
  );
}
