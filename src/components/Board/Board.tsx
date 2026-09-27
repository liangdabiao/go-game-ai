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
        if (!containerRef.current || displayWidth === 0) return;

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
            display_width: displayWidth,
            square_size: "auto",
            puzzle_player_move_mode: "free",
            puzzle_opponent_move_mode: "automatic",
            getPuzzlePlacementSetting: () => ({ mode: "play" as const }),
            player_id: 0,
        } as GobanRendererConfig;

        const goban = createGoban(config);

        // Capture detection: snapshot stones before placement, check diff after.
        let prevStoneCount = 0;
        const onMoveMade = (): void => {
            const cur = goban.engine.board;
            let curCount = 0;
            for (const row of cur) for (const cell of row) if (cell !== 0) curCount++;
            // More stones on board than before + delta == 1 → pure place.
            // Fewer/same stones or delta > 1 → captures happened.
            const delta = curCount - prevStoneCount;
            audio.play(delta < 1 ? "capture" : "place");
            prevStoneCount = curCount;
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
            detach();
            goban.destroy();
        };
    }, [level, resetKey, interactive, displayWidth]);

    return <div ref={containerRef} className="go-game-board" />;
}
