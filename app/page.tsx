'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { Mic, Brain, Trophy, Shield, Zap, BarChart2, ArrowRight, Star } from 'lucide-react';

const features = [
  { icon: <Mic size={22} />, title: 'Voice-First AI', desc: 'Real-time bidirectional voice powered by Gemini Live API. Speak naturally, get spoken feedback.' },
  { icon: <Brain size={22} />, title: 'Smart Personas', desc: 'Adaptive interviewers — from warm HR to skeptical senior engineers — that match your difficulty.' },
  { icon: <BarChart2 size={22} />, title: 'Deep Debrief', desc: 'Scored analysis with evidence quotes, moments that mattered, and a 7-day practice plan.' },
  { icon: <Shield size={22} />, title: 'Error-Resilient', desc: 'Connection state machine auto-reconnects. Falls back to text if voice fails — transcript never stops.' },
  { icon: <Zap size={22} />, title: 'Session Replay', desc: 'Jump through your transcript timeline and re-listen to any moment of your interview.' },
  { icon: <Trophy size={22} />, title: 'Track Progress', desc: 'Dashboard with session history, score trends, and personalized improvement insights.' },
];

const interviewTypes = [
  { label: 'HR', color: '#22c55e', desc: 'Culture fit & behavioral' },
  { label: 'Technical', color: '#10b981', desc: '2-person panel grilling' },
  { label: 'Coding', color: '#0d9488', desc: 'Live coding walkthrough' },
  { label: 'Behavioral', color: '#059669', desc: 'STAR method mastery' },
  { label: 'Custom', color: '#34d399', desc: 'Your own parameters' },
];

export default function LandingPage() {
  return (
    <div>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ paddingTop: 100, paddingBottom: 100 }}>
        <div className="page-container" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="badge badge-accent" style={{ marginBottom: 20, display: 'inline-flex' }}>
              <Star size={11} /> Voice-First Interview Prep
            </span>
            <h1 style={{ maxWidth: 700, margin: '0 auto 24px', background: 'linear-gradient(135deg, #e8f5e9 30%, #22c55e 70%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Practice interviews that feel real.
            </h1>
            <p style={{ maxWidth: 520, margin: '0 auto 40px', fontSize: 18, color: 'var(--text-muted)' }}>
              AI interviewers that adapt to your difficulty, challenge your weaknesses, and give you a surgical debrief — every session.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/sign-up" className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
                Start Practicing Free <ArrowRight size={18} />
              </Link>
              <Link href="/sign-in" className="btn-ghost" style={{ fontSize: 16, padding: '14px 32px' }}>
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Interview Type Pills */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 64 }}
          >
            {interviewTypes.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="glass-card"
                style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 110 }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, marginBottom: 4 }} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{t.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{t.desc}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section style={{ paddingBottom: 100 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p className="section-label">What makes Roomate different</p>
            <h2 style={{ color: 'var(--text)' }}>Built for candidates who want to level up</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                className="glass-card"
                style={{ padding: 28 }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--border-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{ color: 'var(--text)', marginBottom: 8, fontSize: 17 }}>{f.title}</h3>
                <p style={{ fontSize: 14 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Difficulty Showcase ───────────────────────────── */}
      <section style={{ paddingBottom: 100 }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-label">Adaptive difficulty</p>
            <h2 style={{ color: 'var(--text)' }}>Your interviewer changes everything</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { level: 'Easy', badge: '🟢', quote: '"Think about using the STAR method for this…"', desc: 'Supportive, hints allowed, guides you toward structure.' },
              { level: 'Medium', badge: '🟡', quote: '"What were the specific metrics? Walk me through the tradeoffs."', desc: 'Neutral, professional, probing for depth and clarity.' },
              { level: 'Hard', badge: '🔴', quote: '"That\'s vague. Give me a concrete example and measurable impact."', desc: 'Strict, skeptical, blunt-but-professional. Forces specificity.' },
            ].map((d, i) => (
              <motion.div
                key={d.level}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={i === 2 ? 'glass-card-accent' : 'glass-card'}
                style={{ padding: 28 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>{d.badge}</span>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{d.level}</span>
                </div>
                <blockquote style={{
                  fontStyle: 'italic', fontSize: 14, color: 'var(--accent)',
                  borderLeft: '3px solid var(--border-accent)', paddingLeft: 14, marginBottom: 16,
                }}>
                  {d.quote}
                </blockquote>
                <p style={{ fontSize: 14 }}>{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section style={{ paddingBottom: 100 }}>
        <div className="page-container" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="glass-card-accent"
            style={{ padding: '64px 40px', maxWidth: 640, margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)', marginBottom: 16 }}>Ready to ace your next interview?</h2>
            <p style={{ marginBottom: 32, fontSize: 16 }}>No credit card. No setup. Just speak.</p>
            <Link href="/sign-up" className="btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
              Get Started Free <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>© 2026 Roomate — Powered by Gemini + Firebase</p>
      </footer>
    </div>
  );
}
