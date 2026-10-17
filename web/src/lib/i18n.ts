export type Locale = "ro" | "en";
export const LOCALES: Locale[] = ["ro", "en"];

const dict = {
  en: {
    title: "Is today a good day?",
    tagline: "Western transits, the Chinese almanac and your personal day number, read together.",
    birth: "Your birth",
    name: "Name (optional, for numerology)",
    date: "Date of birth",
    time: "Time of birth",
    timeUnknown: "I don't know the time",
    place: "Place of birth",
    custom: "Other (enter coordinates)",
    lat: "Latitude",
    lon: "Longitude",
    zone: "Time zone",
    askTitle: "Ask about a day",
    askPlaceholder: "Is it a good day to meet someone new?",
    askDate: "Which day",
    askButton: "Read the day",
    asking: "Reading…",
    examples: ["Is it a good day to meet someone new?", "Should I ask for a raise today?", "Good day to sign the contract?", "Should I travel this weekend?"],
    reasons: "Why",
    category: "About",
    tabs: { today: "Today", chart: "Chart", chinese: "Chinese", numerology: "Numerology", best: "Best days" },
    bestFor: "Best days for",
    nextDays: "in the next 30 days",
    sun: "Sun", moon: "Moon", rising: "Rising", unknownRising: "unknown (no birth time)",
    planet: "Planet", sign: "Sign", house: "House", retro: "retrograde",
    animal: "Animal", element: "Element", pillars: "Four pillars (BaZi)", dayMaster: "Day master",
    todaySuitable: "Favorable today", todayAvoid: "Avoid today", relation: "Today's day vs your sign",
    lifePath: "Life path", birthday: "Birthday", expression: "Expression", soulUrge: "Soul urge", personality: "Personality",
    personalYear: "Personal year", personalMonth: "Personal month", personalDay: "Personal day",
    needName: "Add your name to see the name numbers.",
    error: "The engine is not responding. Start it with `mvn spring-boot:run` in the engine folder and try again.",
    verdict: { GOOD: "Favorable", MIXED: "Mixed", CAUTION: "Caution" },
    source: { WESTERN: "Western", CHINESE: "Chinese", NUMEROLOGY: "Numerology" },
    phase: { new: "New Moon", waxing: "Waxing Moon", full: "Full Moon", waning: "Waning Moon", balsamic: "Dark Moon" },
    disclaimer: "For entertainment purposes only.",
  },
  ro: {
    title: "E o zi bună azi?",
    tagline: "Tranzitele occidentale, almanahul chinezesc și numărul tău de zi personală, citite împreună.",
    birth: "Nașterea ta",
    name: "Nume (opțional, pentru numerologie)",
    date: "Data nașterii",
    time: "Ora nașterii",
    timeUnknown: "Nu știu ora",
    place: "Locul nașterii",
    custom: "Altul (introdu coordonate)",
    lat: "Latitudine",
    lon: "Longitudine",
    zone: "Fus orar",
    askTitle: "Întreabă despre o zi",
    askPlaceholder: "E o zi bună să cunosc o persoană nouă?",
    askDate: "Ce zi",
    askButton: "Citește ziua",
    asking: "Se citește…",
    examples: ["E o zi bună să cunosc o persoană nouă?", "Să cer o mărire de salariu azi?", "E bine să semnez contractul azi?", "Să plec în călătorie în weekend?"],
    reasons: "De ce",
    category: "Despre",
    tabs: { today: "Azi", chart: "Harta", chinese: "Chinezesc", numerology: "Numerologie", best: "Zile bune" },
    bestFor: "Cele mai bune zile pentru",
    nextDays: "în următoarele 30 de zile",
    sun: "Soare", moon: "Lună", rising: "Ascendent", unknownRising: "necunoscut (fără ora nașterii)",
    planet: "Planetă", sign: "Semn", house: "Casă", retro: "retrograd",
    animal: "Animal", element: "Element", pillars: "Cei patru piloni (BaZi)", dayMaster: "Stăpânul zilei",
    todaySuitable: "Favorabil azi", todayAvoid: "De evitat azi", relation: "Ziua de azi față de semnul tău",
    lifePath: "Calea vieții", birthday: "Ziua nașterii", expression: "Expresie", soulUrge: "Dorința sufletului", personality: "Personalitate",
    personalYear: "An personal", personalMonth: "Lună personală", personalDay: "Zi personală",
    needName: "Adaugă numele ca să vezi numerele numelui.",
    error: "Motorul nu răspunde. Pornește-l cu `mvn spring-boot:run` în folderul engine și încearcă din nou.",
    verdict: { GOOD: "Favorabil", MIXED: "Mixt", CAUTION: "Prudență" },
    source: { WESTERN: "Occidental", CHINESE: "Chinezesc", NUMEROLOGY: "Numerologie" },
    phase: { new: "Lună Nouă", waxing: "Lună în creștere", full: "Lună Plină", waning: "Lună în descreștere", balsamic: "Lună neagră" },
    disclaimer: "Doar în scop de divertisment.",
  },
};

