const GEO_HEADERS = {
  country: ["x-vercel-ip-country", "cf-ipcountry"],
  region: ["x-vercel-ip-region"],
  city: ["x-vercel-ip-city"],
};

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

export function getGeoFromHeaders(headers: Headers) {
  const country = firstHeader(headers, GEO_HEADERS.country);
  const region = firstHeader(headers, GEO_HEADERS.region);
  const city = firstHeader(headers, GEO_HEADERS.city);

  return {
    country: country && country !== "XX" ? country : null,
    region: region || null,
    city: city || null,
  };
}

export function getDeviceType(userAgent: string | null) {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) return "bot";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  if (ua.includes("mobi") || ua.includes("android")) return "mobile";
  return "desktop";
}
