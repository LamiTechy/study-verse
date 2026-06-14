import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS for server-side inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, questions, answers } = await req.json();

    if (!userId || !sessionId || !questions || !answers) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Calculate score
    let correctCount = 0;
    questions.forEach((q: any, index: number) => {
      if (
        answers[index] &&
        answers[index].toLowerCase() === q.answer.toLowerCase()
      ) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Save quiz attempt
    const { data, error } = await supabaseAdmin
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        session_id: sessionId,
        score,
        total_questions: questions.length,
        correct_answers: correctCount,
        answers: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [parseInt(k), v])
        ),
      })
      .select()
      .single();

    if (error) {
      console.error("Quiz submission error:", error);
      return NextResponse.json(
        { error: "Failed to save quiz attempt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempt: data,
      score,
      correctCount,
      total: questions.length,
    });
  } catch (err: any) {
    console.error("Submit quiz error:", err);
    return NextResponse.json(
      { error: "Failed to process quiz submission." },
      { status: 500 }
    );
  }
}
