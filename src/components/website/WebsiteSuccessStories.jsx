import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Heart,
  MapPin,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { fetchSuccessStoriesApi } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

const BENCHMARK_STORIES = [
  {
    id: 'story-1',
    couple: 'Dr. Ananya & Rohan',
    location: 'Ernakulam, Kerala',
    weddingDate: 'October 2026',
    photo: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800',
    note: 'Connected through verified family profiles and celebrated our wedding in Kochi.'
  },
  {
    id: 'story-2',
    couple: 'Meera & Siddharth',
    location: 'Bengaluru, Karnataka',
    weddingDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    note: 'Matched on shared values and family traditions with instant direct chat.'
  },
  {
    id: 'story-3',
    couple: 'Priyanka & Arjun',
    location: 'Thrissur, Kerala',
    weddingDate: 'August 2026',
    photo: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800',
    note: 'Our families met within three weeks of connecting on I 4 You Matrimony.'
  },
  {
    id: 'story-4',
    couple: 'Aiswarya & Karthik',
    location: 'Kozhikode, Kerala',
    weddingDate: 'July 2026',
    photo: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?auto=format&fit=crop&q=80&w=800',
    note: 'Aadhaar-verified profiles gave both families complete trust from day one.'
  },
  {
    id: 'story-5',
    couple: 'Neha & Vikram',
    location: 'Pune, Maharashtra',
    weddingDate: 'June 2026',
    photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
    note: 'Found our ideal life partner with transparent family background details.'
  },
  {
    id: 'story-6',
    couple: 'Divya & Pranav',
    location: 'Chennai, Tamil Nadu',
    weddingDate: 'May 2026',
    photo: 'https://images.unsplash.com/photo-1595429035839-c99c298ffdde?auto=format&fit=crop&q=80&w=800',
    note: 'Grateful for a respectful, family-first matchmaking journey.'
  }
];

export default function WebsiteSuccessStories() {
  const [liveStories, setLiveStories] = useState([]);
  const [hasLoadedLive, setHasLoadedLive] = useState(false);

  const loadLiveStories = useCallback(async () => {
    try {
      const stories = await fetchSuccessStoriesApi();
      if (Array.isArray(stories)) {
        setLiveStories(stories);
        setHasLoadedLive(true);
      }
    } catch (err) {
      console.warn('[WebsiteSuccessStories] Failed to load live stories:', err);
    }
  }, []);

  useEffect(() => {
    loadLiveStories();

    let channel = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        channel = supabase
          .channel('public:happy_stories_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'happy_stories' }, () => {
            loadLiveStories();
          })
          .on('broadcast', { event: 'happy_stories_updated' }, () => {
            loadLiveStories();
          })
          .subscribe();
      } catch (_) {}
    }

    return () => {
      if (channel && supabase) {
        try { supabase.removeChannel(channel); } catch (_) {}
      }
    };
  }, [loadLiveStories]);

  const displayStories = useMemo(() => {
    if (hasLoadedLive) {
      return (liveStories || []).map(row => ({
        id: row.id || `live-${row.created_at || Math.random()}`,
        couple: row.couple_name || row.couple_names || 'Blessed Couple',
        location: row.location || 'Kerala, India',
        weddingDate: row.wedding_date || 'Recently Married',
        photo: row.image_url || row.photo_url || BENCHMARK_STORIES[0].photo,
        note: row.story_text
          ? row.story_text.replace(/^[“"]+|[”"]+$/g, '')
          : 'Found our life partner through I 4 You Matrimony.'
      }));
    }
    return BENCHMARK_STORIES;
  }, [liveStories, hasLoadedLive]);

  return (
    <section
      id="testimonials-section"
      className="py-3 md:py-4 bg-[#FAF0F2] text-[#4A2E37] relative overflow-hidden"
    >
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 relative z-10 space-y-3 mt-1">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#F7E2E7] border border-[#E7CCD3] text-[#4E0C22] text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Real Couples, Real Blessed Marriages</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight text-[#380817]">
            100+ Happy Stories
          </h2>
        </div>

        {/* 3-Column x 2-Row Married Couple Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-5">
          {displayStories.map((story) => (
            <article
              key={story.id}
              className="h-full bg-white rounded-2xl p-3.5 border border-[#E7CCD3] shadow-xs flex flex-col justify-between group hover:border-[#8E5766] hover:shadow-md transition-all select-none"
            >
              {/* Couple Wedding Portrait */}
              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F7E2E7]/40 select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src={story.photo}
                  alt={story.couple}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-cover object-top rounded-xl group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E7F6EF]/95 text-[#1E7F5C] border border-[#BBE5D3] text-[10px] font-bold shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Blessed Marriage</span>
                </span>
              </div>

              {/* Couple Details */}
              <div className="pt-3 flex-1 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-[#380817] leading-snug">
                    {story.couple}
                  </h3>
                  <p className="text-xs text-[#4E0C22] font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8E5766] shrink-0" />
                    <span>{story.location}</span>
                  </p>
                  <p className="text-xs text-[#4A2E37] line-clamp-1 leading-relaxed pt-0.5">
                    {story.note}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F7E2E7] flex items-center justify-between text-[11px] text-[#7B4A57] font-medium">
                  <span className="flex items-center gap-1 text-[#8E5766] font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{story.weddingDate}</span>
                  </span>
                  <span>Verified Match</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
