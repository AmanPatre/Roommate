import { TranscriptTurn } from '@/types';

// ──────────────────────────────────────────────────────────
//  TranscriptLogger — accumulates turns in memory
//  and syncs to Firestore periodically
// ──────────────────────────────────────────────────────────

export class TranscriptLogger {
    private turns: TranscriptTurn[] = [];
    private pendingTurn: Partial<TranscriptTurn> | null = null;

    startTurn(speaker: 'user' | 'ai') {
        this.pendingTurn = {
            speaker,
            timestamp_start: new Date().toISOString(),
            text: '',
        };
    }

    appendText(text: string) {
        if (this.pendingTurn) {
            this.pendingTurn.text = (this.pendingTurn.text || '') + text;
        }
    }

    commitTurn() {
        if (this.pendingTurn && this.pendingTurn.text?.trim()) {
            this.turns.push({
                speaker: this.pendingTurn.speaker!,
                timestamp_start: this.pendingTurn.timestamp_start!,
                timestamp_end: new Date().toISOString(),
                text: this.pendingTurn.text.trim(),
            });
            this.pendingTurn = null;
        }
    }

    addTurnDirect(turn: TranscriptTurn) {
        this.turns.push(turn);
    }

    getTurns(): TranscriptTurn[] {
        return [...this.turns];
    }

    getLength(): number {
        return this.turns.length;
    }

    reset() {
        this.turns = [];
        this.pendingTurn = null;
    }
}
