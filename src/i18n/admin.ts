import type { Locale } from "@/config/site";

const et = {
  title: "Haldus",
  nav: { dashboard: "Ülevaade", calendar: "Ajad", bookings: "Broneeringud", callbacks: "Tagasihelistamised", services: "Teenused", settings: "Seaded", logout: "Logi välja", site: "Ava koduleht", more: "Veel" },
  login: { title: "Sisselogimine", email: "E-post", password: "Parool", submit: "Logi sisse", error: "Vale e-post või parool.", notAdmin: "Sellel kasutajal pole haldusõigust." },
  status: { new: "Uus", confirmed: "Kinnitatud", done: "Tehtud", cancelled: "Tühistatud", no_show: "Ei tulnud" },
  slot: { free: "Vaba", booked: "Broneeritud", blocked: "Suletud" },
  common: {
    save: "Salvesta", saved: "Salvestatud", cancel: "Loobu", close: "Sulge", delete: "Kustuta", add: "Lisa", edit: "Muuda", all: "Kõik", today: "Täna",
    prev: "Eelmine", next: "Järgmine", call: "Helista", new: "Uus", from: "Alates", to: "Kuni", search: "Otsi", none: "Pole midagi", loading: "Laen…",
    error: "Midagi läks valesti", minutes: "min", yes: "Jah", no: "Ei", back: "Tagasi", open: "Ava", done: "Valmis",
  },
  dashboard: {
    unread: "Uued broneeringud", thisWeek: "Broneeringuid sel nädalal", today: "Täna", upcoming: "Tänased ja homsed visiidid", popular: "Populaarsemad teenused (30 päeva)",
    callbacks: "Uued tagasihelistamised", failed: "Teavitused ebaõnnestusid", failedText: "{n} e-kirja ei läinud välja. Vaata seadetes ja saada uuesti.", freeSlots: "Vabu aegu järgmise 7 päeva jooksul", noUpcoming: "Lähipäevadel visiite pole.",
  },
  calendar: {
    title: "Vabad ajad", month: "Kuu", week: "Nädal", bulkAdd: "Lisa mitmele päevale", addSlots: "Lisa aegu", start: "Algus", end: "Lõpp", length: "Aja pikkus", parallel: "Paralleelseid (tõstukeid)",
    lunch: "Lõunapaus", weekdays: "Nädalapäevad", weeks: "Mitu nädalat", startDate: "Alates kuupäevast", closeDay: "Sulge päev", openDay: "Ava päev uuesti", copyDay: "Kopeeri päev",
    copyWeek: "Kopeeri nädal", copyTo: "Kopeeri kuupäevale", copyWeeks: "Järgmisele … nädalale", copied: "Kopeeritud: {n} aega", added: "Lisatud: {n} aega", skipped: "{n} kattuvat aega jäeti vahele",
    selected: "Valitud: {n}", block: "Sulge", unblock: "Ava", deleteSel: "Kustuta valitud", noSlots: "Sellel päeval pole aegu.", pickDay: "Vali päev, et aegu lisada või muuta.",
    bookedNote: "Broneeritud aegu ei saa kustutada ega sulgeda. Tühista enne broneering.", bay: "Tõstuk", confirmDelete: "Kustutada {n} aega?", confirmClose: "Sulgeda kõik vabad ajad sellel päeval?",
    legend: "vaba / broneeritud / suletud", selectAll: "Vali kõik vabad", clear: "Tühjenda valik",
  },
  bookings: {
    title: "Broneeringud", newBooking: "Lisa telefonibroneering", filterStatus: "Olek", upcoming: "Tulevased", past: "Möödunud", all: "Kõik", searchPh: "Nimi, telefon, number…", empty: "Broneeringuid ei leitud.",
    number: "Nr", when: "Aeg", customer: "Klient", car: "Auto", services: "Teenused", clientWrote: "Klient kirjutas", notes: "Sisemärkmed", notesPh: "Näeb ainult töökoda", lang: "Keel", source: "Allikas",
    sourceWeb: "Koduleht", sourcePhone: "Telefon", created: "Loodud", confirm: "Kinnita", decline: "Keeldu ja vabasta aeg", markDone: "Tehtud", noShow: "Ei tulnud", cancelBooking: "Tühista",
    confirmDecline: "Keelduda? Aeg vabaneb ja klient saab kirja (kui jättis e-posti).", confirmCancel: "Tühistada broneering? Aeg vabaneb.", notifications: "Teavitused", noEmail: "Klient e-posti ei jätnud.",
    cancelledBy: "Tühistas: {who}", byClient: "klient", byAdmin: "töökoda", bay: "Tõstuk",
  },
  manual: {
    title: "Telefonibroneering", intro: "Vali teenus ja vaba aeg. Broneering on kohe kinnitatud.", pick: "Vali aeg", noTimes: "Vabu aegu pole. Lisa need kalendris.", create: "Loo broneering", created: "Broneering #{n} loodud",
    customer: "Klient", taken: "See aeg on vahepeal võetud. Vali teine.",
  },
  services: {
    title: "Teenused", add: "Lisa teenus", id: "ID (ladina tähed, nt oil-change)", name: "Nimetus", description: "Kirjeldus", duration: "Kestus (min)", price: "Hind alates (€)", sort: "Järjekord", active: "Nähtav kodulehel",
    hidden: "Peidetud", note: "Muudatused ilmuvad kodulehele mõne minuti jooksul.",
  },
  callbacks: { title: "Tagasihelistamise soovid", empty: "Soove pole.", markDone: "Helistatud", reopen: "Ava uuesti", comment: "Kommentaar" },
  settings: {
    title: "Seaded", emails: "Teavituste saajad", emailsHint: "Üks aadress real. Tühi = kasutatakse NOTIFY_EMAILS väärtust: {env}", lang: "Teavituste keel", test: "Saada testkiri", testSent: "Testkiri saadetud.", testFailed: "Testkiri ebaõnnestus: {error}",
    log: "Teavituste logi", retry: "Saada uuesti", dismiss: "Peida", sent: "Saadetud", failed: "Ebaõnnestus", pending: "Ootel", adminLang: "Halduse keel", event: "Sündmus", recipient: "Saaja",
    events: { booking_created: "Uus broneering", booking_cancelled: "Tühistamine", callback_created: "Tagasihelistamine", booking_confirmed: "Kinnitus kliendile", booking_declined: "Keeldumine kliendile", test: "Test" },
    audience: { admin: "töökoda", customer: "klient" },
  },
  alerts: { newBooking: "Uus broneering #{n}", newCallback: "Uus tagasihelistamise soov", view: "Vaata" },
  action: {
    title: "Broneering #{n}", confirmQ: "Kinnitada see broneering?", declineQ: "Keelduda ja vabastada aeg?", confirmBtn: "Jah, kinnita", declineBtn: "Jah, keeldu", confirmed: "Broneering kinnitatud. Kliendile saadeti kiri (kui e-post oli).",
    declined: "Aeg vabastatud. Klienti teavitati (kui e-post oli).", used: "See link on juba kasutatud.", expired: "Link on aegunud. Ava broneering halduses.", invalid: "Link ei kehti.", closed: "Broneering on juba tühistatud või lõpetatud.", openAdmin: "Ava halduses",
  },
};

