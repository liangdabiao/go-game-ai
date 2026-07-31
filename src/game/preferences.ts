import { audio } from "./audio";
import { bgm } from "./bgm";
import type { Locale } from "./types";

const LOCALE_KEY = "go-game:locale";
const SOUND_KEY = "go-game:sound";

export function loadLocale(): Locale {
    try {
        const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
        if (saved === "zh" || saved === "en") return saved;
    } catch {
        // ignore
    }
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function saveLocale(locale: Locale): void {
    try {
        localStorage.setItem(LOCALE_KEY, locale);
    } catch {
        // ignore
    }
}

export function loadSoundEnabled(): boolean {
    try {
        const v = localStorage.getItem(SOUND_KEY);
        if (v === null) return true;
        return v !== "0";
    } catch {
        return true;
    }
}

export function saveSoundEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
    } catch {
        // ignore
    }
    audio.enabled = enabled;
}

const BGM_KEY = "go-game:bgm";

export function loadBgmEnabled(): boolean {
    try {
        const v = localStorage.getItem(BGM_KEY);
        return v !== null ? v !== "0" : false;
    } catch {
        return false;
    }
}

export function saveBgmEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(BGM_KEY, enabled ? "1" : "0");
    } catch {
        // ignore
    }
    bgm.setEnabled(enabled);
}
