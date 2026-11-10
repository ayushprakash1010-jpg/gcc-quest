import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

async function generateSmartPromptWithGemini(
  title: string,
  summary: string = "",
): Promise<{ prompt: string; unsplashQuery: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s fast timeout

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "You are a visual director for B2B LinkedIn editorial covers. Analyze this article and return valid JSON with two fields:\n" +
                  '1. "prompt": a 25-word high-impact 3D conceptual illustration prompt capturing the industry and tech innovation (e.g. aviation software hub with digital flight trajectories, retail automation, fintech towers, semiconductor robotics). Must specify "3D corporate render, sleek glass architecture, ambient cyan and blue lighting, 8k". Never include flags, human faces, text, words, or letters.\n' +
                  '2. "unsplashQuery": 3-4 precise keywords for corporate photography.\n\n' +
                  `Article Title: ${title}\n` +
                  `Article Summary: ${summary.slice(0, 300)}`,
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed.prompt && parsed.unsplashQuery) {
      return {
        prompt: parsed.prompt,
        unsplashQuery: parsed.unsplashQuery,
      };
    }
  } catch (err) {
    console.warn("Gemini smart prompt generation skipped or failed:", err);
  }
  return null;
}

function buildTopicPrompt(
  title: string,
  summary: string = "",
): { prompt: string; unsplashQuery: string } {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Aviation & Aerospace
  if (
    combined.includes("airline") ||
    combined.includes("aviation") ||
    combined.includes("flight") ||
    combined.includes("southwest") ||
    combined.includes("boeing") ||
    combined.includes("airbus")
  ) {
    return {
      prompt:
        "3D render illustration of modern airline technology innovation center in India, sleek glass aviation architecture, corporate tech park, glowing cyan flight route trajectories, 8k",
      unsplashQuery: "aviation technology modern corporate office",
    };
  }

  // 2. Retail tech & eCommerce (e.g. Walmart Global Tech, Target, Amazon GCCs)
  if (
    combined.includes("retail") ||
    combined.includes("walmart") ||
    combined.includes("commerce") ||
    combined.includes("supply chain") ||
    combined.includes("fulfillment")
  ) {
    return {
      prompt:
        "3D render illustration of modern retail technology innovation hub, automated fulfillment systems, holographic AI logistics analytics, high-tech corporate campus, vibrant blue and cyan lighting, 8k",
      unsplashQuery: "retail technology supply chain logistics",
    };
  }

  // 3. Bilateral relations & cross-border GCCs (German, US, UK, Japan)
  if (
    combined.includes("german") ||
    combined.includes("germany") ||
    combined.includes("japan") ||
    combined.includes("japanese") ||
    combined.includes("united states") ||
    combined.includes("american") ||
    combined.includes("british") ||
    combined.includes("uk") ||
    combined.includes("cross-border")
  ) {
    return {
      prompt:
        "3D render illustration of futuristic multinational corporate glass headquarters in India, modern enterprise campus, clean cinematic lighting, architectural 3D visualization, 8k",
      unsplashQuery: "multinational corporate headquarters glass office",
    };
  }

  // 3. City-specific trajectory & leasing
  if (
    combined.includes("hyderabad") ||
    combined.includes("cyberabad") ||
    combined.includes("hitec")
  ) {
    return {
      prompt:
        "3D render illustration of Hyderabad city skyline with a bold glowing cyan 3D growth arrow arching upwards over corporate glass towers, modern enterprise campus, clean lighting, 8k",
      unsplashQuery: "hyderabad cyber city glass skyscrapers architecture",
    };
  }
  if (combined.includes("bengaluru") || combined.includes("bangalore")) {
    return {
      prompt:
        "3D render illustration of futuristic Bengaluru cyber tech corridor, illuminated glass skyscrapers with glowing upward cyan trajectory line, dusk corporate atmosphere, 8k",
      unsplashQuery: "bangalore tech park illuminated glass towers",
    };
  }
  if (
    combined.includes("pune") ||
    combined.includes("chennai") ||
    combined.includes("mumbai") ||
    combined.includes("noida") ||
    combined.includes("gurugram") ||
    combined.includes("gurgaon")
  ) {
    return {
      prompt:
        "3D render illustration of modern Indian financial cyber district with modern glass towers and glowing upward commercial growth arrow, architectural photography, 8k",
      unsplashQuery: "modern financial district corporate skyscrapers",
    };
  }

  // 4. AI, Software & Engineering
  if (
    combined.includes("ai") ||
    combined.includes("genai") ||
    combined.includes("generative ai") ||
    combined.includes("machine learning") ||
    combined.includes("llm") ||
    combined.includes("automation")
  ) {
    return {
      prompt:
        "3D render illustration of modern tech professional working on laptop with floating glowing 3D holographic icons of AI brain, code brackets, gear analytics, glowing blue and cyan lighting, futuristic corporate tech office, 8k",
      unsplashQuery: "software engineer artificial intelligence programming",
    };
  }

  // 5. Jobs, Workforce, Talent & Reskilling
  if (
    combined.includes("workforce") ||
    combined.includes("talent") ||
    combined.includes("job") ||
    combined.includes("hiring") ||
    combined.includes("reskill") ||
    combined.includes("headcount") ||
    combined.includes("salary")
  ) {
    return {
      prompt:
        "3D render illustration of modern tech workforce collaboration in glass innovation hub, diverse engineers, floating 3D growth data charts, contemporary architectural style, 8k",
      unsplashQuery: "diverse tech team corporate meeting collaboration",
    };
  }

  // 6. Real Estate, Leasing & Office Campus
  if (
    combined.includes("leasing") ||
    combined.includes("real estate") ||
    combined.includes("office") ||
    combined.includes("space") ||
    combined.includes("sq ft") ||
    combined.includes("square feet")
  ) {
    return {
      prompt:
        "3D render illustration of grand modern glass corporate campus, landscaped commercial tech park in India, architectural 3D visualization, daylight, 8k",
      unsplashQuery: "modern corporate office campus glass architecture",
    };
  }

  // 7. Leadership & Executive CXO
  if (
    combined.includes("cxo") ||
    combined.includes("leader") ||
    combined.includes("ceo") ||
    combined.includes("appoint") ||
    combined.includes("director")
  ) {
    return {
      prompt:
        "3D render illustration of executive high-floor corporate boardroom in glass skyscraper, conference table, panoramic window view of modern metropolis, sleek corporate atmosphere, 8k",
      unsplashQuery: "executive corporate boardroom skyline view",
    };
  }

  // 8. Research, Data Reports & Ecosystem Studies
  if (
    combined.includes("nasscom") ||
    combined.includes("zinnov") ||
    combined.includes("report") ||
    combined.includes("survey") ||
    combined.includes("study") ||
    combined.includes("forecast") ||
    combined.includes("market size")
  ) {
    return {
      prompt:
        "3D render illustration of modern corporate data analytics and market research report, glowing holographic 3D bar charts, growth metrics, clean corporate glass background, 8k",
      unsplashQuery: "corporate data analytics charts dashboard technology",
    };
  }

  // Default
  return {
    prompt:
      "3D render illustration of modern multinational enterprise innovation hub in India, sleek glass facade, landscaped corporate park, bright daylight, architectural 3D visualization, 8k",
    unsplashQuery: "modern corporate technology park glass building",
  };
}

