import type { SVGProps } from "react";
import type { ServiceIcon as ServiceIconName } from "@/config/site";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

const paths: Record<ServiceIconName, React.ReactNode> = {
  oil: (
    <>
      <path d="M3 10h9l3-3h4l2 2-3 3v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M7 10V7h3" />
      <path d="M20.5 15.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5c0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5z" />
    </>
  ),
  diagnostics: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M6 11h2.5l1.5-3 2.5 6 1.5-3H18" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  brakes: (
    <>
      <circle cx="11" cy="12" r="8" />
      <circle cx="11" cy="12" r="2.5" />
      <path d="M11 6.5v.01M16.5 12h.01M11 17.5v.01M5.5 12h.01" />
      <path d="M17.5 5.5a9 9 0 0 1 0 13" strokeWidth={3} />
    </>
  ),
  suspension: (
    <>
      <path d="M12 2v3M12 19v3" />
      <path d="M8 5h8M8 19h8" />
      <path d="M8 7.5l8 1.5-8 1.5 8 1.5-8 1.5 8 1.5-8 1.5" />
    </>
  ),
  tyres: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" strokeWidth={1.25} />
    </>
  ),
  aircon: (
    <>
      <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" />
      <path d="M9.5 3.5 12 5.5l2.5-2M9.5 20.5 12 18.5l2.5 2M3.5 10.5l3-.5-.7-3M20.5 13.5l-3 .5.7 3M3.5 13.5l3 .5-.7 3M20.5 10.5l-3-.5.7-3" />
    </>
  ),
  engine: (
    <>
      <path d="M4 9h3l2-2h5l2 2h2v3h2v-2h1v6h-1v-2h-2v3h-3l-2 2H9l-2-2H4z" />
      <path d="M2 11v4M9 4h5M11.5 4v3" />
    </>
  ),
  inspection: (
    <>
      <rect x="5" y="3.5" width="14" height="18" rx="2" />
      <path d="M9 3.5V2.5h6v1" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
      <path d="M9 18h6" />
    </>
  ),
  electrical: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M7 7V5h3v2M14 7V5h3v2" />
      <path d="m12.5 10-2.5 4h4l-2.5 4" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.3-1.3a4 4 0 0 0-5-5L5 13 3 11l8-8 2 2z" />
  ),
};

export function ServiceIcon({ name, ...props }: IconProps & { name: string }) {
  return <Svg {...props}>{paths[name as ServiceIconName] ?? paths.wrench}</Svg>;
}

export const serviceIconNames = Object.keys(paths) as ServiceIconName[];

/** Brand mark used in the header, footer and favicon. */
export function LogoMark({ size = 28, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <rect width="32" height="32" rx="9" fill="var(--color-accent-500)" />
      <path
        d="M20.5 9.5a5 5 0 0 0-6.2 6.2L8.6 21.4a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a5 5 0 0 0 6.2-6.2l-2.9 2.9-2.3-.6-.6-2.3z"
        fill="var(--color-ink-950)"
      />
    </svg>
  );
}
