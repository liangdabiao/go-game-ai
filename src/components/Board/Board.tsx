import { useEffect, useRef, useState } from "react";
import { createGoban, type GobanRenderer, type GobanRendererConfig } from "goban";
import { attachEngine } from "../../game/engine";
import { audio } from "../../game/audio";
import { buildMarks, buildMoveTree } from "../../game/moveTree";
import type { Level } from "../../game/types";
import "../../vendor/goban/Goban.css";

interface BoardProps {
    level: Level;
    /** 改这个值会强制重建 goban（用于“重试当前关卡”） */
    resetKey?: number;
    interactive?: boolean;
    onCorrect?: () => void;
    onWrong?: () => void;
    onComplete?: (result: { passed: true; stars: 0 | 1 | 2 | 3; wrongAttempts: number; points: number }) => void;
}

export function Board({
    level,
    resetKey = 0,
    interactive = true,
    onCorrect,
    onWrong,
    onComplete,
}: BoardProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const cbRef = useRef({ onCorrect, onWrong, onComplete });
    cbRef.current = { onCorrect, onWrong, onComplete };
    const [displayWidth, setDisplayWidth] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setDisplayWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const { width, height, initial_state, marks, initial_player } = level.puzzle!;
        const config: GobanRendererConfig = {
            board_div: containerRef.current,
            width,
            height,
            interactive,
            mode: "puzzle",
            initial_player: initial_player ?? "black",
            initial_state,
            marks: buildMarks(marks),
            move_tree: buildMoveTree(level.puzzle!),
            // Fallback keeps the goban constructible even if the container is
            // momentarily 0-width (layout flash / ResizeObserver timing).
            // Without this the effect would bail out, and because the cleanup
            // of the previous run always destroys the goban, the board would
            // disappear and never come back.
            display_width: displayWidth > 0 ? displayWidth : container.clientWidth || 640,
            square_size: "auto",
            puzzle_player_move_mode: "free",
            puzzle_opponent_move_mode: "automatic",
            getPuzzlePlacementSetting: () => ({ mode: "play" as const }),
            player_id: 0,
        } as GobanRendererConfig;

        const goban = createGoban(config);

        // Guard the goban's own error surface. When an illegal move (e.g. a
        // self-capture attempt) is played, the engine calls showMessage() from
        // inside the canvas click handler; if anything in that path throws, the
        // exception escapes as an uncaught error and can take the whole React
        // tree down ("Self-capture is not allowed" → board vanishes).
        const rawShowMessage = goban.showMessage?.bind(goban) as
            | ((...a: unknown[]) => unknown)
            | undefined;
        if (rawShowMessage) {
            goban.showMessage = ((...args: unknown[]) => {
                try {
                    return rawShowMessage(...args);
                } catch (err) {
                    console.warn("[board] showMessage failed", err);
                    return undefined;
                }
            }) as typeof goban.showMessage;
        }

        // Capture detection: snapshot stones before placement, check diff after.
        let prevStoneCount = 0;
        const onMoveMade = (): void => {
            try {
                const cur = goban.engine.board;
                let curCount = 0;
                for (const row of cur) for (const cell of row) if (cell !== 0) curCount++;
                // More stones on board than before + delta == 1 → pure place.
                // Fewer/same stones or delta > 1 → captures happened.
                const delta = curCount - prevStoneCount;
                audio.play(delta < 1 ? "capture" : "place");
                prevStoneCount = curCount;
            } catch (err) {
                console.warn("[board] move-made handler failed", err);
            }
        };
        goban.on("move-made", onMoveMade);

        const detach = attachEngine(goban, level, {
            onCorrect: () => {
                audio.play("correct");
                cbRef.current.onCorrect?.();
            },
            onWrong: () => {
                audio.play("wrong");
                cbRef.current.onWrong?.();
            },
            onComplete: (r) => {
                audio.play("complete");
                cbRef.current.onComplete?.({
                    passed: true,
                    stars: r.stars,
                    wrongAttempts: r.wrongAttempts,
                    points: r.points,
                });
            },
        });

        return () => {
            // Tearing the goban down must never throw: this runs inside a React
            // effect cleanup, where an exception unmounts the entire tree.
            try {
                detach();
            } catch (err) {
                console.warn("[board] detach failed", err);
            }
            try {
                goban.destroy();
            } catch (err) {
                console.warn("[board] goban destroy failed", err);
            }
        };
    }, [level, resetKey, interactive, displayWidth]);

    return <div ref={containerRef} className="go-game-board" />;
}
