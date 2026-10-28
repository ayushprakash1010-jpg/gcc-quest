import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    // Decode and fetch the target image safely on the server
    const decodedUrl = decodeURIComponent(targetUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "GCC-Quest-Image-Proxy/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch image: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": imageBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    console.error("Proxy image error:", error);
    const message = error instanceof Error ? error.message : "Proxy error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
