// Comprehensive Pan-India location dataset covering 28 States & UTs with Indian Administrative Districts

export const REGIONS = [
  'All Regions',
  'North India',
  'South India',
  'West India',
  'East India',
  'Central India',
  'North-East India'
];

export const STATES_AND_CITIES = [
  {
    state: 'Maharashtra',
    region: 'West India',
    cities: [
      { name: 'Mumbai', district: 'Mumbai City' },
      { name: 'Pune', district: 'Pune' },
      { name: 'Nagpur', district: 'Nagpur' },
      { name: 'Nashik', district: 'Nashik' },
      { name: 'Chhatrapati Sambhajinagar (Aurangabad)', district: 'Chhatrapati Sambhajinagar' },
      { name: 'Kolhapur', district: 'Kolhapur' },
      { name: 'Solapur', district: 'Solapur' },
      { name: 'Sangli', district: 'Sangli' },
      { name: 'Satara', district: 'Satara' },
      { name: 'Ahmednagar', district: 'Ahilyanagar' },
      { name: 'Amravati', district: 'Amravati' },
      { name: 'Jalgaon', district: 'Jalgaon' },
      { name: 'Akola', district: 'Akola' },
      { name: 'Dhule', district: 'Dhule' },
      { name: 'Baramati', district: 'Pune' },
      { name: 'Chiplun', district: 'Ratnagiri' },
      { name: 'Karad', district: 'Satara' },
      { name: 'Pandharpur', district: 'Solapur' },
      { name: 'Gondia', district: 'Gondia' },
      { name: 'Wardha', district: 'Wardha' },
      { name: 'Ratnagiri', district: 'Ratnagiri' }
    ]
  },
  {
    state: 'Karnataka',
    region: 'South India',
    cities: [
      { name: 'Bengaluru', district: 'Bengaluru Urban' },
      { name: 'Mysuru', district: 'Mysuru' },
      { name: 'Hubballi-Dharwad', district: 'Dharwad' },
      { name: 'Mangaluru', district: 'Dakshina Kannada' },
      { name: 'Belagavi', district: 'Belagavi' },
      { name: 'Shivamogga', district: 'Shivamogga' },
      { name: 'Davanagere', district: 'Davanagere' },
      { name: 'Ballari', district: 'Ballari' },
      { name: 'Tumakuru', district: 'Tumakuru' },
      { name: 'Kalaburagi (Gulbarga)', district: 'Kalaburagi' },
      { name: 'Udupi', district: 'Udupi' },
      { name: 'Hassan', district: 'Hassan' },
      { name: 'Mandya', district: 'Mandya' },
      { name: 'Chikkamagaluru', district: 'Chikkamagaluru' },
      { name: 'Bagalkot', district: 'Bagalkot' },
      { name: 'Gadag', district: 'Gadag' },
      { name: 'Bidar', district: 'Bidar' }
    ]
  },
  {
    state: 'Delhi NCR',
    region: 'North India',
    cities: [
      { name: 'New Delhi', district: 'New Delhi' },
      { name: 'Noida', district: 'Gautam Buddha Nagar' },
      { name: 'Gurugram', district: 'Gurugram' },
      { name: 'Faridabad', district: 'Faridabad' },
      { name: 'Ghaziabad', district: 'Ghaziabad' },
      { name: 'Greater Noida', district: 'Gautam Buddha Nagar' },
      { name: 'Sonipat', district: 'Sonipat' },
      { name: 'Bahadurgarh', district: 'Jhajjar' },
      { name: 'Manesar', district: 'Gurugram' },
      { name: 'Palwal', district: 'Palwal' }
    ]
  },
  {
    state: 'Tamil Nadu',
    region: 'South India',
    cities: [
      { name: 'Chennai', district: 'Chennai' },
      { name: 'Coimbatore', district: 'Coimbatore' },
      { name: 'Madurai', district: 'Madurai' },
      { name: 'Tiruchirappalli (Trichy)', district: 'Tiruchirappalli' },
      { name: 'Salem', district: 'Salem' },
      { name: 'Tirunelveli', district: 'Tirunelveli' },
      { name: 'Erode', district: 'Erode' },
      { name: 'Vellore', district: 'Vellore' },
      { name: 'Thanjavur', district: 'Thanjavur' },
      { name: 'Dindigul', district: 'Dindigul' },
      { name: 'Kanchipuram', district: 'Kanchipuram' },
      { name: 'Kumbakonam', district: 'Thanjavur' },
      { name: 'Pollachi', district: 'Coimbatore' },
      { name: 'Nagercoil', district: 'Kanyakumari' },
      { name: 'Hosur', district: 'Krishnagiri' },
      { name: 'Karaikudi', district: 'Sivaganga' },
      { name: 'Rajapalayam', district: 'Virudhunagar' },
      { name: 'Pudukkottai', district: 'Pudukkottai' }
    ]
  },
  {
    state: 'Gujarat',
    region: 'West India',
    cities: [
      { name: 'Ahmedabad', district: 'Ahmedabad' },
      { name: 'Surat', district: 'Surat' },
      { name: 'Vadodara', district: 'Vadodara' },
      { name: 'Rajkot', district: 'Rajkot' },
      { name: 'Bhavnagar', district: 'Bhavnagar' },
      { name: 'Jamnagar', district: 'Jamnagar' },
      { name: 'Junagadh', district: 'Junagadh' },
      { name: 'Gandhinagar', district: 'Gandhinagar' },
      { name: 'Anand', district: 'Anand' },
      { name: 'Navsari', district: 'Navsari' },
      { name: 'Morbi', district: 'Morbi' },
      { name: 'Mehsana', district: 'Mehsana' },
      { name: 'Bharuch', district: 'Bharuch' },
      { name: 'Vapi', district: 'Valsad' },
      { name: 'Palanpur', district: 'Banaskantha' },
      { name: 'Porbandar', district: 'Porbandar' },
      { name: 'Godhra', district: 'Panchmahal' },
      { name: 'Veraval', district: 'Gir Somnath' }
    ]
  },
  {
    state: 'Uttar Pradesh',
    region: 'North India',
    cities: [
      { name: 'Lucknow', district: 'Lucknow' },
      { name: 'Kanpur', district: 'Kanpur Nagar' },
      { name: 'Varanasi', district: 'Varanasi' },
      { name: 'Agra', district: 'Agra' },
      { name: 'Prayagraj (Allahabad)', district: 'Prayagraj' },
      { name: 'Meerut', district: 'Meerut' },
      { name: 'Bareilly', district: 'Bareilly' },
      { name: 'Aligarh', district: 'Aligarh' },
      { name: 'Moradabad', district: 'Moradabad' },
      { name: 'Gorakhpur', district: 'Gorakhpur' },
      { name: 'Saharanpur', district: 'Saharanpur' },
      { name: 'Jhansi', district: 'Jhansi' },
      { name: 'Mathura', district: 'Mathura' },
      { name: 'Ayodhya', district: 'Ayodhya' },
      { name: 'Firozabad', district: 'Firozabad' },
      { name: 'Muzaffarnagar', district: 'Muzaffarnagar' },
      { name: 'Rampur', district: 'Rampur' },
      { name: 'Shahjahanpur', district: 'Shahjahanpur' },
      { name: 'Budaun', district: 'Budaun' },
      { name: 'Sitapur', district: 'Sitapur' }
    ]
  },
  {
    state: 'Telangana',
    region: 'South India',
    cities: [
      { name: 'Hyderabad', district: 'Hyderabad' },
      { name: 'Warangal', district: 'Hanamkonda' },
      { name: 'Nizamabad', district: 'Nizamabad' },
      { name: 'Karimnagar', district: 'Karimnagar' },
      { name: 'Khammam', district: 'Khammam' },
      { name: 'Ramagundam', district: 'Peddapalli' },
      { name: 'Mahabubnagar', district: 'Mahabubnagar' },
      { name: 'Nalgonda', district: 'Nalgonda' },
      { name: 'Adilabad', district: 'Adilabad' },
      { name: 'Suryapet', district: 'Suryapet' },
      { name: 'Siddipet', district: 'Siddipet' },
      { name: 'Miryalaguda', district: 'Nalgonda' }
    ]
  },
  {
    state: 'West Bengal',
    region: 'East India',
    cities: [
      { name: 'Kolkata', district: 'Kolkata' },
      { name: 'Howrah', district: 'Howrah' },
      { name: 'Siliguri', district: 'Darjeeling' },
      { name: 'Durgapur', district: 'Paschim Bardhaman' },
      { name: 'Asansol', district: 'Paschim Bardhaman' },
      { name: 'Bardhaman', district: 'Purba Bardhaman' },
      { name: 'Malda', district: 'Malda' },
      { name: 'Kharagpur', district: 'Paschim Medinipur' },
      { name: 'Berhampore', district: 'Murshidabad' },
      { name: 'Haldia', district: 'Purba Medinipur' },
      { name: 'Jalpaiguri', district: 'Jalpaiguri' },
      { name: 'Balurghat', district: 'Dakshin Dinajpur' },
      { name: 'Shantipur', district: 'Nadia' },
      { name: 'Purulia', district: 'Purulia' }
    ]
  },
  {
    state: 'Rajasthan',
    region: 'North India',
    cities: [
      { name: 'Jaipur', district: 'Jaipur' },
      { name: 'Jodhpur', district: 'Jodhpur' },
      { name: 'Kota', district: 'Kota' },
      { name: 'Udaipur', district: 'Udaipur' },
      { name: 'Bikaner', district: 'Bikaner' },
      { name: 'Ajmer', district: 'Ajmer' },
      { name: 'Bhilwara', district: 'Bhilwara' },
      { name: 'Alwar', district: 'Alwar' },
      { name: 'Sikar', district: 'Sikar' },
      { name: 'Pali', district: 'Pali' },
      { name: 'Bharatpur', district: 'Bharatpur' },
      { name: 'Sri Ganganagar', district: 'Sri Ganganagar' },
      { name: 'Hanumangarh', district: 'Hanumangarh' },
      { name: 'Beawar', district: 'Beawar' },
      { name: 'Kishangarh', district: 'Ajmer' }
    ]
  },
  {
    state: 'Punjab',
    region: 'North India',
    cities: [
      { name: 'Ludhiana', district: 'Ludhiana' },
      { name: 'Amritsar', district: 'Amritsar' },
      { name: 'Jalandhar', district: 'Jalandhar' },
      { name: 'Patiala', district: 'Patiala' },
      { name: 'Bathinda', district: 'Bathinda' },
      { name: 'Mohali', district: 'SAS Nagar' },
      { name: 'Hoshiarpur', district: 'Hoshiarpur' },
      { name: 'Pathankot', district: 'Pathankot' },
      { name: 'Moga', district: 'Moga' },
      { name: 'Abohar', district: 'Fazilka' },
      { name: 'Malerkotla', district: 'Malerkotla' },
      { name: 'Khanna', district: 'Ludhiana' },
      { name: 'Phagwara', district: 'Kapurthala' },
      { name: 'Muktsar', district: 'Sri Muktsar Sahib' }
    ]
  },
  {
    state: 'Kerala',
    region: 'South India',
    cities: [
      { name: 'Kochi', district: 'Ernakulam' },
      { name: 'Thiruvananthapuram', district: 'Thiruvananthapuram' },
      { name: 'Kozhikode', district: 'Kozhikode' },
      { name: 'Thrissur', district: 'Thrissur' },
      { name: 'Kollam', district: 'Kollam' },
      { name: 'Palakkad', district: 'Palakkad' },
      { name: 'Alappuzha', district: 'Alappuzha' },
      { name: 'Kannur', district: 'Kannur' },
      { name: 'Kottayam', district: 'Kottayam' },
      { name: 'Manjeri', district: 'Malappuram' },
      { name: 'Thalassery', district: 'Kannur' },
      { name: 'Ponnani', district: 'Malappuram' },
      { name: 'Vatakara', district: 'Kozhikode' },
      { name: 'Kayamkulam', district: 'Alappuzha' },
      { name: 'Perinthalmanna', district: 'Malappuram' }
    ]
  },
  {
    state: 'Andhra Pradesh',
    region: 'South India',
    cities: [
      { name: 'Visakhapatnam', district: 'Visakhapatnam' },
      { name: 'Vijayawada', district: 'NTR' },
      { name: 'Guntur', district: 'Guntur' },
      { name: 'Nellore', district: 'SPSR Nellore' },
      { name: 'Kurnool', district: 'Kurnool' },
      { name: 'Rajahmundry', district: 'East Godavari' },
      { name: 'Tirupati', district: 'Tirupati' },
      { name: 'Kakinada', district: 'Kakinada' },
      { name: 'Kadapa', district: 'YSR Kadapa' },
      { name: 'Anantapur', district: 'Anantapur' },
      { name: 'Vizianagaram', district: 'Vizianagaram' },
      { name: 'Eluru', district: 'Eluru' },
      { name: 'Ongole', district: 'Prakasam' },
      { name: 'Nandyal', district: 'Nandyal' },
      { name: 'Machilipatnam', district: 'Krishna' },
      { name: 'Tenali', district: 'Guntur' },
      { name: 'Proddatur', district: 'YSR Kadapa' },
      { name: 'Hindupur', district: 'Sri Sathya Sai' }
    ]
  },
  {
    state: 'Madhya Pradesh',
    region: 'Central India',
    cities: [
      { name: 'Indore', district: 'Indore' },
      { name: 'Bhopal', district: 'Bhopal' },
      { name: 'Jabalpur', district: 'Jabalpur' },
      { name: 'Gwalior', district: 'Gwalior' },
      { name: 'Ujjain', district: 'Ujjain' },
      { name: 'Sagar', district: 'Sagar' },
      { name: 'Dewas', district: 'Dewas' },
      { name: 'Satna', district: 'Satna' },
      { name: 'Ratlam', district: 'Ratlam' },
      { name: 'Rewa', district: 'Rewa' },
      { name: 'Murwara (Katni)', district: 'Katni' },
      { name: 'Singrauli', district: 'Singrauli' },
      { name: 'Burhanpur', district: 'Burhanpur' },
      { name: 'Khandwa', district: 'Khandwa' },
      { name: 'Bhind', district: 'Bhind' },
      { name: 'Chhindwara', district: 'Chhindwara' },
      { name: 'Guna', district: 'Guna' },
      { name: 'Shivpuri', district: 'Shivpuri' },
      { name: 'Vidisha', district: 'Vidisha' }
    ]
  },
  {
    state: 'Bihar',
    region: 'East India',
    cities: [
      { name: 'Patna', district: 'Patna' },
      { name: 'Gaya', district: 'Gaya' },
      { name: 'Bhagalpur', district: 'Bhagalpur' },
      { name: 'Muzaffarpur', district: 'Muzaffarpur' },
      { name: 'Darbhanga', district: 'Darbhanga' },
      { name: 'Purnia', district: 'Purnia' },
      { name: 'Bihar Sharif', district: 'Nalanda' },
      { name: 'Arrah', district: 'Bhojpur' },
      { name: 'Begusarai', district: 'Begusarai' },
      { name: 'Katihar', district: 'Katihar' },
      { name: 'Munger', district: 'Munger' },
      { name: 'Chhapra', district: 'Saran' },
      { name: 'Danapur', district: 'Patna' },
      { name: 'Bettiah', district: 'West Champaran' },
      { name: 'Saharsa', district: 'Saharsa' },
      { name: 'Sasaram', district: 'Rohtas' },
      { name: 'Hajipur', district: 'Vaishali' },
      { name: 'Dehri', district: 'Rohtas' }
    ]
  },
  {
    state: 'Odisha',
    region: 'East India',
    cities: [
      { name: 'Bhubaneswar', district: 'Khurda' },
      { name: 'Cuttack', district: 'Cuttack' },
      { name: 'Rourkela', district: 'Sundargarh' },
      { name: 'Berhampur', district: 'Ganjam' },
      { name: 'Sambalpur', district: 'Sambalpur' },
      { name: 'Puri', district: 'Puri' },
      { name: 'Balasore', district: 'Balasore' },
      { name: 'Bhadrak', district: 'Bhadrak' },
      { name: 'Baripada', district: 'Mayurbhanj' },
      { name: 'Jharsuguda', district: 'Jharsuguda' },
      { name: 'Jeypore', district: 'Koraput' }
    ]
  },
  {
    state: 'Assam',
    region: 'North-East India',
    cities: [
      { name: 'Guwahati', district: 'Kamrup Metropolitan' },
      { name: 'Silchar', district: 'Cachar' },
      { name: 'Dibrugarh', district: 'Dibrugarh' },
      { name: 'Jorhat', district: 'Jorhat' },
      { name: 'Nagaon', district: 'Nagaon' },
      { name: 'Tinsukia', district: 'Tinsukia' },
      { name: 'Tezpur', district: 'Sonitpur' },
      { name: 'Bongaigaon', district: 'Bongaigaon' },
      { name: 'Diphu', district: 'Karbi Anglong' },
      { name: 'Sivasagar', district: 'Sivasagar' }
    ]
  },
  {
    state: 'Haryana',
    region: 'North India',
    cities: [
      { name: 'Faridabad', district: 'Faridabad' },
      { name: 'Gurugram', district: 'Gurugram' },
      { name: 'Panipat', district: 'Panipat' },
      { name: 'Ambala', district: 'Ambala' },
      { name: 'Yamunanagar', district: 'Yamunanagar' },
      { name: 'Rohtak', district: 'Rohtak' },
      { name: 'Hisar', district: 'Hisar' },
      { name: 'Karnal', district: 'Karnal' },
      { name: 'Sonipat', district: 'Sonipat' },
      { name: 'Panchkula', district: 'Panchkula' },
      { name: 'Bhiwani', district: 'Bhiwani' },
      { name: 'Sirsa', district: 'Sirsa' },
      { name: 'Bahadurgarh', district: 'Jhajjar' },
      { name: 'Jind', district: 'Jind' },
      { name: 'Thanesar (Kurukshetra)', district: 'Kurukshetra' },
      { name: 'Kaithal', district: 'Kaithal' },
      { name: 'Rewari', district: 'Rewari' }
    ]
  },
  {
    state: 'Chandigarh (UT)',
    region: 'North India',
    cities: [
      { name: 'Chandigarh', district: 'Chandigarh' }
    ]
  },
  {
    state: 'Jharkhand',
    region: 'East India',
    cities: [
      { name: 'Ranchi', district: 'Ranchi' },
      { name: 'Jamshedpur', district: 'East Singhbhum' },
      { name: 'Dhanbad', district: 'Dhanbad' },
      { name: 'Bokaro Steel City', district: 'Bokaro' },
      { name: 'Deoghar', district: 'Deoghar' },
      { name: 'Hazaribagh', district: 'Hazaribagh' },
      { name: 'Giridih', district: 'Giridih' },
      { name: 'Ramgarh', district: 'Ramgarh' },
      { name: 'Medininagar (Daltonganj)', district: 'Palamu' }
    ]
  },
  {
    state: 'Chhattisgarh',
    region: 'Central India',
    cities: [
      { name: 'Raipur', district: 'Raipur' },
      { name: 'Bhilai-Durg', district: 'Durg' },
      { name: 'Bilaspur', district: 'Bilaspur' },
      { name: 'Korba', district: 'Korba' },
      { name: 'Rajnandgaon', district: 'Rajnandgaon' },
      { name: 'Raigarh', district: 'Raigarh' },
      { name: 'Jagdalpur', district: 'Bastar' },
      { name: 'Ambikapur', district: 'Surguja' }
    ]
  },
  {
    state: 'Uttarakhand',
    region: 'North India',
    cities: [
      { name: 'Dehradun', district: 'Dehradun' },
      { name: 'Haridwar', district: 'Haridwar' },
      { name: 'Roorkee', district: 'Haridwar' },
      { name: 'Haldwani', district: 'Nainital' },
      { name: 'Rudrapur', district: 'Udham Singh Nagar' },
      { name: 'Kashipur', district: 'Udham Singh Nagar' },
      { name: 'Rishikesh', district: 'Dehradun' },
      { name: 'Nainital', district: 'Nainital' }
    ]
  },
  {
    state: 'Himachal Pradesh',
    region: 'North India',
    cities: [
      { name: 'Shimla', district: 'Shimla' },
      { name: 'Dharamshala', district: 'Kangra' },
      { name: 'Solan', district: 'Solan' },
      { name: 'Mandi', district: 'Mandi' },
      { name: 'Baddi', district: 'Solan' },
      { name: 'Kullu', district: 'Kullu' },
      { name: 'Hamirpur', district: 'Hamirpur' }
    ]
  },
  {
    state: 'Jammu & Kashmir (UT)',
    region: 'North India',
    cities: [
      { name: 'Srinagar', district: 'Srinagar' },
      { name: 'Jammu', district: 'Jammu' },
      { name: 'Anantnag', district: 'Anantnag' },
      { name: 'Baramulla', district: 'Baramulla' },
      { name: 'Udhampur', district: 'Udhampur' },
      { name: 'Kathua', district: 'Kathua' }
    ]
  },
  {
    state: 'Goa',
    region: 'West India',
    cities: [
      { name: 'Panaji', district: 'North Goa' },
      { name: 'Margao', district: 'South Goa' },
      { name: 'Vasco da Gama', district: 'South Goa' },
      { name: 'Mapusa', district: 'North Goa' },
      { name: 'Ponda', district: 'South Goa' }
    ]
  }
];

