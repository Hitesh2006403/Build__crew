// backend/services/ingestion/syncService.js
import mongoose from "mongoose";
import Hackathon from "../../models/Hackathon.js";
import { fetchUnstopHackathons } from "./adapters/unstopAdapter.js";
import { fetchDevfolioHackathons } from "./adapters/devfolioAdapter.js";
import { fetchHackerEarthHackathons } from "./adapters/hackerEarthAdapter.js";
import { isKarnatakaEvent } from "./karnatakaFilter.js";
import { findDuplicateHackathon, deduplicateCandidates } from "./deduplicator.js";

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

function isEventDurationOver(item, now = Date.now()) {
  if (item.endDateRaw) {
    const endMs = new Date(item.endDateRaw).getTime();
    if (!isNaN(endMs) && endMs < now) return true;
  }
  if (item.endDate) {
    const parsed = Date.parse(item.endDate);
    if (!isNaN(parsed) && parsed < now) return true;
  }
  if (item.regDeadlineDate) {
    const regMs = new Date(item.regDeadlineDate).getTime();
    if (!isNaN(regMs) && regMs < now - 24 * 60 * 60 * 1000) return true;
  }
  return false;
}

/**
 * Master multi-platform sync service:
 * Fetches from Unstop, Devfolio, HackerEarth, filters, deduplicates across platforms,
 * deletes expired events, and persists active events to MongoDB.
 */
export async function runHackathonIngestion() {
  console.log("[Hackathon Ingestion] Starting multi-platform hackathon sync (Unstop, Devfolio, HackerEarth)...");

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
  const [unstopRes, devfolioRes, hackerEarthRes] = await Promise.allSettled([
    fetchUnstopHackathons(),
    fetchDevfolioHackathons(),
    fetchHackerEarthHackathons(),
  ]);

  const rawUnstop = unstopRes.status === "fulfilled" ? unstopRes.value : [];
  const rawDevfolio = devfolioRes.status === "fulfilled" ? devfolioRes.value : [];
  const rawHackerEarth = hackerEarthRes.status === "fulfilled" ? hackerEarthRes.value : [];

  const allRawCandidates = [...rawUnstop, ...rawDevfolio, ...rawHackerEarth];
  console.log(
    `[Hackathon Ingestion] Fetched raw candidates: ${allRawCandidates.length} total (${rawUnstop.length} Unstop, ${rawDevfolio.length} Devfolio, ${rawHackerEarth.length} HackerEarth).`
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

      if (existing) {
        if (isEventDurationOver(existing, now)) {
          await Hackathon.findByIdAndDelete(existing._id);
          deletedExpiredCount++;
          continue;
        }

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
          },
        });
        updatedCount++;
      } else {
        if (status === "closed") continue;

        const circuitCode = `BC-KA-${Math.floor(1000 + Math.random() * 9000)}`;

        await Hackathon.create({
          title: item.title,
          circuitId: circuitCode,
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
    sourcesConnected: ["Unstop", "Devfolio", "HackerEarth"],
    timestamp: new Date().toISOString(),
  };

  console.log("[Hackathon Ingestion] Sync completed:", resultStats);
  return resultStats;
}

export default runHackathonIngestion;
