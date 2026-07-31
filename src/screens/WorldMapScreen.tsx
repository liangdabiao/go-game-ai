import { useState } from "react";
import { CHAPTERS, LEVELS } from "../game/levels";
import { chapterStats, loadSave, totalPoints, totalStars } from "../game/progress";
import type { GameSave, Locale } from "../game/types";
import { ChapterCard } from "../components/ChapterCard";
import { TopBar } from "../components/TopBar";

interface WorldMapScreenProps {
    locale: Locale;
    onSelectChapter: (chapterId: string) => void;
}

export function WorldMapScreen({ locale, onSelectChapter }: WorldMapScreenProps): React.ReactElement {
    const [save, setSave] = useState<GameSave>(() => loadSave());
    const stars = totalStars(save);
    const points = totalPoints(save);

    return (
        <div className="worldmap-screen">
            <TopBar
                title={locale === "zh" ? "章节地图" : "Chapter Map"}
                subtitle={locale === "zh" ? `${LEVELS.length} 关 · ${CHAPTERS.length} 章` : `${LEVELS.length} levels · ${CHAPTERS.length} chapters`}
                totalStars={stars}
                totalPoints={points}
                locale={locale}
            />
            <div className="chapter-list">
                {CHAPTERS.map((chapter) => {
                    const stats = chapterStats(chapter.id, save);
                    return (
                        <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            stats={stats}
                            locale={locale}
                            onSelect={() => {
                                if (stats.firstUnlockedLevelId) {
                                    onSelectChapter(chapter.id);
                                    // refresh in case progress changed elsewhere
                                    setSave(loadSave());
                                }
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
