export type Locale = "zh" | "en";

export interface LocalizedText {
    zh: string;
    en: string;
}

export type CoordString = string;

export interface InitialState {
    black: CoordString;
    white: CoordString;
}

export interface LevelMarks {
    triangle?: CoordString;
    square?: CoordString;
    circle?: CoordString;
    cross?: CoordString;
    /** Any other key places a letter/number label at the given coords
     *  (goban supports arbitrary single-character marks). */
    [label: string]: CoordString | undefined;
}

export interface LevelPuzzle {
    width: number;
    height: number;
    /** "black" 或 "white"，决定玩家执子颜色；缺省时引擎默认 black */
    initial_player?: "black" | "white";
    initial_state: InitialState;
    marks?: LevelMarks;
    /** 每个元素是一串连续正确着法（单步关卡就是单元素数组）。任意一条路径走完即过关。 */
    correct: CoordString[];
    /** 错误着法（单步坐标串），落到即扣星 */
    wrong?: CoordString[];
}

export interface Chapter {
    id: string;
    title: LocalizedText;
    description: LocalizedText;
}

export interface Level {
    id: string;
    chapterId: string;
    /** 全局顺序，从 1 开始；决定解锁次序 */
    order: number;
    title: LocalizedText;
    instruction: LocalizedText;
    puzzle: LevelPuzzle;
}

export type LevelStatus = "locked" | "unlocked" | "completed";

export interface LevelProgress {
    status: LevelStatus;
    bestStars: 0 | 1 | 2 | 3;
    attempts: number;
    bestWrongAttempts: number;
    lastPlayedAt?: number;
}

export interface GameSave {
    version: number;
    progress: Record<string, LevelProgress>;
    currentLevelId: string;
}

export interface LevelResult {
    levelId: string;
    passed: boolean;
    stars: 0 | 1 | 2 | 3;
    wrongAttempts: number;
    points: number;
}
