import { useState } from "react";
import { LEVELS } from "../game/levels";
import { chapterStats, getChapter, loadSave, totalStars } from "../game/progress";
import type { GameSave, Locale } from "../game/types";
import { LevelTile } from "../components/LevelTile";
import { TopBar } from "../components/TopBar";

interface ChapterScreenProps {
    chapterId: string;
    locale: Locale;
    onBack: () => void;
    onSelectLevel: (levelId: string) => void;
}

export function ChapterScreen({ chapterId, locale, onBack, onSelectLevel }: ChapterScreenProps): React.ReactElement {
    const [save, setSave] = useState<GameSave>(() => loadSave());
    const chapter = getChapter(chapterId);
    const levels = LEVELS.filter((l) => l.chapterId === chapterId);
    const stars = totalStars(save);
    const stats = chapterStats(chapterId, save);

    const title = chapter
        ? (chapter.title[locale] ?? chapter.title.zh)
        : (locale === "zh" ? "章节" : "Chapter");
    const subtitle = locale === "zh"
        ? `${stats.completed}/${stats.total} 关 · ⭐ ${stats.stars}/${stats.maxStars}`
        : `${stats.completed}/${stats.total} levels · ⭐ ${stats.stars}/${stats.maxStars}`;

    return (
        <div className="chapter-screen">
            <TopBar
                title={title}
                subtitle={subtitle}
                totalStars={stars}
                locale={locale}
                onBack={onBack}
            />
            {chapter && (
                <p className="chapter-description">
                    {chapter.description[locale] ?? chapter.description.zh}
                </p>
            )}
            <div className="level-grid">
                {levels.map((lv) => (
                    <LevelTile
                        key={lv.id}
                        level={lv}
                        progress={save.progress[lv.id]}
                        locale={locale}
                        onSelect={() => {
                            onSelectLevel(lv.id);
                            setSave(loadSave());
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
