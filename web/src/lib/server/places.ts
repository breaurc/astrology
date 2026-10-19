import { PLACES } from "../api";
import type { Place } from "../profile";

/**
 * GET /api/places?q=iasi&lang=ro → up to 8 places with coordinates and IANA time zone.
 * Uses the Open-Meteo geocoder (GeoNames data, free, no key). Falls back to the built-in demo list when offline.
 * Set GEOCODER_URL to point at your own instance.
 */
export async function searchPlaces(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ro";
  if (q.length < 2) return Response.json([]);

  try {
    const base = process.env.GEOCODER_URL || "https://geocoding-api.open-meteo.com/v1/search";
    const res = await fetch(`${base}?${new URLSearchParams({ name: q, count: "8", language: lang, format: "json" })}`,
      { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { results?: GeoResult[] };
    const seen = new Set<string>();
    const places: Place[] = (data.results ?? [])
      .filter((r) => r.timezone)
      .map((r) => {
        const region = r.admin1 && r.admin1 !== r.name ? r.admin1 : r.admin2 && r.admin2 !== r.name ? r.admin2 : null;
        let label = [r.name, region, r.country].filter(Boolean).join(", ");
        // Same name in the same region (city vs. commune): add the next admin level, else the coordinates.
        if (seen.has(label)) label = [r.name, r.admin2 && r.admin2 !== region ? r.admin2 : `${r.latitude.toFixed(2)}°, ${r.longitude.toFixed(2)}°`, region, r.country].filter(Boolean).join(", ");
        seen.add(label);
        return { label, latitude: r.latitude, longitude: r.longitude, zone: r.timezone!, country: r.country_code };
      });
    return Response.json(places, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    const needle = fold(q);
    return Response.json(PLACES.filter((p) => fold(p.label).includes(needle))
      .map((p) => ({ label: p.label, latitude: p.lat, longitude: p.lon, zone: p.zone } satisfies Place)));
  }
}

interface GeoResult { name: string; latitude: number; longitude: number; timezone?: string; admin1?: string; admin2?: string; country?: string; country_code?: string; }

function fold(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
