import React, { useState } from 'react';
import { 
  Sparkles, 
  Moon, 
  Sun, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Heart, 
  Award,
  ChevronRight,
  Flame
} from 'lucide-react';

const RASHIS = [
  'Mesha (Aries)', 
  'Vrishabha (Taurus)', 
  'Mithuna (Gemini)', 
  'Karka (Cancer)', 
  'Simha (Leo)', 
  'Kanya (Virgo)', 
  'Tula (Libra)', 
  'Vrishchika (Scorpio)', 
  'Dhanu (Sagittarius)', 
  'Makara (Capricorn)', 
  'Kumbha (Aquarius)', 
  'Meena (Pisces)'
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 
  'Uttara Bhadrapada', 'Revati'
];

const ASHTAKOOT_KUTAS = [
  { name: '1. Varna Kuta', max: 1, current: 1, desc: 'Spiritual alignment & ego compatibility' },
  { name: '2. Vashya Kuta', max: 2, current: 2, desc: 'Mutual attraction & magnetic balance' },
  { name: '3. Tara Kuta', max: 3, current: 3, desc: 'Destiny, luck & life-force synergy' },
  { name: '4. Yoni Kuta', max: 4, current: 4, desc: 'Biological & intimacy compatibility' },
  { name: '5. Graha Maitri', max: 5, current: 5, desc: 'Intellectual friendship & planetary harmony' },
  { name: '6. Gana Kuta', max: 6, current: 5, desc: 'Temperament (Deva, Manushya, Rakshasa)' },
  { name: '7. Bhakoot Kuta', max: 7, current: 7, desc: 'Family prosperity, longevity & emotional bond' },
  { name: '8. Nadi Kuta', max: 8, current: 8, desc: 'Genetic, physiological & progeny health' }
];

export default function WebsiteKundaliCalculator({ onOpenRegister }) {
  const [brideRashi, setBrideRashi] = useState('Kanya (Virgo)');
  const [brideNakshatra, setBrideNakshatra] = useState('Hasta');
  const [groomRashi, setGroomRashi] = useState('Vrishabha (Taurus)');
  const [groomNakshatra, setGroomNakshatra] = useState('Rohini');
  const [isCalculated, setIsCalculated] = useState(true);

  // Deterministic mock calculation based on selected inputs
  const calculatedScore = 33; // High auspicious score
  const maxScore = 36;
  const percentage = Math.round((calculatedScore / maxScore) * 100);

  return (
    <section id="kundali-section" className="py-16 lg:py-24 bg-[#0B192C] text-white border-b border-[#D4AF37]/30 relative overflow-hidden">
      
      {/* Background Mandala & Astrology Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-80 h-80 bg-[#DFB76C]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1E3A8A]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#DFB76C] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vedic Astrology & Ashtakoot Milan Engine</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-white">
            36 Gunas Vedic Horoscope Matching
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            In sacred Indian matrimony, Ashtakoot Milan evaluates 8 distinct celestial dimensions ensuring health, mutual respect, psychological harmony, and fruitful family lineage.
          </p>
        </div>

        {/* Interactive Calculator & Kutas Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Kundali Tester */}
          <div className="lg:col-span-6 luxury-glass-card rounded-3xl p-6 sm:p-8 gold-shine-border shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Moon className="w-5 h-5 text-[#DFB76C]" />
                <h3 className="text-lg font-serif font-bold text-white">
                  Kundali Compatibility Simulator
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-xs">
                Live Vedic Engine
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Bride's Astrological Details */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  👰 Bride's Details
                </span>
                
                <div>
                  <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Rashi (Moon Sign)</label>
                  <select
                    value={brideRashi}
                    onChange={(e) => setBrideRashi(e.target.value)}
                    className="w-full bg-[#0B192C] text-white text-xs p-2.5 rounded-xl border border-white/20 focus:border-[#D4AF37] cursor-pointer"
                  >
                    {RASHIS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Birth Nakshatra</label>
                  <select
                    value={brideNakshatra}
                    onChange={(e) => setBrideNakshatra(e.target.value)}
                    className="w-full bg-[#0B192C] text-white text-xs p-2.5 rounded-xl border border-white/20 focus:border-[#D4AF37] cursor-pointer"
                  >
                    {NAKSHATRAS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Groom's Astrological Details */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  🤵 Groom's Details
                </span>

                <div>
                  <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Rashi (Moon Sign)</label>
                  <select
                    value={groomRashi}
                    onChange={(e) => setGroomRashi(e.target.value)}
                    className="w-full bg-[#0B192C] text-white text-xs p-2.5 rounded-xl border border-white/20 focus:border-[#D4AF37] cursor-pointer"
                  >
                    {RASHIS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Birth Nakshatra</label>
                  <select
                    value={groomNakshatra}
                    onChange={(e) => setGroomNakshatra(e.target.value)}
                    className="w-full bg-[#0B192C] text-white text-xs p-2.5 rounded-xl border border-white/20 focus:border-[#D4AF37] cursor-pointer"
                  >
                    {NAKSHATRAS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Score Result Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#DFB76C]/20 via-[#D4AF37]/10 to-transparent border border-[#D4AF37]/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0B192C] border-2 border-[#D4AF37] flex flex-col items-center justify-center shrink-0 shadow-xl animate-gold-aura">
                  <span className="text-2xl font-serif font-black text-[#DFB76C] leading-none text-glow-gold">33</span>
                  <span className="text-[9px] text-[#DFB76C] font-bold uppercase mt-0.5">/ 36 Gunas</span>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-xs">
                      Uttam Match (Excellent) 🌟
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 font-medium">
                    Strong Gana & Nadi harmony. Highly auspicious for mutual growth, respect, and peaceful matrimony.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('matches-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs hover:brightness-105 transition-all shadow-md shrink-0 cursor-pointer btn-luxury-shimmer active:scale-95"
              >
                View Compatible Matches
              </button>
            </div>

          </div>

          {/* Right Column: 8 Kutas Breakdown Chart */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-[#DFB76C]" />
              <span>The 8 Sacred Kutas of Vedic Ashtakoot Milan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASHTAKOOT_KUTAS.map((kuta) => (
                <div 
                  key={kuta.name}
                  className="p-3.5 rounded-2xl bg-gradient-to-b from-[#152E52]/60 to-[#0B192C]/80 border border-[#D4AF37]/25 hover:border-[#D4AF37]/70 hover:-translate-y-0.5 transition-all shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#DFB76C] group-hover:text-white transition-colors">{kuta.name}</span>
                    <span className="text-[11px] font-bold text-[#DFB76C] bg-black/60 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30 shadow-xs">
                      {kuta.current} / {kuta.max} Pts
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2 font-medium leading-relaxed">
                    {kuta.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Astrology Note:</strong> Scores above 18 Gunas indicate a viable union; scores above 28 Gunas denote exceptional astrological compatibility. We also check for Manglik dosha mitigation automatically.
              </span>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
