import React, { useState } from 'react';
import { Video, Mic, MapPin, Image, ShieldCheck, Check, Sparkles, X, Loader2 } from 'lucide-react';

/**
 * Helper to check whether permissions have already been granted or onboarded
 */
export async function checkPermissionsGranted() {
  if (typeof window === 'undefined') return true;

  try {
    if (localStorage.getItem('app_permissions_granted') === 'true') {
      return true;
    }
    if (localStorage.getItem('app_permissions_dismissed') === 'true') {
      return true;
    }

    // Check navigator.permissions query if supported
    if (navigator?.permissions?.query) {
      const [mic, cam] = await Promise.allSettled([
        navigator.permissions.query({ name: 'microphone' }),
        navigator.permissions.query({ name: 'camera' })
      ]);
      const micGranted = mic.status === 'fulfilled' && mic.value?.state === 'granted';
      const camGranted = cam.status === 'fulfilled' && cam.value?.state === 'granted';
      if (micGranted && camGranted) {
        localStorage.setItem('app_permissions_granted', 'true');
        return true;
      }
    }
  } catch (e) {
    // navigator.permissions query for camera/mic not universally supported
  }

  return false;
}

export default function PermissionOnboardingModal({
  isOpen = false,
  onComplete,
  onDismiss
}) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleRequestAllPermissions = async () => {
    setIsRequesting(true);

    // 1. Request Camera & Microphone upfront
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
          });
        } catch (camErr) {
          console.warn('[PermissionModal] Cam+Mic combo notice, falling back to audio:', camErr?.name);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
              video: false
            });
          } catch (audErr) {
            console.warn('[PermissionModal] Audio-only fallback error:', audErr?.name);
          }
        }

        // Immediately stop all test tracks so the camera/mic hardware light turns OFF right away!
        if (stream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {}
          });
        }
      }
    } catch (e) {
      console.warn('[PermissionModal] Media request error:', e);
    }

    // 2. Request Location for location-based matchmaking
    if (navigator?.geolocation?.getCurrentPosition) {
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              console.log('[PermissionModal] Location permission granted');
              resolve(pos);
            },
            (err) => {
              console.warn('[PermissionModal] Location query notice:', err?.message);
              resolve(null);
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        });
      } catch (e) {}
    }

    // 3. Mark permissions granted permanently in localStorage
    try {
      localStorage.setItem('app_permissions_granted', 'true');
      localStorage.setItem('app_permissions_granted_at', new Date().toISOString());
    } catch (e) {}

    setIsDone(true);
    setIsRequesting(false);

    // Close after brief celebration confirmation
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 700);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('app_permissions_dismissed', 'true');
    } catch (e) {}
    if (onDismiss) onDismiss();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300"
      onClick={handleDismiss}
    >
      <div 
        className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#0B192C] via-[#081220] to-[#040810] text-white rounded-3xl border border-[#DFB76C]/30 shadow-2xl p-5 sm:p-6 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Ambient Top Highlight */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#DFB76C]/20 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          title="Maybe Later"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2 pb-4 relative z-10 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#DFB76C]/20 to-amber-500/10 border border-[#DFB76C]/40 mx-auto flex items-center justify-center text-[#DFB76C] shadow-lg shadow-amber-500/10">
            <Sparkles className="w-7 h-7 text-[#DFB76C]" />
          </div>

          <h3 className="font-serif font-bold text-xl text-white tracking-wide">
            Enable Device Access
          </h3>

          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            Allow access to connect with verified matches smoothly, make voice & video calls, and find nearby profiles.
          </p>
        </div>

        {/* 3 Permission Feature Tiles */}
        <div className="space-y-2.5 relative z-10 my-3">
          {/* Tile 1: Camera & Microphone */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3 hover:bg-white/10 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30 gap-0.5">
              <Video className="w-3.5 h-3.5" />
              <Mic className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Camera & Microphone</h4>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Calls
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                For live HD video calls and crystal-clear voice chats with accepted matches.
              </p>
            </div>
          </div>

          {/* Tile 2: Location */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3 hover:bg-white/10 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#DFB76C] flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Location Access</h4>
                <span className="text-[10px] font-semibold text-[#DFB76C] bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Matches
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                To discover compatible partner profiles in your preferred city, district, and state.
              </p>
            </div>
          </div>

          {/* Tile 3: Photo Gallery / Media */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-3 hover:bg-white/10 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
              <Image className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Photo Gallery & Media</h4>
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Gallery
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                To seamlessly upload profile photos and family albums directly from your device.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Privacy Guarantee */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 py-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>100% Private. Camera & Mic are only active during calls.</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2 relative z-10">
          <button
            type="button"
            onClick={handleRequestAllPermissions}
            disabled={isRequesting || isDone}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#DFB76C] via-[#EDC988] to-[#DFB76C] text-[#0B192C] shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-80"
          >
            {isDone ? (
              <>
                <Check className="w-4 h-4 text-emerald-900 stroke-[3]" />
                <span className="text-emerald-950 font-extrabold">Permissions Enabled!</span>
              </>
            ) : isRequesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B192C]" />
                <span>Requesting Access...</span>
              </>
            ) : (
              <>
                <span>Allow Access</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={isRequesting || isDone}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
