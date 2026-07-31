/**
 * Original 16-bit arcade-style chiptune BGM, synthesized with Web Audio.
 *
 * NOT a reproduction of any copyrighted track — an original looping melody in
 * the spirit of 90s fighting-game arcade music: square-wave lead, triangle bass,
 * and a noise hi-hat. Scheduled with a lookahead loop for sample-accurate timing.
 */

type Wave = OscillatorType;

const BPM = 138;
const STEP = 60 / BPM / 2; // eighth note

// Note name -> frequency.
const N: Record<string, number> = {};
(() => {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    for (let oct = 1; oct <= 6; oct++) {
        for (let i = 0; i < 12; i++) {
            const midi = (oct + 1) * 12 + i;
            N[names[i] + oct] = 440 * Math.pow(2, (midi - 69) / 12);
        }
    }
})();

// Lead melody (A minor pentatonic feel), 32 eighth notes. "" = rest.
const LEAD: string[] = [
    "A4", "C5", "E5", "A5", "G5", "E5", "C5", "E5",
    "D5", "F5", "A5", "D6", "C6", "A5", "F5", "D5",
    "E5", "G5", "C6", "E6", "D6", "C6", "A5", "E5",
    "A4", "E5", "A5", "C6", "B5", "A5", "G5", "E5",
];

// Bass line, root notes two per bar-ish.
const BASS: string[] = [
    "A2", "", "A2", "", "F2", "", "F2", "",
    "G2", "", "G2", "", "E2", "", "E2", "",
    "A2", "", "A2", "", "F2", "", "F2", "",
    "E2", "", "E2", "", "A2", "", "A2", "",
];

const HAT: boolean[] = [
    true, false, true, true, false, true, false, true,
    true, false, true, false, true, false, true, true,
    true, false, true, true, false, true, false, true,
    true, false, true, false, false, true, false, true,
];

class BgmManager {
    enabled = (() => {
        try {
            const v = localStorage.getItem("go-game:bgm");
            return v === null ? false : v !== "0";
        } catch {
            return false;
        }
    })();
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private timer: number | null = null;
    private nextStepTime = 0;
    private step = 0;
    private noiseBuf: AudioBuffer | null = null;

    private ensure(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const Ctor =
                window.AudioContext ??
                (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return null;
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0;
            this.master.connect(this.ctx.destination);
            this.noiseBuf = this.makeNoise(this.ctx);
        }
        if (this.ctx.state === "suspended") void this.ctx.resume();
        return this.ctx;
    }

    private makeNoise(ctx: AudioContext): AudioBuffer {
        const len = ctx.sampleRate * 0.12;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
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
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        if (this.timer !== null) return;

        this.master.gain.cancelScheduledValues(ctx.currentTime);
        this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
        this.master.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.6);

        this.step = 0;
        this.nextStepTime = ctx.currentTime + 0.08;
        const lookahead = 25; // ms
        this.timer = window.setInterval(() => this.scheduler(), lookahead);
    }

    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.ctx && this.master) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setValueAtTime(this.master.gain.value, this.ctx.currentTime);
            this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        }
    }

    private scheduler(): void {
        const ctx = this.ctx;
        if (!ctx) return;
        while (this.nextStepTime < ctx.currentTime + 0.12) {
            this.playStep(this.step, this.nextStepTime);
            this.nextStepTime += STEP;
            this.step = (this.step + 1) % LEAD.length;
        }
    }

    private tone(freq: number, t: number, dur: number, type: Wave, vol: number): void {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    private hat(t: number): void {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noiseBuf) return;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 7000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(hp);
        hp.connect(gain);
        gain.connect(this.master);
        src.start(t);
        src.stop(t + 0.06);
    }

    private playStep(i: number, t: number): void {
        const lead = LEAD[i];
        if (lead && N[lead]) {
            this.tone(N[lead], t, STEP * 1.8, "square", 0.14);
        }
        const bass = BASS[i];
        if (bass && N[bass]) {
            this.tone(N[bass], t, STEP * 1.9, "triangle", 0.28);
        }
        if (HAT[i]) this.hat(t);
    }
}

export const bgm = new BgmManager();
