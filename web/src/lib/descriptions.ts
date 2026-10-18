/**
 * Interpretive texts for the Profile panel (RO/EN). These are the "meanings" shown next to the
 * computed facts: Sun/Moon/Rising sign, Western element, Chinese animal and element, retrograde
 * planets and numerology numbers. Edit freely; nothing here affects scoring.
 */
import type { Locale } from "./i18n";

type L<T> = Record<Locale, T>;

export type WesternElement = "FIRE" | "EARTH" | "AIR" | "WATER";
export type Modality = "CARDINAL" | "FIXED" | "MUTABLE";

export interface SignInfo { element: WesternElement; modality: Modality; ruler: string; lucky: number[]; }

/** Classical correspondences per Sun sign. Lucky numbers follow the popular tradition. */
export const SIGN_INFO: Record<string, SignInfo> = {
  ARIES:       { element: "FIRE",  modality: "CARDINAL", ruler: "MARS",    lucky: [1, 9] },
  TAURUS:      { element: "EARTH", modality: "FIXED",    ruler: "VENUS",   lucky: [2, 6] },
  GEMINI:      { element: "AIR",   modality: "MUTABLE",  ruler: "MERCURY", lucky: [3, 5] },
  CANCER:      { element: "WATER", modality: "CARDINAL", ruler: "MOON",    lucky: [2, 7] },
  LEO:         { element: "FIRE",  modality: "FIXED",    ruler: "SUN",     lucky: [1, 4] },
  VIRGO:       { element: "EARTH", modality: "MUTABLE",  ruler: "MERCURY", lucky: [3, 5] },
  LIBRA:       { element: "AIR",   modality: "CARDINAL", ruler: "VENUS",   lucky: [6, 9] },
  SCORPIO:     { element: "WATER", modality: "FIXED",    ruler: "PLUTO",   lucky: [8, 9] },
  SAGITTARIUS: { element: "FIRE",  modality: "MUTABLE",  ruler: "JUPITER", lucky: [3, 9] },
  CAPRICORN:   { element: "EARTH", modality: "CARDINAL", ruler: "SATURN",  lucky: [4, 8] },
  AQUARIUS:    { element: "AIR",   modality: "FIXED",    ruler: "URANUS",  lucky: [4, 7] },
  PISCES:      { element: "WATER", modality: "MUTABLE",  ruler: "NEPTUNE", lucky: [3, 7] },
};

export const WESTERN_ELEMENTS: L<Record<WesternElement, string>> = {
  en: { FIRE: "Fire", EARTH: "Earth", AIR: "Air", WATER: "Water" },
  ro: { FIRE: "Foc", EARTH: "Pământ", AIR: "Aer", WATER: "Apă" },
};

export const MODALITIES: L<Record<Modality, string>> = {
  en: { CARDINAL: "Cardinal", FIXED: "Fixed", MUTABLE: "Mutable" },
  ro: { CARDINAL: "Cardinal", FIXED: "Fix", MUTABLE: "Mutabil" },
};

