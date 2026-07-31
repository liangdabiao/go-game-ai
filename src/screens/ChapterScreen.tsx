import { useState } from "react";
import { LEVELS } from "../game/levels";
import { chapterStats, getChapter, loadSave, totalPoints, totalStars } from "../game/progress";
import type { GameSave, Locale } from "../game/types";
import { LevelTile } from "../components/LevelTile";
import { TopBar } from "../components/TopBar";

const JUST_UNLOCKED_KEY = "go-game:just-unlocked";

function consumeJustUnlocked(chapterId: string): string | null {
    try {
        const id = sessionStorage.getItem(JUST_UNLOCKED_KEY);
        if (!id) return null;
        const lv = LEVELS.find((l) => l.id === id);
        if (lv?.chapterId !== chapterId) return null;
        sessionStorage.removeItem(JUST_UNLOCKED_KEY);
        return id;
    } catch {
        return null;
    }
}

interface ChapterScreenProps {
    chapterId: string;
    locale: Locale;
    onBack: () => void;
    onSelectLevel: (levelId: string) => void;
}

export function ChapterScreen({ chapterId, locale, onBack, onSelectLevel }: ChapterScreenProps): React.ReactElement {
    const [save, setSave] = useState<GameSave>(() => loadSave());
    const [justUnlockedId] = useState<string | null>(() => consumeJustUnlocked(chapterId));
    const chapter = getChapter(chapterId);
    const levels = LEVELS.filter((l) => l.chapterId === chapterId);
    const stars = totalStars(save);
    const points = totalPoints(save);
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
                totalPoints={points}
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
                        justUnlocked={lv.id === justUnlockedId}
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
