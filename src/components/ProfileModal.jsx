import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Send, 
  MessageCircle, 
  Sparkles, 
  Building, 
  Users, 
  Star, 
  Moon, 
  Calendar,
  CheckCircle2,
  Check,
  Lock,
  Phone,
  ChevronLeft,
  ChevronRight,
  Crown,
  AlertCircle
} from 'lucide-react';
import { isKundaliApplicableReligion } from '../data/religionData';

export default function ProfileModal({ 
  profile, 
  currentUser,
  onClose, 
  onToggleInterest, 
  isInterested, 
  onToggleShortlist, 
  isShortlisted,
  onStartChat,
  onOpenAadhaarVerification,
  onOpenOffers,
  onUnlockContact,
  allProfiles = [],
  onSelectProfile
}) {
  const [activeTab, setActiveTab] = useState('about');

  if (!profile) return null;

  const hasPaidPlan = Boolean(currentUser?.membership && currentUser.membership !== 'free');
  const isContactUnlocked = Boolean(currentUser?.unlockedContacts && currentUser.unlockedContacts.includes(profile.id));
  const contactCredits = currentUser?.contactCredits ?? 0;

  const currentIndex = allProfiles && Array.isArray(allProfiles)
    ? allProfiles.findIndex(p => p.id === profile.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allProfiles.length - 1;

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (hasPrev && onSelectProfile) {
      onSelectProfile(allProfiles[currentIndex - 1]);
    }
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    if (hasNext && onSelectProfile) {
      onSelectProfile(allProfiles[currentIndex + 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-white rounded-2xl max-w-3xl lg:max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Profile Switcher Controls */}
        {allProfiles && allProfiles.length > 1 && currentIndex !== -1 && (
          <div className="absolute top-4 right-14 z-20 flex items-center space-x-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 border border-white/20 shadow-md">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Profile (Switch Profile)"
              aria-label="Previous Profile"
            >
              <ChevronLeft className="w-4 h-4 text-[#DFB76C]" />
            </button>
            <span className="text-[10px] font-bold text-white px-1 tracking-wider">
              {currentIndex + 1} / {allProfiles.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Next Profile (Switch Profile)"
              aria-label="Next Profile"
            >
              <ChevronRight className="w-4 h-4 text-[#DFB76C]" />
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header with Cover and Avatar */}
        <div className="relative h-44 sm:h-52 shrink-0 bg-[#0B192C]">
          <img 
            src={profile.coverPhoto || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200"} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-transparent to-transparent"></div>

          {/* Profile Quick Pill in Header */}
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37] text-[#0B192C] shadow-md flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{profile.matchScore}% Match</span>
            </span>
          </div>

          {/* Avatar and Basic Header Bar */}
          <div className="absolute -bottom-6 left-6 flex items-end space-x-4">
            <div className="relative">
              <img 
                src={profile.photo} 
                alt={profile.name} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl bg-slate-100"
              />
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-white shadow-sm" title="Verified Profile">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="mb-8 text-white">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                  {profile.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ID Verified
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 flex items-center gap-1">
                <span>{profile.age} yrs, {profile.height}</span>
                {profile.bodyType && <span>• {profile.bodyType}</span>}
                <span>•</span>
                <MapPin className="w-3 h-3 text-[#DFB76C]" />
                <span>{profile.district || profile.city}{profile.state ? `, ${profile.state}` : ''}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="pt-8 sm:pt-9 px-3 sm:px-6 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between sm:justify-start gap-1.5 sm:gap-3 md:gap-4 lg:gap-6 text-xs sm:text-xs md:text-sm overflow-x-auto scrollbar-none flex-nowrap">
          {[
            { id: 'about', label: 'About & Lifestyle', shortLabel: 'About' },
            { id: 'career', label: 'Education & Career', shortLabel: 'Career' },
            { id: 'family', label: 'Family Background', shortLabel: 'Family' },
            { id: 'contact', label: 'Contact Details', shortLabel: 'Contact' },
            ...(isKundaliApplicableReligion(profile?.religion) ? [{ id: 'horoscope', label: 'Astro & Kundali', shortLabel: 'Kundali' }] : []),
            { id: 'partner', label: 'Partner Preferences', shortLabel: 'Preferences' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none text-center pb-2.5 sm:pb-3 px-1 sm:px-2 md:px-2.5 font-semibold whitespace-nowrap shrink-0 transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id 
                  ? 'text-[#0B192C] font-bold border-[#D4AF37] -mb-[1px]' 
                  : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300'
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 text-sm">
          
          {/* Tab 1: About */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              {profile.about?.trim() && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Personal Biography
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                    "{profile.about}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Diet Preference</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.diet}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Mother Tongue</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.motherTongue}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Religion & Community</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.religion} ({profile.caste})</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Smoking</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.smoking}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Drinking</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.drinking}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">District</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.district || profile.city}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Body Type</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.bodyType || 'Average'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">Skin Tone</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.skinColour || 'Fair'}</p>
                </div>
              </div>

              {/* Hobbies & Interests Section */}
              {(profile.hobbies || profile.interests || profile.sportsFitness) && (
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#8C6D1F] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" /> Hobbies &amp; Interests
                    </span>
                    <span className="text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                      Passions
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-700">
                    {profile.hobbies && <p><strong className="text-slate-900 font-semibold">Hobbies:</strong> {profile.hobbies}</p>}
                    {profile.interests && <p><strong className="text-slate-900 font-semibold">Interests:</strong> {profile.interests}</p>}
                    {profile.sportsFitness && <p><strong className="text-slate-900 font-semibold">Sports &amp; Fitness:</strong> {profile.sportsFitness}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Career */}
          {activeTab === 'career' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-start space-x-3">
                  <GraduationCap className="w-5 h-5 text-[#8C6D1F] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <h5 className="font-bold text-slate-900 text-sm">{profile.education}</h5>
                    <p className="text-xs text-slate-500">{profile.educationCategory}{profile.institute ? ` • ${profile.institute}` : ''}</p>
                    
                    {/* 12th & 10th Badges */}
                    {(profile.twelfthSchool || profile.tenthSchool) && (
                      <div className="pt-1.5 space-y-1">
                        {profile.twelfthSchool && (
                          <div className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-slate-200/70">
                            <span className="font-semibold text-slate-700">12th / HSC: {profile.twelfthSchool}</span>
                            <span className="font-bold text-blue-700">{profile.twelfthBoard || (profile.twelfthYear ? `Year ${profile.twelfthYear}` : '')}</span>
                          </div>
                        )}
                        {profile.tenthSchool && (
                          <div className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-slate-200/70">
                            <span className="font-semibold text-slate-700">10th / SSC: {profile.tenthSchool}</span>
                            <span className="font-bold text-indigo-700">{profile.tenthBoard || (profile.tenthYear ? `Year ${profile.tenthYear}` : '')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-2 border-t border-slate-200/60">
                  <Briefcase className="w-5 h-5 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-bold text-slate-900 text-sm">{profile.profession}</h5>
                    <p className="text-xs text-slate-600">{profile.company}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Annual Income: {profile.annualIncome}
                      </span>
                      {(profile.jobLocation || profile.jobPlace || profile.workLocation) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          <MapPin className="w-3 h-3 text-[#DFB76C] shrink-0" />
                          <span>Job Place: <strong className="font-bold text-slate-900">{profile.jobLocation || profile.jobPlace || profile.workLocation}</strong></span>
                        </span>
                      )}
                      {profile.workLocationType && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {profile.workLocationType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Family */}
          {activeTab === 'family' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Family Structure:</span>
                  <span className="font-bold text-slate-800">{profile?.familyDetails?.type || profile?.familyType || 'Nuclear Family'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Values:</span>
                  <span className="font-bold text-slate-800">{profile?.familyDetails?.values || profile?.familyValues || 'Traditional yet Progressive'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 items-center">
                  <span className="text-slate-500 font-medium">Financial Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    {profile?.familyDetails?.financialStatus || profile?.familyFinancialStatus || profile?.familyStatus || 'Upper Middle Class'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Father's Background:</span>
                  <span className="font-bold text-slate-800 text-right">{profile?.familyDetails?.father || profile?.fatherOccupation || 'Retired Professional'}</span>
                </div>
                
                {/* 4-State Gate for Direct Family Contacts */}
                {!currentUser?.aadhaarVerified ? (
                  <div className="my-3 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-[#8C6D1F]" />
                      <span className="font-bold text-xs text-amber-950">
                        Contact Details Protected by Aadhaar Shield
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-snug">
                      To safeguard families against spam, direct phone numbers are only visible to Aadhaar authenticated members.
                    </p>
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60 flex justify-between items-center text-xs select-none">
                      <span className="text-slate-500 font-medium">Family Contacts:</span>
                      <span className="font-mono font-bold blur-[3px] text-slate-400">+91 94XXX XXXXX</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose?.();
                        onOpenAadhaarVerification?.();
                      }}
                      className="w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0B192C]" />
                      <span>Verify Your Aadhaar to Unlock Contact</span>
                    </button>
                  </div>
                ) : !hasPaidPlan ? (
                  <div className="my-3 p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-[#8C6D1F]" />
                      <span className="font-bold text-xs text-amber-950">
                        Subscription Required for Family Contacts
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-snug">
                      Direct parent mobile numbers and residence contacts are reserved for active subscribers.
                    </p>
                    <div className="p-2 bg-white/80 rounded-lg border border-amber-200/60 flex justify-between items-center text-xs select-none">
                      <span className="text-slate-500 font-medium">Family Contacts:</span>
                      <span className="font-mono font-bold blur-[3px] text-slate-400">+91 94XXX XXXXX</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose?.();
                        onOpenOffers?.();
                      }}
                      className="w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-[#0B192C]" />
                      <span>View Plans & Upgrade (50% OFF)</span>
                    </button>
                  </div>
                ) : !isContactUnlocked ? (
                  <div className="my-3 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-[#1E3A8A]" />
                        <span className="font-bold text-xs text-slate-900">
                          Unlock Family Phone Numbers
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        {contactCredits === 999 ? 'Unlimited' : `${contactCredits} Credits Left`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Use 1 contact unlock credit from your active plan to reveal parent mobile numbers.
                    </p>
                    {contactCredits <= 0 && currentUser?.membership !== 'vip' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose?.();
                          onOpenOffers?.();
                        }}
                        className="w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:brightness-105 transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 text-white" />
                        <span>Credit Limit Reached • Upgrade Plan</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnlockContact?.(profile.id)}
                        className="w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#0B192C]" />
                        <span>Unlock Contact (Uses 1 Credit)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {(profile.fatherMobile || profile.familyPhone) && (
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500 font-medium">Father's Mobile:</span>
                        <span className="font-bold text-emerald-800 text-right font-mono">{profile.fatherMobile || profile.familyPhone}</span>
                      </div>
                    )}
                    {profile.motherMobile && (
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500 font-medium">Mother's Mobile:</span>
                        <span className="font-bold text-emerald-800 text-right font-mono">{profile.motherMobile}</span>
                      </div>
                    )}
                    <div className="my-2 py-1 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Family contact numbers unlocked</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {contactCredits === 999 ? 'Unlimited' : `${contactCredits} Credits Left`}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Mother's Background:</span>
                  <span className="font-bold text-slate-800 text-right">{profile?.familyDetails?.mother || profile?.motherOccupation || 'Homemaker'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Siblings:</span>
                  <span className="font-bold text-slate-800 text-right">{profile?.familyDetails?.siblings || profile?.siblingsDetails || '1 Sibling'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Horoscope */}
          {activeTab === 'horoscope' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#DFB76C]/30 text-[#8C6D1F] flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-950 text-sm">Ashtakoot Gunas Compatibility</h5>
                    <p className="text-xs text-amber-800">Kundali Milan Score: <span className="font-bold">{profile.gunasMatch}</span></p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37] text-[#0B192C]">
                  Highly Auspicious
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400">Rashi (Zodiac)</span>
                  <p className="font-bold text-slate-800 mt-0.5">{profile.astronomy?.rashi || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400">Nakshatra</span>
                  <p className="font-bold text-slate-800 mt-0.5">{profile.astronomy?.nakshatra || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400">Manglik Status</span>
                  <p className="font-bold text-slate-800 mt-0.5">{profile.manglik}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Partner Expectations */}
          {activeTab === 'partner' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  What {profile.name.split(' ')[0]} is Looking For
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {profile.partnerExpectations}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Partner Preference Criteria
                </h5>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Preferred Age:</span>
                    <span className="font-bold text-slate-800">{profile.gender === 'Female' ? `${profile.age} - ${profile.age + 5} yrs` : `${Math.max(21, profile.age - 5)} - ${profile.age} yrs`}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Preferred Height:</span>
                    <span className="font-bold text-slate-800">{profile.gender === 'Female' ? "5'7\" to 6'2\"" : "5'2\" to 5'8\""}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Body Type:</span>
                    <span className="font-bold text-slate-800">{profile.prefBodyType || "Doesn't Matter / Any"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Skin Tone:</span>
                    <span className="font-bold text-slate-800">{profile.prefSkinTone || profile.prefSkinColour || "Fair / Wheatish"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Dietary Habit:</span>
                    <span className="font-bold text-slate-800">{profile.diet?.includes('Vegetarian') ? 'Vegetarian Preferred' : 'Flexible'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Contact Details */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              {!currentUser?.aadhaarVerified ? (
                <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto shadow-inner">
                    <Lock className="w-7 h-7 text-[#8C6D1F]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-base">
                      Contact Details Protected by Aadhaar Shield
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      To view <strong className="text-slate-800">{profile.name}'s</strong> direct phone number, WhatsApp contact, and family residence, you must complete your one-time Aadhaar verification.
                    </p>
                  </div>

                  {/* Masked Preview */}
                  <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 select-none text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 blur-[2.5px]">+91 98XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 blur-[2.5px]">+91 94XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Native Address:</span>
                      <span className="text-slate-400 font-medium blur-[2px]">Restricted to Aadhaar Verified</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenAadhaarVerification?.();
                    }}
                    className="w-full max-w-md mx-auto py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Verify Your Aadhaar to Unlock Contact</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Free verification • Takes 30 seconds via UIDAI OTP</span>
                  </p>
                </div>
              ) : !hasPaidPlan ? (
                <div className="bg-white rounded-2xl p-6 border border-[#DFB76C]/60 shadow-sm text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-100 to-yellow-100 text-[#8C6D1F] flex items-center justify-center mx-auto shadow-inner border border-amber-200">
                    <Crown className="w-7 h-7 text-[#8C6D1F]" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Subscription Required
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">
                      Active Membership Required to View Contact Numbers
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Direct mobile numbers, parent contacts, WhatsApp links, and native residence details are exclusively accessible to subscribed members.
                    </p>
                  </div>

                  {/* Masked Preview */}
                  <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 select-none text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 blur-[2.5px]">+91 98XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 blur-[2.5px]">+91 94XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Native Address:</span>
                      <span className="text-slate-400 font-medium blur-[2px]">Subscribed Members Only</span>
                    </div>
                  </div>

                  {/* Features Banner */}
                  <div className="max-w-md mx-auto bg-amber-50/70 p-3 rounded-xl border border-amber-200/70 text-xs space-y-1 text-slate-700 text-left">
                    <p className="font-bold text-[11px] text-amber-950">Upgrade your membership to unlock:</p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> View 10, 30, or unlimited verified contact numbers
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> Direct telephone calls & instant WhatsApp connect
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> Unlimited direct matrimonial chat
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenOffers?.();
                    }}
                    className="w-full max-w-md mx-auto py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#0B192C]" />
                    <span>View Subscription Plans & Upgrade (50% OFF)</span>
                  </button>

                  <p className="text-[10px] text-slate-400 text-center">
                    Silver plans with 10 contacts start from ₹499 • Instant activation
                  </p>
                </div>
              ) : !isContactUnlocked ? (
                <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-sm space-y-4">
                  {/* Membership Credit Banner */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-xl px-4 py-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-[#8C6D1F]" />
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] block">
                          {currentUser?.membershipPlan || `${currentUser?.membership?.toUpperCase()} Member`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {contactCredits === 999 ? 'Unlimited' : contactCredits} Contact Unlocks Remaining
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Plan Active
                    </span>
                  </div>

                  {contactCredits <= 0 && currentUser?.membership !== 'vip' ? (
                    <div className="text-center space-y-3 pt-2">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Contact View Limit Reached
                        </h4>
                        <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                          You have utilized all contact view credits on your <strong className="text-slate-800">{currentUser?.membershipPlan || 'subscription'}</strong>. Please upgrade or renew your plan to view <strong className="text-slate-800">{profile.name}'s</strong> phone number and parents' contacts.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose?.();
                          onOpenOffers?.();
                        }}
                        className="w-full max-w-md mx-auto py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:brightness-105 shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Crown className="w-4 h-4 text-white" />
                        <span>Upgrade Plan to Get More Contact Unlocks</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Unlock {profile.name}'s Contact Details
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                          Use 1 contact unlock credit from your active subscription to reveal candidate direct mobile, parents' numbers, and native residence.
                        </p>
                      </div>

                      {/* Blurred Preview */}
                      <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 select-none text-left">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                          <span className="font-mono font-bold text-slate-400 blur-[2px]">+91 98XXX XXXXX</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                          <span className="font-mono font-bold text-slate-400 blur-[2px]">+91 94XXX XXXXX</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Residence Address:</span>
                          <span className="text-slate-400 font-medium blur-[2px]">Unlocks with 1 credit</span>
                        </div>
                      </div>

                      <div className="max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => onUnlockContact?.(profile.id)}
                          className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
                        >
                          <Lock className="w-4 h-4 text-[#0B192C]" />
                          <span>Unlock Contact Details (Uses 1 Credit)</span>
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                          Once unlocked, this contact remains permanently accessible in your account.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unlocked Full Contact Information */
                <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                      <span>Contact Details Unlocked</span>
                    </span>
                    <span className="text-xs text-emerald-700 font-bold">
                      {contactCredits === 999 ? 'Unlimited' : `${contactCredits} Credits Left`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Candidate Direct Mobile */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Candidate Mobile:</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          Direct
                        </span>
                      </div>
                      <p className="text-base font-mono font-bold text-slate-900 tracking-wide">
                        {profile.mobile || profile.phone || '+91 98471 23456'}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <a 
                          href={`tel:${profile.mobile || profile.phone || '+91 98471 23456'}`}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-white" />
                          <span>Call Direct</span>
                        </a>
                        <a 
                          href={`https://wa.me/${(profile.whatsapp || profile.mobile || profile.phone || '919847123456').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${profile.name}, I came across your matrimonial profile on I 4 You.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 px-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* WhatsApp Contact */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">WhatsApp Number:</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          Instant Connect
                        </span>
                      </div>
                      <p className="text-base font-mono font-bold text-slate-900 tracking-wide">
                        {profile.whatsapp || profile.mobile || profile.phone || '+91 98471 23456'}
                      </p>
                      <p className="text-[11px] text-slate-500 pt-1">
                        Available on WhatsApp for polite matrimonial introductions.
                      </p>
                    </div>

                    {/* Father's Mobile */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                          Guardian
                        </span>
                      </div>
                      <p className="text-base font-mono font-bold text-slate-900 tracking-wide">
                        {profile.fatherMobile || profile.familyPhone || '+91 94470 12345'}
                      </p>
                      <a 
                        href={`tel:${profile.fatherMobile || profile.familyPhone || '+91 94470 12345'}`}
                        className="inline-block mt-1 py-1 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-center font-bold text-[11px] transition-colors"
                      >
                        Call Father
                      </a>
                    </div>

                    {/* Mother's Mobile */}
                    {profile.motherMobile && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Mother's Mobile:</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                            Parent
                          </span>
                        </div>
                        <p className="text-base font-mono font-bold text-slate-900 tracking-wide">
                          {profile.motherMobile}
                        </p>
                        <a 
                          href={`tel:${profile.motherMobile}`}
                          className="inline-block mt-1 py-1 px-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-center font-bold text-[11px] transition-colors"
                        >
                          Call Mother
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Native / Residence Address */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                    <span className="text-slate-500 font-semibold block">Native / Residence Address:</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {profile.nativeAddress || profile.address || `${profile.district || profile.city || 'Kochi'}, Kerala, India`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Family House Name: <strong className="text-slate-700">{profile.houseName || profile.tharavadu || 'Heritage Family Home'}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          
          <button
            onClick={() => onToggleShortlist(profile.id)}
            className={`p-2.5 rounded-xl border transition-all flex items-center space-x-1 text-xs font-semibold ${
              isShortlisted 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="hidden sm:inline">{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (!hasPaidPlan) {
                  onClose();
                  onOpenOffers?.();
                  return;
                }
                onClose();
                onStartChat(profile.id);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {!hasPaidPlan ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <MessageCircle className="w-4 h-4 text-[#1E3A8A]" />}
              <span>{hasPaidPlan ? 'Message' : 'Message (Locked)'}</span>
            </button>

            <button
              onClick={() => onToggleInterest(profile.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                isInterested 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] hover:from-[#dfb76c] hover:to-[#b89228] shadow-[#D4AF37]/25'
              }`}
            >
              {isInterested ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Interest Sent</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Connect / Send Interest</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
