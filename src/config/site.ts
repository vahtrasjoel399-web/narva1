/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BUSINESS CONFIG — the only file you need to edit to rebrand the site.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything marked `CHANGE ME` is a placeholder.
 *
 *  Services listed here are also the seed data for the database
 *  (`npm run db:seed` regenerates `supabase/seed.sql` from this file).
 *  After the first deploy, services are edited in /admin → Services, and the
 *  database version wins. This list is only used as a fallback when the
 *  database is not reachable (e.g. local preview without Supabase).
 */

export type Lang = "et" | "ru" | "en";
export type Localized = Record<Lang, string>;

export type ServiceIcon =
  | "oil"
  | "diagnostics"
  | "brakes"
  | "suspension"
  | "tyres"
  | "aircon"
  | "engine"
  | "inspection"
  | "electrical"
  | "wrench";

export type ServiceConfig = {
  /** Stable id, used in URLs (?service=oil-change) and in the database. */
  id: string;
  icon: ServiceIcon;
  /** Approximate duration in minutes. Decides how many consecutive slots a booking takes. */
  durationMin: number;
  /** "From" price in EUR. */
  priceFrom: number;
  name: Localized;
  description: Localized;
};

export type OpeningHours = {
  /** ISO weekday numbers: 1 = Monday … 7 = Sunday */
  days: number[];
  open: string; // "HH:MM"
  close: string; // "HH:MM"
};

