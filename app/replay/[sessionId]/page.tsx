'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSession } from '@/lib/firebase/firestore';
import { SessionData, TranscriptTurn } from '@/types';
import Navbar from '@/components/layout/Navbar';
import { ArrowLeft, Clock, User, Bot, Loader2 } from 'lucide-react';

export default function ReplayPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [session, setSession] = useState<SessionData | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId || !user) return;
        getSession(sessionId as string).then((s) => { setSession(s); setLoading(false); });
    }, [sessionId, user]);

    if (loading) return (
        <div>
            <Navbar />
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );

    const transcript = session?.transcript || [];
    const sessionStart = transcript[0]?.timestamp_start ? new Date(transcript[0].timestamp_start) : null;

    const getRelativeTime = (ts: string) => {
        if (!sessionStart) return '';
        const diff = Math.max(0, Math.floor((new Date(ts).getTime() - sessionStart.getTime()) / 1000));
        return `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`;
    };

    return (
        <div>
            <Navbar />
            <div className="page-container" style={{ paddingTop: 48, paddingBottom: 80 }}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: 16, padding: '8px 16px', fontSize: 13 }}>
                        <ArrowLeft size={14} /> Back to Debrief
                    </button>
                    <p className="section-label">Session Replay</p>
                    <h2 style={{ color: 'var(--text)' }}>
                        {session?.config?.company || 'Interview'} — {session?.config?.type}
                    </h2>
                </motion.div>

                {/* Stats Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                    <span className="badge badge-muted"><Clock size={11} /> {transcript.length} turns</span>
                    <span className="badge badge-muted">
                        {transcript.filter((t) => t.speaker === 'user').length} user responses
                    </span>
                    <span className="badge badge-accent">
                        {session?.debriefJson?.scores?.overall ? `Score: ${session.debriefJson.scores.overall}` : 'No score'}
                    </span>
                </div>

                {/* Transcript Timeline */}
                {transcript.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No transcript available for this session.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {transcript.map((turn: TranscriptTurn, i: number) => {
                            const isSelected = selected === i;
                            const isAi = turn.speaker === 'ai';
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => setSelected(isSelected ? null : i)}
                                    className="glass-card"
                                    style={{
                                        padding: '14px 18px', cursor: 'pointer',
                                        borderColor: isSelected ? 'var(--accent)' : isAi ? 'var(--border-accent)' : 'var(--border)',
                                        background: isSelected ? 'var(--accent-glow)' : isAi ? 'rgba(34,197,94,0.04)' : 'var(--surface)',
                                        transition: 'all 180ms',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {/* Icon */}
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: isAi ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${isAi ? 'var(--border-accent)' : 'var(--border)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {isAi ? <Bot size={14} color="var(--accent)" /> : <User size={14} color="var(--text-muted)" />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: isAi ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                    {isAi ? 'Interviewer' : 'You'}
                                                </span>
                                                <span className="badge badge-muted" style={{ fontSize: 10 }}>
                                                    <Clock size={9} /> {getRelativeTime(turn.timestamp_start)}
                                                </span>
                                            </div>
                                            <p style={{
                                                fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: 0,
                                                overflow: isSelected ? 'visible' : 'hidden',
                                                textOverflow: isSelected ? 'clip' : 'ellipsis',
                                                display: isSelected ? 'block' : '-webkit-box',
                                                WebkitLineClamp: isSelected ? undefined : 2,
                                                WebkitBoxOrient: 'vertical',
                                            } as any}>
                                                {turn.text}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
