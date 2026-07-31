import { useCallback, useState } from "react";
import { LevelScreen } from "./screens/LevelScreen";
import { WorldMapScreen } from "./screens/WorldMapScreen";
import { ChapterScreen } from "./screens/ChapterScreen";
import { LEVELS } from "./game/levels";
import type { Locale } from "./game/types";

const LOCALE_KEY = "go-game:locale";

function detectLocale(): Locale {
    try {
        const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
        if (saved === "zh" || saved === "en") return saved;
    } catch {
        // ignore
    }
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

type View =
    | { kind: "worldmap" }
    | { kind: "chapter"; chapterId: string }
    | { kind: "level"; levelId: string };

function initialView(): View {
    if (typeof location !== "undefined") {
        const m = location.hash.match(/level=([^&]+)/);
        if (m) return { kind: "level", levelId: decodeURIComponent(m[1]) };
    }
    return { kind: "worldmap" };
}

export function App(): React.ReactElement {
    const [locale] = useState<Locale>(detectLocale);
    const [view, setView] = useState<View>(initialView);

    const goWorldMap = useCallback(() => setView({ kind: "worldmap" }), []);
    const goChapter = useCallback((chapterId: string) => setView({ kind: "chapter", chapterId }), []);
    const goLevel = useCallback((levelId: string) => setView({ kind: "level", levelId }), []);

    const renderView = (): React.ReactElement => {
        switch (view.kind) {
            case "worldmap":
                return <WorldMapScreen locale={locale} onSelectChapter={goChapter} />;
            case "chapter": {
                return (
                    <ChapterScreen
                        chapterId={view.chapterId}
                        locale={locale}
                        onBack={goWorldMap}
                        onSelectLevel={goLevel}
                    />
                );
            }
            case "level": {
                const level = LEVELS.find((l) => l.id === view.levelId) ?? LEVELS[0];
                return (
                    <LevelScreen
                        level={level}
                        locale={locale}
                        onBack={() => goChapter(level.chapterId)}
                        onAdvance={goLevel}
                    />
                );
            }
        }
    };

    return (
        <div className="app">
            <main className={view.kind === "level" ? "level-main" : "menu-main"}>
                {renderView()}
            </main>
        </div>
    );
}
