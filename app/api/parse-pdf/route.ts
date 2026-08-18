import { NextRequest, NextResponse } from "next/server";
// pdf-parse works in Node.js runtime only
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

export const runtime = "nodejs";

// Max file size: 20 MB
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 20 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text: string;
    let pages: number | null = null;

    if (isPdf) {
      const parsed = await pdfParse(buffer);
      text = parsed.text?.trim() ?? "";
      pages = parsed.numpages;
    } else {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value.trim();
    }

    if (!text || text.length < 20) {
      return NextResponse.json(
        {
          error:
            isPdf
              ? "Could not extract readable text from this PDF. It may be scanned/image-based."
              : "Could not extract readable text from this DOCX.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text,
      pages,
      filename: file.name,
    });
  } catch (err) {
    console.error("File parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse file. Please try a different file." },
      { status: 500 }
    );
  }
}