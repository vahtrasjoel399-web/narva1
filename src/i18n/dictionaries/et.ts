/**
 * Estonian (default) — this file defines the shape of every dictionary.
 * Placeholders in {curly} braces are filled at runtime.
 */
const et = {
  meta: {
    titleTemplate: "%s | {name}",
    home: {
      title: "{name} — autoremont ja hooldus {cityIn}",
      description:
        "Autoremont ja hooldus {cityIn}: õlivahetus, diagnostika, pidurid, veermik, rehvid, kliima ja ülevaatuse eelkontroll. Broneeri vaba aeg internetis 1 minutiga.",
    },
    services: {
      title: "Teenused ja hinnad",
      description: "Kõik autoremondi teenused koos kestuse ja algushinnaga. Vali teenus ja broneeri aeg internetis.",
    },
    about: {
      title: "Meist",
      description: "{name} — kogenud meistrid, kaasaegne varustus ja aus hind {cityIn} alates {year}. aastast.",
    },
    contact: {
      title: "Kontakt",
      description: "Aadress, telefon, lahtiolekuajad ja kaart. {address}.",
    },
    booking: {
      title: "Broneeri aeg",
      description: "Vali teenus, vaba aeg ja too auto. Broneerimine võtab umbes minuti.",
    },
    manage: {
      title: "Sinu broneering",
      description: "Vaata broneeringu staatust või tühista see.",
    },
    privacy: {
      title: "Privaatsuspoliitika",
      description: "Kuidas me isikuandmeid töötleme ja küpsiseid kasutame.",
    },
  },

  nav: {
    home: "Avaleht",
    services: "Teenused",
    about: "Meist",
    contact: "Kontakt",
    bookNow: "Broneeri aeg",
    call: "Helista",
    menu: "Menüü",
    closeMenu: "Sulge menüü",
    language: "Keel",
    skipToContent: "Liigu sisu juurde",
    mainNav: "Peamenüü",
  },

  common: {
    from: "alates",
    priceFrom: "alates {price}",
    duration: "~{duration}",
    hours: "{h} h",
    minutes: "{m} min",
    hoursMinutes: "{h} h {m} min",
    loading: "Laadin…",
    retry: "Proovi uuesti",
    back: "Tagasi",
    next: "Edasi",
    close: "Sulge",
    optional: "valikuline",
    openingHours: "Lahtiolekuajad",
    closed: "Suletud",
    address: "Aadress",
    phone: "Telefon",
    email: "E-post",
    today: "Täna",
    weekdays: ["Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev", "Pühapäev"],
    weekdaysShort: ["E", "T", "K", "N", "R", "L", "P"],
  },

  home: {
    eyebrow: "Autoremont {cityIn}",
    title: "Auto korda ilma ootamise ja üllatusteta",
    subtitle:
      "Diagnostika, hooldus ja remont ühest kohast. Vaata vabu aegu ja broneeri internetis — hind on teada enne töö algust.",
    ctaPrimary: "Broneeri aeg",
    ctaSecondary: "Helista",
    heroBadge: "Vabu aegu ka sel nädalal",
    trust: {
      experience: { value: "{n}+ aastat", label: "kogemust" },
      warranty: { value: "{n} kuud", label: "garantii töödele" },
      diagnostics: { value: "{n} min", label: "kiire diagnostika" },
      rating: { value: "{rating}/5", label: "{count} arvustust" },
    },
    servicesTitle: "Teenused",
    servicesSubtitle: "Algushinnad ja ligikaudne kestus. Täpse hinna ütleme enne töö algust.",
    allServices: "Kõik teenused",
    howTitle: "Kuidas see toimib",
    howSubtitle: "Kolm sammu ja auto on hoolduses.",
    steps: [
      { title: "Vali teenus", text: "Üks või mitu teenust — näed kohe kestust ja algushinda." },
      { title: "Vali vaba aeg", text: "Kalendris on ainult päriselt vabad ajad. Kinnitus kohe." },
      { title: "Too auto", text: "Tule kokkulepitud ajal. Helistame, kui töö on valmis." },
    ],
    reviewsTitle: "Kliendid räägivad",
    reviewsSubtitle: "Keskmine hinne {rating}/5 ({count} arvustust)",
    mapTitle: "Kuidas meid leida",
    ctaTitle: "Kas auto vajab tähelepanu?",
    ctaText: "Broneeri aeg internetis või helista — aitame leida kiireima lahenduse.",
  },

  services: {
    title: "Teenused ja hinnad",
    subtitle:
      "Kõik hinnad on algushinnad koos käibemaksuga. Varuosade hind lisandub. Täpse hinna ütleme enne töö algust.",
    durationLabel: "Kestus",
    priceLabel: "Hind",
    bookThis: "Broneeri see teenus",
    notListedTitle: "Ei leidnud vajalikku teenust?",
    notListedText: "Vali „Diagnostika“ ja kirjelda probleemi — või helista meile.",
  },

  about: {
    title: "Meist",
    subtitle: "Väike töökoda, kus auto eest hoolitsetakse nagu enda oma eest.",
    storyTitle: "Meie lugu",
    story: [
      "Alustasime {year}. aastal kahe tõstuki ja ühe eesmärgiga: teha autoremonti ausalt ja arusaadavalt.",
      "Täna teenindame igal aastal tuhandeid autosid, kuid põhimõte on sama — enne tööd ütleme hinna, pärast tööd näitame vahetatud osad.",
    ],
    teamTitle: "Meeskond",
    yearsExp: "{n} aastat kogemust",
    equipmentTitle: "Varustus",
    equipment: [
      "Originaal- ja multibrändi diagnostikaseadmed",
      "3D-sillutusstend",
      "Kliimaseadmete hooldusjaam",
      "4 tõstukit",
      "Rehvitööde ja tasakaalustamise seadmed",
    ],
    valuesTitle: "Mida lubame",
    values: [
      { title: "Hind enne tööd", text: "Lisatööd ainult sinu nõusolekul." },
      { title: "Garantii", text: "{n} kuud garantiid tehtud töödele." },
      { title: "Vanad osad näha", text: "Näitame alati, mida vahetasime." },
    ],
  },

  contact: {
    title: "Kontakt",
    subtitle: "Helista, kirjuta või tule kohale. Kiireim viis on aeg internetis broneerida.",
    callNow: "Helista kohe",
    writeEmail: "Kirjuta e-kiri",
    directions: "Juhised Google Mapsis",
    mapPlaceholder: "Kaart laaditakse Google Mapsist. Google võib seadistada küpsiseid.",
    showMap: "Näita kaarti",
    mapTitle: "Kaart: {name}",
  },

  booking: {
    title: "Broneeri aeg",
    subtitle: "Vali teenus ja vaba aeg. Võtab umbes minuti.",
    stepOf: "Samm {n}/{total}",
    steps: ["Teenus", "Aeg", "Auto", "Kontakt"],
    service: {
      title: "Mida on vaja teha?",
      hint: "Võid valida mitu teenust.",
      total: "Kokku ~{duration}, alates {price}",
      noneSelected: "Vali vähemalt üks teenus",
    },
    time: {
      title: "Vali päev ja kellaaeg",
      hint: "Näitame ainult vabu aegu, kuhu valitud teenused ära mahuvad (~{duration}).",
      prevMonth: "Eelmine kuu",
      nextMonth: "Järgmine kuu",
      pickDate: "Vali kalendrist päev",
      freeTimes: "Vabad ajad — {date}",
      noTimes: "Sel päeval ei ole sobivaid aegu. Vali teine päev.",
      loading: "Laadin vabu aegu…",
      loadError: "Vabade aegade laadimine ebaõnnestus.",
      dayAvailable: "{date}, vabu aegu: {n}",
      dayUnavailable: "{date}, vabu aegu ei ole",
    },
    empty: {
      title: "Hetkel vabu aegu ei ole",
      text: "Kõik ajad on täis. Jäta oma telefoninumber — helistame ja leiame sobiva aja.",
    },
    car: {
      title: "Auto andmed",
      make: "Mark",
      makePlaceholder: "nt Toyota",
      model: "Mudel",
      modelPlaceholder: "nt Corolla",
      year: "Aasta",
      plate: "Registreerimisnumber",
      message: "Mida on vaja teha?",
      messagePlaceholder: "Kirjelda probleemi või tööd: nt „kolin esimese ratta juures pidurdades“",
    },
    contact: {
      title: "Kontaktandmed",
      name: "Nimi",
      phone: "Telefon",
      phoneHint: "Helistame sellel numbril, kui vaja.",
      email: "E-post",
      emailHint: "Saadame kinnituse ja tühistamise lingi.",
      consent: "Nõustun, et minu andmeid töödeldakse broneeringu täitmiseks vastavalt",
      consentLink: "privaatsuspoliitikale",
      submit: "Kinnita broneering",
      submitting: "Saadan…",
    },
    summary: {
      title: "Sinu broneering",
      services: "Teenused",
      when: "Aeg",
      car: "Auto",
      change: "Muuda",
    },
    errors: {
      required: "Kohustuslik väli",
      phone: "Kontrolli telefoninumbrit",
      email: "Kontrolli e-posti aadressi",
      year: "Sisesta aasta vahemikus {min}–{max}",
      consent: "Nõusolek on vajalik",
      tooLong: "Liiga pikk tekst",
      slotTaken: "See aeg broneeriti just ära. Palun vali teine aeg — nimekiri on uuendatud.",
      rateLimited: "Liiga palju katseid. Proovi mõne minuti pärast uuesti või helista meile.",
      generic: "Midagi läks valesti. Proovi uuesti või helista meile.",
      noTime: "Vali kellaaeg",
    },
    success: {
      title: "Aeg on broneeritud!",
      text: "Ootame sind {date} kell {time}.",
      number: "Broneeringu nr",
      emailSent: "Saatsime kinnituse aadressile {email}.",
      noEmail: "Salvesta see link — sellega saad broneeringut vaadata ja tühistada.",
      manage: "Vaata või tühista broneering",
      next: "Mis edasi?",
      nextSteps: [
        "Meister vaatab broneeringu üle ja vajadusel helistab.",
        "Too auto kokkulepitud ajal. Võta kaasa võtmed ja vajadusel rehvid.",
        "Anname hinna enne töö algust.",
      ],
      home: "Avalehele",
    },
    callback: {
      title: "Helistame sulle tagasi",
      text: "Jäta number ja helistame tööajal esimesel võimalusel.",
      name: "Nimi",
      phone: "Telefon",
      comment: "Kommentaar",
      commentPlaceholder: "Mis autoga ja mida vaja teha?",
      submit: "Palun helistage",
      submitting: "Saadan…",
      success: "Aitäh! Helistame sulle peagi.",
      alt: "Ei leia sobivat aega?",
      altLink: "Palu tagasihelistamist",
    },
  },

  manage: {
    title: "Broneering nr {number}",
    notFoundTitle: "Broneeringut ei leitud",
    notFoundText: "Link võib olla vigane. Helista meile, kui vajad abi.",
    statusLabel: "Staatus",
    status: {
      new: "Ootab kinnitust",
      confirmed: "Kinnitatud",
      done: "Tehtud",
      cancelled: "Tühistatud",
      no_show: "Ei ilmunud",
    },
    statusText: {
      new: "Broneering on vastu võetud. Meister vaatab selle üle ja vajadusel helistab.",
      confirmed: "Meister on broneeringu kinnitanud. Ootame sind!",
      done: "Töö on tehtud. Aitäh, et valisid meid!",
      cancelled: "See broneering on tühistatud ja aeg vabastatud.",
      no_show: "Broneeritud ajal autot ei toodud.",
    },
    when: "Aeg",
    services: "Teenused",
    car: "Auto",
    message: "Sinu kommentaar",
    cancel: "Tühista broneering",
    cancelConfirm: "Kas soovid kindlasti broneeringu tühistada? Aeg vabaneb teistele.",
    cancelYes: "Jah, tühista",
    cancelNo: "Ei",
    cancelling: "Tühistan…",
    cancelledOk: "Broneering on tühistatud.",
    tooLate: "Internetis saab tühistada kuni {hours} h enne aega. Palun helista meile.",
    bookAgain: "Broneeri uus aeg",
    callUs: "Helista meile",
  },

  cookies: {
    text: "Kasutame vajalikke küpsiseid saidi toimimiseks. Analüütika ja turunduse küpsised ainult sinu nõusolekul.",
    accept: "Nõustun kõigiga",
    decline: "Ainult vajalikud",
    more: "Loe lähemalt",
    label: "Küpsiste teade",
  },

  footer: {
    tagline: "Autoremont ja hooldus {cityIn}.",
    rights: "Kõik õigused kaitstud.",
    privacy: "Privaatsuspoliitika",
    registry: "Registrikood",
    vat: "KMKR",
    navTitle: "Leht",
    contactTitle: "Kontakt",
  },

  notFound: {
    title: "Lehte ei leitud",
    text: "Seda lehte ei ole olemas või see on liikunud.",
    home: "Avalehele",
  },

  error: {
    title: "Midagi läks valesti",
    text: "Proovi lehte uuesti laadida. Kui viga kordub, helista meile.",
    retry: "Proovi uuesti",
  },

  privacy: {
    title: "Privaatsuspoliitika",
    updated: "Viimati uuendatud: {date}",
    intro:
      "Käesolev poliitika selgitab, kuidas {legalName} (registrikood {registryCode}, aadress {address}) töötleb sinu isikuandmeid vastavalt isikuandmete kaitse üldmäärusele (GDPR) ja Eesti isikuandmete kaitse seadusele.",
    sections: [
      {
        title: "Milliseid andmeid kogume",
        body: "Broneerimisel: nimi, telefon, e-post (valikuline), auto mark, mudel, aasta, registreerimisnumber ning sinu kirjeldus tööst. Tagasihelistamise sooviga: nimi, telefon ja kommentaar. Tehniliselt: IP-aadressi räsi rämpsposti ja kuritarvituste tõkestamiseks.",
      },
      {
        title: "Miks me andmeid töötleme",
        body: "Broneeringu täitmiseks ja sinuga ühenduse võtmiseks (leping, GDPR art 6 lg 1 p b), raamatupidamiskohustuse täitmiseks (seadusest tulenev kohustus) ning teenuse turvalisuse tagamiseks (õigustatud huvi).",
      },
      {
        title: "Kui kaua andmeid säilitame",
        body: "Broneeringuandmeid säilitame kuni 3 aastat pärast viimast külastust garantiinõuete lahendamiseks, raamatupidamisdokumente 7 aastat. Tagasihelistamise soove kustutame 6 kuu jooksul.",
      },
      {
        title: "Kellele andmeid edastame",
        body: "Kasutame volitatud töötlejaid: Supabase (andmebaas, EL), Vercel (majutus) ja Resend (e-kirjade saatmine). Andmeid ei müüda ega kasutata reklaamiks ilma nõusolekuta.",
      },
      {
        title: "Küpsised",
        body: "Vajalikud küpsised (keele valik, küpsiste nõusolek, administraatori sisselogimine) on saidi toimimiseks hädavajalikud. Analüütika (Google Analytics) ja turunduse (Meta Pixel) küpsised laaditakse ainult sinu nõusolekul. Google Maps laaditakse alles siis, kui vajutad „Näita kaarti“. Nõusoleku saad tagasi võtta, kustutades brauseris selle saidi küpsised.",
      },
      {
        title: "Sinu õigused",
        body: "Sul on õigus tutvuda oma andmetega, neid parandada, nõuda kustutamist või töötlemise piiramist ning esitada vastuväiteid. Kirjuta meile {email}. Kaebuse saad esitada Andmekaitse Inspektsioonile (www.aki.ee).",
      },
    ],
  },

  emails: {
    greeting: "Tere, {name}!",
    signature: "Parimate soovidega\n{shop}",
    details: "Broneeringu andmed",
    number: "Broneering",
    when: "Aeg",
    services: "Teenused",
    duration: "Ligikaudne kestus",
    car: "Auto",
    address: "Aadress",
    questions: "Küsimused? Helista {phone}.",
    manageButton: "Vaata või tühista broneering",
    cancelNote: "Tühistada saab internetis kuni {hours} h enne aega.",
    created: {
      subject: "Broneering nr {number} — {date} kell {time}",
      intro: "Aitäh! Sinu aeg on broneeritud. Meister vaatab broneeringu üle ja vajadusel helistab.",
    },
    confirmed: {
      subject: "Broneering nr {number} on kinnitatud",
      intro: "Hea uudis — meister kinnitas sinu broneeringu. Ootame sind!",
    },
    declined: {
      subject: "Broneering nr {number}: palun vali uus aeg",
      intro:
        "Kahjuks ei saa me valitud ajal sinu autot vastu võtta. Vabandame! Palun vali uus aeg — vabad ajad näed siit:",
      button: "Vali uus aeg",
    },
    cancelled: {
      subject: "Broneering nr {number} on tühistatud",
      intro: "Sinu broneering on tühistatud ja aeg vabastatud. Ootame sind teinekord!",
      button: "Broneeri uus aeg",
    },
  },
};

export default et;
export type Dictionary = typeof et;
