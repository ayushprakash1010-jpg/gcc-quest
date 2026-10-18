import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { GCC_QUEST_LOGO_DATA_URI } from "@/lib/logo-data-uri";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const title = searchParams.get("title") || "GCC Industry Updates";
    const source = searchParams.get("source") || "GCC Quest Insights";
    const customH1 = searchParams.get("h1");
    const customH2 = searchParams.get("h2");
    const customBg = searchParams.get("bg");
    const aspect = searchParams.get("aspect") || "square"; // "square" (1:1) default for LinkedIn

    // Determine headline lines
    let part1 = customH1;
    let part2 = customH2;

    if (!part1 || !part2) {
      // Intelligently split the title into a punchy 2-line headline
      const words = title.trim().split(/\s+/);
      if (words.length <= 4) {
        const mid = Math.ceil(words.length / 2);
        part1 = words.slice(0, mid).join(" ");
        part2 = words.slice(mid).join(" ");
      } else {
        const mid = Math.min(4, Math.ceil(words.length / 2));
        part1 = words.slice(0, mid).join(" ");
        const rest = words.slice(mid, mid + 5).join(" ");
        part2 = rest + (words.length > mid + 5 ? "..." : "");
      }
    }

    // Determine background image (use passed bg, or generate free Flux visual via Pollinations)
    let bgUrl = customBg;
    if (!bgUrl) {
      const cleanKeywords = title
        .replace(/[^\w\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
      const prompt = encodeURIComponent(
        `cinematic modern corporate glass headquarters, tech park in India, ${cleanKeywords}, soft sunset lighting, architectural photography, photorealistic 8k`,
      );
      bgUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1080&model=flux&nologo=true`;
    }

    const isSquare = aspect !== "landscape";
    const width = isSquare ? 1080 : 1200;
    const height = isSquare ? 1080 : 630;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#070b19",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* 1. Photorealistic Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgUrl}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* 2. Top-to-Bottom Multi-Stop Vignette Overlay for High Typography Contrast */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: isSquare ? "460px" : "320px",
            background:
              "linear-gradient(180deg, rgba(7, 11, 25, 0.95) 0%, rgba(7, 11, 25, 0.88) 60%, rgba(7, 11, 25, 0.4) 85%, rgba(7, 11, 25, 0) 100%)",
          }}
        />

        {/* 3. Bottom Gradient Vignette */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "140px",
            background:
              "linear-gradient(0deg, rgba(7, 11, 25, 0.9) 0%, rgba(7, 11, 25, 0) 100%)",
          }}
        />

        {/* 4. Top Header: Official GCC Quest Logo */}
        <div
          style={{
            position: "absolute",
            top: isSquare ? 48 : 36,
            left: isSquare ? 56 : 48,
            display: "flex",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GCC_QUEST_LOGO_DATA_URI}
            alt="GCC Quest"
            style={{
              width: isSquare ? 320 : 260,
              height: isSquare ? 90 : 75,
              objectFit: "contain",
            }}
          />
        </div>

        {/* 5. Dual-Tone Bold Headline in Upper Quadrant */}
        <div
          style={{
            position: "absolute",
            top: isSquare ? 168 : 130,
            left: isSquare ? 56 : 48,
            right: isSquare ? 56 : 48,
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: isSquare ? 52 : 44,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {part1}
          </div>
          <div
            style={{
              fontSize: isSquare ? 52 : 44,
              fontWeight: 900,
              color: "#38bdf8", // Vibrant Sky Cyan / Teal Accent
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginTop: 6,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
          >
            {part2}
          </div>
        </div>

        {/* 6. Bottom Bar: Category Badge & Domain */}
        <div
          style={{
            position: "absolute",
            bottom: isSquare ? 40 : 28,
            left: isSquare ? 56 : 48,
            right: isSquare ? 56 : 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              padding: "8px 20px",
              borderRadius: "24px",
              color: "#7dd3fc",
              fontSize: isSquare ? 18 : 15,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {source}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: isSquare ? 20 : 16,
              fontWeight: 600,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
            }}
          >
            gcc-quest.com
          </div>
        </div>
      </div>,
      {
        width,
        height,
      },
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
