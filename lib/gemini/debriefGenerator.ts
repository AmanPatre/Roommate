import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptTurn, DebriefJSON, SessionData } from '@/types';

const DEBRIEF_SCHEMA = `{
  "session_summary": {
    "session_status": "ended_early|completed",
    "planned_duration_minutes": 0,
    "actual_duration_minutes": 0,
    "role_guess": "",
    "company": "",
    "interview_type": "",
    "difficulty": "",
    "topics_discussed": [{"topic": "", "notes": [""]}]
  },
  "scores": {
    "overall": 0,
    "communication_clarity": 0,
    "structure_star": 0,
    "role_fit": 0,
    "confidence_delivery": 0,
    "technical_depth": 0
  },
  "strengths": [
    {
      "title": "",
      "evidence": {"timestamp_start": "", "timestamp_end": "", "quote": ""},
      "why_it_matters": ""
    }
  ],
  "improvements": [
    {
      "title": "",
      "issue": "",
      "evidence": {"timestamp_start": "", "timestamp_end": "", "quote": ""},
      "better_answer_example": "",
      "micro_exercise": ""
    }
  ],
  "delivery_metrics": {
    "filler_word_estimate": 0,
    "pace_wpm_estimate": 0,
    "long_pause_estimate": 0
  },
  "moments_that_mattered": [
    {"label": "", "timestamp_start": "", "timestamp_end": "", "reason": ""}
  ],
  "practice_plan_7_days": [
    {"day": 1, "focus": "", "tasks": [""], "time_minutes": 0}
  ],
  "next_interview_checklist": [""],
  "notes_if_low_data": ""
}`;

export async function generateDebriefJson(
  transcript: TranscriptTurn[],
  sessionMeta: Partial<SessionData>
): Promise<DebriefJSON> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const hasEnoughData = transcript.filter((t) => t.speaker === 'user').length >= 2;
  const scoringNote = hasEnoughData
    ? 'The candidate has provided enough responses. ALL scores MUST be between 1–100. Never return 0 for any score.'
    : 'Session was very short. Still return valid scores (1–100). Fill notes_if_low_data with a helpful message.';

  const prompt = `
You are a world-class interview coach and evaluator. Analyze the interview transcript below and return a SINGLE valid JSON object matching the exact schema provided.

${scoringNote}

RULES:
- Return ONLY raw JSON. No markdown fences, no explanation, no comments.
- All timestamp values must reference actual timestamps from the transcript.
- Provide at least 2 strengths and 2 improvements (or 1 each if truly minimal session).
- Practice plan must cover all 7 days.
- Checklist must have at least 5 items.

SESSION META:
${JSON.stringify(sessionMeta, null, 2)}

TRANSCRIPT:
${JSON.stringify(transcript, null, 2)}

SCHEMA (return EXACTLY this structure):
${DEBRIEF_SCHEMA}
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return JSON.parse(cleaned) as DebriefJSON;
}
