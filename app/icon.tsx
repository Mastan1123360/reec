import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070e1d",
          borderRadius: 8,
          border: "1px solid #3b82f6",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2.5L3.5 7.4V16.6L12 21.5L20.5 16.6V7.4L12 2.5Z"
            stroke="#60a5fa"
            strokeWidth="2"
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
    ),
    {
      ...size,
    }
  );
}
