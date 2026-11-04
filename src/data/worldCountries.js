// Complete standardized dataset of world countries with flags and aliases
// Includes the curated TOP_100_WORLD_COUNTRIES (starting with top NRI destinations first)
// plus full worldwide sovereign coverage for NRI matrimonial filtering.

import { normalizeCountry, getProfileCountry, isNriProfile } from './locationData.js';

// Curated Top 100 World Countries (prioritizing Top NRI destinations first, then major global hubs)
export const TOP_100_WORLD_COUNTRIES = [
  // ── Top 33 NRI Destinations ──
  { name: 'United States (USA)', code: 'US', flag: '🇺🇸', aliases: ['USA', 'US', 'America', 'United States', 'New York', 'California', 'Texas', 'Chicago', 'Seattle', 'Florida'], popular: true },
  { name: 'United Arab Emirates (UAE)', code: 'AE', flag: '🇦🇪', aliases: ['UAE', 'Emirates', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'], popular: true },
  { name: 'United Kingdom (UK)', code: 'GB', flag: '🇬🇧', aliases: ['UK', 'Britain', 'England', 'London', 'Scotland', 'Wales', 'Manchester', 'Birmingham'], popular: true },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', aliases: ['CA', 'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'], popular: true },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', aliases: ['AU', 'Aussie', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'], popular: true },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', aliases: ['SA', 'KSA', 'Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina'], popular: true },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', aliases: ['QA', 'Doha', 'Al Rayyan'], popular: true },
  { name: 'Oman', code: 'OM', flag: '🇴🇲', aliases: ['OM', 'Muscat', 'Salalah', 'Sohar'], popular: true },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼', aliases: ['KW', 'Kuwait City', 'Salmiya'], popular: true },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', aliases: ['BH', 'Manama'], popular: true },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', aliases: ['DE', 'Deutschland', 'Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Stuttgart'], popular: true },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', aliases: ['IE', 'Dublin', 'Cork', 'Galway', 'Limerick'], popular: true },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', aliases: ['NZ', 'Auckland', 'Wellington', 'Christchurch', 'Hamilton'], popular: true },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', aliases: ['SG'], popular: true },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', aliases: ['MY', 'Kuala Lumpur', 'Penang', 'Johor'], popular: true },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', aliases: ['IT', 'Rome', 'Milan', 'Florence', 'Venice', 'Turin'], popular: true },
  { name: 'France', code: 'FR', flag: '🇫🇷', aliases: ['FR', 'Paris', 'Lyon', 'Marseille'], popular: true },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', aliases: ['CH', 'Swiss', 'Zurich', 'Geneva', 'Basel', 'Bern'], popular: true },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', aliases: ['NL', 'Holland', 'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'], popular: true },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', aliases: ['Stockholm', 'Gothenburg', 'Malmo'], popular: true },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', aliases: ['Oslo', 'Bergen', 'Stavanger'], popular: true },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', aliases: ['Copenhagen'], popular: true },
  { name: 'Finland', code: 'FI', flag: '🇫🇮', aliases: ['Helsinki'], popular: true },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', aliases: ['JP', 'Tokyo', 'Osaka', 'Kyoto', 'Yokohama'], popular: true },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', aliases: ['KR', 'Korea', 'Seoul', 'Busan'], popular: true },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', aliases: ['Tel Aviv', 'Jerusalem'], popular: true },
  { name: 'Malta', code: 'MT', flag: '🇲🇹', aliases: ['Valletta'], popular: true },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', aliases: ['Warsaw', 'Krakow', 'Wroclaw'], popular: true },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', aliases: ['Vienna'], popular: true },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', aliases: ['Brussels'], popular: true },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', aliases: ['ES', 'Madrid', 'Barcelona', 'Valencia'], popular: true },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', aliases: ['Lisbon', 'Porto'], popular: true },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', aliases: ['ZA', 'Johannesburg', 'Cape Town', 'Durban'], popular: true },

  // ── Remaining 67 Major Global Countries (Alphabetical) ──
  { name: 'Afghanistan', code: 'AF', flag: '🇦🇫', aliases: ['Kabul'] },
  { name: 'Albania', code: 'AL', flag: '🇦🇱', aliases: ['Tirana'] },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿', aliases: ['Algiers'] },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', aliases: ['Buenos Aires'] },
  { name: 'Armenia', code: 'AM', flag: '🇦🇲', aliases: ['Yerevan'] },
  { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', aliases: ['Baku'] },
  { name: 'Bahamas', code: 'BS', flag: '🇧🇸', aliases: ['Nassau'] },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', aliases: ['BD', 'Dhaka'] },
  { name: 'Barbados', code: 'BB', flag: '🇧🇧', aliases: ['Bridgetown'] },
  { name: 'Belarus', code: 'BY', flag: '🇧🇾', aliases: ['Minsk'] },
  { name: 'Belize', code: 'BZ', flag: '🇧🇿', aliases: [] },
  { name: 'Bhutan', code: 'BT', flag: '🇧🇹', aliases: ['Thimphu'] },
  { name: 'Bolivia', code: 'BO', flag: '🇧🇴', aliases: ['La Paz'] },
  { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦', aliases: ['Sarajevo'] },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', aliases: ['Brasil', 'Sao Paulo', 'Rio'] },
  { name: 'Brunei', code: 'BN', flag: '🇧🇳', aliases: [] },
  { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', aliases: ['Sofia'] },
  { name: 'Cambodia', code: 'KH', flag: '🇰🇭', aliases: ['Phnom Penh'] },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', aliases: ['Santiago'] },
  { name: 'China', code: 'CN', flag: '🇨🇳', aliases: ['CN', 'Beijing', 'Shanghai'] },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', aliases: ['Bogota'] },
  { name: 'Costa Rica', code: 'CR', flag: '🇨🇷', aliases: ['San Jose'] },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', aliases: ['Zagreb'] },
  { name: 'Cyprus', code: 'CY', flag: '🇨🇾', aliases: ['Nicosia'] },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', aliases: ['Czechia', 'Prague'] },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', aliases: ['Cairo'] },
  { name: 'Estonia', code: 'EE', flag: '🇪🇪', aliases: ['Tallinn'] },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', aliases: ['Addis Ababa'] },
  { name: 'Fiji', code: 'FJ', flag: '🇫🇯', aliases: ['Suva'] },
  { name: 'Georgia', code: 'GE', flag: '🇬🇪', aliases: ['Tbilisi'] },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', aliases: ['Accra'] },
  { name: 'Greece', code: 'GR', flag: '🇬🇷', aliases: ['Athens'] },
  { name: 'Guyana', code: 'GY', flag: '🇬🇾', aliases: ['Georgetown'] },
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰', aliases: ['HK'], popular: true },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺', aliases: ['Budapest'] },
  { name: 'Iceland', code: 'IS', flag: '🇮🇸', aliases: ['Reykjavik'] },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', aliases: ['Jakarta', 'Bali'] },
  { name: 'Iran', code: 'IR', flag: '🇮🇷', aliases: ['Tehran'] },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', aliases: ['Kingston'] },
  { name: 'Jordan', code: 'JO', flag: '🇯🇴', aliases: ['Amman'] },
  { name: 'Kazakhstan', code: 'KZ', flag: '🇰🇿', aliases: ['Almaty'] },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', aliases: ['Nairobi'] },
  { name: 'Latvia', code: 'LV', flag: '🇱🇻', aliases: ['Riga'] },
  { name: 'Lebanon', code: 'LB', flag: '🇱🇧', aliases: ['Beirut'] },
  { name: 'Lithuania', code: 'LT', flag: '🇱🇹', aliases: ['Vilnius'] },
  { name: 'Luxembourg', code: 'LU', flag: '🇱🇺', aliases: [] },
  { name: 'Maldives', code: 'MV', flag: '🇲🇻', aliases: ['Male'] },
  { name: 'Mauritius', code: 'MU', flag: '🇲🇺', aliases: ['Port Louis'], popular: true },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', aliases: ['Mexico City'] },
  { name: 'Monaco', code: 'MC', flag: '🇲🇨', aliases: ['Monte Carlo'] },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', aliases: ['Casablanca'] },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵', aliases: ['Kathmandu'] },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', aliases: ['Lagos'] },
  { name: 'Panama', code: 'PA', flag: '🇵🇦', aliases: ['Panama City'] },
  { name: 'Peru', code: 'PE', flag: '🇵🇪', aliases: ['Lima'] },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', aliases: ['Manila'] },
  { name: 'Romania', code: 'RO', flag: '🇷🇴', aliases: ['Bucharest'] },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', aliases: ['Moscow'] },
  { name: 'Rwanda', code: 'RW', flag: '🇷🇼', aliases: ['Kigali'] },
  { name: 'Seychelles', code: 'SC', flag: '🇸🇨', aliases: ['Victoria'] },
  { name: 'Slovakia', code: 'SK', flag: '🇸🇰', aliases: ['Bratislava'] },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮', aliases: ['Ljubljana'] },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', aliases: ['Colombo'] },
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼', aliases: ['Taipei'] },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', aliases: ['Dar es Salaam'] },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', aliases: ['Bangkok'] },
  { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹', aliases: ['Port of Spain'] },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', aliases: ['Istanbul'] },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', aliases: ['Kampala'] },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', aliases: ['Kyiv'] },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', aliases: ['Montevideo'] },
  { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', aliases: ['Tashkent'] },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', aliases: ['Hanoi'] },
  { name: 'Zambia', code: 'ZM', flag: '🇿🇲', aliases: ['Lusaka'] },
  { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', aliases: ['Harare'] }
];

