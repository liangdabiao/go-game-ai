import { CHAPTERS, LEVELS } from "./levels";
import type { Chapter, GameSave, LevelProgress, LevelResult } from "./types";

const STORAGE_KEY = "go-game:save";
const SAVE_VERSION = 1;

function freshProgress(): Record<string, LevelProgress> {
    const p: Record<string, LevelProgress> = {};
    for (const level of LEVELS) {
        p[level.id] = {
            status: level.order === 1 ? "unlocked" : "locked",
            bestStars: 0,
            attempts: 0,
            bestWrongAttempts: 0,
        };
    }
    return p;
}

function freshSave(): GameSave {
    return {
        version: SAVE_VERSION,
        progress: freshProgress(),
        currentLevelId: LEVELS[0].id,
    };
}

function isValidSave(save: unknown): save is GameSave {
    if (!save || typeof save !== "object") return false;
    const s = save as GameSave;
    if (s.version !== SAVE_VERSION) return false;
    if (typeof s.currentLevelId !== "string") return false;
    if (!s.progress) return false;
    for (const level of LEVELS) {
        const p = s.progress[level.id];
        if (!p || typeof p.bestStars !== "number") return false;
    }
    return true;
}

export function loadSave(): GameSave {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return freshSave();
        const parsed = JSON.parse(raw);
        if (!isValidSave(parsed)) return freshSave();
        // 补齐新增关卡（升级时使用）
        for (const level of LEVELS) {
            if (!parsed.progress[level.id]) {
                parsed.progress[level.id] = {
                    status: level.order === 1 ? "unlocked" : "locked",
                    bestStars: 0,
                    attempts: 0,
                    bestWrongAttempts: 0,
                };
            }
        }
        return parsed;
    } catch {
        return freshSave();
    }
}

export function persistSave(save: GameSave): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
        // 容量满 / 无痕模式：静默忽略
    }
}

export function applyResult(save: GameSave, result: LevelResult): GameSave {
    const next: GameSave = {
        version: save.version,
        currentLevelId: save.currentLevelId,
        progress: { ...save.progress },
    };
    const cur = next.progress[result.levelId];
    if (!cur) return next;

    const bestWrong =
        result.passed && (cur.bestWrongAttempts === 0 || result.wrongAttempts < cur.bestWrongAttempts)
            ? result.wrongAttempts
            : cur.bestWrongAttempts;

    next.progress[result.levelId] = {
        status: result.passed ? "completed" : cur.status,
        bestStars: (Math.max(cur.bestStars, result.stars) as 0 | 1 | 2 | 3),
        attempts: cur.attempts + 1,
        bestWrongAttempts: bestWrong,
        lastPlayedAt: Date.now(),
    };

    if (result.passed) {
        const idx = LEVELS.findIndex((l) => l.id === result.levelId);
        const nxt = LEVELS[idx + 1];
        if (nxt && next.progress[nxt.id]?.status === "locked") {
            next.progress[nxt.id] = { ...next.progress[nxt.id], status: "unlocked" };
            next.currentLevelId = nxt.id;
        }
    }
    persistSave(next);
    return next;
}

export function resetSave(): GameSave {
    const fresh = freshSave();
    persistSave(fresh);
    return fresh;
}

export function totalStars(save: GameSave): number {
    let total = 0;
    for (const level of LEVELS) {
        total += save.progress[level.id]?.bestStars ?? 0;
    }
    return total;
}

export interface ChapterStats {
    total: number;
    completed: number;
    stars: number;
    maxStars: number;
    unlocked: boolean;
    firstUnlockedLevelId?: string;
}

export function chapterStats(chapterId: string, save: GameSave): ChapterStats {
    const levels = LEVELS.filter((l) => l.chapterId === chapterId);
    const total = levels.length;
    let completed = 0;
    let stars = 0;
    let firstUnlockedLevelId: string | undefined;
    for (const lv of levels) {
        const p = save.progress[lv.id];
        if (p?.status === "completed") completed++;
        stars += p?.bestStars ?? 0;
        if (p?.status !== "locked" && !firstUnlockedLevelId) {
            firstUnlockedLevelId = lv.id;
        }
    }
    return {
        total,
        completed,
        stars,
        maxStars: total * 3,
        unlocked: !!firstUnlockedLevelId,
        firstUnlockedLevelId,
    };
}

export function getChapter(chapterId: string): Chapter | undefined {
    return CHAPTERS.find((c) => c.id === chapterId);
}
