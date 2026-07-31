import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGoban, type GobanRenderer, type GobanRendererConfig } from "goban";
import { TopBar } from "../components/TopBar";
import { Fireworks } from "../components/Fireworks";
import { getNextLevel } from "../game/levels";
import { applyResult, loadSave, totalPoints, totalStars } from "../game/progress";
import { audio } from "../game/audio";
import { buildMarks } from "../game/moveTree";
import type { GameSave, Level, LevelResult, Locale } from "../game/types";
import "../vendor/goban/Goban.css";

interface EndingGameScreenProps {
    level: Level;
    locale?: Locale;
    onBack?: () => void;
    onAdvance?: (nextLevelId: string) => void;
}

export function EndingGameScreen({
    level,
    locale = "zh",
    onBack,
    onAdvance,
}: EndingGameScreenProps): React.ReactElement {
    const eg = level.endingGame!;
    const t = useMemo(() => level.title[locale] ?? level.title.zh, [level, locale]);
    const instruction = level.instruction[locale] ?? level.instruction.zh;

    const [save, setSave] = useState<GameSave>(() => loadSave());
    const [result, setResult] = useState<LevelResult | null>(null);
    const [displayWidth, setDisplayWidth] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setResult(null);
        setResetKey((k) => k + 1);
    }, [level.id]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setDisplayWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const progress = save.progress[level.id];
    const stars = totalStars(save);
    const nextLevel = getNextLevel(level.id);

    const complete = useCallback(() => {
        const r: LevelResult = {
            levelId: level.id,
            passed: true,
            stars: 3,
            wrongAttempts: 0,
            points: 300,
        };
        setResult(r);
        setSave((s) => applyResult(s, r));
        audio.play("complete");
    }, [level.id]);

    useEffect(() => {
        if (!containerRef.current || displayWidth === 0) return;

        const isStoneRemoval = eg.interaction === "stoneRemoval";
        const config: GobanRendererConfig = {
            board_div: containerRef.current,
            width: eg.width,
            height: eg.height,
            interactive: !isStoneRemoval ? false : true,
            mode: isStoneRemoval ? "play" : "puzzle",
            ...(isStoneRemoval ? { phase: "stone removal" as const } : {}),
            initial_player: "black",
            initial_state: eg.initial_state,
            marks: buildMarks(eg.marks),
            display_width: displayWidth,
            square_size: "auto",
            player_id: 0,
            players: {
                black: { id: 0, username: "black" },
                white: { id: 1, username: "white" },
            },
        } as GobanRendererConfig;

        if (!isStoneRemoval) {
            // For pass/finish pages, show a static board with no moves.
            (config as Record<string, unknown>).move_tree = { x: -1, y: -1, branches: [] };
        }

        const goban = createGoban(config);

        // go-ban's CanvasRenderer tries to call socket.send() on stone-removal
        // clicks; in single-player we have no server. Stub it out.
        if (isStoneRemoval) {
            (goban as unknown as { socket: { send: () => void } }).socket = {
                send: () => {
                    /* no-op */
                },
            };
        }

        let detach: (() => void) | null = null;
        if (isStoneRemoval && eg.targetRemoval) {
            const target = eg.targetRemoval;
            const onUpdate = () => {
                const cur = (goban.engine as unknown as { getStoneRemovalString(): string })
                    .getStoneRemovalString();
                if (cur === target) {
                    audio.play("correct");
                    complete();
                }
            };
            goban.on("stone-removal.updated", onUpdate);
            detach = () => goban.off("stone-removal.updated", onUpdate);
        }

        return () => {
            detach?.();
            goban.destroy();
        };
    }, [level.id, eg, displayWidth, resetKey, complete]);

    const handleReset = useCallback(() => {
        setResult(null);
        setResetKey((k) => k + 1);
    }, []);

    const advanceAfterFireworks = useCallback(() => {
        if (nextLevel) onAdvance?.(nextLevel.id);
        else onBack?.();
    }, [nextLevel, onAdvance, onBack]);

    const buttonLabel = useMemo(() => {
        if (eg.interaction === "pass") return locale === "zh" ? "停一手 (Pass)" : "Pass";
        if (eg.interaction === "finish") return locale === "zh" ? "完成" : "Finish";
        return null;
    }, [eg.interaction, locale]);

    return (
        <div className="level-screen">
            <TopBar
                title={t}
                subtitle={locale === "zh" ? `第 ${level.order} 关` : `Level ${level.order}`}
                totalStars={stars}
                locale={locale}
                onBack={onBack}
            />

            <p className="instruction">{instruction}</p>

            <div ref={containerRef} className="go-game-board" />

            <div className="actions">
                {buttonLabel && !result && (
                    <button className="primary-btn" onClick={complete}>
                        {buttonLabel}
                    </button>
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
