import type { Locale } from "@/config/site";

// Placeholders: {company} {registry} {address} {email} {phone} {cutoff}
// This is a practical template, not legal advice. The owner should review it.
export const LEGAL_UPDATED = "2026-10-27";

type Section = { h: string; p?: string[]; ul?: string[] };
type LegalDoc = { title: string; intro: string; sections: Section[] };

export const privacy: Record<Locale, LegalDoc> = {
  et: {
    title: "Privaatsuspoliitika",
    intro: "Selgitame, milliseid isikuandmeid me kogume, miks ja kui kaua neid hoiame.",
    sections: [
      { h: "1. Vastutav töötleja", p: ["{company}, registrikood {registry}, aadress {address}. E-post {email}, telefon {phone}."] },
      {
        h: "2. Milliseid andmeid ja miks",
        ul: [
          "Broneering: nimi, telefon, e-post (valikuline), auto mark, mudel, aasta, registreerimisnumber ja sinu kirjeldus tööst. Eesmärk: aja broneerimine ja teenuse osutamine. Alus: lepingu täitmine (IKÜM art 6 lg 1 p b).",
          "Tagasihelistamise soov: nimi, telefon, kommentaar. Eesmärk: sinuga ühendust võtta. Alus: lepingueelsed toimingud (art 6 lg 1 p b).",
          "Kuritarvituste vältimine: IP-aadressi räsi (mitte IP-aadress ise) korduvate päringute piiramiseks. Alus: õigustatud huvi (art 6 lg 1 p f).",
          "Statistika ja turundus (Google Analytics, Meta Pixel): ainult sinu nõusolekul (art 6 lg 1 p a). Nõusoleku saad igal ajal tagasi võtta jaluse lingist „Küpsiste seaded“.",
        ],
      },
      {
        h: "3. Volitatud töötlejad",
        ul: [
          "Supabase (andmebaas). [CLIENT: kinnita andmekeskuse asukoht, nt EL/Frankfurt.]",
          "Vercel Inc. (veebimajutus), USA. Andmeedastus EL–USA andmekaitseraamistiku (DPF) või standardlepingutingimuste alusel.",
          "Resend (e-kirjade saatmine), USA. DPF või standardlepingutingimused.",
          "Google (kaart, ainult kui vajutad „Näita kaarti“; Analytics ainult nõusolekul).",
          "Meta Platforms (ainult nõusolekul).",
        ],
      },
      {
        h: "4. Säilitamise tähtajad",
        ul: [
          "Broneeringud: 3 aastat pärast visiiti garantiinõuete lahendamiseks. [CLIENT: kinnita tähtaeg.]",
          "Tagasihelistamise soovid: 6 kuud.",
          "IP-räsid: kuni 1 päev.",
          "Raamatupidamisdokumendid: 7 aastat (raamatupidamise seadus).",
        ],
      },
      {
        h: "5. Küpsised",
        ul: [
          "lang (vajalik): valitud keel, 1 aasta.",
          "cookie-consent (vajalik, brauseri mälu): sinu küpsiste valik, 6 kuud.",
          "sb-* (vajalik, ainult töökoja haldajatele): sisselogimise sessioon.",
          "_ga, _ga_* (statistika, Google, ainult nõusolekul): kuni 2 aastat.",
          "_fbp (turundus, Meta, ainult nõusolekul): 3 kuud.",
        ],
      },
      { h: "6. Sinu õigused", p: ["Sul on õigus oma andmetega tutvuda, neid parandada, nõuda nende kustutamist või töötlemise piiramist, esitada vastuväide ja saada andmed ülekantaval kujul. Kirjuta {email}."] },
      { h: "7. Kaebused", p: ["Kaebuse saad esitada Andmekaitse Inspektsioonile (www.aki.ee, info@aki.ee)."] },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    intro: "Объясняем, какие персональные данные мы собираем, зачем и как долго их храним.",
    sections: [
      { h: "1. Ответственный обработчик", p: ["{company}, регистрационный код {registry}, адрес {address}. E-mail {email}, телефон {phone}."] },
      {
        h: "2. Какие данные и зачем",
        ul: [
          "Запись: имя, телефон, e-mail (по желанию), марка, модель и год автомобиля, госномер и ваше описание работы. Цель: запись на сервис и оказание услуги. Основание: исполнение договора (GDPR ст. 6 п. 1 b).",
          "Просьба перезвонить: имя, телефон, комментарий. Цель: связаться с вами. Основание: преддоговорные действия (ст. 6 п. 1 b).",
          "Защита от злоупотреблений: хеш IP-адреса (не сам IP) для ограничения частых запросов. Основание: законный интерес (ст. 6 п. 1 f).",
          "Статистика и маркетинг (Google Analytics, Meta Pixel): только с вашего согласия (ст. 6 п. 1 a). Согласие можно отозвать в любой момент по ссылке «Настройки cookie» внизу страницы.",
        ],
      },
      {
        h: "3. Обработчики по поручению",
        ul: [
          "Supabase (база данных). [CLIENT: подтвердите регион хранения, напр. ЕС/Франкфурт.]",
          "Vercel Inc. (хостинг), США. Передача на основании EU–US Data Privacy Framework или стандартных договорных условий.",
          "Resend (отправка писем), США. DPF или стандартные договорные условия.",
          "Google (карта, только если вы нажмёте «Показать карту»; Analytics только с согласия).",
          "Meta Platforms (только с согласия).",
        ],
      },
      {
        h: "4. Сроки хранения",
        ul: [
          "Записи: 3 года после визита для гарантийных случаев. [CLIENT: подтвердите срок.]",
          "Просьбы перезвонить: 6 месяцев.",
          "Хеши IP: до 1 дня.",
          "Бухгалтерские документы: 7 лет (закон о бухгалтерском учёте).",
        ],
      },
      {
        h: "5. Cookie",
        ul: [
          "lang (необходимый): выбранный язык, 1 год.",
          "cookie-consent (необходимый, память браузера): ваш выбор cookie, 6 месяцев.",
          "sb-* (необходимый, только для сотрудников мастерской): сессия входа.",
          "_ga, _ga_* (статистика, Google, только с согласия): до 2 лет.",
          "_fbp (маркетинг, Meta, только с согласия): 3 месяца.",
        ],
      },
      { h: "6. Ваши права", p: ["Вы можете получить доступ к своим данным, исправить их, потребовать удаления или ограничения обработки, возразить против обработки и получить данные в переносимом виде. Пишите на {email}."] },
      { h: "7. Жалобы", p: ["Жалобу можно подать в Инспекцию по защите данных Эстонии (www.aki.ee, info@aki.ee)."] },
    ],
  },
  en: {
    title: "Privacy policy",
    intro: "What personal data we collect, why, and how long we keep it.",
    sections: [
      { h: "1. Controller", p: ["{company}, registry code {registry}, address {address}. Email {email}, phone {phone}."] },
      {
        h: "2. What data and why",
        ul: [
          "Booking: name, phone, email (optional), car make, model, year, plate number and your description of the job. Purpose: booking a time and providing the service. Legal basis: performance of a contract (GDPR Art. 6(1)(b)).",
          "Callback request: name, phone, comment. Purpose: to contact you. Legal basis: pre-contractual steps (Art. 6(1)(b)).",
          "Abuse prevention: a hash of the IP address (not the IP itself) to limit repeated requests. Legal basis: legitimate interest (Art. 6(1)(f)).",
          "Statistics and marketing (Google Analytics, Meta Pixel): only with your consent (Art. 6(1)(a)). You can withdraw consent at any time via “Cookie settings” in the footer.",
        ],
      },
      {
        h: "3. Processors",
        ul: [
          "Supabase (database). [CLIENT: confirm the data region, e.g. EU/Frankfurt.]",
          "Vercel Inc. (hosting), USA. Transfers under the EU–US Data Privacy Framework or Standard Contractual Clauses.",
          "Resend (email delivery), USA. DPF or Standard Contractual Clauses.",
          "Google (map, only if you click “Show map”; Analytics only with consent).",
          "Meta Platforms (only with consent).",
        ],
      },
      {
        h: "4. Retention",
        ul: [
          "Bookings: 3 years after the visit, for warranty claims. [CLIENT: confirm.]",
          "Callback requests: 6 months.",
          "IP hashes: up to 1 day.",
          "Accounting documents: 7 years (Estonian Accounting Act).",
        ],
      },
      {
        h: "5. Cookies",
        ul: [
          "lang (necessary): chosen language, 1 year.",
          "cookie-consent (necessary, browser storage): your cookie choice, 6 months.",
          "sb-* (necessary, workshop staff only): login session.",
          "_ga, _ga_* (statistics, Google, only with consent): up to 2 years.",
          "_fbp (marketing, Meta, only with consent): 3 months.",
        ],
      },
      { h: "6. Your rights", p: ["You may access, correct or delete your data, restrict or object to processing, and receive your data in a portable format. Write to {email}."] },
      { h: "7. Complaints", p: ["You can complain to the Estonian Data Protection Inspectorate (www.aki.ee, info@aki.ee)."] },
    ],
  },
};

export const terms: Record<Locale, LegalDoc> = {
  et: {
    title: "Kasutustingimused",
    intro: "Need tingimused kehtivad selle veebilehe ja internetibroneeringute kohta.",
    sections: [
      { h: "1. Kes me oleme", p: ["Lehte haldab {company}, registrikood {registry}, {address}. Kontakt: {email}, {phone}."] },
      { h: "2. Hinnad", p: ["Lehel toodud hinnad on informatiivsed tööhinnad alates, ilma varuosadeta. Lõplik hind lepitakse kokku pärast auto ülevaatamist ja enne töö alustamist."] },
      {
        h: "3. Broneerimine ja tühistamine",
        ul: [
          "Broneering on kehtiv, kui saad broneeringu numbri. Töökoda võib broneeringu kinnitada või pakkuda uut aega.",
          "Broneeringut saad tühistada lingiga kuni {cutoff} tundi enne visiiti. Hiljem palun helista.",
          "Kui auto vajab rohkem aega kui broneeritud, lepime uue aja või tähtaja kokku.",
        ],
      },
      { h: "4. Vastutus", p: ["Teeme kõik, et info lehel oleks õige, kuid ei vastuta kirjavigade ega ajutiste tehniliste rikete eest. Tehtud töö garantii tingimused lepitakse kokku töö tellimisel."] },
      { h: "5. Intellektuaalomand", p: ["Lehe tekstid, fotod ja logo kuuluvad ettevõttele {company}. Nende kopeerimine ilma loata ei ole lubatud."] },
      { h: "6. Kohaldatav õigus", p: ["Kohaldatakse Eesti Vabariigi õigust. Vaidlused lahendame eelkõige läbirääkimistega, seejärel Viru Maakohtus, kui tarbija õigus ei näe ette teisiti. Tarbija võib pöörduda ka Tarbijavaidluste komisjoni (ttja.ee)."] },
    ],
  },
  ru: {
    title: "Условия использования",
    intro: "Эти условия действуют для этого сайта и онлайн-записи.",
    sections: [
      { h: "1. Кто мы", p: ["Сайтом управляет {company}, регистрационный код {registry}, {address}. Контакты: {email}, {phone}."] },
      { h: "2. Цены", p: ["Цены на сайте носят информационный характер: это стоимость работы от, без запчастей. Окончательная цена согласуется после осмотра автомобиля и до начала работ."] },
      {
        h: "3. Запись и отмена",
        ul: [
          "Запись действительна после получения номера записи. Мастерская может подтвердить запись или предложить другое время.",
          "Отменить запись по ссылке можно не позднее чем за {cutoff} ч до визита. Позже, пожалуйста, позвоните.",
          "Если автомобилю нужно больше времени, чем было записано, мы согласуем новое время или срок.",
        ],
      },
      { h: "4. Ответственность", p: ["Мы стараемся, чтобы информация на сайте была точной, но не отвечаем за опечатки и временные технические сбои. Условия гарантии на работу согласуются при заказе."] },
      { h: "5. Интеллектуальная собственность", p: ["Тексты, фото и логотип сайта принадлежат {company}. Копирование без разрешения запрещено."] },
      { h: "6. Применимое право", p: ["Применяется право Эстонской Республики. Споры решаем путём переговоров, затем в Вируском уездном суде, если законом о защите прав потребителей не предусмотрено иное. Потребитель может обратиться в Комиссию по потребительским спорам (ttja.ee)."] },
    ],
  },
  en: {
    title: "Terms of use",
    intro: "These terms apply to this website and to online bookings.",
    sections: [
      { h: "1. Who we are", p: ["The site is run by {company}, registry code {registry}, {address}. Contact: {email}, {phone}."] },
      { h: "2. Prices", p: ["Prices on this site are informational labour prices from, parts not included. The final price is agreed after the car is inspected and before work starts."] },
      {
        h: "3. Booking and cancellation",
        ul: [
          "A booking is valid once you receive a booking number. The workshop may confirm it or offer another time.",
          "You can cancel with the link up to {cutoff} hours before the visit. After that, please call.",
          "If the car needs more time than booked, we agree a new time or deadline with you.",
        ],
      },
      { h: "4. Liability", p: ["We keep the information on this site accurate but are not liable for typos or temporary technical faults. Warranty terms for work are agreed when the work is ordered."] },
      { h: "5. Intellectual property", p: ["Texts, photos and the logo belong to {company}. Copying them without permission is not allowed."] },
      { h: "6. Governing law", p: ["Estonian law applies. Disputes are settled by negotiation first, then in Viru County Court, unless consumer law provides otherwise. Consumers may also turn to the Consumer Disputes Committee (ttja.ee)."] },
    ],
  },
};
