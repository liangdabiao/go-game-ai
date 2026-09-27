/*
 * Chapter 8: 王者荣耀 — 与 DeepSeek 大模型 AI 对战的终极 BOSS 关。
 * 手写章节（非脚本生成）：棋盘在本地，AI 走子由 DeepSeek 决定，
 * 本地仅做合法性与兜底校验（见 src/game/ai/）。
 */
import type { Chapter, Level } from "../types";

export const CHAPTER_ID = "boss";

export const CHAPTER: Chapter = {
    id: "boss",
    title: { zh: "王者荣耀", en: "King of Glory" },
    description: {
        zh: "终极挑战：与 DeepSeek 大模型 AI 对战，先提子者为胜（7×7 → 9×9 → 13×13 → 19×19）",
        en: "Final challenge: duel the DeepSeek AI. First to capture wins (7×7 → 9×9 → 13×13 → 19×19)",
    },
};

interface AiLevelOpts {
    id: string;
    order: number;
    title: { zh: string; en: string };
    instruction: { zh: string; en: string };
    width: number;
    height: number;
    targetCaptures: number;
    maxMoves: number;
}

function aiLevel(opts: AiLevelOpts): Level {
    return {
        id: opts.id,
        chapterId: CHAPTER_ID,
        order: opts.order,
        title: opts.title,
        instruction: opts.instruction,
        kind: "aiGame",
        aiGame: {
            width: opts.width,
            height: opts.height,
            playerColor: "black",
            aiColor: "white",
            targetCaptures: opts.targetCaptures,
            maxMoves: opts.maxMoves,
            komi: 0,
        },
    };
}

const LEVELS: Level[] = [
    aiLevel({
        id: "boss-ai-duel",
        order: 1080,
        title: { zh: "7×7 · 王者对决", en: "7×7 · King's Duel" },
        instruction: {
            zh: "这是最后的荣耀之战。执黑先行，与 DeepSeek 大模型 AI 在 7×7 棋盘上对弈：先提掉对方 10 颗棋子者获胜。在你落子后，AI 会思考并在棋盘上回击。你还有“停一手”和“认输”的选择。",
            en: "The battle for glory. You are Black and play the DeepSeek AI on a 7×7 board: capture 10 enemy stones first to win. After your move, the AI thinks and replies. You may also Pass or Resign.",
        },
        width: 7,
        height: 7,
        targetCaptures: 10,
        maxMoves: 200,
    }),
    aiLevel({
        id: "boss-ai-duel-9",
        order: 1081,
        title: { zh: "9×9 · 王座争锋", en: "9×9 · Throne Bout" },
        instruction: {
            zh: "升级到 9×9 的战场。执黑先行，与 DeepSeek 大模型 AI 对弈：先提掉对方 20 颗棋子者获胜。AI 会点评你的每一步。",
            en: "The battlefield grows to 9×9. You are Black vs the DeepSeek AI: capture 20 enemy stones first to win. The AI comments on every move.",
        },
        width: 9,
        height: 9,
        targetCaptures: 20,
        maxMoves: 400,
    }),
    aiLevel({
        id: "boss-ai-duel-13",
        order: 1082,
        title: { zh: "13×13 · 宗师之战", en: "13×13 · Grandmaster Clash" },
        instruction: {
            zh: "中盘决战。13×13 棋盘上执黑先行，与 DeepSeek 大模型 AI 对弈：先提掉对方 30 颗棋子者获胜。",
            en: "Mid-board duel on 13×13. You are Black vs the DeepSeek AI: capture 30 enemy stones first to win.",
        },
        width: 13,
        height: 13,
        targetCaptures: 30,
        maxMoves: 600,
    }),
    aiLevel({
        id: "boss-ai-duel-19",
        order: 1083,
        title: { zh: "19×19 · 传奇终局", en: "19×19 · Legendary Finale" },
        instruction: {
            zh: "终极满盘对决。19×19 标准棋盘上执黑先行，与 DeepSeek 大模型 AI 对弈：先提掉对方 40 颗棋子者获胜。这是王者的加冕。",
            en: "The full-board finale on 19×19. You are Black vs the DeepSeek AI: capture 40 enemy stones first to win. Claim your crown.",
        },
        width: 19,
        height: 19,
        targetCaptures: 40,
        maxMoves: 800,
    }),
];

export { LEVELS };
