import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Service role client — bypasses RLS for server-side inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, question } = await req.json();

    if (!userId || !sessionId || !question) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (question.trim().length < 5) {
      return NextResponse.json(
        { error: "Please ask a meaningful question." },
        { status: 400 }
      );
    }

    // Get session data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("study_sessions")
      .select("raw_notes, summary, flashcards, quiz")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    // Get chat history (last 5 messages for context)
    const { data: chatHistory } = await supabaseAdmin
      .from("chat_history")
      .select("role, message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationContext = (chatHistory || [])
      .reverse()
      .map((m: any) => `${m.role}: ${m.message}`)
      .join("\n");

    // Build context for AI
    const systemPrompt = `You are an expert study tutor for StudyForge. Your role is to answer ONLY questions related to the student's study materials provided below.

CRITICAL RULES:
1. You MUST ONLY answer questions that are directly related to the study material provided
2. If a question is off-topic or not related to the notes, politely decline and redirect them to ask about their study material
3. Use examples and concepts from their notes when explaining
4. Be encouraging and supportive
5. **Keep responses BRIEF**: Answer in 2-3 paragraphs maximum, around 100-200 words. Get straight to the point.
6. Use clear, concise language without unnecessary elaboration

Study Session Notes:
${session.raw_notes}

Summary Key Concepts:
${session.summary?.key_concepts?.join(", ") || "N/A"}

Previous Conversation Context:
${conversationContext || "(No previous messages)"}

Remember: Only help with questions about the provided study material. If a question is not related, respond with: "I can only help with questions about your study material. Please ask me about the notes you uploaded!"`;

    // First, check if question is relevant to the study material
    const relevanceCheck = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 50,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a relevance checker. You MUST respond with ONLY "RELEVANT" or "IRRELEVANT" (nothing else).
          
Study material summary: ${session.summary?.key_concepts?.join(", ") || session.raw_notes.substring(0, 200)}

Is this question related to the study material? Answer only with RELEVANT or IRRELEVANT.`,
        },
        { role: "user", content: question },
      ],
    });

    const relevanceResult =
      relevanceCheck.choices[0]?.message?.content?.trim().toUpperCase() || "IRRELEVANT";

    if (relevanceResult === "IRRELEVANT") {
      // Save user question to chat history
      await supabaseAdmin.from("chat_history").insert({
        user_id: userId,
        session_id: sessionId,
        role: "user",
        message: question,
      });

      const offTopicMessage = "I can only help with questions about your study material. Please ask me something related to your notes! 📚";

      // Save off-topic response
      await supabaseAdmin.from("chat_history").insert({
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        message: offTopicMessage,
      });

      return NextResponse.json({
        answer: offTopicMessage,
        isOffTopic: true,
      });
    }

    // If relevant, proceed with normal answer
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 400,
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "";

    // Save user question to chat history
    await supabaseAdmin.from("chat_history").insert({
      user_id: userId,
      session_id: sessionId,
      role: "user",
      message: question,
    });

    // Save assistant response to chat history
    const { data: assistantMsg, error: msgError } = await supabaseAdmin
      .from("chat_history")
      .insert({
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        message: answer,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Error saving chat:", msgError);
    }

    return NextResponse.json({
      answer,
      messageId: assistantMsg?.id,
    });
  } catch (err: any) {
    console.error("Ask AI error:", err);
    return NextResponse.json(
      { error: "Failed to process question. Please try again." },
      { status: 500 }
    );
  }
}
