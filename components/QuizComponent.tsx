"use client";

import { useState } from "react";
import { QuizQuestion } from "@/lib/supabase";
import { Spinner } from "@/app/page";

interface Props { questions: QuizQuestion[]; userId?: string; sessionId?: string; onQuizSubmitted?: () => void; }
type AnswerState = Record<number, { selected: string; correct: boolean }>;

export function QuizComponent({ questions, userId, sessionId, onQuizSubmitted }: Props) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const answered    = Object.keys(answers).length;
  const allAnswered = answered === questions.length;
  const score       = Object.values(answers).filter(a => a.correct).length;
  const pct         = Math.round((score / questions.length) * 100);

  function handleSelect(qi: number, option: string) {
    if (answers[qi]) return;
    setAnswers(p => ({ ...p, [qi]: { selected:option, correct:option===questions[qi].answer } }));
  }

  async function handleShowResults() {
    setShowResults(true);
    if (userId && sessionId) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/submit-quiz", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ userId, sessionId, questions, answers:Object.fromEntries(Object.entries(answers).map(([k,v])=>[k,v.selected])) }),
        });
        if (res.ok) {
          setSaved(true);
          onQuizSubmitted?.();
        }
      } catch {} finally { setSubmitting(false); }
    }
  }

  const scoreColor  = pct>=80 ? "var(--green)"  : pct>=50 ? "var(--yellow)"  : "var(--red)";
  const scoreDim    = pct>=80 ? "var(--green-dim)"  : pct>=50 ? "rgba(212,168,62,0.08)" : "var(--red-dim)";
  const scoreBorder = pct>=80 ? "var(--green-border)" : pct>=50 ? "rgba(212,168,62,0.25)" : "var(--red-border)";
  const scoreEmoji  = pct>=80 ? "🏆" : pct>=50 ? "📚" : "💪";
  const scoreMsg    = pct>=80 ? "Excellent work — you've mastered this!" : pct>=50 ? "Good effort — keep studying." : "Keep practising — you've got this.";

  if (showResults) {
    // SVG circle progress
    const R = 44, C = 2*Math.PI*R;
    const dashOffset = C - (pct/100)*C;

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease both" }}>
        {saved && (
          <div style={{ background:"var(--green-dim)", border:"1px solid var(--green-border)", borderRadius:"var(--radius)", padding:"10px 16px", display:"flex", alignItems:"center", gap:8, animation:"scaleIn 0.2s ease both" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
            <span style={{ color:"var(--green)", fontSize:12, fontWeight:500 }}>Score saved to your progress</span>
          </div>
        )}

        {/* Score card */}
        <div style={{ background:scoreDim, border:`1px solid ${scoreBorder}`, borderRadius:"var(--radius-xl)", padding:"32px 24px", textAlign:"center" }}>
          {/* Circular progress */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform:"rotate(-90deg)" }}>
              <circle cx="55" cy="55" r={R} fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle cx="55" cy="55" r={R} fill="none" stroke={scoreColor} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={dashOffset}
                style={{ transition:"stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }} />
            </svg>
            <div style={{ position:"absolute", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginTop:30 }}>
              <span style={{ fontSize:28, fontWeight:700, color:scoreColor, fontFamily:"Fraunces,serif", lineHeight:1 }}>{pct}</span>
              <span style={{ fontSize:12, color:scoreColor, opacity:0.7 }}>%</span>
            </div>
          </div>
          <p style={{ fontSize:16, fontWeight:600, color:"var(--text)", marginBottom:4 }}>{score} / {questions.length} correct</p>
          <p style={{ fontSize:12, color:scoreColor, marginBottom:20 }}>{scoreMsg}</p>
          <button onClick={() => { setAnswers({}); setShowResults(false); setSaved(false); }}
            style={{ display:"flex", alignItems:"center", gap:6 }} className="btn btn-ghost">
            Try again
          </button>
        </div>

        {/* Review */}
        <div>
          <p style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, fontFamily:"JetBrains Mono,monospace" }}>Review Answers</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {questions.map((q,qi) => <ReviewCard key={qi} question={q} index={qi} answer={answers[qi]} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Progress strip */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", background:"var(--bg-raised)", border:"1px solid var(--border)", borderRadius:"var(--radius)" }}>
        <span style={{ fontSize:11, color:"var(--text-dim)" }}>{answered}/{questions.length} answered</span>
        <div style={{ flex:1, height:2, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"var(--accent)", borderRadius:2, width:`${answered/questions.length*100}%`, transition:"width 0.4s ease" }} />
        </div>
        <span className="mono" style={{ fontSize:11, color:"var(--text-faint)" }}>{Math.round(answered/questions.length*100)}%</span>
      </div>

      {questions.map((q,qi) => (
        <QuestionCard key={qi} question={q} index={qi} answer={answers[qi]} onSelect={opt => handleSelect(qi,opt)} />
      ))}

      {allAnswered && (
        <button onClick={handleShowResults} disabled={submitting}
          className="btn btn-primary" style={{ width:"100%", padding:"14px 0", marginTop:4, fontSize:13 }}>
          {submitting ? <><Spinner size={14} color="#fff" /> Saving…</> : "See Results →"}
        </button>
      )}
    </div>
  );
}

function QuestionCard({ question, index, answer, onSelect }: {
  question:QuizQuestion; index:number;
  answer?:{selected:string;correct:boolean};
  onSelect:(opt:string)=>void;
}) {
  const revealed = !!answer;

  return (
    <div className="card" style={{ padding:"20px 22px", animation:`fadeUp 0.3s ease both`, animationDelay:`${index*40}ms`, opacity:0 }}>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <span className="mono" style={{
          flexShrink:0, width:26, height:26, borderRadius:8,
          background:"var(--bg-hover)", border:"1px solid var(--border-mid)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:600, color:revealed ? (answer?.correct ? "var(--green)" : "var(--red)") : "var(--text-dim)"
        }}>
          {revealed ? (answer?.correct ? "✓" : "✗") : index + 1}
        </span>
        <p style={{ fontSize:13, lineHeight:1.7, fontWeight:500, color:"var(--text)", margin:0 }}>
          {question.question}
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:7, paddingLeft:38 }}>
        {question.options.map(opt => {
          const isSelected = answer?.selected === opt;
          const isCorrect  = opt === question.answer;
          let bg="transparent", border="var(--border)", color="var(--text-dim)";
          if (revealed) {
            if (isCorrect)            { bg="var(--green-dim)";  border="var(--green-border)"; color="var(--green)"; }
            else if (isSelected)      { bg="var(--red-dim)";    border="var(--red-border)";   color="var(--red)"; }
            else                      { color="var(--text-faint)"; }
          }
          return (
            <button key={opt} onClick={() => onSelect(opt)} disabled={revealed}
              style={{
                width:"100%", textAlign:"left", padding:"11px 16px",
                borderRadius:"var(--radius)", border:`1px solid ${border}`, background:bg,
                color, fontSize:12, lineHeight:1.5, cursor:revealed?"default":"pointer",
                fontFamily:"Sora,sans-serif", transition:"all 0.12s",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:8
              }}
              onMouseOver={e => { if(!revealed) { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--text)"; } }}
              onMouseOut={e => { if(!revealed) { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-dim)"; } }}>
              <span>{opt}</span>
              {revealed && isCorrect  && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>}
              {revealed && isSelected && !isCorrect && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            </button>
          );
        })}
      </div>

      {answer && !answer.correct && (
        <div style={{ marginTop:12, marginLeft:38, background:"rgba(212,168,62,0.07)", border:"1px solid rgba(212,168,62,0.2)", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", animation:"scaleIn 0.2s ease both" }}>
          <span style={{ fontSize:12, flexShrink:0 }}>💡</span>
          <p style={{ fontSize:11, lineHeight:1.7, color:"rgba(212,168,62,0.85)", margin:0 }}>{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ question, index, answer }: {
  question:QuizQuestion; index:number; answer?:{selected:string;correct:boolean};
}) {
  if (!answer) return null;
  return (
    <div style={{ borderRadius:"var(--radius)", border:`1px solid ${answer.correct ? "var(--green-border)" : "var(--red-border)"}`, background:answer.correct ? "var(--green-dim)" : "var(--red-dim)", padding:"14px 16px" }}>
      <p style={{ fontSize:12, fontWeight:500, color:"var(--text)", marginBottom:8 }}>
        <span className="mono" style={{ color:"var(--text-faint)", marginRight:8 }}>Q{index+1}.</span>
        {question.question}
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:11 }}>
        {!answer.correct && <p style={{ color:"var(--red)" }}>Your answer: <strong>{answer.selected}</strong></p>}
        <p style={{ color:"var(--green)" }}>Correct: <strong>{question.answer}</strong></p>
        <p style={{ color:"var(--text-dim)", marginTop:4, lineHeight:1.65 }}>{question.explanation}</p>
      </div>
    </div>
  );
}
