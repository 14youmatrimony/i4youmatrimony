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
import { isDemoProfile, isPlaceholderOrIncompleteProfile } from '../../services/api';

export default function WebsiteStoriesReel({
  profiles,
  activeStories = [],
  candidateStatuses = {},
  myStatus,
  onOpenStatusViewer,
  onOpenStatusEditor,
  currentUser,
  onOpenLogin
}) {
  const reelRef = useRef(null);

  const targetCandidateGender = getTargetCandidateGender(currentUser);
  
  // Strictly only show candidates who actually have an active status story in public.stories (< 24h old)
  // Never pull regular photo_url or family photos from profiles into the Status bar!
  const candidateStories = React.useMemo(() => {
    if (Array.isArray(activeStories) && activeStories.length > 0) {
      return activeStories
        .filter(s => {
          if (!s || !s.media_url) return false;
          if (currentUser?.id && String(s.user_id) === String(currentUser.id)) return false;
          return true;
        })
        .map(s => {
          const matchedProfile = (profiles || []).find(p => 
            String(p.id) === String(s.user_id) || 
            String(p.registerId) === String(s.user_id) ||
            String(p.register_id) === String(s.user_id)
          );

          if (matchedProfile && targetCandidateGender && !isCandidateMatchingTarget(matchedProfile, targetCandidateGender)) {
            return null;
          }

          const candidateObj = matchedProfile ? { ...matchedProfile } : {
            id: s.user_id,
            name: s.user_name || 'Member',
            photo: s.user_avatar || s.media_url,
            city: s.user_location,
            district: s.user_location
          };

          const statusObj = {
            id: s.id,
            type: 'photo',
            mediaUrl: s.media_url,
            caption: s.caption || '',
            createdAt: s.created_at,
            expiresAt: s.expires_at,
            timestamp: 'Active Story'
          };

          return { profile: candidateObj, status: statusObj };
        })
        .filter(Boolean);
    }

    return (profiles || [])
      .filter(p => !isDemoProfile(p) && !isPlaceholderOrIncompleteProfile(p))
      .filter(p => {
        if (isSelfProfile(p, currentUser)) return false;
        if (!isCandidateMatchingTarget(p, targetCandidateGender)) return false;
        return Boolean(candidateStatuses && candidateStatuses[p.id]);
      })
      .map(p => ({ profile: p, status: candidateStatuses[p.id] }));
  }, [activeStories, profiles, candidateStatuses, currentUser, targetCandidateGender]);

  return (
    <section id="stories-section" className="pt-3 pb-1 sm:pt-4 sm:pb-1 bg-[#FAF0F2] text-[#4A2E37] select-none">
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h2 className="text-base sm:text-xl md:text-2xl font-serif font-bold text-[#380817]">
              Glimpses into Real Lives &amp; Family Values
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
          className="flex items-center space-x-3.5 sm:space-x-4.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth"
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
              <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-0.5 sm:p-1 bg-gradient-to-tr from-[#4E0C22] via-[#8E5766] to-[#E4C1CA] shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300">
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
                  <div className={`w-full h-full flex items-center justify-center p-3 text-center text-xs font-semibold text-white rounded-xl sm:rounded-2xl bg-gradient-to-br ${myStatus?.bgGradient || 'from-[#4E0C22] to-[#6B1230]'}`}>
                    "{myStatus?.caption || myStatus?.text || 'My Status'}"
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#F5E1E6] to-[#F7E2E7] flex flex-col items-center justify-center text-[#4E0C22] p-2">
                    <Camera className="w-7 h-7 mb-1 text-[#4E0C22]" />
                    <span className="text-[10px]">Add Status</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent rounded-xl sm:rounded-2xl"></div>
                
                <div className="absolute bottom-2.5 left-2 right-2 sm:bottom-3 flex flex-col items-center text-center">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#4E0C22] text-white flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-white mt-1 drop-shadow">My Story</span>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#4A2E37]">Your Status</span>
            </div>
          ) : (
            <div 
              onClick={() => onOpenLogin?.()}
              className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-1 bg-gradient-to-tr from-[#4E0C22]/40 via-white/10 to-[#8E5766]/30 shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300 border border-[#E7CCD3] flex flex-col items-center justify-center text-center bg-white">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#F7E2E7] border border-[#E7CCD3] flex items-center justify-center text-[#4E0C22] mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-[#380817] leading-tight px-1">Share Intro</span>
                <span className="text-[8.5px] sm:text-[9.5px] text-[#4E0C22] font-mono mt-0.5">60s Video</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#4E0C22]">Post Story</span>
            </div>
          )}

          {/* Candidate Story Cards */}
          {candidateStories.map(({ profile, status }) => {
            return (
              <div 
                key={status?.id || profile.id}
                onClick={() => {
                  if (onOpenStatusViewer) {
                    onOpenStatusViewer(profile, status, false);
                  } else {
                    onOpenLogin?.();
                  }
                }}
                className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer group"
              >
                <div className="relative w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 lg:w-48 lg:h-76 rounded-2xl sm:rounded-3xl overflow-hidden p-0.5 sm:p-1 bg-gradient-to-tr from-[#4E0C22] via-[#8E5766] to-[#E4C1CA] shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300">
                  
                  {status?.type === 'video' ? (
                    <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden relative bg-slate-900">
                      <img 
                        src={profile.photo} 
                        alt={profile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#4E0C22]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform backdrop-blur-xs">
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
                    <div className={`w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-br ${status?.bgGradient || 'from-[#4E0C22] to-[#6B1230]'} p-3 sm:p-3.5 flex items-center justify-center text-center`}>
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
                      <span className="px-1.5 py-0.5 rounded-full bg-[#4E0C22]/90 text-white text-[8px] sm:text-[9px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Photo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[8px] sm:text-[9px] font-semibold flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Thought
                      </span>
                    )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#380817] via-[#380817]/30 to-transparent rounded-xl sm:rounded-2xl pointer-events-none"></div>

                  {/* Candidate Name & Timestamp */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 text-left pointer-events-none">
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-white truncate leading-tight drop-shadow-xs">
                        {profile.name.split(' ')[0]}
                      </p>
                      {profile.verified && (
                        <ShieldCheck className="w-3 h-3 text-[#E4C1CA] shrink-0" />
                      )}
                    </div>
                    <p className="text-[8.5px] sm:text-[9.5px] text-[#F7E2E7]/85 font-mono leading-tight mt-0.5">
                      {status.timestamp || 'Today'}
                    </p>
                  </div>

                </div>

                {/* Location text under card */}
                <span className="text-[10px] sm:text-[11px] text-[#4A2E37] max-w-[120px] sm:max-w-[150px] md:max-w-[180px] truncate text-center font-normal">
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
