import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Get title from query string, fallback to default
    const title = searchParams.get("title") || "GCC Industry Updates";
    const source = searchParams.get("source") || "GCC Quest Insights";

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0f172a", // slate-900 (dark premium background)
          padding: "80px 100px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0) 100%)",
            zIndex: 0,
          }}
        />

        {/* Top: Branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 20,
            }}
          >
            <span style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
              Q
            </span>
          </div>
          <span
            style={{
              color: "#94a3b8",
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            GCC QUEST
          </span>
        </div>

        {/* Middle: Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#38bdf8",
              fontSize: 24,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 24,
            }}
          >
            {source}
          </div>
          <div
            style={{
              color: "white",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: URL/Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <span style={{ color: "#64748b", fontSize: 24, fontWeight: 500 }}>
            gcc-quest.com
          </span>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
