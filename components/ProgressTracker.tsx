"use client";

import { useEffect, useState } from "react";
import { supabase, QuizAttempt } from "@/lib/supabase";
import { Spinner } from "@/components/SharedComponents";

interface Props { sessionId: string; refreshTrigger?: number; }

export function ProgressTracker({ sessionId, refreshTrigger }: Props) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("quiz_attempts").select("*").eq("session_id", sessionId).order("attempted_at", { ascending:false });
      if (data) setAttempts(data as QuizAttempt[]);
      setLoading(false);
    })();
  }, [sessionId, refreshTrigger]);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:48 }}><Spinner size={20} /></div>;

  if (attempts.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"56px 24px" }}>
        <div style={{ width:52, height:52, borderRadius:16, background:"var(--bg-raised)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 16px" }}>▲</div>
        <p style={{ color:"var(--text-dim)", fontSize:13, fontWeight:500, marginBottom:4 }}>No quiz attempts yet</p>
        <p style={{ color:"var(--text-faint)", fontSize:12 }}>Complete the quiz to start tracking your progress</p>
      </div>
    );
  }

  const avgScore  = Math.round(attempts.reduce((s,a) => s+a.score, 0) / attempts.length);
  const highScore = Math.max(...attempts.map(a => a.score));
  const latest    = attempts[0];
  const trend     = attempts.length > 1 ? latest.score - attempts[1].score : 0;

  const scoreColor = (n: number) => n>=80 ? "var(--green)" : n>=50 ? "var(--yellow)" : "var(--red)";
  const scoreDim   = (n: number) => n>=80 ? "var(--green-dim)" : n>=50 ? "rgba(212,168,62,0.08)" : "var(--red-dim)";
  const scoreBorder= (n: number) => n>=80 ? "var(--green-border)" : n>=50 ? "rgba(212,168,62,0.25)" : "var(--red-border)";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.35s ease both" }}>
      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          { label:"Latest", value:`${latest.score}%`, color:scoreColor(latest.score), dim:scoreDim(latest.score), border:scoreBorder(latest.score), sub: trend!==0 ? `${trend>0?"+":""}${trend}% vs prev` : "First attempt" },
          { label:"Average", value:`${avgScore}%`, color:"var(--accent)", dim:"var(--accent-dim)", border:"var(--accent-border)", sub:`${attempts.length} attempt${attempts.length!==1?"s":""}` },
          { label:"Best", value:`${highScore}%`, color:"var(--green)", dim:"var(--green-dim)", border:"var(--green-border)", sub:"Personal record" },
        ].map(s => (
          <div key={s.label} style={{ padding:"18px 14px", background:s.dim, border:`1px solid ${s.border}`, borderRadius:"var(--radius-lg)", textAlign:"center" }}>
            <p style={{ fontSize:9, color:s.color, opacity:0.7, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, fontFamily:"JetBrains Mono,monospace" }}>{s.label}</p>
            <p className="serif" style={{ fontSize:28, fontWeight:600, color:s.color, lineHeight:1 }}>{s.value}</p>
            <p style={{ fontSize:9, color:s.color, opacity:0.6, marginTop:6, fontFamily:"JetBrains Mono,monospace" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Score timeline */}
      {attempts.length > 1 && (
        <div className="card" style={{ padding:22 }}>
          <p style={{ fontSize:11, color:"var(--text-dim)", fontWeight:600, marginBottom:16 }}>Score History</p>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:64 }}>
            {[...attempts].reverse().map((a,i) => (
              <div key={a.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span className="mono" style={{ fontSize:8, color:"var(--text-faint)" }}>{a.score}%</span>
                <div style={{
                  width:"100%", borderRadius:3,
                  height:`${Math.max(a.score/100*44, 4)}px`,
                  background: scoreColor(a.score), opacity: i===attempts.length-1 ? 1 : 0.5,
                  transition:"height 0.6s ease", animationDelay:`${i*50}ms`
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best score bar */}
      <div className="card" style={{ padding:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <p style={{ fontSize:11, color:"var(--text-dim)", fontWeight:600 }}>Personal Best</p>
          <span className="mono" style={{ fontSize:11, color:scoreColor(highScore), fontWeight:600 }}>{highScore}%</span>
        </div>
        <div style={{ height:4, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:4, width:`${highScore}%`, background:scoreColor(highScore), transition:"width 0.8s ease" }} />
        </div>
      </div>

      {/* Attempts log */}
      <div>
        <p className="mono" style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>All Attempts</p>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {attempts.map((a,i) => (
            <div key={a.id} className="card" style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", animation:`slideIn 0.2s ease both`, animationDelay:`${i*30}ms`, opacity:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span className="mono" style={{ fontSize:10, color:"var(--text-faint)", minWidth:22 }}>#{attempts.length-i}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{a.correct_answers}/{a.total_questions} correct</p>
                  <p className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginTop:2 }}>
                    {new Date(a.attempted_at).toLocaleDateString()} · {new Date(a.attempted_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </p>
                </div>
              </div>
              <div style={{ padding:"5px 12px", borderRadius:8, background:scoreDim(a.score), border:`1px solid ${scoreBorder(a.score)}` }}>
                <span className="serif" style={{ fontSize:17, fontWeight:600, color:scoreColor(a.score) }}>{a.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
