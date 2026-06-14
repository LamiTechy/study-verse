# StudyForge

> **Paste notes → Get a summary, flashcards, and quiz → Saved forever.**

A full-stack Next.js 14 app that uses Claude AI to transform raw study notes into structured learning content, stored per-user in Supabase.

---

## Stack

| Layer      | Tech                                          |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 14 (App Router)                       |
| Styling    | Tailwind CSS                                  |
| Database   | Supabase (Postgres + Auth + RLS)              |
| AI         | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Deployment | Vercel                                        |

---

## Project Structure

```
ai-study-assistant/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts        ← AI generation + DB save
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← Auth gate + entry point
├── components/
│   ├── Dashboard.tsx           ← Main layout (sidebar + tabs)
│   ├── FlashcardDeck.tsx       ← Flip cards with progress tracking
│   └── QuizComponent.tsx       ← MCQ with instant feedback + results
├── lib/
│   └── supabase.ts             ← Supabase client + TypeScript types
├── schema.sql                  ← Run this in Supabase SQL Editor
├── .env.example
└── package.json
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd ai-study-assistant
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `schema.sql`
3. Go to **Authentication → Providers** and enable **Email**
4. Copy your **Project URL** and **anon key** from **Settings → API**

### 3. Get your Anthropic API key

1. Sign in at [console.anthropic.com](https://console.anthropic.com)
2. Create a new API key

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

1. **User signs up / signs in** via Supabase email auth
2. **Pastes notes** into the text area
3. **Frontend sends** `POST /api/generate` with `{ notes, userId }`
4. **API route** calls Claude with a strict JSON-schema system prompt
5. **Claude returns** a structured JSON object with `summary`, `flashcards`, and `quiz`
6. **API route saves** the result to `study_sessions` in Supabase
7. **Frontend renders** the session in a tabbed view:
   - **Summary** — bullet points + key concept tags
   - **Flashcards** — flip cards with "Got it" tracking and progress bar
   - **Quiz** — 5 MCQs with instant green/red feedback and score screen

---

## Database Schema

```sql
study_sessions (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES auth.users,
  title       text,           -- First 60 chars of notes
  raw_notes   text,
  summary     jsonb,          -- { bullets: string[], key_concepts: string[] }
  flashcards  jsonb,          -- [{ term, definition }]
  quiz        jsonb,          -- [{ question, options, answer, explanation }]
  created_at  timestamptz
)
```

RLS ensures users can only read/write their own rows.

---

## AI Prompt Design

The Anthropic API call uses a **strict JSON-only system prompt** that:

- Forbids markdown, preamble, or explanation in the response
- Enforces exact field names and structure
- Specifies counts: 5–8 summary bullets, 6–10 flashcards, exactly 5 quiz questions
- Requires quiz answers to be verbatim copies of one of the options (for exact matching)

---

## Deployment (Vercel)

```bash
npx vercel
```

Add the three environment variables in **Vercel Project → Settings → Environment Variables**.

> **Security note**: `ANTHROPIC_API_KEY` must be a **server-only** variable (no `NEXT_PUBLIC_` prefix). It is only used in the API route on the server.

---

## Extending the App

| Feature           | How                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------- |
| Google OAuth      | Enable in Supabase Auth → add `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Export to PDF     | Use `react-pdf` in a new `/api/export` route                                          |
| Spaced repetition | Add a `last_reviewed_at` + `difficulty` column to a new `flashcard_progress` table    |
| Share sessions    | Add a `public` boolean column + a public RLS policy                                   |
