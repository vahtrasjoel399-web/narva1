import { z } from "zod";

// Error messages are dictionary keys (dict.validation[key]) so the client can translate them.
const maxYear = new Date().getFullYear() + 1;

const phone = z
  .string()
  .trim()
  .min(1, { error: "required" })
  .regex(/^\+?[0-9][0-9 ()-]{4,19}$/, { error: "phone" });

const optionalText = (max: number) =>
  z.string().trim().max(max, { error: "tooLong" }).optional().or(z.literal("")).transform((v) => v || "");

export const localeSchema = z.enum(["et", "ru", "en"]);

export const carSchema = z.object({
  car_make: z.string().trim().min(1, { error: "required" }).max(60, { error: "tooLong" }),
  car_model: z.string().trim().min(1, { error: "required" }).max(60, { error: "tooLong" }),
  car_year: z
    .union([z.literal(""), z.coerce.number().int({ error: "year" }).min(1950, { error: "year" }).max(maxYear, { error: "year" })])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  plate: optionalText(15),
  comment: optionalText(2000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "tooShort" }).max(100, { error: "tooLong" }),
  phone,
  email: z.union([z.literal(""), z.string().trim().max(200, { error: "tooLong" }).pipe(z.email({ error: "email" }))]).optional().transform((v) => v || ""),
  consent: z.literal(true, { error: "consent" }),
});

export const slotChoiceSchema = z.object({
  services: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).min(1, { error: "services" }).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "slot" }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { error: "slot" }),
});

export const bookingSchema = slotChoiceSchema
  .extend(carSchema.shape)
  .extend(contactSchema.shape)
  .extend({
    lang: localeSchema,
    website: z.string().optional(), // honeypot, must stay empty
    startedAt: z.number().optional(), // ms timestamp when the form was opened
  });
export type BookingInput = z.input<typeof bookingSchema>;

export const callbackSchema = z.object({
  name: z.string().trim().min(2, { error: "tooShort" }).max(100, { error: "tooLong" }),
  phone,
  comment: optionalText(1000),
  lang: localeSchema,
  website: z.string().optional(),
});

export const cancelSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });

/** Field -> first error key */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
