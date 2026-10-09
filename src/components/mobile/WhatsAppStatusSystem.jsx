import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Video, 
  Pencil, 
  Trash2, 
  EyeOff, 
  Eye, 
  Plus, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  Heart, 
  MoreVertical, 
  Clock, 
  AlertTriangle, 
  Image as ImageIcon,
  Check,
  CheckCheck
} from 'lucide-react';

// Sample background gradients for WhatsApp-style text status
const TEXT_GRADIENTS = [
  { id: 'navy-gold', label: 'Royal Navy', bg: 'from-[#0B192C] via-[#152E52] to-[#1E3A8A]', text: 'text-white' },
  { id: 'emerald', label: 'Emerald Temple', bg: 'from-emerald-900 via-teal-900 to-emerald-950', text: 'text-emerald-100' },
  { id: 'violet', label: 'Mystic Purple', bg: 'from-purple-900 via-indigo-950 to-slate-950', text: 'text-purple-100' },
  { id: 'crimson', label: 'Festive Red', bg: 'from-rose-900 via-red-950 to-amber-950', text: 'text-rose-100' },
  { id: 'gold', label: 'Auspicious Gold', bg: 'from-[#8C6D1F] via-[#DFB76C] to-[#0B192C]', text: 'text-amber-100' }
];

// Curated sample matrimony videos (under 60s) for instant 1-click test
const SAMPLE_VIDEOS = [
  {
    name: 'Western Ghats Hiking (24s)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    duration: 24,
    caption: 'Serene morning nature walk in the Western Ghats 🌿⛰️'
  },
  {
    name: 'Temple Celebration (32s)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4',
    duration: 32,
    caption: 'Auspicious coastal temple visit with family 🙏🌊'
  }
];

// Curated sample matrimony photos for instant test
const SAMPLE_PHOTOS = [
  {
    name: 'Traditional Festivities',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    caption: 'Traditional family celebration and cultural festivities 🏛️✨'
  },
  {
    name: 'Festive Attire',
    url: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800',
    caption: 'Traditional ethnic celebration weekend with blessings 🙏🌺'
  }
];

