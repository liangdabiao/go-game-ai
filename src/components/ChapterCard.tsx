import type { Chapter } from "../game/types";
import type { ChapterStats } from "../game/progress";

interface ChapterCardProps {
    chapter: Chapter;
    stats: ChapterStats;
    locale: "zh" | "en";
    onSelect: () => void;
}

export function ChapterCard({ chapter, stats, locale, onSelect }: ChapterCardProps): React.ReactElement {
    const title = chapter.title[locale] ?? chapter.title.zh;
    const desc = chapter.description[locale] ?? chapter.description.zh;
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const locked = !stats.unlocked;

    return (
        <button
            className={`chapter-card ${locked ? "locked" : ""}`}
            onClick={locked ? undefined : onSelect}
            disabled={locked}
            aria-label={title}
        >
            <div className="chapter-card-head">
                <h3 className="chapter-title">{title}</h3>
                {locked && <span className="chapter-lock">🔒</span>}
            </div>
            <p className="chapter-desc">{desc}</p>
            <div className="chapter-progress">
                <div className="chapter-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="chapter-stats">
                <span>
                    {locale === "zh" ? "关卡" : "Levels"}: {stats.completed}/{stats.total}
                </span>
                <span className="chapter-stars">
                    ⭐ {stats.stars}/{stats.maxStars}
                </span>
            </div>
        </button>
    );
}
