/** Birth data as the engine expects it. The browser never calls the engine directly; see lib/server/engine.ts. */
export interface Birth {
  name?: string;
  date: string;          // yyyy-mm-dd
  time?: string | null;  // HH:mm or null when unknown
  zone: string;          // IANA
  latitude: number;
  longitude: number;
}

/** Offline fallback for the place search (lib/server/places.ts) when the geocoder is unreachable. */
export const PLACES = [
  { id: "iasi", label: "Iași, România", lat: 47.16, lon: 27.59, zone: "Europe/Bucharest" },
  { id: "bucuresti", label: "București, România", lat: 44.43, lon: 26.10, zone: "Europe/Bucharest" },
  { id: "cluj", label: "Cluj-Napoca, România", lat: 46.77, lon: 23.59, zone: "Europe/Bucharest" },
  { id: "timisoara", label: "Timișoara, România", lat: 45.75, lon: 21.23, zone: "Europe/Bucharest" },
  { id: "chisinau", label: "Chișinău, Moldova", lat: 47.01, lon: 28.86, zone: "Europe/Chisinau" },
  { id: "bruxelles", label: "Bruxelles, Belgique", lat: 50.85, lon: 4.35, zone: "Europe/Brussels" },
  { id: "london", label: "London, UK", lat: 51.51, lon: -0.13, zone: "Europe/London" },
  { id: "newyork", label: "New York, USA", lat: 40.71, lon: -74.01, zone: "America/New_York" },
];
