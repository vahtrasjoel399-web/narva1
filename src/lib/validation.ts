/**
 * zod schemas shared by the browser (instant feedback) and the API (source of truth).
 * Error messages are short codes; the UI maps them to translated strings.
 */
import { z } from "zod";
import { isValidISODate } from "./time";

export const MIN_CAR_YEAR = 1950;
export const maxCarYear = () => new Date().getFullYear() + 1;

const trimmed = (max: number) => z.string().trim().max(max, "tooLong");
const required = (max: number) => trimmed(max).min(1, "required");

// Accepts +372 5555 5555, 5555 5555, +7 (999) 123-45-67 …
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(30, "phone")
  .regex(/^\+?[\d\s()-]{5,}$/, "phone")
  .refine((v) => v.replace(/\D/g, "").length >= 5, "phone");

const optionalEmail = z
  .string()
  .trim()
  .max(200, "email")
  .refine((v) => v === "" || z.email().safeParse(v).success, "email")
  .optional()
  .transform((v) => (v ? v : undefined));

export const langSchema = z.enum(["et", "ru", "en"]);

export const carSchema = z.object({
  carMake: required(60),
  carModel: required(60),
  carYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ error: "year" })
      .int("year")
      .refine((v) => v >= MIN_CAR_YEAR && v <= maxCarYear(), "year")
      .optional(),
  ),
  plate: trimmed(20).optional(),
  comment: trimmed(2000).optional(),
});

export const contactSchema = z.object({
  name: required(120),
  phone: phoneSchema,
  email: optionalEmail,
  consent: z.literal(true, { error: "consent" }),
});

export const bookingSchema = z
  .object({
    serviceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1, "required").max(10),
    date: z.string().refine(isValidISODate, "required"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "required"),
    lang: langSchema,
    /** Honeypot — must stay empty. */
    website: z.string().max(0).optional(),
  })
  .extend(carSchema.shape)
  .extend(contactSchema.shape);

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;

export const callbackSchema = z.object({
  name: required(120),
  phone: phoneSchema,
  comment: trimmed(2000).optional(),
  lang: langSchema,
  website: z.string().max(0).optional(),
});

export type CallbackInput = z.input<typeof callbackSchema>;

/** Flatten zod issues to { field: code }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
