import React from 'react';
import { 
  Smartphone, 
  Video, 
  MessageCircle, 
  ShieldCheck, 
  Camera
} from 'lucide-react';
import AppDownloadCard from '../common/AppDownloadCard';

export default function WebsiteAppShowcase({ onSwitchToAppMode }) {
  return (
    <section id="download-section" className="py-16 lg:py-24 bg-gradient-to-b from-[#0B192C] via-[#152E52] to-[#0B192C] text-white border-b border-[#D4AF37]/30 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#DFB76C]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#1E3A8A]/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: App Highlights & Download CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#DFB76C] text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Native Android & iOS Application</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-extrabold text-white leading-tight">
              Experience Matrimony on the Go with <span className="gold-gradient-text">I 4 You Mobile</span>
            </h2>

            <p className="text-base sm:text-lg lg:text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              Designed specifically for fast, confidential connections. Enjoy real-time WhatsApp-style video status updates, instant matrimonial chat, and screenshot protection right on your smartphone.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
              <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start space-x-3.5 group">
                <Video className="w-6 h-6 text-[#DFB76C] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">60-Second Video Intros</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">Authentic candidate family vibes</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start space-x-3.5 group">
                <Camera className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Screenshot Privacy Shield</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">Blocks screen capture attempts</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start space-x-3.5 group">
                <MessageCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Direct Family Chat</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">Safe, moderated messaging</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start space-x-3.5 group">
                <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Aadhaar Instant Match</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">Verified matrimony network</p>
                </div>
              </div>
            </div>



          </div>

          {/* Right Column: QR Code & Download Card (Replaced Phone Mockup) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <AppDownloadCard onSwitchToAppMode={onSwitchToAppMode} className="w-full" />
          </div>

        </div>

      </div>

    </section>
  );
}
