// backend/services/ingestion/syncService.js
import mongoose from "mongoose";
import Hackathon from "../../models/Hackathon.js";
import { fetchUnstopHackathons } from "./adapters/unstopAdapter.js";
import { fetchDevfolioHackathons } from "./adapters/devfolioAdapter.js";
import { fetchHackerEarthHackathons } from "./adapters/hackerEarthAdapter.js";
import { fetchCuratedIndiaHackathons } from "./adapters/curatedIndiaAdapter.js";
import { fetchMlhHackathons } from "./adapters/mlhAdapter.js";
import { isKarnatakaEvent } from "./karnatakaFilter.js";
import { findDuplicateHackathon, deduplicateCandidates } from "./deduplicator.js";
import { classifyStateAndDistrict } from "./geoClassifier.js";

const MONTH_INDEX_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function computeStatus(regDeadlineDate) {
  if (!regDeadlineDate) {
    return { status: "open", statusLabel: "Registration open" };
  }

  const deadline = new Date(regDeadlineDate).getTime();
  if (isNaN(deadline)) {
    return { status: "open", statusLabel: "Registration open" };
  }

  const now = Date.now();
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return { status: "closed", statusLabel: "Registration closed" };
  } else if (diffHours <= 72) {
    return { status: "closing-soon", statusLabel: "Closing soon" };
  } else {
    return { status: "open", statusLabel: "Registration open" };
  }
}

/**
 * Robust date inspector:
 * Detects if an event is from a past month (e.g. June, July, May) or already completed.
 * ONLY accepts ongoing current month (that are not yet finished) and upcoming future months.
 */
