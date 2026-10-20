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

    // Determine background image (use passed bg, or select a curated, free high-speed visual)
    const lowerTitle = title.toLowerCase();

    // Deterministic seed based on title hash so each article gets a consistent visual
    const seed =
      Math.abs(
        title
          .split("")
          .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
      ) % 1000000;

    // Curated high-resolution, instant-loading GCC & Corporate imagery (100% free, 0ms rate limit)
    const topicVisuals = {
      cxo: [
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // Executive glass boardroom skyline
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1080&q=80", // Sleek corporate boardroom
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1080&q=80", // Modern corporate executive suite
      ],
      realEstate: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Modern corporate glass towers
        "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1080&q=80", // Futuristic corporate glass facade
        "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?w=1080&q=80", // Cyber district skyline
      ],
      tech: [
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80", // Software innovation team
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1080&q=80", // Modern tech hub collaboration
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80", // Ambient illuminated tech workstation
      ],
      general: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80", // Grand entrance innovation hub
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Sleek glass facade corporate park
      ],
    };

    let fallbackUrl = "";
    if (
      lowerTitle.includes("cxo") ||
      lowerTitle.includes("leader") ||
      lowerTitle.includes("ceo") ||
      lowerTitle.includes("appoint") ||
      lowerTitle.includes("strategy") ||
      lowerTitle.includes("director") ||
      lowerTitle.includes("managing")
    ) {
      fallbackUrl = topicVisuals.cxo[seed % topicVisuals.cxo.length];
    } else if (
      lowerTitle.includes("leasing") ||
      lowerTitle.includes("real estate") ||
      lowerTitle.includes("hyderabad") ||
      lowerTitle.includes("bengaluru") ||
      lowerTitle.includes("bangalore") ||
      lowerTitle.includes("chennai") ||
      lowerTitle.includes("pune") ||
      lowerTitle.includes("office") ||
      lowerTitle.includes("space") ||
      lowerTitle.includes("square feet") ||
      lowerTitle.includes("sq ft")
    ) {
      fallbackUrl =
        topicVisuals.realEstate[seed % topicVisuals.realEstate.length];
    } else if (
      lowerTitle.includes("ai") ||
      lowerTitle.includes("skill") ||
      lowerTitle.includes("talent") ||
      lowerTitle.includes("workforce") ||
      lowerTitle.includes("hiring") ||
      lowerTitle.includes("job") ||
      lowerTitle.includes("reskill") ||
      lowerTitle.includes("salary") ||
      lowerTitle.includes("engineer") ||
      lowerTitle.includes("tech")
    ) {
      fallbackUrl = topicVisuals.tech[seed % topicVisuals.tech.length];
    } else {
      fallbackUrl = topicVisuals.general[seed % topicVisuals.general.length];
    }

    // Pre-fetch the background image into base64.
    // We try the custom background first (e.g. real news photo), then fall back to the curated topic visual.
    let bgDataUri: string | null = null;
    const fetchImageAsBase64 = async (url: string, timeoutMs: number) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const imgRes = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "image/*,*/*;q=0.8",
          },
        });
        clearTimeout(timeout);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          if (buffer.byteLength > 1000) {
            const base64 = Buffer.from(buffer).toString("base64");
            const mime = imgRes.headers.get("content-type") || "image/jpeg";
            return `data:${mime};base64,${base64}`;
          }
        }
      } catch {
        // Fetch failed or timed out
      }
      return null;
    };

    if (customBg) {
      bgDataUri = await fetchImageAsBase64(customBg, 4000);
    }

    // If no custom background was provided or if fetching it failed, use the reliable curated topic image
    if (!bgDataUri && fallbackUrl) {
      bgDataUri = await fetchImageAsBase64(fallbackUrl, 3000);
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
        {/* 1. Photorealistic Background Image or Ambient Tech Slate Gradient */}
        {bgDataUri ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={bgDataUri}
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
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(circle at 75% 25%, #1e293b 0%, #0f172a 45%, #020617 100%)",
            }}
          />
        )}

        {/* 2. Top-to-Bottom Multi-Stop Vignette Overlay for Seamless Logo Blending and High Typography Contrast */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: isSquare ? "480px" : "340px",
            background:
              "linear-gradient(180deg, rgba(7, 11, 25, 0.96) 0%, rgba(7, 11, 25, 0.88) 50%, rgba(7, 11, 25, 0.45) 80%, rgba(7, 11, 25, 0) 100%)",
          }}
        />

        {/* 3. Top Header: Official GCC Quest Logo */}
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

        {/* 4. Dual-Tone Bold Headline in Upper Quadrant */}
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

        {/* 5. Sleek Solid Black Bottom Bar (Cleanly Conceals Any Background Watermarks and Grounds the Graphic) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isSquare ? "78px" : "64px",
            backgroundColor: "#000000",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: isSquare ? 56 : 48,
            paddingRight: isSquare ? 56 : 48,
            zIndex: 15,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              padding: "6px 20px",
              borderRadius: "20px",
              color: "#7dd3fc",
              fontSize: isSquare ? 17 : 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {source}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: isSquare ? 19 : 15,
              fontWeight: 600,
              letterSpacing: "0.04em",
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
        headers: {
          "Cache-Control":
            "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        },
      },
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
