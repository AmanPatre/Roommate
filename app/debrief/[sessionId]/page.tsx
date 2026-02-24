'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSession, saveDebrief, updateUserStats } from '@/lib/firebase/firestore';
import { SessionData, DebriefJSON } from '@/types';
import Navbar from '@/components/layout/Navbar';
import { toast } from 'sonner';
import {
    RefreshCw, Loader2, Trophy, AlertTriangle, TrendingUp,
    Star, MessageSquare, BarChart2, Calendar, CheckSquare,
    Clock, ChevronRight, PlayCircle
} from 'lucide-react';

// ── Animated Score Circle ─────────────────────────────────
function ScoreGauge({ score, label }: { score: number; label: string }) {
    const [displayed, setDisplayed] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = () => { start += 2; setDisplayed(Math.min(start, score)); if (start < score) requestAnimationFrame(step); };
        const t = setTimeout(() => requestAnimationFrame(step), 400);
        return () => clearTimeout(t);
    }, [score]);
    const color = score >= 75 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `3px solid ${color}`, background: 'var(--surface)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px', boxShadow: `0 0 24px ${color}30`,
            }}>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 22, color }}>{displayed}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', display: 'block', lineHeight: 1.3 }}>{label}</span>
        </div>
    );
}

export default function DebriefPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [session, setSession] = useState<SessionData | null>(null);
    const [debrief, setDebrief] = useState<DebriefJSON | null>(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'plan'>('overview');

    useEffect(() => {
        if (!sessionId || !user) return;
        const load = async () => {
            const s = await getSession(sessionId as string);
            setSession(s);
            if (s?.debriefJson) {
                setDebrief(s.debriefJson);
                setLoading(false);
            } else if (s?.transcript && s.transcript.length > 0) {
                generateDebrief(s);
            } else {
                setLoading(false);
                toast.error('No transcript found. Cannot generate debrief.');
            }
        };
        load();
    }, [sessionId, user]);

    const generateDebrief = async (s: SessionData) => {
        setGenerating(true);
        setLoading(true);
        try {
            const res = await fetch('/api/gemini/debrief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: s.transcript,
                    sessionMeta: { config: s.config, status: s.status, sessionId: s.sessionId },
                    sessionId: s.sessionId,
                    userId: user?.uid,
                }),
            });
            if (!res.ok) throw new Error('Generation failed');
            const data: DebriefJSON = await res.json();
            setDebrief(data);
            setSession((prev) => prev ? { ...prev, debriefJson: data } : prev);

            // Save to Firestore natively on client
            if (s.sessionId) {
                await saveDebrief(s.sessionId, data);
            }
            if (user?.uid && data.scores?.overall) {
                await updateUserStats(user.uid, data.scores.overall);
            }

            toast.success('Debrief generated!');
        } catch (e: any) {
            toast.error('Debrief generation failed: ' + e.message);
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <Loader2 size={36} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Generating your debrief…</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!debrief) return (
        <div><Navbar />
            <div className="page-container" style={{ paddingTop: 48 }}>
                <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                    <AlertTriangle size={36} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>No Debrief Found</h3>
                    <p style={{ marginBottom: 24 }}>The session may have been too short, or generation failed.</p>
                    <button onClick={() => session && generateDebrief(session)} className="btn-primary">Try Again</button>
                </div>
            </div>
        </div>
    );

    const scores = debrief.scores;
    const summary = debrief.session_summary;

    return (
        <div>
            <Navbar />
            <div className="page-container" style={{ paddingTop: 48, paddingBottom: 80 }}>

                {/* ── Header ──────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <p className="section-label">Interview Debrief</p>
                            <h1 style={{ fontSize: 32, color: 'var(--text)', marginBottom: 8 }}>
                                {summary.company} — {summary.interview_type}
                            </h1>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span className={`badge ${summary.session_status === 'completed' ? 'badge-accent' : 'badge-warning'}`}>
                                    {summary.session_status === 'completed' ? '✅ Completed' : '⚡ Partial Session'}
                                </span>
                                <span className="badge badge-muted">{summary.difficulty} difficulty</span>
                                <span className="badge badge-muted"><Clock size={10} /> {summary.actual_duration_minutes} min</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => router.push(`/replay/${sessionId}`)} className="btn-ghost" style={{ fontSize: 13 }}>
                                <PlayCircle size={14} /> Session Replay
                            </button>
                            <button onClick={() => session && generateDebrief(session)} disabled={generating} className="btn-ghost" style={{ fontSize: 13 }}>
                                {generating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                                Regenerate Debrief
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── Overall Score ──────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="glass-card-accent" style={{ padding: 32, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div className="score-circle" style={{ width: 120, height: 120 }}>
                                    <ScoreGauge score={scores.overall} label="" />
                                    <div className="score-label">Overall</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', flex: 1 }}>
                                {[
                                    { label: 'Communication', score: scores.communication_clarity },
                                    { label: 'STAR Structure', score: scores.structure_star },
                                    { label: 'Role Fit', score: scores.role_fit },
                                    { label: 'Confidence', score: scores.confidence_delivery },
                                    { label: 'Tech Depth', score: scores.technical_depth },
                                ].map((s) => <ScoreGauge key={s.label} score={s.score} label={s.label} />)}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Tabs ────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                    {(['overview', 'details', 'plan'] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'Outfit', fontWeight: 600, fontSize: 14,
                                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                transition: 'all 180ms', textTransform: 'capitalize',
                            }}>
                            {tab === 'overview' ? '📊 Overview' : tab === 'details' ? '🔍 Deep Dive' : '📅 7-Day Plan'}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                        {/* ── OVERVIEW TAB ────────────────────────────── */}
                        {activeTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Topics */}
                                {summary.topics_discussed?.length > 0 && (
                                    <div className="glass-card" style={{ padding: 24 }}>
                                        <h3 style={{ color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={18} color="var(--accent)" /> Topics Covered</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {summary.topics_discussed.map((t, i) => (
                                                <span key={i} className="badge badge-muted">{t.topic}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Strengths */}
                                <div>
                                    <h3 style={{ color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} color="var(--accent)" /> Strengths</h3>
                                    {debrief.strengths?.map((s, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                            className="glass-card" style={{ padding: 20, marginBottom: 12 }}>
                                            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{s.title}</div>
                                            {s.evidence?.quote && (
                                                <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12, fontStyle: 'italic', fontSize: 13, color: 'var(--accent)', marginBottom: 10 }}>
                                                    "{s.evidence.quote}"
                                                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                                                        @ {new Date(s.evidence.timestamp_start).toLocaleTimeString()}
                                                    </div>
                                                </blockquote>
                                            )}
                                            <p style={{ fontSize: 13, margin: 0 }}>{s.why_it_matters}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Improvements */}
                                <div>
                                    <h3 style={{ color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={18} color="var(--warning)" /> Areas to Improve</h3>
                                    {debrief.improvements?.map((imp, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                            className="glass-card" style={{ padding: 20, marginBottom: 12, borderColor: 'rgba(251,191,36,0.2)' }}>
                                            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>{imp.title}</div>
                                            <p style={{ fontSize: 13, color: 'var(--warning)', marginBottom: 10 }}>{imp.issue}</p>
                                            {imp.evidence?.quote && (
                                                <blockquote style={{ borderLeft: '3px solid rgba(251,191,36,0.5)', paddingLeft: 12, fontStyle: 'italic', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    "{imp.evidence.quote}"
                                                </blockquote>
                                            )}
                                            <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Better Answer</div>
                                                <p style={{ fontSize: 13, margin: 0 }}>{imp.better_answer_example}</p>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>💪 <strong style={{ color: 'var(--text)' }}>Exercise:</strong> {imp.micro_exercise}</div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Moments That Mattered */}
                                {debrief.moments_that_mattered?.length > 0 && (
                                    <div>
                                        <h3 style={{ color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Star size={18} color="var(--accent)" /> Moments That Mattered</h3>
                                        {debrief.moments_that_mattered.map((m, i) => (
                                            <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 10, display: 'flex', gap: 14 }}>
                                                <span className="badge badge-accent" style={{ flexShrink: 0, alignSelf: 'flex-start' }}>{m.label}</span>
                                                <div>
                                                    <p style={{ fontSize: 13, margin: 0 }}>{m.reason}</p>
                                                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>@ {new Date(m.timestamp_start).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── DETAILS TAB ─────────────────────────────── */}
                        {activeTab === 'details' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Delivery Metrics */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3 style={{ color: 'var(--text)', marginBottom: 20 }}>Delivery Metrics</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                        {[
                                            { label: 'Filler Words', value: debrief.delivery_metrics?.filler_word_estimate, unit: 'est.' },
                                            { label: 'Pace', value: debrief.delivery_metrics?.pace_wpm_estimate, unit: 'WPM' },
                                            { label: 'Long Pauses', value: debrief.delivery_metrics?.long_pause_estimate, unit: 'est.' },
                                        ].map((m) => (
                                            <div key={m.label} style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                                                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 28, color: 'var(--text)' }}>{m.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.unit}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Next Interview Checklist */}
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3 style={{ color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CheckSquare size={18} color="var(--accent)" /> Next Interview Checklist
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {debrief.next_interview_checklist?.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                                <ChevronRight size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <span style={{ fontSize: 14, color: 'var(--text)' }}>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {debrief.notes_if_low_data && (
                                    <div className="glass-card" style={{ padding: 20, borderColor: 'rgba(251,191,36,0.2)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Note</div>
                                        <p style={{ fontSize: 14, margin: 0 }}>{debrief.notes_if_low_data}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PLAN TAB ─────────────────────────────────── */}
                        {activeTab === 'plan' && (
                            <div>
                                <h3 style={{ color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Calendar size={18} color="var(--accent)" /> Your 7-Day Practice Plan
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {debrief.practice_plan_7_days?.map((day, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                            className="glass-card" style={{ padding: 20, display: 'flex', gap: 20 }}>
                                            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 56 }}>
                                                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>{day.day}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Day</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{day.focus}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                                                    {day.tasks?.map((task, j) => (
                                                        <div key={j} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                                                            <ChevronRight size={12} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} /> {task}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="badge badge-muted"><Clock size={10} /> {day.time_minutes} min</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
