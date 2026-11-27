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
import { APP_STORE_URL, PLAY_STORE_URL } from '../../config/appStoreLinks';

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

  const smartDownloadUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/download`
      : 'https://www.i4youmatrimony.com/download';
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(smartDownloadUrl)}`;

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
    <footer className="bg-[#FAF0F2] text-[#4A2E37]">
      {/* Main Directory & Links Columns */}
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-3 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4E0C22] to-[#8E5766] p-0.5 shadow-md">
                <img src="/brand-logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <span className="text-2xl font-serif font-extrabold text-[#380817]">I 4 You</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#F7E2E7] text-[#4E0C22] border border-[#E7CCD3] uppercase font-bold">
                  Matrimony
                </span>
              </div>
            </div>

            <p className="text-sm text-[#4A2E37] leading-relaxed max-w-sm font-normal">
              "I 4 You" is India's most trusted matrimonial platform, uniting brides, grooms, and respected families with sacred Vedic compatibility, 100% Aadhaar verification, and uncompromising photo confidentiality.
            </p>

            <div className="space-y-2.5 text-sm text-[#4A2E37] pt-2">
              <p className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#8E5766] shrink-0" /> Toll Free Helpline: <strong className="text-[#380817]"><a href="tel:8968926566" className="hover:underline">8968926566</a></strong> (9 AM - 9 PM IST)
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#8E5766] shrink-0" /> Support: <strong className="text-[#380817]"><a href="mailto:i4youmatrimony@gmail.com" className="hover:underline">i4youmatrimony@gmail.com</a></strong>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8E5766] shrink-0" /> Headquarters: i4youmatrimony, Alakode, Kannur, Kerala
              </p>
            </div>
          </div>

          {/* Mobile App QR Code & Store Switches Slot */}
          <div className="flex items-start justify-start">
            <div className="w-full max-w-[350px] rounded-2xl bg-white/95 border border-rose-200/60 p-3.5 shadow-sm flex flex-row items-center gap-3.5">
              {/* Smart Cross-Platform QR Code */}
              <div className="flex flex-col items-center text-center shrink-0 w-[108px] space-y-1.5">
                <div className="p-1.5 bg-white rounded-xl border border-[#E7CCD3]/70">
                  <img
                    src={qrCodeSrc}
                    alt="Point your phone camera at the QR code"
                    className="w-24 h-24 object-contain block"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallbackApplied) {
                        e.currentTarget.dataset.fallbackApplied = '1';
                        e.currentTarget.src = '/app-download-qr.svg';
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#380817] leading-tight">
                  Point your phone camera at the QR code
                </p>
              </div>

              {/* Official Store Download Switches */}
              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#380817] text-white border border-[#E7CCD3]/50 hover:border-[#8E5766] hover:bg-[#3A2327] transition-all shadow-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 512 512" aria-hidden="true">
                    <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" />
                    <path fill="#34A853" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l255.6-256L47 0z" />
                    <path fill="#FBBC04" d="M421.7 218.4l-96.4-55.4-67.6 67.6 67.6 67.6 96.5-55.4c17.5-10 17.5-34.8-.1-44.4z" />
                    <path fill="#EA4335" d="M104.6 499l280.8-161.3-60.1-60.1L104.6 499z" />
                  </svg>
                  <div className="text-left leading-tight min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-rose-100/80">
                      Get it on
                    </div>
                    <div className="text-xs sm:text-sm font-semibold tracking-tight truncate">
                      Google Play
                    </div>
                  </div>
                </a>

                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#380817] text-white border border-[#E7CCD3]/50 hover:border-[#8E5766] hover:bg-[#3A2327] transition-all shadow-sm"
                >
                  <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 170 170" aria-hidden="true">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.17-9.44-11.05-20.15-14.65-32.14-3.6-11.98-5.4-23.01-5.4-33.09 0-14.68 3.51-26.65 10.53-35.91 7.02-9.26 15.84-13.97 26.47-14.12 5.06 0 10.74 1.34 17.04 4.02 6.3 2.68 10.14 4.08 11.52 4.2 1.83-.34 5.9-1.89 12.21-4.65 6.31-2.76 11.89-4.02 16.74-3.79 12.83.67 22.95 5.56 30.36 14.67-11.19 6.81-16.69 16.29-16.5 28.44.18 10.01 4.07 18.33 11.68 24.96 4.88 4.29 10.45 7.15 16.71 8.58-2.31 6.84-5.28 14.4-8.91 22.68zM119.22 33.06c0-7.39 2.68-14.28 8.04-20.67 5.36-6.39 12.04-10.42 20.04-12.09.22 1.34.34 2.57.34 3.69 0 7.39-2.8 14.39-8.4 21-5.6 6.61-12.39 10.63-20.37 12.06-.23-1.34-.35-2.67-.35-3.99z" />
                  </svg>
                  <div className="text-left leading-tight min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-rose-100/80">
                      Download on the
                    </div>
                    <div className="text-xs sm:text-sm font-semibold tracking-tight truncate">
                      App Store
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Matrimony by Religion */}
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#4E0C22] uppercase tracking-wider mb-4 sm:mb-5 flex items-center justify-between">
              <span>By Religion</span>
              {selectedReligion !== 'All Religions' && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectReligion?.('All Religions');
                    onScrollToSection?.('matches-section');
                  }}
                  className="text-xs text-[#4E0C22] hover:underline cursor-pointer normal-case font-bold"
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
                          ? 'text-[#4E0C22] font-bold pl-1'
                          : 'text-[#4A2E37] hover:text-[#4E0C22] hover:translate-x-1'
                      }`}
                    >
                      <span className={`text-xs transition-colors ${isActive ? 'text-[#4E0C22]' : 'text-[#7B4A57] group-hover:text-[#4E0C22]'}`}>
                        ▸
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#F7E2E7] text-[#4E0C22] border border-[#E7CCD3] font-bold">
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
        <div className="pt-6 mt-6 border-t border-[#E7CCD3] flex flex-wrap items-center justify-between gap-4 text-xs text-[#7B4A57]">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
            <span className="flex items-center gap-1 text-[#4A2E37]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ISO 27001 Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#4A2E37]">
              <Lock className="w-3.5 h-3.5 text-blue-600" /> 256-Bit SSL Encryption
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#4A2E37]">
              <Award className="w-3.5 h-3.5 text-[#8E5766]" /> UIDAI Aadhaar Compliant
            </span>
            <span>•</span>
            {/* Terms and Conditions Switch / Button */}
            <button
              type="button"
              onClick={() => {
                setTermsTab('terms');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7E2E7] hover:bg-[#f7ddd4] border border-[#E7CCD3] text-[#4E0C22] font-bold transition-all cursor-pointer shadow-xs active:scale-95 group text-xs"
              title="Click to view official Terms and Conditions & Legal Compliance"
            >
              <FileText className="w-3.5 h-3.5 text-[#8E5766] group-hover:scale-110 transition-transform" />
              <span>Terms & Conditions</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setTermsTab('privacy');
                setIsTermsOpen(true);
              }}
              className="flex items-center gap-1 text-[#4A2E37] hover:text-[#4E0C22] transition-colors cursor-pointer text-xs"
              title="Click to view Privacy Policy"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#4A2E37]" />
              <span>Privacy Policy</span>
            </button>
            <span>•</span>
            <a
              href="/super-admin"
              className="flex items-center gap-1 text-[#4A2E37] hover:text-[#4E0C22] transition-colors cursor-pointer text-xs font-medium"
              title="Central Super Admin Portal"
            >
              <Lock className="w-3.5 h-3.5 text-[#8E5766]" />
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
