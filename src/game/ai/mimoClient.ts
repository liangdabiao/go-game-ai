/**
 * Client for the MiMo-backed AI move. POSTs the current board (serialized by
 * boardCodec) to the same-origin route `/api/ai-move` — served in dev by the
 * Vite middleware (vite.config.ts) and in production by the Edge Function
 * `functions/api/ai-move.ts`. Any failure (no key configured, network, bad
 * reply) returns null so the caller can fall back to the local greedy AI.
 */

export interface AiMoveRequest {
    boardText: string;
    width: number;
    height: number;
    aiColor: number; // 1 = black, 2 = white
    playerColor: number;
    targetCaptures: number;
    moveHistory: string[];
    aiCaptures: number;
    playerCaptures: number;
    /** If set, sent to the LLM as a hint after an illegal reply (one retry). */
    lastError?: string;
    /** "zh" | "en" — language for react/review/comment. Defaults to zh. */
    locale?: string;
}

export interface AiMoveResult {
    /** A point like "C4", or "pass". */
    move: string;
    /** One emoji reacting to the opponent's latest move. */
    react?: string;
    /** Short assessment of the opponent's move (good / bad). */
    review?: string;
    /** Short reason for the AI's own move. */
    comment?: string;
}

export async function requestAiMove(req: AiMoveRequest): Promise<AiMoveResult | null> {
    try {
        const res = await fetch("/api/ai-move", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) {
            console.warn(`[ai-move] HTTP ${res.status} — MiMo AI 不可用，降级为本地 AI`);
            return null;
        }
        const data = (await res.json()) as {
            move?: unknown;
            react?: unknown;
            review?: unknown;
            comment?: unknown;
        };
        if (typeof data.move !== "string" || data.move.length === 0) {
            console.warn("[ai-move] MiMo 返回了空走子 — 降级为本地 AI");
            return null;
        }
        const result: AiMoveResult = { move: data.move };
        if (typeof data.react === "string") result.react = data.react;
        if (typeof data.review === "string") result.review = data.review;
        if (typeof data.comment === "string") result.comment = data.comment;
        return result;
    } catch (err) {
        // Network offline / no route → caller falls back to local greedy AI.
        console.warn(`[ai-move] 请求失败 — 降级为本地 AI（${String(err)}）`);
        return null;
    }
}
