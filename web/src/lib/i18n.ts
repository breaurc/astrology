export type Locale = "ro" | "en";
export const LOCALES: Locale[] = ["ro", "en"];

/** Copy for the funnel screens (SPEC section 4). Account, sign-in and profile copy lives in i18n-account.ts. */
const dict = {
  en: {
    brand: "Cosmic Triad",
    nav: { signIn: "Sign in", week: "My week", profile: "Profile", credits: "credits", getCredits: "Get credits", reading: "Reading" },
    landing: {
      title: "Your reading, in one step.",
      subtitle: "Birth data stays in your browser. The reading appears as soon as you press the button.",
      systems: { WESTERN: "Western", CHINESE: "Chinese", NUMEROLOGY: "Numerology" } as Record<string, string>,
      name: "Name", namePh: "Ana", date: "Birth date", time: "Time (optional)", place: "Birth place",
      placeNote: "Numerology does not use the place; the date and the name are enough.",
      submit: "Get my reading", busy: "Reading the sky…",
      free: "Free · no account needed · your data stays on this device",
      accountBox: { free: "With a free account", freeText: "7-day calendar · ask one question per day", paid: "With credits", paidText: "Talk to your chart in a real conversation" },
      edit: "Edit data",
      errors: {
        date: "Enter a real birth date.", time: "Use the HH:MM format.", place: "Choose your birth place.", name: "The name is too long.",
        quota: "That was the last free reading for today from this connection. Come back tomorrow or sign in.",
        engine: "The engine is not available right now. Try again in a moment.",
        generic: "Something went wrong. Please try again.",
      } as Record<string, string>,
    },
    reading: {
      today: "Today, {date}",
      note: "Short free reading. The full narration and follow-ups live in the conversation.",
      lifePath: "Life path", personalDay: "Personal day", moonIn: "Moon in", rising: "Rising", dayOf: "Day of the",
      favorable: "Almanac favours", unfavorable: "Almanac advises against", retro: "retrograde",
      locked7: "NEXT 7 DAYS", lockedQ: "ASK ABOUT TODAY", unlock: "Sign in to unlock", unlockAsk: "Sign in to ask",
      lockedCalText: "Good days for meetings, contracts, travel, at a glance.", lockedAskText: "One question per day with a free account.",
      askPlaceholder: "Is it a good day to meet someone new?",
      strip: { title: "Talk to your chart", text: "A real back-and-forth conversation about your chart and your week · runs on credits", cta: "See plans" },
    },
    sheet: {
      title: "Keep your chart. Unlock the week.",
      text: "A free account saves {name}'s birth data, opens the 7-day calendar and lets you ask one question a day.",
      textAnon: "A free account saves your birth data, opens the 7-day calendar and lets you ask one question a day.",
      notNow: "Not now, back to my reading",
    },
    app: {
      title: "Your week, {name}", titleAnon: "Your week",
      needBirthTitle: "First, your birth data", needBirth: "Your account is ready. Add your birth data once and your week appears here every day.",
      saveBirth: "Save and show my week", saving: "Saving…",
      legend: { GOOD: "favourable", MIXED: "mixed", CAUTION: "careful" } as Record<string, string>,
      goodFor: "Good for", avoid: "Avoid", computed: "Computed from transits against your chart; rolls forward every day.",
      ask: "ASK ABOUT TODAY", left: "1 of 1 left today", used: "0 of 1 left today", unlimited: "unlimited today",
      askBtn: "Ask", asking: "Asking…", oneAnswer: "One answer, no follow-ups. Follow-ups are a conversation.",
      usedHint: "Today's question is answered; it resets at midnight. Want to go deeper? Open a conversation.",
      yourQuestion: "Your question", answer: "Answer",
      conv: "Conversation", credits: "{n} credits", credit1: "1 credit", getCredits: "Get credits", newThread: "New conversation", opening: "Opening…",
      threads: "Your conversations", closed: "closed", open: "open", messages: "{n}/{cap} messages",
      noThreads: "No conversations yet. One credit opens one conversation of up to {cap} messages.",
      convLocked: "Multi-turn conversation with your chart. Runs on credits.",
      maintenance: "The AI engine is paused for today (daily budget reached). Readings and the calendar still work.",
      retry: "The engine did not answer. Nothing was used; please try again.",
      generic: "Something went wrong. Please try again.",
    },
    chat: {
      title: "Conversation", counter: "{n} of {cap} messages", placeholder: "Write to your chart…", send: "Send",
      closed: "This conversation is closed.", openNew: "Open a new conversation", back: "My week",
      tooLong: "At most {n} characters.", disclaimer: "For entertainment only. Not medical, legal or financial advice.",
      end: "End conversation", endNote: "A conversation with no messages gives its credit back.",
      empty: "Your chart, today's sky and the week ahead are on the table. Ask anything about them.",
    },
    credits: {
      back: "Back", signedInAs: "Signed in as {name}", title: "Talk to your chart",
      text: "A conversation goes back and forth as long as you need. It costs us real compute per message, so it runs on credits.",
      pkg: { single: "1 conversation", pack: "5 conversations", monthly: "Monthly" } as Record<string, string>,
      pkgNote: { single: "up to {cap} messages", pack: "never expire", monthly: "unlimited questions + 10 conversations" } as Record<string, string>,
      mostChosen: "MOST CHOSEN", pay: "Continue to payment", paying: "Redirecting…",
      note: "Stripe checkout · invoice by email · prices are placeholders",
      devNote: "Development mode: the purchase is simulated, nothing is charged.",
      balance: "You have {n} credits", signIn: "Sign in to buy credits",
      done: {
        waiting: "Confirming your payment…", ok: "Credits added. You now have {n}.", start: "Start a conversation", week: "Back to my week",
        slow: "Still waiting for Stripe's confirmation. This page keeps checking; your credits appear as soon as it arrives.",
      },
      demo: ["Should I change jobs this month?",
        "With Saturn squaring your Midheaven until the 20th, the offer is real but the timing is tight. Tell me, is it a lateral move or a step up?",
        "A step up, but more travel…"],
    },
    footer: { copyright: "© cosmictriad.com", privacy: "Privacy", terms: "Terms", fun: "For entertainment purposes" },
    verdict: { GOOD: "Favourable", MIXED: "Mixed", CAUTION: "Careful" } as Record<string, string>,
    phase: { new: "New Moon", waxing: "Waxing Moon", full: "Full Moon", waning: "Waning Moon", balsamic: "Dark Moon" } as Record<string, string>,
    source: { WESTERN: "Western", CHINESE: "Chinese", NUMEROLOGY: "Numerology" } as Record<string, string>,
    disclaimer: "For entertainment purposes only.",
  },
  ro: {
    brand: "Cosmic Triad",
    nav: { signIn: "Intră în cont", week: "Săptămâna mea", profile: "Profil", credits: "credite", getCredits: "Ia credite", reading: "Citire" },
    landing: {
      title: "Citirea ta, într-un singur pas.",
      subtitle: "Datele de naștere rămân în browserul tău. Citirea apare imediat ce apeși butonul.",
      systems: { WESTERN: "Occidental", CHINESE: "Chinezesc", NUMEROLOGY: "Numerologie" } as Record<string, string>,
      name: "Nume", namePh: "Ana", date: "Data nașterii", time: "Ora (opțional)", place: "Locul nașterii",
      placeNote: "Numerologia nu folosește locul; data și numele sunt suficiente.",
      submit: "Citirea mea", busy: "Citim cerul…",
      free: "Gratuit · fără cont · datele rămân pe acest dispozitiv",
      accountBox: { free: "Cu un cont gratuit", freeText: "Calendar pe 7 zile · o întrebare pe zi", paid: "Cu credite", paidText: "Vorbește cu harta ta într-o conversație adevărată" },
      edit: "Modifică datele",
      errors: {
        date: "Introdu o dată de naștere reală.", time: "Folosește formatul HH:MM.", place: "Alege locul nașterii.", name: "Numele e prea lung.",
        quota: "Asta a fost ultima citire gratuită de azi de pe această conexiune. Revino mâine sau intră în cont.",
        engine: "Motorul nu e disponibil acum. Încearcă din nou peste câteva clipe.",
        generic: "Ceva n-a mers. Încearcă din nou.",
      } as Record<string, string>,
    },
    reading: {
      today: "Azi, {date}",
      note: "Citire scurtă, gratuită. Narațiunea completă și întrebările de continuare sunt în conversație.",
      lifePath: "Calea vieții", personalDay: "Zi personală", moonIn: "Luna în", rising: "Ascendent", dayOf: "Ziua",
      favorable: "Almanahul favorizează", unfavorable: "Almanahul nu recomandă", retro: "retrograd",
      locked7: "URMĂTOARELE 7 ZILE", lockedQ: "ÎNTREABĂ DESPRE AZI", unlock: "Intră în cont ca să deblochezi", unlockAsk: "Intră în cont ca să întrebi",
      lockedCalText: "Zilele bune pentru întâlniri, contracte, călătorii, dintr-o privire.", lockedAskText: "O întrebare pe zi cu un cont gratuit.",
      askPlaceholder: "E o zi bună să cunosc o persoană nouă?",
      strip: { title: "Vorbește cu harta ta", text: "O conversație adevărată despre harta ta și săptămâna ta · pe credite", cta: "Vezi planurile" },
    },
    sheet: {
      title: "Păstrează-ți harta. Deblochează săptămâna.",
      text: "Un cont gratuit salvează datele de naștere ale lui {name}, deschide calendarul pe 7 zile și îți dă o întrebare pe zi.",
      textAnon: "Un cont gratuit îți salvează datele de naștere, deschide calendarul pe 7 zile și îți dă o întrebare pe zi.",
      notNow: "Nu acum, înapoi la citire",
    },
    app: {
      title: "Săptămâna ta, {name}", titleAnon: "Săptămâna ta",
      needBirthTitle: "Mai întâi, datele tale de naștere", needBirth: "Contul e gata. Adaugă datele de naștere o singură dată și săptămâna ta apare aici în fiecare zi.",
      saveBirth: "Salvează și arată-mi săptămâna", saving: "Se salvează…",
      legend: { GOOD: "favorabilă", MIXED: "mixtă", CAUTION: "cu grijă" } as Record<string, string>,
      goodFor: "Bună pentru", avoid: "Evită", computed: "Calculat din tranzite față de harta ta; se actualizează zilnic.",
      ask: "ÎNTREABĂ DESPRE AZI", left: "1 din 1 rămasă azi", used: "0 din 1 rămase azi", unlimited: "nelimitat azi",
      askBtn: "Întreabă", asking: "Se întreabă…", oneAnswer: "Un răspuns, fără continuare. Continuările sunt o conversație.",
      usedHint: "Întrebarea de azi are răspuns; se reîmprospătează la miezul nopții. Vrei mai mult? Deschide o conversație.",
      yourQuestion: "Întrebarea ta", answer: "Răspuns",
      conv: "Conversație", credits: "{n} credite", credit1: "1 credit", getCredits: "Ia credite", newThread: "Conversație nouă", opening: "Se deschide…",
      threads: "Conversațiile tale", closed: "închisă", open: "deschisă", messages: "{n}/{cap} mesaje",
      noThreads: "Nicio conversație încă. Un credit deschide o conversație de până la {cap} mesaje.",
      convLocked: "Conversație în mai multe schimburi cu harta ta. Pe credite.",
      maintenance: "Motorul AI e în pauză azi (bugetul zilnic a fost atins). Citirile și calendarul funcționează.",
      retry: "Motorul nu a răspuns. Nu s-a consumat nimic; încearcă din nou.",
      generic: "Ceva n-a mers. Încearcă din nou.",
    },
    chat: {
      title: "Conversație", counter: "{n} din {cap} mesaje", placeholder: "Scrie-i hărții tale…", send: "Trimite",
      closed: "Conversația asta s-a încheiat.", openNew: "Deschide o conversație nouă", back: "Săptămâna mea",
      tooLong: "Cel mult {n} caractere.", disclaimer: "Doar în scop de divertisment. Nu e sfat medical, juridic sau financiar.",
      end: "Încheie conversația", endNote: "O conversație fără mesaje îți dă creditul înapoi.",
      empty: "Harta ta, cerul de azi și săptămâna care vine sunt pe masă. Întreabă orice despre ele.",
    },
    credits: {
      back: "Înapoi", signedInAs: "Conectat ca {name}", title: "Vorbește cu harta ta",
      text: "O conversație merge înainte și înapoi cât ai nevoie. Fiecare mesaj ne costă calcul real, așa că merge pe credite.",
      pkg: { single: "1 conversație", pack: "5 conversații", monthly: "Lunar" } as Record<string, string>,
      pkgNote: { single: "până la {cap} mesaje", pack: "nu expiră niciodată", monthly: "întrebări nelimitate + 10 conversații" } as Record<string, string>,
      mostChosen: "CEL MAI ALES", pay: "Continuă spre plată", paying: "Te redirecționăm…",
      note: "Plată prin Stripe · factura pe email · prețurile sunt orientative",
      devNote: "Mod de dezvoltare: achiziția e simulată, nu se percepe nimic.",
      balance: "Ai {n} credite", signIn: "Intră în cont ca să cumperi credite",
      done: {
        waiting: "Confirmăm plata…", ok: "Creditele au fost adăugate. Ai acum {n}.", start: "Începe o conversație", week: "Înapoi la săptămâna mea",
        slow: "Încă așteptăm confirmarea de la Stripe. Pagina verifică în continuare; creditele apar imediat ce sosește.",
      },
      demo: ["Să-mi schimb jobul luna asta?",
        "Cu Saturn în cuadratură cu Mijlocul Cerului până pe 20, oferta e reală, dar momentul e strâns. Spune-mi, e o mutare laterală sau un pas înainte?",
        "Un pas înainte, dar cu mai multe deplasări…"],
    },
    footer: { copyright: "© cosmictriad.com", privacy: "Confidențialitate", terms: "Termeni", fun: "Doar în scop de divertisment" },
    verdict: { GOOD: "Favorabilă", MIXED: "Mixtă", CAUTION: "Cu grijă" } as Record<string, string>,
    phase: { new: "Lună Nouă", waxing: "Lună în creștere", full: "Lună Plină", waning: "Lună în descreștere", balsamic: "Lună neagră" } as Record<string, string>,
    source: { WESTERN: "Occidental", CHINESE: "Chinezesc", NUMEROLOGY: "Numerologie" } as Record<string, string>,
    disclaimer: "Doar în scop de divertisment.",
  },
};

export type Dict = typeof dict.en;
export function t(locale: Locale): Dict {
  return dict[locale] ?? dict.en;
}

export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** "7 November" / "7 noiembrie" in the visitor's language. */
export function longDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}

export function weekday(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`)).replace(".", "");
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
