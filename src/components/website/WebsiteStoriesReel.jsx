import React, { useRef } from 'react';
import { 
  Sparkles, 
  Video, 
  Camera, 
  FileText, 
  Play, 
  Plus, 
  ShieldCheck
} from 'lucide-react';
import { getTargetCandidateGender, isCandidateMatchingTarget, isSelfProfile } from '../../utils/genderMatch';
import { isDemoProfile } from '../../services/api';

export default function WebsiteStoriesReel({
  profiles,
  candidateStatuses = {},
  myStatus,
  onOpenStatusViewer,
  onOpenStatusEditor,
  currentUser,
  onOpenLogin
}) {
  const reelRef = useRef(null);

  const targetCandidateGender = getTargetCandidateGender(currentUser);
  // Profiles that have an active status story (strictly opposite gender, real profiles only)
  const profilesWithStories = (profiles || [])
    .filter(p => !isDemoProfile(p))
    .filter(p => {
      if (isSelfProfile(p, currentUser)) return false;
      if (!isCandidateMatchingTarget(p, targetCandidateGender)) return false;
      return candidateStatuses[p.id] || p.singlePhotos?.length > 1;
    });

  return (
    <section id="stories-section" className="py-7 sm:py-9 bg-[#07111E] border-b border-white/10 text-white select-none">
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 sm:mb-5">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[10px] sm:text-xs font-semibold text-[#DFB76C] uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3 h-3" />
              <span>Authentic Video & Photo Status Updates</span>
            </div>
            <h2 className="text-base sm:text-xl md:text-2xl font-serif font-bold text-white">
              Glimpses into Real Lives & Family Values
            </h2>
          </div>
        </div>

        {/* Stories Horizontal Reel */}
        <div 
          ref={reelRef}
          onWheel={(e) => {
            if (e.deltaY !== 0 && reelRef.current) {
              reelRef.current.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center space-x-3.5 sm:space-x-4.5 overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth"
        >
          
          {/* User's Own Status Card or Guest Story Prompt */}
          {currentUser ? (
            <div 
              onClick={() => {
                if (myStatus) {
                  onOpenStatusViewer(currentUser, myStatus, true);
                } else {
                  onOpenStatusEditor();
                }
              }}
              className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-0.5 sm:p-1 bg-gradient-to-tr from-[#D4AF37] via-[#DFB76C] to-emerald-400 shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300">
                {myStatus?.mediaUrl || currentUser?.photo ? (
                  <img 
                    src={myStatus?.mediaUrl || currentUser?.photo} 
                    alt="My Status"
                    className="w-full h-full object-cover rounded-xl sm:rounded-2xl group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      if (currentUser?.photo && e.target.src !== currentUser.photo) {
                        e.target.src = currentUser.photo;
                      }
                    }}
                  />
                ) : myStatus?.type === 'text' ? (
                  <div className={`w-full h-full flex items-center justify-center p-3 text-center text-xs font-semibold text-white rounded-xl sm:rounded-2xl bg-gradient-to-br ${myStatus?.bgGradient || 'from-[#0B192C] to-[#1E3A8A]'}`}>
                    "{myStatus?.caption || myStatus?.text || 'My Status'}"
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#152E52] to-[#0B192C] flex flex-col items-center justify-center text-amber-200/70 p-2">
                    <Camera className="w-7 h-7 mb-1" />
                    <span className="text-[10px]">Add Status</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent rounded-xl sm:rounded-2xl"></div>
                
                <div className="absolute bottom-2.5 left-2 right-2 sm:bottom-3 flex flex-col items-center text-center">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#D4AF37] text-[#0B192C] flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-white mt-1 drop-shadow">My Story</span>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">Your Status</span>
            </div>
          ) : (
            <div 
              onClick={() => onOpenLogin?.()}
              className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-1 bg-gradient-to-tr from-[#D4AF37]/50 via-white/10 to-[#DFB76C]/30 shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300 border border-[#D4AF37]/40 flex flex-col items-center justify-center text-center bg-[#0B192C]">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#DFB76C] mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-white leading-tight px-1">Share Intro</span>
                <span className="text-[8.5px] sm:text-[9.5px] text-[#DFB76C] font-mono mt-0.5">60s Video</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#DFB76C]">Post Story</span>
            </div>
          )}

          {/* Candidate Story Cards */}
          {profilesWithStories.map((profile) => {
            const status = candidateStatuses[profile.id] || {
              type: 'photo',
              mediaUrl: profile.photo,
              caption: `Life, values & aspirations of ${profile.name}`,
              timestamp: 'Recently'
            };

            return (
              <div 
                key={profile.id}
                onClick={() => {
                  if (onOpenStatusViewer) {
                    onOpenStatusViewer(profile, status, false);
                  } else {
                    onOpenLogin?.();
                  }
                }}
                className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
              >
                <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-0.5 sm:p-1 bg-gradient-to-tr from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300">
                  
                  {status?.type === 'video' ? (
                    <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden relative bg-slate-900">
                      <img 
                        src={profile.photo} 
                        alt={profile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform backdrop-blur-xs">
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  ) : status?.type === 'photo' ? (
                    <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden relative">
                      <img 
                        src={status?.mediaUrl || profile.photo} 
                        alt={profile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br ${status?.bgGradient || 'from-emerald-900 to-teal-950'} p-3 sm:p-3.5 flex items-center justify-center text-center`}>
                      <p className="text-[10px] sm:text-[11px] md:text-xs text-white/90 italic font-serif line-clamp-4 leading-normal px-1">
                        "{status?.text}"
                      </p>
                    </div>
                  )}

                  {/* Top Story Type Pill */}
                  <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
                    {status?.type === 'video' ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[8px] sm:text-[9px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {status?.duration ? `${status.duration}s` : 'Video'}
                      </span>
                    ) : status?.type === 'photo' ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-600/90 text-white text-[8px] sm:text-[9px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Photo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[8px] sm:text-[9px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Thought
                      </span>
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111E] via-[#07111E]/30 to-transparent rounded-xl sm:rounded-2xl pointer-events-none"></div>

                  {/* Candidate Name & Timestamp */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 text-left pointer-events-none">
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-white truncate leading-tight drop-shadow-xs">
                        {profile.name.split(' ')[0]}
                      </p>
                      {profile.verified && (
                        <ShieldCheck className="w-3 h-3 text-[#DFB76C] shrink-0" />
                      )}
                    </div>
                    <p className="text-[8.5px] sm:text-[9.5px] text-[#DFB76C]/85 font-mono leading-tight mt-0.5">
                      {status.timestamp || 'Today'}
                    </p>
                  </div>

                </div>

                {/* Location text under card */}
                <span className="text-[10px] sm:text-[11px] text-slate-400 max-w-[120px] sm:max-w-[150px] md:max-w-[180px] truncate text-center font-normal">
                  {profile.district || profile.city}
                </span>

              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
