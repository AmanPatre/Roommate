'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { InterviewConfig, InterviewType, Difficulty } from '@/types';
import { createSession } from '@/lib/firebase/firestore';
import { uploadFile } from '@/lib/firebase/storage';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import {
    Users, Code2, MessageSquare, Briefcase, Sliders,
    Gauge, BrainCircuit, Shield, Clock, FileText,
    Link as LinkIcon, CheckCircle, ArrowRight, ArrowLeft,
    Upload, Loader2
} from 'lucide-react';

// ── Step 1: Interview Type ────────────────────────────────
const TYPES: { id: InterviewType; label: string; desc: string; icon: React.ReactNode; interviewers: string }[] = [
    { id: 'hr', label: 'HR', desc: 'Culture fit & behavioral competencies', icon: <Users size={22} />, interviewers: '1 Interviewer' },
    { id: 'technical', label: 'Technical', desc: 'System design & engineering depth', icon: <BrainCircuit size={22} />, interviewers: '2-person Panel' },
    { id: 'coding', label: 'Coding', desc: 'Algorithms, data structures & live coding', icon: <Code2 size={22} />, interviewers: '2-person Panel' },
    { id: 'behavioral', label: 'Behavioral', desc: 'STAR method & situational questions', icon: <MessageSquare size={22} />, interviewers: '1–2 Toggle' },
    { id: 'custom', label: 'Custom', desc: 'Define your own interview parameters', icon: <Sliders size={22} />, interviewers: 'Flexible' },
];

// ── Step 2: Difficulty & Duration ─────────────────────────
const DIFFICULTIES: { id: Difficulty; label: string; emoji: string; desc: string }[] = [
    { id: 'easy', label: 'Easy', emoji: '🟢', desc: 'Supportive, hints offered, guided toward STAR' },
    { id: 'medium', label: 'Medium', emoji: '🟡', desc: 'Neutral, professional, probing for metrics' },
    { id: 'hard', label: 'Hard', emoji: '🔴', desc: 'Strict, skeptical, forces specificity & evidence' },
];
const DURATIONS = [30, 60, 120];

