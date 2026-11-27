-- ============================================================================
-- I 4 YOU MATRIMONY - 24 WEDDING SERVICE CATEGORIES MIGRATION
-- Updates wedding_vendors.category CHECK constraint to all 23 specific slugs
-- (All Services is the UI filter for all categories)
-- ============================================================================

-- 1. Safely map any legacy category slugs to the new 23 category slugs
UPDATE public.wedding_vendors
SET category = CASE category
  WHEN 'clothing' THEN 'bridal_groom_wear'
  WHEN 'stitching' THEN 'clothing_stitching'
  WHEN 'jewellery' THEN 'jewellery_ornaments'
  WHEN 'rentals' THEN 'dress_jewellery_rental'
  WHEN 'stage_decoration' THEN 'stage_hall_decoration'
  WHEN 'makeup' THEN 'bridal_makeup_hair'
  WHEN 'photography' THEN 'photography_video_drone'
  WHEN 'catering' THEN 'catering_food'
  WHEN 'vehicle_rental' THEN 'bridal_groom_car'
  WHEN 'tourist_buses' THEN 'tourist_bus'
  ELSE category
END
WHERE category IN (
  'clothing', 'stitching', 'jewellery', 'rentals', 'stage_decoration',
  'makeup', 'photography', 'catering', 'vehicle_rental', 'tourist_buses'
);

-- 2. Replace CHECK constraint with all 23 specific category slugs
ALTER TABLE public.wedding_vendors
  DROP CONSTRAINT IF EXISTS wedding_vendors_category_check;

ALTER TABLE public.wedding_vendors
  ADD CONSTRAINT wedding_vendors_category_check CHECK (
    category IN (
      'event_management',
      'invitation_cards',
      'bridal_groom_wear',
      'clothing_stitching',
      'jewellery_ornaments',
      'dress_jewellery_rental',
      'mehndi_artist',
      'auditorium_convention',
      'stage_hall_decoration',
      'flowers_garlands',
      'sound_lighting_sfx',
      'bridal_makeup_hair',
      'photography_video_drone',
      'catering_food',
      'wedding_cake_sweets',
      'bridal_groom_car',
      'tourist_bus',
      'guest_accommodation',
      'percussion_melam',
      'music_dj_anchors',
      'security_valet',
      'return_gifts_hampers',
      'honeymoon_travel'
    )
  );
