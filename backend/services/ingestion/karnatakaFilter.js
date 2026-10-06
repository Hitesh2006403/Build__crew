// backend/services/ingestion/karnatakaFilter.js

/**
 * Karnataka Geo-Fencing & Entity Recognition
 * Identifies hackathons hosted in, affiliated with, or open to collegiate students in Karnataka.
 */

const KARNATAKA_GEO_PATTERNS = [
  // Major Cities, Districts & Towns
  /\b(bengaluru|bangalore|blr)\b/i,
  /\b(mysuru|mysore)\b/i,
  /\b(mangaluru|mangalore)\b/i,
  /\b(hubballi|hubli|dharwad)\b/i,
  /\b(manipal|udupi)\b/i,
  /\b(belagavi|belgaum)\b/i,
  /\b(kalaburagi|gulbarga)\b/i,
  /\b(tumakuru|tumkur)\b/i,
  /\b(shivamogga|shimoga)\b/i,
  /\b(davangere|davanagere)\b/i,
  /\b(ballari|bellary)\b/i,
  /\b(vijayapura|bijapur)\b/i,
  /\b(hassan|bidar|kolar|mandya|chikkamagaluru|chikmagalur)\b/i,

  // Key Tech Hubs & Neighborhoods in Bengaluru
  /\b(electronic city|whitefield|koramangala|hsr layout|indiranagar|yelahanka|marathahalli|bellandur|hebbal|jayanagar|jp nagar|banashankari|rajajinagar|malleswaram)\b/i,

  // Prominent Karnataka Universities & Engineering Colleges
  /\b(rvce|r\.v\.\s*college|rv\s*college)\b/i,
  /\b(pes\s*university|pesu|pesit)\b/i,
  /\b(bmsce|b\.m\.s\.\s*college|bmsitm|bms\s*institute)\b/i,
  /\b(msrit|m\.s\.\s*ramaiah|ramaiah\s*institute)\b/i,
  /\b(iisc|indian\s*institute\s*of\s*science)\b/i,
  /\b(iiit-?b|international\s*institute\s*of\s*information\s*technology\s*bangalore)\b/i,
  /\b(nitk|national\s*institute\s*of\s*technology\s*karnataka|surathkal)\b/i,
  /\b(manipal\s*institute\s*of\s*technology|mit\s*manipal|mahe)\b/i,
  /\b(dayananda\s*sagar|dsce|dsatm)\b/i,
  /\b(uvce|university\s*visvesvaraya\s*college)\b/i,
  /\b(bangalore\s*institute\s*of\s*technology|bit\s*bangalore)\b/i,
  /\b(sjce|jss\s*science\s*and\s*technology|nie\s*mysore|vidyavardhaka)\b/i,
  /\b(kle\s*tech|k\.l\.e\.\s*technological|bvb\s*hubli)\b/i,
  /\b(scaler\s*school\s*of\s*technology|sst)\b/i,
  /\b(new\s*horizon\s*college\s*of\s*engineering|nhce)\b/i,
  /\b(sir\s*m\s*vit|sir\s*m\.\s*visvesvaraya)\b/i,
  /\b(don\s*bosco\s*institute\s*of\s*technology|dbit)\b/i,
  /\b(aj\s*institute|bearys\s*institute|p\s*a\s*college\s*of\s*engineering)\b/i,
  /\b(christ\s*university|reva\s*university|cmrit|cmr\s*university)\b/i,
  /\b(atria\s*institute|jyothy\s*institute|amc\s*engineering|oxford\s*college)\b/i,
  /\b(vtu|visvesvaraya\s*technological\s*university)\b/i,

  // State Name
  /\bkarnataka\b/i,
];

export function isKarnatakaEvent(event = {}) {
  const textBlob = [
    event.title || "",
    event.location || "",
    event.city || "",
    event.state || "",
    event.organizerName || "",
    event.venue || "",
    event.description || "",
    event.address || "",
  ].join(" ");

  // 1. Direct Karnataka city, college, or state match
  if (KARNATAKA_GEO_PATTERNS.some((pattern) => pattern.test(textBlob))) {
    return true;
  }

  // 2. High-value Virtual / Online hackathons open to collegiate students across Karnataka & India
  const isVirtualOrOnline =
    event.mode === "Online" ||
    event.mode === "Hybrid" ||
    (event.location && (event.location.includes("Virtual") || event.location.includes("Online")));

  if (isVirtualOrOnline) {
    // If it's an open collegiate or innovation sprint on Unstop, Devfolio, or HackerEarth, include it
    return true;
  }

  return false;
}

export default isKarnatakaEvent;
