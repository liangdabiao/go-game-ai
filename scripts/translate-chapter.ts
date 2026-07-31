/**
 * Batch-translate English level instructions to Chinese using Xiaomi MiMo LLM.
 *
 * Reads an extracted-*.json file, collects unique English texts that haven't
 * been translated yet, batches them to the LLM with a Go-specific glossary,
 * writes translations back to the translations-*.json file incrementally
 * (resume-safe — re-running picks up where it stopped).
 *
 * Usage:
 *   XIAOMI_API_KEY=... tsx scripts/translate-chapter.ts \
 *     --extracted extracted-BasicPrinciples.json \
 *     --translations scripts/translations-BasicPrinciples.json \
 *     [--batch-size 20] [--dry-run]
 *
 * Env (loaded from .env.local):
 *   XIAOMI_API_KEY    API key
 *   XIAOMI_BASE_URL   defaults to https://api.xiaomimimo.com/v1
 *   XIAOMI_MODEL      defaults to mimo-v2.5-pro
 */

import * as fs from "fs";
import * as path from "path";

interface ExtractedPage {
    text: string | null;
    skip: boolean;
    multipleChoice?: {
        question: string;
        options: { value: string; label: string }[];
    } | null;
}
interface ExtractedSection {
    title: string;
    pages: ExtractedPage[];
}
interface Extracted {
    sections: ExtractedSection[];
}

interface Args {
    extractedPath: string;
    translationsPath: string;
    batchSize: number;
    dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
    const a: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        if (k.startsWith("--")) a[k.slice(2)] = argv[++i] ?? "";
    }
    if (!a.extracted || !a.translations) {
        console.error("Usage: translate-chapter.ts --extracted <path> --translations <path> [--batch-size 20] [--dry-run]");
        process.exit(1);
    }
    return {
        extractedPath: a.extracted,
        translationsPath: a.translations,
        batchSize: a["batch-size"] ? Number(a["batch-size"]) : 20,
        dryRun: !!a["dry-run"],
    };
}

function loadEnv() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
}

const GLOSSARY: Record<string, string> = {
    "Go": "围棋",
    "weiqi": "围棋",
    "stone": "棋子",
    "stones": "棋子",
    "board": "棋盘",
    "intersection": "交叉点",
    "Black": "黑棋",
    "White": "白棋",
    "liberty": "气",
    "liberties": "气",
    "atari": "打吃",
    "capture": "提子/吃掉",
    "captured": "被吃",
    "captures": "提子",
    "eye": "眼",
    "false eye": "假眼",
    "real eye": "真眼",
    "ko": "劫",
    "ko fight": "劫争",
    "self-capture": "自杀",
    "self-atari": "自杀打吃",
    "territory": "领地/地盘",
    "group": "棋块",
    "chain": "棋串",
    "connect": "连接",
    "cut": "切断",
    "extension": "延伸",
    "jump": "跳",
    "knight's move": "小飞",
    "star point": "星位",
    "corner": "角",
    "side": "边",
    "center": "中腹",
    "pass": "停一手",
    "resign": "认输",
    "play": "落子",
    "move": "着法/一手",
    "turn": "回合",
    "to play": "先行",
    "Black to play": "黑先",
    "White to play": "白先",
    "surround": "包围",
    "escape": "逃跑",
    "block": "挡",
    "contact": "接触",
    "shoulder hit": "肩侵",
    "invasion": "侵入",
    "endgame": "收官",
    "opening": "布局",
    "fuseki": "布局",
    "tesuji": "手筋",
    "shape": "棋形",
    "good shape": "好形",
    "bad shape": "愚形",
    "empty": "空",
    "empty intersection": "空交叉点",
    "dame": "单官",
    "seki": "双活",
    "life": "活棋",
    "death": "死棋",
    "living group": "活棋块",
    "dead stones": "死子",
    "snapback": "倒扑",
    "ladder": "征子",
    "net": "罩",
    "monkey jump": "仙鹤大伸腿",
};

function buildSystemPrompt(): string {
    const glossaryLines = Object.entries(GLOSSARY)
        .map(([en, zh]) => `  ${en} → ${zh}`)
        .join("\n");
    return [
        "You are a professional translator specializing in Go (weiqi / 围棋) tutorial content.",
        "Translate the user-provided English instructions into Simplified Chinese.",
        "",
        "Rules:",
        "1. Use standard Chinese Go terminology. Glossary (apply where appropriate):",
        glossaryLines,
        "2. Keep the meaning precise and natural for a beginner Go learner.",
        "3. Preserve any letter markers like A, B, C or coordinate references (e.g. 'A1').",
        "4. Do not translate the words 'Black' or 'White' when they refer to a player color — use 黑棋 / 白棋.",
        "5. Output STRICT JSON only — no markdown, no explanation.",
        '6. Output format: {"items":[{"id":"<id>","zh":"<translation>"},...]}',
        "7. The translation must be a single-line string (no embedded newlines).",
        "8. If an instruction contains HTML-like markup, preserve the tags verbatim.",
    ].join("\n");
}

