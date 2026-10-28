import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ff6a1a" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M20.5 9.5a5 5 0 0 0-6.2 6.2L8.6 21.4a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a5 5 0 0 0 6.2-6.2l-2.9 2.9-2.3-.6-.6-2.3z" fill="#0b0d10" />
        </svg>
      </div>
    ),
    size,
  );
}
