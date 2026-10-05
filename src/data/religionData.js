// Comprehensive All-India Religions and Sub-Castes / Communities / Denominations Dataset

export const ALL_INDIA_RELIGIONS = [
  'Hindu',
  'Christian',
  'Muslim',
  'Sikh',
  'Jain',
  'Buddhist',
  'Parsi',
  'Jewish',
  'Spiritual - Non Religious'
];

export const RELIGION_COMMUNITIES = {
  Christian: [
    'Roman Catholic',
    'Latin Catholic',
    'Syro-Malabar Catholic',
    'Knanaya Catholic',
    'Syro-Malankara Catholic',
    'Malankara Orthodox',
    'Syrian Orthodox (Jacobite)',
    'Mar Thoma',
    'Knanaya Jacobite',
    'CSI (Church of South India)',
    'CNI (Church of North India)',
    'Pentecostal (IPC / Sharon / AG)',
    'Protestant',
    'Baptist',
    'Methodist',
    'Presbyterian',
    'Lutheran',
    'Evangelical / Born Again',
    'Seventh-day Adventist',
    'Salvation Army',
    'Anglo-Indian',
    'Nadar Christian',
    'Goan Catholic',
    'Mangalorean Catholic',
    'East Indian Catholic (Mumbai)',
    'Christian - Inter-Denomination',
    'Other Christian'
  ],

  Hindu: [
    // Brahmin Sub-castes
    'Brahmin - Iyer',
    'Brahmin - Iyengar',
    'Brahmin - Deshastha',
    'Brahmin - Saraswat / GSB',
    'Brahmin - Kanyakubj',
    'Brahmin - Gaur',
    'Brahmin - Saryuparin',
    'Brahmin - Maithil',
    'Brahmin - Namboodiri',
    'Brahmin - Havyaka',
    'Brahmin - Nagar',
    'Brahmin - Vaidiki / Niyogi',
    'Brahmin - Smartha',
    'Brahmin - Madhwa',
    'Brahmin - Bhatt / Pandit',
    'Brahmin - Kokanastha / Chitpavan',
    'Brahmin - Daivadnya',
    'Brahmin - Other',

    // Major Regional & Martial Communities
    'Maratha (96 Kuli / Kunbi)',
    'Rajput (Chauhan / Rathore / Sisodia)',
    'Kshatriya / Raju / Varma',
    'Nair (Menon / Pillai / Kurup / Nambiar)',
    'Ezhava / Thiyya',
    'Reddy',
    'Kamma',
    'Kapu / Balija / Telaga',
    'Patel / Patidar (Kadva / Leva)',
    'Jat (Hindu)',
    'Yadav / Ahir / Gwala',
    'Lingayat / Veerashaiva',
    'Vokkaliga / Gowda',
    'Mudaliar / Pillai',
    'Nadar (Hindu)',
    'Chettiar',
    'Thevar / Mukkulathor',
    'Vanniyar / Gounder',
    'Kuruba',
    'Bunt / Shetty',
    'Billava / Poojary',

    // Bania / Vaishya Communities
    'Agarwal / Aggarwal',
    'Gupta / Bania',
    'Maheshwari',
    'Oswal / Porwal',
    'Arya Vysya / Komati',
    'Khandelwal',
    'Kayastha (Mathur / Saxena / Srivastava)',

    // Artisan & Other Communities
    'Viswakarma / Achari / Sutar',
    'Saini / Mali',
    'Gujjar / Gurjar',
    'Meena',
    'Kushwaha / Maurya',
    'Lodhi / Rajput Lodh',
    'Devanga / Weaver',
    'Bhandari',
    'SC / Dalit Community',
    'ST / Tribal Community',
    'Caste No Bar / Progressive Hindu',
    'Other Hindu Community'
  ],

  Muslim: [
    'Sunni - Hanafi',
    'Sunni - Shafi\'i',
    'Sunni - Maliki',
    'Sunni - Hanbali',
    'Shia - Ithna Ashari (Twelver)',
    'Shia - Ismaili / Agha Khani',
    'Shia - Bohra (Dawoodi)',
    'Shia - Bohra (Sulaymani / Alavi)',
    'Syed / Sayyid',
    'Sheikh / Shaikh',
    'Pathan / Khan / Pashtun',
    'Mughal / Mirza',
    'Ansari / Momin',
    'Qureshi / Hashmi',
    'Memon (Halai / Kutchi)',
    'Mappila / Mapilla (Kerala)',
    'Lebbai / Rowther / Marakkayar (Tamil Nadu)',
    'Navayat / Nawayath',
    'Siddiqui / Farooqi / Usmani',
    'Malik',
    'Dudhwala / Ghanchi',
    'Sufi / Barelvi',
    'Deobandi',
    'Muslim - Caste / Firqa No Bar',
    'Other Muslim'
  ],

  Sikh: [
    'Jat Sikh',
    'Ramgarhia / Tarkhan',
    'Khatri Sikh',
    'Arora Sikh',
    'Gursikh / Amritdhari',
    'Ahluwalia / Walia',
    'Saini Sikh',
    'Kamboj Sikh',
    'Mazhabi Sikh',
    'Ravidasia / Ramdasia',
    'Labana Sikh',
    'Bhatra Sikh',
    'Sikh - Caste No Bar',
    'Other Sikh'
  ],

  Jain: [
    'Digambar - Bispanthi',
    'Digambar - Terapanthi',
    'Shwetambar - Murtipujak (Deravasi)',
    'Shwetambar - Sthanakvasi',
    'Shwetambar - Terapanthi',
    'Oswal Jain',
    'Porwal Jain',
    'Khandelwal Jain',
    'Agarwal Jain',
    'Jaiswal Jain',
    'Shrimal / Humbad',
    'Jain - Sect No Bar',
    'Other Jain'
  ],

  Buddhist: [
    'Neo-Buddhist / Navayana (Ambedkarite)',
    'Mahayana',
    'Theravada',
    'Tibetan Buddhist (Lamaist)',
    'Buddhist - Community No Bar',
    'Other Buddhist'
  ],

  Parsi: [
    'Parsi (Shahenshahi)',
    'Parsi (Kadmi)',
    'Parsi (Fasli)',
    'Irani Zoroastrian',
    'Other Parsi / Zoroastrian'
  ],

  Jewish: [
    'Bene Israel (Maharashtra)',
    'Cochin Jewish / Malabar (Kerala)',
    'Baghdadi Jewish (Kolkata / Mumbai)',
    'Bnei Menashe (North East)',
    'Jewish - Other'
  ],

  'Spiritual - Non Religious': [
    'Caste No Bar / Religion No Bar',
    'Universal Spiritual',
    'Humanist / Agnostic',
    'Inter-Religion Background',
    'Other'
  ]
};

