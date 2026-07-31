import type { Locale } from "../game/types";

interface TopBarProps {
    title: string;
    subtitle?: string;
    totalStars: number;
    locale: Locale;
    onBack?: () => void;
}

export function TopBar({ title, subtitle, totalStars, locale, onBack }: TopBarProps): React.ReactElement {
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
            <div className="stars-badge">
                {locale === "zh" ? "⭐ 总星" : "⭐ Stars"}: {totalStars}
            </div>
        </header>
    );
}