export type AdminDictionary = typeof et;

const ru: AdminDictionary = {
  title: "Админка",
  nav: { dashboard: "Обзор", calendar: "Время", bookings: "Записи", callbacks: "Перезвонить", services: "Услуги", settings: "Настройки", logout: "Выйти", site: "Открыть сайт", more: "Ещё" },
  login: { title: "Вход", email: "E-mail", password: "Пароль", submit: "Войти", error: "Неверный e-mail или пароль.", notAdmin: "У этого пользователя нет доступа к админке." },
  status: { new: "Новая", confirmed: "Подтверждена", done: "Выполнена", cancelled: "Отменена", no_show: "Не приехал" },
  slot: { free: "Свободно", booked: "Занято", blocked: "Закрыто" },
  common: {
    save: "Сохранить", saved: "Сохранено", cancel: "Отмена", close: "Закрыть", delete: "Удалить", add: "Добавить", edit: "Изменить", all: "Все", today: "Сегодня",
    prev: "Назад", next: "Вперёд", call: "Позвонить", new: "Новое", from: "С", to: "По", search: "Найти", none: "Ничего нет", loading: "Загрузка…",
    error: "Что-то пошло не так", minutes: "мин", yes: "Да", no: "Нет", back: "Назад", open: "Открыть", done: "Готово",
  },
  dashboard: {
    unread: "Новые записи", thisWeek: "Записей на этой неделе", today: "Сегодня", upcoming: "Визиты сегодня и завтра", popular: "Популярные услуги (30 дней)",
    callbacks: "Новые просьбы перезвонить", failed: "Уведомления не отправлены", failedText: "{n} писем не ушло. Откройте настройки и отправьте снова.", freeSlots: "Свободных окон на 7 дней", noUpcoming: "В ближайшие дни визитов нет.",
  },
  calendar: {
    title: "Свободное время", month: "Месяц", week: "Неделя", bulkAdd: "Добавить на много дней", addSlots: "Добавить время", start: "Начало", end: "Конец", length: "Длина окна", parallel: "Параллельно (подъёмников)",
    lunch: "Обед", weekdays: "Дни недели", weeks: "Сколько недель", startDate: "Начиная с даты", closeDay: "Закрыть день", openDay: "Открыть день", copyDay: "Копировать день",
    copyWeek: "Копировать неделю", copyTo: "Копировать на дату", copyWeeks: "На следующие … недель", copied: "Скопировано: {n}", added: "Добавлено: {n}", skipped: "Пропущено пересечений: {n}",
    selected: "Выбрано: {n}", block: "Закрыть", unblock: "Открыть", deleteSel: "Удалить выбранные", noSlots: "В этот день окон нет.", pickDay: "Выберите день, чтобы добавить или изменить время.",
    bookedNote: "Занятые окна нельзя удалить или закрыть. Сначала отмените запись.", bay: "Подъёмник", confirmDelete: "Удалить {n} окон?", confirmClose: "Закрыть все свободные окна в этот день?",
    legend: "свободно / занято / закрыто", selectAll: "Выбрать все свободные", clear: "Снять выбор",
  },
  bookings: {
    title: "Записи", newBooking: "Добавить запись по телефону", filterStatus: "Статус", upcoming: "Предстоящие", past: "Прошедшие", all: "Все", searchPh: "Имя, телефон, номер…", empty: "Записей не найдено.",
    number: "№", when: "Время", customer: "Клиент", car: "Авто", services: "Услуги", clientWrote: "Клиент написал", notes: "Внутренние заметки", notesPh: "Видит только мастерская", lang: "Язык", source: "Источник",
    sourceWeb: "Сайт", sourcePhone: "Телефон", created: "Создана", confirm: "Подтвердить", decline: "Отклонить и освободить время", markDone: "Выполнена", noShow: "Не приехал", cancelBooking: "Отменить",
    confirmDecline: "Отклонить? Время освободится, клиент получит письмо (если оставил e-mail).", confirmCancel: "Отменить запись? Время освободится.", notifications: "Уведомления", noEmail: "Клиент не оставил e-mail.",
    cancelledBy: "Отменил: {who}", byClient: "клиент", byAdmin: "мастерская", bay: "Подъёмник",
  },
  manual: {
    title: "Запись по телефону", intro: "Выберите услугу и свободное время. Запись сразу подтверждена.", pick: "Выберите время", noTimes: "Свободного времени нет. Добавьте его в календаре.", create: "Создать запись", created: "Запись #{n} создана",
    customer: "Клиент", taken: "Это время уже заняли. Выберите другое.",
  },
  services: {
    title: "Услуги", add: "Добавить услугу", id: "ID (латиница, напр. oil-change)", name: "Название", description: "Описание", duration: "Длительность (мин)", price: "Цена от (€)", sort: "Порядок", active: "Показывать на сайте",
    hidden: "Скрыта", note: "Изменения появятся на сайте в течение нескольких минут.",
  },
  callbacks: { title: "Просьбы перезвонить", empty: "Просьб нет.", markDone: "Позвонили", reopen: "Открыть снова", comment: "Комментарий" },
  settings: {
    title: "Настройки", emails: "Получатели уведомлений", emailsHint: "Один адрес на строку. Пусто = используется NOTIFY_EMAILS: {env}", lang: "Язык уведомлений", test: "Отправить тестовое письмо", testSent: "Тестовое письмо отправлено.", testFailed: "Ошибка отправки: {error}",
    log: "Журнал уведомлений", retry: "Отправить снова", dismiss: "Скрыть", sent: "Отправлено", failed: "Ошибка", pending: "В очереди", adminLang: "Язык админки", event: "Событие", recipient: "Кому",
    events: { booking_created: "Новая запись", booking_cancelled: "Отмена", callback_created: "Перезвонить", booking_confirmed: "Подтверждение клиенту", booking_declined: "Отказ клиенту", test: "Тест" },
    audience: { admin: "мастерская", customer: "клиент" },
  },
  alerts: { newBooking: "Новая запись #{n}", newCallback: "Новая просьба перезвонить", view: "Открыть" },
  action: {
    title: "Запись #{n}", confirmQ: "Подтвердить эту запись?", declineQ: "Отклонить и освободить время?", confirmBtn: "Да, подтвердить", declineBtn: "Да, отклонить", confirmed: "Запись подтверждена. Клиенту отправлено письмо (если был e-mail).",
    declined: "Время освобождено. Клиент уведомлён (если был e-mail).", used: "Эта ссылка уже использована.", expired: "Ссылка устарела. Откройте запись в админке.", invalid: "Ссылка недействительна.", closed: "Запись уже отменена или завершена.", openAdmin: "Открыть в админке",
  },
};

