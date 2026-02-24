import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { SessionData, DebriefJSON, TranscriptTurn } from '@/types';

// ── Sessions ──────────────────────────────────────────────

export async function createSession(sessionId: string, userId: string, data: Partial<SessionData>) {
    await setDoc(doc(db, 'sessions', sessionId), {
        ...data,
        sessionId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as SessionData;
}

export async function updateSession(sessionId: string, data: Partial<SessionData>) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function updateTranscript(sessionId: string, transcript: TranscriptTurn[]) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        transcript,
        updatedAt: serverTimestamp(),
    });
}

export async function saveDebrief(sessionId: string, debriefJson: DebriefJSON) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        debriefJson,
        updatedAt: serverTimestamp(),
    });
}

export async function getUserSessions(userId: string, limitCount = 10): Promise<SessionData[]> {
    const q = query(
        collection(db, 'sessions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as SessionData;
    });
}

// ── User Stats ────────────────────────────────────────────

export async function updateUserStats(userId: string, overallScore: number) {
    const ref = doc(db, 'users', userId, 'stats', 'summary');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            totalSessions: 1,
            avgOverallScore: overallScore,
            lastSession: serverTimestamp(),
        });
    } else {
        const d = snap.data();
        const newTotal = d.totalSessions + 1;
        const newAvg = Math.round((d.avgOverallScore * d.totalSessions + overallScore) / newTotal);
        await updateDoc(ref, {
            totalSessions: newTotal,
            avgOverallScore: newAvg,
            lastSession: serverTimestamp(),
        });
    }
}

export async function getUserStats(userId: string) {
    const snap = await getDoc(doc(db, 'users', userId, 'stats', 'summary'));
    return snap.exists() ? snap.data() : { totalSessions: 0, avgOverallScore: 0 };
}
