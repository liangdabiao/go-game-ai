import { StarRow } from "./StarRow";
import type { Level, LevelProgress, Locale } from "../game/types";

interface LevelTileProps {
    level: Level;
    progress: LevelProgress | undefined;
    locale: Locale;
    onSelect: () => void;
}

export function LevelTile({ level, progress, locale, onSelect }: LevelTileProps): React.ReactElement {
    const status = progress?.status ?? "locked";
    const stars = progress?.bestStars ?? 0;

    return (
        <button
            className={`level-tile ${status}`}
            onClick={status === "locked" ? undefined : onSelect}
            disabled={status === "locked"}
            title={level.title[locale] ?? level.title.en}
        >
            <div className="level-tile-content">
                {status === "locked" ? (
                    <span className="level-tile-lock">🔒</span>
                ) : (
                    <span className="level-tile-no">{level.order}</span>
                )}
            </div>
            <StarRow count={stars} size="sm" />
        </button>
    );
}
