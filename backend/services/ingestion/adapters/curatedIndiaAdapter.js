// backend/services/ingestion/adapters/curatedIndiaAdapter.js

const DEFAULT_BANNER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E";

function parseFee(feeStr = "") {
  const clean = feeStr.trim().toLowerCase();
  if (clean === "free" || clean === "₹0" || clean === "0" || !clean) {
    return { feeType: "free", feeAmount: 0, registrationFee: "₹0 / Free" };
  }
  const match = feeStr.match(/\d+/);
  const amount = match ? Number(match[0]) : 0;
  return {
    feeType: amount > 0 ? "paid" : "free",
    feeAmount: amount,
    registrationFee: feeStr || "₹0 / Free",
  };
}

function parseDates(dateStr = "") {
  return dateStr.replace(/mid[‑-]/gi, "Mid ").replace(/rounds/gi, "").trim();
}

/**
 * Adapter for curated India & Karnataka collegiate/developer hackathons tracker.
 * Fetches real-time verified hackathons including Smart India Hackathon (SIH),
 * national corporate hackathons (Amazon, TCS, Infosys, Wipro, Tata), and university circuits.
 */
export async function fetchCuratedIndiaHackathons() {
  const SOURCE_URL = "https://raw.githubusercontent.com/harshi1111/hackathons-tracker-2026/main/README.md";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/plain,text/markdown",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const markdown = await res.text();
    const lines = markdown.split("\n");
    const results = [];
    const seenTitles = new Set();

    for (const line of lines) {
      if (!line.includes("|") || line.includes("---") || line.includes("Hackathon Name")) continue;

      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length < 5) continue;

      const rawName = parts[0].replace(/\*/g, "").trim();
      const tags = parts[1] || "";
      const regDeadline = parts[2] || "Rolling";
      const dates = parts[3] || "2026";
      const rawLink = parts[4] || "";
      const feeRaw = parts[5] || "Free";

      if (!rawName || rawName.length < 3) continue;

      const slugKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenTitles.has(slugKey)) continue;
      seenTitles.add(slugKey);

      // Extract official registration link & platform name
      const linkMatch = rawLink.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
      let targetUrl = "";
      let hostPlatform = "India Circuit";

      if (linkMatch) {
        hostPlatform = linkMatch[1];
        targetUrl = linkMatch[2];
      } else {
        const bareMatch = rawLink.match(/\[([^\]]+)\]/);
        if (bareMatch) {
          hostPlatform = bareMatch[1];
          const hpLow = hostPlatform.toLowerCase();
          if (hpLow.includes("devfolio")) targetUrl = "https://devfolio.co/hackathons";
          else if (hpLow.includes("unstop")) targetUrl = "https://unstop.com/hackathons";
          else if (hpLow.includes("hackerearth")) targetUrl = "https://www.hackerearth.com/challenges";
          else if (hpLow.includes("hack2skill")) targetUrl = "https://hack2skill.com";
          else if (hpLow.includes("devpost")) targetUrl = "https://devpost.com";
          else if (hpLow.includes("sih")) targetUrl = "https://www.sih.gov.in";
          else targetUrl = "https://unstop.com";
        }
      }

      if (!targetUrl) targetUrl = "https://unstop.com";

      const fee = parseFee(feeRaw);
      const parsedTags = (tags.match(/#([a-zA-Z0-9_]+)/g) || []).map((t) => t.replace("#", ""));
      const trackLabels = parsedTags.length > 0 ? parsedTags.slice(0, 4) : ["AI / ML", "Software", "Innovation"];
      const tracks = trackLabels.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10));

      results.push({
        source: `tracker-${hostPlatform.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        sourceId: slugKey,
        title: rawName,
        subtitle: `Organized via ${hostPlatform} National Circuit`,
        organizerName: hostPlatform || "India Tech Network",
        officialWebsite: targetUrl,
        registrationLink: targetUrl,
        officialRegistrationLink: targetUrl,
        description: `${rawName} — active 2026 hackathon open for students and builders across Karnataka and India. Tags: ${tags}.`,
        dates: parseDates(dates),
        startDate: parseDates(dates),
        endDate: "",
        regDeadlineDate: regDeadline.includes("2026") ? regDeadline : "",
        registrationDeadline: regDeadline || "Open",
        mode: "Online",
        location: "Karnataka / India (Virtual)",
        city: "Bengaluru",
        state: "Karnataka",
        feeType: fee.feeType,
        feeAmount: fee.feeAmount,
        registrationFee: fee.registrationFee,
        minTeamSize: 1,
        maxTeamSize: 4,
        prizePool: "Cash Prizes, PPOs & Recognition",
        tracks,
        trackLabels,
        image: DEFAULT_BANNER,
      });
    }

    return results;
  } catch (err) {
    console.warn("[Curated India Adapter] Error fetching:", err.message);
    return [];
  }
}

export default fetchCuratedIndiaHackathons;