interface LLMItem {
    id: string;
    en: string;
}
interface LLMResponse {
    items: { id: string; zh: string }[];
}

async function callLLM(items: LLMItem[]): Promise<Record<string, string>> {
    const apiKey = process.env.XIAOMI_API_KEY;
    const baseUrl = process.env.XIAOMI_BASE_URL ?? "https://api.xiaomimimo.com/v1";
    const model = process.env.XIAOMI_MODEL ?? "mimo-v2.5-pro";
    if (!apiKey) throw new Error("XIAOMI_API_KEY missing");

    const userPayload = JSON.stringify({ items });

    const body = {
        model,
        messages: [
            { role: "system", content: buildSystemPrompt() },
            {
                role: "user",
                content:
                    `Translate all ${items.length} English strings below to Chinese. ` +
                    `Reply with JSON in exactly this shape: {"items":[{"id":"<id>","zh":"<translation>"}]}\n\n` +
                    userPayload,
            },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`LLM API ${res.status}: ${text.slice(0, 500)}`);
    }
    const json = (await res.json()) as {
        choices: { message: { content: string } }[];
    };
    const content = json.choices[0]?.message?.content ?? "";
    // Some models wrap in ```json ... ``` despite response_format — strip.
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(cleaned) as LLMResponse;
    const out: Record<string, string> = {};
    for (const it of parsed.items ?? []) {
        if (it.id && typeof it.zh === "string") out[it.id] = it.zh;
    }
    return out;
}

function loadTranslations(p: string): Record<string, string> {
    if (!fs.existsSync(p)) return {};
    try {
        const o = JSON.parse(fs.readFileSync(p, "utf8"));
        delete o._comment;
        return o as Record<string, string>;
    } catch {
        return {};
    }
}

function saveTranslations(p: string, t: Record<string, string>): void {
    fs.writeFileSync(p, JSON.stringify(t, null, 2) + "\n", "utf8");
}

function collectUniqueTexts(extracted: Extracted): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (s: string | null | undefined) => {
        if (!s) return;
        if (!seen.has(s)) {
            seen.add(s);
            out.push(s);
        }
    };
    for (const s of extracted.sections) {
        add(s.title);
        for (const p of s.pages) {
            if (p.skip) continue;
            add(p.text);
            if (p.multipleChoice) {
                add(p.multipleChoice.question);
                for (const o of p.multipleChoice.options) {
                    // Translate textual labels; skip pure numbers.
                    if (o.label && !/^\d+$/.test(o.label)) add(o.label);
                }
            }
        }
    }
    return out;
}

async function main() {
    loadEnv();
    const args = parseArgs(process.argv.slice(2));
    const extracted = JSON.parse(fs.readFileSync(args.extractedPath, "utf8")) as Extracted;
    const existing = loadTranslations(args.translationsPath);

    const allTexts = collectUniqueTexts(extracted);
    const pending = allTexts.filter((t) => !existing[t]);
    console.log(
        `[${path.basename(args.translationsPath)}] ${allTexts.length} unique, ${Object.keys(existing).length} done, ${pending.length} pending`,
    );

    if (pending.length === 0 || args.dryRun) {
        if (args.dryRun) console.log("Dry run — would translate:");
        for (const t of pending.slice(0, 5)) console.log(`  - ${t.slice(0, 80)}…`);
        return;
    }

    let done = 0;
    let saveCounter = 0;
    for (let i = 0; i < pending.length; i += args.batchSize) {
        const batch = pending.slice(i, i + args.batchSize);
        const items: LLMItem[] = batch.map((en, idx) => ({
            id: `t${i + idx}`,
            en,
        }));
        const t0 = Date.now();
        try {
            const result = await callLLM(items);
            const dt = ((Date.now() - t0) / 1000).toFixed(1);
            let hit = 0;
            for (const it of items) {
                const zh = result[it.id];
                if (zh) {
                    existing[it.en] = zh;
                    hit++;
                    done++;
                } else {
                    console.warn(`  [miss] no zh for id=${it.id}: ${it.en.slice(0, 60)}…`);
                }
            }
            saveCounter++;
            // Persist every batch so resume is safe.
            saveTranslations(args.translationsPath, existing);
            console.log(
                `  batch ${i / args.batchSize + 1}/${Math.ceil(pending.length / args.batchSize)}: ${hit}/${items.length} translated in ${dt}s (total ${done})`,
            );
            // Gentle pacing.
            await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
            console.error(`  batch at offset ${i} failed: ${(e as Error).message}`);
            // Save what we have so far before exiting.
            saveTranslations(args.translationsPath, existing);
            process.exit(2);
        }
    }
    console.log(`Done. Wrote ${args.translationsPath}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
