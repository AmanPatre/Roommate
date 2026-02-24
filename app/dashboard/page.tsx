'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { getUserSessions, getUserStats } from '@/lib/firebase/firestore';
import { SessionData } from '@/types';
import { Plus, Clock, Star, TrendingUp, Mic, BarChart2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-glow)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
        </div>
    );
}

function SessionCard({ session }: { session: SessionData }) {
    const router = useRouter();
    const score = session.debriefJson?.scores?.overall;
    const scoreColor = score ? (score >= 75 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-dim)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ padding: 20, cursor: 'pointer', transition: 'border-color 180ms' }}
            onClick={() => router.push(`/debrief/${session.sessionId}`)}
            whileHover={{ scale: 1.01 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{session.config?.type || 'Interview'}</span>
                        <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{session.config?.difficulty || '-'}</span>
                        {session.status === 'ended_early' && <span className="badge badge-warning">Partial</span>}
                    </div>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.config?.company || 'Practice Session'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={11} />
                        {session.createdAt ? formatDistanceToNow(new Date(session.createdAt as string), { addSuffix: true }) : 'recently'}
                        {session.config?.durationMinutes && (
                            <> · {session.config.durationMinutes} min</>
                        )}
                    </div>
                </div>
                {score !== undefined && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 24, color: scoreColor }}>{score}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [stats, setStats] = useState<{ totalSessions: number; avgOverallScore: number } | null>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.push('/sign-in');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const [s, st] = await Promise.all([
                    getUserSessions(user.uid, 10),
                    getUserStats(user.uid),
                ]);
                setSessions(s);
                setStats(st as any);
            } finally {
                setFetching(false);
            }
        };
        load();
    }, [user]);

    if (loading || !user) return null;

    const name = user.displayName?.split(' ')[0] || 'there';

    return (
        <div>
            <Navbar />
            <div className="page-container" style={{ paddingTop: 48, paddingBottom: 80 }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
                    <p className="section-label">Dashboard</p>
                    <h1 style={{ fontSize: 36, background: 'linear-gradient(135deg, #e8f5e9 30%, #22c55e 70%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                        Hey, {name} 👋
                    </h1>
                    <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>Ready for your next practice session?</p>
                </motion.div>

                {/* Start Interview CTA */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Link href="/setup"
                        className="glass-card-accent"
                        style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 28, textDecoration: 'none', marginBottom: 32, transition: 'all 200ms' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #22c55e, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,0.35)', flexShrink: 0 }}>
                            <Mic size={26} color="#fff" strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: 'var(--text)', marginBottom: 4 }}>Start New Interview</h3>
                            <p style={{ fontSize: 14, margin: 0 }}>Choose type, difficulty, upload your CV & JD, and go.</p>
                        </div>
                        <Plus size={22} color="var(--accent)" />
                    </Link>
                </motion.div>

                {/* Stats */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
                        <StatCard label="Total Sessions" value={stats?.totalSessions ?? '–'} icon={<BarChart2 size={20} />} />
                        <StatCard label="Avg. Score" value={stats?.avgOverallScore ? `${stats.avgOverallScore}/100` : '–'} icon={<Star size={20} />} />
                        <StatCard label="Recent Streak" value={sessions.length > 0 ? `${sessions.length} sessions` : '–'} icon={<TrendingUp size={20} />} />
                    </div>
                </motion.div>

                {/* Recent Sessions */}
                <div>
                    <h2 style={{ fontSize: 20, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Recent Sessions
                        {fetching && <RefreshCw size={15} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} />}
                    </h2>

                    {!fetching && sessions.length === 0 && (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                            <Mic size={36} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
                            <h3 style={{ color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>No sessions yet</h3>
                            <p style={{ fontSize: 14, marginBottom: 24 }}>Start your first interview to see results here.</p>
                            <Link href="/setup" className="btn-primary">Start First Interview</Link>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {sessions.map((s) => <SessionCard key={s.sessionId} session={s} />)}
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