// ── Stepper Header ────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.div
                        animate={i <= current ? { background: i < current ? 'var(--accent)' : 'var(--accent)', scale: 1.1 } : { background: 'var(--surface)', scale: 1 }}
                        style={{
                            width: i === current ? 32 : 28, height: 28,
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${i <= current ? 'var(--accent)' : 'var(--border)'}`,
                            fontSize: 12, fontWeight: 700,
                            color: i <= current ? '#fff' : 'var(--text-dim)',
                            transition: 'all 200ms',
                        }}
                    >
                        {i < current ? <CheckCircle size={14} /> : i + 1}
                    </motion.div>
                    {i < total - 1 && (
                        <div style={{ width: 32, height: 2, background: i < current ? 'var(--accent)' : 'var(--border)', borderRadius: 1, transition: 'background 300ms' }} />
                    )}
                </div>
            ))}
        </div>
    );
}

const STEP_LABELS = ['Interview Type', 'Difficulty & Duration', 'Your Documents', 'Company Info', 'Ready to Go'];

export default function SetupPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const [config, setConfig] = useState<Partial<InterviewConfig>>({
        type: undefined,
        difficulty: 'medium',
        durationMinutes: 60,
        company: '',
        companyUrl: '',
        jobDescription: '',
    });
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [clFile, setClFile] = useState<File | null>(null);
    const [customDuration, setCustomDuration] = useState<string>('');

    const goNext = () => { setDirection(1); setStep((s) => s + 1); };
    const goPrev = () => { setDirection(-1); setStep((s) => s - 1); };

    const canProceed = () => {
        if (step === 0) return !!config.type;
        if (step === 1) return !!config.difficulty && !!config.durationMinutes;
        if (step === 2) return true; // docs optional
        if (step === 3) return !!config.company && !!config.companyUrl;
        return true;
    };

    // Uploads file with a 15s timeout — throws on failure so the interview is blocked
    const uploadWithTimeout = async (path: string, file: File, label: string): Promise<string> => {
        console.log(`[Upload] Starting ${label} upload → ${path}`);
        try {
            const result = await Promise.race([
                uploadFile(path, file),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(
                        `${label} upload timed out after 15s. ` +
                        `Make sure Firebase Storage is enabled in your Firebase Console ` +
                        `(Build → Storage → Get started).`
                    )), 15000)
                ),
            ]);
            console.log(`[Upload] ✅ ${label} uploaded successfully`);
            return result as string;
        } catch (err: any) {
            console.error(`[Upload] ❌ ${label} failed:`, err);
            throw err; // re-throw so handleStart catches it and blocks the interview
        }
    };

    const handleStart = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const sessionId = uuidv4();
            let cvUrl: string | undefined;
            let clUrl: string | undefined;

            if (cvFile) {
                console.log('[Session] Uploading CV...');
                cvUrl = await uploadWithTimeout(`sessions/${sessionId}/cv.pdf`, cvFile, 'CV');
            }
            if (clFile) {
                console.log('[Session] Uploading Cover Letter...');
                clUrl = await uploadWithTimeout(`sessions/${sessionId}/cover_letter.pdf`, clFile, 'Cover Letter');
            }

            console.log('[Session] Creating Firestore session...');
            const sessionConfig: InterviewConfig = {
                type: config.type as InterviewType,
                difficulty: config.difficulty as Difficulty,
                durationMinutes: config.durationMinutes as number,
                company: config.company || '',
                companyUrl: config.companyUrl || '',
                jobDescription: config.jobDescription || '',
                ...(cvUrl ? { cvUrl } : {}),
                ...(clUrl ? { coverLetterUrl: clUrl } : {}),
            };

            await createSession(sessionId, user.uid, {
                status: 'in_progress',
                config: sessionConfig,
                transcript: [],
            });

            console.log('[Session] ✅ Session created, redirecting to interview...');
            router.push(`/interview/${sessionId}`);
        } catch (e: any) {
            console.error('[Session] ❌ Failed to start session:', e);
            toast.error(e.message || 'Failed to start session. Check the browser console for details.');
            setSubmitting(false);
        }
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    };

    return (
        <div>
            <Navbar />
            <div className="page-container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
                <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <p className="section-label">Setup Wizard</p>
                    <h2 style={{ color: 'var(--text)' }}>{STEP_LABELS[step]}</h2>
                </div>

                <StepIndicator current={step} total={5} />

                <div style={{ position: 'relative', minHeight: 360 }}>
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.28, ease: 'easeInOut' }}
                        >
                            {/* ── STEP 0: Type ── */}
                            {step === 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                    {TYPES.map((t) => (
                                        <button key={t.id} onClick={() => setConfig((c) => ({ ...c, type: t.id }))}
                                            style={{
                                                background: config.type === t.id ? 'var(--accent-glow)' : 'var(--surface)',
                                                border: `1px solid ${config.type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                                                borderRadius: 14, padding: '20px 16px', cursor: 'pointer', textAlign: 'left',
                                                transition: 'all 180ms', color: 'var(--text)', boxShadow: config.type === t.id ? '0 0 24px var(--accent-glow)' : 'none',
                                            }}>
                                            <div style={{ color: 'var(--accent)', marginBottom: 10 }}>{t.icon}</div>
                                            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{t.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t.desc}</div>
                                            <span className="badge badge-muted" style={{ fontSize: 10 }}>{t.interviewers}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* ── STEP 1: Difficulty & Duration ── */}
                            {step === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div>
                                        <h4 style={{ color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>Difficulty</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                            {DIFFICULTIES.map((d) => (
                                                <button key={d.id} onClick={() => setConfig((c) => ({ ...c, difficulty: d.id }))}
                                                    style={{
                                                        background: config.difficulty === d.id ? 'var(--accent-glow)' : 'var(--surface)',
                                                        border: `1px solid ${config.difficulty === d.id ? 'var(--accent)' : 'var(--border)'}`,
                                                        borderRadius: 12, padding: '16px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 180ms',
                                                    }}>
                                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{d.emoji}</div>
                                                    <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{d.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>Duration (planned)</h4>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {DURATIONS.map((d) => (
                                                <button key={d} onClick={() => setConfig((c) => ({ ...c, durationMinutes: d }))}
                                                    className={config.durationMinutes === d ? 'btn-primary' : 'btn-ghost'}
                                                    style={{ padding: '10px 20px', minWidth: 72 }}>
                                                    {d} min
                                                </button>
                                            ))}
                                            <input
                                                type="number" placeholder="Custom" min={5} max={240}
                                                value={customDuration}
                                                onChange={(e) => { setCustomDuration(e.target.value); setConfig((c) => ({ ...c, durationMinutes: parseInt(e.target.value) || 60 })); }}
                                                className="input-field" style={{ width: 110 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2: Documents ── */}
                            {step === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {[
                                        { label: 'CV / Resume', file: cvFile, setter: setCvFile, required: false },
                                        { label: 'Cover Letter', file: clFile, setter: setClFile, required: false },
                                    ].map(({ label, file, setter, required }) => (
                                        <div key={label} className="glass-card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                                                    {label} {!required && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>(optional)</span>}
                                                </div>
                                                {file && <span className="badge badge-accent"><CheckCircle size={11} /> {file.name}</span>}
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 16px', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 14, transition: 'border-color 180ms' }}
                                                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                                                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                                                <Upload size={16} color="var(--accent)" />
                                                {file ? 'Replace file' : 'Upload PDF'}
                                                <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={(e) => setter(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                    ))}
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            Job Description <span style={{ color: 'var(--text-dim)' }}>(paste or type)</span>
                                        </label>
                                        <textarea
                                            value={config.jobDescription}
                                            onChange={(e) => setConfig((c) => ({ ...c, jobDescription: e.target.value }))}
                                            placeholder="Paste the job description here..."
                                            rows={5}
                                            className="input-field"
                                            style={{ resize: 'vertical', fontFamily: 'Inter', lineHeight: 1.6 }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: Company ── */}
                            {step === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Company Name *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Briefcase size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            <input value={config.company} onChange={(e) => setConfig((c) => ({ ...c, company: e.target.value }))}
                                                placeholder="e.g. Google, Stripe, Airbnb" className="input-field" style={{ paddingLeft: 40 }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Company Website URL *</label>
                                        <div style={{ position: 'relative' }}>
                                            <LinkIcon size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            <input value={config.companyUrl} onChange={(e) => setConfig((c) => ({ ...c, companyUrl: e.target.value }))}
                                                placeholder="https://company.com" type="url" className="input-field" style={{ paddingLeft: 40 }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 4: Preview ── */}
                            {step === 4 && (
                                <div className="glass-card-accent" style={{ padding: 32 }}>
                                    <h3 style={{ color: 'var(--text)', marginBottom: 24 }}>Your Session Preview</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {[
                                            { label: 'Interview Type', value: config.type?.toUpperCase() },
                                            { label: 'Difficulty', value: config.difficulty?.charAt(0).toUpperCase()! + config.difficulty!.slice(1) },
                                            { label: 'Duration', value: `${config.durationMinutes} minutes (planned)` },
                                            { label: 'Company', value: config.company || '–' },
                                            { label: 'CV Uploaded', value: cvFile ? '✅ ' + cvFile.name : '–' },
                                            { label: 'Job Description', value: config.jobDescription ? `✅ ${config.jobDescription.slice(0, 40)}...` : '–' },
                                        ].map(({ label, value }) => (
                                            <div key={label} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: 28, padding: 16, background: 'rgba(34,197,94,0.06)', borderRadius: 10, border: '1px solid var(--border-accent)' }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                            ⚡ You can end the interview at any time — even after just 2 minutes — and still receive a full debrief.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
                    <button onClick={goPrev} disabled={step === 0} className="btn-ghost" style={{ opacity: step === 0 ? 0 : 1 }}>
                        <ArrowLeft size={16} /> Back
                    </button>

                    {step < 4 ? (
                        <button onClick={goNext} disabled={!canProceed()} className="btn-primary">
                            Continue <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button onClick={handleStart} disabled={submitting} className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                            {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Starting...</> : <>Start Interview <ArrowRight size={16} /></>}
                        </button>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
