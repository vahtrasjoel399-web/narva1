import type { Lang, Localized, ServiceIcon } from "@/config/site";

export type Service = {
  id: string;
  name: Localized;
  description: Localized;
  icon: ServiceIcon;
  durationMin: number;
  priceFrom: number;
  sort: number;
  active: boolean;
};

export type SlotStatus = "free" | "booked" | "blocked";
export type BookingStatus = "new" | "confirmed" | "done" | "cancelled" | "no_show";
export const bookingStatuses: BookingStatus[] = ["new", "confirmed", "done", "cancelled", "no_show"];

export type SlotRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  bay: number;
  status: SlotStatus;
  booking_id: string | null;
};

export type BookingRow = {
  id: string;
  number: number;
  service_ids: string[];
  slot_ids: string[];
  date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  status: BookingStatus;
  customer_name: string;
  phone: string;
  email: string | null;
  car_make: string;
  car_model: string;
  car_year: number | null;
  plate: string | null;
  comment: string | null;
  lang: Lang;
  manage_token: string;
  seen_by_admin: boolean;
  source: "web" | "admin";
  admin_notes: string | null;
  cancelled_by: "client" | "admin" | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CallbackRow = {
  id: string;
  name: string;
  phone: string;
  comment: string | null;
  lang: Lang;
  status: "new" | "done";
  seen_by_admin: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: number;
  event: string;
  booking_id: string | null;
  callback_id: string | null;
  recipient: string | null;
  subject: string | null;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  attempts: number;
  acknowledged: boolean;
  created_at: string;
};

export type SettingsRow = {
  id: 1;
  notify_emails: string[];
  notify_lang: Lang;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  name: Localized;
  description: Localized;
  icon: string;
  duration_min: number;
  price_from: number | string;
  sort: number;
  active: boolean;
};

export function serviceFromRow(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon as ServiceIcon,
    durationMin: r.duration_min,
    priceFrom: Number(r.price_from),
    sort: r.sort,
    active: r.active,
  };
}
