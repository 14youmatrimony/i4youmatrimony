import React, { useState, useMemo } from 'react';
import { 
  User, 
  GraduationCap, 
  MapPin, 
  HeartHandshake, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Layers,
  Compass,
  Briefcase,
  Users,
  Moon,
  Heart,
  Camera,
  X,
  Upload,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  CheckCircle2,
  Mail,
  Info
} from 'lucide-react';
import SearchableSelect from './common/SearchableSelect';
import DualRangeSlider from './common/DualRangeSlider';
import { sanitizeInput, sanitizePhone, sanitizeEmail } from '../utils/security';
import { registerWithRegisterId } from '../services/authService';
import { STATES_AND_CITIES } from '../data/locationData';
import { 
  ALL_INDIA_RELIGIONS, 
  RELIGION_COMMUNITIES, 
  DEFAULT_COMMUNITY_FOR_RELIGION, 
  LINEAGE_LABEL_FOR_RELIGION, 
  LINEAGE_PLACEHOLDER_FOR_RELIGION, 
  POPULAR_GOTHRAS,
  isKundaliApplicableReligion
} from '../data/religionData';

export const RELIGIONS = ALL_INDIA_RELIGIONS;
export { RELIGION_COMMUNITIES, DEFAULT_COMMUNITY_FOR_RELIGION, LINEAGE_LABEL_FOR_RELIGION, POPULAR_GOTHRAS, isKundaliApplicableReligion };


export const MOTHER_TONGUES = [
  'Hindi', 
  'Marathi', 
  'Tamil', 
  'Telugu', 
  'Kannada', 
  'Bengali', 
  'Gujarati', 
  'Punjabi', 
  'Malayalam', 
  'Odia', 
  'Assamese', 
  'Urdu', 
  'Marwari', 
  'Konkani', 
  'Tulu', 
  'Kashmiri'
];

export const QUALIFICATION_GROUPS = [
  {
    category: '🩺 Medicine & Healthcare',
    options: [
      'MBBS',
      'MD / MS (Medical PG)',
      'DM / M.Ch (Super Speciality)',
      'BDS / MDS (Dental)',
      'BAMS (Ayurveda)',
      'BHMS (Homeopathy)',
      'BPT / MPT (Physiotherapy)',
      'B.Pharm / M.Pharm',
      'B.Sc / M.Sc Nursing'
    ]
  },
  {
    category: '💻 Engineering & Technology',
    options: [
      'B.Tech / B.E',
      'M.Tech / M.E / M.S',
      'B.Tech + MBA (Dual)',
      'B.Arch (Architecture)',
      'M.Arch (Master of Arch)',
      'MCA / BCA (Computer Apps)',
      'B.Sc / M.Sc (IT / CS)'
    ]
  },
  {
    category: '💼 Management & Business',
    options: [
      'MBA / PGDM',
      'BBA / BBM',
      'Executive MBA / EMBA',
      'MMS / PGPM'
    ]
  },
  {
    category: '⚖️ Finance, Accounts & Law',
    options: [
      'CA (Chartered Accountant)',
      'CS (Company Secretary)',
      'CMA / ICWA',
      'CFA / FRM (Finance)',
      'B.Com / M.Com',
      'LL.B / LL.M (Law)',
      'B.A LL.B (Integrated Law)'
    ]
  },
  {
    category: '🔬 Science, Research & Agriculture',
    options: [
      'B.Sc / M.Sc (Science)',
      'Ph.D / Doctorate',
      'Post-Doctoral Fellow (PDF)',
      'B.Sc / M.Sc Agriculture',
      'Biotechnology / Bioinformatics'
    ]
  },
  {
    category: '🎨 Arts, Media & Design',
    options: [
      'B.A / M.A',
      'B.A / M.A Economics',
      'Psychology & Counselling',
      'Journalism & Mass Comm',
      'B.Des / M.Des (Design)',
      'NID / NIFT Graduate',
      'Fine Arts (BFA / MFA)'
    ]
  },
  {
    category: '🏛️ Civil Services & Defence',
    options: [
      'IAS / IPS / IFS (Civil Services)',
      'State PSC Officer (PCS / KAS)',
      'Defence (NDA / CDS / Armed Forces)',
      'Commercial Pilot (CPL / ATPL)',
      'Merchant Navy Officer'
    ]
  },
  {
    category: '📚 Education, Hospitality & Others',
    options: [
      'B.Ed / M.Ed (Teaching)',
      'Hotel Management (BHM / IHM)',
      'Diploma / Polytechnic',
      'Other Qualification'
    ]
  }
];

export const QUALIFICATIONS = QUALIFICATION_GROUPS.flatMap(g => g.options);

export const EDUCATION_CATEGORIES = [
  'Medical / Healthcare',
  'Dental & Allied Health',
  'Pharmacy & Pharma Tech',
  'Engineering / IT',
  'Computer Science & AI',
  'Architecture & Planning',
  'Management / MBA',
  'Business Administration',
  'Finance & Banking / CA',
  'Law & Legal Services',
  'Civil Services / Govt',
  'Defence & Armed Forces',
  'Science & Research',
  'Agriculture & Allied',
  'Arts & Humanities',
  'Media, Film & Journalism',
  'Design & Fashion',
  'Aviation & Maritime',
  'Hotel Management & Tourism',
  'Education & Teaching',
  'Diploma / Polytechnic',
  'Other Stream'
];

export const EDUCATION_BOARDS_10TH = [
  'State Board (SSC / 10th)',
  'CBSE (Central Board)',
  'ICSE (CISCE 10th)',
  'IB / Cambridge / IGCSE',
  'NIOS (National Open School)',
  'Other Recognized Board'
];

export const EDUCATION_BOARDS_12TH = [
  'State Board (HSC / Intermediate / PUC)',
  'CBSE (Central Board 12th)',
  'ISC (CISCE 12th)',
  'IB / Cambridge (A-Levels)',
  'NIOS (National Open School)',
  'Diploma / Polytechnic (Post-10th)',
  'Other Recognized Board'
];

export const STREAMS_12TH = [
  'Science (PCB - Pre-Medical)',
  'Science (PCM - Engineering)',
  'Science (PCMB - General Science)',
  'Commerce (Accounts & Economics)',
  'Commerce with Mathematics',
  'Arts / Humanities',
  'Vocational / Technical (+2)',
  'Diploma / Polytechnic'
];

export const PASSING_YEARS = Array.from({ length: 36 }, (_, i) => String(2026 - i));

export const POPULAR_HOBBIES = [
  'Traveling & Road Trips',
  'Reading & Literature',
  'Cooking & Culinary Arts',
  'Gardening & Nature',
  'Photography & Film',
  'Painting & Sketching',
  'Writing & Poetry',
  'Classical Dance (Bharatnatyam / Kathak)',
  'Singing & Vocal Music',
  'Playing Musical Instruments',
  'DIY Crafts & Interior Decor',
  'Volunteering & Social Work'
];

export const POPULAR_INTERESTS = [
  'Indian Classical Music',
  'Bollywood & World Cinema',
  'Trekking & Mountain Hiking',
  'Technology & Innovation',
  'Historic & Cultural Heritage',
  'Spiritual & Meditation',
  'Social Work & Philanthropy',
  'Food Tasting & Cafe Hopping',
  'Wildlife & Bird Watching',
  'Startups & Business'
];

export const POPULAR_SPORTS = [
  'Yoga & Pranayama',
  'Badminton',
  'Gym & Strength Training',
  'Swimming',
  'Running & Marathons',
  'Cycling',
  'Cricket',
  'Table Tennis',
  'Lawn Tennis'
];

export const SUGGESTED_HOBBIES_TAGS = [
  { label: '✈️ Traveling', field: 'hobbies', val: 'Traveling' },
  { label: '📚 Reading', field: 'hobbies', val: 'Reading' },
  { label: '🍳 Cooking', field: 'hobbies', val: 'Cooking' },
  { label: '🌿 Gardening', field: 'hobbies', val: 'Gardening' },
  { label: '📷 Photography', field: 'hobbies', val: 'Photography' },
  { label: '🎨 Painting', field: 'hobbies', val: 'Painting' },
  { label: '🎵 Music', field: 'interests', val: 'Classical Music' },
  { label: '⛰️ Trekking', field: 'interests', val: 'Trekking' },
  { label: '🧘 Yoga', field: 'sportsFitness', val: 'Yoga' },
  { label: '🏸 Badminton', field: 'sportsFitness', val: 'Badminton' },
  { label: '🎬 Movies', field: 'interests', val: 'Movies' },
  { label: '🏊 Swimming', field: 'sportsFitness', val: 'Swimming' },
  { label: '💻 Tech', field: 'interests', val: 'Technology' },
  { label: '💃 Classical Dance', field: 'hobbies', val: 'Classical Dance' }
];

export const INCOME_RANGES = [
  '₹ 5 - 10 LPA',
  '₹ 10 - 15 LPA',
  '₹ 15 - 25 LPA',
  '₹ 25 - 40 LPA',
  '₹ 40 - 70 LPA',
  '₹ 70 LPA - 1 Crore',
  '₹ 1 Crore+'
];

export const HEIGHTS = [
  "4'3\" (130 cm)",
  "4'4\" (132 cm)",
  "4'5\" (135 cm)",
  "4'6\" (137 cm)",
  "4'7\" (140 cm)",
  "4'8\" (142 cm)",
  "4'9\" (145 cm)",
  "4'10\" (147 cm)",
  "4'11\" (150 cm)",
  "5'0\" (152 cm)",
  "5'1\" (155 cm)",
  "5'2\" (157 cm)",
  "5'3\" (160 cm)",
  "5'4\" (163 cm)",
  "5'5\" (165 cm)",
  "5'6\" (168 cm)",
  "5'7\" (170 cm)",
  "5'8\" (173 cm)",
  "5'9\" (175 cm)",
  "5'10\" (178 cm)",
  "5'11\" (180 cm)",
  "6'0\" (183 cm)",
  "6'1\" (185 cm)",
  "6'2\" (188 cm)",
  "6'3\" (190 cm)",
  "6'4\" (193 cm)",
  "6'5\" (195 cm)",
  "6'6\" (198 cm)",
  "6'7\" (201 cm)",
  "6'8\" (203 cm)",
  "6'9\" (206 cm)",
  "6'10\" (208 cm)",
  "6'11\" (210 cm)",
  "7'0\" (213 cm)"
];

