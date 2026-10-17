export interface Birth {
  name?: string;
  date: string;          // yyyy-mm-dd
  time?: string | null;  // HH:mm or null when unknown
  zone: string;          // IANA
  latitude: number;
  longitude: number;
}

export interface Position { body: string; longitude: number; sign: string; degree: number; retrograde: boolean; house: number; }
export interface Chart {
  timeKnown: boolean; sunSign: string; moonSign: string; risingSign?: string;
  positions: Position[]; aspects: { a: string; b: string; aspect: string; orb: number }[];
  houseCusps: number[]; ascendant?: number; midheaven?: number;
}
export interface ChineseProfile { animal: string; element: string; yinYang: string; yearBranch: string; pillars: (string | null)[]; dayMaster: string; lunarDate: string; }
export interface Almanac { dayAnimal: string; dayBranch: string; suitable: string[]; avoid: string[]; favorable: string[]; unfavorable: string[]; auspiciousDay: boolean; relationToNatal: string; }
export interface Numerology { lifePath: number; birthday: number; expression?: number; soulUrge?: number; personality?: number; personalYear: number; personalMonth: number; personalDay: number; }
export interface Reason { source: string; text: string; weight: number; }
export interface CategoryScore { score: number; verdict: "GOOD" | "MIXED" | "CAUTION"; label: string; reasons: Reason[]; }
export interface Day { date: string; context: Record<string, string>; categories: Record<string, CategoryScore>; disclaimer: string; }
export interface Answer {
  question: string; date: string; category: string; score: number; verdict: "GOOD" | "MIXED" | "CAUTION";
  reasons: Reason[]; text: string; narrator: string; guardrail: string; disclaimer: string; context?: Record<string, string>;
}
export interface BestDay { date: string; score: number; verdict: "GOOD" | "MIXED" | "CAUTION"; reasons: Reason[]; }

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/engine${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  chart: (birth: Birth) => post<Chart>("/chart", birth),
  chinese: (birth: Birth, date: string) => post<{ profile: ChineseProfile; today: Almanac }>(`/chinese?date=${date}`, birth),
  numerology: (birth: Birth, date: string) => post<Numerology>(`/numerology?date=${date}`, birth),
  day: (birth: Birth, date: string, locale: string) => post<Day>(`/day?date=${date}&locale=${locale}`, birth),
  ask: (birth: Birth, question: string, date: string, locale: string) => post<Answer>("/ask", { birth, question, date, locale }),
  bestDays: (birth: Birth, category: string, from: string, locale: string) =>
    post<BestDay[]>("/best-days", { birth, category, from, days: 30, limit: 5, locale }),
};

/** Demo place list; production should use a geocoder (GeoNames) with timezone lookup. */
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
