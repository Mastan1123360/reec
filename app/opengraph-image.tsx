import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const alt = "REEC — Rust Elite Engineering Curriculum";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const logoData = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.15)",
            border: "2px solid #3b82f6",
            marginBottom: 28,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={90} height={90} alt="REEC" />
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
