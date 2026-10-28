import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate: images only
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 5MB" },
        { status: 400 },
      );
    }

    // Sanitize filename to pure URL-safe ASCII (strip quotes, curly apostrophes, spaces, special chars)
    // This prevents character encoding corruptions (e.g. mojibake %C2%80%99) across Make.com & LinkedIn
    const mimeExtMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext =
      mimeExtMap[file.type] ||
      file.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "") ||
      "png";

    const cleanBase = file.name
      .replace(/\.[^/.]+$/, "") // strip extension
      .normalize("NFKD") // normalize unicode accents
      .replace(/[^\w\s-]/g, "") // remove special chars/quotes like ’ " '
      .trim()
      .replace(/[\s_]+/g, "-") // convert spaces to single hyphen
      .slice(0, 50);

    const safeFilename = cleanBase ? `${cleanBase}.${ext}` : `image.${ext}`;

    const blob = await put(`articles/${Date.now()}-${safeFilename}`, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
