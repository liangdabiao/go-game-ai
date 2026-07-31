import { useState } from "react";
import { resetSave } from "../game/progress";
import {
    loadLocale,
    saveLocale,
    loadSoundEnabled,
    saveSoundEnabled,
    loadBgmEnabled,
    saveBgmEnabled,
} from "../game/preferences";
import type { Locale } from "../game/types";

interface SettingsDialogProps {
    locale: Locale;
    onLocaleChange: (locale: Locale) => void;
    onClose: () => void;
    onReset: () => void;
}

export function SettingsDialog({
    locale,
    onLocaleChange,
    onClose,
    onReset,
}: SettingsDialogProps): React.ReactElement {
    const [currentLocale, setCurrentLocale] = useState<Locale>(locale);
    const [sound, setSound] = useState<boolean>(loadSoundEnabled());
    const [bgmOn, setBgmOn] = useState<boolean>(loadBgmEnabled());
    const [confirmReset, setConfirmReset] = useState(false);

    const pickLocale = (l: Locale) => {
        setCurrentLocale(l);
        saveLocale(l);
        onLocaleChange(l);
    };

    const toggleSound = () => {
        const next = !sound;
        setSound(next);
        saveSoundEnabled(next);
    };

    const toggleBgm = () => {
        const next = !bgmOn;
        setBgmOn(next);
        saveBgmEnabled(next);
    };

    const doReset = () => {
        resetSave();
        onReset();
    };

    return (
        <div className="result-overlay settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="result-card settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="result-title">
                    {currentLocale === "zh" ? "设置" : "Settings"}
                </div>

                <div className="settings-row">
                    <span>{currentLocale === "zh" ? "语言" : "Language"}</span>
                    <div className="settings-segment">
                        <button
                            className={currentLocale === "zh" ? "primary-btn" : "ghost-btn"}
                            onClick={() => pickLocale("zh")}
                        >
                            中文
                        </button>
                        <button
                            className={currentLocale === "en" ? "primary-btn" : "ghost-btn"}
                            onClick={() => pickLocale("en")}
                        >
                            English
                        </button>
                    </div>
                </div>

                <div className="settings-row">
                    <span>{currentLocale === "zh" ? "音效" : "Sound FX"}</span>
                    <button
                        className={sound ? "primary-btn" : "ghost-btn"}
                        onClick={toggleSound}
                    >
                        {sound
                            ? currentLocale === "zh"
                                ? "🔊 开"
                                : "🔊 On"
                            : currentLocale === "zh"
                              ? "🔇 关"
                              : "🔇 Off"}
                    </button>
                </div>

                <div className="settings-row">
                    <span>{currentLocale === "zh" ? "背景音乐" : "Music"}</span>
                    <button
                        className={bgmOn ? "primary-btn" : "ghost-btn"}
                        onClick={toggleBgm}
                    >
                        {bgmOn
                            ? currentLocale === "zh"
                                ? "🎵 开"
                                : "🎵 On"
                            : currentLocale === "zh"
                              ? "🎵 关"
                              : "🎵 Off"}
                    </button>
                </div>

                <div className="settings-row settings-reset-row">
                    {!confirmReset ? (
                        <button className="ghost-btn settings-reset-btn" onClick={() => setConfirmReset(true)}>
                            {currentLocale === "zh" ? "重置进度" : "Reset progress"}
                        </button>
                    ) : (
                        <div className="settings-confirm">
                            <span className="settings-warn">
                                {currentLocale === "zh" ? "确定清空所有进度？" : "Clear all progress?"}
                            </span>
                            <div className="settings-segment">
                                <button className="ghost-btn" onClick={() => setConfirmReset(false)}>
                                    {currentLocale === "zh" ? "取消" : "Cancel"}
                                </button>
                                <button className="primary-btn settings-danger" onClick={doReset}>
                                    {currentLocale === "zh" ? "清空" : "Reset"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="result-actions">
                    <button className="primary-btn" onClick={onClose}>
                        {currentLocale === "zh" ? "完成" : "Done"}
                    </button>
                </div>
            </div>
        </div>
    );
}
