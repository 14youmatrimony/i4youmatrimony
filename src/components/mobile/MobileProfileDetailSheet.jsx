import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Send, 
  MessageCircle, 
  Sparkles, 
  Check, 
  Share2,
  Calendar,
  Building,
  CheckCircle2,
  Users,
  Compass,
  Star,
  HeartHandshake,
  Phone,
  Lock,
  EyeOff,
  ChevronRight,
  Camera,
  X,
  Crown,
  Zap,
  AlertCircle,
  Video
} from 'lucide-react';
import { calculateLocationMatch } from '../../data/locationData';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { isKundaliApplicableReligion } from '../../data/religionData';

export default function MobileProfileDetailSheet({
  profile,
  currentUser,
  onClose,
  onToggleInterest,
  onRequestSendInterest,
  isInterested,
  onToggleShortlist,
  isShortlisted,
  onStartChat,
  onStartAudioCall,
  onStartVideoCall,
  onOpenAadhaarVerification,
  onOpenOffers,
  onUnlockContact
}) {
  const { triggerScreenshotBlock, screenshotRestricted, watermarkEnabled } = usePhotoPrivacy();
  const [activeTab, setActiveTab] = useState('about');
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentSinglePhotoIdx, setCurrentSinglePhotoIdx] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null); // { url, title, isFamily }
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');
  const isContactUnlocked = Boolean(currentUser?.unlockedContacts?.includes(profile?.id));
  const contactCredits = currentUser?.contactCredits ?? 0;

  if (!profile) return null;

  const singlePhotos = profile.singlePhotos?.length 
    ? profile.singlePhotos 
    : [profile.photo];
  const familyPhotos = profile.familyPhotos?.length 
    ? profile.familyPhotos 
    : [
        'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800'
      ];

  const locMatch = calculateLocationMatch(currentUser, profile);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowShareSheet(false);
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
      
      {/* Top Mobile Full-Screen App Bar */}
      <header className="bg-[#0B192C] text-white px-3 py-2.5 flex items-center justify-between border-b border-[#D4AF37]/30 shadow-md shrink-0 z-30">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-[#DFB76C]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="font-serif font-bold text-sm sm:text-base text-white truncate">
                {profile.name}
              </h2>
              {profile.aadhaarVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white border border-emerald-400 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                  <span>Aadhaar Verified</span>
                </span>
              ) : profile.verified ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Member" />
              ) : null}
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              {profile.age} yrs • {profile.district || profile.city}{profile.state ? `, ${profile.state}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setShowShareSheet(true)}
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Share Profile"
          >
            <Share2 className="w-4 h-4 text-[#DFB76C]" />
          </button>
        </div>
      </header>

      {/* In-App Mobile Share Sheet (Stays inside the app, avoids OS modal) */}
      {showShareSheet && (
        <div 
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in"
          onClick={() => setShowShareSheet(false)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom-6 border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2"></div>
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-[#8C6D1F]" />
                <h4 className="font-serif font-bold text-sm text-[#0B192C]">Share {profile.name}'s Profile</h4>
              </div>
              <button 
                onClick={() => setShowShareSheet(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleCopyLink}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex flex-col items-center justify-center space-y-1.5 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1E3A8A] flex items-center justify-center">
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </div>
                <span>{copiedLink ? 'Link Copied! ✓' : 'Copy Profile Link'}</span>
              </button>

              <button
                onClick={() => {
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${profile.name}'s matrimonial profile on I 4 You! ${window.location.href}`)}`, '_blank');
                  setShowShareSheet(false);
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-800 flex flex-col items-center justify-center space-y-1.5 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5 drop-shadow-xs" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      fill="#25D366" 
                      d="M12.004 0C5.385 0 .018 5.367.018 11.986a11.92 11.92 0 0 0 1.603 6.007L0 24l6.172-1.618a11.96 11.96 0 0 0 5.832 1.512h.005c6.618 0 11.986-5.368 11.986-11.987A11.93 11.93 0 0 0 12.004 0z"
                    />
                    <path 
                      fill="#FFFFFF" 
                      d="M18.156 14.733c-.27-.135-1.597-.788-1.844-.878-.248-.09-.428-.135-.608.135-.18.27-.698.878-.855 1.058-.158.18-.315.203-.585.068a7.37 7.37 0 0 1-2.17-1.339 8.12 8.12 0 0 1-1.503-1.87c-.158-.27-.017-.416.118-.55.122-.122.27-.315.405-.473.135-.158.18-.27.27-.45.09-.18.045-.338-.023-.473-.067-.135-.608-1.464-.833-2.004-.22-.526-.443-.454-.608-.463-.158-.008-.338-.009-.518-.009-.18 0-.473.068-.72.338-.248.27-.946.924-.946 2.253 0 1.33 1.013 2.614 1.148 2.794.135.18 1.905 2.909 4.615 4.078.645.278 1.148.444 1.54.568.647.206 1.236.177 1.701.107.519-.078 1.598-.653 1.823-1.284.225-.63.225-1.171.158-1.284-.068-.113-.248-.18-.518-.315z"
                    />
                  </svg>
                </div>
                <span>Share via WhatsApp</span>
              </button>
            </div>

            {copiedLink && (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-center text-xs font-semibold">
                Matrimonial profile link copied to clipboard!
              </div>
            )}
          </div>
        </div>
      )}


      {/* Scrollable Full-Screen Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 space-y-4 pb-4">
        
        {/* Hero Full-Width Cover & Portrait Section */}
        <div className="relative">
          <div 
            className="h-80 sm:h-96 w-full relative overflow-hidden bg-slate-900 group select-none photo-protected"
            onContextMenu={(e) => {
              e.preventDefault();
              if (screenshotRestricted) triggerScreenshotBlock('right-click');
            }}
          >
            <img 
              src={singlePhotos[currentSinglePhotoIdx] || profile.photo} 
              alt={profile.name} 
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onClick={() => {
                if (!profile.hidePhotos && profile.photoVisibility !== 'request') {
                  setFullscreenPhoto({
                    url: singlePhotos[currentSinglePhotoIdx] || profile.photo,
                    title: `Single Photo ${currentSinglePhotoIdx + 1} of ${singlePhotos.length}`,
                    isFamily: false
                  });
                }
              }}
              className={`w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-102 select-none ${
                profile.hidePhotos
                  ? 'blur-2xl scale-125 opacity-30 grayscale'
                  : profile.photoVisibility === 'request'
                  ? 'blur-xl scale-110 opacity-70'
                  : profile.photoVisibility === 'accepted' && !isInterested
                  ? 'blur-lg scale-110 opacity-75'
                  : ''
              }`}
            />
            {/* Elegant Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-black/20 to-transparent pointer-events-none"></div>

            {/* Photo Privacy Lock Shield Overlay */}
            {(profile.hidePhotos || profile.photoVisibility === 'request' || (profile.photoVisibility === 'accepted' && !isInterested)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none text-center z-15">
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-[#D4AF37]/50 flex items-center justify-center text-[#DFB76C] mb-2 shadow-lg">
                  {profile.hidePhotos ? <EyeOff className="w-6 h-6 text-rose-400" /> : <Lock className="w-6 h-6 text-[#DFB76C]" />}
                </div>
                <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white font-bold text-xs shadow-md">
                  {profile.hidePhotos 
                    ? 'Photos Hidden by Member' 
                    : profile.photoVisibility === 'request'
                    ? '🔒 Photo Visible on Request'
                    : '🔒 Visible to Accepted Matches Only'}
                </span>
                <span className="text-[10px] text-slate-200 mt-1 drop-shadow-md">
                  {profile.photoVisibility === 'request' 
                    ? 'Send interest or contact request to view full portraits' 
                    : 'Mutual connection required to view full photos'}
                </span>
              </div>
            )}

            {/* Top Right: Single Photo Counter */}
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">

              {/* Single Photos Counter Pill */}
              <span 
                onClick={() => setFullscreenPhoto({
                  url: singlePhotos[currentSinglePhotoIdx] || profile.photo,
                  title: `Single Photo ${currentSinglePhotoIdx + 1} of ${singlePhotos.length}`,
                  isFamily: false
                })}
                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Camera className="w-3 h-3 text-[#DFB76C]" />
                <span>{currentSinglePhotoIdx + 1}/{singlePhotos.length} Single Photos</span>
              </span>
            </div>

            {/* Left / Right Photo Switcher Navigation (if multiple single photos) */}
            {singlePhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSinglePhotoIdx(prev => (prev === 0 ? singlePhotos.length - 1 : prev - 1));
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-15 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSinglePhotoIdx(prev => (prev === singlePhotos.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-15 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  title="Next Photo"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-24 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
                  {singlePhotos.map((_, dotIdx) => (
                    <span 
                      key={dotIdx}
                      className={`h-1.5 rounded-full transition-all ${
                        dotIdx === currentSinglePhotoIdx 
                          ? 'w-5 bg-[#DFB76C]' 
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Bottom Hero Info on Photo */}
            <div className="absolute bottom-4 left-4 right-4 text-white z-10">
              <div className="flex items-center space-x-2">
                <h1 className="font-serif font-bold text-2xl drop-shadow-md text-white">
                  {profile.name}
                </h1>
                {profile.aadhaarVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-400 text-[10px] font-bold flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3 h-3 text-white stroke-[2.5]" />
                    <span>Aadhaar Verified</span>
                  </span>
                ) : profile.governmentIdVerified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold">
                    Govt ID Verified
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-slate-200 font-medium mt-1 flex items-center gap-2">
                <span>{profile.age} yrs</span>
                <span>•</span>
                <span>{profile.height}</span>
                {profile.bodyType && (
                  <>
                    <span>•</span>
                    <span>{profile.bodyType}</span>
                  </>
                )}
                {profile.skinColour && (
                  <>
                    <span>•</span>
                    <span>{profile.skinColour}</span>
                  </>
                )}
                <span>•</span>
                <span>{profile.religion} ({profile.caste})</span>
              </p>

              <div className="flex items-center space-x-1.5 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
                <span className="font-medium"><strong className="text-white font-semibold">{profile.district || profile.city}</strong>{profile.state ? `, ${profile.state}` : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="sticky top-0 z-20 bg-white border-y border-slate-200 px-3 flex space-x-2 overflow-x-auto scrollbar-none shadow-xs">
          {[
            { id: 'about', label: 'About' },
            { id: 'contact', label: 'Contact Details' },
            { id: 'career', label: 'Career & Education' },
            { id: 'family', label: 'Family' },
            ...(isKundaliApplicableReligion(profile?.religion) ? [{ id: 'horoscope', label: 'Astro Milan' }] : []),
            { id: 'partner', label: 'Expectations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'text-[#0B192C] border-[#D4AF37]' 
                  : 'text-slate-400 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Detailed Content */}
        <div className="px-4 space-y-4">
          
          {/* TAB 1: About & Personal */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Bio Card */}
              {profile.about?.trim() && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Personal Biography
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{profile.about}"
                  </p>
                </div>
              )}

              {/* Quick Lifestyle Grid */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lifestyle & Culture
                </h3>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Diet Habit</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.diet}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Mother Tongue</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.motherTongue}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Religion & Faith</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.religion}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Community / Caste</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.caste}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Smoking</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.smoking}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Drinking</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.drinking}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Body Type</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.bodyType || 'Average'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] font-semibold">Skin Colour</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{profile.skinColour || 'Fair'}</span>
                  </div>
                </div>
              </div>

              {/* Hobbies & Personal Interests Card */}
              {(profile.hobbies || profile.interests || profile.sportsFitness) && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#DFB76C]" />
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Hobbies &amp; Interests
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Personal Passions
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {profile.hobbies && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          🎨 Hobbies &amp; Creative Pursuits
                        </span>
                        <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                          {profile.hobbies}
                        </p>
                      </div>
                    )}

                    {profile.interests && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          ✨ Interests &amp; Passions
                        </span>
                        <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                          {profile.interests}
                        </p>
                      </div>
                    )}

                    {profile.sportsFitness && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          🏸 Sports &amp; Fitness
                        </span>
                        <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                          {profile.sportsFitness}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location & District Compatibility Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    District & Location Match
                  </h3>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${locMatch.badgeClass}`}>
                    {locMatch.label}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-[#8C6D1F] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {profile.district || profile.city}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        State: <span className="font-semibold text-slate-800">{profile.state}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-[#0B192C]">
                        {locMatch.matchPercent}%
                      </span>
                      <span className="block text-[9px] font-bold text-[#8C6D1F]">
                        Loc. Score
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${locMatch.dotClass}`}></span>
                    <p className="text-[11px] leading-relaxed">
                      {locMatch.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Access Quick Card */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isContactUnlocked 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : (!currentUser?.aadhaarVerified 
                          ? 'bg-amber-100 text-[#8C6D1F]' 
                          : (!hasPaidPlan 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-blue-100 text-blue-700'))
                  }`}>
                    {isContactUnlocked ? <Phone className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">Contact & Family Reach</h4>
                    <p className="text-[10px] text-slate-500 truncate">
                      {isContactUnlocked 
                        ? 'Phone numbers unlocked ✓' 
                        : (!currentUser?.aadhaarVerified 
                            ? 'Protected by Aadhaar Verification Shield' 
                            : (!hasPaidPlan 
                                ? 'Subscription Required' 
                                : (contactCredits > 0 || currentUser?.membership === 'vip' 
                                    ? `${contactCredits === 999 ? 'Unlimited' : contactCredits} credits • Tap to unlock` 
                                    : 'Credits exhausted • Upgrade')))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('contact')}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-[#8C6D1F] hover:bg-slate-100 shrink-0 cursor-pointer"
                >
                  {isContactUnlocked ? 'View Numbers →' : 'Unlock Contact →'}
                </button>
              </div>

            </div>
          )}

          {/* TAB: Contact Details with Aadhaar Protection & Subscription Gate */}
          {activeTab === 'contact' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Trust Badge Header */}
              <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-4 text-white shadow-sm border border-[#D4AF37]/30 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-serif font-bold text-sm text-white">
                    Verified Contact & Family Reach
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Strict UIDAI privacy guidelines and matrimonial verification protocols protect prospective brides & grooms. Direct contact numbers and native residences are secured.
                </p>
              </div>

              {!(currentUser?.aadhaarVerified || currentUser?.aadhaar_verified === 1 || currentUser?.aadhaar_verified === true || currentUser?.aadhaar_status === 'approved' || currentUser?.aadhaarStatus === 'approved') ? (
                /* Locked State 1: Requires Aadhaar Verification */
                <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto shadow-inner">
                      <Lock className="w-6 h-6 text-[#8C6D1F]" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Contact Details Protected by Aadhaar Shield
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      To view <strong className="text-slate-800">{profile.name}'s</strong> direct phone number, WhatsApp contact, and family residence, you must complete your one-time Aadhaar verification.
                    </p>
                  </div>

                  {/* Blurred / Masked Preview */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 select-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2px]">+91 98XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2px]">+91 94XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Mother's Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2px]">+91 94XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Home Address:</span>
                      <span className="text-slate-400 font-medium blur-[2px]">Restricted to Aadhaar Verified</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAadhaarVerification?.();
                    }}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
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
                /* Locked State 2: Requires Active Paid Subscription */
                <div className="bg-white rounded-2xl p-5 border border-[#DFB76C]/60 shadow-sm space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-100 to-yellow-100 text-[#8C6D1F] flex items-center justify-center mx-auto shadow-inner border border-amber-200">
                      <Crown className="w-6 h-6 text-[#8C6D1F]" />
                    </div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Subscription Required
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Active Membership Required to View Contact Numbers
                    </h4>
                    <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                      Direct mobile numbers, parent contacts, WhatsApp links, and family residence details are exclusively accessible to subscribed members.
                    </p>
                  </div>

                  {/* Blurred / Masked Preview */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 select-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2.5px]">+91 98XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                      <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2.5px]">+91 94XXX XXXXX</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Native Residence:</span>
                      <span className="text-slate-400 font-medium blur-[2px]">Subscribed Members Only</span>
                    </div>
                  </div>

                  {/* Plan Features Pill */}
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/70 text-xs space-y-1 text-slate-700">
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
                      onClose();
                      onOpenOffers?.();
                    }}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#0B192C]" />
                    <span>View Subscription Plans & Upgrade (50% OFF)</span>
                  </button>

                  <p className="text-[10px] text-slate-400 text-center">
                    Silver plans with 10 contacts start from ₹499 • Instant activation
                  </p>
                </div>
              ) : !isContactUnlocked ? (
                /* Locked State 3: Subscribed, but Contact Not Yet Unlocked */
                <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm space-y-4">
                  {/* Membership Credit Pill */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-xl px-3.5 py-2.5 text-xs">
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
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Plan Active
                    </span>
                  </div>

                  {contactCredits <= 0 && currentUser?.membership !== 'vip' ? (
                    /* Quota Exhausted: Must Upgrade */
                    <div className="text-center space-y-3 pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Contact View Limit Reached
                        </h4>
                        <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                          You have utilized all contact view credits on your <strong className="text-slate-800">{currentUser?.membershipPlan || 'subscription'}</strong>. Please upgrade or renew your plan to view <strong className="text-slate-800">{profile.name}'s</strong> phone number and parents' contacts.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenOffers?.();
                        }}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:brightness-105 shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <Crown className="w-4 h-4 text-white" />
                        <span>Upgrade Plan to Get More Contact Unlocks</span>
                      </button>
                    </div>
                  ) : (
                    /* Has Credits Available: Prompt to Unlock */
                    <div className="space-y-3.5">
                      <div className="text-center space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">
                          Unlock {profile.name}'s Contact Details
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                          Use 1 contact unlock credit from your active subscription to reveal candidate direct mobile, parents' numbers, and native residence.
                        </p>
                      </div>

                      {/* Blurred Preview */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 select-none">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Direct Mobile:</span>
                          <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2px]">+91 98XXX XXXXX</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Father's Mobile:</span>
                          <span className="font-mono font-bold text-slate-400 tracking-wider blur-[2px]">+91 94XXX XXXXX</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Residence Address:</span>
                          <span className="text-slate-400 font-medium blur-[2px]">Unlocks with 1 credit</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUnlockContact?.(profile.id)}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
                      >
                        <Lock className="w-4 h-4 text-[#0B192C]" />
                        <span>Unlock Contact Details (Uses 1 Credit)</span>
                      </button>

                      <p className="text-[10px] text-slate-400 text-center">
                        Once unlocked, this contact remains permanently accessible in your account.
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                /* Unlocked State: Contact is fully Unlocked */
                <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                      <span>Contact Details Unlocked</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {contactCredits === 999 ? 'Unlimited' : `${contactCredits} Credits Left`}
                    </span>
                  </div>

                  {/* Membership Credit Pill */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl px-3 py-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-[#8C6D1F]" />
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] block">
                          {currentUser?.membershipPlan || `${currentUser?.membership?.toUpperCase()} Member`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {contactCredits === 999 ? 'Unlimited' : contactCredits} Contact Unlocks Remaining
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Plan Active
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Candidate Phone */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Candidate Direct Number</span>
                        <span className="font-bold text-sm text-slate-900 tracking-wide font-mono">
                          {profile.phone || '+91 98201 45678'}
                        </span>
                      </div>
                      <div className="flex space-x-1.5">
                        <a
                          href={`tel:${profile.phone || '+919820145678'}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center space-x-1 shadow-xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartChat(profile.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0B192C] text-[#DFB76C] font-bold text-xs hover:bg-slate-900 border border-[#D4AF37]/40 flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3 text-[#DFB76C]" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>

                    {/* Father's Contact */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Father's Contact</span>
                        <span className="font-bold text-xs text-slate-900 tracking-wide font-mono">
                          {profile.fatherMobile || profile.familyPhone || '+91 94220 18273'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Father / Primary Guardian</span>
                      </div>
                      <a
                        href={`tel:${profile.fatherMobile || profile.familyPhone || '+919422018273'}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300 flex items-center space-x-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    </div>

                    {/* Mother's Contact */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Mother's Contact</span>
                        <span className="font-bold text-xs text-slate-900 tracking-wide font-mono">
                          {profile.motherMobile || '+91 94220 18274'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Mother / Family Guardian</span>
                      </div>
                      <a
                        href={`tel:${profile.motherMobile || '+919422018274'}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300 flex items-center space-x-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    </div>

                    {/* Verified Address */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Verified Residence Address</span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {profile.nativeAddress || `${profile.district || profile.city}, ${profile.state}`}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 leading-snug">
                    <strong className="text-[#8C6D1F]">Family Matrimony Etiquette:</strong> Please call between 9:00 AM and 8:30 PM IST. Introduce your family background respectfully.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Career & Education */}
          {activeTab === 'career' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Profession Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-[#1E3A8A]" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Professional Background
                  </h3>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{profile.profession}</h4>
                    <p className="text-xs text-slate-600 font-medium">{profile.company}</p>
                  </div>

                  {(profile.jobLocation || profile.jobPlace || profile.workLocation) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80">
                      <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                      <span className="text-slate-500 font-medium">Job Place:</span>
                      <strong className="text-slate-900 font-bold">{profile.jobLocation || profile.jobPlace || profile.workLocation}</strong>
                      {profile.workLocationType && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200 ml-auto">
                          {profile.workLocationType}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-1">
                    <span className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                      Annual Income: {profile.annualIncome}
                    </span>
                  </div>
                </div>
              </div>

              {/* Education & Academic Journey Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5 text-[#8C6D1F]" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Academic Background
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Academic Journey
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Highest Qualification */}
                  <div className="p-3 bg-gradient-to-r from-amber-50/70 to-slate-50 rounded-xl border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8C6D1F] uppercase tracking-wider flex items-center gap-1">
                        <span>🎓 Highest Qualification</span>
                      </span>
                      {profile.educationCategory && (
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {profile.educationCategory}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{profile.education}</h4>
                    {profile.institute && (
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DFB76C] shrink-0"></span>
                        <span>{profile.institute}</span>
                      </p>
                    )}
                  </div>

                  {/* 12th Standard / HSC / Junior College / +2 */}
                  {(profile.twelfthSchool || profile.twelfthBoard || profile.twelfthYear) && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          12th Standard (HSC / +2)
                        </span>
                        {profile.twelfthYear && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Passing Year: {profile.twelfthYear}
                          </span>
                        )}
                      </div>
                      {profile.twelfthSchool && (
                        <h5 className="font-bold text-slate-900 text-xs mt-0.5">
                          {profile.twelfthSchool}
                        </h5>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {profile.twelfthBoard && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                            {profile.twelfthBoard}
                          </span>
                        )}
                        {profile.twelfthStream && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                            {profile.twelfthStream}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 10th Standard / SSC / Matriculation */}
                  {(profile.tenthSchool || profile.tenthBoard || profile.tenthYear) && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          10th Standard (SSC / Matric)
                        </span>
                        {profile.tenthYear && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Passing Year: {profile.tenthYear}
                          </span>
                        )}
                      </div>
                      {profile.tenthSchool && (
                        <h5 className="font-bold text-slate-900 text-xs mt-0.5">
                          {profile.tenthSchool}
                        </h5>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {profile.tenthBoard && (
                          <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
                            {profile.tenthBoard}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Family Details */}
          {activeTab === 'family' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#1E3A8A]" />
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Family Background
                  </h3>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500 font-medium">Family Structure:</span>
                    <span className="font-bold text-slate-900">{profile?.familyDetails?.type || profile?.familyType || 'Nuclear Family'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500 font-medium">Values:</span>
                    <span className="font-bold text-slate-900">{profile?.familyDetails?.values || profile?.familyValues || 'Traditional yet Progressive'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Financial Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      {profile?.familyDetails?.financialStatus || profile?.familyFinancialStatus || profile?.familyStatus || 'Upper Middle Class'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500 font-medium">Father's Profession:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">{profile?.familyDetails?.father || profile?.fatherOccupation || 'Retired Professional'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500 font-medium">Mother's Profession:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">{profile?.familyDetails?.mother || profile?.motherOccupation || 'Homemaker'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500 font-medium">Siblings:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">{profile?.familyDetails?.siblings || profile?.siblingsDetails || '1 Sibling'}</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Family Album (2 Photos) Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HeartHandshake className="w-4 h-4 text-[#1E3A8A]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Family Album ({familyPhotos.length} Photos)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    Verified Family Photos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {familyPhotos.map((fUrl, fIdx) => (
                    <div 
                      key={fIdx}
                      onClick={() => setFullscreenPhoto({
                        url: fUrl,
                        title: fIdx === 0 ? 'Family Portrait with Parents' : 'Family Occasion & Gathering',
                        isFamily: true
                      })}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (screenshotRestricted) triggerScreenshotBlock('right-click');
                      }}
                      className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-200 shadow-xs cursor-pointer select-none photo-protected"
                    >
                      <img 
                        src={fUrl} 
                        alt={`Family ${fIdx + 1}`} 
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none"></div>
                      
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#0B192C]/90 text-white text-[8px] font-bold">
                          Family #{fIdx + 1}
                        </span>
                        {screenshotRestricted && (
                          <span className="px-1 py-0.5 rounded-md bg-black/60 text-amber-300 text-[8px] font-bold flex items-center gap-0.5">
                            <Lock className="w-2 h-2 text-amber-300" />
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-1.5 inset-x-1.5">
                        <span className="text-[9px] font-medium text-white block truncate leading-tight">
                          {fIdx === 0 ? 'Parents / Portrait' : 'Family Gathering'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 text-center italic">
                  Tap any family photo to enlarge in high resolution
                </p>
              </div>

            </div>
          )}

          {/* TAB 4: Astro & Kundali Milan */}
          {activeTab === 'horoscope' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Ashtakoot Banner */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 border border-amber-200/80 text-center space-y-1.5 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#DFB76C]/30 text-[#8C6D1F] flex items-center justify-center mx-auto mb-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-amber-950 text-base">Ashtakoot Kundali Milan</h4>
                <p className="text-xs text-amber-800">
                  Compatibility Score: <span className="font-bold">{profile.gunasMatch}</span> ({profile.matchScore}% Match)
                </p>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37] text-[#0B192C]">
                  Highly Auspicious Match
                </span>
              </div>

              {/* Astro Grid */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Vedic Astrology Details
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Rashi (Zodiac)</span>
                    <span className="font-bold text-slate-900 mt-1 block">{profile.astronomy?.rashi || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Nakshatra</span>
                    <span className="font-bold text-slate-900 mt-1 block">{profile.astronomy?.nakshatra || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Manglik Status</span>
                    <span className="font-bold text-slate-900 mt-1 block">{profile.manglik}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: Partner Expectations */}
          {activeTab === 'partner' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Personal Expectation Statement */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-[#DFB76C]" /> What {profile.name.split(' ')[0]} Values
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#8C6D1F] border border-amber-200">
                    Verified Expectations
                  </span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  "{profile.partnerExpectations}"
                </p>
              </div>

              {/* Structured Partner Criteria Breakdown */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Partner Preference Criteria
                </h3>
                
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Preferred Age:</span>
                    <span className="font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                      {profile.gender === 'Female' ? `${profile.age} - ${profile.age + 5} yrs` : `${Math.max(21, profile.age - 5)} - ${profile.age} yrs`}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Preferred Height:</span>
                    <span className="font-semibold text-slate-900">
                      {profile.gender === 'Female' ? "5'7\" to 6'2\"" : "5'2\" to 5'8\""}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Body Type:</span>
                    <span className="font-semibold text-slate-900">
                      {profile.prefBodyType || "Doesn't Matter / Any Body Type"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Skin Tone:</span>
                    <span className="font-semibold text-slate-900">
                      {profile.prefSkinTone || profile.prefSkinColour || "Fair / Wheatish"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Education:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                      Graduate / Professional Degree (Doctor, Engg, CA, MBA)
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Profession:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                      Working Professional / Self-Employed
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Income Expectation:</span>
                    <span className="font-semibold text-slate-900">₹ 15 LPA+ / Open</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Location Preference:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                      {profile.district} District & {profile.state} (Pan-India Open)
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Dietary Habit:</span>
                    <span className="font-semibold text-slate-900">
                      {profile.diet.includes('Vegetarian') ? 'Vegetarian / Eggetarian Preferred' : 'Flexible / Non-Veg OK'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Manglik Status:</span>
                    <span className="font-semibold text-slate-900">
                      {profile.manglik === 'Manglik' ? 'Manglik Preferred' : "Doesn't Matter / Non-Manglik"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Values & Qualities Valued */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Key Values & Traits Appreciated
                </h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Family-Oriented',
                    'Career-Driven',
                    'Mutual Respect',
                    'Cultured & Grounded',
                    'Intellectual Conversations',
                    'Open Communication'
                  ].map((trait, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50/80 text-[#8C6D1F] border border-amber-200/80 flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3 text-[#DFB76C] stroke-[3]" />
                      <span>{trait}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Fixed Bottom Mobile Action Dock */}
      <footer className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0 z-30 shadow-lg">
        
        {/* Shortlist Heart Button */}
        <button
          onClick={() => onToggleShortlist(profile.id)}
          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
            isShortlisted 
              ? 'bg-rose-50 border-rose-200 text-rose-600' 
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title={isShortlisted ? 'Shortlisted' : 'Shortlist'}
        >
          <Heart className={`w-5 h-5 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Audio Call Button */}
        <button
          onClick={() => {
            if (onStartAudioCall) onStartAudioCall(profile);
          }}
          className="p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          title="Direct Matrimonial Audio Call"
        >
          <Phone className="w-5 h-5" />
        </button>

        {/* Video Call Button */}
        <button
          onClick={() => {
            if (onStartVideoCall) onStartVideoCall(profile);
          }}
          className="p-2.5 rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          title="Live Matrimonial Video Meeting"
        >
          <Video className="w-5 h-5" />
        </button>

        {/* Direct Chat Button */}
        <button
          onClick={() => {
            onClose();
            onStartChat(profile.id);
          }}
          className="p-2.5 rounded-2xl border border-blue-200 bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 transition-colors flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          title="Message Candidate"
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* Connect / Send Interest Button */}
        <button
          onClick={() => {
            if (isInterested) {
              onToggleInterest(profile.id);
            } else if (onRequestSendInterest) {
              onRequestSendInterest(profile);
            } else {
              onToggleInterest(profile.id);
            }
          }}
          className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer active:scale-95 ${
            isInterested 
              ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
              : 'bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] text-[#0B192C] shadow-[#D4AF37]/30'
          }`}
        >
          {isInterested ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="truncate">Interest Sent</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="truncate">Connect / Send Interest</span>
            </>
          )}
        </button>

      </footer>
 
      {/* Fullscreen Photo Lightbox Modal with UIDAI & Matrimony Watermark */}
      {fullscreenPhoto && (
        <div 
          className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in"
          onClick={() => setFullscreenPhoto(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-white shrink-0 z-10" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#DFB76C]">
                  {profile.name} • {fullscreenPhoto.isFamily ? 'Family Album' : 'Single Portrait'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{fullscreenPhoto.title}</p>
            </div>
            <button
              onClick={() => setFullscreenPhoto(null)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image with Security Watermark */}
          <div 
            className="relative flex-1 flex items-center justify-center p-2 select-none photo-protected" 
            onClick={e => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              if (screenshotRestricted) triggerScreenshotBlock('right-click');
            }}
          >
            <div className="relative max-h-[75vh] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black">
              <img 
                src={fullscreenPhoto.url} 
                alt={fullscreenPhoto.title} 
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-[75vh] w-auto object-contain rounded-xl select-none pointer-events-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-300 py-1.5 px-3 bg-black/60 rounded-xl border border-white/10 shrink-0 flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
            <Lock className="w-3 h-3 text-rose-400 shrink-0" />
            <span>Protected Matrimonial Photograph • Capturing screenshots or screen recording is restricted under I 4 You Security Policy</span>
          </div>
        </div>
      )}

    </div>
  );
}
