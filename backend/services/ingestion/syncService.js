// backend/services/ingestion/syncService.js
import Hackathon from "../../models/Hackathon.js";
import { fetchUnstopHackathons } from "./adapters/unstopAdapter.js";
import { fetchDevfolioHackathons } from "./adapters/devfolioAdapter.js";
import { isKarnatakaEvent } from "./karnatakaFilter.js";
import { findDuplicateHackathon } from "./deduplicator.js";

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
  // Check endDateRaw
  if (item.endDateRaw) {
    const endMs = new Date(item.endDateRaw).getTime();
    if (!isNaN(endMs) && endMs < now) {
      return true;
    }
  }

  // Check parsed endDate
  if (item.endDate) {
    const parsed = Date.parse(item.endDate);
    if (!isNaN(parsed) && parsed < now) {
      return true;
    }
  }

  // Check regDeadlineDate (if past by 24+ hours)
  if (item.regDeadlineDate) {
    const regMs = new Date(item.regDeadlineDate).getTime();
    if (!isNaN(regMs) && regMs < now - 24 * 60 * 60 * 1000) {
      return true;
    }
  }

  return false;
}

/**
 * Master sync service to fetch, filter, de-duplicate, persist,
 * and automatically delete expired Karnataka hackathons.
 */
export async function runHackathonIngestion() {
  console.log("[Hackathon Ingestion] Starting automated daily Karnataka hackathon ingestion run...");

  const now = Date.now();

  // 1. Auto-delete previously added hackathons whose duration has ended
  let deletedExpiredCount = 0;
  try {
    const allExisting = await Hackathon.find({});
    for (const h of allExisting) {
      if (isEventDurationOver(h, now)) {
        console.log(`[Hackathon Ingestion] Auto-deleting expired hackathon: "${h.title}" (Circuit ID: ${h.circuitId})`);
        await Hackathon.findByIdAndDelete(h._id);
        deletedExpiredCount++;
      }
    }
    if (deletedExpiredCount > 0) {
      console.log(`[Hackathon Ingestion] Cleaned up ${deletedExpiredCount} expired hackathons from database.`);
    }
  } catch (cleanErr) {
    console.warn("[Hackathon Ingestion] Auto-deletion error:", cleanErr.message);
  }

  // 2. Concurrently fetch raw candidate events from multiple platforms
  const [unstopEvents, devfolioEvents] = await Promise.allSettled([
    fetchUnstopHackathons(),
    fetchDevfolioHackathons(),
  ]);

  const rawUnstop = unstopEvents.status === "fulfilled" ? unstopEvents.value : [];
  const rawDevfolio = devfolioEvents.status === "fulfilled" ? devfolioEvents.value : [];
  const allCandidates = [...rawUnstop, ...rawDevfolio];

  console.log(
    `[Hackathon Ingestion] Scanned ${allCandidates.length} candidate events (${rawUnstop.length} Unstop, ${rawDevfolio.length} Devfolio).`
  );

  // 3. Filter for Karnataka events
  const karnatakaEvents = allCandidates.filter(isKarnatakaEvent);
  console.log(`[Hackathon Ingestion] Identified ${karnatakaEvents.length} events located in or affiliated with Karnataka.`);

  let insertedCount = 0;
  let updatedCount = 0;

  // 4. Process & Persist active events into MongoDB
  for (const item of karnatakaEvents) {
    try {
      // Discard if its duration is already over
      if (isEventDurationOver(item, now)) {
        continue;
      }

      const { status, statusLabel } = computeStatus(item.regDeadlineDate);

      // Check if duplicate exists in DB
      const existing = await findDuplicateHackathon(item);

      const targetRegLink = item.registrationLink || item.officialRegistrationLink || item.officialWebsite || "";
      const targetWebsite = item.officialWebsite || item.registrationLink || "";

      if (existing) {
        // If existing event's duration has ended, delete it
        if (isEventDurationOver(existing, now)) {
          await Hackathon.findByIdAndDelete(existing._id);
          deletedExpiredCount++;
          continue;
        }

        // Update freshness, direct registration links, and deadline status
        const updateFields = {
          status,
          statusLabel,
          officialRegistrationLink: targetRegLink || existing.officialRegistrationLink,
          registrationLink: targetRegLink || existing.registrationLink,
          officialWebsite: targetWebsite || existing.officialWebsite,
        };

        if (item.regDeadlineDate && !existing.regDeadlineDate) {
          updateFields.regDeadlineDate = item.regDeadlineDate;
          updateFields.registrationDeadline = item.registrationDeadline;
        }
        if (item.prizePool && (!existing.prizePool || existing.prizePool === "₹50,000")) {
          updateFields.prizePool = item.prizePool;
        }
        if (item.image && (!existing.image || existing.image.includes("lh3.googleusercontent"))) {
          updateFields.image = item.image;
          updateFields.heroImage = item.image;
        }

        await Hackathon.findByIdAndUpdate(existing._id, { $set: updateFields });
        updatedCount++;
      } else {
        // Skip events whose registration already concluded
        if (status === "closed") {
          continue;
        }

        const circuitCode = `BC-KA-${Math.floor(1000 + Math.random() * 9000)}`;

        await Hackathon.create({
          title: item.title,
          circuitId: circuitCode,
          subtitle: item.subtitle || `Organized by ${item.organizerName}`,
          organizer: {
            name: item.organizerName || "Collegiate Host",
            website: targetWebsite,
            partnerType: "Karnataka Collegiate Partner",
          },
          description: item.description || `Collegiate hackathon hosted in Karnataka.`,
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
          officialSource: `Automated Karnataka Sync (${item.source})`,
        });

        insertedCount++;
      }
    } catch (saveErr) {
      console.warn(`[Hackathon Ingestion] Failed to persist "${item.title}":`, saveErr.message);
    }
  }

  const resultStats = {
    scanned: allCandidates.length,
    karnatakaTotal: karnatakaEvents.length,
    inserted: insertedCount,
    updated: updatedCount,
    deletedExpired: deletedExpiredCount,
    timestamp: new Date().toISOString(),
  };

  console.log("[Hackathon Ingestion] Run complete:", resultStats);
  return resultStats;
}

export default runHackathonIngestion;