export const SIGN_TEXT: L<Record<string, { sun: string; moon: string; rising: string }>> = {
  en: {
    ARIES: {
      sun: "Bold, direct and quick to act, you lead with instinct and thrive on fresh starts. Patience is the skill to grow; your courage opens doors that caution keeps shut.",
      moon: "Emotions arrive fast and pass fast; you need action to process feelings.",
      rising: "You come across as energetic and direct, someone who gets things moving.",
    },
    TAURUS: {
      sun: "Steady, sensual and loyal, you build slowly and keep what you build. Comfort and security matter to you; stubbornness is the shadow of your reliability.",
      moon: "You feel safe through routine, touch and comfort; change unsettles you at first.",
      rising: "You come across as calm, grounded and pleasant to be around.",
    },
    GEMINI: {
      sun: "Curious, quick-witted and sociable, you live through ideas and conversation. You adapt fast and learn faster; focus is what turns your many interests into results.",
      moon: "You process feelings by talking and thinking; variety keeps you emotionally fresh.",
      rising: "You come across as lively, talkative and curious about everyone.",
    },
    CANCER: {
      sun: "Protective, intuitive and deeply loyal, you feel the room before anyone speaks. Home and close bonds anchor you; guard against carrying everyone's moods as your own.",
      moon: "Deeply sensitive and nurturing; you need a secure home base to feel at ease.",
      rising: "You come across as gentle and caring, with a protective reserve.",
    },
    LEO: {
      sun: "Warm, generous and naturally expressive, you want to create and be seen doing it. Your confidence lifts others; remember that applause is sweetest when shared.",
      moon: "You need to feel appreciated; generosity and drama both come from the heart.",
      rising: "You come across as warm and confident, hard to overlook.",
    },
    VIRGO: {
      sun: "Precise, helpful and quietly observant, you notice what others miss and fix it. Your care shows in details; perfectionism is the habit to keep in check.",
      moon: "You feel calm when things are in order; worry is how care shows up when it has nowhere to go.",
      rising: "You come across as modest, precise and quietly competent.",
    },
    LIBRA: {
      sun: "Charming, fair-minded and drawn to beauty, you seek balance in everything. You read people well and smooth conflicts; deciding for yourself is your growth edge.",
      moon: "Harmony soothes you and conflict drains you; you feel best in good company.",
      rising: "You come across as gracious, diplomatic and easy to like.",
    },
    SCORPIO: {
      sun: "Intense, private and perceptive, you want depth, not surface. Loyalty runs deep with you, and so does memory; letting go is your hardest and most freeing lesson.",
      moon: "Feelings run deep and private; trust is earned slowly and kept fiercely.",
      rising: "You come across as intense and magnetic, with an air of mystery.",
    },
    SAGITTARIUS: {
      sun: "Optimistic, candid and restless, you need horizons, ideas and movement. Your honesty is refreshing; tact and follow-through make it land.",
      moon: "You need freedom and a sense of meaning; humor is your emotional reset.",
      rising: "You come across as open, upbeat and adventurous.",
    },
    CAPRICORN: {
      sun: "Ambitious, disciplined and patient, you play the long game and usually win it. Responsibility comes naturally; allow yourself rest and lightness along the way.",
      moon: "You keep feelings contained and show love through reliability and effort.",
      rising: "You come across as serious, capable and self-possessed.",
    },
    AQUARIUS: {
      sun: "Independent, inventive and humane, you think in systems and care about the group. You value freedom and originality; warmth up close is what makes your ideals real.",
      moon: "You need space to feel; you understand emotions best from a little distance.",
      rising: "You come across as original, friendly and a little unconventional.",
    },
    PISCES: {
      sun: "Compassionate, imaginative and intuitive, you absorb what others feel and turn it into art or kindness. Boundaries protect your gift from becoming exhaustion.",
      moon: "Porous and empathetic; music, water and quiet time restore you.",
      rising: "You come across as soft-spoken, dreamy and approachable.",
    },
  },
  ro: {
    ARIES: {
      sun: "Curajos, direct și rapid în acțiune, conduci din instinct și înflorești la fiecare nou început. Răbdarea e abilitatea de cultivat; curajul tău deschide uși pe care prudența le ține închise.",
      moon: "Emoțiile vin repede și trec repede; ai nevoie de acțiune ca să le procesezi.",
      rising: "Pari energic și direct, cineva care pune lucrurile în mișcare.",
    },
    TAURUS: {
      sun: "Statornic, senzual și loial, construiești încet și păstrezi ce construiești. Confortul și siguranța contează pentru tine; încăpățânarea e umbra fiabilității tale.",
      moon: "Te simți în siguranță prin rutină, atingere și confort; schimbarea te tulbură la început.",
      rising: "Pari calm, așezat și plăcut în preajmă.",
    },
    GEMINI: {
      sun: "Curios, ager la minte și sociabil, trăiești prin idei și conversație. Te adaptezi repede și înveți și mai repede; concentrarea transformă multele interese în rezultate.",
      moon: "Procesezi sentimentele vorbind și gândind; varietatea te ține proaspăt emoțional.",
      rising: "Pari vioi, vorbăreț și curios față de toată lumea.",
    },
    CANCER: {
      sun: "Protector, intuitiv și profund loial, simți atmosfera înainte ca cineva să vorbească. Casa și legăturile apropiate te ancorează; ai grijă să nu porți stările tuturor ca pe ale tale.",
      moon: "Profund sensibil și ocrotitor; ai nevoie de un cămin sigur ca să te simți în largul tău.",
      rising: "Pari blând și grijuliu, cu o rezervă protectoare.",
    },
    LEO: {
      sun: "Cald, generos și expresiv din fire, vrei să creezi și să fii văzut făcând-o. Încrederea ta îi ridică pe ceilalți; aplauzele sunt cele mai dulci când sunt împărțite.",
      moon: "Ai nevoie să te simți apreciat; generozitatea și drama vin amândouă din inimă.",
      rising: "Pari cald și sigur pe tine, greu de trecut cu vederea.",
    },
    VIRGO: {
      sun: "Precis, săritor și observator discret, vezi ce alții ratează și repari. Grija ta se arată în detalii; perfecționismul e obiceiul de ținut în frâu.",
      moon: "Te simți calm când lucrurile sunt în ordine; grija devine îngrijorare când nu are unde să se ducă.",
      rising: "Pari modest, precis și competent în liniște.",
    },
    LIBRA: {
      sun: "Fermecător, echitabil și atras de frumos, cauți echilibrul în toate. Citești bine oamenii și aplanezi conflicte; a decide pentru tine e zona ta de creștere.",
      moon: "Armonia te liniștește și conflictul te golește; te simți cel mai bine în companie bună.",
      rising: "Pari curtenitor, diplomat și ușor de plăcut.",
    },
    SCORPIO: {
      sun: "Intens, discret și pătrunzător, vrei profunzime, nu suprafață. Loialitatea ta e adâncă, la fel și memoria; a lăsa lucrurile să plece e lecția cea mai grea și mai eliberatoare.",
      moon: "Sentimentele sunt adânci și private; încrederea se câștigă încet și se păstrează cu înverșunare.",
      rising: "Pari intens și magnetic, cu un aer de mister.",
    },
    SAGITTARIUS: {
      sun: "Optimist, sincer și neastâmpărat, ai nevoie de orizonturi, idei și mișcare. Sinceritatea ta e răcoritoare; tactul și perseverența o fac să prindă.",
      moon: "Ai nevoie de libertate și de sens; umorul e resetarea ta emoțională.",
      rising: "Pari deschis, optimist și aventuros.",
    },
    CAPRICORN: {
      sun: "Ambițios, disciplinat și răbdător, joci pe termen lung și de obicei câștigi. Responsabilitatea îți vine natural; permite-ți și odihnă și ușurătate pe drum.",
      moon: "Îți ții sentimentele sub control și arăți iubirea prin fiabilitate și efort.",
      rising: "Pari serios, capabil și stăpân pe tine.",
    },
    AQUARIUS: {
      sun: "Independent, inventiv și uman, gândești în sisteme și îți pasă de grup. Prețuiești libertatea și originalitatea; căldura de aproape e ceea ce face idealurile reale.",
      moon: "Ai nevoie de spațiu ca să simți; înțelegi emoțiile cel mai bine de la mică distanță.",
      rising: "Pari original, prietenos și puțin neconvențional.",
    },
    PISCES: {
      sun: "Compătimitor, imaginativ și intuitiv, absorbi ce simt ceilalți și transformi în artă sau bunătate. Limitele îți protejează darul de a deveni epuizare.",
      moon: "Permeabil și empatic; muzica, apa și liniștea te refac.",
      rising: "Pari blând la vorbă, visător și abordabil.",
    },
  },
};

