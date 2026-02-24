import { NextResponse } from 'next/server';
import { generateDebriefJson } from '@/lib/gemini/debriefGenerator';

export async function POST(req: Request) {
    try {
        const { transcript, sessionMeta, sessionId, userId } = await req.json();

        if (!transcript || !Array.isArray(transcript)) {
            return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
        }

        const debriefJson = await generateDebriefJson(transcript, sessionMeta);

        return NextResponse.json(debriefJson);
    } catch (e: any) {
        console.error('Debrief generation error:', e);
        return NextResponse.json({ error: e.message || 'Generation failed' }, { status: 500 });
    }
}
