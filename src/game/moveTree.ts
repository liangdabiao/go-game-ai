import { decodeMoves, type MoveTreeJson } from "goban";
import type { LevelMarks, LevelPuzzle } from "./types";

/** 把 LearningHub 风格的 ["bi"] 等坐标数组转成 goban 用的 move_tree JSON */
export function buildMoveTree(puzzle: LevelPuzzle): MoveTreeJson {
    const root: MoveTreeJson = { x: -1, y: -1, branches: [] };

    const walk = (cur: MoveTreeJson, path: Array<{ x: number; y: number }>, mark: "correct_answer" | "wrong_answer") => {
        let node = cur;
        for (const step of path) {
            let next = node.branches?.find((b) => b.x === step.x && b.y === step.y);
            if (!next) {
                next = { x: step.x, y: step.y, branches: [] };
                node.branches?.push(next);
            }
            node = next;
        }
        node[mark] = true;
    };

    for (const s of puzzle.correct) {
        walk(root, decodeMoves(s, puzzle.width, puzzle.height), "correct_answer");
    }
    for (const s of puzzle.wrong ?? []) {
        walk(root, decodeMoves(s, puzzle.width, puzzle.height), "wrong_answer");
    }
    return root;
}

/** 把简化的 marks 转成 goban config 用的 marks 对象 */
export function buildMarks(marks?: LevelMarks): Record<string, string> | undefined {
    if (!marks) return undefined;
    const out: Record<string, string> = {};
    for (const key of Object.keys(marks) as Array<keyof LevelMarks>) {
        const v = marks[key];
        if (v) out[key] = v;
    }
    return out;
}
