import { useState } from "react";
import type { Locale } from "../game/types";
import { ScorecardDialog } from "./ScorecardDialog";

interface TopBarProps {
    title: string;
    subtitle?: string;
    totalStars: number;
    totalPoints: number;
    locale: Locale;
    onBack?: () => void;
}

export function TopBar({ title, subtitle, totalStars, totalPoints, locale, onBack }: TopBarProps): React.ReactElement {
    const [scorecardOpen, setScorecardOpen] = useState(false);

    return (
        <header className="topbar">
            {onBack ? (
                <button className="ghost-btn topbar-back" onClick={onBack}>
                    {locale === "zh" ? "← 返回" : "← Back"}
                </button>
            ) : (
                <span className="topbar-spacer" />
            )}
            <div className="topbar-title">
                {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
                <h2>{title}</h2>
            </div>
            <div className="topbar-badges">
                <span className="stars-badge">
                    {locale === "zh" ? "⭐" : "⭐"} {totalStars}
                </span>
                <button
                    className="points-badge"
                    onClick={() => setScorecardOpen(true)}
                    title={locale === "zh" ? "查看成绩单" : "View scorecard"}
                >
                    🏆 +{totalPoints}
                </button>
            </div>
            {scorecardOpen && (
                <ScorecardDialog locale={locale} onClose={() => setScorecardOpen(false)} />
            )}
        </header>
    );
}
