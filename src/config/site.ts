/**
 * ALL BUSINESS DATA LIVES HERE.
 * To rebrand the site for another shop, edit this file (and the photos in /public/images).
 * Values in [BRACKETS] are placeholders the owner must replace.
 *
 * Services listed here are the initial catalogue: `npm run db:seed` copies them
 * into the database. After that the owner edits services in /admin/services.
 */

export type Locale = "et" | "ru" | "en";
export type L10n = Record<Locale, string>;

export const siteConfig = {
  name: "[AUTO SHOP NAME]",
  legalName: "[AUTO SHOP NAME] OÜ",
  registryCode: "[CLIENT: registrikood]",
  vatNumber: "", // e.g. "EE123456789", leave empty if not VAT registered

  // Public URL without trailing slash. Overridden by NEXT_PUBLIC_SITE_URL.
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  phone: { display: "+372 5000 0000", tel: "+37250000000" },
  email: "info@example.ee",

  address: {
    street: "[ADDRESS]",
    city: "[CITY]",
    postalCode: "[00000]",
    region: "Ida-Viru maakond",
    country: "EE",
    // Used for the map and the LocalBusiness schema.
    geo: { lat: 59.3772, lng: 28.1903 },
  },

  // Optional: paste the "Share > Embed a map" src from Google Maps for an exact pin.
  // When empty, the map is built from the address above.
  googleMapsEmbedUrl: "",
  googleMapsLink: "https://maps.google.com/?q=[ADDRESS],[CITY]",
  googleReviewsUrl: "", // link to your Google reviews
  social: { facebook: "", instagram: "" },

  // Day numbers: 1 = Monday ... 7 = Sunday. Times are local (Europe/Tallinn).
  openingHours: [
    { days: [1, 2, 3, 4, 5], open: "09:00", close: "18:00" },
    { days: [6], open: "10:00", close: "15:00" },
  ],

  // Trust points on the home page. Replace with your real numbers.
  trust: {
    foundedYear: 2010, // [CLIENT] year the workshop opened
    warrantyMonths: 12, // [CLIENT] warranty on work
    diagnosticsMinutes: 60, // [CLIENT] typical time to a diagnosis
    bays: 3, // [CLIENT] number of lifts / bays
  },

  booking: {
    timezone: "Europe/Tallinn",
    cancelCutoffHours: 3, // customer can cancel up to N hours before the visit
    horizonDays: 60, // how far ahead the calendar looks for free slots
    emailActionLinkHours: 72, // Confirm / Decline links in admin emails expire after this
  },

  // Language of admin notification emails ("et" | "ru" | "en"). Can be changed in /admin/settings.
  notificationLanguage: "et" as Locale,

  // One accent colour drives the whole site (buttons, links, highlights).
  theme: {
    accent: "oklch(72% 0.17 52)", // safety orange
    accentStrong: "oklch(66% 0.17 50)",
  },

  services: [
    {
      id: "oil-change",
      icon: "oil",
      durationMin: 30,
      priceFrom: 35,
      name: { et: "Õlivahetus", ru: "Замена масла", en: "Oil change" },
      description: {
        et: "Mootoriõli ja õlifiltri vahetus, vedelike taseme kontroll. Õli valime auto tootja normi järgi.",
        ru: "Замена моторного масла и масляного фильтра, проверка уровня жидкостей. Масло подбираем по допуску производителя.",
        en: "Engine oil and oil filter change, fluid level check. Oil is matched to the manufacturer's spec.",
      },
    },
    {
      id: "diagnostics",
      icon: "diagnostics",
      durationMin: 60,
      priceFrom: 40,
      name: { et: "Diagnostika", ru: "Диагностика", en: "Diagnostics" },
      description: {
        et: "Veakoodide lugemine, andurite ja süsteemide kontroll. Ütleme enne remonti, mis on viga ja mis see maksab.",
        ru: "Чтение кодов ошибок, проверка датчиков и систем. До ремонта скажем, в чём причина и сколько это стоит.",
        en: "Fault code reading, sensor and system checks. Before any repair we tell you what is wrong and what it costs.",
      },
    },
    {
      id: "brakes",
      icon: "brakes",
      durationMin: 90,
      priceFrom: 60,
      name: { et: "Pidurid", ru: "Тормоза", en: "Brakes" },
      description: {
        et: "Piduriklotside ja -ketaste vahetus, piduriduri vahetus, sadulate hooldus.",
        ru: "Замена колодок и дисков, замена тормозной жидкости, обслуживание суппортов.",
        en: "Brake pad and disc replacement, brake fluid change, caliper service.",
      },
    },
    {
      id: "suspension",
      icon: "suspension",
      durationMin: 120,
      priceFrom: 80,
      name: { et: "Veermik", ru: "Подвеска", en: "Suspension" },
      description: {
        et: "Amortisaatorid, vedrud, hoovad, kuulliigendid ja rooliotsad. Kontroll tõstukil enne töö alustamist.",
        ru: "Амортизаторы, пружины, рычаги, шаровые опоры и рулевые наконечники. Сначала проверка на подъёмнике.",
        en: "Shock absorbers, springs, control arms, ball joints and tie rod ends. Checked on the lift before any work.",
      },
    },
    {
      id: "tyres-alignment",
      icon: "tyre",
      durationMin: 60,
      priceFrom: 40,
      name: { et: "Rehvid ja sillutus", ru: "Шины и развал-схождение", en: "Tyres and wheel alignment" },
      description: {
        et: "Rehvivahetus, tasakaalustamine ja 3D-sillutus. Rehvihotell kokkuleppel.",
        ru: "Шиномонтаж, балансировка и 3D развал-схождение. Хранение шин по договорённости.",
        en: "Tyre change, balancing and 3D wheel alignment. Tyre storage on request.",
      },
    },
    {
      id: "air-conditioning",
      icon: "ac",
      durationMin: 60,
      priceFrom: 50,
      name: { et: "Kliimaseade", ru: "Кондиционер", en: "Air conditioning" },
      description: {
        et: "Kliimasüsteemi täitmine, lekke otsing ja salongifiltri vahetus.",
        ru: "Заправка кондиционера, поиск утечек и замена салонного фильтра.",
        en: "A/C recharge, leak detection and cabin filter replacement.",
      },
    },
    {
      id: "engine-repair",
      icon: "engine",
      durationMin: 180,
      priceFrom: 120,
      name: { et: "Mootoriremont", ru: "Ремонт двигателя", en: "Engine repair" },
      description: {
        et: "Hammasrihma ja ketiveo vahetus, tihendid, jahutussüsteem. Hind selgub pärast diagnostikat.",
        ru: "Замена ремня и цепи ГРМ, прокладки, система охлаждения. Цену назовём после диагностики.",
        en: "Timing belt and chain replacement, gaskets, cooling system. Price is confirmed after diagnostics.",
      },
    },
    {
      id: "inspection-check",
      icon: "inspection",
      durationMin: 60,
      priceFrom: 35,
      name: { et: "Ülevaatuse eelkontroll", ru: "Проверка перед техосмотром", en: "Pre-inspection check" },
      description: {
        et: "Kontrollime kõik, mida ülevaatusel vaadatakse: tuled, pidurid, veermik, heitgaasid. Parandame enne, kui läheb kordusesse.",
        ru: "Проверяем всё, что смотрят на техосмотре: свет, тормоза, подвеску, выхлоп. Исправим заранее, чтобы не ехать повторно.",
        en: "We check everything the inspection looks at: lights, brakes, suspension, emissions, and fix it before you go.",
      },
    },
    {
      id: "electrical",
      icon: "electrical",
      durationMin: 60,
      priceFrom: 45,
      name: { et: "Autoelekter", ru: "Автоэлектрика", en: "Electrical" },
      description: {
        et: "Aku, generaator, starter, tuled ja juhtmestik. Otsime üles ka ajutised rikked.",
        ru: "Аккумулятор, генератор, стартер, свет и проводка. Находим и «плавающие» неисправности.",
        en: "Battery, alternator, starter, lights and wiring, including intermittent faults.",
      },
    },
  ],

  team: [
    {
      name: "[CLIENT: owner name]",
      role: { et: "Omanik, diagnostik", ru: "Владелец, диагност", en: "Owner, diagnostics" },
      photo: "", // e.g. "/images/team-1.jpg"
    },
    {
      name: "[CLIENT: mechanic name]",
      role: { et: "Mehaanik", ru: "Механик", en: "Mechanic" },
      photo: "",
    },
  ],

  equipment: [
    { et: "3 tõstukit kuni 3,5 t", ru: "3 подъёмника до 3,5 т", en: "3 lifts up to 3.5 t" },
    { et: "3D-sillutuse stend", ru: "3D-стенд развал-схождения", en: "3D wheel alignment rig" },
    { et: "Diagnostikaseadmed: VAG, BMW, Mercedes, Toyota ja üldised OBD", ru: "Диагностика: VAG, BMW, Mercedes, Toyota и общий OBD", en: "Diagnostics: VAG, BMW, Mercedes, Toyota and generic OBD" },
    { et: "Kliimaseadme täitmisjaam (R134a, R1234yf)", ru: "Станция заправки кондиционеров (R134a, R1234yf)", en: "A/C service station (R134a, R1234yf)" },
  ] as L10n[],

  // Real reviews only. Copy them from Google with the author's first name and initial.
  // While `placeholder` is true the block shows a marked placeholder.
  reviews: [
    { author: "[CLIENT: name, e.g. Andrei K.]", text: "[CLIENT: paste a real Google review here]", car: "", source: "Google", placeholder: true },
    { author: "[CLIENT: name]", text: "[CLIENT: paste a real Google review here]", car: "", source: "Google", placeholder: true },
  ],

  // Photos. Put real photos in /public/images and point these paths at them
  // (e.g. "/images/hero.jpg"). Empty team/about photos show a marked placeholder.
  images: {
    hero: "/images/hero.svg",
    about: "", // e.g. "/images/workshop.jpg"
  },
};

export type ServiceConfig = (typeof siteConfig.services)[number];
