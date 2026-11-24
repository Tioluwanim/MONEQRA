import { ImageResponse } from "next/og";

export const alt = "MONEQRA ledger under pressure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0d1930", color: "#f6efe3", display: "flex", alignItems: "center", padding: 96 }}>
        <div style={{ display: "flex", flexDirection: "column", borderLeft: "8px solid #d9411e", paddingLeft: 44 }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, marginBottom: 24 }}>MONEQRA / INCIDENT LEDGER</div>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1.05 }}>From payment incident<br />to business impact.</div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 24, color: "#b9bdc8" }}>Prototype · simulated data</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
