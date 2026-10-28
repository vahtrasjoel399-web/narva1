"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * Click-to-load Google Map: no third-party cookies or heavy iframe until the
 * visitor asks for it (GDPR-friendly and keeps Lighthouse scores high).
 */
export function MapEmbed({ query, title, labels, className }: {
  query: string;
  title: string;
  labels: { show: string; note: string; directions: string };
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] border border-ink-700 bg-ink-850 ${className ?? ""}`}>
      {show ? (
        <iframe
          title={title}
          src={src}
          className="h-full min-h-80 w-full border-0 grayscale-[35%] invert-[0.9] hue-rotate-180"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="grid-bg flex h-full min-h-80 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-500 text-ink-950 shadow-lg">
            <MapPin size={28} aria-hidden="true" />
          </span>
          <p className="max-w-xs text-sm text-ink-400">{labels.note}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShow(true)}>
              {labels.show}
            </button>
            <a href={directions} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              {labels.directions}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
