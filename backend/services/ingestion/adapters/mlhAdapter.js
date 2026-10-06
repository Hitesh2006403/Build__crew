// backend/services/ingestion/adapters/mlhAdapter.js

const DEFAULT_BANNER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBjbkVkD8ugQCopgjlKUdX6h2t7iGR8U7cAotGEX4gkVp2iZGYgNXuhDd7uv8XKPdDKxRc5LVG5-2ku_w-inG49pGRXEBeatfaGIbtDqTB4GZbf-12sVHdMJBR4s9dSwOvIgdwjHPZxHAYY6iul7GnOXO1wqM8s9NQjaFCIpekgajipka8rL8aNXyl4sNuZ5jWKKChl91y1bgaayoCYgzuMAvhhpxODIRFzAx9FdSUbydfyLDzrLu9E";

/**
 * Adapter for Major League Hacking (MLH).
 * Fetches collegiate student hackathons and digital hack weeks worldwide,
 * including Indian student hackathons and digital hack weeks open to students in Karnataka.
 */
export async function fetchMlhHackathons() {
  const URL = "https://mlh.io/seasons/2026/events";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results = [];
    const seenTitles = new Set();

    // Regex to match event cards
    const cardRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?)<\/a>/gi;
    const matches = [...html.matchAll(cardRegex)];

    for (const match of matches) {
      let rawLink = match[1];
      const cardContent = match[2];
      const rawTitle = match[3].replace(/<[^>]+>/g, "").trim();

      if (!rawTitle || rawTitle.length < 3 || seenTitles.has(rawTitle.toLowerCase())) continue;
      seenTitles.add(rawTitle.toLowerCase());

      // Filter out internal non-event links
      if (rawLink.startsWith("#") || rawLink.includes("sponsor.mlh.com") || rawLink.includes("dev.to")) {
        continue;
      }

      // Clean up link
      rawLink = rawLink.replace(/&amp;/g, "&");

      // Extract image
      const imgMatch = cardContent.match(/<img[^>]+src="([^"]+)"/i);
      const img = imgMatch ? imgMatch[1] : DEFAULT_BANNER;

      // Extract location and mode
      const isDigital = cardContent.includes("Digital") || cardContent.includes("Worldwide");
      const mode = isDigital ? "Online" : "Offline";
      const isIndia = cardContent.includes("India") || cardContent.includes(", IN") || cardContent.includes("Bangalore") || cardContent.includes("Karnataka");

      // Extract dates
      const dateMatch = cardContent.match(/class="text-sm truncate">([^<]+)<\/span>/i);
      const dates = dateMatch ? dateMatch[1].trim() : "2026 Season";

      results.push({
        source: "mlh",
        sourceId: rawTitle.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        title: rawTitle,
        subtitle: `Major League Hacking (MLH) Sanctioned Event`,
        organizerName: "Major League Hacking (MLH) Community",
        officialWebsite: rawLink,
        registrationLink: rawLink,
        officialRegistrationLink: rawLink,
        description: `${rawTitle} — official Major League Hacking (MLH) 2026 collegiate hackathon. Open to student developers.`,
        dates,
        startDate: dates,
        endDate: "",
        regDeadlineDate: "",
        registrationDeadline: "Rolling Admissions",
        mode,
        location: isIndia ? "Bengaluru, Karnataka / India" : isDigital ? "Everywhere (Digital / Virtual)" : "Collegiate Venue",
        city: isIndia ? "Bengaluru" : "",
        state: isIndia ? "Karnataka" : "",
        feeType: "free",
        feeAmount: 0,
        registrationFee: "₹0 / Free",
        minTeamSize: 1,
        maxTeamSize: 4,
        prizePool: "MLH Swag, Category Prizes & Mentorship",
        tracks: ["ai", "general", "collegiate"],
        trackLabels: ["Collegiate Track", "Open Innovation", "AI / ML"],
        image: img,
      });
    }

    return results;
  } catch (err) {
    console.warn("[MLH Adapter] Error fetching:", err.message);
    return [];
  }
}

export default fetchMlhHackathons;
