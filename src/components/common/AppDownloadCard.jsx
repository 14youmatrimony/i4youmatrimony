import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2, QrCode, X } from 'lucide-react';

export default function AppDownloadCard({ onSwitchToAppMode, className = '' }) {
  const [downloading, setDownloading] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  const handleAndroidDownload = () => {
    setDownloading(true);
    // Trigger direct download of the authentic compiled APK
    const link = document.createElement('a');
    link.href = '/I-4-You-Matrimony.apk';
    link.download = 'I-4-You-Matrimony.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 5000);
  };

  return (
    <>
      {/* Exact replica of the user reference card */}
      <div className={`bg-white text-slate-900 rounded-[28px] p-6 sm:p-8 shadow-2xl border border-slate-100 max-w-lg mx-auto transition-all duration-300 ${className}`}>
        
        {/* Header Text matching user's design */}
        <p className="text-center text-[15px] sm:text-[16.5px] font-normal text-[#1e293b] leading-snug mb-6 max-w-md mx-auto">
          Point your phone camera at the QR code or use<br className="hidden sm:inline" /> one of the download links below
        </p>

        {/* Download Container: QR Code (Left) & Store Buttons (Right) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-7">
          
          {/* QR Code Container */}
          <div className="flex flex-col items-center shrink-0">
            <div className="p-1 bg-white rounded-xl">
              <img 
                src="/app-download-qr.svg" 
                alt="Scan to Download I 4 You Mobile App" 
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain block"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Store Buttons Stack */}
          <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
            
            {/* 1. Google Play Store Button */}
            <button
              type="button"
              onClick={handleAndroidDownload}
              className="flex items-center gap-3 px-4 py-2.5 bg-black hover:bg-neutral-900 active:scale-95 text-white rounded-xl shadow-md border border-neutral-900 transition-all cursor-pointer text-left w-full sm:w-[195px] group"
              title="Download Android APK (Direct Install)"
            >
              {/* Official Google Play 4-Color Triangle SVG */}
              <svg className="w-7 h-7 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 512 512">
                <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z"/>
                <path fill="#34A853" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l255.6-256L47 0z"/>
                <path fill="#FBBC04" d="M421.7 218.4l-96.4-55.4-67.6 67.6 67.6 67.6 96.5-55.4c17.5-10 17.5-34.8-.1-44.4z"/>
                <path fill="#EA4335" d="M104.6 499l280.8-161.3-60.1-60.1L104.6 499z"/>
              </svg>
              <div className="leading-tight">
                <span className="block text-[9px] uppercase tracking-wider text-slate-300 font-semibold">
                  GET IT ON
                </span>
                <span className="block text-[15px] sm:text-base font-bold text-white tracking-tight -mt-0.5">
                  Google Play
                </span>
              </div>
            </button>

            {/* 2. Apple App Store Button */}
            <button
              type="button"
              onClick={() => setShowIosModal(true)}
              className="flex items-center gap-3 px-4 py-2.5 bg-black hover:bg-neutral-900 active:scale-95 text-white rounded-xl shadow-md border border-neutral-900 transition-all cursor-pointer text-left w-full sm:w-[195px] group"
              title="Download on Apple App Store / iOS Web App"
            >
              {/* Official Apple Logo SVG */}
              <svg className="w-7 h-7 fill-white shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.17-9.44-11.05-20.15-14.65-32.14-3.6-11.98-5.4-23.01-5.4-33.09 0-14.68 3.51-26.65 10.53-35.91 7.02-9.26 15.84-13.97 26.47-14.12 5.06 0 10.74 1.34 17.04 4.02 6.3 2.68 10.14 4.08 11.52 4.2 1.83-.34 5.9-1.89 12.21-4.65 6.31-2.76 11.89-4.02 16.74-3.79 12.83.67 22.95 5.56 30.36 14.67-11.19 6.81-16.69 16.29-16.5 28.44.18 10.01 4.07 18.33 11.68 24.96 4.88 4.29 10.45 7.15 16.71 8.58-2.31 6.84-5.28 14.4-8.91 22.68zM119.22 33.06c0-7.39 2.68-14.28 8.04-20.67 5.36-6.39 12.04-10.42 20.04-12.09.22 1.34.34 2.57.34 3.69 0 7.39-2.8 14.39-8.4 21-5.6 6.61-12.39 10.63-20.37 12.06-.23-1.34-.35-2.67-.35-3.99z"/>
              </svg>
              <div className="leading-tight">
                <span className="block text-[9px] text-slate-300 font-medium leading-none">
                  Download on the
                </span>
                <span className="block text-[15px] sm:text-base font-bold text-white tracking-tight -mt-0.5">
                  App Store
                </span>
              </div>
            </button>

          </div>

        </div>

        {/* Live download feedback */}
        {downloading ? (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Downloading <strong>I-4-You-Matrimony.apk</strong> (12.7 MB)... Tap to install!</span>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <span>Direct Android APK (v2.4)</span>
            <span>•</span>
            <span>100% Virus & Malware Free</span>
          </div>
        )}

      </div>

      {/* iOS App Store / Simulator Information Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B192C] text-white border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative">
            
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#DFB76C] mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold font-serif text-white mb-2">
              I 4 You for Apple iOS & Android
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              You can test-drive the full, live iOS mobile app experience directly in this browser, or download the direct APK for Android.
            </p>

            <div className="space-y-3 pt-2">
              {onSwitchToAppMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowIosModal(false);
                    onSwitchToAppMode();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Launch Live Interactive Mobile App</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowIosModal(false);
                  handleAndroidDownload();
                }}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Android APK File (12.7 MB)</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4">
              Apple App Store listing is currently in test review. Progressive Web App (PWA) is 100% active.
            </p>

          </div>
        </div>
      )}
    </>
  );
}
