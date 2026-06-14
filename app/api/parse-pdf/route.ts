import { NextRequest, NextResponse } from "next/server";
// pdf-parse works in Node.js runtime only
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

// Max PDF size: 20 MB
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF is too large. Maximum size is 20 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await pdfParse(buffer);

    const text = parsed.text?.trim();

    if (!text || text.length < 20) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this PDF. It may be scanned/image-based.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pages: parsed.numpages,
      filename: file.name,
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse PDF. Please try a different file." },
      { status: 500 }
    );
  }
}