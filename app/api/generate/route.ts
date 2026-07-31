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

// ~2500 tokens of input per chunk — keeps us under Groq's 12k TPM free-tier limit
const MAX_CHARS_PER_CHUNK = 10000;
const MAX_RETRIES = 4;

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

// Per-section prompt: tells the model this is one slice of a larger document
function sectionPrompt(part: number, total: number): string {
  return `You are an expert study assistant. These are study notes from section ${part} of ${total} of a document. You MUST respond with ONLY a valid JSON object — no markdown, no preamble, no explanation. The JSON must follow this exact schema:

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

Rules for this section:
- summary.bullets: 3–6 detailed bullets covering the material in THIS section. Each bullet should be 2–3 sentences with context and importance. Add your own insights and analytical observations.
- summary.key_concepts: 4–8 important terms/concepts from THIS section. Extract key terms AND add related concepts, implications, and expert insights.
- flashcards: 5–10 cards, each with a clear term and a detailed definition (2–4 sentences) with context, examples, and real-world connections.
- quiz: 5–10 multiple-choice questions with 4 options each. "answer" must be the full text of one of the options (including the letter prefix). Include detailed explanations.
- Output ONLY the JSON object. No code fences. No extra keys.`;
}

// Split notes into chunks on paragraph boundaries
function chunkNotes(text: string, maxChars = MAX_CHARS_PER_CHUNK): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = para;
      while (current.length > maxChars) {
        chunks.push(current.slice(0, maxChars));
        current = current.slice(maxChars);
      }
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Call Groq with retry/backoff on rate-limit errors (429 / 413)
async function callGroqWithRetry(
  systemPrompt: string,
  userContent: string,
  attempt = 0
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (e: any) {
    const status = e?.status;
    if ((status === 429 || status === 413) && attempt < MAX_RETRIES) {
      const retryAfter = e?.headers?.["retry-after"]
        ? Number(e.headers["retry-after"])
        : 20;
      const waitMs = Math.max(retryAfter, 10) * 1000;
      console.warn(
        `Groq rate limit (${status}), retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await new Promise((r) => setTimeout(r, waitMs));
      return callGroqWithRetry(systemPrompt, userContent, attempt + 1);
    }
    throw e;
  }
}

function parseJson(rawText: string): GenerateResult {
  const jsonText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(jsonText);
}

// Round-robin merge so every chunk is represented in the final output
function interleave<T>(arrays: T[][], max: number): T[] {
  const result: T[] = [];
  let i = 0;
  while (result.length < max) {
    let added = false;
    for (const arr of arrays) {
      if (i < arr.length) {
        result.push(arr[i]);
        added = true;
        if (result.length >= max) break;
      }
    }
    if (!added) break;
    i++;
  }
  return result;
}

function mergeResults(results: GenerateResult[]): GenerateResult {
  if (results.length === 1) return results[0];
  return {
    summary: {
      bullets: interleave(results.map((r) => r.summary?.bullets ?? []), 12),
      key_concepts: interleave(
        results.map((r) => r.summary?.key_concepts ?? []),
        20
      ),
    },
    flashcards: interleave(results.map((r) => r.flashcards ?? []), 25),
    quiz: interleave(results.map((r) => r.quiz ?? []), 25),
  };
}

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

    // ---- Split large docs into chunks, process sequentially to respect TPM
    const chunks = chunkNotes(notes.trim());
    const results: GenerateResult[] = [];

    if (chunks.length === 1) {
      const rawText = await callGroqWithRetry(SYSTEM_PROMPT, `Here are my study notes:\n\n${chunks[0]}`);
      try {
        results.push(parseJson(rawText));
      } catch {
        console.error("Failed to parse AI response:", rawText);
        return NextResponse.json(
          { error: "AI returned an unexpected format. Please try again." },
          { status: 500 }
        );
      }
    } else {
      for (let i = 0; i < chunks.length; i++) {
        const rawText = await callGroqWithRetry(
          sectionPrompt(i + 1, chunks.length),
          `Here is section ${i + 1} of ${chunks.length} of my study notes:\n\n${chunks[i]}`
        );
        try {
          results.push(parseJson(rawText));
        } catch {
          console.error("Failed to parse AI response for section", i + 1, ":", rawText);
          return NextResponse.json(
            { error: `AI returned an unexpected format for section ${i + 1}. Please try again.` },
            { status: 500 }
          );
        }
      }
    }

    const generated = mergeResults(results);

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
  } catch (err: any) {
    if (err?.status === 429 || err?.status === 413) {
      console.error("Groq rate limit exceeded:", err);
      return NextResponse.json(
        { error: "Rate limit reached. This can happen with very large documents — please try again in a minute." },
        { status: 429 }
      );
    }
    console.error("Unexpected error in /api/generate:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
