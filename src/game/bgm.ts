/**
 * Background music. Plays `public/aaa.mp3` on a loop via HTMLAudioElement.
 * Default is ON. Browser autoplay policy requires a first user gesture,
 * so playback starts on the first pointerdown/keydown (see App.tsx).
 */

const BGM_URL = "/aaa.mp3";
const VOLUME = 0.5;

class BgmManager {
    enabled = (() => {
        try {
            const v = localStorage.getItem("go-game:bgm");
            return v === null ? true : v !== "0";
        } catch {
            return true;
        }
    })();
    private audio: HTMLAudioElement | null = null;
    private fadeTimer: number | null = null;

    private ensure(): HTMLAudioElement | null {
        if (typeof window === "undefined") return null;
        if (!this.audio) {
            const el = new Audio(BGM_URL);
            el.loop = true;
            el.volume = 0;
            el.preload = "auto";
            this.audio = el;
        }
        return this.audio;
    }

    unlock(): void {
        if (this.enabled) this.start();
    }

    setEnabled(on: boolean): void {
        this.enabled = on;
        try {
            localStorage.setItem("go-game:bgm", on ? "1" : "0");
        } catch {
            // ignore
        }
        if (on) this.start();
        else this.stop();
    }

    start(): void {
        if (!this.enabled) return;
        const el = this.ensure();
        if (!el) return;
        if (this.fadeTimer !== null) {
            window.clearInterval(this.fadeTimer);
            this.fadeTimer = null;
        }
        const play = (): void => {
            const p = el.play();
            if (p) p.catch(() => {
                // Autoplay still blocked; retry on next gesture.
            });
        };
        play();
        // Fade in.
        el.volume = 0;
        const target = VOLUME;
        const step = target / 20;
        this.fadeTimer = window.setInterval(() => {
            const next = Math.min(el.volume + step, target);
            el.volume = next;
            if (next >= target && this.fadeTimer !== null) {
                window.clearInterval(this.fadeTimer);
                this.fadeTimer = null;
            }
        }, 40);
    }

    stop(): void {
        const el = this.audio;
        if (!el) return;
        // Fade out then pause.
        const startVol = el.volume;
        const step = startVol / 15;
        if (this.fadeTimer !== null) {
            window.clearInterval(this.fadeTimer);
            this.fadeTimer = null;
        }
        this.fadeTimer = window.setInterval(() => {
            if (!el) return;
            const next = Math.max(el.volume - step, 0);
            el.volume = next;
            if (next <= 0 && this.fadeTimer !== null) {
                window.clearInterval(this.fadeTimer);
                this.fadeTimer = null;
                el.pause();
            }
        }, 40);
    }
}

export const bgm = new BgmManager();
