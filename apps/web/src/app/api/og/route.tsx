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

    // Curated high-resolution, topic-accurate GCC Ecosystem imagery (100% verified, 0ms rate limit)
    const topicVisuals = {
      gcc_setup: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Glass high-rise towers
        "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1080&q=80", // Futuristic corporate glass campus
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1080&q=80", // Modern commercial high-rise
        "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=1080&q=80", // High-tech corporate headquarters campus
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1080&q=80", // Modern architecture headquarters
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1080&q=80", // Architectural development project
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1080&q=80", // Corporate facility entrance
      ],
      real_estate_hubs: [
        "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1080&q=80", // Metropolitan commercial skyline
        "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80", // Modern skyscrapers perspective
        "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&q=80", // Urban commercial corridor
        "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1080&q=80", // Modern glass office facade
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Corporate tech towers
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80", // Grand corporate park atrium
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1080&q=80", // Commercial business park
      ],
      ai_tech_innovation: [
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80", // Ambient illuminated tech workstation
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80", // Software engineering team
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1080&q=80", // Tech innovation hub collaboration
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&q=80", // Modern software dev pod
        "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1080&q=80", // Enterprise cloud data center
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&q=80", // Tech training & workshop
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1080&q=80", // Cloud server architecture & network hub
      ],
      workforce_talent: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1080&q=80", // Diverse tech workforce collaborating
        "https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=1080&q=80", // Modern tech discussion & sprint planning
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1080&q=80", // Talent interview & hiring discussion
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080&q=80", // Strategy & talent planning session
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1080&q=80", // University campus tech talent
        "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1080&q=80", // Corporate conference & tech summit
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1080&q=80", // Enterprise tech professional
      ],
      bfsi_gcc: [
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80", // International financial district architecture
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&q=80", // Institutional trading & market charts
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80", // Financial risk & analytics dashboard
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080&q=80", // Global banking analytics & wealth management
        "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1080&q=80", // Digital banking & equity platforms
        "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1080&q=80", // Institutional financial agreement
        "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1080&q=80", // Global financial exchange operations
      ],
      engineering_rnd: [
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1080&q=80", // Advanced precision engineering laboratory
        "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=1080&q=80", // Automotive robotics & automation R&D
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1080&q=80", // Modern assembly line & robotics testing
        "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1080&q=80", // High-tech engineering R&D center
        "https://images.unsplash.com/photo-1516937941344-00b4e0337589?w=1080&q=80", // Industrial robotics & smart manufacturing
        "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1080&q=80", // Hardware engineering & prototyping
        "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1080&q=80", // Electronic hardware testing & embedded systems
      ],
      cross_border_mnc: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Global multinational glass towers
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80", // International business commerce
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1080&q=80", // Global partnership & strategic alliance
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1080&q=80", // Executive international boardroom
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1080&q=80", // Bilateral agreement & corporate alliance
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1080&q=80", // Global enterprise strategy negotiation
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // International metropolitan headquarters
      ],
      data_reports: [
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80", // Data analytics & research dashboard
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080&q=80", // Comprehensive industry data visualizations
        "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1080&q=80", // Research metrics & market analytics
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1080&q=80", // Digital analytics metrics & KPI dashboard
        "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1080&q=80", // Market size & macroeconomic data metrics
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80", // Market research terminal
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080&q=80", // GCC ecosystem growth metrics
      ],
      cxo_leadership: [
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // Executive glass boardroom overlooking skyline
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1080&q=80", // Corporate leadership in executive office
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1080&q=80", // Country head & enterprise executive
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80", // Center head & managing director
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1080&q=80", // Senior leader presenting strategic mandate
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&q=80", // GCC executive leadership summit
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1080&q=80", // Boardroom strategy & governance presentation
      ],
      general: [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80", // Modern architectural skyscraper
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80", // Grand corporate glass atrium
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80", // International business commerce
        "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1080&q=80", // Panoramic financial center glass view
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1080&q=80", // Corporate enterprise conference complex
        "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1080&q=80", // Sleek modern corporate office space
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1080&q=80", // Executive conference room
      ],
    };

    let fallbackUrl = "";
    if (
      lowerTitle.includes("nasscom") ||
      lowerTitle.includes("zinnov") ||
      lowerTitle.includes("cbre") ||
      lowerTitle.includes("jll") ||
      lowerTitle.includes("colliers") ||
      lowerTitle.includes("ey ") ||
      lowerTitle.includes("deloitte") ||
      lowerTitle.includes("report") ||
      lowerTitle.includes("survey") ||
      lowerTitle.includes("study") ||
      lowerTitle.includes("forecast") ||
      lowerTitle.includes("market size")
    ) {
      fallbackUrl =
        topicVisuals.data_reports[seed % topicVisuals.data_reports.length];
    } else if (
      lowerTitle.includes("bank") ||
      lowerTitle.includes("banking") ||
      lowerTitle.includes("bfsi") ||
      lowerTitle.includes("jpmorgan") ||
      lowerTitle.includes("jp morgan") ||
      lowerTitle.includes("goldman") ||
      lowerTitle.includes("wells fargo") ||
      lowerTitle.includes("morgan stanley") ||
      lowerTitle.includes("barclays") ||
      lowerTitle.includes("hsbc") ||
      lowerTitle.includes("citi") ||
      lowerTitle.includes("deutsche bank") ||
      lowerTitle.includes("standard chartered") ||
      lowerTitle.includes("fintech")
    ) {
      fallbackUrl = topicVisuals.bfsi_gcc[seed % topicVisuals.bfsi_gcc.length];
    } else if (
      lowerTitle.includes("automotive") ||
      lowerTitle.includes("aerospace") ||
      lowerTitle.includes("boeing") ||
      lowerTitle.includes("airbus") ||
      lowerTitle.includes("mercedes") ||
      lowerTitle.includes("bmw") ||
      lowerTitle.includes("bosch") ||
      lowerTitle.includes("continental") ||
      lowerTitle.includes("ev ") ||
      lowerTitle.includes("mobility") ||
      lowerTitle.includes("robotics") ||
      lowerTitle.includes("hardware")
    ) {
      fallbackUrl =
        topicVisuals.engineering_rnd[
          seed % topicVisuals.engineering_rnd.length
        ];
    } else if (
      lowerTitle.includes("german") ||
      lowerTitle.includes("germany") ||
      lowerTitle.includes("american") ||
      lowerTitle.includes("european") ||
      lowerTitle.includes("japanese") ||
      lowerTitle.includes("british") ||
      lowerTitle.includes("nordic") ||
      lowerTitle.includes("multinational") ||
      lowerTitle.includes("mnc") ||
      lowerTitle.includes("cross-border")
    ) {
      fallbackUrl =
        topicVisuals.cross_border_mnc[
          seed % topicVisuals.cross_border_mnc.length
        ];
    } else if (
      lowerTitle.includes("hyderabad") ||
      lowerTitle.includes("bengaluru") ||
      lowerTitle.includes("bangalore") ||
      lowerTitle.includes("cyberabad") ||
      lowerTitle.includes("hitec") ||
      lowerTitle.includes("pune") ||
      lowerTitle.includes("chennai") ||
      lowerTitle.includes("gurgaon") ||
      lowerTitle.includes("gurugram") ||
      lowerTitle.includes("noida") ||
      lowerTitle.includes("leasing") ||
      lowerTitle.includes("office space") ||
      lowerTitle.includes("sq ft") ||
      lowerTitle.includes("square feet") ||
      lowerTitle.includes("tech park") ||
      lowerTitle.includes("sez") ||
      lowerTitle.includes("dlf") ||
      lowerTitle.includes("embassy") ||
      lowerTitle.includes("mindspace")
    ) {
      fallbackUrl =
        topicVisuals.real_estate_hubs[
          seed % topicVisuals.real_estate_hubs.length
        ];
    } else if (
      lowerTitle.includes("ai") ||
      lowerTitle.includes("genai") ||
      lowerTitle.includes("generative ai") ||
      lowerTitle.includes("machine learning") ||
      lowerTitle.includes("data center") ||
      lowerTitle.includes("cloud") ||
      lowerTitle.includes("software") ||
      lowerTitle.includes("engineering") ||
      lowerTitle.includes("r&d") ||
      lowerTitle.includes("digital transformation") ||
      lowerTitle.includes("cybersecurity")
    ) {
      fallbackUrl =
        topicVisuals.ai_tech_innovation[
          seed % topicVisuals.ai_tech_innovation.length
        ];
    } else if (
      lowerTitle.includes("workforce") ||
      lowerTitle.includes("talent") ||
      lowerTitle.includes("hiring") ||
      lowerTitle.includes("jobs") ||
      lowerTitle.includes("reskill") ||
      lowerTitle.includes("upskill") ||
      lowerTitle.includes("salary") ||
      lowerTitle.includes("salaries") ||
      lowerTitle.includes("attrition") ||
      lowerTitle.includes("freshers") ||
      lowerTitle.includes("campus")
    ) {
      fallbackUrl =
        topicVisuals.workforce_talent[
          seed % topicVisuals.workforce_talent.length
        ];
    } else if (
      lowerTitle.includes("cxo") ||
      lowerTitle.includes("leader") ||
      lowerTitle.includes("ceo") ||
      lowerTitle.includes("appoint") ||
      lowerTitle.includes("md") ||
      lowerTitle.includes("director") ||
      lowerTitle.includes("managing") ||
      lowerTitle.includes("country head") ||
      lowerTitle.includes("center head") ||
      lowerTitle.includes("steps down") ||
      lowerTitle.includes("resigns")
    ) {
      fallbackUrl =
        topicVisuals.cxo_leadership[seed % topicVisuals.cxo_leadership.length];
    } else if (
      lowerTitle.includes("gcc") ||
      lowerTitle.includes("capability center") ||
      lowerTitle.includes("setup") ||
      lowerTitle.includes("opens") ||
      lowerTitle.includes("launch") ||
      lowerTitle.includes("expansion") ||
      lowerTitle.includes("expand") ||
      lowerTitle.includes("inaugurate") ||
      lowerTitle.includes("center of excellence") ||
      lowerTitle.includes("coe")
    ) {
      fallbackUrl =
        topicVisuals.gcc_setup[seed % topicVisuals.gcc_setup.length];
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
