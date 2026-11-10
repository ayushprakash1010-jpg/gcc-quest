import { ImageResponse } from "next/og";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { GCC_QUEST_LOGO_DATA_URI } from "@/lib/logo-data-uri";

export const runtime = "nodejs";

interface InfographicData {
  categoryTag: string;
  headlinePart1: string;
  headlinePart2: string;
  subtitle: string;
  stat1: { label: string; value: string; note: string };
  stat2: { label: string; value: string; note: string };
  shiftTitle: string;
  pillars: string[];
  quoteTakeaway: string;
  impactItems: Array<{ title: string; desc: string }>;
  ctaTitle: string;
  ctaQuestion: string;
}

async function extractInfographicDataWithGemini(
  title: string,
  summary: string = "",
): Promise<InfographicData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const prompt = `You are an elite B2B research analyst (like McKinsey or Gartner) creating an executive data infographic slide for LinkedIn.
Analyze the article and extract key metrics, shifts, and takeaways into high-impact slide data.
Return JSON ONLY with these exact fields:
- categoryTag: (e.g. "INDIA'S GCC BOOM" or "ENTERPRISE AI EVOLUTION", uppercase, 2-4 words)
- headlinePart1: (First half of main title, punchy, e.g. "From Support Centers")
- headlinePart2: (Second half of main title, e.g. "to Global Innovation Engines")
- subtitle: (2-sentence clear summary of the core news/milestone, max 25 words)
- stat1: { "label": "TOTAL GCCS IN INDIA", "value": "2,117", "note": "(and growing)" } (Extract a prominent metric or estimate from the story)
- stat2: { "label": "INDUSTRY REVENUE", "value": "$98.4B", "note": "(by FY26)" } (Extract a second prominent metric or financial figure)
- shiftTitle: (Section header, e.g. "THE SHIFT: FROM COST ARBITRAGE TO VALUE CREATION")
- pillars: (Array of exactly 4 short strategic capabilities, e.g. ["Product Engineering", "Advanced R&D", "Cloud Integration", "AI Strategy"])
- quoteTakeaway: (1 crisp strategic takeaway quote, max 15 words)
- impactItems: (Array of exactly 3 objects with "title" (1-2 words) and "desc" (under 10 words), e.g. [ { "title": "TALENT", "desc": "Surging demand for specialized AI skills" }, { "title": "TECH HUBS", "desc": "Tier-1 clusters absorbing rapid growth" }, { "title": "MANDATE", "desc": "Ownership of mission-critical platforms" } ])
- ctaTitle: (e.g. "THE $100B MILESTONE IS WITHIN SIGHT")
- ctaQuestion: (Engaging question for executive leaders, max 18 words)

Article Title: ${title}
Article Summary: ${summary.slice(0, 500)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText) as InfographicData;
  } catch (err) {
    console.warn("Gemini infographic extraction error:", err);
    return null;
  }
}

function buildFallbackData(title: string): InfographicData {
  return {
    categoryTag: "GCC QUEST EXECUTIVE BRIEFING",
    headlinePart1: "India's GCC Growth",
    headlinePart2: "Accelerates Global Innovation",
    subtitle:
      "Global Capability Centers in India continue scaling high-value digital engineering, AI, and strategic enterprise platforms.",
    stat1: {
      label: "TOTAL ECOSYSTEM GCCS",
      value: "2,100+",
      note: "(across tier-1 hubs)",
    },
    stat2: {
      label: "ANNUAL REVENUE",
      value: "$64B+",
      note: "(projected $100B)",
    },
    shiftTitle: "THE SHIFT: FROM COST ARBITRAGE TO VALUE CREATION",
    pillars: [
      "Product R&D",
      "Cloud Engineering",
      "Artificial Intelligence",
      "Global CXO Leadership",
    ],
    quoteTakeaway:
      "GCCs have transformed from back-office support into strategic innovation nerve centers.",
    impactItems: [
      {
        title: "TALENT",
        desc: "High demand for specialized AI and engineering skills",
      },
      {
        title: "CAPACITY",
        desc: "Scaling operational footprints across major tech corridors",
      },
      {
        title: "DELIVERY",
        desc: "Direct ownership of core enterprise product architecture",
      },
    ],
    ctaTitle: "STRATEGIC TRANSFORMATION MANDATE",
    ctaQuestion:
      "How is your leadership team restructuring captive operations to capture higher-value engineering?",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, source } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // 1. Extract structured data with Gemini
    let data = await extractInfographicDataWithGemini(title, summary || "");
    if (!data) {
      data = buildFallbackData(title);
    }

    const {
      categoryTag,
      headlinePart1,
      headlinePart2,
      subtitle,
      stat1,
      stat2,
      shiftTitle,
      pillars,
      quoteTakeaway,
      impactItems,
      ctaTitle,
      ctaQuestion,
    } = data;

    // 2. Render 1200x675 B2B Executive Slide with next/og ImageResponse
    const imageResponse = new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#070b19",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          padding: "32px 40px 24px 40px",
          overflow: "hidden",
        }}
      >
        {/* Subtle Ambient Tech Background Glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "600px",
            height: "400px",
            background:
              "radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.08) 40%, rgba(7, 11, 25, 0) 70%)",
            display: "flex",
          }}
        />

        {/* ── ROW 1: Header (Left) + 2 Stat Cards (Right) ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
            marginBottom: "16px",
          }}
        >
          {/* Left: Category + Headline + Subtitle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "650px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#38bdf8",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "6px",
                display: "flex",
              }}
            >
              {categoryTag}
            </div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>{headlinePart1}</span>
              <span style={{ color: "#38bdf8" }}>{headlinePart2}</span>
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#94a3b8",
                lineHeight: 1.4,
                marginTop: "8px",
                maxWidth: "610px",
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Right: 2 KPI Cards */}
          <div style={{ display: "flex", gap: "12px" }}>
            {/* Stat Card 1 */}
            <div
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                borderRadius: "10px",
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                width: "205px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  display: "flex",
                }}
              >
                {stat1.label}
              </div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#facc15",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  display: "flex",
                }}
              >
                {stat1.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginTop: "4px",
                  display: "flex",
                }}
              >
                {stat1.note}
              </div>
            </div>

            {/* Stat Card 2 */}
            <div
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                borderRadius: "10px",
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                width: "205px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  display: "flex",
                }}
              >
                {stat2.label}
              </div>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#facc15",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  display: "flex",
                }}
              >
                {stat2.value}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  marginTop: "4px",
                  display: "flex",
                }}
              >
                {stat2.note}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: The Shift & 4 Strategic Pillars ── */}
        <div
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#e2e8f0",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {shiftTitle}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#7dd3fc",
                fontStyle: "italic",
                maxWidth: "540px",
                textAlign: "right",
                display: "flex",
              }}
            >
              &ldquo;{quoteTakeaway}&rdquo;
            </div>
          </div>

          {/* 4 Pillars */}
          <div style={{ display: "flex", gap: "10px" }}>
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(30, 41, 59, 0.75)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  {idx + 1}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#f1f5f9",
                    display: "flex",
                  }}
                >
                  {pillar}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 3: Impact Points (Left) + Gold Discussion Card (Right) ── */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            flex: 1,
            marginBottom: "14px",
          }}
        >
          {/* 3 Impact Cards */}
          <div style={{ display: "flex", gap: "10px", flex: 1 }}>
            {impactItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15, 23, 42, 0.55)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#38bdf8",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                    display: "flex",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    lineHeight: 1.35,
                    display: "flex",
                  }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Gold Discussion Box */}
          <div
            style={{
              width: "390px",
              backgroundColor: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fde047",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  display: "flex",
                }}
              >
                {ctaTitle}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#fef08a",
                  lineHeight: 1.35,
                  display: "flex",
                }}
              >
                {ctaQuestion}
              </div>
            </div>
            <div
              style={{
                marginTop: "6px",
                backgroundColor: "#eab308",
                color: "#0f172a",
                padding: "5px 14px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "flex-start",
              }}
            >
              💬 Share your insights below
            </div>
          </div>
        </div>

        {/* ── FOOTER BAR: Source + GCC Quest Logo + Hashtags ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "8px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#64748b", display: "flex" }}>
            Source: {source || "GCC Quest Intelligence"}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={GCC_QUEST_LOGO_DATA_URI}
              alt="GCC Quest"
              style={{ width: 140, height: 30, objectFit: "contain" }}
            />
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#38bdf8",
              letterSpacing: "0.04em",
              display: "flex",
            }}
          >
            #GCC #IndiaTech #GlobalCapabilityCenters
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 675,
      },
    );

    // 3. Convert ImageResponse to PNG buffer and persist directly to Vercel Blob store
    const imageArrayBuffer = await imageResponse.arrayBuffer();

    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    const filename = `articles/${Date.now()}-infographic-${safeSlug}.png`;

    const blob = await put(filename, Buffer.from(imageArrayBuffer), {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({
      url: blob.url,
      data,
    });
  } catch (error: unknown) {
    console.error("Infographic generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate infographic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