export const WESTERN_ELEMENT_TEXT: L<Record<WesternElement, string>> = {
  en: {
    FIRE: "Fire signs run on enthusiasm, courage and initiative. They need movement and a cause; boredom is their only real enemy.",
    EARTH: "Earth signs are practical, patient and sensual. They trust what they can build, touch and keep.",
    AIR: "Air signs live through ideas, words and connection. They need mental stimulation and room to breathe.",
    WATER: "Water signs feel first and think second. Intuition, memory and empathy are their native languages.",
  },
  ro: {
    FIRE: "Semnele de foc merg pe entuziasm, curaj și inițiativă. Au nevoie de mișcare și de o cauză; plictiseala e singurul lor dușman real.",
    EARTH: "Semnele de pământ sunt practice, răbdătoare și senzuale. Au încredere în ce pot construi, atinge și păstra.",
    AIR: "Semnele de aer trăiesc prin idei, cuvinte și conexiune. Au nevoie de stimulare mentală și de spațiu să respire.",
    WATER: "Semnele de apă simt întâi și gândesc apoi. Intuiția, memoria și empatia sunt limbile lor materne.",
  },
};

/** Traditional lucky numbers per Chinese animal. */
export const ANIMAL_INFO: Record<string, { lucky: number[] }> = {
  RAT: { lucky: [2, 3] }, OX: { lucky: [1, 4] }, TIGER: { lucky: [1, 3, 4] }, RABBIT: { lucky: [3, 4, 6] },
  DRAGON: { lucky: [1, 6, 7] }, SNAKE: { lucky: [2, 8, 9] }, HORSE: { lucky: [2, 3, 7] }, GOAT: { lucky: [2, 7] },
  MONKEY: { lucky: [4, 9] }, ROOSTER: { lucky: [5, 7, 8] }, DOG: { lucky: [3, 4, 9] }, PIG: { lucky: [2, 5, 8] },
};