const en: AdminDictionary = {
  title: "Admin",
  nav: { dashboard: "Overview", calendar: "Availability", bookings: "Bookings", callbacks: "Callbacks", services: "Services", settings: "Settings", logout: "Log out", site: "Open website", more: "More" },
  login: { title: "Log in", email: "Email", password: "Password", submit: "Log in", error: "Wrong email or password.", notAdmin: "This user has no admin access." },
  status: { new: "New", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled", no_show: "No-show" },
  slot: { free: "Free", booked: "Booked", blocked: "Blocked" },
  common: {
    save: "Save", saved: "Saved", cancel: "Cancel", close: "Close", delete: "Delete", add: "Add", edit: "Edit", all: "All", today: "Today",
    prev: "Previous", next: "Next", call: "Call", new: "New", from: "From", to: "To", search: "Search", none: "Nothing here", loading: "Loading…",
    error: "Something went wrong", minutes: "min", yes: "Yes", no: "No", back: "Back", open: "Open", done: "Done",
  },
  dashboard: {
    unread: "New bookings", thisWeek: "Bookings this week", today: "Today", upcoming: "Visits today and tomorrow", popular: "Most popular services (30 days)",
    callbacks: "New callback requests", failed: "Notifications failed", failedText: "{n} emails were not sent. Open settings and resend.", freeSlots: "Free slots in the next 7 days", noUpcoming: "No visits in the next days.",
  },
  calendar: {
    title: "Availability", month: "Month", week: "Week", bulkAdd: "Bulk add", addSlots: "Add slots", start: "Start", end: "End", length: "Slot length", parallel: "Parallel (bays)",
    lunch: "Lunch break", weekdays: "Weekdays", weeks: "Number of weeks", startDate: "Starting from", closeDay: "Close day", openDay: "Reopen day", copyDay: "Copy day",
    copyWeek: "Copy week", copyTo: "Copy to date", copyWeeks: "To the next … weeks", copied: "Copied: {n} slots", added: "Added: {n} slots", skipped: "{n} overlapping slots skipped",
    selected: "Selected: {n}", block: "Block", unblock: "Unblock", deleteSel: "Delete selected", noSlots: "No slots on this day.", pickDay: "Pick a day to add or change slots.",
    bookedNote: "Booked slots can't be deleted or blocked. Cancel the booking first.", bay: "Bay", confirmDelete: "Delete {n} slots?", confirmClose: "Block all free slots on this day?",
    legend: "free / booked / blocked", selectAll: "Select all free", clear: "Clear selection",
  },
  bookings: {
    title: "Bookings", newBooking: "Add phone booking", filterStatus: "Status", upcoming: "Upcoming", past: "Past", all: "All", searchPh: "Name, phone, number…", empty: "No bookings found.",
    number: "No.", when: "Time", customer: "Customer", car: "Car", services: "Services", clientWrote: "Client wrote", notes: "Internal notes", notesPh: "Only the workshop sees this", lang: "Language", source: "Source",
    sourceWeb: "Website", sourcePhone: "Phone", created: "Created", confirm: "Confirm", decline: "Decline and free the slot", markDone: "Done", noShow: "No-show", cancelBooking: "Cancel",
    confirmDecline: "Decline? The slot is freed and the client gets an email (if given).", confirmCancel: "Cancel this booking? The slot is freed.", notifications: "Notifications", noEmail: "The client left no email.",
    cancelledBy: "Cancelled by: {who}", byClient: "client", byAdmin: "workshop", bay: "Bay",
  },
  manual: {
    title: "Phone booking", intro: "Choose a service and a free time. The booking is confirmed immediately.", pick: "Pick a time", noTimes: "No free times. Add some in the calendar.", create: "Create booking", created: "Booking #{n} created",
    customer: "Customer", taken: "That time was just taken. Pick another.",
  },
  services: {
    title: "Services", add: "Add service", id: "ID (latin letters, e.g. oil-change)", name: "Name", description: "Description", duration: "Duration (min)", price: "Price from (€)", sort: "Order", active: "Visible on website",
    hidden: "Hidden", note: "Changes appear on the website within a few minutes.",
  },
  callbacks: { title: "Callback requests", empty: "No requests.", markDone: "Called", reopen: "Reopen", comment: "Comment" },
  settings: {
    title: "Settings", emails: "Notification recipients", emailsHint: "One address per line. Empty = NOTIFY_EMAILS is used: {env}", lang: "Notification language", test: "Send test email", testSent: "Test email sent.", testFailed: "Test email failed: {error}",
    log: "Notification log", retry: "Resend", dismiss: "Hide", sent: "Sent", failed: "Failed", pending: "Pending", adminLang: "Admin language", event: "Event", recipient: "Recipient",
    events: { booking_created: "New booking", booking_cancelled: "Cancellation", callback_created: "Callback", booking_confirmed: "Confirmation to client", booking_declined: "Decline to client", test: "Test" },
    audience: { admin: "workshop", customer: "client" },
  },
  alerts: { newBooking: "New booking #{n}", newCallback: "New callback request", view: "View" },
  action: {
    title: "Booking #{n}", confirmQ: "Confirm this booking?", declineQ: "Decline and free the slot?", confirmBtn: "Yes, confirm", declineBtn: "Yes, decline", confirmed: "Booking confirmed. The client was emailed (if an email was given).",
    declined: "Slot freed. The client was notified (if an email was given).", used: "This link has already been used.", expired: "This link has expired. Open the booking in admin.", invalid: "This link is not valid.", closed: "The booking is already cancelled or finished.", openAdmin: "Open in admin",
  },
};

export const adminDictionaries: Record<Locale, AdminDictionary> = { et, ru, en };
