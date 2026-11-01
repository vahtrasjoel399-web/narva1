import { Icon } from "./icon";

/** Marked placeholder until the owner adds a real photo. Shows what belongs here. */
export function PhotoPlaceholder({ caption, className = "", ratio = "4 / 3" }: { caption: string; className?: string; ratio?: string }) {
  return (
    <figure className={`hatch relative overflow-hidden rounded-md border border-line ${className}`} style={{ aspectRatio: ratio }}>
      <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/80 px-3 py-2 font-mono text-xs text-muted">
        <Icon name="camera" size={14} />
        {caption}
      </figcaption>
    </figure>
  );
}