export const ANIMAL_TEXT: L<Record<string, string>> = {
  en: {
    RAT: "Quick, resourceful and charming, the Rat spots opportunity before others and rarely wastes it. Family and savings matter; anxiety is the price of a mind that never stops.",
    OX: "Patient, dependable and strong-willed, the Ox earns respect through steady work. Slow to anger, slower to forgive; comfort comes from routine and honest effort.",
    TIGER: "Brave, impulsive and magnetic, the Tiger acts on conviction and inspires others to follow. Restlessness is the shadow; patience turns courage into achievement.",
    RABBIT: "Gentle, tactful and elegant, the Rabbit avoids conflict and wins through grace. Security and beauty matter; the challenge is to speak up when it counts.",
    DRAGON: "Confident, ambitious and lucky, the Dragon aims high and often lands there. Pride is the pitfall; humility makes the Dragon's gifts welcome everywhere.",
    SNAKE: "Wise, discreet and intuitive, the Snake observes quietly and acts with precision. Elegance and privacy are prized; suspicion is the habit to soften.",
    HORSE: "Energetic, sociable and freedom-loving, the Horse needs open roads and new faces. Enthusiasm is contagious; finishing what was started is the discipline to build.",
    GOAT: "Creative, kind and peace-loving, the Goat flourishes in supportive surroundings. Artistic and empathetic; self-reliance is the lesson worth learning.",
    MONKEY: "Clever, playful and versatile, the Monkey solves problems with wit and improvisation. Boredom is the enemy; sincerity is what makes the cleverness trusted.",
    ROOSTER: "Observant, honest and hard-working, the Rooster notices every detail and says so. Pride in appearance and standards; tact keeps candor from cutting.",
    DOG: "Loyal, fair and protective, the Dog stands by friends and principles alike. A worrier at heart; trust lightens the load.",
    PIG: "Generous, honest and good-humored, the Pig enjoys life and shares it freely. Trust can be taken advantage of; a little discernment keeps the generosity safe.",
  },
  ro: {
    RAT: "Ager, descurcăreț și fermecător, Șobolanul vede ocazia înaintea altora și rareori o irosește. Familia și economiile contează; neliniștea e prețul unei minți care nu se oprește.",
    OX: "Răbdător, de nădejde și cu voință puternică, Bivolul câștigă respect prin muncă statornică. Greu de înfuriat, și mai greu de împăcat; confortul vine din rutină și efort cinstit.",
    TIGER: "Curajos, impulsiv și magnetic, Tigrul acționează din convingere și îi inspiră pe alții să-l urmeze. Neastâmpărul e umbra; răbdarea transformă curajul în realizare.",
    RABBIT: "Blând, diplomat și elegant, Iepurele evită conflictul și câștigă prin grație. Siguranța și frumosul contează; provocarea e să vorbească atunci când contează.",
    DRAGON: "Încrezător, ambițios și norocos, Dragonul țintește sus și adesea ajunge acolo. Mândria e capcana; modestia face darurile Dragonului binevenite oriunde.",
    SNAKE: "Înțelept, discret și intuitiv, Șarpele observă în liniște și acționează cu precizie. Prețuiește eleganța și intimitatea; suspiciunea e obiceiul de îmblânzit.",
    HORSE: "Energic, sociabil și iubitor de libertate, Calul are nevoie de drumuri deschise și fețe noi. Entuziasmul e molipsitor; a termina ce a început e disciplina de construit.",
    GOAT: "Creativă, bună și iubitoare de pace, Capra înflorește într-un mediu care o susține. Artistică și empatică; încrederea în sine e lecția care merită învățată.",
    MONKEY: "Isteață, jucăușă și versatilă, Maimuța rezolvă problemele cu umor și improvizație. Plictiseala e dușmanul; sinceritatea face ca istețimea să inspire încredere.",
    ROOSTER: "Atent, sincer și muncitor, Cocoșul observă fiecare detaliu și o spune. Mândru de aspect și de standarde; tactul împiedică sinceritatea să rănească.",
    DOG: "Loial, drept și protector, Câinele stă alături de prieteni și de principii deopotrivă. Îngrijorat din fire; încrederea îi ușurează povara.",
    PIG: "Generos, cinstit și cu umor, Porcul se bucură de viață și o împarte cu drag. Încrederea poate fi exploatată; puțin discernământ păstrează generozitatea în siguranță.",
  },
};

