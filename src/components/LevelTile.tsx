import { StarRow } from "./StarRow";
import type { Level, LevelProgress, Locale } from "../game/types";

interface LevelTileProps {
    level: Level;
    progress: LevelProgress | undefined;
    locale: Locale;
    justUnlocked?: boolean;
    onSelect: () => void;
}

export function LevelTile({ level, progress, locale, justUnlocked, onSelect }: LevelTileProps): React.ReactElement {
    // 锁已全部放开：缺失进度记录时同样按可进入处理，避免残留锁图标
    const status = progress?.status ?? "unlocked";
    const stars = progress?.bestStars ?? 0;
    const isNew = justUnlocked && status === "unlocked";
    // AI 对战关用棋盘尺寸做标签（如 "7×7"），其余关卡显示全局序号
    const label =
        level.kind === "aiGame" && level.aiGame
            ? `${level.aiGame.width}×${level.aiGame.height}`
            : String(level.order);

    return (
        <button
            className={`level-tile ${status}${isNew ? " just-unlocked" : ""}`}
            onClick={status === "locked" ? undefined : onSelect}
            disabled={status === "locked"}
            title={level.title[locale] ?? level.title.en}
        >
            <div className="level-tile-content">
                {status === "locked" ? (
                    <span className="level-tile-lock">🔒</span>
                ) : (
                    <span className="level-tile-no">{label}</span>
                )}
            </div>
            <StarRow count={stars} size="sm" />
        </button>
    );
}