export type Dict = typeof dict.en;
export function t(locale: Locale): Dict {
  return dict[locale] ?? dict.en;
}

export const SIGNS: Record<Locale, Record<string, string>> = {
  en: { ARIES: "Aries", TAURUS: "Taurus", GEMINI: "Gemini", CANCER: "Cancer", LEO: "Leo", VIRGO: "Virgo", LIBRA: "Libra",
    SCORPIO: "Scorpio", SAGITTARIUS: "Sagittarius", CAPRICORN: "Capricorn", AQUARIUS: "Aquarius", PISCES: "Pisces" },
  ro: { ARIES: "Berbec", TAURUS: "Taur", GEMINI: "Gemeni", CANCER: "Rac", LEO: "Leu", VIRGO: "Fecioară", LIBRA: "Balanță",
    SCORPIO: "Scorpion", SAGITTARIUS: "Săgetător", CAPRICORN: "Capricorn", AQUARIUS: "Vărsător", PISCES: "Pești" },
};

export const PLANETS: Record<Locale, Record<string, string>> = {
  en: { SUN: "Sun", MOON: "Moon", MERCURY: "Mercury", VENUS: "Venus", MARS: "Mars", JUPITER: "Jupiter", SATURN: "Saturn",
    URANUS: "Uranus", NEPTUNE: "Neptune", PLUTO: "Pluto" },
  ro: { SUN: "Soare", MOON: "Lună", MERCURY: "Mercur", VENUS: "Venus", MARS: "Marte", JUPITER: "Jupiter", SATURN: "Saturn",
    URANUS: "Uranus", NEPTUNE: "Neptun", PLUTO: "Pluto" },
};

export const ANIMALS: Record<Locale, Record<string, string>> = {
  en: { RAT: "Rat", OX: "Ox", TIGER: "Tiger", RABBIT: "Rabbit", DRAGON: "Dragon", SNAKE: "Snake", HORSE: "Horse", GOAT: "Goat",
    MONKEY: "Monkey", ROOSTER: "Rooster", DOG: "Dog", PIG: "Pig" },
  ro: { RAT: "Șobolan", OX: "Bivol", TIGER: "Tigru", RABBIT: "Iepure", DRAGON: "Dragon", SNAKE: "Șarpe", HORSE: "Cal", GOAT: "Capră",
    MONKEY: "Maimuță", ROOSTER: "Cocoș", DOG: "Câine", PIG: "Porc" },
};

export const ELEMENTS: Record<Locale, Record<string, string>> = {
  en: { WOOD: "Wood", FIRE: "Fire", EARTH: "Earth", METAL: "Metal", WATER: "Water", YIN: "Yin", YANG: "Yang" },
  ro: { WOOD: "Lemn", FIRE: "Foc", EARTH: "Pământ", METAL: "Metal", WATER: "Apă", YIN: "Yin", YANG: "Yang" },
};

export const RELATIONS: Record<Locale, Record<string, string>> = {
  en: { CLASH: "clash", HARM: "harm", HARMONY: "harmony", TRINE: "triple harmony", NEUTRAL: "neutral" },
  ro: { CLASH: "conflict", HARM: "vătămare", HARMONY: "armonie", TRINE: "triplă armonie", NEUTRAL: "neutru" },
};

export const CATEGORIES: Record<Locale, Record<string, string>> = {
  en: { LOVE: "Love & social", CAREER: "Career", MONEY: "Money", TRAVEL: "Travel", COMMUNICATION: "Communication",
    HOME: "Home & family", WELLBEING: "Wellbeing", GENERAL: "Overall" },
  ro: { LOVE: "Dragoste & social", CAREER: "Carieră", MONEY: "Bani", TRAVEL: "Călătorii", COMMUNICATION: "Comunicare",
    HOME: "Casă & familie", WELLBEING: "Stare de bine", GENERAL: "În general" },
};

export const SIGN_GLYPHS: Record<string, string> = {
  ARIES: "♈", TAURUS: "♉", GEMINI: "♊", CANCER: "♋", LEO: "♌", VIRGO: "♍", LIBRA: "♎", SCORPIO: "♏",
  SAGITTARIUS: "♐", CAPRICORN: "♑", AQUARIUS: "♒", PISCES: "♓",
};
export const PLANET_GLYPHS: Record<string, string> = {
  SUN: "☉", MOON: "☽", MERCURY: "☿", VENUS: "♀", MARS: "♂", JUPITER: "♃", SATURN: "♄", URANUS: "♅", NEPTUNE: "♆", PLUTO: "♇",
};
export const PHASE_GLYPHS: Record<string, string> = { new: "🌑", waxing: "🌔", full: "🌕", waning: "🌖", balsamic: "🌘" };
