// backend/services/ingestion/adapters/devfolioAdapter.js

const DEFAULT_BANNER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E";

function formatDateStr(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export async function fetchDevfolioHackathons() {
  const queryConfigs = [
    { filter: "open", from: 0, size: 50 },
    { filter: "open", from: 50, size: 50 },
    { filter: "open", from: 100, size: 50 },
    { filter: "upcoming", from: 0, size: 50 },
    { filter: "upcoming", from: 50, size: 50 },
    { filter: "application_open", from: 0, size: 50 },
    { filter: "application_open", from: 50, size: 50 },
    { q: "bangalore", from: 0, size: 40 },
    { q: "bengaluru", from: 0, size: 40 },
    { q: "karnataka", from: 0, size: 40 },
    { q: "india", from: 0, size: 50 },
  ];

  const seenSlugs = new Set();
  const results = [];

  for (const config of queryConfigs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("https://api.devfolio.co/api/search/hackathons", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(config),
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const hits = (data?.hits?.hits || []).map((h) => h._source).filter(Boolean);

      for (const item of hits) {
        if (!item || !item.slug || seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);

        const webUrl = `https://${item.slug}.devfolio.co`;
        const startDate = item.starts_at || "";
        const endDate = item.ends_at || "";
        const city = item.city || "";
        const state = item.state || "";

        const isOnline = item.is_online || (!city && !state);
        const locationStr = isOnline
          ? (city ? `${city} (Virtual)` : "Virtual / Online")
          : (city || state ? `${city ? city + ", " : ""}${state || ""}`.trim() : "Karnataka");

        const tracks = Array.isArray(item.themes) && item.themes.length > 0 ? item.themes : ["Web3", "AI", "Open"];

        results.push({
          source: "devfolio",
          sourceId: item.slug,
          title: item.name,
          subtitle: item.tagline || `Devfolio Hackathon in ${city || "Karnataka"}`,
          organizerName: item.hosted_by || "Devfolio Community",
          officialWebsite: webUrl,
          registrationLink: webUrl,
          officialRegistrationLink: webUrl,
          description: item.desc || item.tagline || `${item.name} hosted on Devfolio.`,
          dates:
            startDate && endDate
              ? `${formatDateStr(startDate)} - ${formatDateStr(endDate)}`
              : formatDateStr(startDate) || "Upcoming 2026",
          startDateRaw: startDate,
          endDateRaw: endDate,
          startDate: formatDateStr(startDate),
          endDate: formatDateStr(endDate),
          regDeadlineDate: startDate,
          registrationDeadline: formatDateStr(startDate) || "Rolling Admissions",
          mode: item.is_online ? "Online" : "Offline",
          location: locationStr,
          city,
          state,
          feeType: "free",
          feeAmount: 0,
          registrationFee: "₹0 / Free",
          minTeamSize: Number(item.team_min) || 1,
          maxTeamSize: Number(item.team_size) || 4,
          prizePool: "Devfolio Bounties & Prizes",
          tracks: tracks.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)),
          trackLabels: tracks.slice(0, 4),
          image: item.cover_img || DEFAULT_BANNER,
        });
      }
    } catch (err) {
      console.warn(`[Devfolio Adapter] Error fetching:`, err.message);
    }
  }

  return results;
}

export default fetchDevfolioHackathons;
