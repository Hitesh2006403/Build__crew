// backend/services/ingestion/adapters/unstopAdapter.js

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

function parsePrizePool(item) {
  if (item.prizes && Array.isArray(item.prizes) && item.prizes.length > 0) {
    const totalCash = item.prizes.reduce((sum, p) => sum + (Number(p.cash) || 0), 0);
    if (totalCash > 0) {
      return `₹${totalCash.toLocaleString("en-IN")}`;
    }
  }
  return "Prizes & Recognition";
}

function parseFee(item) {
  const payment = item.payment_services?.[0];
  if (payment && Number(payment.amount) > 0) {
    return {
      feeType: "paid",
      feeAmount: Number(payment.amount),
      registrationFee: `₹${payment.amount}`,
    };
  }
  return {
    feeType: "free",
    feeAmount: 0,
    registrationFee: "₹0 / Free",
  };
}

export async function fetchUnstopHackathons() {
  const searchTerms = ["bangalore", "bengaluru", "karnataka", "mysore", "mangalore", "manipal", "hubli"];
  const seenIds = new Set();
  const results = [];

  for (const term of searchTerms) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&searchTerm=${encodeURIComponent(
        term
      )}&per_page=25&oppstatus=open`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const items = data?.data?.data || [];

      for (const item of items) {
        if (!item || !item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const fee = parseFee(item);
        const city = item.address_with_country_logo?.city || item.city || "";
        const state = item.address_with_country_logo?.state || "Karnataka";
        const orgName = item.organisation?.name || "Collegiate Host";

        const regDeadline = item.regnRequirements?.end_regn_dt || "";
        const startDate = item.start_date || "";
        const endDate = item.end_date || "";

        const dateDisplay =
          startDate && endDate
            ? `${formatDateStr(startDate)} - ${formatDateStr(endDate)}`
            : formatDateStr(startDate) || formatDateStr(regDeadline) || "Upcoming 2026";

        // Extract tracks from required skills or default to General / AI
        const rawSkills = (item.required_skills || []).map((s) => s.skill || s.skill_name).filter(Boolean);
        const trackLabels = rawSkills.length > 0 ? rawSkills.slice(0, 4) : ["AI / ML", "Full Stack", "General"];
        const tracks = trackLabels.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10));

        const isOnline = item.regnRequirements?.work_location_type === "online" || !city;
        const mode = isOnline ? "Online" : "Offline";
        const locationStr = city ? `${city}, ${state}` : "Karnataka / Virtual";

        const publicUrl = item.public_url ? `https://unstop.com/${item.public_url}` : item.short_url || "";
        const bannerImg = item.logoUrl2 || item.banner_mobile?.image_url || DEFAULT_BANNER;

        results.push({
          source: "unstop",
          sourceId: String(item.id),
          title: item.title,
          subtitle: `Organized by ${orgName}`,
          organizerName: orgName,
          officialWebsite: publicUrl,
          registrationLink: publicUrl,
          officialRegistrationLink: publicUrl,
          description: item.seo_meta_description || `${item.title} organized by ${orgName}.`,
          dates: dateDisplay,
          startDateRaw: startDate,
          endDateRaw: endDate,
          startDate: formatDateStr(startDate),
          endDate: formatDateStr(endDate),
          regDeadlineDate: regDeadline,
          registrationDeadline: formatDateStr(regDeadline) || "Rolling Admissions",
          mode,
          location: locationStr,
          city,
          state,
          feeType: fee.feeType,
          feeAmount: fee.feeAmount,
          registrationFee: fee.registrationFee,
          minTeamSize: Number(item.regnRequirements?.min_team_size) || 1,
          maxTeamSize: Number(item.regnRequirements?.max_team_size) || 4,
          prizePool: parsePrizePool(item),
          tracks,
          trackLabels,
          image: bannerImg,
          address: item.address_with_country_logo?.address || "",
        });
      }
    } catch (err) {
      console.warn(`[Unstop Adapter] Search error for term "${term}":`, err.message);
    }
  }

  return results;
}

export default fetchUnstopHackathons;
