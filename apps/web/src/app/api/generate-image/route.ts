import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

function buildTopicPrompt(
  title: string,
  summary: string = "",
): { prompt: string; unsplashQuery: string } {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Retail tech & eCommerce (e.g. Walmart Global Tech, Target, Amazon GCCs)
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

  // 2. Bilateral relations & cross-border GCCs (German, US, UK, Japan)
  if (combined.includes("german") || combined.includes("germany")) {
    return {
      prompt:
        "3D render illustration of German flag and Indian flag standing outside futuristic corporate glass headquarters, modern enterprise campus, clean cinematic lighting, 8k",
      unsplashQuery: "germany india corporate business partnership",
    };
  }
  if (combined.includes("japan") || combined.includes("japanese")) {
    return {
      prompt:
        "3D render illustration of Japanese flag and Indian flag outside modern corporate tech park, sleek glass architecture, 8k",
      unsplashQuery: "japan corporate modern architecture business",
    };
  }
  if (
    combined.includes("united states") ||
    combined.includes("american") ||
    combined.includes(" u.s.") ||
    combined.includes(" us ")
  ) {
    return {
      prompt:
        "3D render illustration of American flag and Indian flag outside modern glass enterprise innovation hub, architectural 3D visualization, 8k",
      unsplashQuery: "international corporate headquarters glass office",
    };
  }
  if (
    combined.includes("united kingdom") ||
    combined.includes("british") ||
    combined.includes(" uk ")
  ) {
    return {
      prompt:
        "3D render illustration of British flag and Indian flag outside modern glass corporate campus, architectural photography, 8k",
      unsplashQuery: "modern corporate enterprise campus london global",
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

async function fetchUnsplashFallback(query: string): Promise<Buffer | null> {
  try {
    const key =
      process.env.UNSPLASH_ACCESS_KEY ||
      "2EhrtGI_tlU2O_slhqx7O7E-99fSygkruI2ldJePmu8";
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

    const { prompt: promptText, unsplashQuery } = buildTopicPrompt(
      title,
      summary || "",
    );
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(promptText);

    let imageBuffer: Buffer | null = null;
    let engine = "pollinations-ai";

    // Tier 1: Try Pollinations AI (without model=turbo to prevent 503)
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&seed=${seed}&nologo=true`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s fast timeout

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

    // Tier 2: If AI generation was busy/offline, gracefully fall back to Unsplash high-res search
    if (!imageBuffer) {
      engine = "curated-stock";
      console.log(
        `Using high-res curated fallback for query: "${unsplashQuery}"`,
      );
      imageBuffer = await fetchUnsplashFallback(unsplashQuery);
    }

    // Tier 3: Safety net fallback if external fetch failed
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
