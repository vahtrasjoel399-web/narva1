"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/** Google Maps loads only after a click, so no Google cookies are set without consent. */
export function MapEmbed({ src, title, labels, link }: { src: string; title: string; labels: { show: string; notice: string; directions: string }; link: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-md border border-line" style={{ aspectRatio: "16 / 10" }}>
      {show ? (
        <iframe src={src} title={title} className="absolute inset-0 size-full border-0 grayscale-[35%]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="hatch absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Icon name="pin" size={32} className="text-accent" />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShow(true)}>
            {labels.show}
          </button>
          <p className="max-w-xs text-xs text-faint">{labels.notice}</p>
          <a href={link} target="_blank" rel="noopener noreferrer" className="link text-sm text-muted">
            {labels.directions}
          </a>
        </div>
      )}
    </div>
  );
}
