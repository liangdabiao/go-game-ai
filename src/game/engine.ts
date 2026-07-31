import type { GobanRenderer } from "goban";
import type { Level, LevelResult } from "./types";

export interface EngineCallbacks {
    onCorrect?: () => void;
    onWrong?: () => void;
    onComplete?: (result: LevelResult) => void;
}

export function computeStars(wrongAttempts: number): 0 | 1 | 2 | 3 {
    if (wrongAttempts === 0) return 3;
    if (wrongAttempts === 1) return 2;
    return 1;
}

export function pointsForStars(stars: 0 | 1 | 2 | 3): number {
    return stars * 100;
}

/** 把 goban 的 puzzle 事件转成 LevelResult；返回 detach 函数。 */
export function attachEngine(goban: GobanRenderer, level: Level, cb: EngineCallbacks): () => void {
    let wrongAttempts = 0;
    let settled = false;

    const onCorrect = () => {
        cb.onCorrect?.();
        if (settled) return;
        settled = true;
        const stars = computeStars(wrongAttempts);
        cb.onComplete?.({
            levelId: level.id,
            passed: true,
            stars,
            wrongAttempts,
            points: pointsForStars(stars),
        });
    };
    const onWrong = () => {
        if (settled) return;
        wrongAttempts += 1;
        cb.onWrong?.();
    };

    goban.on("puzzle-correct-answer", onCorrect);
    goban.on("puzzle-wrong-answer", onWrong);

    return () => {
        goban.off("puzzle-correct-answer", onCorrect);
        goban.off("puzzle-wrong-answer", onWrong);
    };
}
