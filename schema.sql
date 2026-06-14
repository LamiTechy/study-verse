-- ============================================================
-- StudyForge — Supabase Schema
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- study_sessions table
-- ============================================================
create table public.study_sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,                   -- Auto-generated short title (first ~60 chars of notes)
  raw_notes   text not null,
  summary     jsonb,                  -- { "bullets": string[], "key_concepts": string[] }
  flashcards  jsonb,                  -- [{ "term": string, "definition": string }]
  quiz        jsonb,                  -- [{ "question": string, "options": string[], "answer": string, "explanation": string }]
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries (ordered by newest first)
create index study_sessions_user_id_created_at_idx
  on public.study_sessions (user_id, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.study_sessions enable row level security;

-- Policy: users can SELECT only their own sessions
create policy "Users can view own study sessions"
  on public.study_sessions
  for select
  using (auth.uid() = user_id);

-- Policy: users can INSERT only their own sessions
create policy "Users can insert own study sessions"
  on public.study_sessions
  for insert
  with check (auth.uid() = user_id);

-- Policy: users can UPDATE only their own sessions
create policy "Users can update own study sessions"
  on public.study_sessions
  for update
  using (auth.uid() = user_id);

-- Policy: users can DELETE only their own sessions
create policy "Users can delete own study sessions"
  on public.study_sessions
  for delete
  using (auth.uid() = user_id);

-- ============================================================
-- quiz_attempts table — Tracks quiz results
-- ============================================================
create table public.quiz_attempts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid not null references public.study_sessions(id) on delete cascade,
  score           integer not null,              -- Score out of 100
  total_questions integer not null,              -- Total questions in quiz
  correct_answers integer not null,              -- Number of correct answers
  answers         jsonb,                         -- { question_index: "selected_option" }
  attempted_at    timestamptz not null default now()
);

-- Index for fast queries (user + session + date)
create index quiz_attempts_user_id_session_id_idx
  on public.quiz_attempts (user_id, session_id, attempted_at desc);

-- RLS for quiz_attempts
alter table public.quiz_attempts enable row level security;

create policy "Users can view own quiz attempts"
  on public.quiz_attempts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
  on public.quiz_attempts
  for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- chat_history table — Stores Q&A conversations
-- ============================================================
create table public.chat_history (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid not null references public.study_sessions(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')), -- "user" or "assistant"
  message         text not null,
  created_at      timestamptz not null default now()
);

-- Index for fast per-session queries
create index chat_history_session_id_created_at_idx
  on public.chat_history (session_id, created_at asc);

-- RLS for chat_history
alter table public.chat_history enable row level security;

create policy "Users can view own chat history"
  on public.chat_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat messages"
  on public.chat_history
  for insert
  
  with check (auth.uid() = user_id);
