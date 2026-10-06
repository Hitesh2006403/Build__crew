// backend/services/ingestion/geoClassifier.js

export const KARNATAKA_DISTRICTS = [
  "Bagalkot",
  "Ballari",
  "Belagavi",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Bidar",
  "Chamarajanagar",
  "Chikkaballapur",
  "Chikkamagaluru",
  "Chitradurga",
  "Dakshina Kannada",
  "Davanagere",
  "Dharwad",
  "Gadag",
  "Hassan",
  "Haveri",
  "Kalaburagi",
  "Kodagu",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysuru",
  "Raichur",
  "Ramanagara",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  "Uttara Kannada",
  "Vijayanagara",
  "Vijayapura",
  "Yadgir",
];

export const ALL_INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "All-India (Virtual)",
];

const KARNATAKA_DISTRICT_PATTERNS = [
  { match: /\b(bengaluru\s*urban|bangalore\s*urban|bengaluru|bangalore|blr|whitefield|electronic\s*city|koramangala|hsr\s*layout|indiranagar|yelahanka|marathahalli|hebbal|jayanagar|jp\s*nagar|banashankari|malleswaram|rvce|pes\s*university|bmsce|msrit|iisc|iiit-?b)\b/i, district: "Bengaluru Urban" },
  { match: /\b(bengaluru\s*rural|bangalore\s*rural|nelamangala|doddaballapur|devanahalli|hoskote)\b/i, district: "Bengaluru Rural" },
  { match: /\b(mysuru|mysore|sjce|nie\s*mysore|vidyavardhaka)\b/i, district: "Mysuru" },
  { match: /\b(mangaluru|mangalore|dakshina\s*kannada|surathkal|nitk)\b/i, district: "Dakshina Kannada" },
  { match: /\b(manipal|udupi|karkala|kundapura|mahe|mit\s*manipal)\b/i, district: "Udupi" },
  { match: /\b(hubballi|hubli|dharwad|kle\s*tech|bvb)\b/i, district: "Dharwad" },
  { match: /\b(belagavi|belgaum)\b/i, district: "Belagavi" },
  { match: /\b(kalaburagi|gulbarga)\b/i, district: "Kalaburagi" },
  { match: /\b(tumakuru|tumkur|siddaganga)\b/i, district: "Tumakuru" },
  { match: /\b(shivamogga|shimoga)\b/i, district: "Shivamogga" },
  { match: /\b(davanagere|davangere)\b/i, district: "Davanagere" },
  { match: /\b(ballari|bellary)\b/i, district: "Ballari" },
  { match: /\b(vijayapura|bijapur)\b/i, district: "Vijayapura" },
  { match: /\b(hassan)\b/i, district: "Hassan" },
  { match: /\b(kolar)\b/i, district: "Kolar" },
  { match: /\b(mandya)\b/i, district: "Mandya" },
  { match: /\b(chikkamagaluru|chikmagalur)\b/i, district: "Chikkamagaluru" },
  { match: /\b(bagalkot|bagalkote)\b/i, district: "Bagalkot" },
  { match: /\b(bidar)\b/i, district: "Bidar" },
  { match: /\b(chamarajanagar)\b/i, district: "Chamarajanagar" },
  { match: /\b(chikkaballapur)\b/i, district: "Chikkaballapur" },
  { match: /\b(chitradurga)\b/i, district: "Chitradurga" },
  { match: /\b(gadag)\b/i, district: "Gadag" },
  { match: /\b(haveri)\b/i, district: "Haveri" },
  { match: /\b(kodagu|coorg)\b/i, district: "Kodagu" },
  { match: /\b(koppal)\b/i, district: "Koppal" },
  { match: /\b(raichur)\b/i, district: "Raichur" },
  { match: /\b(ramanagara)\b/i, district: "Ramanagara" },
  { match: /\b(uttara\s*kannada|karwar)\b/i, district: "Uttara Kannada" },
  { match: /\b(vijayanagara)\b/i, district: "Vijayanagara" },
  { match: /\b(yadgir)\b/i, district: "Yadgir" },
];

/**
 * Normalizes location and classifies state and district for any hackathon.
 */
export function classifyStateAndDistrict(event = {}) {
  const textBlob = [
    event.location || "",
    event.city || "",
    event.state || "",
    event.title || "",
    event.description || "",
    event.address || "",
    event.venue || "",
  ].join(" ");

  // 1. Check for Karnataka districts
  for (const kd of KARNATAKA_DISTRICT_PATTERNS) {
    if (kd.match.test(textBlob)) {
      return {
        state: "Karnataka",
        district: kd.district,
      };
    }
  }

  // 2. Check for other Indian states
  for (const stateName of ALL_INDIAN_STATES) {
    if (stateName !== "All-India (Virtual)" && new RegExp(`\\b${stateName}\\b`, "i").test(textBlob)) {
      return {
        state: stateName,
        district: event.city || "Major Tech Hub",
      };
    }
  }

  // 3. Check if online/virtual
  const isOnline =
    event.mode === "Online" ||
    (event.location && (event.location.includes("Virtual") || event.location.includes("Online")));

  if (isOnline) {
    return {
      state: "Karnataka / Virtual",
      district: "Virtual / Online",
    };
  }

  // Default fallback for collegiate platform
  return {
    state: "Karnataka",
    district: "Bengaluru Urban",
  };
}

export default classifyStateAndDistrict;
