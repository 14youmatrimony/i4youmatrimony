import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  PhoneCall, 
  Mail, 
  Building2, 
  Download,
  ExternalLink
} from 'lucide-react';

export default function TermsAndConditionsModal({
  isOpen,
  onClose,
  initialTab = 'terms'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Dialog Card */}
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[#0B192C] text-slate-100 rounded-3xl border border-[#D4AF37]/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(212,175,55,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        
        {/* 1. Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#060D17]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center font-bold shadow-md shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-modal-title" className="font-serif font-bold text-base sm:text-lg text-white">
                Terms & Conditions & Legal Policies
              </h2>
              <p className="text-[11px] text-[#DFB76C] font-medium">
                I 4 You Matrimonial Technologies Pvt. Ltd. • Govt. of India IT Act & DPDP Compliant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            aria-label="Close Terms & Conditions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="px-4 pt-3 pb-2 bg-[#081220] border-b border-white/10 flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'terms', label: 'Terms & Conditions', icon: FileText },
            { id: 'privacy', label: 'Privacy & UIDAI Data', icon: Lock },
            { id: 'safety', label: 'Code of Conduct & Safety', icon: ShieldCheck },
            { id: 'refund', label: 'Billing & Refund Policy', icon: CreditCard }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-md'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0B192C]' : 'text-[#DFB76C]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#0B192C]/60">
          
          {/* TAB 1: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-500/10 border border-[#D4AF37]/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-200">
                <AlertCircle className="w-5 h-5 text-[#DFB76C] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-white block font-semibold">Sole Matrimonial Alliance Notice:</strong>
                  <p>
                    "I 4 You" is strictly an auspicious matrimonial matchmaking facilitator for marriages legally recognized under Indian law. Casual dating, live-in relationships, or commercial solicitations are strictly prohibited and subject to permanent account termination.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">1</span>
                  Eligibility & Legal Marriageable Age
                </h3>
                <p className="pl-7">
                  To register on I 4 You or use its matrimonial services, you must be of legal marriageable age as defined under the laws of India at the time of registration:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li><strong>Females:</strong> Minimum 18 completed years of age.</li>
                  <li><strong>Males:</strong> Minimum 21 completed years of age.</li>
                  <li>You must be legally competent to marry under the applicable personal laws (Hindu Marriage Act, Special Marriage Act, Indian Christian Marriage Act, Anand Marriage Act, or Muslim Personal Law).</li>
                  <li>You must be legally single, divorced (possessing a final, valid decree of divorce from a court of competent jurisdiction), or widowed. Married individuals seeking extra-marital relationships are strictly prohibited.</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">2</span>
                  Strict Anti-Dowry Prohibition Undertaking
                </h3>
                <p className="pl-7">
                  In compliance with the <strong>Dowry Prohibition Act, 1961</strong>:
                </p>
                <p className="pl-7 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-200 text-xs">
                  The demand, giving, or taking of dowry in any form (cash, jewelry, vehicles, or properties) is illegal. I 4 You maintains zero tolerance against dowry requests. Any member reported or suspected of soliciting dowry will have their account immediately terminated and reported to relevant law enforcement authorities.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">3</span>
                  Accuracy of Information & Identity Verification
                </h3>
                <p className="pl-7">
                  You represent and warrant that all information provided during registration (including age, educational qualification, profession, family background, annual income, horoscope/kundali, and marital status) is true, accurate, and not misleading. Misrepresenting biodata is grounds for instant de-registration.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">4</span>
                  Vedic Horoscope & Kundali Matching Disclaimer
                </h3>
                <p className="pl-7">
                  Astrological 36 Gunas matching calculations and Manglik Dosha indicators are provided as algorithmic cultural guidance based on classical Vedic Brihat Parashara Hora Shastra principles. Final marital compatibility decisions rest entirely with the prospective bride, groom, and their families.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY & UIDAI DATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start space-x-3 text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-white block font-semibold">DPDP Act 2023 & ISO 27001 Certified:</strong>
                  <p>
                    Your personal information is governed under the Digital Personal Data Protection Act, 2023. We maintain enterprise-grade 256-Bit SSL encryption and localized data sovereignty in Indian Tier-4 data centers.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">1</span>
                  UIDAI Aadhaar Verification Privacy Standards
                </h3>
                <p className="pl-7">
                  To eliminate impersonation, catfish accounts, and fraud, I 4 You offers voluntary and verified Aadhaar UIDAI authentication:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li><strong>Zero Biometric Storage:</strong> We never capture, request, or store biometric fingerprint or iris data.</li>
                  <li><strong>Masked Identification:</strong> We never store plain unmasked 12-digit Aadhaar numbers. Only regulatory masked verification hashes (e.g. XXXX-XXXX-9021) are used for verification trust badges.</li>
                  <li><strong>Strict Verification Only:</strong> Aadhaar authentication is solely used to verify age, legal gender, and genuine Indian citizenship.</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">2</span>
                  360° Photo Privacy Shield & Screenshot Restriction
                </h3>
                <p className="pl-7">
                  Protecting female and male candidate photographs from unauthorized misuse:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li><strong>Digital Watermarking:</strong> All profile photos are dynamically watermarked with the viewer's IP and timestamp to prevent unauthorized external distribution.</li>
                  <li><strong>Screenshot & Screen Recording Blocking:</strong> The mobile app and web platform employ digital privacy shields blocking screen captures of private family albums.</li>
                  <li><strong>Granular Visibility Toggles:</strong> You can configure photos to be visible to all verified members, accepted interests only, or strictly upon manual request approval.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">3</span>
                  Telephone & Contact Privacy Guarantee
                </h3>
                <p className="pl-7">
                  Personal phone numbers and family addresses are never indexed by public search engines (Google/Bing). Numbers are only disclosed when mutual interest is established and unlocked via verified member access.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CODE OF CONDUCT & SAFETY */}
          {activeTab === 'safety' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-start space-x-3 text-blue-200">
                <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-white block font-semibold">Sacred Family Values & Safe Conduct:</strong>
                  <p>
                    I 4 You was founded to provide a respectful, cultured environment for families to find auspicious life partners. Every member is expected to communicate with dignity and utmost integrity.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold">1</span>
                  Zero Tolerance for Misconduct & Harassment
                </h3>
                <p className="pl-7">
                  Members are strictly prohibited from engaging in:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li>Sending vulgar, sexually suggestive, defamatory, or abusive messages.</li>
                  <li>Stalking, repeated messaging after clear decline of interest, or emotional harassment.</li>
                  <li>Requesting monetary assistance, loans, travel tickets, or financial investments under any matrimonial pretext.</li>
                  <li>Impersonating public figures, relatives, or uploading third-party photos without consent.</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold">2</span>
                  Safety Tips for Family Meetings & Calls
                </h3>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li>Arrange initial virtual video meetings through our in-app secure call feature with parents and elders present.</li>
                  <li>For physical first meetings, always choose well-known public venues (restaurants, family homes, or community centers) during daytime.</li>
                  <li>Never disclose sensitive banking information, OTPs, UPI PINs, or confidential property documents to prospective matches.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold">3</span>
                  Grievance Redressal Officer (IT Rules, 2021)
                </h3>
                <div className="pl-7 bg-slate-900/80 border border-white/10 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <p>In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the designated Grievance Officer is:</p>
                  <p><strong>Name:</strong> Mr. Jayasimha R., Chief Grievance Officer</p>
                  <p><strong>Company:</strong> I 4 You Matrimonial Technologies Pvt. Ltd.</p>
                  <p><strong>Address:</strong> Matrimony Tech Towers, BKC, Mumbai - 400051, Maharashtra, India</p>
                  <p className="flex items-center gap-2 pt-1 text-[#DFB76C]">
                    <Mail className="w-3.5 h-3.5" /> Email: <strong>grievance@i4youmatrimony.com</strong> / <strong>i4youmatrimony@gmail.com</strong>
                  </p>
                  <p className="flex items-center gap-2 text-[#DFB76C]">
                    <PhoneCall className="w-3.5 h-3.5" /> Helpline: <strong>+91 8968926566</strong> (Mon-Sat, 9:30 AM - 6:30 PM IST)
                  </p>
                  <p className="text-[11px] text-slate-400">All complaints are formally acknowledged within 24 hours and resolved within 15 working days.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BILLING & REFUND POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-500/10 border border-[#D4AF37]/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-200">
                <CreditCard className="w-5 h-5 text-[#DFB76C] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-white block font-semibold">100% Transparent Matrimonial Subscriptions:</strong>
                  <p>
                    All paid memberships include standard statutory 18% GST with downloadable tax invoices. We provide explicit pricing with zero hidden renewal traps.
                  </p>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">1</span>
                  Free vs. Paid Membership Entitlements
                </h3>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li><strong>Free Registration:</strong> Creating a matrimonial profile, browsing recommendations, uploading albums, and receiving mutual interests is 100% FREE.</li>
                  <li><strong>Paid Membership (Silver, Gold, Platinum):</strong> Unlocks direct phone numbers, initiates direct messaging, high-priority feed ranking, and dedicated matrimony manager support.</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">2</span>
                  14-Day Match Assurance & Refund Guidelines
                </h3>
                <p className="pl-7">
                  We stand by the quality of our verified matchmaking service:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-300">
                  <li><strong>Assurance Guarantee:</strong> If a paid member views zero matching profiles or experiences a verified technical billing error, a refund request can be filed within 14 days of purchase.</li>
                  <li><strong>Non-Refundable Circumstances:</strong> Once verified contact numbers have been viewed, or if an account is terminated due to violation of the Code of Conduct / Dowry Prohibition Act, fees are non-refundable.</li>
                  <li><strong>Processing Timeline:</strong> Approved refunds are credited back to the original payment source (UPI / Net Banking / Credit Card) within 5 to 7 banking days.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C]/20 text-[#DFB76C] flex items-center justify-center text-xs font-bold">3</span>
                  Payment Security & Multi-Method Acceptance
                </h3>
                <p className="pl-7">
                  All transactions are processed through RBI-licensed payment gateways with PCI-DSS Level 1 compliance. Supported methods include UPI (Google Pay, PhonePe, Paytm), RuPay, Visa, Mastercard, and Net Banking across 50+ Indian banks.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* 4. Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-[#060D17] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Last Updated: October 2026 • Version 4.2 Legal Compliance</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 border border-white/10"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-extrabold shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
            >
              <span>I Understand & Accept</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
