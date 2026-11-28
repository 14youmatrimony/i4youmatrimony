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
    <section id="download-section" className="py-6 md:py-8 bg-gradient-to-b from-[#FFF7FA] via-[#FDF2F6] to-[#F9EBF0] text-[#5A4463] border-b border-[#E8C6D1] relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#8064A2]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#C76B85]/05 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full md:w-[90%] max-w-[1800px] mx-auto px-4 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: App Highlights & Download CTAs */}
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#F9EBF0] border border-[#E8C6D1] text-[#C76B85] text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-[#8064A2]" />
              <span>Native Android & iOS Application</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-extrabold text-[#2E1A36] leading-tight">
              Experience Matrimony on the Go with <span className="text-[#C76B85]">I 4 You Mobile</span>
            </h2>

            <p className="text-base sm:text-lg lg:text-xl text-[#5A4463] leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              Designed specifically for fast, confidential connections. Enjoy real-time WhatsApp-style video status updates, instant matrimonial chat, and screenshot protection right on your smartphone.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left">
              <div className="p-4 rounded-2xl bg-white hover:bg-[#F9EBF0] border border-[#E8C6D1] transition-all flex items-start space-x-3.5 group shadow-xs">
                <Video className="w-6 h-6 text-[#C76B85] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#2E1A36]">60-Second Video Intros</h4>
                  <p className="text-xs sm:text-sm text-[#5A4463] mt-0.5 font-medium">Authentic candidate family vibes</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white hover:bg-[#F9EBF0] border border-[#E8C6D1] transition-all flex items-start space-x-3.5 group shadow-xs">
                <Camera className="w-6 h-6 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#2E1A36]">Screenshot Privacy Shield</h4>
                  <p className="text-xs sm:text-sm text-[#5A4463] mt-0.5 font-medium">Blocks screen capture attempts</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white hover:bg-[#F9EBF0] border border-[#E8C6D1] transition-all flex items-start space-x-3.5 group shadow-xs">
                <MessageCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#2E1A36]">Direct Family Chat</h4>
                  <p className="text-xs sm:text-sm text-[#5A4463] mt-0.5 font-medium">Safe, moderated messaging</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white hover:bg-[#F9EBF0] border border-[#E8C6D1] transition-all flex items-start space-x-3.5 group shadow-xs">
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#2E1A36]">Aadhaar Instant Match</h4>
                  <p className="text-xs sm:text-sm text-[#5A4463] mt-0.5 font-medium">Verified matrimony network</p>
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
