/**
 * Board ↔ text codec for the AI duel.
 *
 * The text form is what gets sent to the LLM (MiMo). Column letters and row
 * numbers mirror the rendered goban exactly, so a coordinate the AI replies
 * with maps 1:1 to a board point:
 *
 *   - columns: A,B,C,D,E,F,G,... (Go convention: no "I")
 *   - rows: top row = height, bottom row = 1  (same as goban prettyCoordinates)
 *
 * Internal goban coordinates are (x, y) with x = 0..width-1 (left→right) and
 * y = 0..height-1 with y = 0 at the TOP.
 *
 * Board cell values: 0 = empty, 1 = black, 2 = white (JGOFNumericPlayerColor).
 */

const COL_SEQ = "ABCDEFGHJKLMNOPQRSTUVWXYZ"; // Go convention: no "I"

/** internal (x, y) → "C7" style, e.g. "G2" */
export function xyToCoord(x: number, y: number, height: number): string {
    return COL_SEQ[x] + (height - y);
}

/** "C7" style → internal (x, y). Returns null on malformed/out-of-range input. */
export function parseCoord(coord: string, width: number, height: number): { x: number; y: number } | null {
    if (!coord || coord.length < 2) return null;
    const ch = coord[0].toUpperCase();
    const x = COL_SEQ.indexOf(ch);
    const row = Number.parseInt(coord.slice(1), 10);
    if (x < 0 || x >= width || Number.isNaN(row)) return null;
    const y = height - row;
    if (y < 0 || y >= height) return null;
    return { x, y };
}

/**
 * Render the board as text, e.g. for a 7×7 board:
 *
 *    A B C D E F G
 *  7 . . . . . . .
 *  6 . . . . . . .
 *  ...
 *  1 . . . . . . .
 */
export function serializeBoard(
    board: ReadonlyArray<ReadonlyArray<number>>,
    width: number,
    height: number,
): string {
    const header =
        "  " + Array.from({ length: width }, (_, i) => COL_SEQ[i]).join(" ");
    const lines: string[] = [header];
    for (let y = 0; y < height; y++) {
        const rowNum = height - y;
        let line = `${rowNum < 10 ? " " : ""}${rowNum} `;
        for (let x = 0; x < width; x++) {
            const v = board[y][x];
            line += (v === 1 ? "B" : v === 2 ? "W" : ".") + (x < width - 1 ? " " : "");
        }
        lines.push(line);
    }
    return lines.join("\n");
}

/** All points occupied by a color (for capture counting / move history). */
export function occupiedPoints(
    board: ReadonlyArray<ReadonlyArray<number>>,
    color: number,
): Array<{ x: number; y: number }> {
    const out: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === color) out.push({ x, y });
        }
    }
    return out;
}
