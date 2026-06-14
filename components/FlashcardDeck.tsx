"use client";

import { useState, useCallback } from "react";
import { Flashcard } from "@/lib/supabase";
import { Spinner } from "@/components/SharedComponents";

interface Props { flashcards: Flashcard[]; }

export function FlashcardDeck({ flashcards }: Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"next"|"prev">("next");

  const card  = flashcards[idx];
  const total = flashcards.length;
  const isKnown = known.has(idx);
  const progress = Math.round((known.size / total) * 100);

  const navigate = useCallback((dir: "next"|"prev") => {
    const next = dir === "next" ? idx + 1 : idx - 1;
    if (next < 0 || next >= total) return;
    setDirection(dir);
    setTransitioning(true);
    setFlipped(false);
    setTimeout(() => { setIdx(next); setTransitioning(false); }, 160);
  }, [idx, total]);

  const markKnown = () => {
    setKnown(p => new Set([...p, idx]));
    navigate("next");
  };

  const reset = () => { setIdx(0); setFlipped(false); setKnown(new Set()); };

  if (!card) return null;
  const allDone = known.size === total;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Progress header */}
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
            <span style={{ fontSize:11, color:"var(--text-dim)" }}>{known.size} <span style={{ color:"var(--text-faint)" }}>of</span> {total} known</span>
            <span className="mono" style={{ fontSize:11, color:"var(--accent)", fontWeight:500 }}>{progress}%</span>
          </div>
          <div style={{ height:3, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg, var(--accent), var(--accent-hi))`, width:`${progress}%`, transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
        <button onClick={reset} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"var(--text-faint)", padding:"4px 8px", borderRadius:6, fontFamily:"Sora,sans-serif", transition:"color 0.12s" }}
          onMouseOver={e => e.currentTarget.style.color="var(--text-dim)"}
          onMouseOut={e => e.currentTarget.style.color="var(--text-faint)"}>
          Reset
        </button>
      </div>

      {/* Card counter */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <button onClick={() => navigate("prev")} disabled={idx===0}
          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-faint)", padding:4, transition:"color 0.12s" }}
          onMouseOver={e => e.currentTarget.style.color=idx===0?"var(--text-faint)":"var(--text-dim)"}
          onMouseOut={e => e.currentTarget.style.color="var(--text-faint)"}>
          <ChevLeft />
        </button>
        <span className="mono" style={{ fontSize:11, color:"var(--text-dim)", minWidth:60, textAlign:"center" }}>
          <strong style={{ color:"var(--text)", fontSize:14 }}>{idx + 1}</strong> / {total}
        </span>
        <button onClick={() => navigate("next")} disabled={idx===total-1}
          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-faint)", padding:4, transition:"color 0.12s" }}
          onMouseOver={e => e.currentTarget.style.color=idx===total-1?"var(--text-faint)":"var(--text-dim)"}
          onMouseOut={e => e.currentTarget.style.color="var(--text-faint)"}>
          <ChevRight />
        </button>
      </div>

      {/* Flip card */}
      <div
        onClick={() => !transitioning && setFlipped(f => !f)}
        style={{ perspective:"1400px", cursor:"pointer", userSelect:"none" }}>
        <div style={{
          position:"relative", width:"100%", minHeight:260,
          transformStyle:"preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition:"transform 0.55s cubic-bezier(0.4,0.2,0.2,1)",
          opacity: transitioning ? 0.4 : 1,
        }}>
          {/* Front face */}
          <div style={{
            position:"absolute", inset:0, backfaceVisibility:"hidden",
            background:"var(--bg-raised)", border:"1px solid var(--border)",
            borderRadius:"var(--radius-xl)", padding:"36px 32px",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            boxShadow:"var(--shadow-float)"
          }}>
            {isKnown && (
              <div style={{ position:"absolute", top:16, right:16 }}>
                <span className="badge badge-green">✓ Known</span>
              </div>
            )}
            <div style={{
              marginBottom:16, width:44, height:44, borderRadius:12,
              background:"var(--accent-dim)", border:"1px solid var(--accent-border)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, color:"var(--accent)"
            }}>⊞</div>
            <p className="serif" style={{ color:"var(--text)", fontSize:"clamp(18px,3vw,24px)", fontWeight:600, letterSpacing:"-0.025em", textAlign:"center", lineHeight:1.25 }}>
              {card.term}
            </p>
            <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:20, letterSpacing:"0.05em" }}>tap to reveal definition</p>
          </div>

          {/* Back face */}
          <div style={{
            position:"absolute", inset:0, backfaceVisibility:"hidden",
            transform:"rotateY(180deg)",
            background:"var(--bg-elevated)", border:"1px solid var(--accent-border)",
            borderRadius:"var(--radius-xl)", padding:"36px 32px",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            boxShadow:`0 8px 40px rgba(123,107,245,0.15), 0 0 0 1px rgba(255,255,255,0.03)`
          }}>
            <div style={{ marginBottom:14 }}>
              <span className="badge badge-accent">Definition</span>
            </div>
            <p style={{ color:"var(--text)", fontSize:15, lineHeight:1.8, textAlign:"center" }}>
              {card.definition}
            </p>
            <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:20, letterSpacing:"0.05em" }}>tap to flip back</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
        <button onClick={() => navigate("prev")} disabled={idx===0}
          style={{ display:"flex", alignItems:"center", gap:6 }}
          className="btn btn-ghost">
          <ChevLeft /> Prev
        </button>

        {flipped && !isKnown ? (
          <button onClick={markKnown} className="btn btn-success" style={{ padding:"10px 24px" }}>
            Got it <CheckIcon />
          </button>
        ) : (
          <button onClick={() => navigate("next")} disabled={idx===total-1}
            style={{ display:"flex", alignItems:"center", gap:6 }}
            className="btn btn-ghost">
            Next <ChevRight />
          </button>
        )}
      </div>

      {/* Dot nav */}
      <div style={{ display:"flex", justifyContent:"center", gap:5, flexWrap:"wrap", padding:"4px 0" }}>
        {flashcards.map((_,i) => (
          <button key={i} onClick={() => { setIdx(i); setFlipped(false); }}
            title={`Card ${i+1}`}
            style={{
              width: i===idx ? 22 : 6, height:6, borderRadius:3,
              border:"none", cursor:"pointer", padding:0, transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)",
              background: i===idx ? "var(--accent)" : known.has(i) ? "var(--green)" : "var(--border-mid)"
            }} />
        ))}
      </div>

      {/* Completion banner */}
      {allDone && (
        <div style={{
          background:"var(--green-dim)", border:"1px solid var(--green-border)",
          borderRadius:"var(--radius-lg)", padding:"24px 28px", textAlign:"center",
          animation:"bounceIn 0.4s cubic-bezier(0.4,0,0.2,1) both"
        }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🎉</div>
          <p style={{ color:"var(--green)", fontWeight:600, fontSize:15, marginBottom:4 }}>All cards reviewed!</p>
          <p style={{ color:"var(--text-dim)", fontSize:12, marginBottom:16 }}>You've gone through every flashcard in this set.</p>
          <button onClick={reset} className="btn btn-ghost" style={{ fontSize:12 }}>Review again</button>
        </div>
      )}
    </div>
  );
}

const ChevLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
