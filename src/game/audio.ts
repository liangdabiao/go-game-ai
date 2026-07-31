/**
 * Synthesized sound effects via Web Audio API. No asset files.
 *
 * Lazily creates the AudioContext on first user gesture (browsers block
 * autoplay). Set `enabled = false` to mute (settings panel can flip this).
 */

type SfxName = "place" | "capture" | "correct" | "wrong" | "complete";

class AudioManager {
    enabled = (() => {
        try {
            const v = localStorage.getItem("go-game:sound");
            return v === null ? true : v !== "0";
        } catch {
            return true;
        }
    })();
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;

    private ensureCtx(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const Ctor =
                window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return null;
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.3;
            this.master.connect(this.ctx.destination);
        }
        // Resume if suspended (browser autoplay policy).
        if (this.ctx.state === "suspended") void this.ctx.resume();
        return this.ctx;
    }

    /** Call from a user gesture (e.g. first click) to unlock audio on iOS/Safari. */
    unlock(): void {
        this.ensureCtx();
    }

    play(name: SfxName): void {
        if (!this.enabled) return;
        const ctx = this.ensureCtx();
        if (!ctx || !this.master) return;
        const t = ctx.currentTime;
        switch (name) {
            case "place":
                this.tone(ctx, t, 220, 0.06, "sine", 0.4);
                this.tone(ctx, t + 0.005, 180, 0.05, "sine", 0.25);
                break;
            case "capture":
                this.tone(ctx, t, 440, 0.08, "triangle", 0.35);
                this.tone(ctx, t + 0.06, 330, 0.1, "triangle", 0.3);
                this.tone(ctx, t + 0.14, 220, 0.12, "triangle", 0.25);
                break;
            case "correct":
                this.tone(ctx, t, 523.25, 0.08, "sine", 0.3); // C5
                this.tone(ctx, t + 0.08, 659.25, 0.08, "sine", 0.3); // E5
                this.tone(ctx, t + 0.16, 783.99, 0.16, "sine", 0.3); // G5
                break;
            case "wrong":
                this.tone(ctx, t, 200, 0.18, "sawtooth", 0.25);
                this.tone(ctx, t + 0.05, 150, 0.2, "sawtooth", 0.2);
                break;
            case "complete":
                this.tone(ctx, t, 523.25, 0.1, "sine", 0.3);
                this.tone(ctx, t + 0.1, 659.25, 0.1, "sine", 0.3);
                this.tone(ctx, t + 0.2, 783.99, 0.1, "sine", 0.3);
                this.tone(ctx, t + 0.3, 1046.5, 0.25, "sine", 0.35); // C6
                break;
        }
    }

    private tone(
        ctx: AudioContext,
        start: number,
        freq: number,
        dur: number,
        type: OscillatorType,
        vol: number,
    ): void {
        if (!this.master) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(start);
        osc.stop(start + dur + 0.05);
    }
}

export const audio = new AudioManager();