export const RASHIS = [
  'Mesha (Aries)',
  'Vrishabha (Taurus)',
  'Mithuna (Gemini)',
  'Karka (Cancer)',
  'Simha (Leo)',
  'Kanya (Virgo)',
  'Tula (Libra)',
  'Vrischika (Scorpio)',
  'Dhanu (Sagittarius)',
  'Makara (Capricorn)',
  'Kumbha (Aquarius)',
  'Meena (Pisces)'
];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Arudra', 
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 
  'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati', 'Don’t Know'
];

export const SAMPLE_SINGLE_PHOTOS = [
  { label: 'Doctor / Professional', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800' },
  { label: 'Traditional Portrait', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800' },
  { label: 'Casual Friendly', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800' },
  { label: 'Outdoor Portrait', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800' },
  { label: 'Festive Saree', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800' },
  { label: 'Executive Male', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800' },
  { label: 'Traditional Kurta', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' }
];

export const SAMPLE_FAMILY_PHOTOS = [
  { label: 'Family Portrait with Parents', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800' },
  { label: 'Family Celebration & Gathering', url: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800' },
  { label: 'Family with Elders', url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=800' },
  { label: 'Warm Family Moment', url: 'https://images.unsplash.com/photo-1542037104857-ffbc0b91c487?auto=format&fit=crop&q=80&w=800' }
];

export const SAMPLE_PHOTOS = SAMPLE_SINGLE_PHOTOS;

export const SKIN_COLOURS = [
  'Fair',
  'Very Fair',
  'Wheatish',
  'Wheatish Medium',
  'Dusky',
  'Dark'
];

export const BODY_TYPES = [
  'Slim',
  'Athletic',
  'Average',
  'Heavy'
];

export const PREFERRED_BODY_TYPES = [
  'Doesn\'t Matter / Any Body Type',
  'Slim',
  'Athletic / Fit',
  'Average',
  'Heavy / Well-Built'
];

export const FAMILY_FINANCIAL_STATUSES = [
  'Upper Middle Class',
  'Middle Class',
  'Rich / Affluent',
  'Ultra Rich / HNI (High Net Worth)',
  'Lower Middle Class',
  'Modest / Simple',
  'Prefer not to say'
];

export const FAMILY_ANNUAL_INCOMES = [
  '₹ 5 - 10 LPA',
  '₹ 10 - 20 LPA',
  '₹ 20 - 50 LPA',
  '₹ 50 Lakhs - 1 Crore',
  '₹ 1 Crore+',
  'Not Disclosed / Open to discuss'
];

export const FATHER_STATUS_OPTIONS = [
  'Retired',
  'Working',
  'Business / Self-Employed',
  'Homemaker',
  'Deceased',
  'Prefer not to say'
];

export const MOTHER_STATUS_OPTIONS = [
  'Homemaker',
  'Working',
  'Retired',
  'Business / Self-Employed',
  'Deceased',
  'Prefer not to say'
];

export const sanitizeParentStatus = (val, fallback) => {
  if (!val || val === 'Alive') return fallback;
  const cleaned = String(val).replace(/^Alive\s*(&\s*)?/i, '').trim();
  return cleaned || fallback;
};

export default function RegistrationWizard({ 
  onRegistrationComplete, 
  onProceedToVerification,
  setCurrentScreen,
  onBack,
  onNavigateToLogin,
  initialData 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedRegisterId, setGeneratedRegisterId] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [copiedRegisterId, setCopiedRegisterId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State with Comprehensive Indian Matrimonial Details
  const [formData, setFormData] = useState({
    // Step 1: Basic, Physical & Lifestyle
    profileFor: initialData?.profileFor || 'Self',
    fullName: initialData?.name || 'Dr. Ananya Kulkarni',
    email: initialData?.email || '',
    password: '',
    confirmPassword: '',
    registerId: initialData?.registerId || '',
    mobile: initialData?.mobile || '9876543210',
    gender: initialData?.gender || 'Female',
    dob: initialData?.dob || '1998-06-15',
    height: initialData?.height || "5'6\" (168 cm)",
    religion: initialData?.religion || 'Hindu',
    motherTongue: initialData?.motherTongue || 'Marathi',
    caste: initialData?.caste || 'Brahmin - Deshastha',
    gothra: initialData?.gothra || 'Kashyap',
    maritalStatus: initialData?.maritalStatus || 'Never Married',
    skinColour: initialData?.skinColour || initialData?.complexion || 'Fair',
    bodyType: initialData?.bodyType || 'Average',
    physicalStatus: initialData?.physicalStatus || 'Normal',
    diet: initialData?.diet || 'Pure Vegetarian',
    smoking: initialData?.smoking || 'No',
    drinking: initialData?.drinking || 'Never',

    // Hobbies & Interests
    hobbies: initialData?.hobbies || 'Classical Dance (Bharatnatyam), Reading, Gardening',
    interests: initialData?.interests || 'Classical Music, Pediatric Health Camps, Organic Cooking',
    sportsFitness: initialData?.sportsFitness || 'Yoga, Badminton & Weekend Walks',

    // Step 2: Education & Career
    highestQualification: initialData?.highestQualification || 'MBBS',
    educationCategory: initialData?.educationCategory || 'Medical / Healthcare',
    institute: initialData?.institute || 'KEM Hospital & Seth GS Medical College, Mumbai',

    // 12th Standard / HSC / Intermediate Details
    twelfthSchool: initialData?.twelfthSchool || 'Fergusson Junior College, Pune',
    twelfthBoard: initialData?.twelfthBoard || 'State Board (HSC / Intermediate / PUC)',
    twelfthStream: initialData?.twelfthStream || 'Science (PCB - Pre-Medical)',
    twelfthYear: initialData?.twelfthYear || '2016',
    twelfthPercentage: initialData?.twelfthPercentage || '',

    // 10th Standard / SSC / Matriculation Details
    tenthSchool: initialData?.tenthSchool || 'St. Joseph Convent High School, Nashik',
    tenthBoard: initialData?.tenthBoard || 'State Board (SSC / 10th)',
    tenthYear: initialData?.tenthYear || '2014',
    tenthPercentage: initialData?.tenthPercentage || '',

    employedIn: initialData?.employedIn || 'Private Sector',
    designation: initialData?.designation || 'Senior Pediatric Specialist',
    company: initialData?.company || 'Apollo Children’s Hospital & Private Clinic',
    jobLocation: initialData?.jobLocation || initialData?.jobPlace || initialData?.workLocation || 'Mumbai / Nashik',
    jobPlace: initialData?.jobLocation || initialData?.jobPlace || initialData?.workLocation || 'Mumbai / Nashik',
    workLocationType: initialData?.workLocationType || 'On-site / Hospital',
    annualIncome: initialData?.annualIncome || '₹ 25 - 40 LPA',

    // Step 3: Location, Family & Vedic Astrology
    state: initialData?.state || 'Maharashtra',
    district: initialData?.district || 'Nashik',
    city: initialData?.city || 'Nashik',
    address: initialData?.address || 'Flat 402, Royal Palms, Near Mahatma Nagar',
    pincode: initialData?.pincode || '422007',
    nativePlace: initialData?.nativePlace || 'Pune / Nashik, Maharashtra',
    familyType: initialData?.familyDetails?.type || 'Nuclear Family',
    familyValues: initialData?.familyDetails?.values || 'Traditional yet Progressive',
    familyFinancialStatus: initialData?.familyFinancialStatus || initialData?.familyDetails?.financialStatus || initialData?.familyStatus || 'Upper Middle Class',
    familyStatus: initialData?.familyFinancialStatus || initialData?.familyDetails?.financialStatus || initialData?.familyStatus || 'Upper Middle Class',
    familyIncome: initialData?.familyIncome || initialData?.familyDetails?.familyIncome || '₹ 20 - 50 LPA',
    familyAffluence: initialData?.familyAffluence || 'Upper Middle Class',
    // Father
    fatherName: initialData?.fatherName || 'Suresh Kulkarni',
    fatherStatus: sanitizeParentStatus(initialData?.fatherStatus, 'Retired'),
    fatherEducation: initialData?.fatherEducation || 'B.Tech / B.E',
    fatherOccupation: initialData?.familyDetails?.father || 'Retired Civil Engineer (PWD Maharashtra)',
    fatherMobile: initialData?.fatherMobile || initialData?.familyPhone || '9422018273',
    fatherWhatsApp: initialData?.fatherWhatsApp || initialData?.fatherMobile || initialData?.familyPhone || '9422018273',
    // Mother
    motherName: initialData?.motherName || 'Sujata Kulkarni',
    motherStatus: sanitizeParentStatus(initialData?.motherStatus, 'Homemaker'),
    motherEducation: initialData?.motherEducation || 'B.A / M.A',
    motherOccupation: initialData?.familyDetails?.mother || 'High School Principal (Nashik)',
    motherMobile: initialData?.motherMobile || '9422018274',
    motherWhatsApp: initialData?.motherWhatsApp || initialData?.motherMobile || '9422018274',
    familyPhone: initialData?.familyPhone || initialData?.fatherMobile || '9422018273',
    // Siblings — array of sibling objects
    siblings: initialData?.siblings || [
      { name: 'Rahul Kulkarni', relation: 'Elder Brother', maritalStatus: 'Married', education: 'B.Arch (Architecture)', profession: 'Architect (Private Firm, Pune)' }
    ],
    siblingsDetails: initialData?.familyDetails?.siblings || '1 Elder Brother (Married, Architect)',
    kundaliMatch: initialData?.kundaliMatch || 'Yes, Gunas Match Preferred',
    rashi: initialData?.astronomy?.rashi || 'Kanya (Virgo)',
    nakshatra: initialData?.astronomy?.nakshatra || 'Hasta',
    manglik: initialData?.manglik || 'Non-Manglik',

    // Step 4: Partner Preferences, Bio & Verified Photo
    prefAgeMin: initialData?.prefAgeMin || 26,
    prefAgeMax: initialData?.prefAgeMax || 32,
    prefHeight: initialData?.prefHeight || "5'7\" to 6'2\"",
    prefSkinTone: initialData?.prefSkinTone || 'Fair / Wheatish / Any Tone',
    prefBodyType: initialData?.prefBodyType || 'Doesn\'t Matter / Any Body Type',
    prefMaritalStatus: initialData?.prefMaritalStatus || 'Never Married Only',
    prefEducation: initialData?.prefEducation || 'Doctor, Engineer, CA, MBA, Civil Services',
    prefProfession: initialData?.prefProfession || 'Working Professional Preferred',
    prefIncome: initialData?.prefIncome || '₹ 25 LPA+',
    prefWorkLocation: initialData?.prefWorkLocation || 'Same City or Flexible to Relocate',
    prefRegion: initialData?.prefRegion || 'Same District & State Preferred',
    prefMotherTongue: initialData?.prefMotherTongue || 'Open to All Communities',
    prefDiet: initialData?.prefDiet || 'Vegetarian / Eggetarian',
    prefManglik: initialData?.prefManglik || 'Doesn’t Matter',
    prefTraits: initialData?.prefTraits || [
      'Family-Oriented',
      'Mutual Respect',
      'Intellectual Conversations'
    ],
    aboutBio: initialData?.about || initialData?.aboutBio || '',
    singlePhotos: initialData?.singlePhotos?.length
      ? initialData.singlePhotos.slice(0, 5)
      : initialData?.photo
        ? [initialData.photo]
        : [],
    familyPhotos: initialData?.familyPhotos?.length
      ? initialData.familyPhotos.slice(0, 2)
      : [],
    photo: initialData?.photo || '',
    governmentIdVerified: initialData?.governmentIdVerified ?? true
  });

  const [errors, setErrors] = useState({});

  // Dynamic cities and districts for chosen state
  const selectedStateObj = STATES_AND_CITIES.find(s => s.state === formData.state) || STATES_AND_CITIES[0];
  const availableCities = selectedStateObj?.cities || [];
  const availableDistricts = Array.from(new Set(availableCities.map(c => c.district).filter(Boolean))).sort();

  const stateOptions = useMemo(() => {
    return STATES_AND_CITIES.map(st => st.state);
  }, []);

  const qualificationOptions = useMemo(() => {
    return QUALIFICATION_GROUPS.flatMap(grp => 
      grp.options.map(opt => ({
        label: opt,
        value: opt,
        subLabel: grp.category
      }))
    );
  }, []);

  const handleStateChange = (e) => {
    const newState = e?.target?.value !== undefined ? e.target.value : e;
    const stObj = STATES_AND_CITIES.find(s => s.state === newState);
    const cities = stObj?.cities || [];
    const firstCity = cities[0];
    setFormData(prev => ({
      ...prev,
      state: newState,
      district: firstCity?.district || firstCity?.name || '',
      city: firstCity?.name || ''
    }));
  };

  const handleDistrictChange = (e) => {
    const newDistrict = e?.target?.value !== undefined ? e.target.value : e;
    const matchedCity = availableCities.find(c => c.district === newDistrict) || availableCities[0];
    setFormData(prev => ({
      ...prev,
      district: newDistrict,
      city: matchedCity?.name || ''
    }));
  };

  const handleCityChange = (e) => {
    const cityName = e?.target?.value !== undefined ? e.target.value : e;
    const cityObj = availableCities.find(c => c.name === cityName);
    setFormData(prev => ({
      ...prev,
      city: cityName,
      district: cityObj?.district || prev.district
    }));
  };

  // Hobbies & Interests Multi-Tag Management
  const [newHobbyInput, setNewHobbyInput] = useState('');
  const [newInterestInput, setNewInterestInput] = useState('');
  const [newSportInput, setNewSportInput] = useState('');

  const parseTags = (str) => {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleAddTag = (field, tagVal) => {
    const trimmed = (tagVal || '').trim().replace(/^[,]+|[,]+$/g, '');
    if (!trimmed) return;
    setFormData(prev => {
      const items = parseTags(prev[field]);
      if (items.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [field]: [...items, trimmed].join(', ')
      };
    });
  };

  const handleRemoveTag = (field, tagIdx) => {
    setFormData(prev => {
      const items = parseTags(prev[field]);
      const updated = items.filter((_, i) => i !== tagIdx);
      return {
        ...prev,
        [field]: updated.join(', ')
      };
    });
  };

  const handleToggleHobbyTag = (field, tagVal) => {
    setFormData(prev => {
      const items = parseTags(prev[field]);
      const existsIndex = items.findIndex(item => item.toLowerCase() === tagVal.toLowerCase());
      let updatedItems;
      if (existsIndex >= 0) {
        updatedItems = items.filter((_, i) => i !== existsIndex);
      } else {
        updatedItems = [...items, tagVal];
      }
      return {
        ...prev,
        [field]: updatedItems.join(', ')
      };
    });
  };

  // Single Photos (Max 5) Handlers
  const handleAddSinglePhoto = (url) => {
    const existing = (formData.singlePhotos || []).filter(p => p !== url);
    const updated = [url, ...existing].slice(0, 5);
    setFormData(prev => ({
      ...prev,
      singlePhotos: updated,
      photo: url
    }));
  };

  const handleRemoveSinglePhoto = (idx) => {
    const updated = (formData.singlePhotos || []).filter((_, i) => i !== idx);
    setFormData(prev => ({
      ...prev,
      singlePhotos: updated,
      photo: updated[0] || ''
    }));
  };

  const handleSetMainPhoto = (idx) => {
    if (idx === 0) return;
    const selected = formData.singlePhotos[idx];
    const remaining = formData.singlePhotos.filter((_, i) => i !== idx);
    const updated = [selected, ...remaining];
    setFormData(prev => ({
      ...prev,
      singlePhotos: updated,
      photo: selected
    }));
  };

  const handleSingleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const uploadedUrl = event.target.result;
        // Prioritize the user's real uploaded photo as primary photo
        const filtered = (formData.singlePhotos || []).filter(p => !p.includes('images.unsplash.com'));
        const updated = [uploadedUrl, ...filtered].slice(0, 5);
        setFormData(prev => ({
          ...prev,
          singlePhotos: updated,
          photo: uploadedUrl
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Family Photos (Max 2) Handlers
  const handleAddFamilyPhoto = (url) => {
    if (formData.familyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    const updated = [...formData.familyPhotos, url];
    setFormData(prev => ({
      ...prev,
      familyPhotos: updated
    }));
  };

  const handleRemoveFamilyPhoto = (idx) => {
    const updated = formData.familyPhotos.filter((_, i) => i !== idx);
    setFormData(prev => ({
      ...prev,
      familyPhotos: updated
    }));
  };

  const handleFamilyFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formData.familyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleAddFamilyPhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  const sanitizeAllFormData = (data) => {
    return {
      ...data,
      fullName: sanitizeInput(data.fullName, { maxLength: 100 }),
      mobile: sanitizePhone(data.mobile) || data.mobile,
      email: data.email ? sanitizeEmail(data.email) : '',
      password: data.password || '',
      confirmPassword: data.confirmPassword || '',
      registerId: data.registerId || '',
      institute: sanitizeInput(data.institute, { maxLength: 100 }),
      designation: sanitizeInput(data.designation, { maxLength: 100 }),
      company: sanitizeInput(data.company, { maxLength: 100 }),
      nativeAddress: sanitizeInput(data.nativeAddress, { maxLength: 250 }),
      aboutMe: sanitizeInput(data.aboutMe, { allowMultiline: true, maxLength: 1000 }),
      partnerExpectations: sanitizeInput(data.partnerExpectations, { allowMultiline: true, maxLength: 1000 }),
    };
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      const cleanName = sanitizeInput(formData.fullName, { maxLength: 100 });
      if (!cleanName) errs.fullName = 'Full Name is required';
      if (!formData.dob) errs.dob = 'Date of birth is required';
      const cleanMobile = sanitizePhone(formData.mobile);
      if (!cleanMobile) {
        errs.mobile = 'Please enter a valid 10-digit Indian mobile number (starts with 6-9)';
      }
      if (formData.email && !formData.email.includes('@')) {
        errs.email = 'Please enter a valid email address';
      }
      if (!formData.password) {
        errs.password = 'Password is required to secure your account';
      } else if (formData.password.length < 6) {
        errs.password = 'Password must be at least 6 characters long';
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match. Please verify.';
      }
    } else if (step === 2) {
      const cleanInstitute = sanitizeInput(formData.institute, { maxLength: 100 });
      const cleanDesignation = sanitizeInput(formData.designation, { maxLength: 100 });
      if (!cleanInstitute) errs.institute = 'College / University is required';
      if (!cleanDesignation) errs.designation = 'Occupation / Designation is required';
    } else if (step === 3) {
      if (!formData.state) errs.state = 'State is required';
      if (!formData.city) errs.city = 'City is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFinalRegistrationSubmit = async (sanitized) => {
    setIsSubmitting(true);
    try {
      const result = await registerWithRegisterId(sanitized);
      if (result.success) {
        setGeneratedRegisterId(result.registerId);
        setRegisteredUser(result.user);
      } else {
        const fallbackId = 'I4Y' + (Math.floor(Math.random() * 900) + 1001);
        setGeneratedRegisterId(fallbackId);
      }
    } catch (e) {
      console.warn('[RegistrationWizard] Submit warning:', e);
      const fallbackId = 'I4Y' + (Math.floor(Math.random() * 900) + 1001);
      setGeneratedRegisterId(fallbackId);
    } finally {
      setIsSubmitting(false);
      setShowCompleteModal(true);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const sanitized = sanitizeAllFormData(formData);
      setFormData(sanitized);

      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
        const scrollElem = document.getElementById('wizard-scroll-container');
        if (scrollElem) scrollElem.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleFinalRegistrationSubmit(sanitized);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      const scrollElem = document.getElementById('wizard-scroll-container');
      if (scrollElem) scrollElem.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onBack) {
      onBack();
    }
  };

  const steps = [
    { num: 1, label: 'Basic & Habits', short: 'Basic', icon: User },
    { num: 2, label: 'Career & Edu', short: 'Career', icon: GraduationCap },
    { num: 3, label: 'Family & Astro', short: 'Family', icon: MapPin },
    { num: 4, label: 'Partner Preferences', short: 'Partner', icon: HeartHandshake }
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      
      {/* Compact Horizontal Step Navigation Pills */}
      <header className="bg-[#0B192C] text-white border-b border-[#D4AF37]/30 shadow-md shrink-0 z-30">
        <div className="px-2.5 py-2 flex items-center gap-1.5 bg-[#07111F]/90">
          <button
            type="button"
            onClick={prevStep}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={currentStep === 1 ? 'Close' : 'Previous Step'}
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4 text-[#DFB76C]" />
          </button>

          <div className="flex-1 grid grid-cols-4 gap-1.5">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isActive = currentStep === s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (validateStep(currentStep) || s.num < currentStep) {
                    setCurrentStep(s.num);
                  }
                }}
                className={`flex items-center justify-center space-x-1 py-1.5 px-1 rounded-lg text-center transition-all ${
                  isActive 
                    ? 'bg-[#D4AF37] text-[#0B192C] font-bold shadow-sm' 
                    : isCompleted
                    ? 'bg-white/10 text-emerald-300 font-semibold'
                    : 'text-slate-400 bg-black/20'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />
                ) : (
                  <Icon className={`w-3 h-3 ${isActive ? 'text-[#0B192C]' : 'text-slate-400'}`} />
                )}
                <span className="text-[10px] truncate">{s.short}</span>
              </button>
            );
          })}
        </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Form Body */}
      <div 
        id="wizard-scroll-container"
        className="flex-1 overflow-y-auto px-3 py-3.5 sm:px-4 space-y-4 pb-24"
      >
        
        {/* STEP 1: Basic, Physical & Lifestyle Habits */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            
            {/* Intro Banner Card */}
            <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-3.5 text-white shadow-sm border border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider">Step 1</span>
                </div>
                <h2 className="font-serif font-bold text-base text-white mt-0.5">
                  Basic Details & Lifestyle
                </h2>
                <p className="text-[11px] text-slate-300">
                  Fill in personal, physical, and cultural heritage info.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-serif font-bold text-[#DFB76C]">25%</span>
                <p className="text-[9px] text-slate-300">Completed</p>
              </div>
            </div>

            {/* Primary Details Card */}
            <div id="primary-identity-card" className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8C6D1F]" /> Identity & Personal Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <SearchableSelect 
                    label="Create Profile For"
                    value={formData.profileFor}
                    onChange={(val) => setFormData(prev => ({ ...prev, profileFor: val }))}
                    options={['Self', 'Son', 'Daughter', 'Brother', 'Sister', 'Relative / Friend']}
                    placeholder="Select Profile For"
                    searchPlaceholder="Search profile for..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input 
                    type="text"
                    placeholder="e.g. Dr. Ananya Kulkarni"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none ${
                      errors.fullName ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus:bg-white'
                    }`}
                  />
                  {errors.fullName && <p className="text-rose-500 text-[10px] mt-0.5">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <div className={`flex rounded-xl border overflow-hidden transition-all ${
                    errors.mobile ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D4AF37]'
                  }`}>
                    <span className="px-2.5 py-2 bg-slate-100 text-slate-600 font-semibold text-xs border-r border-slate-200 flex items-center gap-1">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input 
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                      className="flex-1 px-3 py-2 text-xs focus:outline-none bg-transparent font-medium"
                    />
                  </div>
                  {errors.mobile && (
                    <p className="text-rose-500 text-[10px] mt-0.5">{errors.mobile}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Female', 'Male'].map(g => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          formData.gender === g 
                            ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-sm' 
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {g === 'Female' ? 'Bride (Female)' : 'Groom (Male)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
                  <input 
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Height *"
                    value={formData.height}
                    onChange={(val) => setFormData(prev => ({ ...prev, height: val }))}
                    options={HEIGHTS}
                    placeholder="Select Height"
                    searchPlaceholder="Search Height (e.g. 5'5 or 165)..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Marital Status"
                    value={formData.maritalStatus}
                    onChange={(val) => setFormData(prev => ({ ...prev, maritalStatus: val }))}
                    options={['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']}
                    placeholder="Select Marital Status"
                    searchPlaceholder="Search Marital Status..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Skin Tone / Complexion"
                    value={formData.skinColour}
                    onChange={(val) => setFormData(prev => ({ ...prev, skinColour: val }))}
                    options={SKIN_COLOURS}
                    placeholder="Select Skin Tone"
                    searchPlaceholder="Search Skin Tone..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Body Type"
                    value={formData.bodyType}
                    onChange={(val) => setFormData(prev => ({ ...prev, bodyType: val }))}
                    options={BODY_TYPES}
                    placeholder="Select Body Type"
                    searchPlaceholder="Search Body Type (e.g. Slim, Athletic)..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Physical Status"
                    value={formData.physicalStatus}
                    onChange={(val) => setFormData(prev => ({ ...prev, physicalStatus: val }))}
                    options={['Normal', 'Physically Challenged']}
                    placeholder="Select Physical Status"
                    searchPlaceholder="Search Physical Status..."
                  />
                </div>
              </div>
            </div>

            {/* Account Credentials & Password Card */}
            <div id="account-credentials-card" className="bg-[#FFFDF7] rounded-2xl p-4 border border-[#D4AF37]/50 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#8C6D1F]" /> Account Credentials & Login Password
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 text-[#8C6D1F]">
                  Required for Login
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#DFB76C]/10 border border-[#D4AF37]/30 text-[11px] text-slate-700 flex items-start space-x-2">
                <KeyRound className="w-4 h-4 text-[#8C6D1F] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Upon registration, your custom <strong>Register ID (e.g. I4Y1001)</strong> will be automatically generated and assigned to you. You will use this Register ID and password to log in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Email Address */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(For Register ID confirmation & match alert emails)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>
                    <input 
                      type="email"
                      placeholder="e.g. ananya.kulkarni@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none ${
                        errors.email ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-rose-500 text-[10px] mt-0.5">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password * <span className="text-slate-400 font-normal">(Min 6 characters)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create account password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-9 pr-9 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none ${
                        errors.password ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-rose-500 text-[10px] mt-0.5">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`w-full pl-9 pr-9 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none ${
                        errors.confirmPassword ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-rose-500 text-[10px] mt-0.5">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Cultural & Community Details Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#8C6D1F]" /> Religion & Community Heritage
                </h3>
                <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {formData.religion}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                {/* Row 1: Religion + Mother Tongue */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Religion *"
                      value={formData.religion}
                      onChange={(newRel) => {
                        const communities = RELIGION_COMMUNITIES[newRel] || [];
                        const defaultCaste = DEFAULT_COMMUNITY_FOR_RELIGION[newRel] || communities[0] || 'Other';
                        const isHinduOrJain = newRel === 'Hindu' || newRel === 'Jain';
                        setFormData(prev => ({ 
                          ...prev, 
                          religion: newRel,
                          caste: defaultCaste,
                          customCaste: '',
                          gothra: isHinduOrJain ? (prev.gothra && prev.gothra !== 'Not Applicable' ? prev.gothra : 'Kashyap') : 'Not Applicable'
                        }));
                      }}
                      options={RELIGIONS}
                      placeholder="Select Religion"
                      searchPlaceholder="Search Religion..."
                      buttonClassName="h-10"
                    />
                  </div>

                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Mother Tongue *"
                      value={formData.motherTongue}
                      onChange={(val) => setFormData(prev => ({ ...prev, motherTongue: val }))}
                      options={MOTHER_TONGUES}
                      placeholder="Select Mother Tongue"
                      searchPlaceholder="Search Mother Tongue..."
                      buttonClassName="h-10"
                    />
                  </div>
                </div>

                {/* Row 2: Community / Caste + Gothra / Lineage — perfectly aligned */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Community / Caste *"
                      value={
                        (RELIGION_COMMUNITIES[formData.religion] || []).includes(formData.caste) 
                          ? formData.caste 
                          : 'Other'
                      }
                      onChange={(val) => {
                        if (val === 'Other') {
                          setFormData(prev => ({ ...prev, caste: 'Other', customCaste: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, caste: val, customCaste: '' }));
                        }
                      }}
                      options={[
                        ...(RELIGION_COMMUNITIES[formData.religion] || []),
                        { value: 'Other', label: '✍️ Other (Type Custom)' }
                      ]}
                      placeholder="Select Caste / Community"
                      searchPlaceholder="Search Caste or Community..."
                      buttonClassName="h-10"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight truncate">
                      {LINEAGE_LABEL_FOR_RELIGION[formData.religion] || 'Gothra / Lineage'}
                    </label>
                    {formData.religion === 'Hindu' || formData.religion === 'Jain' ? (
                      <div>
                        <input 
                          type="text"
                          list="gothra-suggestions"
                          placeholder={LINEAGE_PLACEHOLDER_FOR_RELIGION[formData.religion] || "e.g. Kashyap"}
                          value={formData.gothra}
                          onChange={(e) => setFormData({ ...formData, gothra: e.target.value })}
                          className="w-full h-10 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                        />
                        <datalist id="gothra-suggestions">
                          {POPULAR_GOTHRAS.map(g => (
                            <option key={g} value={g} />
                          ))}
                        </datalist>
                      </div>
                    ) : (
                      <input 
                        type="text"
                        placeholder={LINEAGE_PLACEHOLDER_FOR_RELIGION[formData.religion] || "Not Applicable or Parish"}
                        value={formData.gothra}
                        onChange={(e) => setFormData({ ...formData, gothra: e.target.value })}
                        className="w-full h-10 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Custom Sub-Caste Input if "Other" is chosen */}
                {(formData.caste === 'Other' || !(RELIGION_COMMUNITIES[formData.religion] || []).includes(formData.caste)) && (
                  <div className="animate-in fade-in duration-150">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Specify {formData.religion} Community / Sub-Caste:
                    </label>
                    <input 
                      type="text"
                      placeholder={`Type specific ${formData.religion} community / sub-caste`}
                      value={formData.customCaste || (formData.caste === 'Other' ? '' : formData.caste)}
                      onChange={(e) => {
                        const customVal = e.target.value;
                        setFormData({ 
                          ...formData, 
                          caste: customVal ? customVal : 'Other',
                          customCaste: customVal 
                        });
                      }}
                      className="w-full h-10 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/60 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs text-slate-900 font-medium placeholder-slate-400"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle & Health Habits Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Lifestyle & Daily Habits
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <SearchableSelect 
                    label="Diet Habit"
                    value={formData.diet}
                    onChange={(val) => setFormData(prev => ({ ...prev, diet: val }))}
                    options={['Pure Vegetarian', 'Strict Jain (No Root Veg)', 'Eggetarian', 'Non-Vegetarian']}
                    placeholder="Select Diet"
                    searchPlaceholder="Search Diet..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Smoking"
                    value={formData.smoking}
                    onChange={(val) => setFormData(prev => ({ ...prev, smoking: val }))}
                    options={['No', 'Occasionally', 'Yes']}
                    placeholder="Smoking habit"
                    searchPlaceholder="Search Smoking habit..."
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Drinking"
                    value={formData.drinking}
                    onChange={(val) => setFormData(prev => ({ ...prev, drinking: val }))}
                    options={['Never', 'Socially', 'Regularly']}
                    placeholder="Drinking habit"
                    searchPlaceholder="Search Drinking habit..."
                  />
                </div>
              </div>
            </div>

            {/* Hobbies & Interests Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" /> Hobbies &amp; Interests
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Passions &amp; Free Time
                </span>
              </div>

              {/* Field 1: Hobbies */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    Hobbies
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Creative arts, reading, travel &amp; crafts
                  </span>
                </div>

                {/* Multi-Tag Container */}
                <div className="min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:bg-white transition-all shadow-2xs">
                  {parseTags(formData.hobbies).map((hobby, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B192C] text-[#DFB76C] border border-[#DFB76C]/40 shadow-2xs animate-in fade-in"
                    >
                      <span>{hobby}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('hobbies', idx)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={`Remove ${hobby}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Inline Type & Add */}
                  <div className="flex-1 min-w-[130px] flex items-center gap-1">
                    <input 
                      type="text"
                      placeholder={parseTags(formData.hobbies).length === 0 ? "Type custom hobby & press Enter..." : "+ Add custom hobby..."}
                      value={newHobbyInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes(',')) {
                          val.split(',').forEach(p => handleAddTag('hobbies', p));
                          setNewHobbyInput('');
                        } else {
                          setNewHobbyInput(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('hobbies', newHobbyInput);
                          setNewHobbyInput('');
                        }
                      }}
                      className="w-full h-7 px-1.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    {newHobbyInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTag('hobbies', newHobbyInput);
                          setNewHobbyInput('');
                        }}
                        className="px-2 py-0.5 bg-[#D4AF37] text-[#0B192C] font-bold text-[10px] rounded-md shrink-0 cursor-pointer shadow-2xs"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Popular Hobbies Quick Picks */}
                <div className="pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block mb-1">
                    Popular Hobbies (Tap to add/remove):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_HOBBIES.slice(0, 8).map(h => {
                      const isSelected = parseTags(formData.hobbies).some(t => t.toLowerCase() === h.toLowerCase());
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleToggleHobbyTag('hobbies', h)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0B192C] text-[#DFB76C] border-[#DFB76C]/60 shadow-2xs font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          {isSelected ? `✓ ${h}` : `+ ${h}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Field 2: Interests & Passions */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    Interests &amp; Passions
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Music, tech, cinema &amp; innovation
                  </span>
                </div>

                {/* Multi-Tag Container */}
                <div className="min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:bg-white transition-all shadow-2xs">
                  {parseTags(formData.interests).map((interest, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B192C] text-[#DFB76C] border border-[#DFB76C]/40 shadow-2xs animate-in fade-in"
                    >
                      <span>{interest}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('interests', idx)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={`Remove ${interest}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Inline Type & Add */}
                  <div className="flex-1 min-w-[130px] flex items-center gap-1">
                    <input 
                      type="text"
                      placeholder={parseTags(formData.interests).length === 0 ? "Type interest & press Enter..." : "+ Add custom interest..."}
                      value={newInterestInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes(',')) {
                          val.split(',').forEach(p => handleAddTag('interests', p));
                          setNewInterestInput('');
                        } else {
                          setNewInterestInput(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('interests', newInterestInput);
                          setNewInterestInput('');
                        }
                      }}
                      className="w-full h-7 px-1.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    {newInterestInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTag('interests', newInterestInput);
                          setNewInterestInput('');
                        }}
                        className="px-2 py-0.5 bg-[#D4AF37] text-[#0B192C] font-bold text-[10px] rounded-md shrink-0 cursor-pointer shadow-2xs"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Popular Interests Quick Picks */}
                <div className="pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block mb-1">
                    Popular Interests (Tap to add/remove):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_INTERESTS.slice(0, 8).map(item => {
                      const isSelected = parseTags(formData.interests).some(t => t.toLowerCase() === item.toLowerCase());
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleHobbyTag('interests', item)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0B192C] text-[#DFB76C] border-[#DFB76C]/60 shadow-2xs font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          {isSelected ? `✓ ${item}` : `+ ${item}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Field 3: Sports & Fitness */}
              <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs">
                    Sports &amp; Fitness
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Fitness, yoga, running &amp; active sports
                  </span>
                </div>

                {/* Multi-Tag Container */}
                <div className="min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:bg-white transition-all shadow-2xs">
                  {parseTags(formData.sportsFitness).map((sport, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B192C] text-[#DFB76C] border border-[#DFB76C]/40 shadow-2xs animate-in fade-in"
                    >
                      <span>{sport}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('sportsFitness', idx)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title={`Remove ${sport}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Inline Type & Add */}
                  <div className="flex-1 min-w-[130px] flex items-center gap-1">
                    <input 
                      type="text"
                      placeholder={parseTags(formData.sportsFitness).length === 0 ? "Type sport & press Enter..." : "+ Add custom sport..."}
                      value={newSportInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes(',')) {
                          val.split(',').forEach(p => handleAddTag('sportsFitness', p));
                          setNewSportInput('');
                        } else {
                          setNewSportInput(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag('sportsFitness', newSportInput);
                          setNewSportInput('');
                        }
                      }}
                      className="w-full h-7 px-1.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    {newSportInput.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTag('sportsFitness', newSportInput);
                          setNewSportInput('');
                        }}
                        className="px-2 py-0.5 bg-[#D4AF37] text-[#0B192C] font-bold text-[10px] rounded-md shrink-0 cursor-pointer shadow-2xs"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Popular Sports Quick Picks */}
                <div className="pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium block mb-1">
                    Popular Sports &amp; Fitness (Tap to add/remove):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_SPORTS.slice(0, 8).map(s => {
                      const isSelected = parseTags(formData.sportsFitness).some(t => t.toLowerCase() === s.toLowerCase());
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleToggleHobbyTag('sportsFitness', s)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0B192C] text-[#DFB76C] border-[#DFB76C]/60 shadow-2xs font-semibold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          {isSelected ? `✓ ${s}` : `+ ${s}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: Education & Career Details */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            
            <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-3.5 text-white shadow-sm border border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider">Step 2</span>
                </div>
                <h2 className="font-serif font-bold text-base text-white mt-0.5">
                  Education & Profession
                </h2>
                <p className="text-[11px] text-slate-300">
                  Highlight degrees, university, employer and income.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-serif font-bold text-[#DFB76C]">50%</span>
                <p className="text-[9px] text-slate-300">Completed</p>
              </div>
            </div>

            {/* Academic Credentials Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#8C6D1F]" /> Education &amp; Degrees
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Academic Profile
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Field 1: Highest Qualification — Full Width */}
                <div>
                  <SearchableSelect 
                    label="Highest Qualification *"
                    value={formData.highestQualification}
                    onChange={(val) => setFormData(prev => ({ ...prev, highestQualification: val }))}
                    options={qualificationOptions}
                    placeholder="Select Highest Qualification"
                    searchPlaceholder="Search Qualification or Degree..."
                    buttonClassName="h-10"
                  />
                </div>

                {/* Field 2: Education Stream — Full Width */}
                <div>
                  <SearchableSelect 
                    label="Education Stream / Specialization"
                    value={formData.educationCategory}
                    onChange={(val) => setFormData(prev => ({ ...prev, educationCategory: val }))}
                    options={EDUCATION_CATEGORIES}
                    placeholder="Select Stream"
                    searchPlaceholder="Search Stream..."
                    buttonClassName="h-10"
                  />
                </div>

                {/* Field 3: College / University / Institute — Full Width */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    College / University / Institute *
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. KEM Hospital & Seth GS Medical College / IIT Bombay / IIM Ahmedabad"
                    value={formData.institute}
                    onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                    className={`w-full h-10 px-3 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none shadow-xs transition-colors ${
                      errors.institute ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus:bg-white'
                    }`}
                  />
                  {errors.institute && <p className="text-rose-500 text-[10px] mt-0.5">{errors.institute}</p>}
                </div>

                {/* 12th Standard / HSC / +2 Section */}
                <div className="pt-3 pb-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> 12th Standard / HSC / +2
                    </span>
                    <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Junior College
                    </span>
                  </div>
                </div>

                {/* 12th School / College */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    12th College / Higher Secondary School Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Fergusson Junior College, Pune / DPS / St. Xavier's"
                    value={formData.twelfthSchool}
                    onChange={(e) => setFormData({ ...formData, twelfthSchool: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none shadow-xs"
                  />
                </div>

                {/* 12th Board & Passing Year */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <SearchableSelect 
                      label="12th Board"
                      value={formData.twelfthBoard}
                      onChange={(val) => setFormData(prev => ({ ...prev, twelfthBoard: val }))}
                      options={EDUCATION_BOARDS_12TH}
                      placeholder="Select Board"
                      searchPlaceholder="Search Board..."
                      buttonClassName="h-10"
                    />
                  </div>

                  <div>
                    <SearchableSelect 
                      label="12th Passing Year"
                      value={formData.twelfthYear}
                      onChange={(val) => setFormData(prev => ({ ...prev, twelfthYear: val }))}
                      options={PASSING_YEARS}
                      placeholder="Select Year"
                      searchPlaceholder="Search Year..."
                      buttonClassName="h-10"
                    />
                  </div>
                </div>

                {/* 12th Stream / Major */}
                <div>
                  <SearchableSelect 
                    label="12th Stream / Major"
                    value={formData.twelfthStream}
                    onChange={(val) => setFormData(prev => ({ ...prev, twelfthStream: val }))}
                    options={STREAMS_12TH}
                    placeholder="Select Stream"
                    searchPlaceholder="Search Stream..."
                    buttonClassName="h-10"
                  />
                </div>

                {/* 10th Standard / SSC / Matric Section */}
                <div className="pt-3 pb-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> 10th Standard / SSC / Matric
                    </span>
                    <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      High School
                    </span>
                  </div>
                </div>

                {/* 10th School Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    10th High School Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. St. Joseph's Convent High School / Kendriya Vidyalaya"
                    value={formData.tenthSchool}
                    onChange={(e) => setFormData({ ...formData, tenthSchool: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none shadow-xs"
                  />
                </div>

                {/* 10th Board & Passing Year */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <SearchableSelect 
                      label="10th Board"
                      value={formData.tenthBoard}
                      onChange={(val) => setFormData(prev => ({ ...prev, tenthBoard: val }))}
                      options={EDUCATION_BOARDS_10TH}
                      placeholder="Board"
                      searchPlaceholder="Search Board..."
                      buttonClassName="h-10"
                    />
                  </div>

                  <div>
                    <SearchableSelect 
                      label="Passing Year"
                      value={formData.tenthYear}
                      onChange={(val) => setFormData(prev => ({ ...prev, tenthYear: val }))}
                      options={PASSING_YEARS}
                      placeholder="Year"
                      searchPlaceholder="Search Year..."
                      buttonClassName="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Employment & Earnings Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#1E3A8A]" /> Professional Background
              </h3>

              <div className="grid grid-cols-1 gap-3 text-xs">
                {/* Row 1: Sector + Designation — fixed-height labels so inputs align */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Employed Sector"
                      value={formData.employedIn}
                      onChange={(val) => setFormData(prev => ({ ...prev, employedIn: val }))}
                      options={[
                        'Private Sector',
                        'Government / PSU',
                        'Civil Services (IAS/IPS/IFS)',
                        'Defence / Armed Forces',
                        'Doctor / Healthcare',
                        'Business / Entrepreneur',
                        'Self Employed'
                      ]}
                      placeholder="Select Sector"
                      searchPlaceholder="Search Sector..."
                      buttonClassName="h-10"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Designation / Role *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Pediatric Specialist"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className={`w-full h-10 px-3 rounded-xl border text-xs focus:ring-2 focus:ring-[#D4AF37] focus:outline-none ${
                        errors.designation ? 'border-rose-400 bg-rose-50' : 'border-slate-300 bg-slate-50 focus:bg-white'
                      }`}
                    />
                    {errors.designation && <p className="text-rose-500 text-[10px] mt-0.5">{errors.designation}</p>}
                  </div>
                </div>

                {/* Row 2: Company + Job Place — fixed-height labels so inputs align */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Company / Employer</label>
                    <input 
                      type="text"
                      placeholder="Apollo, Google, Infosys…"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Job Place / Location</label>
                    <input 
                      type="text"
                      placeholder="e.g. Bangalore, Mumbai, Dubai…"
                      value={formData.jobLocation}
                      onChange={(e) => setFormData({ ...formData, jobLocation: e.target.value, jobPlace: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Row 3: Work Mode + Annual Income — fixed-height labels so inputs align */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Work Mode"
                      value={formData.workLocationType}
                      onChange={(val) => setFormData(prev => ({ ...prev, workLocationType: val }))}
                      options={['On-site / Office', 'Hybrid', 'Remote / WFH']}
                      placeholder="Select Work Mode"
                      searchPlaceholder="Search Work Mode..."
                      buttonClassName="h-10"
                    />
                  </div>
                  <div className="flex flex-col">
                    <SearchableSelect 
                      label="Annual Income Range"
                      value={formData.annualIncome}
                      onChange={(val) => setFormData(prev => ({ ...prev, annualIncome: val }))}
                      options={INCOME_RANGES}
                      placeholder="Select Income Range"
                      searchPlaceholder="Search Income..."
                      buttonClassName="h-10 text-emerald-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                    Income details are verified and only displayed to mutual matches.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: Location Across India, Family & Kundali Milan */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            
            <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-3.5 text-white shadow-sm border border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider">Step 3</span>
                </div>
                <h2 className="font-serif font-bold text-base text-white mt-0.5">
                  Location, Family & Astrology
                </h2>
                <p className="text-[11px] text-slate-300">
                  Pan-India district, parents background, & horoscope.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-serif font-bold text-[#DFB76C]">75%</span>
                <p className="text-[9px] text-slate-300">Completed</p>
              </div>
            </div>

            {/* Pan-India Location & Address Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#8C6D1F]" /> Pan-India Location & Address
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-[#8C6D1F] border border-amber-200">
                  {formData.district}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* State / UT */}
                <div>
                  <SearchableSelect 
                    label="State / UT *"
                    value={formData.state}
                    onChange={handleStateChange}
                    options={stateOptions}
                    placeholder="Select State / UT"
                    searchPlaceholder="Search State..."
                  />
                </div>

                {/* District - Aligned side by side with State */}
                <div>
                  <SearchableSelect 
                    label="District *"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    options={availableDistricts}
                    placeholder="Select District"
                    searchPlaceholder="Search District..."
                  />
                </div>

                {/* City / Town */}
                <div>
                  <SearchableSelect 
                    label="City / Town *"
                    badge="Town / City"
                    value={formData.city}
                    onChange={handleCityChange}
                    options={availableCities.map(c => c.name)}
                    placeholder="Select City / Town"
                    searchPlaceholder="Search City / Town..."
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 h-5 flex items-center">
                    Pincode / Postal Code
                  </label>
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 422007"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs font-medium"
                  />
                </div>

                {/* Address Box */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Residential Address
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="House / Flat No., Society / Building Name, Street / Road, Area, Landmark"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Residential address is kept strictly confidential and only visible to verified mutual matches.
                  </p>
                </div>

                {/* Ancestral / Native Roots */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ancestral / Native Roots (Hometown)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Pune / Nashik, Maharashtra / Varanasi, UP / Thanjavur, TN"
                    value={formData.nativePlace}
                    onChange={(e) => setFormData({ ...formData, nativePlace: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Family Background Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1E3A8A]" /> Family Heritage &amp; Values
              </h3>

              {/* Row 1: Family Structure + Family Values */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col">
                  <SearchableSelect 
                    label="Family Structure"
                    value={formData.familyType}
                    onChange={(val) => setFormData(prev => ({ ...prev, familyType: val }))}
                    options={['Nuclear Family', 'Joint Family', 'Extended Family', 'Single Parent Family']}
                    placeholder="Select Structure"
                    searchPlaceholder="Search Structure..."
                    buttonClassName="h-10"
                  />
                </div>
                <div className="flex flex-col">
                  <SearchableSelect 
                    label="Family Values"
                    value={formData.familyValues}
                    onChange={(val) => setFormData(prev => ({ ...prev, familyValues: val }))}
                    options={['Traditional yet Progressive', 'Traditional', 'Moderate', 'Liberal / Modern', 'Spiritual / Religious']}
                    placeholder="Select Values"
                    searchPlaceholder="Search Values..."
                    buttonClassName="h-10"
                  />
                </div>
              </div>

              {/* Row 2: Family Financial Status + Family Annual Income */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col">
                  <SearchableSelect 
                    label="Family Financial Status"
                    value={formData.familyFinancialStatus}
                    onChange={(val) => setFormData(prev => ({ 
                      ...prev, 
                      familyFinancialStatus: val,
                      familyStatus: val 
                    }))}
                    options={FAMILY_FINANCIAL_STATUSES}
                    placeholder="Financial Status"
                    searchPlaceholder="Search Status..."
                    buttonClassName="h-10 font-semibold text-slate-800"
                  />
                </div>
                <div className="flex flex-col">
                  <SearchableSelect 
                    label="Family Annual Income"
                    value={formData.familyIncome}
                    onChange={(val) => setFormData(prev => ({ ...prev, familyIncome: val }))}
                    options={FAMILY_ANNUAL_INCOMES}
                    placeholder="Annual Income"
                    searchPlaceholder="Search Income..."
                    buttonClassName="h-10 font-semibold text-emerald-800"
                  />
                </div>
              </div>

              {/* ── Father's Details ── */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2.5">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                  <span>👨</span> Father's Details
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Father's Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Suresh Kulkarni"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <SearchableSelect 
                      label="Father's Status"
                      value={sanitizeParentStatus(formData.fatherStatus, 'Retired')}
                      onChange={(val) => setFormData(prev => ({ ...prev, fatherStatus: val }))}
                      options={FATHER_STATUS_OPTIONS}
                      placeholder="Status"
                      searchPlaceholder="Search Status..."
                      buttonClassName="h-9 bg-white"
                    />
                  </div>
                  <div>
                    <SearchableSelect 
                      label="Father's Education"
                      value={formData.fatherEducation}
                      onChange={(val) => setFormData(prev => ({ ...prev, fatherEducation: val }))}
                      options={qualificationOptions}
                      placeholder="Select Education"
                      searchPlaceholder="Search Education..."
                      buttonClassName="h-9 bg-white"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Father's Profession</label>
                    <input
                      type="text"
                      placeholder="e.g. Retired Civil Engineer (PWD)"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Father's Mobile Number</label>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder="e.g. 94220 18273"
                      value={formData.fatherMobile}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        fatherMobile: e.target.value,
                        familyPhone: e.target.value 
                      })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Father's WhatsApp / Alt</label>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder="e.g. 94220 18273"
                      value={formData.fatherWhatsApp}
                      onChange={(e) => setFormData({ ...formData, fatherWhatsApp: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ── Mother's Details ── */}
              <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3 space-y-2.5">
                <p className="text-[10px] font-bold text-pink-700 uppercase tracking-wider flex items-center gap-1">
                  <span>👩</span> Mother's Details
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Mother's Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sujata Kulkarni"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <SearchableSelect 
                      label="Mother's Status"
                      value={sanitizeParentStatus(formData.motherStatus, 'Homemaker')}
                      onChange={(val) => setFormData(prev => ({ ...prev, motherStatus: val }))}
                      options={MOTHER_STATUS_OPTIONS}
                      placeholder="Status"
                      searchPlaceholder="Search Status..."
                      buttonClassName="h-9 bg-white"
                    />
                  </div>
                  <div>
                    <SearchableSelect 
                      label="Mother's Education"
                      value={formData.motherEducation}
                      onChange={(val) => setFormData(prev => ({ ...prev, motherEducation: val }))}
                      options={qualificationOptions}
                      placeholder="Select Education"
                      searchPlaceholder="Search Education..."
                      buttonClassName="h-9 bg-white"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Mother's Profession</label>
                    <input
                      type="text"
                      placeholder="e.g. Homemaker / School Principal"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Mother's Mobile Number</label>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder="e.g. 94220 18274"
                      value={formData.motherMobile}
                      onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="h-6 flex items-end pb-1 font-semibold text-slate-700 leading-tight">Mother's WhatsApp / Alt</label>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder="e.g. 94220 18274"
                      value={formData.motherWhatsApp}
                      onChange={(e) => setFormData({ ...formData, motherWhatsApp: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ── Siblings ── */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <span>👨‍👩‍👦</span> Siblings ({formData.siblings.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      siblings: [...prev.siblings, { name: '', relation: 'Elder Brother', maritalStatus: 'Unmarried', education: '', profession: '' }]
                    }))}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors"
                  >
                    + Add Sibling
                  </button>
                </div>

                {formData.siblings.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-2">No siblings added yet. Tap "+ Add Sibling" above.</p>
                )}

                {formData.siblings.map((sib, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-amber-200 p-2.5 space-y-2 relative">
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        siblings: prev.siblings.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold hover:bg-red-200 flex items-center justify-center"
                    >✕</button>

                    <p className="text-[10px] font-bold text-amber-700">Sibling {idx + 1}</p>

                    {/* Name + Relation */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-0.5">Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Kulkarni"
                          value={sib.name}
                          onChange={(e) => {
                            const updated = [...formData.siblings];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setFormData({ ...formData, siblings: updated });
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                        />
                      </div>
                      <div>
                        <SearchableSelect 
                          label="Relation"
                          value={sib.relation}
                          onChange={(val) => {
                            const updated = [...formData.siblings];
                            updated[idx] = { ...updated[idx], relation: val };
                            setFormData({ ...formData, siblings: updated });
                          }}
                          options={[
                            'Elder Brother',
                            'Younger Brother',
                            'Elder Sister',
                            'Younger Sister',
                            'Twin Brother',
                            'Twin Sister'
                          ]}
                          placeholder="Relation"
                          searchPlaceholder="Search Relation..."
                          buttonClassName="h-8 bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Marital Status + Education */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <SearchableSelect 
                          label="Marital Status"
                          value={sib.maritalStatus}
                          onChange={(val) => {
                            const updated = [...formData.siblings];
                            updated[idx] = { ...updated[idx], maritalStatus: val };
                            setFormData({ ...formData, siblings: updated });
                          }}
                          options={[
                            'Unmarried',
                            'Married',
                            'Married (Settled Abroad)',
                            'Divorced',
                            'Widowed'
                          ]}
                          placeholder="Marital Status"
                          searchPlaceholder="Search Marital Status..."
                          buttonClassName="h-8 bg-slate-50"
                        />
                      </div>
                      <div>
                        <SearchableSelect 
                          label="Education"
                          value={sib.education}
                          onChange={(val) => {
                            const updated = [...formData.siblings];
                            updated[idx] = { ...updated[idx], education: val };
                            setFormData({ ...formData, siblings: updated });
                          }}
                          options={qualificationOptions}
                          placeholder="Select Education"
                          searchPlaceholder="Search Education..."
                          buttonClassName="h-8 bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Profession — full width */}
                    <div className="text-xs">
                      <label className="block text-slate-600 font-semibold mb-0.5">Profession / Company</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer at Google, Bangalore"
                        value={sib.profession}
                        onChange={(e) => {
                          const updated = [...formData.siblings];
                          updated[idx] = { ...updated[idx], profession: e.target.value };
                          setFormData({ ...formData, siblings: updated });
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vedic Astrology & Kundali Card - Only for Hinduism, Jainism, Buddhism */}
            {isKundaliApplicableReligion(formData.religion) && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#DFB76C]" /> Vedic Kundali & Horoscope Milan
                </h3>

                <div className="space-y-3 text-xs">
                  {/* 2-Column Grid: Rashi and Nakshatra */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <SearchableSelect 
                        label="Rashi (Moon Sign)"
                        value={formData.rashi}
                        onChange={(val) => setFormData(prev => ({ ...prev, rashi: val }))}
                        options={RASHIS}
                        placeholder="Select Rashi"
                        searchPlaceholder="Search Rashi..."
                        buttonClassName="h-10"
                      />
                    </div>

                    <div>
                      <SearchableSelect 
                        label="Nakshatra (Birth Star)"
                        value={formData.nakshatra}
                        onChange={(val) => setFormData(prev => ({ ...prev, nakshatra: val }))}
                        options={NAKSHATRAS}
                        placeholder="Select Nakshatra"
                        searchPlaceholder="Search Nakshatra..."
                        buttonClassName="h-10"
                      />
                    </div>
                  </div>

                  {/* Manglik Status — Full Width */}
                  <div>
                    <SearchableSelect 
                      label="Manglik Status"
                      value={formData.manglik}
                      onChange={(val) => setFormData(prev => ({ ...prev, manglik: val }))}
                      options={['Non-Manglik', 'Manglik', 'Anshik / Partial Manglik', 'Don’t Know']}
                      placeholder="Select Manglik Status"
                      searchPlaceholder="Search Manglik Status..."
                      buttonClassName="h-10"
                    />
                  </div>

                  {/* Horoscope Matching Requirement — Full Width */}
                  <div>
                    <SearchableSelect 
                      label="Horoscope Matching Requirement"
                      value={formData.kundaliMatch}
                      onChange={(val) => setFormData(prev => ({ ...prev, kundaliMatch: val }))}
                      options={[
                        'Yes, Gunas Match (Ashtakoot Milan) Preferred',
                        'Must Match (Strict Kundali Requirement)',
                        'Flexible / Open to Discussion',
                        'Not Required / Don’t Believe'
                      ]}
                      placeholder="Select Requirement"
                      searchPlaceholder="Search Requirement..."
                      buttonClassName="h-10"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* STEP 4: Partner Preferences, Bio & Verified Photo */}
        {currentStep === 4 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            
            <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-3.5 text-white shadow-sm border border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span className="text-xs font-bold text-[#DFB76C] uppercase tracking-wider">Step 4</span>
                </div>
                <h2 className="font-serif font-bold text-base text-white mt-0.5">
                  Partner Preferences & Expectations
                </h2>
                <p className="text-[11px] text-slate-300">
                  Ideal match criteria, personality traits, and personal bio.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-serif font-bold text-[#DFB76C]">100%</span>
                <p className="text-[9px] text-slate-300">Almost Done</p>
              </div>
            </div>

            {/* Card 1: Age, Height & Marital Status */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-[#DFB76C]" /> Age, Height & Marital Status
              </h3>

              {/* Age Range - Dedicated Clean Slider Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Preferred Age Range
                  </label>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/30 text-xs">
                    {formData.prefAgeMin} to {formData.prefAgeMax} yrs
                  </span>
                </div>
                
                <div className="flex items-center space-x-2.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">21</span>
                  <DualRangeSlider
                    min={21}
                    max={45}
                    minVal={formData.prefAgeMin}
                    maxVal={formData.prefAgeMax}
                    onChange={({ min, max }) => {
                      setFormData(prev => ({
                        ...prev,
                        prefAgeMin: min,
                        prefAgeMax: max
                      }));
                    }}
                  />
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">45</span>
                </div>
              </div>

              {/* Height & Marital Status - Symmetrically Aligned Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <SearchableSelect 
                    label="Preferred Height"
                    badge="Range"
                    value={formData.prefHeight}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefHeight: val }))}
                    options={[
                      'Any Height (No Preference)',
                      '4\'3" to 4\'10" (130 - 147 cm)',
                      '4\'8" to 5\'2" (142 - 157 cm)',
                      '5\'0" to 5\'5" (152 - 165 cm)',
                      '5\'3" to 5\'8" (160 - 173 cm)',
                      '5\'5" to 5\'11" (165 - 180 cm)',
                      '5\'7" to 6\'2" (170 - 188 cm)',
                      '5\'10" to 6\'5" (178 - 195 cm)',
                      '6\'0" to 6\'11" (183 - 210 cm)',
                      '6\'5"+ (195 cm and above)'
                    ]}
                    placeholder="Select Height Range"
                    searchPlaceholder="Search Height Range..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Marital Status"
                    badge="Requirement"
                    value={formData.prefMaritalStatus}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefMaritalStatus: val }))}
                    options={[
                      'Never Married Only',
                      'Divorced / Widowed OK',
                      'Awaiting Divorce Considered',
                      'Doesn\'t Matter'
                    ]}
                    placeholder="Select Marital Status"
                    searchPlaceholder="Search Marital Status..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Preferred Skin Tone"
                    value={formData.prefSkinTone}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefSkinTone: val }))}
                    options={[
                      'Doesn\'t Matter / Any Tone',
                      'Fair / Very Fair',
                      'Wheatish / Fair',
                      'Wheatish',
                      'Wheatish Brown',
                      'Dark / Dusky'
                    ]}
                    placeholder="Select Preferred Skin Tone"
                    searchPlaceholder="Search Skin Tone..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Preferred Body Type"
                    value={formData.prefBodyType}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefBodyType: val }))}
                    options={PREFERRED_BODY_TYPES}
                    placeholder="Select Preferred Body Type"
                    searchPlaceholder="Search Body Type..."
                    buttonClassName="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Education, Profession & Income */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#8C6D1F]" /> Education, Profession & Income
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <SearchableSelect 
                    label="Preferred Education"
                    value={formData.prefEducation}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefEducation: val }))}
                    options={[
                      'Doctor, Engineer, CA, MBA, Civil Services',
                      'Doctor / Healthcare Specialist',
                      'Engineer / IT / Tech Leadership',
                      'MBA / Corporate / Management',
                      'CA / CS / Finance / Banking',
                      'Civil Services / Govt (IAS/IPS/PSU)',
                      'Post Graduate / Doctorate / Ph.D',
                      'Any Graduate / Degree Holder',
                      'Education No Bar'
                    ]}
                    placeholder="Select Preferred Education"
                    searchPlaceholder="Search Education..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Preferred Profession"
                    value={formData.prefProfession}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefProfession: val }))}
                    options={[
                      'Working Professional Preferred',
                      'Doctor / Hospital / Clinic',
                      'Software / IT / Tech Professional',
                      'Government / Civil Services / Defence',
                      'Corporate / MNC Executive',
                      'Business / Entrepreneur / Self-Employed',
                      'Homemaker Accepted',
                      'Doesn\'t Matter'
                    ]}
                    placeholder="Select Preferred Profession"
                    searchPlaceholder="Search Profession..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Annual Income Expectation"
                    value={formData.prefIncome}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefIncome: val }))}
                    options={[
                      'No Income Bar',
                      '₹ 10 LPA+',
                      '₹ 15 LPA+',
                      '₹ 25 LPA+',
                      '₹ 40 LPA+',
                      '₹ 70 LPA+',
                      '₹ 1 Crore+'
                    ]}
                    placeholder="Select Income Expectation"
                    searchPlaceholder="Search Income Expectation..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Work Location & Mobility"
                    value={formData.prefWorkLocation}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefWorkLocation: val }))}
                    options={[
                      'Same City or Flexible to Relocate',
                      'Must be in Same City / District',
                      'Open to Any Major Indian Metro',
                      'Open to Settle Abroad / NRI'
                    ]}
                    placeholder="Select Work Location"
                    searchPlaceholder="Search Work Location..."
                    buttonClassName="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Location Proximity, Community & Kundali Milan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#8C6D1F]" /> Location, Culture & Horoscope
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <SearchableSelect 
                    label="Location Proximity"
                    value={formData.prefRegion}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefRegion: val }))}
                    options={[
                      'Same District & State Preferred',
                      'Within State Only (Maharashtra / Regional)',
                      'Pan-India (Open to All States)',
                      'South India (KA, TN, AP, TS, KL)',
                      'North India (Delhi, UP, Punjab, RJ)',
                      'Abroad / NRI Welcomed'
                    ]}
                    placeholder="Select Location Proximity"
                    searchPlaceholder="Search Location Proximity..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Dietary Preference"
                    value={formData.prefDiet}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefDiet: val }))}
                    options={[
                      'Pure Vegetarian Only',
                      'Vegetarian / Eggetarian',
                      'Non-Vegetarian Accepted',
                      'Strict Jain (No Root Veg)',
                      'Doesn\'t Matter'
                    ]}
                    placeholder="Select Dietary Preference"
                    searchPlaceholder="Search Dietary Preference..."
                    buttonClassName="h-10"
                  />
                </div>

                <div>
                  <SearchableSelect 
                    label="Community & Caste"
                    value={formData.prefMotherTongue}
                    onChange={(val) => setFormData(prev => ({ ...prev, prefMotherTongue: val }))}
                    options={[
                      'Open to All Communities',
                      'Same Community & Caste Preferred',
                      'Marathi Community',
                      'Hindi Community',
                      'South Indian (Tamil/Telugu/Kannada)',
                      'Gujarati / Marwari',
                      'Punjabi Community'
                    ]}
                    placeholder="Select Community Preference"
                    searchPlaceholder="Search Community Preference..."
                    buttonClassName="h-10"
                  />
                </div>

                {isKundaliApplicableReligion(formData.religion) && (
                  <div>
                    <SearchableSelect 
                      label="Manglik & Kundali Milan"
                      value={formData.prefManglik}
                      onChange={(val) => setFormData(prev => ({ ...prev, prefManglik: val }))}
                      options={[
                        'Doesn\'t Matter',
                        'Non-Manglik Only',
                        'Manglik Required',
                        'Anshik Manglik Accepted',
                        'High Gunas Milan (28+ Gunas) Preferred'
                      ]}
                      placeholder="Select Manglik Preference"
                      searchPlaceholder="Search Manglik Preference..."
                      buttonClassName="h-10"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Ideal Partner Traits & Values */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" /> Ideal Partner Traits & Values
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D4AF37]/15 text-[#8C6D1F] border border-[#D4AF37]/30">
                  {formData.prefTraits?.length || 0} selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select qualities and values that matter most in your life partner:
              </p>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {[
                  'Family-Oriented',
                  'Career-Driven',
                  'Cultured & Grounded',
                  'Fitness Enthusiast',
                  'Mutual Respect',
                  'Open-Minded',
                  'Travel Lover',
                  'Spiritual',
                  'Intellectual Conversations',
                  'Pet Friendly',
                  'Compassionate & Kind',
                  'Humorous & Cheerful'
                ].map(trait => {
                  const isSelected = formData.prefTraits?.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => {
                        const currentTraits = formData.prefTraits || [];
                        const updated = isSelected
                          ? currentTraits.filter(t => t !== trait)
                          : [...currentTraits, trait];
                        setFormData({ ...formData, prefTraits: updated });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0B192C] text-[#DFB76C] border border-[#D4AF37] shadow-xs ring-1 ring-[#D4AF37]/30'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#DFB76C] stroke-[3]" />}
                      <span>{trait}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 5: Personal Bio & Expectations Note */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#1E3A8A]" /> About Myself & Expectations
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formData.aboutBio?.length || 0} / 600
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1.5">
                  Personal Biography & Partner Expectations Note
                </label>
                <textarea 
                  rows={4}
                  maxLength={600}
                  value={formData.aboutBio}
                  onChange={(e) => setFormData({ ...formData, aboutBio: e.target.value })}
                  placeholder="Write a few warm lines about your passions, values, and expectations from your life partner..."
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-xs leading-relaxed text-slate-800 shadow-inner"
                />
              </div>

              {/* Quick Thought Starters */}
              <div className="pt-1 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-medium block">Quick Thought Starters (Click to add):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Values warm family bonds and mutual respect.',
                    'Passionate about personal growth and career.',
                    'Believes in open communication and shared laughter.',
                    'Enjoys traveling, weekend getaways, and exploring cuisines.'
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const current = formData.aboutBio ? formData.aboutBio.trim() + ' ' : '';
                        setFormData({ ...formData, aboutBio: (current + prompt).trim() });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#8C6D1F] border border-amber-200/70 hover:bg-amber-100 text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      + {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Authentic Photos Upload (Portraits & Family) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#DFB76C]" /> Authentic Profile & Family Photos
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload clear authentic photos. The first photo will be your verified primary portrait.
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D4AF37]/15 text-[#8C6D1F] border border-[#D4AF37]/30 shrink-0">
                  {(formData.singlePhotos || []).length}/5 Single &bull; {(formData.familyPhotos || []).length}/2 Family
                </span>
              </div>

              {/* Single Photos (Max 5) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#DFB76C]" /> Single Portrait Photos ({(formData.singlePhotos || []).length}/5)
                  </span>
                  <span className="text-[10px] text-slate-400">Click star to set as main</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(formData.singlePhotos || []).map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 group bg-slate-100 shadow-xs">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-[#D4AF37] text-[#0B192C] text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5 z-10">
                          <Star className="w-2.5 h-2.5 fill-current" /> Main
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetMainPhoto(idx)}
                            className="p-1.5 rounded-full bg-white text-slate-800 hover:text-amber-600 shadow transition-colors cursor-pointer"
                            title="Make Main Profile Photo"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSinglePhoto(idx)}
                          className="p-1.5 rounded-full bg-white text-red-600 hover:bg-red-50 shadow transition-colors cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(formData.singlePhotos || []).length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#DFB76C] bg-slate-50/50 hover:bg-amber-50/20 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSingleFileUpload} 
                        className="hidden" 
                      />
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 group-hover:border-[#DFB76C] flex items-center justify-center shadow-xs mb-1">
                        <Plus className="w-4 h-4 text-slate-500 group-hover:text-[#DFB76C]" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-800">Add Photo</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Family Photos (Max 2) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-600" /> Family Photos ({(formData.familyPhotos || []).length}/2)
                  </span>
                  <span className="text-[10px] text-slate-400">Optional group picture</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(formData.familyPhotos || []).map((url, idx) => (
                    <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-purple-200 group bg-slate-100 shadow-xs">
                      <img src={url} alt={`Family Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyPhoto(idx)}
                          className="p-1.5 rounded-full bg-white text-red-600 hover:bg-red-50 shadow transition-colors cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(formData.familyPhotos || []).length < 2 && (
                    <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFamilyFileUpload} 
                        className="hidden" 
                      />
                      <div className="w-8 h-8 rounded-full bg-white border border-purple-200 group-hover:border-purple-400 flex items-center justify-center shadow-xs mb-1">
                        <Plus className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-[10px] font-semibold text-purple-700">Add Family Photo</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Trust Badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Verified Member Trust Badge</h4>
                  <p className="text-[10px] text-slate-500">
                    Display official verified checkmark on card
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.governmentIdVerified}
                  onChange={(e) => setFormData({ ...formData, governmentIdVerified: e.target.checked })}
                  className="rounded accent-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-emerald-700">
                  ID Badge
                </span>
              </label>
            </div>

          </div>
        )}

      </div>

      {/* Fixed Sticky Bottom Action Dock */}
      <footer className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-between z-30 shadow-lg">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        ) : (
          <div></div>
        )}

        <button
          type="button"
          onClick={nextStep}
          disabled={isSubmitting}
          className="flex-1 max-w-[260px] ml-2 flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/20 transition-all cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-[#0B192C] border-t-transparent rounded-full animate-spin" />
              <span>Generating Register ID...</span>
            </>
          ) : (
            <>
              <span>{currentStep === 4 ? 'Save & Generate Register ID' : 'Continue Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </footer>

      {/* Completion Modal with Generated Register ID */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>

            <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/30">
              Registration Successful
            </span>

            <h3 className="text-xl font-serif font-bold text-[#0B192C] mt-2">
              Namaste, {formData.fullName || 'Member'}!
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Your profile has been saved. Your unique Matrimonial <strong>Register ID</strong> is ready:
            </p>

            {/* Prominent Register ID Card */}
            <div className="my-4 p-4 rounded-2xl bg-gradient-to-b from-[#FFFDF7] to-amber-50/50 border-2 border-[#D4AF37] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-[#8C6D1F] tracking-wider mb-1 flex items-center justify-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Your Official Register ID</span>
              </div>
              <div className="text-3xl font-serif font-extrabold text-[#0B192C] tracking-wider my-1">
                {generatedRegisterId || 'I4Y1001'}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(generatedRegisterId || 'I4Y1001');
                  setCopiedRegisterId(true);
                  setTimeout(() => setCopiedRegisterId(false), 2000);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#D4AF37]/40 hover:border-[#D4AF37] text-slate-700 shadow-2xs hover:bg-[#FFFDF7] transition-all cursor-pointer"
              >
                {copiedRegisterId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Register ID Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Register ID</span>
                  </>
                )}
              </button>

              <div className="mt-2.5 pt-2 border-t border-[#D4AF37]/20 text-[11px] text-slate-600 leading-tight">
                ⚠️ <strong>Important:</strong> Please save this Register ID. You will use this ID and your chosen password to sign in to I 4 You.
              </div>
            </div>

            {formData.email && (
              <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-600 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span className="truncate">
                  Confirmation email sent to <strong>{formData.email}</strong>
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setShowCompleteModal(false);
                const finalData = {
                  ...formData,
                  registerId: generatedRegisterId || formData.registerId || 'I4Y1001',
                  ...(registeredUser || {})
                };
                if (onProceedToVerification) {
                  onProceedToVerification(finalData);
                } else {
                  onRegistrationComplete?.(finalData);
                  if (setCurrentScreen) setCurrentScreen('app');
                  if (onBack) onBack();
                }
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/30 transition-all cursor-pointer"
            >
              Proceed to Profile & Verification
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
