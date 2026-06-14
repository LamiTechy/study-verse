import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { GenerateResult } from "@/lib/supabase";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Service role client — bypasses RLS for server-side inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `You are an expert study assistant. Given raw study notes, you MUST respond with ONLY a valid JSON object — no markdown, no preamble, no explanation. The JSON must follow this exact schema:

{
  "summary": {
    "bullets": ["string — detailed bullet explaining a key point with context", "..."],
    "key_concepts": ["string — important term or concept", "..."]
  },
  "flashcards": [
    { "term": "string", "definition": "string" }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A) ...",
      "explanation": "string — why this answer is correct"
    }
  ]
}

Rules:
- summary.bullets: 8–12 detailed bullet points covering the material. Each bullet should be 2–3 sentences explaining the concept with context and importance. Include your own insights and analytical observations beyond what's stated in the notes.
- summary.key_concepts: 12–20 important terms/concepts. Extract key terms from the notes AND add related concepts, implications, and expert insights that complement the content. Think deeply about what the student should understand.
- flashcards: 15–25 cards, each with a clear term and a detailed definition (2–4 sentences). Include context, examples, applications, and real-world connections. Add your own expert insights and "why this matters" context.
- quiz: 15–25 multiple-choice questions with 4 options each. "answer" must be the full text of one of the options (including the letter prefix). Include detailed explanations. Create questions that test understanding and critical thinking, not just memorization. Some questions should require connecting concepts.
- IMPORTANT: Go beyond extracting information. Add your own expert analysis, connections between concepts, practical implications, and insights that enhance learning.
- Output ONLY the JSON object. No code fences. No extra keys.`;

export async function POST(req: NextRequest) {
  console.log("GROQ KEY:", process.env.GROQ_API_KEY ? "found ✓" : "MISSING ✗");
  try {
    const { notes, userId } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide at least 20 characters of notes." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    // ---- Call Groq API ---------------------------------------------
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Here are my study notes:\n\n${notes.trim()}` },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

    // Strip accidental markdown fences if model misbehaves
    const jsonText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let generated: GenerateResult;
    try {
      generated = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse AI response:", rawText);
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    // ---- Basic validation ------------------------------------------
    if (!generated.summary || !generated.flashcards || !generated.quiz) {
      return NextResponse.json(
        { error: "AI response is missing required fields." },
        { status: 500 }
      );
    }

    // ---- Auto-generate a title from first ~60 chars of notes -------
    const title =
      notes.trim().slice(0, 60).replace(/\s+/g, " ").trim() +
      (notes.trim().length > 60 ? "…" : "");

    // ---- Save to Supabase ------------------------------------------
    const { data: session, error: dbError } = await supabaseAdmin
      .from("study_sessions")
      .insert({
        user_id: userId,
        title,
        raw_notes: notes.trim(),
        summary: generated.summary,
        flashcards: generated.flashcards,
        quiz: generated.quiz,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save session. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/generate:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}