const CURATED_SAFETY_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80",
  "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1080&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1080&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080&q=80",
];

async function fetchCuratedSafetyBuffer(seed: number): Promise<Buffer | null> {
  try {
    const chosenUrl =
      CURATED_SAFETY_IMAGES[seed % CURATED_SAFETY_IMAGES.length];
    const res = await fetch(chosenUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function fetchUnsplashFallback(query: string): Promise<Buffer | null> {
  try {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photoUrl = data.results?.[0]?.urls?.regular;
    if (!photoUrl) return null;

    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return null;
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Unsplash fallback error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, source, h1, h2 } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // 1. Generate an intelligent prompt with Gemini analyzing the exact company and industry
    let promptText = "";
    let unsplashQuery = "";

    const smartPrompt = await generateSmartPromptWithGemini(
      title,
      summary || "",
    );
    if (smartPrompt) {
      promptText = smartPrompt.prompt;
      unsplashQuery = smartPrompt.unsplashQuery;
      console.log(`Gemini smart visual prompt: "${promptText}"`);
    } else {
      const fallback = buildTopicPrompt(title, summary || "");
      promptText = fallback.prompt;
      unsplashQuery = fallback.unsplashQuery;
    }

    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(promptText);

    let imageBuffer: Buffer | null = null;
    let engine = "pollinations-ai";

    // Tier 1: Try Pollinations AI (give 20s for generation)
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&seed=${seed}&nologo=true`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const aiRes = await fetch(pollinationsUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (aiRes.ok) {
        const arrayBuf = await aiRes.arrayBuffer();
        if (arrayBuf.byteLength > 5000) {
          imageBuffer = Buffer.from(arrayBuf);
        }
      } else {
        console.warn(
          `Pollinations returned ${aiRes.status}, switching to high-res fallback`,
        );
      }
    } catch (aiErr) {
      console.warn("Pollinations AI attempt timed out or failed:", aiErr);
    }

    // Tier 2: If AI generation was busy/offline, try Unsplash Search API
    if (!imageBuffer && process.env.UNSPLASH_ACCESS_KEY) {
      engine = "unsplash-search";
      console.log(
        `Using high-res curated fallback for query: "${unsplashQuery}"`,
      );
      imageBuffer = await fetchUnsplashFallback(unsplashQuery);
    }

    // Tier 3: Guaranteed safety net buffer from verified curated corporate library (requires 0 API keys)
    if (!imageBuffer) {
      engine = "curated-library";
      imageBuffer = await fetchCuratedSafetyBuffer(seed);
    }

    if (!imageBuffer) {
      throw new Error(
        "Could not generate visual at this moment. Please try again or use the Shuffle button.",
      );
    }

    // Persist permanently to Vercel Blob store with URL-safe ASCII slug
    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    const filename = `articles/${Date.now()}-${engine}-${safeSlug}.jpg`;

    const blob = await put(filename, imageBuffer, {
      access: "public",
      contentType: "image/jpeg",
    });

    // Build the final /api/og composite URL with the new background
    const host = req.headers.get("host") || "gcc-quest-web.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const ogParams = new URLSearchParams({
      bg: blob.url,
      title: title,
      source: source || "GCC Quest AI",
    });
    if (h1) ogParams.set("h1", h1);
    if (h2) ogParams.set("h2", h2);

    const compositeUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

    return NextResponse.json({
      url: compositeUrl,
      rawBlobUrl: blob.url,
      prompt: promptText,
      engine,
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
