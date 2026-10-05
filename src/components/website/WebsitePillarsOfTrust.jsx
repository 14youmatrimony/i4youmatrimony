import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  UserCheck, 
  EyeOff, 
  HeartHandshake,
  Layers,
  FileCheck2
} from 'lucide-react';

export default function WebsitePillarsOfTrust() {
  const pillars = [
    {
      icon: ShieldCheck,
      badge: 'GOVERNMENT BACKED',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      title: '100% Aadhaar UIDAI Verification',
      desc: 'Every candidate undergoes 3-layer identity verification via DigiLocker / Aadhaar OTP. We guarantee zero fake profiles, catfishing, or misleading information.',
      highlights: ['Aadhaar Number Verified', 'Government Name Match', 'Zero Fake Profiles']
    },
    {
      icon: Lock,
      badge: 'SCREENSHOT-PROOF',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      title: 'Military-Grade Photo Privacy Shield',
      desc: 'Your photos and family albums are safeguarded by our patented screenshot blocker, dynamic security watermarks, and granular privacy controls.',
      highlights: ['Anti-Screenshot Shutter', 'Accepted Matches Only', 'Watermarked Photos']
    },
    {
      icon: Sparkles,
      badge: 'VEDIC ASTROLOGY',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      title: 'Ashtakoot Gunas Milan Engine',
      desc: 'Ancient Vedic wisdom meets modern mathematics. Automatically calculates 36 Gunas across Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, and Nadi.',
      highlights: ['36 Gunas Score Card', 'Manglik Dosha Analysis', 'Nakshatra Compatibility']
    },
    {
      icon: MapPin,
      badge: 'HYPERLOCAL NETWORK',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      title: 'All India Access',
      desc: 'We bridge metropolitan professionals with traditional family values across 700+ Indian districts including Nashik, Mysuru, Kolhapur, Salem, and Amritsar.',
      highlights: ['700+ Indian Districts', 'Native Hometown Ties', 'Regional Community Portals']
    }
  ];

  return (
    <section id="why-section" className="py-16 lg:py-24 bg-[#07111E] text-white border-b border-white/10 relative overflow-hidden">
      
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#DFB76C] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Uncompromising Matrimonial Security</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-white">
            The 4 Pillars of Matrimonial Trust
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Finding a life partner is the most sacred decision of your life. Here is how "I 4 You" ensures safety, authenticity, and cultural dignity at every step.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="bg-gradient-to-b from-[#0F223D]/90 to-[#0B192C]/90 rounded-3xl p-6 border border-white/10 hover:border-[#D4AF37]/60 shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="space-y-4">
                  
                  {/* Icon & Badge Header */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-white group-hover:text-[#DFB76C] transition-colors leading-snug">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {p.desc}
                  </p>

                </div>

                {/* Highlights Checklist */}
                <div className="pt-5 mt-4 border-t border-white/10 space-y-2">
                  {p.highlights.map((item) => (
                    <div key={item} className="flex items-center space-x-2 text-[11px] text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
}
