// Pan-India authentic matrimonial profiles dataset

export const INITIAL_PROFILES = [];


// Initial mock chat conversations for Female users (chats with Gents / Male candidates only)
export const CONVERSATIONS_FOR_FEMALE = [
  {
    profileId: 'p2', // Rohan Jayasimha (Male)
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Namaste Priya! Thank you for connecting. I reviewed your profile and our family values align wonderfully.',
        time: '10:32 AM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'me',
        text: 'Namaste Rohan! Delighted to connect. Really loved your AI research work and your love for hiking in the Western Ghats.',
        time: '10:35 AM',
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'them',
        text: 'Thank you! Yes, our elders in Mysuru also had a look at the horoscope details — the Gunas match came to 32/36 which made everyone very happy. Would you be open to a casual call this Sunday?',
        time: '10:48 AM',
        status: 'unread'
      }
    ],
    autoReplies: [
      "Sunday afternoon around 4 PM works wonderfully for me and my family!",
      "I would love that. Let me share my father's contact so our families can exchange auspicious greetings.",
      "Looking forward to speaking this weekend. Wishing you a blessed day ahead!"
    ]
  },
  {
    profileId: 'p4', // Kabir Singh Sodhi (Male)
    unreadCount: 0,
    messages: [
      {
        id: 'm4',
        sender: 'them',
        text: 'Hello Priya! Excited to connect with you. Loved your creative perspective on design and life balance.',
        time: 'Yesterday',
        status: 'read'
      },
      {
        id: 'm5',
        sender: 'me',
        text: 'Hi Kabir! Really appreciated your profile and family business values in Chandigarh.',
        time: 'Yesterday',
        status: 'read'
      }
    ],
    autoReplies: [
      "That is fantastic! Respect and open communication are so essential.",
      "My parents were also really happy looking at our compatibility.",
      "Let's definitely connect over a quick voice call whenever you are free!"
    ]
  }
];

// Initial mock chat conversations for Male users (chats with Women / Female candidates only)
export const CONVERSATIONS_FOR_MALE = [
  {
    profileId: 'p1', // Dr. Ananya Kulkarni (Female)
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: 'them',
        text: 'Namaste Rohan! Thank you for connecting. I reviewed your profile and our family values align wonderfully.',
        time: '10:32 AM',
        status: 'read'
      },
      {
        id: 'm2',
        sender: 'me',
        text: 'Namaste Dr. Ananya! It is wonderful to connect. I was really impressed by your dedication to pediatrics and your cultural background.',
        time: '10:35 AM',
        status: 'read'
      },
      {
        id: 'm3',
        sender: 'them',
        text: 'Thank you! Yes, our elders in Nashik also had a look at the horoscope details — the Gunas match came to 33/36 which made everyone very happy. Would you be open to a casual video call this Sunday?',
        time: '10:48 AM',
        status: 'unread'
      }
    ],
    autoReplies: [
      "Sunday afternoon around 4 PM works wonderfully for me and my family!",
      "I would love that. Let me also share my father's contact details so our families can exchange auspicious greetings.",
      "Thank you for sharing your thoughts. Looking forward to our conversation this weekend!"
    ]
  },
  {
    profileId: 'p3', // Meera Venkatraman (Female)
    unreadCount: 0,
    messages: [
      {
        id: 'm4',
        sender: 'them',
        text: 'Hello Rohan! Excited to see your interest. I love your perspective on travel and balancing work with life.',
        time: 'Yesterday',
        status: 'read'
      },
      {
        id: 'm5',
        sender: 'me',
        text: 'Hi Meera! Really appreciated your profile. Your career as a CA and love for classical music sounds amazing.',
        time: 'Yesterday',
        status: 'read'
      }
    ],
    autoReplies: [
      "That is fantastic! Mutual respect is so essential in a marriage.",
      "My parents were also really happy looking at our horoscope compatibility.",
      "Let's definitely connect over a quick voice call whenever you are free!"
    ]
  }
];

export const getConversationsForUser = (user) => {
  const isMale = (user?.gender || '').toLowerCase() === 'male';
  return isMale ? CONVERSATIONS_FOR_MALE : CONVERSATIONS_FOR_FEMALE;
};

export const INITIAL_CONVERSATIONS = CONVERSATIONS_FOR_FEMALE;