export const CHINESE_ELEMENT_TEXT: L<Record<string, string>> = {
  en: {
    WOOD: "Wood is growth, flexibility and vision: the planner who branches outward.",
    FIRE: "Fire is passion, warmth and visibility: the leader who lights the room.",
    EARTH: "Earth is stability, patience and nurture: the one everyone leans on.",
    METAL: "Metal is structure, precision and resolve: the one who finishes cleanly.",
    WATER: "Water is wisdom, adaptability and depth: the one who finds the way around.",
    YIN: "Yin: receptive, reflective, inward-leaning energy.",
    YANG: "Yang: active, expressive, outward-leaning energy.",
  },
  ro: {
    WOOD: "Lemnul e creștere, flexibilitate și viziune: planificatorul care se ramifică spre exterior.",
    FIRE: "Focul e pasiune, căldură și vizibilitate: liderul care luminează încăperea.",
    EARTH: "Pământul e stabilitate, răbdare și grijă: cel pe care se sprijină toți.",
    METAL: "Metalul e structură, precizie și hotărâre: cel care termină curat.",
    WATER: "Apa e înțelepciune, adaptabilitate și profunzime: cel care găsește drumul pe ocolite.",
    YIN: "Yin: energie receptivă, reflexivă, orientată spre interior.",
    YANG: "Yang: energie activă, expresivă, orientată spre exterior.",
  },
};

/** Meaning of a retrograde planet, in the birth chart (natal) and on a given day (transit). */
export const RETRO_TEXT: L<Record<string, { natal: string; transit: string }>> = {
  en: {
    MERCURY: {
      natal: "You think before you speak and often rethink after. Your mind works best in writing and in second passes.",
      transit: "Double-check messages, contracts and travel plans; good for revising, bad for launching.",
    },
    VENUS: {
      natal: "You love carefully and privately, and your taste is your own. Old relationships tend to come back around.",
      transit: "Exes resurface and purchases disappoint; reconsider rather than commit.",
    },
    MARS: {
      natal: "Your drive is internal and strategic rather than loud. You act decisively once you are sure.",
      transit: "Energy runs low and tempers short; finish old projects instead of forcing new ones.",
    },
    JUPITER: {
      natal: "Your optimism and faith are self-made, built from experience rather than received.",
      transit: "Growth turns inward; review beliefs and plans before expanding.",
    },
    SATURN: {
      natal: "You hold yourself to private standards and need to build authority from within.",
      transit: "A time to review commitments and structures rather than add new ones.",
    },
    URANUS: {
      natal: "Your originality is internal and shows in sudden changes of direction.",
      transit: "Inner restlessness; changes brew before they show.",
    },
    NEPTUNE: {
      natal: "You see through illusions, including your own, with a slightly skeptical idealism.",
      transit: "The fog lifts; useful for clarity, uncomfortable for daydreams.",
    },
    PLUTO: {
      natal: "Transformation happens through inner work and quiet reinvention.",
      transit: "A slow, deep review of power and control in your life.",
    },
  },
  ro: {
    MERCURY: {
      natal: "Gândești înainte să vorbești și adesea regândești după. Mintea ta lucrează cel mai bine în scris și la a doua trecere.",
      transit: "Verifică de două ori mesajele, contractele și planurile de drum; bun pentru revizuit, prost pentru lansat.",
    },
    VENUS: {
      natal: "Iubești cu grijă și discret, iar gustul tău e al tău. Relațiile vechi tind să revină.",
      transit: "Foștii reapar și cumpărăturile dezamăgesc; reconsideră în loc să te angajezi.",
    },
    MARS: {
      natal: "Energia ta e interioară și strategică, nu zgomotoasă. Acționezi hotărât odată ce ești sigur.",
      transit: "Energia e scăzută și răbdarea scurtă; termină proiectele vechi în loc să forțezi altele noi.",
    },
    JUPITER: {
      natal: "Optimismul și credința ta sunt construite din experiență, nu primite de-a gata.",
      transit: "Creșterea se întoarce spre interior; revizuiește convingerile și planurile înainte să extinzi.",
    },
    SATURN: {
      natal: "Te ții la standarde proprii și trebuie să-ți construiești autoritatea din interior.",
      transit: "Vreme de revizuit angajamentele și structurile, nu de adăugat altele noi.",
    },
    URANUS: {
      natal: "Originalitatea ta e interioară și se arată în schimbări bruște de direcție.",
      transit: "Neliniște interioară; schimbările se coc înainte să se vadă.",
    },
    NEPTUNE: {
      natal: "Vezi prin iluzii, inclusiv ale tale, cu un idealism ușor sceptic.",
      transit: "Ceața se ridică; util pentru claritate, incomod pentru visare.",
    },
    PLUTO: {
      natal: "Transformarea se petrece prin muncă interioară și reinventare tăcută.",
      transit: "O revizuire lentă și adâncă a puterii și controlului în viața ta.",
    },
  },
};

