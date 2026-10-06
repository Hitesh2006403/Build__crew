// backend/services/ingestion/deduplicator.js
import Hackathon from "../../models/Hackathon.js";

function cleanSlug(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\b(202[4-9]|season\s*\d+|edition\s*\d+|v\d+|\d+\.0)\b/gi, "") // strip season/year tags
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  // Substring containment check for normalized slugs
  if (longer.includes(shorter) && shorter.length >= 6) {
    return 0.95;
  }

  // Bigram Dice similarity
  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.slice(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(str1);
  const b2 = getBigrams(str2);

  let intersection = 0;
  for (const item of b1) {
    if (b2.has(item)) intersection++;
  }

  return (2 * intersection) / (b1.size + b2.size);
}

/**
 * Checks if candidate matches any existing MongoDB hackathon.
 */
export async function findDuplicateHackathon(event, existingCache = null) {
  if (!event || !event.title) return null;

  // 1. Exact or Domain URL Match (Highest Confidence)
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

  // 2. Normalized Title & Fuzzy Cross-Platform Matching
  const targetSlug = cleanSlug(event.title);
  if (targetSlug.length >= 4) {
    const allHacks = existingCache || (await Hackathon.find({}, "title officialWebsite registrationLink").lean());
    for (const h of allHacks) {
      const hSlug = cleanSlug(h.title);

      if (hSlug === targetSlug) {
        return h;
      }

      // If >85% similarity, treat as same hackathon across platforms
      const sim = calculateSimilarity(targetSlug, hSlug);
      if (sim >= 0.85) {
        return h;
      }
    }
  }

  return null;
}

/**
 * Deduplicates an array of candidate events across multiple platforms before DB insertion.
 */
export function deduplicateCandidates(candidates = []) {
  const unique = [];
  const seenSlugs = new Map();

  for (const item of candidates) {
    const slug = cleanSlug(item.title);
    if (!slug) continue;

    let isDuplicate = false;
    for (const [existingSlug, existingItem] of seenSlugs.entries()) {
      if (existingSlug === slug || calculateSimilarity(slug, existingSlug) >= 0.85) {
        isDuplicate = true;
        // Merge registration links if missing
        if (!existingItem.registrationLink && item.registrationLink) {
          existingItem.registrationLink = item.registrationLink;
        }
        break;
      }
    }

    if (!isDuplicate) {
      seenSlugs.set(slug, item);
      unique.push(item);
    }
  }

  return unique;
}

export default findDuplicateHackathon;
