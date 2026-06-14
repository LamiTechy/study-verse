"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dashboard } from "@/components/Dashboard";
import { User } from "@supabase/supabase-js";
import { FileText, Layers, Zap, BarChart3, Smartphone, Rocket } from "lucide-react";
import { LogoMark, Spinner } from "@/components/SharedComponents";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  if (user) return <Dashboard user={user} />;
  return <LandingPage />;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"var(--bg)", gap:20 }}>
      <LogoMark size={40} />
      <div style={{ display:"flex", gap:6 }}>
        {[0,120,240].map(d => (
          <div key={d} style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", animation:`pulse 1.2s ease-in-out infinite`, animationDelay:`${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, var(--bg) 0%, rgba(100,200,255,0.1) 100%)", fontFamily:"'Sora', sans-serif" }}>
      {/* Navigation */}
      <nav style={{ padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <LogoMark size={32} />
          <span style={{ fontSize:20, fontWeight:"bold", color:"var(--text)", letterSpacing:"-0.02em" }}>StudyForge</span>
        </div>
        <div style={{ display:"flex", gap:16 }}>
          <Link href="/auth/login" style={{ padding:"6px 14px", color:"var(--text)", textDecoration:"none", borderRadius:6, border:"1px solid var(--accent)", cursor:"pointer", transition:"all 0.3s", fontWeight:500, fontSize:12 }}>
            Sign In
          </Link>
          <Link href="/auth/signup" style={{ padding:"6px 14px", background:"var(--accent)", color:"white", textDecoration:"none", borderRadius:6, cursor:"pointer", fontWeight:600, transition:"all 0.3s", fontSize:12 }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding:"100px 40px", textAlign:"center", maxWidth:"900px", margin:"0 auto" }}>
        <h1 style={{ fontSize:56, fontWeight:600, marginBottom:20, color:"var(--text)", lineHeight:1.2, letterSpacing:"-0.03em", fontFamily:"'Fraunces', serif" }}>
          Learn Smarter, Not Harder
        </h1>
        <p style={{ fontSize:18, color:"rgba(255,255,255,0.7)", marginBottom:40, lineHeight:1.6, fontWeight:400, fontFamily:"'Sora', sans-serif" }}>
          Transform your study notes into intelligent flashcards, summaries, and quizzes powered by AI. Master any subject in less time.
        </p>
        <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
          <Link href="/auth/signup" style={{ padding:"14px 32px", background:"var(--accent)", color:"white", textDecoration:"none", borderRadius:8, cursor:"pointer", fontWeight:"bold", fontSize:16, transition:"all 0.3s" }}>
            Start Learning Free
          </Link>
          <Link href="#features" style={{ padding:"14px 32px", border:"2px solid var(--accent)", color:"var(--accent)", textDecoration:"none", borderRadius:8, cursor:"pointer", fontWeight:"bold", fontSize:16, transition:"all 0.3s" }}>
            See Features
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding:"80px 40px", background:"rgba(0,0,0,0.2)" }}>
        <h2 style={{ fontSize:40, fontWeight:600, textAlign:"center", marginBottom:60, color:"var(--text)", letterSpacing:"-0.03em", fontFamily:"'Fraunces', serif" }}>
          Powerful Features
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:30, maxWidth:"1000px", margin:"0 auto" }}>
          <FeatureCard
            icon={<FileText size={32} strokeWidth={1.5} />}
            title="AI-Powered Summaries"
            description="Convert your messy notes into clean, organized summaries with key concepts highlighted."
          />
          <FeatureCard
            icon={<Layers size={32} strokeWidth={1.5} />}
            title="Smart Flashcards"
            description="Automatically generate flashcards from your content and study with spaced repetition."
          />
          <FeatureCard
            icon={<Zap size={32} strokeWidth={1.5} />}
            title="Instant Quizzes"
            description="Test your knowledge with AI-generated quizzes tailored to your study material."
          />
          <FeatureCard
            icon={<BarChart3 size={32} strokeWidth={1.5} />}
            title="Progress Tracking"
            description="Monitor your learning progress with detailed analytics and performance insights."
          />
          <FeatureCard
            icon={<Smartphone size={32} strokeWidth={1.5} />}
            title="PDF Support"
            description="Upload and process PDF documents directly for quick note extraction."
          />
          <FeatureCard
            icon={<Rocket size={32} strokeWidth={1.5} />}
            title="Lightning Fast"
            description="Get results in seconds with our optimized AI processing pipeline."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding:"80px 40px", textAlign:"center" }}>
        <h2 style={{ fontSize:40, fontWeight:600, marginBottom:20, color:"var(--text)", letterSpacing:"-0.03em", fontFamily:"'Fraunces', serif" }}>
          Ready to Transform Your Learning?
        </h2>
        <p style={{ fontSize:18, color:"rgba(255,255,255,0.7)", marginBottom:40 }}>
          Join thousands of students achieving better grades with StudyForge.
        </p>
        <Link href="/auth/signup" style={{ padding:"14px 32px", background:"var(--accent)", color:"white", textDecoration:"none", borderRadius:8, cursor:"pointer", fontWeight:"bold", fontSize:16 }}>
          Sign Up Now - It's Free
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid rgba(255,255,255,0.1)", padding:"40px", textAlign:"center", color:"rgba(255,255,255,0.5)", fontSize:14 }}>
        <p>&copy; 2024 StudyForge. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ padding:24, background:"rgba(255,255,255,0.05)", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", textAlign:"center", transition:"all 0.3s" }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16, color:"var(--accent)" }}>
        {icon}
      </div>
      <h3 style={{ fontSize:18, fontWeight:600, marginBottom:12, color:"var(--text)", letterSpacing:"-0.015em", fontFamily:"'Sora', sans-serif" }}>{title}</h3>
      <p style={{ color:"rgba(255,255,255,0.6)", lineHeight:1.6, fontSize:14 }}>{description}</p>
    </div>
  );
}
