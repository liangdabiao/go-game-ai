import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "../components/Board/Board";
import { TopBar } from "../components/TopBar";
import { Fireworks } from "../components/Fireworks";
import { getNextLevel } from "../game/levels";
import { applyResult, loadSave, totalPoints, totalStars } from "../game/progress";
import { audio } from "../game/audio";
import type { GameSave, Level, LevelResult, Locale } from "../game/types";

interface MultipleChoiceScreenProps {
    level: Level;
    locale?: Locale;
    onBack?: () => void;
    onAdvance?: (nextLevelId: string) => void;
}

export function MultipleChoiceScreen({
    level,
    locale = "zh",
    onBack,
    onAdvance,
}: MultipleChoiceScreenProps): React.ReactElement {
    const mc = level.multipleChoice!;
    const t = useMemo(() => level.title[locale] ?? level.title.zh, [level, locale]);
    const question = mc.question[locale] ?? mc.question.zh;

    const [save, setSave] = useState<GameSave>(() => loadSave());
    const [selected, setSelected] = useState<string | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [result, setResult] = useState<LevelResult | null>(null);
    const [wrongFlash, setWrongFlash] = useState(false);

    useEffect(() => {
        setSelected(null);
        setWrongAttempts(0);
        setResult(null);
        setWrongFlash(false);
    }, [level.id]);

    const progress = save.progress[level.id];
    const stars = totalStars(save);
    const points = totalPoints(save);
    const nextLevel = getNextLevel(level.id);

    const boardLevel = useMemo<Level>(() => {
        if (mc.board) {
            return {
                ...level,
                puzzle: {
                    width: mc.board.width,
                    height: mc.board.height,
                    initial_state: mc.board.initial_state,
                    marks: mc.board.marks,
                    correct: [],
                    wrong: [],
                },
            };
        }
        return { ...level, puzzle: { ...level.puzzle!, correct: [], wrong: [] } };
    }, [level, mc]);

    const submit = useCallback(
        (value: string) => {
            if (result) return;
            setSelected(value);
            if (value === mc.correctValue) {
                audio.play("correct");
                const r: LevelResult = {
                    levelId: level.id,
                    passed: true,
                    stars: wrongAttempts === 0 ? 3 : wrongAttempts === 1 ? 2 : 1,
                    wrongAttempts,
                    points: (wrongAttempts === 0 ? 3 : wrongAttempts === 1 ? 2 : 1) * 100,
                };
                setResult(r);
                setSave((s) => applyResult(s, r));
                audio.play("complete");
            } else {
                audio.play("wrong");
                setWrongAttempts((n) => n + 1);
                setWrongFlash(true);
                window.setTimeout(() => setWrongFlash(false), 400);
            }
        },
        [result, mc.correctValue, level.id, wrongAttempts],
    );

    const handleReset = useCallback(() => {
        setResult(null);
        setSelected(null);
    }, []);

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
                totalPoints={points}
                locale={locale}
                onBack={onBack}
            />

            <p className={`instruction ${wrongFlash ? "wrong-flash" : ""}`}>{question}</p>

            {mc.board && (
                <Board level={boardLevel} interactive={false} />
            )}

            <div className="mc-options">
                {mc.options.map((opt) => {
                    const isSelected = selected === opt.value;
                    const isCorrect = result && opt.value === mc.correctValue;
                    const isWrongPick = isSelected && selected !== mc.correctValue && !result;
                    let cls = "mc-option";
                    if (isCorrect) cls += " correct";
                    else if (isWrongPick) cls += " wrong";
                    else if (selected && !result) cls += " disabled";
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            className={cls}
                            disabled={!!result || !!selected}
                            onClick={() => submit(opt.value)}
                        >
                            <span className="mc-option-label">{opt.label[locale] ?? opt.label.zh}</span>
                        </button>
                    );
                })}
            </div>

            <div className="actions">
                {selected && !result && (
                    <button className="ghost-btn" onClick={handleReset}>
                        {locale === "zh" ? "↻ 重选" : "↻ Reselect"}
                    </button>
                )}
                {wrongAttempts > 0 && !result && (
                    <span className="wrong-count">
                        {locale === "zh" ? `错误：${wrongAttempts}` : `Wrong: ${wrongAttempts}`}
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
