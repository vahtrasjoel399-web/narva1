import { siteConfig } from "@/config/site";
import { fullAddress } from "./site";

/** Keyless Google Maps embed built from the address (or the custom URL from config). */
export function mapsEmbedUrl(): string {
  if (siteConfig.googleMapsEmbedUrl) return siteConfig.googleMapsEmbedUrl;
  const { lat, lng } = siteConfig.address.geo;
  const q = siteConfig.address.street.startsWith("[") ? `${lat},${lng}` : fullAddress();
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
}
