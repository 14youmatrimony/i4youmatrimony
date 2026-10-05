import React from 'react';
import { 
  Heart, 
  Sparkles, 
  Star, 
  Quote, 
  MapPin, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function WebsiteSuccessStories() {
  const stories = [
    {
      id: 'story-1',
      couple: 'Dr. Ananya & Rohan',
      location: 'Nashik & Pune, Maharashtra',
      weddingDate: 'November 2025',
      gunasMatch: '33/36 Gunas Match',
      photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
      quote: '“We connected on I 4 You because our families were looking for authentic Maharashtrian cultural roots. The 33 Gunas horoscope score and Aadhaar verification gave our parents complete peace of mind. We met at Trimbakeshwar Shiva temple for our Roka ceremony!”',
      daysToMatch: 'Connected in 22 days'
    },
    {
      id: 'story-2',
      couple: 'Meera & Siddharth',
      location: 'Bengaluru & Chennai, South India',
      weddingDate: 'January 2026',
      gunasMatch: '31/36 Gunas Match',
      photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
      quote: '“As working professionals in Bangalore and Chennai, we valued mutual respect and modern aspirations backed by traditional South Indian family values. I 4 You’s verified profile badges and clean direct chat made our conversations natural and joyful.”',
      daysToMatch: 'Connected in 35 days'
    },
    {
      id: 'story-3',
      couple: 'Priyanka & Arjun',
      location: 'Jaipur & Delhi NCR',
      weddingDate: 'February 2026',
      gunasMatch: '34/36 Gunas Match',
      photo: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800',
      quote: '“The 60-second video status feature was the turning point! Seeing Arjun’s candid morning family prayer gave my parents an authentic sense of warmth that no standard text bio could ever convey. Blessed to have found my soulmate here.”',
      daysToMatch: 'Connected in 18 days'
    }
  ];

  return (
    <section id="testimonials-section" className="py-16 lg:py-24 bg-[#0B192C] text-white border-b border-[#D4AF37]/30 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-[#DFB76C]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 relative z-10 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#DFB76C] text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Real Couples, Real Blessed Marriages</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-white">
            14,800+ Happy Stories & Counting
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Read heartwarming stories of couples who found their sacred match across Indian metros and heritage towns.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stories.map((story) => (
            <article
              key={story.id}
              className="bg-gradient-to-b from-[#152E52]/90 to-[#0B192C]/95 rounded-3xl overflow-hidden border border-[#D4AF37]/40 shadow-2xl flex flex-col justify-between group hover:border-[#D4AF37] transition-all hover:-translate-y-1"
            >
              
              {/* Couple Wedding Photo */}
              <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-900">
                <img 
                  src={story.photo} 
                  alt={story.couple}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-transparent to-transparent"></div>

                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <span className="px-2.5 py-1 rounded-full bg-[#0B192C]/80 text-[#DFB76C] border border-[#D4AF37]/50 font-bold text-[11px] backdrop-blur-xs flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3 text-[#DFB76C]" />
                    <span>{story.gunasMatch}</span>
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-xl font-serif font-bold text-white drop-shadow-sm">
                    {story.couple}
                  </h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#DFB76C]" />
                    <span>{story.location}</span>
                  </p>
                </div>
              </div>

              {/* Story Content & Testimonial Quote */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-300 ml-1">5.0 Verified</span>
                  </div>

                  <p className="text-xs text-slate-300 italic leading-relaxed font-normal">
                    {story.quote}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#DFB76C] font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Married: {story.weddingDate}
                  </span>
                  <span className="text-slate-400 font-normal">
                    {story.daysToMatch}
                  </span>
                </div>

              </div>

            </article>
          ))}
        </div>

      </div>

    </section>
  );
}
