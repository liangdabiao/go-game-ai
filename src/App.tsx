import { useCallback, useEffect, useState } from "react";
import { LevelScreen } from "./screens/LevelScreen";
import { MultipleChoiceScreen } from "./screens/MultipleChoiceScreen";
import { EndingGameScreen } from "./screens/EndingGameScreen";
import { WorldMapScreen } from "./screens/WorldMapScreen";
import { ChapterScreen } from "./screens/ChapterScreen";
import { SettingsDialog } from "./components/SettingsDialog";
import { LEVELS } from "./game/levels";
import { loadLocale } from "./game/preferences";
import { audio } from "./game/audio";
import { bgm } from "./game/bgm";
import type { Locale } from "./game/types";

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
    const [locale, setLocale] = useState<Locale>(loadLocale);
    const [view, setView] = useState<View>(initialView);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    useEffect(() => {
        const unlock = () => {
            audio.unlock();
            bgm.unlock();
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, []);

    const goWorldMap = useCallback(() => setView({ kind: "worldmap" }), []);
    const goChapter = useCallback((chapterId: string) => setView({ kind: "chapter", chapterId }), []);
    const goLevel = useCallback((levelId: string) => setView({ kind: "level", levelId }), []);

    const handleReset = useCallback(() => {
        setSettingsOpen(false);
        setResetKey((k) => k + 1);
        setView({ kind: "worldmap" });
    }, []);

    const renderView = (): React.ReactElement => {
        switch (view.kind) {
            case "worldmap":
                return <WorldMapScreen key={resetKey} locale={locale} onSelectChapter={goChapter} />;
            case "chapter": {
                return (
                    <ChapterScreen
                        key={`${resetKey}-${view.chapterId}`}
                        chapterId={view.chapterId}
                        locale={locale}
                        onBack={goWorldMap}
                        onSelectLevel={goLevel}
                    />
                );
            }
            case "level": {
                const level = LEVELS.find((l) => l.id === view.levelId) ?? LEVELS[0];
                const back = () => goChapter(level.chapterId);
                if (level.kind === "multipleChoice") {
                    return (
                        <MultipleChoiceScreen
                            level={level}
                            locale={locale}
                            onBack={back}
                            onAdvance={goLevel}
                        />
                    );
                }
                if (level.kind === "endingGame") {
                    return (
                        <EndingGameScreen
                            level={level}
                            locale={locale}
                            onBack={back}
                            onAdvance={goLevel}
                        />
                    );
                }
                return (
                    <LevelScreen
                        level={level}
                        locale={locale}
                        onBack={back}
                        onAdvance={goLevel}
                    />
                );
            }
        }
    };

    return (
        <div className="app">
            <button
                className="settings-fab"
                onClick={() => setSettingsOpen(true)}
                aria-label={locale === "zh" ? "设置" : "Settings"}
                title={locale === "zh" ? "设置" : "Settings"}
            >
                ⚙
            </button>
            <main className={view.kind === "level" ? "level-main" : "menu-main"}>
                {renderView()}
            </main>
            {settingsOpen && (
                <SettingsDialog
                    locale={locale}
                    onLocaleChange={setLocale}
                    onClose={() => setSettingsOpen(false)}
                    onReset={handleReset}
                />
            )}
        </div>
    );
}
