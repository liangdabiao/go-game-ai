import { useMemo } from "react";
import { CHAPTERS, LEVELS } from "../game/levels";
import { chapterStats, loadSave, maxPoints, totalPoints, totalStars } from "../game/progress";
import type { Locale } from "../game/types";

interface ScorecardDialogProps {
    locale: Locale;
    onClose: () => void;
}

export function ScorecardDialog({ locale, onClose }: ScorecardDialogProps): React.ReactElement {
    const save = useMemo(() => loadSave(), []);
    const allLevels = LEVELS.length;
    const completed = useMemo(
        () => CHAPTERS.reduce((sum, c) => sum + chapterStats(c.id, save).completed, 0),
        [save],
    );
    const stars = totalStars(save);
    const maxStars = allLevels * 3;
    const points = totalPoints(save);
    const maxPts = maxPoints();

    const pct = maxPts > 0 ? Math.round((points / maxPts) * 100) : 0;

    const rank =
        pct >= 95
            ? locale === "zh"
                ? "围棋宗师"
                : "Go Master"
            : pct >= 80
              ? locale === "zh"
                  ? "业余高段"
                  : "Advanced Amateur"
              : pct >= 50
                ? locale === "zh"
                    ? "业余中级"
                    : "Intermediate"
                : pct >= 20
                  ? locale === "zh"
                      ? "入门学徒"
                      : "Apprentice"
                  : locale === "zh"
                    ? "初学者"
                    : "Beginner";

    return (
        <div className="result-overlay settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="result-card settings-card scorecard-card" onClick={(e) => e.stopPropagation()}>
                <div className="result-title">
                    {locale === "zh" ? "成绩单" : "Scorecard"}
                </div>

                <div className="scorecard-rank">
                    <span className="scorecard-rank-label">
                        {locale === "zh" ? "当前段位" : "Rank"}
                    </span>
                    <span className="scorecard-rank-value">{rank}</span>
                </div>

                <div className="scorecard-overall">
                    <div className="scorecard-stat">
                        <span className="scorecard-stat-num">{completed}</span>
                        <span className="scorecard-stat-lbl">
                            {locale === "zh" ? `通关 / ${allLevels}` : `Done / ${allLevels}`}
                        </span>
                    </div>
                    <div className="scorecard-stat">
                        <span className="scorecard-stat-num">⭐ {stars}</span>
                        <span className="scorecard-stat-lbl">
                            {locale === "zh" ? `星 / ${maxStars}` : `Stars / ${maxStars}`}
                        </span>
                    </div>
                    <div className="scorecard-stat">
                        <span className="scorecard-stat-num points">+{points}</span>
                        <span className="scorecard-stat-lbl">
                            {locale === "zh" ? `积分 / ${maxPts}` : `Pts / ${maxPts}`}
                        </span>
                    </div>
                </div>

                <div className="scorecard-bar-wrap">
                    <div className="scorecard-bar" style={{ width: `${pct}%` }} />
                    <span className="scorecard-bar-text">{pct}%</span>
                </div>

                <div className="scorecard-chapters">
                    {CHAPTERS.map((c) => {
                        const s = chapterStats(c.id, save);
                        return (
                            <div key={c.id} className={`scorecard-row ${s.completed === s.total ? "done" : ""}`}>
                                <span className="scorecard-ch-name">
                                    {c.title[locale] ?? c.title.zh}
                                </span>
                                <span className="scorecard-ch-progress">
                                    {s.completed}/{s.total}
                                </span>
                                <span className="scorecard-ch-stars">
                                    ⭐ {s.stars}/{s.maxStars}
                                </span>
                                <span className="scorecard-ch-points">
                                    +{s.points}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="result-actions">
                    <button className="primary-btn" onClick={onClose}>
                        {locale === "zh" ? "关闭" : "Close"}
                    </button>
                </div>
            </div>
        </div>
    );
}
