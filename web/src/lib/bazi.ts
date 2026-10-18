/**
 * Readable labels for BaZi pillars. The engine (lunar-java) returns pillars as two Chinese
 * characters: a Heavenly Stem (element + yin/yang) followed by an Earthly Branch (animal),
 * e.g. "庚午" = Yang Metal Horse. The day master is a single stem, e.g. "辛" = Yin Metal.
 */
import { ANIMALS, ELEMENTS, type Locale } from "./i18n";

const STEMS: Record<string, { element: string; polarity: "YANG" | "YIN" }> = {
  "甲": { element: "WOOD", polarity: "YANG" }, "乙": { element: "WOOD", polarity: "YIN" },
  "丙": { element: "FIRE", polarity: "YANG" }, "丁": { element: "FIRE", polarity: "YIN" },
  "戊": { element: "EARTH", polarity: "YANG" }, "己": { element: "EARTH", polarity: "YIN" },
  "庚": { element: "METAL", polarity: "YANG" }, "辛": { element: "METAL", polarity: "YIN" },
  "壬": { element: "WATER", polarity: "YANG" }, "癸": { element: "WATER", polarity: "YIN" },
};

const BRANCHES: Record<string, string> = {
  "子": "RAT", "丑": "OX", "寅": "TIGER", "卯": "RABBIT", "辰": "DRAGON", "巳": "SNAKE",
  "午": "HORSE", "未": "GOAT", "申": "MONKEY", "酉": "ROOSTER", "戌": "DOG", "亥": "PIG",
};

export const PILLAR_NAMES: Record<Locale, string[]> = {
  en: ["Year", "Month", "Day", "Hour"],
  ro: ["An", "Lună", "Zi", "Oră"],
};

/** "Yin Metal" (en) / "Metal Yin" (ro); falls back to the raw text when unknown. */
export function stemLabel(stem: string | null | undefined, locale: Locale): string {
  if (!stem) return "";
  const s = STEMS[stem.charAt(0)];
  if (!s) return stem;
  const el = ELEMENTS[locale][s.element];
  const pol = ELEMENTS[locale][s.polarity];
  return locale === "ro" ? `${el} ${pol}` : `${pol} ${el}`;
}

/** "Yang Metal Horse" (en) / "Cal de Metal Yang" (ro); falls back to the raw text when unknown. */
export function pillarLabel(pillar: string | null | undefined, locale: Locale): string {
  if (!pillar) return "";
  const stem = STEMS[pillar.charAt(0)];
  const animalKey = BRANCHES[pillar.charAt(1)];
  if (!stem || !animalKey) return pillar;
  const animal = ANIMALS[locale][animalKey];
  const el = ELEMENTS[locale][stem.element];
  const pol = ELEMENTS[locale][stem.polarity];
  return locale === "ro" ? `${animal} de ${el} ${pol}` : `${pol} ${el} ${animal}`;
}