export default function WhatsAppStatusSystem({
  myStatus,
  activeStoryViewer,
  onCloseStoryViewer,
  isWebsite = false,
  statusEditorOpen,
  onCloseStatusEditor,
  onOpenStatusEditor,
  statusMenuOpen,
  onCloseStatusMenu,
  onOpenStatusMenu,
  onSaveMyStatus,
  onDeleteMyStatus,
  onToggleHideMyStatus,
  onHideOtherStatus,
  onRemoveOtherStatus,
  onOpenProfile,
  onOpenChat,
  onToggleInterest,
  isInterested
}) {
  return (
    <>
      {/* 1. WhatsApp Full-Screen Story Viewer */}
      {activeStoryViewer && (
        <WhatsAppStoryViewerModal 
          storyData={activeStoryViewer}
          onClose={onCloseStoryViewer}
          isWebsite={isWebsite}
          onOpenMenu={(profile, isOwn) => {
            onCloseStoryViewer();
            onOpenStatusMenu && onOpenStatusMenu(profile, isOwn, true);
          }}
          onOpenProfile={onOpenProfile}
          onOpenChat={onOpenChat}
          onToggleInterest={onToggleInterest}
          isInterested={isInterested}
          onDeleteMyStatus={onDeleteMyStatus}
          onEditMyStatus={() => {
            onCloseStoryViewer();
            onOpenStatusEditor && onOpenStatusEditor();
          }}
        />
      )}

      {/* 2. WhatsApp Status Creator & Editor Sheet (Upload Photo / Video Max 60s / Text) */}
      {statusEditorOpen && (
        <WhatsAppStatusEditorSheet 
          initialStatus={myStatus}
          onClose={onCloseStatusEditor}
          onSave={onSaveMyStatus}
          isWebsite={isWebsite}
        />
      )}

      {/* 3. WhatsApp Status Context Action Sheet (Hide / Delete / Edit) */}
      {statusMenuOpen && (
        <WhatsAppStatusContextMenu 
          menuData={statusMenuOpen}
          onClose={onCloseStatusMenu}
          isWebsite={isWebsite}
          onEdit={() => {
            onCloseStatusMenu();
            onOpenStatusEditor && onOpenStatusEditor();
          }}
          onDelete={() => {
            if (statusMenuOpen.isOwnStatus) {
              onDeleteMyStatus();
            } else {
              onRemoveOtherStatus(statusMenuOpen.profile.id);
            }
            onCloseStatusMenu();
          }}
          onHide={() => {
            if (statusMenuOpen.isOwnStatus) {
              onToggleHideMyStatus();
            } else {
              onHideOtherStatus(statusMenuOpen.profile.id);
            }
            onCloseStatusMenu();
          }}
          onViewProfile={() => {
            if (statusMenuOpen.profile && onOpenProfile) {
              onOpenProfile(statusMenuOpen.profile);
            }
            onCloseStatusMenu();
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 1: WhatsApp Status Story Viewer
// ─────────────────────────────────────────────────────────────────────────────
export function WhatsAppStoryViewerModal({
  storyData,
  onClose,
  isWebsite = false,
  onOpenProfile,
  onOpenChat,
  onToggleInterest,
  isInterested,
  onDeleteMyStatus
}) {
  // Gracefully resolve profile, status, and isOwnStatus
  let profile = storyData?.profile;
  let status = storyData?.status;
  let isOwnStatus = Boolean(storyData?.isOwnStatus);

  // If storyData was passed directly as a profile (e.g. storyData.name or storyData.photo exists without nested .profile)
  if (!profile && (storyData?.name || storyData?.photo)) {
    profile = storyData;
    if (typeof status === 'string') {
      status = null;
    }
  }

  // Ensure status is a valid object
  if (!status || typeof status !== 'object') {
    status = {
      type: 'photo',
      mediaUrl: profile?.photo || profile?.coverPhoto || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
      caption: profile?.about || `${profile?.name || 'Candidate'}'s Story`,
      timestamp: 'Just now'
    };
  }

  const candidateFirstName = profile?.name ? profile.name.split(' ')[0] : (isOwnStatus ? 'My Status' : 'Candidate');
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const videoRef = useRef(null);

  const durationSec = status?.type === 'video' ? (status.duration || 15) : 6;

  // Auto-advance progress timer
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = 50;
    const increment = (intervalMs / (durationSec * 1000)) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onClose(), 0);
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPaused, durationSec, onClose]);

  const handleSendReply = (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setTimeout(() => {
      setReplyText('');
      setReplySent(false);
      onClose();
      if (onOpenChat && profile?.id) {
        onOpenChat(profile.id);
      }
    }, 1200);
  };

  const viewerContent = (
    <>
      {/* Top Segmented Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-3 pt-3 flex items-center space-x-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Top Header Bar with Avatar, Name, Time, and Actions */}
      <div className="absolute top-5 left-0 right-0 z-40 px-3 py-2 flex items-center justify-between text-white bg-gradient-to-b from-black/60 to-transparent">
        <div 
          className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (!isOwnStatus && profile && onOpenProfile) onOpenProfile(profile);
          }}
        >
          <img 
            src={profile?.photo || status?.mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
            alt={profile?.name || 'Status'} 
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#DFB76C]"
          />
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                {isOwnStatus ? 'My Status' : (profile?.name || 'Candidate Story')}
              </h3>
              {profile?.verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
            <p className="text-[10px] text-slate-300 flex items-center space-x-1">
              <span>{status?.timestamp || 'Just now'}</span>
              {status?.type === 'video' && (
                <span className="text-amber-300 font-medium">• 🎥 Video ({durationSec}s)</span>
              )}
              {status?.isHidden && (
                <span className="text-rose-400 font-semibold">• 🔒 Hidden</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {status?.type === 'video' && (
            <button
              onClick={() => {
                setIsMuted(m => !m);
                if (videoRef.current) videoRef.current.muted = !isMuted;
              }}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Status Media Area (Photo / Video / Text) */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full bg-black">
        {status?.type === 'video' ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={status.mediaUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="max-h-full max-w-full object-contain"
            />
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                <div className="p-3 rounded-full bg-black/60 text-white">
                  <Pause className="w-6 h-6" />
                </div>
              </div>
            )}
          </div>
        ) : status?.type === 'text' ? (
          <div className={`w-full h-full flex items-center justify-center p-6 bg-gradient-to-br ${status.bgGradient || 'from-[#0B192C] to-[#1E3A8A]'}`}>
            <p className="font-serif text-lg sm:text-xl text-center leading-relaxed text-white font-medium max-w-xs drop-shadow-md">
              "{status.caption || status.text}"
            </p>
          </div>
        ) : (
          /* Photo Status */
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={status?.mediaUrl || profile?.photo || profile?.coverPhoto || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800"} 
              alt="Status Story" 
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Bottom Area: Caption + Quick Reply / Viewers info */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent p-3.5 space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption text */}
        {status?.caption && status?.type !== 'text' && (
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/15 text-center">
            <p className="text-xs sm:text-sm text-white font-medium leading-snug">
              {status.caption}
            </p>
          </div>
        )}

        {/* If viewing My Status: show views counter and delete */}
        {isOwnStatus ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3.5 py-2 flex items-center justify-between text-white border border-white/15">
            <div className="flex items-center space-x-2 text-xs">
              <Eye className="w-4 h-4 text-[#DFB76C]" />
              <span className="font-bold">{status?.viewsCount || 18} Views</span>
              <span className="text-[10px] text-slate-300">• Viewed by mutual matches</span>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Delete this status update?')) {
                  onDeleteMyStatus && onDeleteMyStatus();
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition-colors flex items-center space-x-1 text-[11px] font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        ) : (
          /* If viewing Candidate's Status: WhatsApp quick reply / connect */
          <div className="space-y-2">
            {replySent ? (
              <div className="bg-emerald-600/90 text-white rounded-2xl p-2.5 text-center text-xs font-bold flex items-center justify-center space-x-1.5 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Message sent to {candidateFirstName}!</span>
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="flex items-center space-x-2">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${candidateFirstName}...`}
                  className="flex-1 px-3.5 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 text-white placeholder-slate-300 text-xs focus:bg-white/30 focus:outline-none focus:ring-1 focus:ring-[#DFB76C]"
                />
                
                {/* Quick Emoji Reaction Buttons */}
                {['🙏', '❤️', '✨'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setReplyText(prev => prev + ' ' + emoji);
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 rounded-2xl bg-[#D4AF37] text-[#0B192C] disabled:opacity-40 font-bold transition-all shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Quick Send Interest Bar */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                {profile?.district || profile?.city || 'Local Match'}
              </span>
              <button
                onClick={() => onToggleInterest && profile?.id && onToggleInterest(profile.id)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center space-x-1 transition-all ${
                  isInterested 
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                    : 'bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/30'
                }`}
              >
                <Heart className={`w-3 h-3 ${isInterested ? 'fill-emerald-400' : ''}`} />
                <span>{isInterested ? 'Connected' : 'Send Interest'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (isWebsite) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-[380px] sm:max-w-[395px] h-[90vh] max-h-[720px] rounded-3xl overflow-hidden shadow-2xl relative border border-[#D4AF37]/40 flex flex-col justify-between bg-black animate-in zoom-in-95 duration-200 select-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {viewerContent}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="absolute inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {viewerContent}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 2: WhatsApp Status Editor / Uploader Sheet (Photo, Video max 60s, Text)
// Strictly bounded inside the phone screen, NEVER spills out to computer screen!
// ─────────────────────────────────────────────────────────────────────────────
export function WhatsAppStatusEditorSheet({
  initialStatus,
  onClose,
  onSave,
  isWebsite = false
}) {
  const [activeTab, setActiveTab] = useState(initialStatus?.type || 'photo'); // 'photo' | 'video' | 'text'
  const [caption, setCaption] = useState(initialStatus?.caption || initialStatus?.text || '');
  const [mediaUrl, setMediaUrl] = useState(initialStatus?.mediaUrl || '');
  const [videoDuration, setVideoDuration] = useState(initialStatus?.duration || 0);
  const [durationError, setDurationError] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(initialStatus?.bgGradient || TEXT_GRADIENTS[0].bg);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef(null);

  // Handle local file selection (Photo or Video)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setDurationError('');

    if (file.type.startsWith('video/')) {
      setActiveTab('video');
      const objectUrl = URL.createObjectURL(file);
      // Read video duration using HTML5 video metadata
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;

      tempVideo.onloadedmetadata = () => {
        window.URL.revokeObjectURL(tempVideo.src);
        const duration = Math.round(tempVideo.duration);

        if (duration > 60) {
          // Exceeds 60s rule
          setDurationError(`⚠️ Video is ${duration} seconds long! WhatsApp status limit is strictly max 60 seconds. Video will be capped at 60s.`);
          setVideoDuration(60);
        } else {
          setDurationError('');
          setVideoDuration(duration);
        }
      };

      tempVideo.onerror = () => {
        setVideoDuration(30);
      };

      // Read video as Data URL if under 15MB for persistence across reloads
      if (file.size < 15 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setMediaUrl(evt.target?.result);
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setMediaUrl(objectUrl);
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaUrl(objectUrl);
        setIsProcessing(false);
      }
    } else {
      // Photo file: Read as Base64 Data URL and compress to ~80-120KB so it never fails in localStorage or Supabase
      setActiveTab('photo');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const rawDataUrl = evt.target?.result;
        if (!rawDataUrl) {
          setIsProcessing(false);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 900;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            setMediaUrl(compressed);
          } catch (e) {
            setMediaUrl(rawDataUrl);
          }
          setIsProcessing(false);
        };
        img.onerror = () => {
          setMediaUrl(rawDataUrl);
          setIsProcessing(false);
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const newStatus = {
      id: 'status-' + Date.now(),
      type: activeTab,
      mediaUrl: activeTab === 'text' ? null : (mediaUrl || ''),
      duration: activeTab === 'video' ? (videoDuration > 60 ? 60 : videoDuration || 20) : null,
      caption: caption.trim(),
      bgGradient: activeTab === 'text' ? selectedGradient : null,
      timestamp: 'Just now',
      viewsCount: 0,
      views: []
    };

    onSave(newStatus);
    onClose();
  };

  const editorContent = (
    <div 
      className={isWebsite 
        ? "bg-white rounded-3xl w-full max-w-[420px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative border border-[#D4AF37]/40" 
        : "bg-white rounded-t-3xl w-full max-w-[392px] sm:max-w-md max-h-[92%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 relative border-t border-slate-200"
      }
      onClick={(e) => e.stopPropagation()}
    >
        {/* Top Notch Pill */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0"></div>

        {/* Sheet Header Bar */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-amber-50 text-[#8C6D1F] flex items-center justify-center font-bold">
              <Pencil className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-slate-900">
                {initialStatus ? 'Edit My Status' : 'Add to My Status'}
              </h3>
              <p className="text-[10px] text-slate-400">Share photo, video (max 60s), or text update</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Status Mode Tabs: Photo | Video (Max 60s) | Text */}
        <div className="px-4 pt-2.5 shrink-0">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs">
            <button
              onClick={() => {
                setActiveTab('photo');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'photo' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Photo</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('video');
                if (!mediaUrl) {
                  setMediaUrl(SAMPLE_VIDEOS[0].url);
                  setVideoDuration(SAMPLE_VIDEOS[0].duration);
                }
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'video' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>Video (≤60s)</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'text' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Pencil className="w-3.5 h-3.5 text-purple-600" />
              <span>Text</span>
            </button>
          </div>
        </div>

        {/* Sheet Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          
          {/* TAB 1: Photo Mode */}
          {activeTab === 'photo' && (
            <div className="space-y-3">
              {/* Photo Preview Container */}
              <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center">
                {mediaUrl ? (
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No photo selected</p>
                  </div>
                )}

                {/* Upload Button overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-bold flex items-center space-x-1.5 hover:bg-black border border-white/20 shadow-md"
                >
                  <Camera className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Choose Photo</span>
                </button>
              </div>

              {/* Sample Photo Presets */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Sample:</span>
                {SAMPLE_PHOTOS.map((sp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMediaUrl(sp.url);
                      setCaption(sp.caption);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap font-medium border border-slate-200"
                  >
                    {sp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Video Mode (Strictly max 60s) */}
          {activeTab === 'video' && (
            <div className="space-y-3">
              {/* Video Preview Container */}
              <div className="relative h-44 rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-inner flex items-center justify-center">
                {mediaUrl ? (
                  <video 
                    src={mediaUrl} 
                    controls 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <Video className="w-8 h-8 mx-auto mb-1 opacity-50 text-blue-400" />
                    <p className="text-xs">No video chosen</p>
                  </div>
                )}

                {/* Duration Badge */}
                {videoDuration > 0 && (
                  <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center space-x-1 shadow-sm ${
                    videoDuration <= 60 
                      ? 'bg-emerald-600/90 text-white' 
                      : 'bg-rose-600/90 text-white'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>0:{videoDuration < 10 ? '0' : ''}{videoDuration} / 1:00 max</span>
                  </div>
                )}

                {/* Video Picker Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-bold flex items-center space-x-1.5 hover:bg-black border border-white/20 shadow-md"
                >
                  <Video className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Choose Video</span>
                </button>
              </div>

              {/* 60s WhatsApp Warning Banner */}
              {durationError ? (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{durationError}</span>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-[#1E3A8A] text-[10px] font-medium flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>WhatsApp status supports maximum 60 seconds of video.</span>
                </div>
              )}

              {/* Sample Videos Presets */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Sample:</span>
                {SAMPLE_VIDEOS.map((sv, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMediaUrl(sv.url);
                      setVideoDuration(sv.duration);
                      setCaption(sv.caption);
                      setDurationError('');
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap font-medium border border-slate-200"
                  >
                    {sv.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Text Mode */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              {/* Text Card Preview with Selected Gradient */}
              <div className={`h-40 rounded-2xl p-4 bg-gradient-to-br ${selectedGradient} flex items-center justify-center text-center shadow-inner`}>
                <p className="font-serif text-sm font-semibold text-white leading-relaxed line-clamp-4">
                  {caption.trim() ? caption : "Your status update preview will appear here..."}
                </p>
              </div>

              {/* Gradient Color Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Background Color
                </label>
                <div className="flex items-center space-x-2">
                  {TEXT_GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGradient(g.bg)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${g.bg} transition-all flex items-center justify-center ring-2 ${
                        selectedGradient === g.bg ? 'ring-[#D4AF37] scale-110' : 'ring-transparent'
                      }`}
                      title={g.label}
                    >
                      {selectedGradient === g.bg && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Caption Input Box */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-1">
              {activeTab === 'text' ? 'Status Text *' : 'Add Caption'}
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={activeTab === 'text' ? "Type your status message..." : "Add a caption for your matrimony matches..."}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none resize-none font-medium text-slate-800"
              maxLength={180}
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
              <span>🔒 Only visible to verified matrimony profiles</span>
              <span>{caption.length}/180</span>
            </div>
          </div>

          {/* Hidden File Input for Native File System */}
          <input 
            ref={fileInputRef}
            type="file"
            accept={activeTab === 'video' ? 'video/*' : 'image/*'}
            onChange={handleFileChange}
            className="hidden"
          />

        </div>

        {/* Sheet Footer Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCaption('');
              setMediaUrl('');
              setVideoDuration(0);
              setDurationError('');
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
          >
            Clear
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={activeTab === 'text' ? !caption.trim() : !mediaUrl && !caption.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#0B192C] hover:bg-[#DFB76C] transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{initialStatus ? 'Update Status' : 'Share Status'}</span>
            </button>
          </div>
        </div>

      </div>
  );

  return (
    <div 
      className={isWebsite 
        ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" 
        : "absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      }
      onClick={onClose}
    >
      {editorContent}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 3: WhatsApp Status Context Menu (Hide, Delete, Edit)
// Strictly bounded inside the phone screen, NEVER spills out to computer screen!
// ─────────────────────────────────────────────────────────────────────────────
export function WhatsAppStatusContextMenu({
  menuData,
  onClose,
  onEdit,
  onDelete,
  onHide,
  onViewProfile,
  isWebsite = false
}) {
  const { profile, isOwnStatus, hasStatus } = menuData || {};

  const menuContent = (
    <div 
      className={isWebsite
        ? "bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative border border-[#D4AF37]/40"
        : "bg-white rounded-t-3xl w-full max-w-[392px] sm:max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 relative border-t border-slate-200"
      }
      onClick={(e) => e.stopPropagation()}
    >
        {/* Notch handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1.5"></div>

        {/* Profile Info Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-3">
          <img 
            src={profile?.photo} 
            alt={profile?.name || 'Status'} 
            className="w-11 h-11 rounded-full object-cover ring-2 ring-[#DFB76C]" 
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-900 truncate">
              {isOwnStatus ? 'My Matrimony Status' : `${profile?.name?.split(' ')[0]}'s Status`}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              {isOwnStatus ? 'Manage your updates, privacy & media' : `${profile?.district}, ${profile?.state}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Options (WhatsApp style) */}
        <div className="py-2 divide-y divide-slate-100">
          
          {/* Option 1: Edit Status (For My Status) */}
          {isOwnStatus && (
            <button
              onClick={onEdit}
              className="w-full px-5 py-3 flex items-center space-x-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-slate-800">Edit Status</p>
                <p className="text-[10px] text-slate-400">Update photo, video (max 60s), or caption</p>
              </div>
            </button>
          )}

          {/* Option 2: Hide / Mute Status */}
          <button
            onClick={onHide}
            className="w-full px-5 py-3 flex items-center space-x-3.5 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <EyeOff className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-slate-800">
                {isOwnStatus ? 'Hide from Matches (Privacy)' : 'Hide / Mute Status'}
              </p>
              <p className="text-[10px] text-slate-400">
                {isOwnStatus 
                  ? 'Temporarily hide this status from candidate feeds' 
                  : `Don't show future updates from ${profile?.name?.split(' ')[0]}`
                }
              </p>
            </div>
          </button>

          {/* Option 3: Delete / Remove Status */}
          <button
            onClick={onDelete}
            className="w-full px-5 py-3 flex items-center space-x-3.5 hover:bg-rose-50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs text-rose-700">
                {isOwnStatus ? 'Delete Status' : 'Remove from Status Feed'}
              </p>
              <p className="text-[10px] text-slate-400">
                {isOwnStatus 
                  ? 'Permanently remove your current status update' 
                  : 'Remove this candidate’s bubble from top bar'
                }
              </p>
            </div>
          </button>

          {/* Option 4: View Profile (If other contact) */}
          {!isOwnStatus && onViewProfile && (
            <button
              onClick={onViewProfile}
              className="w-full px-5 py-3 flex items-center space-x-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-slate-800">View Full Profile</p>
                <p className="text-[10px] text-slate-400">See horoscope, bio, family details & photos</p>
              </div>
            </button>
          )}

        </div>

        {/* Cancel Button */}
        <div className="p-3 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
  );

  return (
    <div 
      className={isWebsite 
        ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" 
        : "absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      }
      onClick={onClose}
    >
      {menuContent}
    </div>
  );
}
