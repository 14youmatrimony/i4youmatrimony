import React, { useEffect, useState } from 'react';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../config/appStoreLinks';

/**
 * Smart cross-platform `/download` landing & redirect page.
 * - iOS (iPhone, iPad, iPod, iPadOS): redirects immediately to APP_STORE_URL.
 * - Android: redirects immediately to PLAY_STORE_URL.
 * - Desktop / fallback: shows a clean minimalist pastel screen with both store buttons.
 */
export default function SmartDownloadPage() {
  const [detectedPlatform, setDetectedPlatform] = useState('desktop');

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      setDetectedPlatform('ios');
      window.location.replace(APP_STORE_URL);
      return;
    }

    if (isAndroid) {
      setDetectedPlatform('android');
      window.location.replace(PLAY_STORE_URL);
    }
  }, []);

  const redirectMessage =
    detectedPlatform === 'ios'
      ? 'Redirecting you to the Apple App Store...'
      : detectedPlatform === 'android'
        ? 'Redirecting you to Google Play...'
        : 'Choose your device platform below to download the I 4 You Matrimony app.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F6] via-[#FDF2F0] to-[#F5F0FA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white/95 border border-[#E8C5B8]/60 shadow-xl p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FCE8DF] to-[#F8D8D8] border border-[#E5B8A8]/50 flex items-center justify-center">
          <Smartphone className="w-7 h-7 text-[#8C3B4A]" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9C5C65]">
            I 4 You Matrimony Mobile App
          </p>
          <h1 className="text-2xl font-serif font-bold text-[#2C1A1D]">
            Download I 4 You
          </h1>
          <p className="text-sm text-[#6E5559] leading-relaxed">
            {redirectMessage}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3.5 w-full px-5 py-3.5 rounded-xl bg-[#2C1A1D] text-white border border-[#E8C5B8]/40 hover:border-[#E5A99B] hover:bg-[#3A2327] transition-all shadow-sm"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 512 512" aria-hidden="true">
              <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" />
              <path fill="#34A853" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l255.6-256L47 0z" />
              <path fill="#FBBC04" d="M421.7 218.4l-96.4-55.4-67.6 67.6 67.6 67.6 96.5-55.4c17.5-10 17.5-34.8-.1-44.4z" />
              <path fill="#EA4335" d="M104.6 499l280.8-161.3-60.1-60.1L104.6 499z" />
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-rose-100/80">
                Get it on
              </div>
              <div className="text-base font-semibold tracking-tight">
                Google Play
              </div>
            </div>
          </a>

          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3.5 w-full px-5 py-3.5 rounded-xl bg-[#2C1A1D] text-white border border-[#E8C5B8]/40 hover:border-[#E5A99B] hover:bg-[#3A2327] transition-all shadow-sm"
          >
            <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 170 170" aria-hidden="true">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.17-9.44-11.05-20.15-14.65-32.14-3.6-11.98-5.4-23.01-5.4-33.09 0-14.68 3.51-26.65 10.53-35.91 7.02-9.26 15.84-13.97 26.47-14.12 5.06 0 10.74 1.34 17.04 4.02 6.3 2.68 10.14 4.08 11.52 4.2 1.83-.34 5.9-1.89 12.21-4.65 6.31-2.76 11.89-4.02 16.74-3.79 12.83.67 22.95 5.56 30.36 14.67-11.19 6.81-16.69 16.29-16.5 28.44.18 10.01 4.07 18.33 11.68 24.96 4.88 4.29 10.45 7.15 16.71 8.58-2.31 6.84-5.28 14.4-8.91 22.68zM119.22 33.06c0-7.39 2.68-14.28 8.04-20.67 5.36-6.39 12.04-10.42 20.04-12.09.22 1.34.34 2.57.34 3.69 0 7.39-2.8 14.39-8.4 21-5.6 6.61-12.39 10.63-20.37 12.06-.23-1.34-.35-2.67-.35-3.99z" />
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-rose-100/80">
                Download on the
              </div>
              <div className="text-base font-semibold tracking-tight">
                App Store
              </div>
            </div>
          </a>
        </div>

        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C3B4A] hover:text-[#2C1A1D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to I 4 You Matrimony
          </a>
        </div>
      </div>
    </div>
  );
}
