"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, ChatMessage } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Spinner } from "@/app/page";

interface Props { sessionId: string; user: User; }

const STARTER_PROMPTS = [
  "Explain the key concept in simpler terms",
  "Give me a real-world example",
  "What should I focus on for a test?",
  "How does this relate to other topics?",
];

export function ChatComponent({ sessionId, user }: Props) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const endRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("chat_history").select("*").eq("session_id", sessionId).order("created_at",{ascending:true});
      if (data) setMessages(data as ChatMessage[]);
      setLoading(false);
    })();
  }, [sessionId]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput(""); setError(""); setSending(true);

    const temp: ChatMessage = { id:`t-${Date.now()}`, user_id:user.id, session_id:sessionId, role:"user", message:msg, created_at:new Date().toISOString() };
    setMessages(p => [...p, temp]);

    try {
      const res  = await fetch("/api/ask-ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId:user.id, sessionId, question:msg }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const { data } = await supabase.from("chat_history").select("*").eq("session_id", sessionId).order("created_at",{ascending:true});
      if (data) setMessages(data as ChatMessage[]);
    } catch(e:any) {
      setError(e.message);
      setMessages(p => p.filter(m => m.id !== temp.id));
    } finally { setSending(false); }
  }

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:48 }}><Spinner size={20} /></div>;

  const empty = messages.length === 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"var(--bg-raised)", border:"1px solid var(--border)", borderRadius:"var(--radius-xl)", overflow:"hidden", minHeight:520 }}>
      {/* Header */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"var(--accent)" }}>⌁</div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>AI Tutor</p>
            <p className="mono" style={{ fontSize:10, color:"var(--text-faint)", marginTop:1 }}>Contextual Q&A from your notes</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", boxShadow:"0 0 6px var(--green)", animation:"pulse 2.5s ease infinite" }} />
          <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14, minHeight:320 }}>
        {empty ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, textAlign:"center", padding:24 }}>
            <div style={{ width:56, height:56, borderRadius:18, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"var(--accent)" }}>⌁</div>
            <div>
              <p style={{ color:"var(--text)", fontSize:14, fontWeight:600, marginBottom:5 }}>Ask me anything</p>
              <p style={{ color:"var(--text-dim)", fontSize:12, lineHeight:1.7, maxWidth:300 }}>I have full context of your notes. Ask me to explain, simplify, or connect ideas.</p>
            </div>
            {/* Starter prompts */}
            <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:8, maxWidth:400 }}>
              {STARTER_PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  style={{
                    background:"var(--bg-elevated)", border:"1px solid var(--border-mid)", borderRadius:20,
                    padding:"7px 14px", fontSize:11, color:"var(--text-dim)", fontFamily:"Sora,sans-serif",
                    cursor:"pointer", transition:"all 0.12s"
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent-hi)"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor="var(--border-mid)"; e.currentTarget.style.color="var(--text-dim)"; }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={m.id} style={{
                display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start",
                animation:"fadeUp 0.25s ease both", animationDelay:`${i*20}ms`, opacity:0
              }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, maxWidth:"82%" }}>
                  {m.role === "assistant" && (
                    <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, marginBottom:4, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"var(--accent)" }}>⌁</div>
                  )}
                  <div style={{
                    padding:"11px 15px", borderRadius:14,
                    borderBottomRightRadius: m.role==="user" ? 3 : 14,
                    borderBottomLeftRadius:  m.role==="assistant" ? 3 : 14,
                    background: m.role==="user" ? "var(--accent)" : "var(--bg-elevated)",
                    border: m.role==="user" ? "none" : "1px solid var(--border)",
                    boxShadow: m.role==="user" ? "0 2px 12px rgba(123,107,245,0.3)" : "none"
                  }}>
                    <p style={{ fontSize:13, lineHeight:1.75, color: m.role==="user" ? "#fff" : "var(--text)", whiteSpace:"pre-wrap", margin:0 }}>{m.message}</p>
                    <p className="mono" style={{ fontSize:9, color: m.role==="user" ? "rgba(255,255,255,0.45)" : "var(--text-faint)", marginTop:5 }}>
                      {new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:8, background:"var(--accent-dim)", border:"1px solid var(--accent-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"var(--accent)" }}>⌁</div>
                <div style={{ padding:"14px 16px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:14, borderBottomLeftRadius:3 }}>
                  <div style={{ display:"flex", gap:4 }}>
                    {[0,150,300].map(d => (
                      <div key={d} style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", animation:`typingDot 1.2s ease-in-out infinite`, animationDelay:`${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", background:"var(--bg)" }}>
        {error && (
          <div style={{ marginBottom:10, background:"var(--red-dim)", border:"1px solid var(--red-border)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"var(--red)" }}>
            ⚠ {error}
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey && !sending) send(); }}
            placeholder="Ask anything about your notes…" disabled={sending}
            className="input" style={{ flex:1 }} />
          <button onClick={() => send()} disabled={!input.trim() || sending}
            className="btn btn-primary" style={{ padding:"10px 20px", flexShrink:0 }}>
            {sending ? <Spinner size={14} color="#fff" /> : <SendIcon />}
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:8 }}>
          <kbd style={{ background:"var(--bg-raised)", border:"1px solid var(--border-mid)", borderRadius:4, padding:"2px 7px", fontSize:9, fontFamily:"JetBrains Mono,monospace", color:"var(--text-dim)" }}>Enter</kbd>
          <span className="mono" style={{ fontSize:9, color:"var(--text-faint)" }}>to send</span>
          {messages.length > 0 && (
            <span className="mono" style={{ fontSize:9, color:"var(--text-faint)", marginLeft:8 }}>{messages.length} message{messages.length!==1?"s":""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const SendIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
