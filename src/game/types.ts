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

export interface MultipleChoiceOption {
    value: string;
    label: LocalizedText;
}

export interface LevelMultipleChoice {
    /** 题干（双语） */
    question: LocalizedText;
    /** 选项 */
    options: MultipleChoiceOption[];
    /** 正确选项的 value */
    correctValue: string;
    /** 用于展示的可选棋盘配置（缺省时不画棋盘） */
    board?: {
        width: number;
        height: number;
        initial_state: InitialState;
        marks?: LevelMarks;
    };
}

export interface LevelEndingGame {
    /** 棋盘展示配置（与 puzzle 共用 initial_state / marks / width / height） */
    width: number;
    height: number;
    initial_state: InitialState;
    marks?: LevelMarks;
    /**
     * - "pass"：只读棋盘 + "停一手" 按钮，点击即过关
     * - "stoneRemoval"：进入移死子阶段，玩家点击死子，凑齐 targetRemoval 即过关
     * - "finish"：只读棋盘 + "完成" 按钮，点击即过关
     */
    interaction: "pass" | "stoneRemoval" | "finish";
    /** stoneRemoval 专用：期望被移除的棋子坐标串（goban getStoneRemovalString 格式） */
    targetRemoval?: string;
}

export interface LevelAiGame {
    /** 棋盘尺寸（建议 9×9） */
    width: number;
    height: number;
    /** 玩家执子颜色 */
    playerColor: "black" | "white";
    /** AI 执子颜色 */
    aiColor: "black" | "white";
    /** 提子目标数：先提掉 targetCaptures 颗即获胜 */
    targetCaptures: number;
    /** 步数上限：双方合计走到该数仍未达目标，判负 */
    maxMoves: number;
    /** 贴目补偿，通常取 0（提子制不贴目） */
    komi?: number;
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
    /** puzzle 类型的题面（兼容旧字段） */
    instruction: LocalizedText;
    /** "puzzle" 缺省——在棋盘上落子；"multipleChoice" 走多选题；"endingGame" 走终局教学；"aiGame" 与 AI 对战 */
    kind?: "puzzle" | "multipleChoice" | "endingGame" | "aiGame";
    /** 当 kind === "puzzle" 时有效 */
    puzzle?: LevelPuzzle;
    /** 当 kind === "multipleChoice" 时有效 */
    multipleChoice?: LevelMultipleChoice;
    /** 当 kind === "endingGame" 时有效 */
    endingGame?: LevelEndingGame;
    /** 当 kind === "aiGame" 时有效 */
    aiGame?: LevelAiGame;
}

export type LevelStatus = "locked" | "unlocked" | "completed";

export interface LevelProgress {
    status: LevelStatus;
    bestStars: 0 | 1 | 2 | 3;
    bestPoints: number;
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