// Female Demo User (Priya Sharma - Bride persona looking for Gents)
export const DEMO_USER_FEMALE = {
  id: 'demo-priya',
  name: 'Priya Sharma',
  mobile: '9876543210',
  gender: 'Female',
  age: 26,
  city: 'Pune',
  district: 'Pune',
  state: 'Maharashtra',
  height: "5'6\" (168 cm)",
  bodyType: 'Slim',
  skinColour: 'Fair',
  maritalStatus: 'Never Married',
  profession: 'Senior Product Designer',
  education: 'Master of Design (M.Des) - NID Ahmedabad',
  educationCategory: 'Design & Fashion',
  institute: 'National Institute of Design (NID), Ahmedabad',
  twelfthSchool: 'Delhi Public School (DPS), R.K. Puram',
  twelfthBoard: 'CBSE (Central Board 12th)',
  twelfthStream: 'Arts / Humanities with Fine Arts',
  twelfthYear: '2016',
  tenthSchool: 'St. Mary’s Convent School, Pune',
  tenthBoard: 'ICSE (CISCE 10th)',
  tenthYear: '2014',
  company: 'Fintech Unicorn',
  jobLocation: 'Pune & Mumbai',
  workLocationType: 'Hybrid',
  diet: 'Pure Vegetarian',
  smoking: 'No',
  drinking: 'Never',
  hobbies: 'UI/UX Design Sketching, Watercolor Painting, Photography',
  interests: 'Fintech Innovation, Modern Art Galleries, Specialty Coffee & Travel',
  sportsFitness: 'Pilates, Badminton & Cycling',
  photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
  singlePhotos: [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800'
  ],
  familyPhotos: [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1609234656388-0ff363383899?auto=format&fit=crop&q=80&w=800'
  ],
  verified: true,
  mobileVerified: true,
  aadhaarVerified: false,
  aadhaarNumber: '4920 8173 5928',
  maskedAadhaar: 'XXXX XXXX 5928',
  requireAadhaarToViewContact: true,
  familyFinancialStatus: 'Upper Middle Class',
  familyStatus: 'Upper Middle Class',
  hidePhotos: false,
  photoVisibility: 'all',
  prefBodyType: 'Athletic / Fit',
  prefSkinTone: 'Fair / Wheatish',
  blurPhotosForUnconnected: false,
  familyPhone: '+91 94220 18273',
  fatherMobile: '+91 94220 18273',
  fatherWhatsApp: '+91 94220 18273',
  motherMobile: '+91 94220 18274',
  motherWhatsApp: '+91 94220 18274',
  familyDetails: {
    type: 'Nuclear Family',
    values: 'Traditional yet Progressive',
    financialStatus: 'Upper Middle Class',
    father: 'Suresh Sharma (Retired PWD Executive Engineer)',
    mother: 'Sunita Sharma (Homemaker)',
    siblings: '1 Younger Sister (Pursuing MBA)'
  },
  // Strictly MALE candidate IDs (Gents only)
  interestsSent: ['p2', 'p4', 'p6'],
  shortlisted: ['p2', 'p4', 'p6', 'p8'],
  membership: 'free',
  membershipPlan: 'Free Basic Member',
  contactCredits: 0,
  unlockedContacts: [],
  planExpiry: null,
  paymentHistory: []
};

// Male Demo User (Rohan Jayasimha - Groom persona looking for Women)
export const DEMO_USER_MALE = {
  id: 'demo-rohan',
  name: 'Rohan Jayasimha',
  mobile: '9123456780',
  gender: 'Male',
  age: 29,
  city: 'Mysuru',
  district: 'Mysuru',
  state: 'Karnataka',
  height: "5'11\" (180 cm)",
  bodyType: 'Athletic',
  skinColour: 'Wheatish',
  maritalStatus: 'Never Married',
  profession: 'Principal AI Research Engineer',
  education: 'B.Tech (CS) - NIT Surathkal, MS - Georgia Tech',
  educationCategory: 'Engineering / IT',
  institute: 'NIT Surathkal & Georgia Institute of Technology',
  twelfthSchool: 'National Public School (NPS), Indiranagar, Bengaluru',
  twelfthBoard: 'CBSE (Central Board 12th)',
  twelfthStream: 'Science (PCM - Engineering)',
  twelfthYear: '2014',
  tenthSchool: 'The Brigade School, Mysuru',
  tenthBoard: 'ICSE (CISCE 10th)',
  tenthYear: '2012',
  company: 'Google DeepMind',
  jobLocation: 'Bangalore & Mysuru',
  workLocationType: 'Hybrid',
  diet: 'Eggetarian',
  smoking: 'No',
  drinking: 'Socially',
  hobbies: 'Acoustic Guitar, Hiking Western Ghats, Sci-Fi Books',
  interests: 'Autonomous AI Systems, Space Exploration, Heritage Cafes',
  sportsFitness: 'Trekking, Rock Climbing, Swimming',
  photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
  singlePhotos: [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
  ],
  familyPhotos: [
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1542037104857-ffbc0b91c487?auto=format&fit=crop&q=80&w=800'
  ],
  verified: true,
  mobileVerified: true,
  aadhaarVerified: true,
  aadhaarNumber: '8839 2018 3920',
  maskedAadhaar: 'XXXX XXXX 3920',
  requireAadhaarToViewContact: true,
  familyFinancialStatus: 'Upper Middle Class',
  familyStatus: 'Upper Middle Class',
  hidePhotos: false,
  photoVisibility: 'all',
  prefBodyType: 'Slim / Average',
  prefSkinTone: 'Fair / Wheatish',
  blurPhotosForUnconnected: false,
  familyPhone: '+91 94480 34120',
  fatherMobile: '+91 94480 34120',
  fatherWhatsApp: '+91 94480 34120',
  motherMobile: '+91 94480 34121',
  motherWhatsApp: '+91 94480 34121',
  familyDetails: {
    type: 'Joint Family',
    values: 'Modern & Value-driven',
    financialStatus: 'Upper Middle Class',
    father: 'Coffee Planter & Exporter (Chikkamagaluru / Mysuru)',
    mother: 'Homemaker & Classical Vocalist',
    siblings: '1 Younger Sister (Pursuing Master’s in Architecture, Germany)'
  },
  // Strictly FEMALE candidate IDs (Women only)
  interestsSent: ['p1', 'p3', 'p5'],
  shortlisted: ['p1', 'p3', 'p5', 'p7'],
  membership: 'vip',
  membershipPlan: 'Royal VIP Member',
  contactCredits: 30,
  unlockedContacts: ['p1'],
  planExpiry: '31 Dec 2026',
  paymentHistory: [
    {
      invoiceNumber: 'INV-2026-3021',
      date: '20 Jan 2026',
      transactionId: 'TXN_UPI_882910',
      planName: 'Royal VIP Annual Plan',
      totalAmount: 4999,
      paymentMethod: 'Net Banking',
      contactCredits: 30
    }
  ]
};

// Default demo persona
export const DEMO_USER = DEMO_USER_FEMALE;

