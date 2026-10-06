// backend/services/ingestion/adapters/hackerEarthAdapter.js

const DEFAULT_BANNER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E";

function formatDateStr(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

export async function fetchHackerEarthHackathons() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://www.hackerearth.com/api/events/upcoming/", {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const events = json?.response || [];

    return events.map((item) => {
      const startDate = item.start_tz || item.start_timestamp || item.date || "";
      const endDate = item.end_tz || item.end_timestamp || item.end_date || "";
      const regUrl = item.url || item.subscribe || "";

      return {
        source: "hackerearth",
        sourceId: item.url || item.title,
        title: item.title,
        subtitle: `Organized via HackerEarth Challenge Series`,
        organizerName: "HackerEarth Innovation Network",
        officialWebsite: regUrl,
        registrationLink: regUrl,
        officialRegistrationLink: regUrl,
        description: item.description || `${item.title} hosted on HackerEarth. Open for collegiate builders and developers.`,
        dates:
          startDate && endDate
            ? `${formatDateStr(startDate)} - ${formatDateStr(endDate)}`
            : formatDateStr(startDate) || "Upcoming 2026",
        startDateRaw: startDate,
        endDateRaw: endDate,
        startDate: formatDateStr(startDate),
        endDate: formatDateStr(endDate),
        regDeadlineDate: endDate,
        registrationDeadline: formatDateStr(endDate) || "Rolling Admissions",
        mode: "Online",
        location: "Karnataka / Virtual",
        city: "Bengaluru",
        state: "Karnataka",
        feeType: "free",
        feeAmount: 0,
        registrationFee: "₹0 / Free",
        minTeamSize: 1,
        maxTeamSize: 4,
        prizePool: "Prizes, Recognition & Hiring",
        tracks: ["ai", "general", "innovation"],
        trackLabels: ["AI / ML", "Software Engineering", "Open Innovation"],
        image: item.cover_image || item.thumbnail || DEFAULT_BANNER,
      };
    });
  } catch (err) {
    console.warn("[HackerEarth Adapter] Failed to fetch:", err.message);
    return [];
  }
}

export default fetchHackerEarthHackathons;