// Intelligent default sub-caste per religion
export const DEFAULT_COMMUNITY_FOR_RELIGION = {
  Christian: 'Roman Catholic',
  Hindu: 'Brahmin - Deshastha',
  Muslim: 'Sunni - Hanafi',
  Sikh: 'Jat Sikh',
  Jain: 'Shwetambar - Murtipujak (Deravasi)',
  Buddhist: 'Neo-Buddhist / Navayana (Ambedkarite)',
  Parsi: 'Parsi (Shahenshahi)',
  Jewish: 'Bene Israel (Maharashtra)',
  'Spiritual - Non Religious': 'Caste No Bar / Religion No Bar'
};

// Dynamic Lineage / Gothra label tailored to religion context
export const LINEAGE_LABEL_FOR_RELIGION = {
  Christian: 'Parish / Church / Diocese (Optional)',
  Muslim: 'Family Lineage / Clan / Firqa (Optional)',
  Hindu: 'Gothra / Lineage (Optional)',
  Jain: 'Gothra / Lineage (Optional)',
  Sikh: 'Gothra / Clan / Misl (Optional)',
  Buddhist: 'Lineage / Background (Optional)',
  Parsi: 'Family Name / Agiary (Optional)',
  Jewish: 'Synagogue / Lineage (Optional)',
  'Spiritual - Non Religious': 'Lineage / Background (Optional)'
};

// Lineage placeholder helper
export const LINEAGE_PLACEHOLDER_FOR_RELIGION = {
  Christian: 'e.g. St. Mary’s Cathedral, Maramon, or Ernakulam Diocese',
  Muslim: 'e.g. Qureshi, Hashemi, or Not Applicable',
  Hindu: 'e.g. Kashyap, Bharadwaj, Vashistha, Garg',
  Jain: 'e.g. Kashyap, Gautam, or Not Applicable',
  Sikh: 'e.g. Gill, Dhillon, Sandhu, or Not Applicable',
  Buddhist: 'e.g. Shakya, or Not Applicable',
  Parsi: 'e.g. Wadia, Tata, or Not Applicable',
  Jewish: 'e.g. Magen David, or Not Applicable',
  'Spiritual - Non Religious': 'e.g. Not Applicable'
};

// Popular Hindu / Jain Gothras
export const POPULAR_GOTHRAS = [
  'Kashyap',
  'Bharadwaj',
  'Vashistha',
  'Kaushik',
  'Gautam',
  'Atri',
  'Garg',
  'Harita',
  'Jamadagni',
  'Shandilya',
  'Mudgala',
  'Vatsa',
  'Parashara',
  'Agastya',
  'Vishwamitra',
  'Angirasa',
  'Kutsasa',
  'Sankriti',
  'Don’t Know / Not Applicable'
];

// Kundali & Horoscope Milan is traditionally applicable for Hinduism, Jainism, and Buddhism
export const KUNDALI_APPLICABLE_RELIGIONS = ['Hindu', 'Jain', 'Buddhist', 'Hinduism', 'Jainism', 'Buddhism'];

export const isKundaliApplicableReligion = (religion) => {
  if (!religion) return false;
  const rel = String(religion).trim().toLowerCase();
  return (
    rel === 'hindu' ||
    rel === 'hinduism' ||
    rel === 'jain' ||
    rel === 'jainism' ||
    rel === 'buddhist' ||
    rel === 'buddhism'
  );
};