export const NUMBER_TEXT: L<Record<string, string>> = {
  en: {
    "1": "The pioneer: independent, original and driven to lead. Learn to let others in.",
    "2": "The diplomat: sensitive, cooperative and attuned to others. Learn to hold your ground.",
    "3": "The communicator: creative, expressive and sociable. Learn to finish what you start.",
    "4": "The builder: practical, loyal and hard-working. Learn to bend without breaking.",
    "5": "The adventurer: curious, adaptable and freedom-loving. Learn to commit.",
    "6": "The caretaker: responsible, warm and devoted to home. Learn to care for yourself too.",
    "7": "The seeker: analytical, introspective and spiritual. Learn to share what you find.",
    "8": "The achiever: ambitious, capable and attracted to results. Learn that worth is not only measured.",
    "9": "The humanitarian: compassionate, wise and generous. Learn to let go gracefully.",
    "11": "Master number 11: intuitive, inspiring, highly sensitive. Nerves are the price; vision is the gift.",
    "22": "Master number 22: the master builder, turning big visions into lasting structures.",
    "33": "Master number 33: the master teacher, devoted to healing and service.",
  },
  ro: {
    "1": "Pionierul: independent, original și făcut să conducă. Învață să-i lași și pe alții aproape.",
    "2": "Diplomatul: sensibil, cooperant și atent la ceilalți. Învață să-ți aperi poziția.",
    "3": "Comunicatorul: creativ, expresiv și sociabil. Învață să termini ce începi.",
    "4": "Constructorul: practic, loial și muncitor. Învață să te îndoi fără să te rupi.",
    "5": "Aventurierul: curios, adaptabil și iubitor de libertate. Învață să te angajezi.",
    "6": "Ocrotitorul: responsabil, cald și devotat casei. Învață să ai grijă și de tine.",
    "7": "Căutătorul: analitic, introspectiv și spiritual. Învață să împarți ce descoperi.",
    "8": "Realizatorul: ambițios, capabil și atras de rezultate. Învață că valoarea nu se măsoară doar în cifre.",
    "9": "Umanitarul: compătimitor, înțelept și generos. Învață să dai drumul cu grație.",
    "11": "Numărul maestru 11: intuitiv, inspirator, foarte sensibil. Nervii sunt prețul; viziunea e darul.",
    "22": "Numărul maestru 22: marele constructor, care transformă viziuni mari în structuri durabile.",
    "33": "Numărul maestru 33: marele învățător, devotat vindecării și slujirii.",
  },
};
