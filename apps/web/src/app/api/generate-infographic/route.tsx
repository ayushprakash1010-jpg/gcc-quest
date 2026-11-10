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
  pillars: Array<{ title: string; subtitle?: string }>;
  quoteTakeaway: string;
  impactItems: Array<{ title: string; desc: string }>;
  ctaTitle: string;
  ctaQuestion: string;
}

// Curated high-resolution evening tech cityscapes that create the rich corporate background on the right
const CITY_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80", // Illuminated skyscrapers dusk
  "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&q=80", // Modern corporate skyline
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80", // Modern glass corporate high-rise
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80", // Tech park commercial towers
];

async function fetchCityBackgroundAsBase64(
  seed: number,
): Promise<string | null> {
  try {
    const chosenUrl = CITY_BACKGROUNDS[seed % CITY_BACKGROUNDS.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(chosenUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

async function extractInfographicDataWithGemini(
  title: string,
  summary: string = "",
): Promise<InfographicData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const prompt = `You are an elite B2B research analyst (like McKinsey, Gartner, Bain) creating a viral LinkedIn Infographic Slide for GCC Quest.
Analyze the article and extract structured data.
Return JSON ONLY matching these exact fields:
- categoryTag: (e.g. "INDIA'S GCC BOOM" or "EXECUTIVE LEADERSHIP MANDATE" or "WORKFORCE AI EVOLUTION", uppercase, 2-4 words)
- headlinePart1: (First half of main title, in pure white, punchy, e.g. "From Support Centers")
- headlinePart2: (Second half of main title, highlighted in vibrant gold, e.g. "to Global Innovation Engines")
- subtitle: (2-sentence clear executive summary explaining the strategic milestone, max 26 words)
- stat1: { "label": "TOTAL GCCS IN INDIA", "value": "2,117", "note": "(and growing)" } (Extract a primary metric or key number from the text)
- stat2: { "label": "INDUSTRY REVENUE BY FY26", "value": "$98.4B", "note": "(on track)" } (Extract a financial or percentage metric)
- shiftTitle: (Section header, e.g. "THE SHIFT: FROM COST ARBITRAGE TO HIGH-VALUE INNOVATION")
- pillars: (Array of exactly 4 capabilities with title and short subtitle: [
    { "title": "Product Engineering", "subtitle": "Core R&D" },
    { "title": "Advanced R&D", "subtitle": "AI & DeepTech" },
    { "title": "Cloud Integration", "subtitle": "Enterprise Scale" },
    { "title": "AI Strategies", "subtitle": "Global Leadership" }
  ])
- quoteTakeaway: (1 crisp strategic takeaway quote, max 14 words, e.g. "Enterprises are leveraging Indian GCCs as vital innovation engines, not cost centers.")
- impactItems: (Array of exactly 3 objects with "title" (uppercase 1-2 words) and "desc" (under 9 words), e.g. [
    { "title": "TALENT ACQUISITION", "desc": "Greater demand for skilled tech leaders and AI specialists." },
    { "title": "INFRASTRUCTURE", "desc": "Aggressive expansion across Tier-1 and Tier-2 tech hubs." },
    { "title": "LEADERSHIP", "desc": "Direct C-suite ownership of mission-critical global software." }
  ])
- ctaTitle: (e.g. "THE $100 BILLION MILESTONE IS WITHIN SIGHT.")
- ctaQuestion: (A thoughtful question prompting executive discussion, max 18 words, e.g. "How is your leadership team restructuring its captive operating model to capture higher-value engineering?")

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
    categoryTag: "INDIA'S GCC BOOM",
    headlinePart1: "From Support Centers",
    headlinePart2: "to Global Innovation Engines",
    subtitle:
      "India has officially crossed a monumental milestone, with Global Capability Centers surging in scale and accelerating toward a historic $100B revenue trajectory.",
    stat1: {
      label: "TOTAL GCCS IN INDIA",
      value: "2,117",
      note: "(and growing)",
    },
    stat2: {
      label: "INDUSTRY REVENUE BY FY26",
      value: "$98.4B",
      note: "(on track)",
    },
    shiftTitle: "THE SHIFT: FROM COST ARBITRAGE TO HIGH-VALUE INNOVATION",
    pillars: [
      { title: "Product Engineering", subtitle: "Core Software" },
      { title: "Advanced R&D", subtitle: "AI & Innovation" },
      { title: "Cloud Integration", subtitle: "Enterprise Scale" },
      { title: "Global Leadership", subtitle: "C-Suite Direction" },
    ],
    quoteTakeaway:
      "Enterprises are leveraging Indian GCCs as vital innovation engines, not just cost centers.",
    impactItems: [
      {
        title: "TALENT ACQUISITION",
        desc: "Greater demand for skilled engineers and AI researchers.",
      },
      {
        title: "INFRASTRUCTURE",
        desc: "Rapid expansion of prime commercial office tech hubs.",
      },
      {
        title: "LEADERSHIP",
        desc: "Building next-gen global leaders for international delivery.",
      },
    ],
    ctaTitle: "THE $100 BILLION MILESTONE IS WITHIN SIGHT.",
    ctaQuestion:
      "How is your leadership team restructuring its captive operating model to capture higher-value engineering mandates?",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, source } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const seed = Math.abs(
      title
        .split("")
        .reduce(
          (acc: number, char: string) => (acc << 5) - acc + char.charCodeAt(0),
          0,
        ),
    );

    // 1. Extract structured B2B intelligence with Gemini
    let data = await extractInfographicDataWithGemini(title, summary || "");
    if (!data) {
      data = buildFallbackData(title);
    }

    // 2. Fetch curated city background image for right-hand visual window
    const cityBgDataUri = await fetchCityBackgroundAsBase64(seed);

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

    // 3. Render 1200x675 Slide matching the Reference Design
    const imageResponse = new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#060913",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── BACKGROUND LAYER: Photorealistic Cityscape on Right Half ── */}
        {cityBgDataUri && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cityBgDataUri}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "560px",
              height: "460px",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
        )}

        {/* ── GRADIENT OVERLAY: Ensures Left Side is Pitch Dark for Razor-Sharp Text Contrast ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(90deg, #060913 0%, #060913 54%, rgba(6, 9, 19, 0.88) 72%, rgba(6, 9, 19, 0.4) 100%)",
            display: "flex",
          }}
        />

        {/* ── TOP-TO-BOTTOM LIGHTING MASK ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(180deg, rgba(6, 9, 19, 0.2) 0%, rgba(6, 9, 19, 0.95) 75%, #060913 100%)",
            display: "flex",
          }}
        />

        {/* ── MAIN CONTENT CONTAINER (Padded to 1200x675 canvas) ── */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "28px 36px 18px 36px",
            justifyContent: "space-between",
          }}
        >
          {/* ═════════ SECTION 1: HEADER & KEY STATS (TOP ROW) ═════════ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            {/* Left: Category Tag + 2-Tone Headline + Executive Subtitle */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "560px",
              }}
            >
              {/* Category Pill Tag */}
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#38bdf8",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#38bdf8",
                    display: "flex",
                  }}
                />
                {categoryTag}
              </div>

              {/* Main Headline (Part 1 in White, Part 2 in Vibrant Gold) */}
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span>{headlinePart1}</span>
                <span style={{ color: "#facc15" }}>{headlinePart2}</span>
              </div>

              {/* Context Executive Subtitle */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  lineHeight: 1.45,
                  marginTop: "6px",
                  maxWidth: "530px",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            </div>

            {/* Middle-Right: 2 Big Metric Stat Cards */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              {/* Stat 1: Enterprise Count */}
              <div
                style={{
                  backgroundColor: "rgba(11, 19, 38, 0.88)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  width: "175px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "#94a3b8",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "3px",
                  }}
                >
                  🏢 {stat1.label}
                </div>
                <div
                  style={{
                    fontSize: "34px",
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
                    fontSize: "10px",
                    color: "#64748b",
                    marginTop: "3px",
                    display: "flex",
                  }}
                >
                  {stat1.note}
                </div>
              </div>

              {/* Stat 2: Revenue Figure */}
              <div
                style={{
                  backgroundColor: "rgba(11, 19, 38, 0.88)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  width: "175px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "#94a3b8",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "3px",
                  }}
                >
                  📈 {stat2.label}
                </div>
                <div
                  style={{
                    fontSize: "34px",
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
                    fontSize: "10px",
                    color: "#64748b",
                    marginTop: "3px",
                    display: "flex",
                  }}
                >
                  {stat2.note}
                </div>
              </div>
            </div>

            {/* Far Right: Stylized India Tech Constellation Node */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                textAlign: "right",
                width: "185px",
                paddingTop: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ color: "#38bdf8" }}>✦</span> INDIA
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#38bdf8",
                  lineHeight: 1.25,
                  marginTop: "2px",
                  display: "flex",
                }}
              >
                The Premier Nerve Center for Global Enterprises
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#64748b",
                  fontStyle: "italic",
                  marginTop: "4px",
                  display: "flex",
                }}
              >
                Global Talent + Indian Innovation
              </div>
            </div>
          </div>

          {/* ═════════ SECTION 2: THE SHIFT & 4 CIRCULAR BADGES ═════════ */}
          <div
            style={{
              backgroundColor: "rgba(10, 18, 38, 0.75)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: "8px",
              padding: "10px 18px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header row with quote */}
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
                  fontSize: "10px",
                  fontWeight: 900,
                  color: "#f1f5f9",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                {shiftTitle}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#38bdf8",
                  fontStyle: "italic",
                  maxWidth: "520px",
                  textAlign: "right",
                  display: "flex",
                }}
              >
                &ldquo;{quoteTakeaway}&rdquo;
              </div>
            </div>

            {/* 4 Circular Pillar Badges with Labels */}
            <div style={{ display: "flex", gap: "10px" }}>
              {pillars.map((pillar, idx) => {
                const iconEmojis = ["</>", "🔬", "☁️", "🤖"];
                const iconColors = [
                  "rgba(14, 165, 233, 0.25)",
                  "rgba(168, 85, 247, 0.25)",
                  "rgba(20, 184, 166, 0.25)",
                  "rgba(59, 130, 246, 0.25)",
                ];
                const textColors = ["#38bdf8", "#c084fc", "#2dd4bf", "#60a5fa"];

                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {/* Circular Icon Badge */}
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: iconColors[idx % iconColors.length],
                        border: `1px solid ${textColors[idx % textColors.length]}`,
                        color: textColors[idx % textColors.length],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {iconEmojis[idx % iconEmojis.length]}
                    </div>
                    {/* Label */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "#f8fafc",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pillar.title}
                      </span>
                      {pillar.subtitle && (
                        <span style={{ fontSize: "9px", color: "#64748b" }}>
                          {pillar.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═════════ SECTION 3: IMPACT CARDS + GOLD CTA BOX ═════════ */}
          <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
            {/* Left: 3 Ripple Effect Columns */}
            <div style={{ display: "flex", gap: "8px", flex: 1 }}>
              {impactItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(11, 19, 38, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "9px 12px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 900,
                      color: "#38bdf8",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: "3px",
                      display: "flex",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                      lineHeight: 1.3,
                      display: "flex",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Gold Discussion Call-To-Action Box */}
            <div
              style={{
                width: "410px",
                backgroundColor: "rgba(234, 179, 8, 0.12)",
                border: "1px solid rgba(234, 179, 8, 0.45)",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    color: "#fde047",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                    display: "flex",
                  }}
                >
                  📊 {ctaTitle}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#fef08a",
                    lineHeight: 1.3,
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
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "10px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "flex-start",
                }}
              >
                💬 Share your insights below!
              </div>
            </div>
          </div>

          {/* ═════════ SECTION 4: FOOTER BAR (LOGO & SOURCE) ═════════ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              paddingTop: "6px",
            }}
          >
            <div
              style={{ fontSize: "10px", color: "#64748b", display: "flex" }}
            >
              Source: {source || "YourStory.com"}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={GCC_QUEST_LOGO_DATA_URI}
                alt="GCC Quest"
                style={{ width: 140, height: 28, objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#38bdf8",
                letterSpacing: "0.04em",
                display: "flex",
              }}
            >
              #GCC #IndiaTech #GlobalCapabilityCenters
            </div>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 675,
      },
    );

    // 4. Convert ImageResponse to PNG buffer and persist directly to Vercel Blob store
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
