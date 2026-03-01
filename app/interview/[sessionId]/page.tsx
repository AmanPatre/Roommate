'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { getSession, updateSession, updateTranscript } from '@/lib/firebase/firestore';
import { buildSystemInstruction } from '@/lib/gemini/personas';
import { TranscriptLogger } from '@/lib/gemini/transcriptLogger';
import { SessionData, ConnectionState, TranscriptTurn } from '@/types';
import { toast } from 'sonner';
import {
    Mic, MicOff, PhoneOff, Volume2, VolumeX,
    MessageSquare, X, Bookmark, Loader2, Wifi, WifiOff,
    AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Waveform Component ────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 32 }}>
            {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                    key={i}
                    animate={active ? { scaleY: [0.3, 1, 0.4, 0.9, 0.2], } : { scaleY: 0.15 }}
                    transition={active ? { duration: 0.8, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' } : {}}
                    style={{
                        width: 3, height: '100%', borderRadius: 2,
                        background: active ? 'var(--accent)' : 'var(--text-dim)',
                        transformOrigin: 'center',
                    }}
                />
            ))}
        </div>
    );
}

// ── Avatar with Speaking Ring ─────────────────────────────
function Avatar({ speaking, label, initials }: { speaking: boolean; label: string; initials: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <motion.div
                animate={speaking ? { boxShadow: ['0 0 0 0 rgba(34,197,94,0.4)', '0 0 0 16px rgba(34,197,94,0)', '0 0 0 0 rgba(34,197,94,0)'] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: speaking ? 'linear-gradient(135deg, #22c55e, #10b981)' : 'var(--surface)',
                    border: `2px solid ${speaking ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 8px',
                    fontSize: 22, fontFamily: 'Outfit', fontWeight: 700, color: speaking ? '#fff' : 'var(--text-muted)',
                    transition: 'all 300ms',
                }}
            >
                {initials}
            </motion.div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            {speaking && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>Speaking…</div>}
        </div>
    );
}

// ── Timer Badge ───────────────────────────────────────────
function TimerBadge({ startTime, planned }: { startTime: Date; planned: number }) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000)), 1000);
        return () => clearInterval(id);
    }, [startTime]);

    const plannedSec = planned * 60;
    const remaining = Math.max(0, plannedSec - elapsed);
    const pct = elapsed / plannedSec;
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    const warn = pct > 0.8;

    return (
        <div className="badge" style={{
            background: warn ? 'rgba(251,191,36,0.1)' : 'var(--accent-glow)',
            border: `1px solid ${warn ? 'rgba(251,191,36,0.3)' : 'var(--border-accent)'}`,
            color: warn ? 'var(--warning)' : 'var(--accent)',
            fontSize: 14, fontWeight: 700, fontFamily: 'Outfit',
        }}>
            {mm}:{ss}
        </div>
    );
}

// ── Connection State Badge ────────────────────────────────
const stateConfig: Record<ConnectionState, { color: string; label: string; icon: React.ReactNode }> = {
    idle: { color: 'var(--text-dim)', label: 'Idle', icon: null },
    connecting: { color: 'var(--warning)', label: 'Connecting…', icon: <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> },
    connected: { color: 'var(--accent)', label: 'Live', icon: <Wifi size={11} /> },
    reconnecting: { color: 'var(--warning)', label: 'Reconnecting…', icon: <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> },
    error: { color: 'var(--danger)', label: 'Error', icon: <AlertTriangle size={11} /> },
    fallback: { color: 'var(--warning)', label: 'Text Mode', icon: <MessageSquare size={11} /> },
};

const parseAiResponse = (rawText: string, defaultSpeaker: string) => {
    const regex = /\[(.*?)\]:\s*/g;
    let match;
    let lastIndex = 0;
    const segments: { speaker: string, text: string }[] = [];
    let currentSpeaker = defaultSpeaker;

    const firstMatch = rawText.match(/^\[(.*?)\]:\s*/);
    if (firstMatch) {
        currentSpeaker = firstMatch[1];
        lastIndex = firstMatch[0].length;
        regex.lastIndex = lastIndex;
    }

    while ((match = regex.exec(rawText)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ speaker: currentSpeaker, text: rawText.substring(lastIndex, match.index).trim() });
        }
        currentSpeaker = match[1];
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < rawText.length) {
        segments.push({ speaker: currentSpeaker, text: rawText.substring(lastIndex).trim() });
    }
    return segments.filter(s => s.text);
};

export default function InterviewRoomPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [session, setSession] = useState<SessionData | null>(null);
    const [connState, setConnState] = useState<ConnectionState>('idle');
    const [userSpeaking, setUserSpeaking] = useState(false);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [activeAiSpeaker, setActiveAiSpeaker] = useState<string | null>(null);
    const [muted, setMuted] = useState(false);
    const [handsFree, setHandsFree] = useState(true);
    const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
    const [interimText, setInterimText] = useState('');  // live speech-to-text preview
    const [captionsOpen, setCaptionsOpen] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [startTime] = useState(new Date());
    const [ending, setEnding] = useState(false);
    const captionsEndRef = useRef<HTMLDivElement>(null); // for auto-scroll

    const loggerRef = useRef(new TranscriptLogger());
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const chatRef = useRef<any>(null);
    const retryCountRef = useRef(0);
    const speechBufferRef = useRef(''); // accumulates ALL spoken words while mic is open (push-to-talk buffer)
    const MAX_RETRIES = 2;

    // ── Text-to-Speech ────────────────────────────────────
    const speakText = useCallback((text: string, speakerName?: string): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            (window as any).__utterance = utterance;

            const backupTimeout = setTimeout(() => {
                resolve();
            }, text.length * 100 + 4000);

            utterance.rate = 1.0;
            utterance.pitch = speakerName === 'Riley' ? 1.1 : 0.95; // slightly higher for female, lower for male
            utterance.volume = 1.0;

            const voices = window.speechSynthesis.getVoices();
            let preferred: SpeechSynthesisVoice | undefined;

            if (speakerName === 'Riley') {
                // Try to find a female voice
                preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Victoria')));
            } else {
                // Try to find a male voice
                preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Arthur')));
            }

            if (!preferred) {
                // Fallback
                preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))) || voices.find((v) => v.lang.startsWith('en'));
            }

            if (preferred) utterance.voice = preferred;

            const onFinish = () => {
                clearTimeout(backupTimeout);
                resolve();
            };

            utterance.onend = onFinish;
            utterance.onerror = onFinish;

            // Slight delay prevents Chrome from skipping speech after cancel
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 50);
        });
    }, []);

    // ── Load session ──────────────────────────────────────
    useEffect(() => {
        if (!sessionId || !user) return;
        getSession(sessionId as string).then((s) => {
            if (s) setSession(s);
        });
    }, [sessionId, user]);

    // ── Connect to Gemini ─────────────────────────────────
    const connect = useCallback(async () => {
        if (!session) return;
        setConnState('connecting');

        try {

            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const sysInstruction = buildSystemInstruction(session.config);
            const chat = model.startChat({
                systemInstruction: { role: 'user', parts: [{ text: sysInstruction }] },
                history: [],
                generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
            });
            chatRef.current = chat;

            // Start with AI greeting
            setConnState('connected');
            retryCountRef.current = 0;

            // Get opening message from AI
            setAiSpeaking(true);
            const result = await chat.sendMessage('BEGIN_INTERVIEW');
            const aiText = result.response.text();

            const defaultSpeaker = ['technical', 'coding'].includes(session.config?.type || '') ? 'Alex' : 'Sam';
            const segments = parseAiResponse(aiText, defaultSpeaker);

            for (const seg of segments) {
                loggerRef.current.startTurn('ai');
                loggerRef.current.appendText(`[${seg.speaker}]: ${seg.text}`);
                loggerRef.current.commitTurn();
            }

            const turns = loggerRef.current.getTurns();
            setTranscript([...turns]);

            for (const seg of segments) {
                setActiveAiSpeaker(seg.speaker);
                await speakText(seg.text, seg.speaker);
            }
            setAiSpeaking(false);
            setActiveAiSpeaker(null);

            // Start mic
            await startMic();
        } catch (e: any) {
            handleConnError(e);
        }
    }, [session]);

    useEffect(() => {
        if (session) connect();
        return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
    }, [session]);

    const handleConnError = async (e: any) => {
        console.error('Connection error:', e);
        if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            setConnState('reconnecting');
            toast.warning(`Reconnecting… attempt ${retryCountRef.current}`);
            setTimeout(() => connect(), 1500);
        } else {
            setConnState('fallback');
            toast.error('Voice unavailable. Switched to text mode — your transcript is preserved.');
        }
    };

    // ── Mic Handling ──────────────────────────────────────
    const recognitionRef = useRef<any>(null);
    const aiSpeakingRef = useRef(false); // mirror of aiSpeaking for use inside recognition callbacks
    const mutedRef = useRef(false);

    // Keep the refs in sync with the state
    useEffect(() => { aiSpeakingRef.current = aiSpeaking; }, [aiSpeaking]);
    useEffect(() => { mutedRef.current = muted; }, [muted]);

    // ── Send message (voice transcript or text fallback) ────
    const sendUserMessage = useCallback(async (text: string) => {
        if (!chatRef.current || !text.trim()) return;
        if (aiSpeakingRef.current) return;

        // Guard against noise: reject fragments under 3 words (e.g. "ing", "uh", "the")
        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount < 3) return;

        aiSpeakingRef.current = true;
        setAiSpeaking(true);
        // Stop recognition while AI is responding to prevent mic echo being captured
        try { recognitionRef.current?.stop(); } catch (_) { }

        const trimmed = text.trim();
        loggerRef.current.startTurn('user');
        loggerRef.current.appendText(trimmed);
        loggerRef.current.commitTurn();

        let aiText = '';
        try {
            const result = await chatRef.current.sendMessage(trimmed);
            aiText = result.response.text();

            const defaultSpeaker = ['technical', 'coding'].includes(session?.config?.type || '') ? 'Alex' : 'Sam';
            const segments = parseAiResponse(aiText, defaultSpeaker);
            for (const seg of segments) {
                loggerRef.current.startTurn('ai');
                loggerRef.current.appendText(`[${seg.speaker}]: ${seg.text}`);
                loggerRef.current.commitTurn();
            }
        } catch (e) {
            loggerRef.current.startTurn('ai');
            loggerRef.current.appendText('[AI response error]');
            loggerRef.current.commitTurn();
        }

        const turns = loggerRef.current.getTurns();
        setTranscript([...turns]);
        updateTranscript(sessionId as string, turns).catch(() => { });

        // Speak the AI reply
        try {
            if (aiText) {
                const defaultSpeaker = ['technical', 'coding'].includes(session?.config?.type || '') ? 'Alex' : 'Sam';
                const segments = parseAiResponse(aiText, defaultSpeaker);
                for (const seg of segments) {
                    setActiveAiSpeaker(seg.speaker);
                    await speakText(seg.text, seg.speaker);
                }
            }
        } finally {
            // ALWAYS reset the lock — even if speakText throws or AI errors
            aiSpeakingRef.current = false;
            setAiSpeaking(false);
            setActiveAiSpeaker(null);
            setInterimText(''); // clear any stale interim text accumulated during AI speech
            // Resume recognition after a short pause to let speakers settle
            setTimeout(() => {
                if (streamRef.current?.active) {
                    try { recognitionRef.current?.start(); } catch (_) { }
                }
            }, 600);
        }
    }, [sessionId, speakText, session]);

    const handleMicToggle = useCallback(() => {
        if (!muted) {
            // ── MUTING: user finished speaking → flush buffer to interviewer ──
            setMuted(true);
            const fullAnswer = speechBufferRef.current.trim();
            speechBufferRef.current = ''; // always clear buffer
            setInterimText('');
            if (fullAnswer) {
                sendUserMessage(fullAnswer);
            }
        } else {
            // ── UNMUTING: user ready to speak → clear any stale buffer and listen ──
            speechBufferRef.current = '';
            setInterimText('');
            setMuted(false);
        }
    }, [muted, sendUserMessage]);

    const startMic = async () => {
        try {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            // ── 1. Audio analyser — drives the waveform animation ──
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setUserSpeaking(avg > 18);
                requestAnimationFrame(tick);
            };
            tick();

            // ── 2. SpeechRecognition — converts user voice → text ──
            const SpeechRecognition =
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                // Browser doesn't support STT — fall back to text input only
                toast.error('Your browser does not support speech recognition. Please use Chrome or Edge.');
                setConnState('fallback');
                return;
            }

            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = true;
            recognition.interimResults = true;    // fire on every word for live captions
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                // Hard stop: ignore everything while AI is speaking or mic is muted
                if (aiSpeakingRef.current || mutedRef.current) {
                    setInterimText('');
                    return;
                }

                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        // Accumulate finalized words into buffer — do NOT auto-send
                        speechBufferRef.current += (speechBufferRef.current ? ' ' : '') + t.trim();
                    } else {
                        interim += t;
                    }
                }

                // Show live preview: buffer so far + any current interim words
                if (!aiSpeakingRef.current) {
                    const preview = (speechBufferRef.current + (interim ? ' ' + interim : '')).trim();
                    setInterimText(preview);
                }
            };

            recognition.onerror = (event: any) => {
                // 'no-speech' is non-fatal — just means the user was quiet
                if (event.error === 'no-speech') return;
                console.warn('SpeechRecognition error:', event.error);
            };

            recognition.onend = () => {
                // Auto-restart unless the session has been deliberately stopped
                if (streamRef.current && streamRef.current.active) {
                    try { recognition.start(); } catch (_) { }
                }
            };

            recognition.start();

        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                toast.error('Microphone access denied. Please allow mic access in your browser settings.');
                setConnState('fallback');
            }
        }
    };

    // ── End Session ────────────────────────────────────────
    const endSession = async () => {
        // Stop any in-progress TTS when session ends
        if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
        // Stop speech recognition
        try { recognitionRef.current?.stop(); } catch (_) { }
        setEnding(true);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const turns = loggerRef.current.getTurns();
        const actualMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
        const status = actualMinutes < (session?.config?.durationMinutes || 30) * 0.8 ? 'ended_early' : 'completed';

        try {
            await updateSession(sessionId as string, {
                status,
                transcript: turns,
            });
            toast.success('Session saved! Generating your debrief…');
            router.push(`/debrief/${sessionId}`);
        } catch (e) {
            toast.error('Could not save session. Redirecting anyway…');
            router.push(`/debrief/${sessionId}`);
        }
    };

    if (!session) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const cfg = stateConfig[connState];
    const interviewerName = session.config?.type === 'hr' ? 'Jordan' : session.config?.type === 'technical' ? 'Alex' : 'Sam';
    const secondName = ['technical', 'coding'].includes(session.config?.type || '') ? 'Riley' : null;

    return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* ── Top Bar ──────────────────────────────────────── */}
            <div style={{ borderBottom: '1px solid var(--border)', background: 'rgba(8,15,11,0.9)', backdropFilter: 'blur(20px)', padding: '0 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{session.config?.type}</span>
                        <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{session.config?.difficulty}</span>
                        <span className="badge" style={{ background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {cfg.icon} {cfg.label}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <TimerBadge startTime={startTime} planned={session.config?.durationMinutes || 60} />
                        <button onClick={() => setCaptionsOpen(!captionsOpen)} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>
                            <MessageSquare size={14} /> Captions
                        </button>
                        <button onClick={endSession} disabled={ending} className="btn-danger" style={{ padding: '8px 16px', fontSize: 13 }}>
                            {ending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneOff size={14} />}
                            End Session
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Stage ───────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', gap: 0 }}>
                {/* Interview Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 40 }}>
                    {/* Avatars */}
                    <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
                        <Avatar speaking={aiSpeaking && (!activeAiSpeaker || activeAiSpeaker === interviewerName)} label={interviewerName} initials={interviewerName[0]} />
                        {secondName && <Avatar speaking={aiSpeaking && activeAiSpeaker === secondName} label={secondName} initials={secondName[0]} />}
                        <Avatar speaking={userSpeaking && !muted} label="You" initials={user?.displayName?.[0] || 'Y'} />
                    </div>

                    {/* Waveform */}
                    <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Volume2 size={16} color="var(--text-muted)" />
                        <Waveform active={aiSpeaking || (userSpeaking && !muted)} />
                        <Mic size={16} color={userSpeaking && !muted ? 'var(--accent)' : 'var(--text-dim)'} />
                    </div>

                    {/* Company badge */}
                    {session.config?.company && (
                        <div className="badge badge-muted" style={{ fontSize: 13 }}>
                            📍 {session.config.company}
                        </div>
                    )}

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handleMicToggle}
                            className={muted ? 'btn-danger' : 'btn-ghost'}
                            style={{ borderRadius: '50%', width: 52, height: 52, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={muted ? 'Unmute' : 'Mute'}
                        >
                            {muted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button
                            onClick={() => setHandsFree(!handsFree)}
                            className={handsFree ? 'btn-primary' : 'btn-ghost'}
                            style={{ padding: '0 20px', height: 52, fontSize: 13 }}
                        >
                            {handsFree ? 'Hands-Free ON' : 'Push to Talk'}
                        </button>
                    </div>

                    {/* Fallback text input */}
                    {connState === 'fallback' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            className="glass-card" style={{ width: '100%', maxWidth: 600, padding: 20 }}>
                            <div className="badge badge-warning" style={{ marginBottom: 12, fontSize: 12 }}>
                                <WifiOff size={11} /> Text mode — voice unavailable
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(textInput); setTextInput(''); } }}
                                    placeholder="Type your answer and press Enter…"
                                    className="input-field"
                                    style={{ flex: 1 }}
                                />
                                <button onClick={() => { sendUserMessage(textInput); setTextInput(''); }} className="btn-primary" style={{ padding: '0 20px' }}>
                                    Send
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── Captions Drawer ───────────────────────────────── */}
                <AnimatePresence>
                    {captionsOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 340, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            style={{
                                borderLeft: '1px solid var(--border)',
                                background: 'rgba(8,15,11,0.97)',
                                display: 'flex',
                                flexDirection: 'column',
                                height: 'calc(100vh - 61px)' // Exactly fit remaining screen space
                            }}
                        >
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Live Transcript</span>
                                <button onClick={() => setCaptionsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div
                                style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
                            >
                                {transcript.length === 0 && !interimText && (
                                    <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', marginTop: 20 }}>
                                        Interview transcript will appear here…
                                    </p>
                                )}
                                {transcript.map((turn, i) => (
                                    <div key={i} style={{
                                        padding: '10px 12px', borderRadius: 10,
                                        background: turn.speaker === 'ai' ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${turn.speaker === 'ai' ? 'var(--border-accent)' : 'var(--border)'}`,
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: turn.speaker === 'ai' ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                                            {turn.speaker === 'ai' ? (turn.text.match(/^\[(.*?)\]:/)?.[1] || interviewerName) : 'You'}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                                            {turn.speaker === 'ai' ? turn.text.replace(/^\[(.*?)\]:\s*/, '') : turn.text}
                                        </div>
                                    </div>
                                ))}

                                {/* Live interim caption — shows words as you speak them */}
                                {interimText && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '10px 12px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px dashed var(--border)',
                                        }}
                                    >
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s ease-in-out infinite' }} />
                                            You — speaking…
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>{interimText}</div>
                                    </motion.div>
                                )}

                                {/* Scroll anchor */}
                                <div ref={captionsEndRef} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