// Helper: Get unique sorted districts for a given state (or all states if 'All States')
export const getDistrictsForState = (stateName) => {
  if (!stateName || stateName === 'All States') {
    const all = new Set();
    STATES_AND_CITIES.forEach(st => {
      st.cities.forEach(c => all.add(c.district));
    });
    return Array.from(all).sort();
  }

  const found = STATES_AND_CITIES.find(s => s.state === stateName);
  if (!found) return [];
  const districts = new Set(found.cities.map(c => c.district));
  return Array.from(districts).sort();
};

// Helper: Get all unique districts
export const getAllDistricts = () => {
  const all = new Set();
  STATES_AND_CITIES.forEach(st => {
    st.cities.forEach(c => all.add(c.district));
  });
  return Array.from(all).sort();
};

// Location Matching Engine: Calculates proximity compatibility between user & candidate
export const calculateLocationMatch = (userLoc, candidateLoc) => {
  if (!candidateLoc) {
    return {
      matchPercent: 70,
      type: 'pan_india',
      label: 'Pan-India Match',
      shortLabel: 'Pan-India',
      badge: 'Pan-India',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
      isSameDistrict: false,
      isSameState: false,
      distanceApprox: 'National',
      description: 'Open to Pan-India matrimony matches'
    };
  }

  const uDist = (userLoc?.district || '').trim().toLowerCase();
  const cDist = (candidateLoc?.district || '').trim().toLowerCase();
  const uState = (userLoc?.state || '').trim().toLowerCase();
  const cState = (candidateLoc?.state || '').trim().toLowerCase();

  const cDistName = candidateLoc?.district || candidateLoc?.city || 'Local';
  const cStateName = candidateLoc?.state || 'State';

  // Same District Match (Highest compatibility)
  if (uDist && cDist && uDist === cDist) {
    return {
      matchPercent: 100,
      type: 'same_district',
      label: 'Same District Match',
      shortLabel: 'Same District',
      badge: `📍 Same District (${cDistName})`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dotClass: 'bg-emerald-500',
      isSameDistrict: true,
      isSameState: true,
      distanceApprox: '0 - 45 km',
      description: `Both based in ${cDistName} • Ideal for local family meetings & traditional ceremonies.`
    };
  }

  // Same State Match (High compatibility)
  if (uState && cState && uState === cState) {
    return {
      matchPercent: 88,
      type: 'same_state',
      label: 'Same State Match',
      shortLabel: 'Same State',
      badge: `📍 Same State (${cDistName})`,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
      dotClass: 'bg-blue-500',
      isSameDistrict: false,
      isSameState: true,
      distanceApprox: 'Inter-district (Within State)',
      description: `Both from ${cStateName} (${cDistName}) • Shared regional culture & traditions.`
    };
  }

  // Interstate / Pan-India Match
  return {
    matchPercent: 72,
    type: 'interstate',
    label: 'Interstate Match',
    shortLabel: 'Interstate',
    badge: `📍 ${cDistName}, ${cStateName}`,
    badgeClass: 'bg-amber-50 text-[#8C6D1F] border-amber-300',
    dotClass: 'bg-[#D4AF37]',
    isSameDistrict: false,
    isSameState: false,
    distanceApprox: 'Interstate',
    description: `Pan-India connection in ${cDistName}, ${cStateName}.`
  };
};

// Flat helper to search cities across districts
export const getAllCities = () => {
  const list = [];
  STATES_AND_CITIES.forEach(st => {
    st.cities.forEach(c => {
      list.push({
        city: c.name,
        district: c.district,
        state: st.state,
        region: st.region,
        label: `${c.name}, ${st.state} (${c.district} Dist.)`
      });
    });
  });
  return list;
};
