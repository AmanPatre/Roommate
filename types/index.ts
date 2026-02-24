// ──────────────────────────────────────────────────────────
//  Roomate — Core Type Definitions
// ──────────────────────────────────────────────────────────

export type InterviewType = 'hr' | 'technical' | 'coding' | 'behavioral' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Duration = 30 | 60 | 120 | number;
export type SessionStatus = 'in_progress' | 'completed' | 'ended_early';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'fallback';

export interface InterviewConfig {
  type: InterviewType;
  difficulty: Difficulty;
  durationMinutes: Duration;
  company: string;
  companyUrl: string;
  jobDescription: string;
  contextSummary?: string;
  cvUrl?: string;
  coverLetterUrl?: string;
  jdUrl?: string;
}

export interface TranscriptTurn {
  speaker: 'user' | 'ai';
  timestamp_start: string; // ISO string
  timestamp_end: string;   // ISO string
  text: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  status: SessionStatus;
  config: InterviewConfig;
  transcript: TranscriptTurn[];
  debriefJson?: DebriefJSON;
  audioUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ──────────────────────────────────────────────────────────
//  DEBRIEF JSON Schema (STRICT)
// ──────────────────────────────────────────────────────────

export interface DebriefJSON {
  session_summary: {
    session_status: 'ended_early' | 'completed';
    planned_duration_minutes: number;
    actual_duration_minutes: number;
    role_guess: string;
    company: string;
    interview_type: string;
    difficulty: string;
    topics_discussed: { topic: string; notes: string[] }[];
  };
  scores: {
    overall: number;
    communication_clarity: number;
    structure_star: number;
    role_fit: number;
    confidence_delivery: number;
    technical_depth: number;
  };
  strengths: {
    title: string;
    evidence: { timestamp_start: string; timestamp_end: string; quote: string };
    why_it_matters: string;
  }[];
  improvements: {
    title: string;
    issue: string;
    evidence: { timestamp_start: string; timestamp_end: string; quote: string };
    better_answer_example: string;
    micro_exercise: string;
  }[];
  delivery_metrics: {
    filler_word_estimate: number;
    pace_wpm_estimate: number;
    long_pause_estimate: number;
  };
  moments_that_mattered: {
    label: string;
    timestamp_start: string;
    timestamp_end: string;
    reason: string;
  }[];
  practice_plan_7_days: {
    day: number;
    focus: string;
    tasks: string[];
    time_minutes: number;
  }[];
  next_interview_checklist: string[];
  notes_if_low_data: string;
}
