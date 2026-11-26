import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  PhoneCall, 
  Mail, 
  MapPin, 
  HeartHandshake, 
  Award, 
  Smartphone, 
  LogOut, 
  FileText
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
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1') || null)
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
    <footer className="bg-[#FFFBF9] text-[#5A4649] border-t border-[#E5D0C6]">
      
      {/* 1. Value Proposition Banner */}
      <div className="border-b border-[#E5D0C6] py-10 bg-[#FFF9F6]">
        <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2C1A1D]">100% Aadhaar Verified</h4>
                <p className="text-xs text-[#5A4649]">Zero fake profiles or catfishing</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2C1A1D]">Photo Privacy Shield</h4>
                <p className="text-xs text-[#5A4649]">Screenshot-proof albums</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2C1A1D]">Direct Family Connect</h4>
                <p className="text-xs text-[#5A4649]">Verified telephone numbers & chat</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] flex items-center justify-center shrink-0 shadow-xs">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2C1A1D]">Pan-India Town Reach</h4>
                <p className="text-xs text-[#5A4649]">700+ Indian districts connected</p>
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7A2E43] to-[#C58B76] p-0.5 shadow-md">
                <img src="/brand-logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <span className="text-2xl font-serif font-extrabold text-[#2C1A1D]">I 4 You</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] uppercase font-bold">
                  Matrimony
                </span>
              </div>
            </div>

            <p className="text-sm text-[#5A4649] leading-relaxed max-w-sm font-normal">
              "I 4 You" is India's most trusted matrimonial platform, uniting brides, grooms, and respected families with sacred Vedic compatibility, 100% Aadhaar verification, and uncompromising photo confidentiality.
            </p>

            <div className="space-y-2.5 text-sm text-[#5A4649] pt-2">
              <p className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#C58B76] shrink-0" /> Toll Free Helpline: <strong className="text-[#2C1A1D]"><a href="tel:8968926566" className="hover:underline">8968926566</a></strong> (9 AM - 9 PM IST)
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C58B76] shrink-0" /> Support: <strong className="text-[#2C1A1D]"><a href="mailto:i4youmatrimony@gmail.com" className="hover:underline">i4youmatrimony@gmail.com</a></strong>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C58B76] shrink-0" /> Headquarters: i4youmatrimony, Alakode, Kannur, Kerala
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#7A2E43] uppercase tracking-wider mb-4 sm:mb-5">
              Explore Portal
            </h4>
            <ul className="space-y-3 sm:space-y-3.5 text-sm sm:text-[15px] font-medium text-[#5A4649]">
              <li>
                <button onClick={() => onScrollToSection('matches-section')} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                  Browse Verified Profiles
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('plans-section')} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                  Membership Plans & Offers
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('download-section')} className="text-[#7A2E43] font-semibold hover:text-[#612234] transition-colors cursor-pointer text-left flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#C58B76]" /> Download Mobile App (APK)
                </button>
              </li>
              {currentUser && (
                <li>
                  <button onClick={() => onScrollToSection('stories-section')} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                    Candidate Video Statuses
                  </button>
                </li>
              )}
              <li>
                <button onClick={onOpenOffers} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                  {featuredOffer ? `Festive Plans & Offers (${featuredOffer.discount_percent}% Off)` : 'Membership Plans & Upgrades'}
                </button>
              </li>
              <li>
                <button onClick={() => onScrollToSection('matches-section')} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                  Instant Match Finder
                </button>
              </li>
              {!currentUser ? (
                <>
                  <li>
                    <button onClick={onOpenLogin} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                      Member Login
                    </button>
                  </li>
                  <li>
                    <button onClick={onOpenRegister} className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left">
                      Register Free
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <button onClick={onLogout} className="text-rose-600 hover:text-rose-700 transition-colors cursor-pointer text-left flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
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
                  className="hover:text-[#7A2E43] transition-colors cursor-pointer text-left flex items-center gap-1.5 text-[#5A4649]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C58B76]" />
                  <span>Terms & Conditions</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Matrimony by Religion */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#7A2E43] uppercase tracking-wider mb-4 sm:mb-5 flex items-center justify-between">
              <span>By Religion</span>
              {selectedReligion !== 'All Religions' && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectReligion?.('All Religions');
                    onScrollToSection?.('matches-section');
                  }}
                  className="text-xs text-[#7A2E43] hover:underline cursor-pointer normal-case font-bold"
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
                          ? 'text-[#7A2E43] font-bold pl-1'
                          : 'text-[#5A4649] hover:text-[#7A2E43] hover:translate-x-1'
                      }`}
                    >
                      <span className={`text-xs transition-colors ${isActive ? 'text-[#7A2E43]' : 'text-[#8E797C] group-hover:text-[#7A2E43]'}`}>
                        ▸
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#FDECE4] text-[#7A2E43] border border-[#E5D0C6] font-bold">
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
        <div className="pt-10 mt-10 border-t border-[#E5D0C6] flex flex-wrap items-center justify-between gap-4 text-xs text-[#8E797C]">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <span className="flex items-center gap-1 text-[#5A4649]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ISO 27001 Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#5A4649]">
              <Lock className="w-3.5 h-3.5 text-blue-600" /> 256-Bit SSL Encryption
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#5A4649]">
              <Award className="w-3.5 h-3.5 text-[#C58B76]" /> UIDAI Aadhaar Compliant
            </span>
            <span>•</span>
            {/* Terms and Conditions Switch / Button */}
            <button
              type="button"
              onClick={() => {
                setTermsTab('terms');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECE4] hover:bg-[#f7ddd4] border border-[#E5D0C6] text-[#7A2E43] font-bold transition-all cursor-pointer shadow-xs active:scale-95 group text-xs"
              title="Click to view official Terms and Conditions & Legal Compliance"
            >
              <FileText className="w-3.5 h-3.5 text-[#C58B76] group-hover:scale-110 transition-transform" />
              <span>Terms & Conditions</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setTermsTab('privacy');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1 text-[#5A4649] hover:text-[#7A2E43] transition-colors cursor-pointer text-xs"
              title="Click to view Privacy Policy"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#5A4649]" />
              <span>Privacy Policy</span>
            </button>
            <span>•</span>
            <a
              href="/super-admin"
              className="flex items-center gap-1 text-[#5A4649] hover:text-[#7A2E43] transition-colors cursor-pointer text-xs font-medium"
              title="Central Super Admin Portal"
            >
              <Lock className="w-3.5 h-3.5 text-[#C58B76]" />
              <span>Admin Portal</span>
            </a>
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
