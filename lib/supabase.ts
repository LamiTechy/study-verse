import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Types -------------------------------------------------------

export interface StudySession {
  id: string;
  user_id: string;
  title: string | null;
  raw_notes: string;
  summary: Summary | null;
  flashcards: Flashcard[] | null;
  quiz: QuizQuestion[] | null;
  created_at: string;
}

export interface Summary {
  bullets: string[];
  key_concepts: string[];
}

export interface Flashcard {
  term: string;
  definition: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;        // must be one of the options[]
  explanation: string;
}

export interface GenerateResult {
  summary: Summary;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  session_id: string;
  score: number;           // 0-100
  total_questions: number;
  correct_answers: number;
  answers: Record<number, string>; // { question_index: selected_option }
  attempted_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}
