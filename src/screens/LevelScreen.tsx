import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "../components/Board/Board";
import { TopBar } from "../components/TopBar";
import { Fireworks } from "../components/Fireworks";
import { getNextLevel } from "../game/levels";
import { applyResult, loadSave, totalPoints, totalStars } from "../game/progress";
import type { GameSave, Level, LevelResult, Locale } from "../game/types";

interface LevelScreenProps {
    level: Level;
    locale?: Locale;
    onBack?: () => void;
    onAdvance?: (nextLevelId: string) => void;
}

export function LevelScreen({ level, locale = "zh", onBack, onAdvance }: LevelScreenProps) {
    const t = useMemo(() => (level.title[locale] ?? level.title.zh), [level, locale]);
    const instruction = useMemo(() => (level.instruction[locale] ?? level.instruction.zh), [level, locale]);

    const [save, setSave] = useState<GameSave>(() => loadSave());
    const [resetKey, setResetKey] = useState(0);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [result, setResult] = useState<LevelResult | null>(null);
    const [wrongFlash, setWrongFlash] = useState(false);

    useEffect(() => {
        setResetKey((k) => k + 1);
        setWrongAttempts(0);
        setResult(null);
    }, [level.id]);

    const progress = save.progress[level.id];
    const stars = totalStars(save);
    const nextLevel = getNextLevel(level.id);

    const handleReset = useCallback(() => {
        setResult(null);
        setResetKey((k) => k + 1);
    }, []);

    const handleWrong = useCallback(() => {
        setWrongAttempts((n) => n + 1);
        setWrongFlash(true);
        window.setTimeout(() => setWrongFlash(false), 400);
        window.setTimeout(() => setResetKey((k) => k + 1), 500);
    }, []);

    const handleComplete = useCallback(
        (r: { passed: true; stars: 0 | 1 | 2 | 3; wrongAttempts: number; points: number }) => {
            const result: LevelResult = { levelId: level.id, ...r };
            setResult(result);
            setSave((s) => applyResult(s, result));
        },
        [level.id],
    );

    const advanceAfterFireworks = useCallback(() => {
        if (nextLevel) onAdvance?.(nextLevel.id);
        else onBack?.();
    }, [nextLevel, onAdvance, onBack]);

    return (
        <div className="level-screen">
            <TopBar
                title={t}
                subtitle={locale === "zh" ? `第 ${level.order} 关` : `Level ${level.order}`}
                totalStars={stars}
                locale={locale}
                onBack={onBack}
            />

            <p className={`instruction ${wrongFlash ? "wrong-flash" : ""}`}>{instruction}</p>

            <Board
                level={level}
                resetKey={resetKey}
                onWrong={handleWrong}
                onComplete={handleComplete}
            />

            <div className="actions">
                <button className="ghost-btn" onClick={handleReset}>
                    {locale === "zh" ? "↻ 重试" : "↻ Retry"}
                </button>
                {wrongAttempts > 0 && !result && (
                    <span className="wrong-count">
                        {locale === "zh"
                            ? `本关错误次数：${wrongAttempts}`
                            : `Wrong: ${wrongAttempts}`}
                    </span>
                )}
                {progress?.status === "completed" && !result && (
                    <span className="best-record">
                        {locale === "zh"
                            ? `已通关 · 最佳 ${progress.bestStars}⭐`
                            : `Done · Best ${progress.bestStars}⭐`}
                    </span>
                )}
            </div>

            {result && result.passed && (
                <Fireworks points={result.points} onDone={advanceAfterFireworks} />
            )}
        </div>
    );
}
