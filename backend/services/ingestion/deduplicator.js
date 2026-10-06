// backend/services/ingestion/deduplicator.js
import Hackathon from "../../models/Hackathon.js";

function normalizeString(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Searches MongoDB to check if this hackathon already exists.
 * Returns the existing document if matched, or null if it's new.
 */
export async function findDuplicateHackathon(event) {
  if (!event || !event.title) return null;

  // 1. Exact Link Match (High Confidence)
  const links = [event.officialWebsite, event.registrationLink, event.officialRegistrationLink].filter(Boolean);
  if (links.length > 0) {
    const linkMatch = await Hackathon.findOne({
      $or: [
        { officialWebsite: { $in: links } },
        { officialRegistrationLink: { $in: links } },
        { registrationLink: { $in: links } },
      ],
    });
    if (linkMatch) return linkMatch;
  }

  // 2. Normalized Title Match
  const targetNorm = normalizeString(event.title);
  if (targetNorm.length >= 4) {
    const allHacks = await Hackathon.find({}, "title officialWebsite registrationLink").lean();
    for (const h of allHacks) {
      const hNorm = normalizeString(h.title);
      if (hNorm === targetNorm) {
        return h;
      }
      // Substring match for versioned titles e.g. "ProtocolX" and "ProtocolX 2026"
      if (
        (hNorm.length > 5 && targetNorm.includes(hNorm)) ||
        (targetNorm.length > 5 && hNorm.includes(targetNorm))
      ) {
        return h;
      }
    }
  }

  return null;
}

export default findDuplicateHackathon;
