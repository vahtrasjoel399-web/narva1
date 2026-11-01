import type { SVGProps } from "react";

// One custom icon set, 24px grid, 1.6 stroke, matched to Golos Text's weight.
const paths: Record<string, React.ReactNode> = {
  oil: (
    <>
      <path d="M4 10h9l3-2h3l-2 6H8l-2-2H4z" />
      <path d="M8 10V8h3v2" />
      <path d="M20 15c0 1.1-.7 2-1.5 2S17 16.1 17 15s1.5-3 1.5-3 1.5 1.9 1.5 3z" />
    </>
  ),
  diagnostics: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M6 12h3l1.5-3 2.5 6 1.5-3H18" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  brakes: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 6.5a7.8 7.8 0 0 0 0 11" strokeWidth="3" />
    </>
  ),
  suspension: (
    <>
      <path d="M12 2v3M12 19v3" />
      <path d="M8 5h8M8 19h8" />
      <path d="M8 7l8 2-8 2 8 2-8 2 8 2" />
    </>
  ),
  tyre: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    </>
  ),
  ac: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
    </>
  ),
  engine: (
    <>
      <path d="M5 9h3V7h6v2h2l2 2h2v6h-2l-2 2H8l-3-3z" />
      <path d="M2 11v4M9 7V5h4" />
    </>
  ),
  inspection: (
    <>
      <path d="M9 4h6v3H9z" />
      <path d="M15 5h3v16H6V5h3" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  electrical: (
    <>
      <path d="M13 2 5 13h6l-1 9 8-11h-6z" />
    </>
  ),
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  car: (
    <>
      <path d="M3 16v-4l2-5h14l2 5v4z" />
      <path d="M3 12h18" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...rest }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name] ?? paths.wrench}
    </svg>
  );
}
