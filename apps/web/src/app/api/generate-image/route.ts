import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

function buildTopicPrompt(title: string, summary: string = ""): string {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Retail tech & eCommerce (e.g. Walmart Global Tech, Target, Amazon GCCs)
  if (
    combined.includes("retail") ||
    combined.includes("walmart") ||
    combined.includes("commerce") ||
    combined.includes("supply chain") ||
    combined.includes("fulfillment")
  ) {
    return "3D render illustration of modern retail technology innovation hub, automated fulfillment systems, holographic AI logistics analytics, high-tech corporate campus, vibrant blue and cyan lighting, 8k";
  }

  // 2. Bilateral relations & cross-border GCCs (German, US, UK, Japan)
  if (combined.includes("german") || combined.includes("germany")) {
    return "3D render illustration of German flag and Indian flag standing outside futuristic corporate glass headquarters, modern enterprise campus, clean cinematic lighting, 8k";
  }
  if (combined.includes("japan") || combined.includes("japanese")) {
    return "3D render illustration of Japanese flag and Indian flag outside modern corporate tech park, sleek glass architecture, 8k";
  }
  if (
    combined.includes("united states") ||
    combined.includes("american") ||
    combined.includes(" u.s.") ||
    combined.includes(" us ")
  ) {
    return "3D render illustration of American flag and Indian flag outside modern glass enterprise innovation hub, architectural 3D visualization, 8k";
  }
  if (
    combined.includes("united kingdom") ||
    combined.includes("british") ||
    combined.includes(" uk ")
  ) {
    return "3D render illustration of British flag and Indian flag outside modern glass corporate campus, architectural photography, 8k";
  }

  // 3. City-specific trajectory & leasing
  if (
    combined.includes("hyderabad") ||
    combined.includes("cyberabad") ||
    combined.includes("hitec")
  ) {
    return "3D render illustration of Hyderabad city skyline with a bold glowing cyan 3D growth arrow arching upwards over corporate glass towers, modern enterprise campus, clean lighting, 8k";
  }
  if (combined.includes("bengaluru") || combined.includes("bangalore")) {
    return "3D render illustration of futuristic Bengaluru cyber tech corridor, illuminated glass skyscrapers with glowing upward cyan trajectory line, dusk corporate atmosphere, 8k";
  }
  if (
    combined.includes("pune") ||
    combined.includes("chennai") ||
    combined.includes("mumbai") ||
    combined.includes("noida") ||
    combined.includes("gurugram") ||
    combined.includes("gurgaon")
  ) {
    return "3D render illustration of modern Indian financial cyber district with modern glass towers and glowing upward commercial growth arrow, architectural photography, 8k";
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
    return "3D render illustration of modern tech professional working on laptop with floating glowing 3D holographic icons of AI brain, code brackets, gear analytics, glowing blue and cyan lighting, futuristic corporate tech office, 8k";
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
    return "3D render illustration of modern tech workforce collaboration in glass innovation hub, diverse engineers, floating 3D growth data charts, contemporary architectural style, 8k";
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
    return "3D render illustration of grand modern glass corporate campus, landscaped commercial tech park in India, architectural 3D visualization, daylight, 8k";
  }

  // 7. Leadership & Executive CXO
  if (
    combined.includes("cxo") ||
    combined.includes("leader") ||
    combined.includes("ceo") ||
    combined.includes("appoint") ||
    combined.includes("director")
  ) {
    return "3D render illustration of executive high-floor corporate boardroom in glass skyscraper, conference table, panoramic window view of modern metropolis, sleek corporate atmosphere, 8k";
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
    return "3D render illustration of modern corporate data analytics and market research report, glowing holographic 3D bar charts, growth metrics, clean corporate glass background, 8k";
  }

  // Default
  return "3D render illustration of modern multinational enterprise innovation hub in India, sleek glass facade, landscaped corporate park, bright daylight, architectural 3D visualization, 8k";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, source, h1, h2 } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const promptText = buildTopicPrompt(title, summary || "");
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(promptText);

    // Call Pollinations free AI generation (turbo model for fast ~8s turnaround)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&model=turbo&seed=${seed}&nologo=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000); // 22s safety timeout

    const aiRes = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!aiRes.ok) {
      throw new Error(`AI generation returned status ${aiRes.status}`);
    }

    const arrayBuffer = await aiRes.arrayBuffer();
    if (arrayBuffer.byteLength < 5000) {
      throw new Error("Generated image file is too small or invalid");
    }

    // Persist permanently to Vercel Blob store
    const safeSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    const filename = `articles/${Date.now()}-ai-${safeSlug}.jpg`;

    const blob = await put(filename, Buffer.from(arrayBuffer), {
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
    });
  } catch (error: unknown) {
    console.error("AI image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate AI image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