export const siteConfig = {
  // CHANGE ME ────────────────────────────────────────────────────────────────
  name: "Graphite Auto",
  legalName: "Graphite Auto OÜ",
  registryCode: "12345678",
  vatNumber: "EE123456789",
  /** Public site URL without trailing slash. Overridden by NEXT_PUBLIC_SITE_URL. */
  url: "https://example.ee",
  foundedYear: 2009,

  contact: {
    phone: "+372 5555 5555", // shown on site
    phoneHref: "+37255555555", // used in tel: links
    email: "info@example.ee",
  },

  address: {
    street: "Tallinna mnt 1",
    city: "Narva",
    /** "in <city>" per language, used in headlines ("Autoremont Narvas"). */
    cityIn: { et: "Narvas", ru: "в Нарве", en: "in Narva" },
    postalCode: "20304",
    region: "Ida-Viru maakond",
    country: "EE",
    countryName: "Eesti",
    /** Used for JSON-LD and the map pin. */
    geo: { lat: 59.3772, lng: 28.1903 },
  },

  /** Opening hours (also used for JSON-LD). Days not listed are closed. */
  hours: [
    { days: [1, 2, 3, 4, 5], open: "08:00", close: "18:00" },
    { days: [6], open: "09:00", close: "14:00" },
  ] satisfies OpeningHours[],

  social: {
    facebook: "", // "https://facebook.com/…"
    instagram: "",
  },

  /** Shown as "X years experience", "X months warranty" in trust points. */
  trust: {
    yearsExperience: 15,
    warrantyMonths: 12,
    diagnosticsMinutes: 30,
    rating: 4.9,
    reviewCount: 214,
  },

  /** Placeholder images — replace the files in /public/images with real photos (same names). */
  images: {
    hero: "/images/hero.svg",
    about: "/images/workshop.svg",
    equipment: "/images/equipment.svg",
    og: "/images/hero.svg",
  },
  // ───────────────────────────────────────────────────────────────────────────

  /** Shop timezone. All slot dates/times are local shop time. */
  timezone: "Europe/Tallinn",
  currency: "EUR",

  booking: {
    /** Customer can cancel online up to this many hours before the visit. */
    cancelHoursBefore: 3,
    /** Slots that start sooner than this are hidden from customers. */
    minLeadMinutes: 60,
    /** How far ahead the public calendar looks. */
    maxDaysAhead: 60,
    /** Admin email action links (Confirm / Decline) expire after this many hours. */
    actionLinkTtlHours: 72,
  },

  /** Default language of admin emails and admin UI ("et" | "ru" | "en"). Can be changed in /admin → Settings. */
  adminLang: "ru" as Lang,

  services: [
    {
      id: "oil-change",
      icon: "oil",
      durationMin: 45,
      priceFrom: 39,
      name: { et: "Õlivahetus", ru: "Замена масла", en: "Oil change" },
      description: {
        et: "Mootoriõli ja filtrite vahetus tootja nõuete järgi, hooldusvälbade nullimine ja kiire üldkontroll.",
        ru: "Замена моторного масла и фильтров по нормам производителя, сброс сервисного интервала и быстрая общая проверка.",
        en: "Engine oil and filter change to manufacturer spec, service interval reset and a quick overall check.",
      },
    },
    {
      id: "diagnostics",
      icon: "diagnostics",
      durationMin: 60,
      priceFrom: 35,
      name: { et: "Diagnostika", ru: "Диагностика", en: "Diagnostics" },
      description: {
        et: "Arvutidiagnostika kõikidele süsteemidele, veakoodide lugemine ja selge selgitus, mida on vaja teha.",
        ru: "Компьютерная диагностика всех систем, чтение кодов ошибок и понятное объяснение, что нужно сделать.",
        en: "Computer diagnostics for all systems, fault code reading and a clear explanation of what needs to be done.",
      },
    },
    {
      id: "brakes",
      icon: "brakes",
      durationMin: 120,
      priceFrom: 59,
      name: { et: "Pidurid", ru: "Тормоза", en: "Brakes" },
      description: {
        et: "Piduriklotside, ketaste ja pidurivedeliku vahetus, pidurisüsteemi kontroll ja hooldus.",
        ru: "Замена колодок, дисков и тормозной жидкости, проверка и обслуживание тормозной системы.",
        en: "Pads, discs and brake fluid replacement, brake system inspection and service.",
      },
    },
    {
      id: "suspension",
      icon: "suspension",
      durationMin: 120,
      priceFrom: 69,
      name: { et: "Veermik", ru: "Подвеска", en: "Suspension" },
      description: {
        et: "Amortisaatorite, hoobade, otste ja laagrite kontroll ning vahetus. Kõrvaldame koputused ja vibratsiooni.",
        ru: "Проверка и замена амортизаторов, рычагов, наконечников и подшипников. Устраняем стуки и вибрации.",
        en: "Shock absorbers, control arms, tie rods and bearings checked and replaced. We fix knocks and vibrations.",
      },
    },
    {
      id: "tyres-alignment",
      icon: "tyres",
      durationMin: 60,
      priceFrom: 25,
      name: {
        et: "Rehvid ja sillutus",
        ru: "Шины и развал-схождение",
        en: "Tyres & wheel alignment",
      },
      description: {
        et: "Rehvivahetus, tasakaalustamine ja 3D-sillutus. Hoiame rehvid ka hooajaks.",
        ru: "Шиномонтаж, балансировка и 3D развал-схождение. Сезонное хранение шин.",
        en: "Tyre fitting, balancing and 3D wheel alignment. Seasonal tyre storage available.",
      },
    },
    {
      id: "air-conditioning",
      icon: "aircon",
      durationMin: 60,
      priceFrom: 49,
      name: { et: "Kliimaseade", ru: "Кондиционер", en: "Air conditioning" },
      description: {
        et: "Kliimaseadme täitmine, lekketest, desinfitseerimine ja salongifiltri vahetus.",
        ru: "Заправка кондиционера, проверка на утечки, дезинфекция и замена салонного фильтра.",
        en: "A/C recharge, leak test, disinfection and cabin filter replacement.",
      },
    },
    {
      id: "engine-repair",
      icon: "engine",
      durationMin: 240,
      priceFrom: 89,
      name: { et: "Mootoriremont", ru: "Ремонт двигателя", en: "Engine repair" },
      description: {
        et: "Hammasrihmad, tihendid, sissepritse ja suuremad mootoritööd. Hind selgub pärast diagnostikat.",
        ru: "ГРМ, прокладки, впрыск и капитальные работы по двигателю. Точная цена после диагностики.",
        en: "Timing belts, gaskets, injection and major engine work. Exact price after diagnostics.",
      },
    },
    {
      id: "pre-inspection",
      icon: "inspection",
      durationMin: 60,
      priceFrom: 29,
      name: {
        et: "Ülevaatuse eelkontroll",
        ru: "Проверка перед техосмотром",
        en: "Pre-inspection check",
      },
      description: {
        et: "Kontrollime kõik ülevaatusel kontrollitavad punktid ja parandame puudused enne ülevaatust.",
        ru: "Проверяем все пункты техосмотра (ülevaatus) и устраняем недостатки заранее.",
        en: "We check every item of the Estonian roadworthiness test (ülevaatus) and fix issues before you go.",
      },
    },
    {
      id: "electrical",
      icon: "electrical",
      durationMin: 60,
      priceFrom: 39,
      name: { et: "Autoelekter", ru: "Автоэлектрика", en: "Electrical" },
      description: {
        et: "Aku, generaator, starter, tuled ja juhtmestik. Leiame ka keerulised elektrivead.",
        ru: "Аккумулятор, генератор, стартер, свет и проводка. Находим даже сложные неисправности.",
        en: "Battery, alternator, starter, lights and wiring. We track down tricky electrical faults too.",
      },
    },
  ] satisfies ServiceConfig[],

  /** Team shown on the About page. CHANGE ME */
  team: [
    {
      name: "Andrei K.",
      role: { et: "Omanik, meister", ru: "Владелец, мастер", en: "Owner, master mechanic" },
      years: 20,
    },
    {
      name: "Marko T.",
      role: { et: "Diagnostik", ru: "Диагност", en: "Diagnostics specialist" },
      years: 12,
    },
    {
      name: "Igor S.",
      role: { et: "Veermiku ja pidurite spetsialist", ru: "Мастер по ходовой и тормозам", en: "Suspension & brakes" },
      years: 9,
    },
  ],

  /** Reviews block on the home page. Use real reviews (with permission). CHANGE ME */
  reviews: [
    {
      author: "Jelena P.",
      rating: 5,
      text: {
        et: "Kiire ja aus teenindus. Selgitasid enne tööd hinna ära ja pidasid sellest kinni.",
        ru: "Быстро и честно. Заранее озвучили цену и уложились в неё.",
        en: "Fast and honest. They quoted the price up front and stuck to it.",
      },
    },
    {
      author: "Martin R.",
      rating: 5,
      text: {
        et: "Broneerisin netis aja, auto oli lõunaks valmis. Väga mugav.",
        ru: "Записался онлайн, к обеду машина была готова. Очень удобно.",
        en: "Booked online, car was ready by lunch. Very convenient.",
      },
    },
    {
      author: "Sergei V.",
      rating: 5,
      text: {
        et: "Leidsid elektrivea, mida teised töökojad ei leidnud. Soovitan!",
        ru: "Нашли электрическую неисправность, которую не нашли в других сервисах. Рекомендую!",
        en: "Found an electrical fault two other garages missed. Recommended!",
      },
    },
  ],
};

export type SiteConfig = typeof siteConfig;

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, "");
}
