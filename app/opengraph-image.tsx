import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "REEC — Rust Elite Engineering Curriculum";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #070e1d 0%, #0d1b2a 50%, #030712 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
          padding: 60,
          position: "relative",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.05) 50%, transparent 70%)",
            top: 15,
          }}
        />

        {/* Logo Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 90,
            height: 90,
            borderRadius: 24,
            background: "rgba(59, 130, 246, 0.15)",
            border: "2px solid #3b82f6",
            marginBottom: 28,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="56"
            height="56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2.5L3.5 7.4V16.6L12 21.5L20.5 16.6V7.4L12 2.5Z"
              stroke="#60a5fa"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path
              d="M9 7.5H13.2C14.3 7.5 15.2 8.3 15.2 9.4C15.2 10.5 14.3 11.3 13.2 11.3H9V7.5Z"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 11.3H12.5L15 16.5M9 7.5V16.5"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Brand Title */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span style={{ color: "#ffffff" }}>REEC</span>
          <span style={{ color: "#38bdf8" }}>ACADEMY</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Rust Elite Engineering Curriculum
        </div>

        {/* Philosophy Motto */}
        <div
          style={{
            fontSize: 22,
            fontStyle: "italic",
            color: "#cbd5e1",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          &ldquo;Understand the machine. Then make it yours.&rdquo;
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