// Full worldwide list
export const WORLD_COUNTRIES = [
  ...TOP_100_WORLD_COUNTRIES,
  { name: 'Andorra', code: 'AD', flag: '🇦🇩', aliases: [] },
  { name: 'Angola', code: 'AO', flag: '🇦🇴', aliases: ['Luanda'] },
  { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬', aliases: [] },
  { name: 'Benin', code: 'BJ', flag: '🇧🇯', aliases: [] },
  { name: 'Burkina Faso', code: 'BF', flag: '🇧🇫', aliases: [] },
  { name: 'Burundi', code: 'BI', flag: '🇧🇮', aliases: [] },
  { name: 'Cabo Verde', code: 'CV', flag: '🇨🇻', aliases: ['Cape Verde'] },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲', aliases: [] },
  { name: 'Central African Republic', code: 'CF', flag: '🇨🇫', aliases: [] },
  { name: 'Chad', code: 'TD', flag: '🇹🇩', aliases: [] },
  { name: 'Comoros', code: 'KM', flag: '🇰🇲', aliases: [] },
  { name: 'Congo (Republic of the)', code: 'CG', flag: '🇨🇬', aliases: ['Brazzaville'] },
  { name: 'Cuba', code: 'CU', flag: '🇨🇺', aliases: ['Havana'] },
  { name: 'Democratic Republic of the Congo', code: 'CD', flag: '🇨🇩', aliases: ['DRC', 'Kinshasa'] },
  { name: 'Djibouti', code: 'DJ', flag: '🇩🇯', aliases: [] },
  { name: 'Dominica', code: 'DM', flag: '🇩🇲', aliases: [] },
  { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴', aliases: ['Santo Domingo'] },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', aliases: ['Quito'] },
  { name: 'El Salvador', code: 'SV', flag: '🇸🇻', aliases: ['San Salvador'] },
  { name: 'Equatorial Guinea', code: 'GQ', flag: '🇬🇶', aliases: [] },
  { name: 'Eritrea', code: 'ER', flag: '🇪🇷', aliases: ['Asmara'] },
  { name: 'Eswatini', code: 'SZ', flag: '🇸🇿', aliases: ['Swaziland'] },
  { name: 'Gabon', code: 'GA', flag: '🇬🇦', aliases: ['Libreville'] },
  { name: 'Gambia', code: 'GM', flag: '🇬🇲', aliases: ['Banjul'] },
  { name: 'Grenada', code: 'GD', flag: '🇬🇩', aliases: [] },
  { name: 'Guatemala', code: 'GT', flag: '🇬🇹', aliases: [] },
  { name: 'Guinea', code: 'GN', flag: '🇬🇳', aliases: ['Conakry'] },
  { name: 'Guinea-Bissau', code: 'GW', flag: '🇬🇼', aliases: [] },
  { name: 'Haiti', code: 'HT', flag: '🇭🇹', aliases: ['Port-au-Prince'] },
  { name: 'Honduras', code: 'HN', flag: '🇭🇳', aliases: ['Tegucigalpa'] },
  { name: 'India', code: 'IN', flag: '🇮🇳', aliases: ['IN', 'Bharat', 'Hindustan'] },
  { name: 'Iraq', code: 'IQ', flag: '🇮🇶', aliases: ['Baghdad'] },
  { name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', aliases: ["Cote d'Ivoire", 'Abidjan'] },
  { name: 'Kiribati', code: 'KI', flag: '🇰🇮', aliases: [] },
  { name: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬', aliases: ['Bishkek'] },
  { name: 'Laos', code: 'LA', flag: '🇱🇦', aliases: ['Vientiane'] },
  { name: 'Lesotho', code: 'LS', flag: '🇱🇸', aliases: ['Maseru'] },
  { name: 'Liberia', code: 'LR', flag: '🇱🇷', aliases: ['Monrovia'] },
  { name: 'Libya', code: 'LY', flag: '🇱🇾', aliases: ['Tripoli'] },
  { name: 'Liechtenstein', code: 'LI', flag: '🇱🇮', aliases: ['Vaduz'] },
  { name: 'Madagascar', code: 'MG', flag: '🇲🇬', aliases: ['Antananarivo'] },
  { name: 'Malawi', code: 'MW', flag: '🇲🇼', aliases: ['Lilongwe'] },
  { name: 'Mali', code: 'ML', flag: '🇲🇱', aliases: ['Bamako'] },
  { name: 'Marshall Islands', code: 'MH', flag: '🇲🇭', aliases: ['Majuro'] },
  { name: 'Mauritania', code: 'MR', flag: '🇲🇷', aliases: ['Nouakchott'] },
  { name: 'Micronesia', code: 'FM', flag: '🇫🇲', aliases: ['Palikir'] },
  { name: 'Moldova', code: 'MD', flag: '🇲🇩', aliases: ['Chisinau'] },
  { name: 'Mongolia', code: 'MN', flag: '🇲🇳', aliases: ['Ulaanbaatar'] },
  { name: 'Montenegro', code: 'ME', flag: '🇲🇪', aliases: ['Podgorica'] },
  { name: 'Mozambique', code: 'MZ', flag: '🇲🇿', aliases: ['Maputo'] },
  { name: 'Myanmar', code: 'MM', flag: '🇲🇲', aliases: ['Burma', 'Yangon'] },
  { name: 'Namibia', code: 'NA', flag: '🇳🇦', aliases: ['Windhoek'] },
  { name: 'Nauru', code: 'NR', flag: '🇳🇷', aliases: ['Yaren'] },
  { name: 'Nicaragua', code: 'NI', flag: '🇳🇮', aliases: ['Managua'] },
  { name: 'Niger', code: 'NE', flag: '🇳🇪', aliases: ['Niamey'] },
  { name: 'North Korea', code: 'KP', flag: '🇰🇵', aliases: ['Pyongyang'] },
  { name: 'North Macedonia', code: 'MK', flag: '🇲🇰', aliases: ['Skopje', 'Macedonia'] },
  { name: 'Palau', code: 'PW', flag: '🇵🇼', aliases: [] },
  { name: 'Palestine', code: 'PS', flag: '🇵🇸', aliases: ['Ramallah', 'Gaza', 'West Bank'] },
  { name: 'Papua New Guinea', code: 'PG', flag: '🇵🇬', aliases: ['Port Moresby'] },
  { name: 'Paraguay', code: 'PY', flag: '🇵🇾', aliases: ['Asuncion'] },
  { name: 'Saint Kitts and Nevis', code: 'KN', flag: '🇰🇳', aliases: [] },
  { name: 'Saint Lucia', code: 'LC', flag: '🇱🇨', aliases: [] },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', flag: '🇻🇨', aliases: [] },
  { name: 'Samoa', code: 'WS', flag: '🇼🇸', aliases: ['Apia'] },
  { name: 'San Marino', code: 'SM', flag: '🇸🇲', aliases: [] },
  { name: 'Sao Tome and Principe', code: 'ST', flag: '🇸🇹', aliases: [] },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', aliases: ['Dakar'] },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', aliases: ['Belgrade'] },
  { name: 'Sierra Leone', code: 'SL', flag: '🇸🇱', aliases: ['Freetown'] },
  { name: 'Solomon Islands', code: 'SB', flag: '🇸🇧', aliases: ['Honiara'] },
  { name: 'Somalia', code: 'SO', flag: '🇸🇴', aliases: ['Mogadishu'] },
  { name: 'South Sudan', code: 'SS', flag: '🇸🇸', aliases: ['Juba'] },
  { name: 'Sudan', code: 'SD', flag: '🇸🇩', aliases: ['Khartoum'] },
  { name: 'Suriname', code: 'SR', flag: '🇸🇷', aliases: ['Paramaribo'] },
  { name: 'Syria', code: 'SY', flag: '🇸🇾', aliases: ['Damascus'] },
  { name: 'Tajikistan', code: 'TJ', flag: '🇹🇯', aliases: ['Dushanbe'] },
  { name: 'Timor-Leste', code: 'TL', flag: '🇹🇱', aliases: ['East Timor', 'Dili'] },
  { name: 'Togo', code: 'TG', flag: '🇹🇬', aliases: ['Lome'] },
  { name: 'Tonga', code: 'TO', flag: '🇹🇴', aliases: ['Nukuʻalofa'] },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', aliases: ['Tunis'] },
  { name: 'Turkmenistan', code: 'TM', flag: '🇹🇲', aliases: ['Ashgabat'] },
  { name: 'Tuvalu', code: 'TV', flag: '🇹🇻', aliases: ['Funafuti'] },
  { name: 'Vanuatu', code: 'VU', flag: '🇻🇺', aliases: ['Port Vila'] },
  { name: 'Vatican City', code: 'VA', flag: '🇻🇦', aliases: ['Holy See', 'Rome'] },
  { name: 'Venezuela', code: 'VE', flag: '🇻🇪', aliases: ['Caracas'] },
  { name: 'Yemen', code: 'YE', flag: '🇾🇪', aliases: ['Sanaa'] }
];

export const POPULAR_NRI_COUNTRIES = TOP_100_WORLD_COUNTRIES.filter(c => c.popular && c.code !== 'IN');

// Helper to look up country by name, code or alias
export const findCountryByName = (val) => {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().toLowerCase();
  
  // Exact name or code match in Top 100 first, then all
  const direct = TOP_100_WORLD_COUNTRIES.find(c => 
    c.name.toLowerCase() === clean || 
    c.code.toLowerCase() === clean
  ) || WORLD_COUNTRIES.find(c => 
    c.name.toLowerCase() === clean || 
    c.code.toLowerCase() === clean
  );
  if (direct) return direct;

  // Normalized country check
  const norm = normalizeCountry(val).toLowerCase();
  const byNorm = TOP_100_WORLD_COUNTRIES.find(c => 
    c.name.toLowerCase() === norm || 
    c.code.toLowerCase() === norm ||
    (norm === 'usa' && c.code === 'US') ||
    (norm === 'uae' && c.code === 'AE') ||
    (norm === 'uk' && c.code === 'GB')
  ) || WORLD_COUNTRIES.find(c => 
    c.name.toLowerCase() === norm || 
    c.code.toLowerCase() === norm ||
    (norm === 'usa' && c.code === 'US') ||
    (norm === 'uae' && c.code === 'AE') ||
    (norm === 'uk' && c.code === 'GB')
  );
  if (byNorm) return byNorm;

  // Check aliases
  const byAlias = TOP_100_WORLD_COUNTRIES.find(c => 
    c.aliases.some(a => a.toLowerCase() === clean || clean.includes(a.toLowerCase()))
  ) || WORLD_COUNTRIES.find(c => 
    c.aliases.some(a => a.toLowerCase() === clean || clean.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  // Partial name match
  return TOP_100_WORLD_COUNTRIES.find(c => c.name.toLowerCase().includes(clean)) || 
         WORLD_COUNTRIES.find(c => c.name.toLowerCase().includes(clean)) || null;
};

// Check if a profile matches a target country filter
export const isCountryMatch = (profile, targetCountry) => {
  if (!profile || !targetCountry) return true;
  if (targetCountry === 'All Profiles' || targetCountry === 'All') return true;

  if (targetCountry === 'India') {
    return !isNriProfile(profile);
  }

  if (targetCountry === 'Working Abroad (NRI)' || targetCountry === 'Abroad (NRI)' || targetCountry === 'Abroad / Any NRI') {
    return isNriProfile(profile);
  }

  // Look up country object
  const countryObj = findCountryByName(targetCountry);
  const targetNorm = normalizeCountry(targetCountry).toLowerCase();
  const targetName = countryObj ? countryObj.name.toLowerCase() : targetCountry.toLowerCase();
  const targetCode = countryObj ? countryObj.code.toLowerCase() : '';
  const aliases = (countryObj?.aliases || []).map(a => a.toLowerCase());

  // Candidate country data
  const candCountry = (profile.country || profile.work_country || profile.workCountry || '').toLowerCase();
  const candCity = (profile.work_city || profile.workCity || profile.city || profile.district || '').toLowerCase();
  const candJob = (profile.jobLocation || profile.jobPlace || profile.workLocation || '').toLowerCase();
  const candNorm = normalizeCountry(getProfileCountry(profile)).toLowerCase();

  // If candidate is India and target is abroad, return false
  if (candNorm === 'india' && !isNriProfile(profile)) {
    return false;
  }

  // 1. Direct or normalized match
  if (candNorm === targetNorm || candNorm === targetName) return true;

  // 2. Candidate country field includes target name or vice versa
  if (candCountry && (candCountry.includes(targetName) || targetName.includes(candCountry))) return true;

  // 3. Code match
  if (targetCode && (candCountry === targetCode || candNorm === targetCode)) return true;

  // 4. Aliases
  for (const alias of aliases) {
    if (candCountry.includes(alias) || candJob.includes(alias) || candCity.includes(alias) || candNorm.includes(alias)) {
      return true;
    }
  }

  // 5. Job location or raw string search
  if (candJob.includes(targetName) || candJob.includes(targetNorm)) return true;

  return false;
};

// Filter top 100 countries based on user search query (returns all 100 when query is empty)
export const searchWorldCountries = (query = '', { excludeIndia = true } = {}) => {
  const q = query.trim().toLowerCase();
  let list = TOP_100_WORLD_COUNTRIES;
  if (excludeIndia) {
    list = list.filter(c => c.code !== 'IN');
  }

  if (!q) {
    // When no search query, return the entire Top 100 list (Top NRI destinations first!)
    return list;
  }

  // When searching, search Top 100 first, and include any worldwide match if not in top 100
  const matchesTop100 = list.filter(c => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.code.toLowerCase() === q) return true;
    return c.aliases.some(a => a.toLowerCase().includes(q));
  });

  if (matchesTop100.length > 0) {
    return matchesTop100.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return 0;
    });
  }

  // Fallback to broader worldwide list
  const extraList = WORLD_COUNTRIES.filter(c => excludeIndia ? c.code !== 'IN' : true);
  return extraList.filter(c => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.code.toLowerCase() === q) return true;
    return c.aliases.some(a => a.toLowerCase().includes(q));
  });
};