export function isEventDurationOver(item, now = Date.now()) {
  const refDate = new Date(now);
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-indexed (9 = October)
  const todayMs = refDate.getTime();

  // 1. Check ISO date fields
  const isoCandidates = [item.endDateRaw, item.regDeadlineDate, item.startDateRaw].filter(Boolean);
  for (const iso of isoCandidates) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const yr = d.getFullYear();
      const mo = d.getMonth();
      if (yr < currentYear || (yr === currentYear && mo < currentMonth)) {
        return true;
      }
      if (d.getTime() < todayMs) {
        return true;
      }
    }
  }

  // 2. Comprehensive text search across dates, startDate, endDate, registrationDeadline
  const textBlob = `${item.dates || ""} ${item.startDate || ""} ${item.endDate || ""} ${item.registrationDeadline || ""}`.toLowerCase();

  const yearMatch = textBlob.match(/\b(202[0-9])\b/);
  const eventYear = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  if (eventYear < currentYear) {
    return true;
  }

  const monthMatch = textBlob.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/
  );

  if (monthMatch) {
    const eventMonth = MONTH_INDEX_MAP[monthMatch[1]];
    // If event is in a past month of this year (e.g. May, June, July when current month is Oct)
    if (eventYear === currentYear && eventMonth < currentMonth) {
      return true;
    }

    // If event is in the ongoing current month, check if the days have already passed
    if (eventYear === currentYear && eventMonth === currentMonth) {
      const days = [...textBlob.matchAll(/\b([0-2]?[0-9]|3[01])\b/g)]
        .map((m) => parseInt(m[1], 10))
        .filter((d) => d >= 1 && d <= 31);
      if (days.length > 0) {
        const maxDay = Math.max(...days);
        const eventEndMs = new Date(currentYear, currentMonth, maxDay, 23, 59, 59).getTime();
        if (eventEndMs < todayMs) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Master multi-platform sync service:
 * Concurrently fetches from Unstop, Devfolio, HackerEarth, India Circuit / SIH, and MLH,
 * filters for Karnataka and open collegiate/virtual events,
 * deduplicates across platforms to guarantee 0 duplicates,
 * auto-deletes expired events, and persists active events to MongoDB.
 */
export async function runHackathonIngestion() {
  console.log(
    "[Hackathon Ingestion] Starting multi-platform sync across Unstop, Devfolio, HackerEarth, India Circuit, and MLH..."
  );

  if (mongoose.connection.readyState !== 1) {
    console.log("[Hackathon Ingestion] Waiting for active MongoDB connection...");
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) return resolve();
      const onOpen = () => {
        mongoose.connection.off("open", onOpen);
        resolve();
      };
      mongoose.connection.on("open", onOpen);
      setTimeout(resolve, 6000);
    });
  }

  const now = Date.now();

  // 1. Auto-delete previously added hackathons whose duration has ended
  let deletedExpiredCount = 0;
  try {
    const allExisting = await Hackathon.find({});
    for (const h of allExisting) {
      if (isEventDurationOver(h, now)) {
        await Hackathon.findByIdAndDelete(h._id);
        deletedExpiredCount++;
      }
    }
    if (deletedExpiredCount > 0) {
      console.log(`[Hackathon Ingestion] Auto-deleted ${deletedExpiredCount} expired hackathons from database.`);
    }
  } catch (cleanErr) {
    console.warn("[Hackathon Ingestion] Expired cleanup error:", cleanErr.message);
  }

  // 2. Concurrently fetch candidate events from ALL connected platforms
  const [unstopRes, devfolioRes, hackerEarthRes, curatedIndiaRes, mlhRes] = await Promise.allSettled([
    fetchUnstopHackathons(),
    fetchDevfolioHackathons(),
    fetchHackerEarthHackathons(),
    fetchCuratedIndiaHackathons(),
    fetchMlhHackathons(),
  ]);

  const rawUnstop = unstopRes.status === "fulfilled" ? unstopRes.value : [];
  const rawDevfolio = devfolioRes.status === "fulfilled" ? devfolioRes.value : [];
  const rawHackerEarth = hackerEarthRes.status === "fulfilled" ? hackerEarthRes.value : [];
  const rawCuratedIndia = curatedIndiaRes.status === "fulfilled" ? curatedIndiaRes.value : [];
  const rawMlh = mlhRes.status === "fulfilled" ? mlhRes.value : [];

  const allRawCandidates = [...rawUnstop, ...rawDevfolio, ...rawHackerEarth, ...rawCuratedIndia, ...rawMlh];
  console.log(
    `[Hackathon Ingestion] Fetched raw candidates: ${allRawCandidates.length} total (` +
      `${rawUnstop.length} Unstop, ${rawDevfolio.length} Devfolio, ${rawHackerEarth.length} HackerEarth, ` +
      `${rawCuratedIndia.length} India Circuit, ${rawMlh.length} MLH).`
  );

  // 3. Filter for Karnataka & open collegiate/virtual events
  const relevantCandidates = allRawCandidates.filter(isKarnatakaEvent);

  // 4. Cross-Platform Deduplication within the incoming batch
  const uniqueCandidates = deduplicateCandidates(relevantCandidates);
  console.log(`[Hackathon Ingestion] Filtered & deduplicated to ${uniqueCandidates.length} unique active hackathons.`);

  let insertedCount = 0;
  let updatedCount = 0;

  // Cache existing DB hackathons to optimize query performance
  const existingDbHacks = await Hackathon.find({}, "title officialWebsite registrationLink").lean();

  // 5. Upsert active hackathons into MongoDB
  for (const item of uniqueCandidates) {
    try {
      if (isEventDurationOver(item, now)) continue;

      const { status, statusLabel } = computeStatus(item.regDeadlineDate);
      const existing = await findDuplicateHackathon(item, existingDbHacks);

      const targetRegLink = item.registrationLink || item.officialRegistrationLink || item.officialWebsite || "";
      const targetWebsite = item.officialWebsite || item.registrationLink || "";

      const geo = classifyStateAndDistrict(item);

      if (existing) {
        if (isEventDurationOver(existing, now)) {
          await Hackathon.findByIdAndDelete(existing._id);
          deletedExpiredCount++;
          continue;
        }

        const existingSimpleId =
          existing.simpleId ||
          (existing.circuitId ? existing.circuitId.replace(/BC-(KA|CIRC)-/, "#HK-") : `#HK-${updatedCount + 1}`);

        // Update existing record without creating duplicate
        await Hackathon.findByIdAndUpdate(existing._id, {
          $set: {
            status,
            statusLabel,
            officialRegistrationLink: targetRegLink || existing.officialRegistrationLink,
            registrationLink: targetRegLink || existing.registrationLink,
            officialWebsite: targetWebsite || existing.officialWebsite,
            regDeadlineDate: item.regDeadlineDate || existing.regDeadlineDate,
            registrationDeadline: item.registrationDeadline || existing.registrationDeadline,
            state: geo.state || existing.state || "Karnataka",
            district: geo.district || existing.district || "Bengaluru Urban",
            simpleId: existingSimpleId,
          },
        });
        updatedCount++;
      } else {
        if (status === "closed") continue;

        insertedCount++;
        const simpleCode = `#HK-${String(insertedCount).padStart(2, "0")}`;

        await Hackathon.create({
          title: item.title,
          circuitId: simpleCode,
          simpleId: simpleCode,
          subtitle: item.subtitle || `Organized by ${item.organizerName}`,
          organizer: {
            name: item.organizerName || "Collegiate Host",
            website: targetWebsite,
            partnerType: "Sanctioned Circuit Partner",
          },
          description: item.description || `Live hackathon open for students and builders.`,
          officialWebsite: targetWebsite,
          officialRegistrationLink: targetRegLink,
          registrationLink: targetRegLink,
          dates: item.dates || "Upcoming 2026",
          startDate: item.startDate || "",
          startDateRaw: item.startDateRaw || "",
          endDate: item.endDate || "",
          endDateRaw: item.endDateRaw || "",
          registrationDeadline: item.registrationDeadline || "Open",
          regDeadlineDate: item.regDeadlineDate || "",
          mode: item.mode || "Offline",
          location: item.location || "Bengaluru, Karnataka",
          state: geo.state,
          district: geo.district,
          registrationFee: item.registrationFee || "₹0 / Free",
          feeType: item.feeType || "free",
          feeAmount: Number(item.feeAmount) || 0,
          minTeamSize: Number(item.minTeamSize) || 1,
          maxTeamSize: Number(item.maxTeamSize) || 4,
          teamSize: `${item.minTeamSize || 1} to ${item.maxTeamSize || 4} Builders`,
          squadLimits: `${item.minTeamSize || 1} to ${item.maxTeamSize || 4} Builders`,
          eligibility: "Open to Students & Developers in Karnataka",
          tracks: Array.isArray(item.tracks) ? item.tracks : ["ai", "general"],
          trackLabels: Array.isArray(item.trackLabels) ? item.trackLabels : ["AI / ML", "General"],
          prizePool: item.prizePool || "Prizes & Recognition",
          image: item.image,
          heroImage: item.image,
          coverImage: item.image,
          logo: item.image,
          isPublished: true,
          isVerified: true,
          status,
          statusLabel,
          officialSource: `Multi-Platform Sync (${item.source})`,
        });

        insertedCount++;
      }
    } catch (saveErr) {
      console.warn(`[Hackathon Ingestion] Persist error for "${item.title}":`, saveErr.message);
    }
  }

  const resultStats = {
    totalRawScanned: allRawCandidates.length,
    uniqueEligible: uniqueCandidates.length,
    inserted: insertedCount,
    updated: updatedCount,
    deletedExpired: deletedExpiredCount,
    sourcesConnected: [
      "Unstop",
      "Devfolio",
      "HackerEarth",
      "National Circuit (SIH / Corporate)",
      "Major League Hacking (MLH)",
    ],
    timestamp: new Date().toISOString(),
  };

  console.log("[Hackathon Ingestion] Sync completed:", resultStats);
  return resultStats;
}

export default runHackathonIngestion;
