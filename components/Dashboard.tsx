"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, StudySession } from "@/lib/supabase";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { QuizComponent } from "@/components/QuizComponent";
import { ProgressTracker } from "@/components/ProgressTracker";
import { ChatComponent } from "@/components/ChatComponent";
import { LogoMark, Spinner } from "@/components/SharedComponents";

// Mobile sidebar styles
const mobileStyles = `
  @media (max-width: 768px) {
    [data-sidebar] {
      position: fixed !important;
      left: 0;
      top: 48px;
      height: calc(100vh - 48px);
      z-index: 40;
      border-right: 1px solid var(--border);
    }
    [data-sidebar-backdrop] {
      display: block !important;
    }
    [data-topbar] {
      backdrop-filter: none !important;
      background: var(--bg-raised) !important;
    }
  }
`;

interface Props { user: User; }
type Tab = "summary"|"flashcards"|"quiz"|"progress"|"chat";

export function Dashboard({ user }: Props) {
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [collapsed, setCollapsed] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    const { data } = await supabase
      .from("study_sessions")
      .select("id, user_id, title, raw_notes, summary, flashcards, quiz, created_at")
      .eq("user_id", user.id).order("created_at", { ascending:false }).limit(40);
    if (data) setSessions(data as StudySession[]);
    setSessionsLoading(false);
  }, [user.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function handleGenerate() {
    if (notes.trim().length < 20) { setError("Please paste at least 20 characters."); return; }
    setError(""); setGenerating(true);
    try {
      const res = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ notes, userId:user.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      const s = json.session as StudySession;
      setSessions(p => [s, ...p]);
      setActiveSession(s); setActiveTab("summary"); setNotes("");
    } catch (e: any) { setError(e.message); } finally { setGenerating(false); }
  }

  async function handleDeleteSession(id: string) {
    await supabase.from("study_sessions").delete().eq("id", id);
    setSessions(p => p.filter(s => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  }

  return (
    <div style={{ height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", background:"var(--bg)" }}>
      <style>{mobileStyles}</style>
      {/* Topbar */}
      <header data-topbar style={{
        height:48, borderBottom:"1px solid var(--border)",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px", flexShrink:0, background:"var(--bg-raised)", zIndex:40,
        backdropFilter:"blur(16px)"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setCollapsed(c => !c)}
            className="btn-icon" style={{ color:"var(--text-dim)" }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <CollapseIcon collapsed={collapsed} />
          </button>
          <LogoMark size={22} />
          <span className="serif" style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.02em", color:"var(--text)" }}>StudyForge</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {activeSession && (
            <div className="badge badge-accent" style={{ fontSize:9 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", animation:"pulse 2s infinite" }} />
              Active session
            </div>
          )}
          <span className="mono" style={{ fontSize:10, color:"var(--text-faint)" }}>{user.email?.split("@")[0]}</span>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost" style={{ padding:"5px 12px", fontSize:11 }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
        {/* Mobile backdrop overlay */}
        <div 
          data-sidebar-backdrop
          onClick={() => setCollapsed(true)}
          style={{
            display:"none",
            position:"fixed", top:48, right:0, bottom:0, left:0, background:"rgba(0,0,0,0.5)", 
            zIndex:39, pointerEvents: collapsed ? "none" : "auto"
          }}
        />
        
        {/* Sidebar */}
        <aside 
          data-sidebar
          style={{
            width: collapsed ? 0 : 252,
            minWidth: collapsed ? 0 : 252,
            background:"var(--bg-raised)", borderRight:"1px solid var(--border)",
            display:"flex", flexDirection:"column", overflow:"hidden",
            transition:"width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)"
          }}
        >
          <div style={{ padding:"12px 10px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            <button onClick={() => { setActiveSession(null); setNotes(""); }}
              className="btn btn-primary" style={{ width:"100%", padding:"10px 0", fontSize:12 }}>
              <PlusIcon /> New Session
            </button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"8px 6px" }}>
            <div style={{ padding:"4px 6px 8px" }}>
              <span className="mono" style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                Sessions
              </span>
            </div>
            {sessionsLoading ? (
              <div style={{ display:"flex", justifyContent:"center", padding:20 }}>
                <Spinner size={16} />
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign:"center", padding:"24px 12px" }}>
                <p style={{ fontSize:11, color:"var(--text-faint)", lineHeight:1.6 }}>No sessions yet.<br/>Create one to get started.</p>
              </div>
            ) : (
              sessions.map((s, i) => (
                <SidebarItem key={s.id} session={s} index={i}
                  active={activeSession?.id === s.id}
                  onSelect={() => { setActiveSession(s); setActiveTab("summary"); setCollapsed(true); }}
                  onDelete={() => handleDeleteSession(s.id)} />
              ))
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex:1, overflow:"hidden", minWidth:0, width:"100%" }}>
          <div style={{ width:"100%", height:"100%", overflowY:"auto", overflowX:"hidden", paddingRight:"8px" }}>
            {!activeSession
              ? <NoteInputPanel notes={notes} setNotes={setNotes} onGenerate={handleGenerate} generating={generating} error={error} />
              : <SessionView session={activeSession} activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
            }
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Sidebar Item ─────────────────────────────────────────────────── */
function SidebarItem({ session, active, onSelect, onDelete, index }: {
  session:StudySession; active:boolean; onSelect:()=>void; onDelete:()=>void; index:number;
}) {
  const [hover, setHover] = useState(false);
  const date = new Date(session.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short" });
  const flashCount = session.flashcards?.length ?? 0;
  const quizCount  = session.quiz?.length ?? 0;

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{
        display:"flex", alignItems:"flex-start", gap:9, padding:"9px 8px",
        borderRadius:10, cursor:"pointer", marginBottom:2,
        background: active ? "var(--accent-dim)" : hover ? "var(--bg-hover)" : "transparent",
        border:`1px solid ${active ? "var(--accent-border)" : "transparent"}`,
        transition:"all 0.12s ease",
        animation:`slideIn 0.2s ease both`, animationDelay:`${Math.min(index * 25, 300)}ms`
      }}>
      <div style={{ marginTop:3, width:6, height:6, borderRadius:"50%", flexShrink:0,
        background: active ? "var(--accent)" : "var(--border-hi)",
        boxShadow: active ? `0 0 8px var(--accent)` : "none",
        transition:"all 0.15s"
      }} />
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:500, color: active ? "var(--accent-hi)" : "var(--text)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", transition:"color 0.12s" }}>
          {session.title || "Untitled session"}
        </p>
        <div style={{ display:"flex", gap:8, marginTop:3 }}>
          <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>{date}</span>
          {flashCount > 0 && <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>{flashCount} cards</span>}
          {quizCount > 0  && <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>{quizCount}q quiz</span>}
        </div>
      </div>
      {hover && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:"var(--text-faint)", borderRadius:5, transition:"color 0.1s", flexShrink:0, animation:"fadeIn 0.1s ease" }}
          onMouseOver={e => e.currentTarget.style.color="var(--red)"}
          onMouseOut={e => e.currentTarget.style.color="var(--text-faint)"}>
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

/* ── Note Input Panel ─────────────────────────────────────────────── */
function NoteInputPanel({ notes, setNotes, onGenerate, generating, error }: {
  notes:string; setNotes:(v:string)=>void; onGenerate:()=>void; generating:boolean; error:string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfMeta, setPdfMeta] = useState<{filename:string; pages:number}|null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const chars = notes.length;
  const ready = chars >= 20 && !generating && !pdfLoading;

  async function handlePdf(file: File) {
    if (file.type !== "application/pdf") { setPdfError("Only PDF files are supported."); return; }
    setPdfError(""); setPdfMeta(null); setPdfLoading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/parse-pdf", { method:"POST", body:form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "PDF parsing failed.");
      setNotes(json.text); setPdfMeta({ filename:file.name, pages:json.pages });
    } catch(e:any) { setPdfError(e.message); } finally { setPdfLoading(false); }
  }

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"clamp(20px, 5vw, 56px) clamp(16px, 5vw, 28px)", animation:"fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both" }}>
      {/* Hero */}
      <div style={{ marginBottom:44 }}>
        <div style={{ marginBottom:14 }}>
          <span className="badge badge-accent">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--accent)" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/></svg>
            AI-Powered Learning
          </span>
        </div>
        <h1 className="serif" style={{ fontSize:"clamp(30px,5vw,46px)", fontWeight:600, color:"var(--text)", letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:14 }}>
          Turn notes into<br />
          <em style={{ color:"var(--accent)", fontStyle:"italic" }}>mastery</em>
        </h1>
        <p style={{ color:"var(--text-dim)", fontSize:14, lineHeight:1.75, maxWidth:460 }}>
          Paste your notes or drop a PDF. Get a structured summary, spaced-repetition flashcards, and a scored quiz — instantly.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:10, marginBottom:36, flexWrap:"wrap" }}>
        {[["◈","Summary","Structured key points"],["⊞","Flashcards","Spaced repetition"],["◉","Quiz","Scored assessment"],["⌁","AI Tutor","Ask anything"]].map(([icon,label,desc]) => (
          <div key={label} style={{
            flex:"1 1 130px", padding:"14px 16px", background:"var(--bg-raised)",
            border:"1px solid var(--border)", borderRadius:"var(--radius-lg)",
            transition:"border-color 0.15s"
          }}
            onMouseOver={e => e.currentTarget.style.borderColor="var(--border-mid)"}
            onMouseOut={e => e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{ fontSize:16, color:"var(--accent)", marginBottom:6 }}>{icon}</div>
            <p style={{ fontSize:12, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{label}</p>
            <p style={{ fontSize:10, color:"var(--text-faint)" }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* PDF zone */}
      {pdfMeta ? (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"var(--green-dim)", border:"1px solid var(--green-border)",
          borderRadius:"var(--radius)", padding:"12px 16px", marginBottom:12,
          animation:"scaleIn 0.2s ease both"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"rgba(45,197,122,0.15)", border:"1px solid var(--green-border)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <PdfIcon />
            </div>
            <div>
              <p style={{ color:"var(--green)", fontSize:12, fontWeight:600 }}>{pdfMeta.filename}</p>
              <p className="mono" style={{ color:"var(--text-dim)", fontSize:10, marginTop:2 }}>
                {pdfMeta.pages} page{pdfMeta.pages!==1?"s":""} · {words.toLocaleString()} words extracted
              </p>
            </div>
          </div>
          <button onClick={() => { setNotes(""); setPdfMeta(null); setPdfError(""); }} className="btn-icon" style={{ color:"var(--text-dim)" }}
            onMouseOver={e => e.currentTarget.style.color="var(--red)"}
            onMouseOut={e => e.currentTarget.style.color="var(--text-dim)"}>
            <TrashIcon />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) handlePdf(f); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border:`1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-mid)"}`,
            borderRadius:"var(--radius-lg)", padding:"20px 24px",
            display:"flex", alignItems:"center", gap:14, cursor:"pointer",
            background: dragOver ? "var(--accent-dim)" : "transparent",
            marginBottom:12, transition:"all 0.15s",
            userSelect:"none"
          }}>
          {pdfLoading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, color:"var(--text-dim)", fontSize:13, width:"100%" }}>
              <Spinner /> Extracting text from PDF…
            </div>
          ) : (
            <>
              <div style={{ width:38, height:38, borderRadius:10, background:"var(--bg-elevated)", border:"1px solid var(--border-mid)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <PdfIcon size={16} />
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:500, color: dragOver ? "var(--accent-hi)" : "var(--text)" }}>
                  {dragOver ? "Drop to upload" : "Drop a PDF here, or click to upload"}
                </p>
                <p style={{ fontSize:11, color:"var(--text-faint)", marginTop:3 }}>Text-based PDFs only · max 20 MB</p>
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) handlePdf(f); e.target.value=""; }} />
        </div>
      )}

      {pdfError && (
        <div style={{ marginBottom:10, background:"var(--red-dim)", border:"1px solid var(--red-border)", borderRadius:"var(--radius)", padding:"9px 14px", fontSize:12, color:"var(--red)" }}>
          ⚠ {pdfError}
        </div>
      )}

      {/* Divider */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div className="divider" />
        <span className="mono" style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>or paste notes</span>
        <div className="divider" />
      </div>

      {/* Textarea */}
      <div style={{
        background:"var(--bg-raised)", border:`1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        borderRadius:"var(--radius-xl)", overflow:"hidden",
        boxShadow: focused ? "0 0 0 3px rgba(123,107,245,0.1)" : "var(--shadow-card)",
        transition:"border-color 0.15s, box-shadow 0.15s"
      }}>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); if(pdfMeta) setPdfMeta(null); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Paste lecture notes, textbook excerpts, research papers…&#10;&#10;The more context you provide, the better your study set will be."
          style={{
            width:"100%", background:"transparent", color:"var(--text)",
            fontSize:13, lineHeight:1.8, padding:"20px 22px",
            resize:"none", border:"none", outline:"none", minHeight:220, maxHeight:"400px",
            fontFamily:"Sora,sans-serif", boxSizing:"border-box"
          }}
        />
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 18px", borderTop:"1px solid var(--border)"
        }}>
          <div style={{ display:"flex", gap:16 }}>
            <span className="mono" style={{ fontSize:10, color:"var(--text-faint)" }}>
              {words > 0 ? `${words.toLocaleString()} words` : "0 words"}
            </span>
            {chars >= 20 && (
              <span className="mono" style={{ fontSize:10, color:"var(--green)", animation:"fadeIn 0.2s ease" }}>
                ✓ Ready
              </span>
            )}
          </div>
          <button onClick={onGenerate} disabled={!ready} className="btn btn-primary" style={{ padding:"9px 22px", fontSize:12 }}>
            {generating
              ? <><Spinner size={13} color="#fff" /> Generating…</>
              : <><SparkIcon /> Generate Study Set</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop:12, background:"var(--red-dim)", border:"1px solid var(--red-border)", borderRadius:"var(--radius-lg)", padding:"12px 16px", fontSize:13, color:"var(--red)", display:"flex", gap:8, alignItems:"center", animation:"scaleIn 0.2s ease both" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
    </div>
  );
}

/* ── Session View ─────────────────────────────────────────────────── */
function SessionView({ session, activeTab, setActiveTab, user }: {
  session:StudySession; activeTab:Tab; setActiveTab:(t:Tab)=>void; user:User;
}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const tabs: { id:Tab; label:string; count?:number; icon:string }[] = [
    { id:"summary",    label:"Summary",    icon:"◈" },
    { id:"flashcards", label:"Flashcards", icon:"⊞", count:session.flashcards?.length },
    { id:"quiz",       label:"Quiz",       icon:"◉", count:session.quiz?.length },
    { id:"progress",   label:"Progress",   icon:"▲" },
    { id:"chat",       label:"Ask AI",     icon:"⌁" },
  ];

  const date = new Date(session.created_at).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const handleQuizSubmitted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{ maxWidth:740, margin:"0 auto", padding:"clamp(20px, 5vw, 36px) clamp(16px, 5vw, 28px)", animation:"fadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both" }}>
      {/* Session header */}
      <div style={{ marginBottom:28 }}>
        <p className="mono" style={{ fontSize:9, color:"var(--text-faint)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:7 }}>{date}</p>
        <h2 className="serif" style={{ fontSize:22, fontWeight:600, color:"var(--text)", letterSpacing:"-0.02em", lineHeight:1.2 }}>
          {session.title || "Study Session"}
        </h2>
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          {session.flashcards?.length && <span className="badge badge-accent">{session.flashcards.length} flashcards</span>}
          {session.quiz?.length && <span className="badge badge-gold">{session.quiz.length} quiz questions</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ position:"relative", marginBottom:28, borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"10px 18px 11px",
                background:"none", border:"none", cursor:"pointer",
                fontFamily:"Sora,sans-serif", fontSize:12, fontWeight:500,
                color: activeTab===t.id ? "var(--text)" : "var(--text-dim)",
                transition:"color 0.15s", whiteSpace:"nowrap", letterSpacing:"0.01em",
                position:"relative"
              }}>
              <span style={{ fontSize:11, color: activeTab===t.id ? "var(--accent)" : "var(--text-faint)", transition:"color 0.15s" }}>{t.icon}</span>
              {t.label}
              {t.count !== undefined && (
                <span className="mono" style={{
                  fontSize:9, padding:"2px 6px", borderRadius:5, marginLeft:2,
                  background: activeTab===t.id ? "var(--accent-dim)" : "var(--bg-hover)",
                  color: activeTab===t.id ? "var(--accent-hi)" : "var(--text-faint)",
                  transition:"all 0.15s"
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        {/* Animated underline */}
        <TabUnderline tabs={tabs} activeTab={activeTab} />
      </div>

      <div key={activeTab} style={{ animation:"fadeUp 0.25s cubic-bezier(0.4,0,0.2,1) both" }}>
        {activeTab==="summary"    && session.summary    && <SummaryTab summary={session.summary} />}
        {activeTab==="flashcards" && session.flashcards && <FlashcardDeck flashcards={session.flashcards} />}
        {activeTab==="quiz"       && session.quiz       && <QuizComponent questions={session.quiz} userId={user.id} sessionId={session.id} onQuizSubmitted={handleQuizSubmitted} />}
        {activeTab==="progress"   && <ProgressTracker sessionId={session.id} refreshTrigger={refreshTrigger} />}
        {activeTab==="chat"       && <ChatComponent sessionId={session.id} user={user} />}
      </div>
    </div>
  );
}

/* ── Animated tab underline ───────────────────────────────────────── */
function TabUnderline({ tabs, activeTab }: { tabs:{id:string;label:string;count?:number;icon:string}[]; activeTab:string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({ left:0, width:0 });

  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;
    const buttons = container.querySelectorAll("button");
    const idx = tabs.findIndex(t => t.id === activeTab);
    const btn = buttons[idx] as HTMLElement;
    if (btn) setStyle({ left:btn.offsetLeft, width:btn.offsetWidth });
  }, [activeTab, tabs]);

  return (
    <div ref={containerRef} style={{
      position:"absolute", bottom:-1, height:2, background:"var(--accent)",
      borderRadius:2, transition:"left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
      left:style.left, width:style.width
    }} />
  );
}

/* ── Summary Tab ──────────────────────────────────────────────────── */
function SummaryTab({ summary }: { summary:NonNullable<StudySession["summary"]> }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="card" style={{ padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", fontSize:14 }}>◈</div>
          <h3 style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Key Points</h3>
          <span className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginLeft:"auto" }}>{summary.bullets.length} items</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {summary.bullets.map((b,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", animation:`fadeUp 0.25s ease both`, animationDelay:`${i*40}ms`, opacity:0 }}>
              <span style={{ marginTop:6, width:4, height:4, borderRadius:"50%", background:"var(--accent)", flexShrink:0 }} />
              <p style={{ fontSize:13, color:"var(--text-dim)", lineHeight:1.75, margin:0 }}>{b}</p>
            </div>
          ))}
        </div>
      </div>

      {summary.key_concepts.length > 0 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:"var(--gold-dim)", border:"1px solid var(--gold-border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--gold)", fontSize:14 }}>⬡</div>
            <h3 style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Key Concepts</h3>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {summary.key_concepts.map((c,i) => (
              <span key={i} className="badge badge-gold" style={{ animation:`scaleIn 0.2s ease both`, animationDelay:`${i*30}ms` }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icon set ─────────────────────────────────────────────────────── */
export function Spinner16() { return <Spinner size={16} />; }
const PlusIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const SparkIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>;
const PdfIcon   = ({ size=14 }: { size?:number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>;

function CollapseIcon({ collapsed }: { collapsed:boolean }) {
  return collapsed
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>;
}
