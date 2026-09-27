/**
 * Minimal pure-Go rules + greedy fallback AI for the boss duel.
 *
 * Pure functions on plain 2D arrays (0=empty, 1=black, 2=white) so we can
 * evaluate candidate moves WITHOUT mutating the live goban engine. Used to
 * validate MiMo's reply and to produce a sane local move when the LLM call
 * fails or is unreachable (e.g. before the edge function is deployed).
 */

export type Board = ReadonlyArray<ReadonlyArray<number>>;

const DIRS: ReadonlyArray<readonly [number, number]> = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];

export interface StoneGroup {
    color: number;
    stones: Array<[number, number]>;
    liberties: Array<[number, number]>;
}

function cloneBoard(board: Board): number[][] {
    return board.map((row) => row.slice());
}

export function getGroups(board: Board, width: number, height: number): StoneGroup[] {
    const seen: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    const groups: StoneGroup[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const color = board[y][x];
            if (color === 0 || seen[y][x]) continue;
            const stones: Array<[number, number]> = [];
            const libertySet = new Set<string>();
            const queue: Array<[number, number]> = [[x, y]];
            seen[y][x] = true;
            while (queue.length) {
                const [cx, cy] = queue.pop()!;
                stones.push([cx, cy]);
                for (const [dx, dy] of DIRS) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const nc = board[ny][nx];
                    if (nc === 0) libertySet.add(`${nx},${ny}`);
                    else if (nc === color && !seen[ny][nx]) {
                        seen[ny][nx] = true;
                        queue.push([nx, ny]);
                    }
                }
            }
            const liberties: Array<[number, number]> = [];
            for (const key of libertySet) {
                const [lx, ly] = key.split(",").map(Number);
                liberties.push([lx, ly]);
            }
            groups.push({ color, stones, liberties });
        }
    }
    return groups;
}

/**
 * Try placing `color` at (x, y). Returns the resulting board on success,
 * or null if the move is illegal (occupied, or suicide with no capture).
 */
export function simulateMove(
    board: Board,
    x: number,
    y: number,
    color: number,
    width: number,
    height: number,
): number[][] | null {
    if (x < 0 || x >= width || y < 0 || y >= height || board[y][x] !== 0) return null;
    const b = cloneBoard(board);
    b[y][x] = color;
    const opp = color === 1 ? 2 : 1;

    const dirs = DIRS;
    for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (b[ny][nx] !== opp) continue;
        // The whole opponent group on (nx, ny) has no liberties → capture it.
        const g = getGroupAt(b, nx, ny, width, height);
        if (g && g.liberties.length === 0) {
            for (const [sx, sy] of g.stones) b[sy][sx] = 0;
        }
    }

    // After captures, our own group must still have a liberty (no suicide).
    const mine = getGroupAt(b, x, y, width, height);
    if (!mine || mine.liberties.length === 0) return null;
    return b;
}

export function getGroupAt(
    board: Board,
    x: number,
    y: number,
    width: number,
    height: number,
): StoneGroup | null {
    const color = board[y][x];
    if (color === 0) return null;
    for (const g of getGroups(board, width, height)) {
        for (const [sx, sy] of g.stones) {
            if (sx === x && sy === y) return g;
        }
    }
    return null;
}

export function isLegal(
    board: Board,
    x: number,
    y: number,
    color: number,
    width: number,
    height: number,
): boolean {
    return simulateMove(board, x, y, color, width, height) !== null;
}

/** Number of `color` stones removed between `before` and `after`. */
export function countRemoved(before: Board, after: Board, color: number): number {
    let n = 0;
    for (let y = 0; y < before.length; y++) {
        for (let x = 0; x < before[y].length; x++) {
            if (before[y][x] === color && after[y][x] === 0) n++;
        }
    }
    return n;
}

/** Greedy fallback: capture > save atari group > extend > center. */
export function findFallbackMove(
    board: Board,
    width: number,
    height: number,
    color: number,
): { x: number; y: number } | null {
    const opp = color === 1 ? 2 : 1;
    const empty: Array<[number, number]> = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) if (board[y][x] === 0) empty.push([x, y]);

    // 1. Any move that captures stones — prefer the biggest capture.
    let best: { x: number; y: number } | null = null;
    let bestCapture = 0;
    for (const [x, y] of empty) {
        const sim = simulateMove(board, x, y, color, width, height);
        if (!sim) continue;
        const captured = countRemoved(board, sim, opp);
        if (captured > bestCapture) {
            bestCapture = captured;
            best = { x, y };
        }
    }
    if (best) return best;

    // 2. Save own groups in atari: play on a liberty of the largest at-risk group.
    const groups = getGroups(board, width, height);
    const mine = groups
        .filter((g) => g.color === color && g.liberties.length === 1)
        .sort((a, b) => b.stones.length - a.stones.length);
    for (const g of mine) {
        for (const [lx, ly] of g.liberties) {
            if (simulateMove(board, lx, ly, color, width, height)) return { x: lx, y: ly };
        }
    }

    // 3. Extend: prefer a legal point adjacent to my own stones, center-ish.
    const adjacency = new Map<string, number>(); // "x,y" → score
    for (const g of groups) {
        if (g.color !== color) continue;
        for (const [sx, sy] of g.stones) {
            for (const [dx, dy] of DIRS) {
                const nx = sx + dx;
                const ny = sy + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                if (board[ny][nx] !== 0) continue;
                adjacency.set(`${nx},${ny}`, (adjacency.get(`${nx},${ny}`) ?? 0) + 1);
            }
        }
    }
    let extendBest: { x: number; y: number } | null = null;
    let extendScore = 0;
    for (const [x, y] of empty) {
        if (!isLegal(board, x, y, color, width, height)) continue;
        const adj = adjacency.get(`${x},${y}`) ?? 0;
        if (adj > extendScore) {
            extendScore = adj;
            extendBest = { x, y };
        }
    }
    if (extendBest) return extendBest;

    // 4. Center-most legal point.
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    empty.sort(
        (a, b) =>
            Math.abs(a[0] - cx) + Math.abs(a[1] - cy) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)),
    );
    for (const [x, y] of empty) {
        if (isLegal(board, x, y, color, width, height)) return { x, y };
    }
    return null;
}
