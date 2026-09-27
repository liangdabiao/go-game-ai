/**
 * EdgeOne / Cloudflare Pages Function: proxies the Go board to the MiMo LLM
 * and returns the chosen move. The MiMo API key lives only in `env`, never in
 * the browser bundle.
 *
 * Request body (from src/game/ai/mimoClient.ts):
 *   { boardText, width, height, aiColor, playerColor, targetCaptures,
 *     moveHistory, aiCaptures, playerCaptures, lastError?, locale? }
 *
 * Response: { move: "C4" | "pass" | null, react?: string, review?: string,
 *             comment?: string, error?: string }
 *   react   — one emoji reacting to the opponent's latest move
 *   review  — short assessment of the opponent's move (good / bad)
 *   comment — short reason for the AI's own move
 *
 * Self-contained on purpose (no imports from src/) so the Pages bundler does
 * not need to resolve the app's dependency graph.
 */

const COL_SEQ = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Go convention: no "I"

interface AiMoveBody {
    boardText?: string;
    width?: number;
    height?: number;
    aiColor?: number;
    playerColor?: number;
    targetCaptures?: number;
    moveHistory?: string[];
    aiCaptures?: number;
    playerCaptures?: number;
    lastError?: string;
    locale?: string;
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json; charset=UTF-8",
            "access-control-allow-origin": "*",
            ...extraHeaders,
        },
    });
}

function validCoord(move: string, width: number, height: number): boolean {
    const ch = move[0]?.toUpperCase() ?? "";
    const x = COL_SEQ.indexOf(ch);
    const row = Number.parseInt(move.slice(1), 10);
    if (x < 0 || x >= width || Number.isNaN(row)) return false;
    const y = height - row;
    return y >= 0 && y < height;
}

/** Extract a JSON object from a model reply that may be wrapped in markdown. */
function extractJsonObject(text: string): string | null {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? m[0] : null;
}

export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" },
        });
    }
    if (request.method !== "POST") {
        return json({ error: "method not allowed" }, 405);
    }

    const apiKey = env.DEEPSEEK_API_KEY ?? "";
    if (!apiKey) {
        return json({ error: "server not configured (missing DEEPSEEK_API_KEY)" }, 503);
    }

    let body: AiMoveBody;
    try {
        body = (await request.json()) as AiMoveBody;
    } catch {
        return json({ error: "bad json body" }, 400);
    }

    const width = body.width ?? 7;
    const height = body.height ?? 7;
    const aiColor = body.aiColor ?? 2;
    const playerColor = body.playerColor ?? 1;
    const targetCaptures = body.targetCaptures ?? 3;
    const history = body.moveHistory ?? [];
    const boardText = body.boardText ?? "";
    const aiName = aiColor === 1 ? "Black" : "White";
    const oppName = playerColor === 1 ? "Black" : "White";

    const cols = Array.from({ length: width }, (_, i) => COL_SEQ[i]).join(", ");
    const isZh = (body.locale ?? "zh") === "zh";
    const example = isZh
        ? '{"move":"C4","react":"😏","review":"守角是没错，可你这意图也太好猜了","comment":"我点 C4，先把下边封住"}'
        : '{"move":"C4","react":"😏","review":"Solid corner... almost too predictable","comment":"C4 seals the lower side"}';
    const langLine = isZh
        ? "Write the react/review/comment fields in Simplified Chinese."
        : "Write the react/review/comment fields in English.";
    const systemPrompt = [
        `You are ${aiName} playing Go as an expert. Opponent is ${oppName}.`,
        `Board: ${width}×${height}. Capture-go: the first player to capture ${targetCaptures} opponent stones wins. You are ${aiName}.`,
        `Coordinates: columns are ${cols} (left→right); rows are numbered top→bottom with the TOP row = ${height} and the BOTTOM row = 1. So "A${height}" is the top-left corner and "${COL_SEQ[width - 1]}1" is the bottom-right corner.`,
        "Rules: you may play on any EMPTY point; suicide is illegal; simple ko (an immediate recapture that only repeats the previous board) is illegal.",
        "Personality: you are sharp-tongued and witty (毒舌), but playful, never rude. Mock the opponent's blunders with sarcasm, heap dramatic praise on genuinely good moves.",
        "Reply with ONLY a JSON object and no other text. Required fields:",
        '  - "move": "C4" to play a point, or "pass".',
        '  - "react": exactly ONE single emoji reacting to the opponent\'s latest move (e.g. 😏 😅 🤨 🔥 😤 👍).',
        '  - "review": ONE short, witty, mildly savage sentence about the opponent\'s latest move — tease bad moves with playful sarcasm, over-praise good ones.',
        '  - "comment": ONE short sentence explaining the reason for YOUR chosen move (or why you pass).',
        `Example: ${example}`,
        langLine,
    ].join("\n");

    const userPrompt = [
        history.length
            ? `Move history (newest last): ${history.join(", ")}`
            : "This is the first move of the game.",
        body.lastError ? `Your previous reply was invalid: ${body.lastError}` : "",
        `Captures so far — you (${aiName}): ${body.aiCaptures ?? 0}, opponent (${oppName}): ${body.playerCaptures ?? 0}.`,
        "Current board (B = black, W = white, . = empty):",
        boardText,
        "Your move as JSON:",
    ]
        .filter(Boolean)
        .join("\n");

    const baseUrl = env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
    const model = env.DEEPSEEK_MODEL ?? "deepseek-flash";

    let reply: string | null = null;
    try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.4,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
            }),
        });
        if (!resp.ok) {
            return json({ move: null, error: `MiMo API error: ${resp.status}` });
        }
        const data = (await resp.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        reply = data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
        return json({ move: null, error: `MiMo request failed: ${String(err)}` });
    }

    if (!reply) {
        return json({ move: null, error: "empty MiMo reply" });
    }

    const objText = extractJsonObject(reply);
    if (!objText) {
        return json({ move: null, error: "unparseable reply" });
    }

    let move = "pass";
    let react = "";
    let review = "";
    let comment = "";
    try {
        const obj = JSON.parse(objText) as {
            move?: unknown;
            react?: unknown;
            review?: unknown;
            comment?: unknown;
        };
        if (typeof obj.move === "string" && obj.move.trim()) move = obj.move.trim().toUpperCase();
        if (typeof obj.react === "string") react = obj.react.trim();
        if (typeof obj.review === "string") review = obj.review.trim();
        if (typeof obj.comment === "string") comment = obj.comment.trim();
    } catch {
        return json({ move: null, error: "bad json in reply" });
    }

    if (move !== "pass" && !validCoord(move, width, height)) {
        return json({ move: null, error: `move "${move}" is not a valid point` });
    }

    return json({
        move,
        react: react || undefined,
        review: review.slice(0, 120) || undefined,
        comment: comment.slice(0, 120) || undefined,
    });
}
