/**
 * Extract LearningHub sections into JSON for go-game.
 *
 * Parses each Section .tsx as AST (does NOT execute the source), pulls out:
 *   - section id / title / subtext
 *   - per page: text (only when it's a plain _(...) / string), width/height,
 *     initial_state, marks, and the correct/wrong coord arrays passed to
 *     makePuzzleMoveTree.
 *
 * Pages whose text() returns React elements or whose config() uses features we
 * don't support (custom button() / complete() / onStoneRemoval / non-puzzle
 * mode) are emitted with `skip: true` plus a reason, so we can review later.
 *
 * Usage:
 *   npx tsx scripts/extract-levels.ts <section-tsx-file>...
 *   npx tsx scripts/extract-levels.ts "D:/online-go.com-main/src/views/LearningHub/Sections/Fundamentals/*.tsx"
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export interface ExtractedMark {
    [shape: string]: string;
}
export interface ExtractedMultipleChoice {
    question: string;
    options: { value: string; label: string }[];
    correctValue: string;
    hasBoard: boolean;
}
export interface ExtractedEndingGame {
    interaction: "pass" | "stoneRemoval" | "finish";
    targetRemoval?: string;
}
export interface ExtractedPage {
    pageClassName: string;
    pageIndex: number;
    text: string | null;
    width: number;
    height: number;
    initialPlayer: "black" | "white" | null;
    initialState: { black: string; white: string } | null;
    marks: ExtractedMark | null;
    correct: string[];
    wrong: string[];
    /** If the page is a MultipleChoice React component, parse result lives here. */
    multipleChoice: ExtractedMultipleChoice | null;
    /** If the page is an end-of-game tutorial (pass / stone removal / finish). */
    endingGame: ExtractedEndingGame | null;
    skip: boolean;
    skipReason?: string;
}
export interface ExtractedSection {
    sectionClassName: string;
    sectionId: string;
    title: string;
    subtext: string;
    sourceFile: string;
    pages: ExtractedPage[];
}

const DEFAULT_WIDTH = 9;
const DEFAULT_HEIGHT = 9;

function isNull< T >(x: T | null | undefined): x is null {
    return x === null || x === undefined;
}

/** Parse the source file, return a ts.SourceFile. */
function loadSource(filePath: string): ts.SourceFile {
    const raw = fs.readFileSync(filePath, "utf8");
    return ts.createSourceFile(path.basename(filePath), raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Find the LearningHubSection subclass declaration. */
function findSectionClass(node: ts.SourceFile): ts.ClassDeclaration | null {
    for (const stmt of node.statements) {
        if (!ts.isClassDeclaration(stmt)) continue;
        const heritage = stmt.heritageClauses ?? [];
        for (const h of heritage) {
            if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
            for (const t of h.types) {
                const name = t.expression.getText();
                if (name === "LearningHubSection") return stmt;
            }
        }
    }
    return null;
}

/** Find all LearningPage subclasses. */
function findPageClasses(node: ts.SourceFile): ts.ClassDeclaration[] {
    const out: ts.ClassDeclaration[] = [];
    for (const stmt of node.statements) {
        if (!ts.isClassDeclaration(stmt)) continue;
        for (const h of stmt.heritageClauses ?? []) {
            if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
            for (const t of h.types) {
                if (t.expression.getText() === "LearningPage") {
                    out.push(stmt);
                }
            }
        }
    }
    // Order pages by their order in the pages() array, not source order.
    return out;
}

/** Pull the static `section()` / `title()` / `subtext()` strings out of the section class. */
function extractSectionMeta(cls: ts.ClassDeclaration): {
    sectionId: string;
    title: string;
    subtext: string;
} {
    let sectionId = "";
    let title = "";
    let subtext = "";
    for (const m of cls.members) {
        if (!ts.isMethodDeclaration(m) || !m.name) continue;
        const name = m.name.getText();
        if (name === "section") sectionId = extractStringReturn(m) ?? "";
        else if (name === "title") title = extractPgettextOrStringReturn(m) ?? "";
        else if (name === "subtext") subtext = extractPgettextOrStringReturn(m) ?? "";
    }
    return { sectionId, title, subtext };
}

/** For a method `foo() { return X; }`, return X if X is a simple string literal. */
function extractStringReturn(m: ts.MethodDeclaration): string | null {
    if (!m.body || !m.body.statements.length) return null;
    const stmt = m.body.statements[0];
    if (!ts.isReturnStatement(stmt) || !stmt.expression) return null;
    return literalString(stmt.expression);
}

/** Same as extractStringReturn, but allows `_(...)` and `pgettext(ctx, "...")` wrappers. */
function extractPgettextOrStringReturn(m: ts.MethodDeclaration): string | null {
    if (!m.body || !m.body.statements.length) return null;
    const stmt = m.body.statements[0];
    if (!ts.isReturnStatement(stmt) || !stmt.expression) return null;
    const expr = stmt.expression;
    // pgettext("ctx", "str")
    if (ts.isCallExpression(expr) && expr.expression.getText() === "pgettext") {
        if (expr.arguments.length >= 2) return literalString(expr.arguments[1]);
    }
    // _("str")
    if (ts.isCallExpression(expr) && expr.expression.getText() === "_") {
        if (expr.arguments.length >= 1) return literalString(expr.arguments[0]);
    }
    return literalString(expr);
}

/** Get the string content of a StringLiteral-like expression (handles concatenation via +). */
function literalString(node: ts.Node): string | null {
    if (ts.isStringLiteral(node)) return node.text;
    // "a" + "b"
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const l = literalString(node.left);
        const r = literalString(node.right);
        if (l !== null && r !== null) return l + r;
    }
    return null;
}

/** Find the class name order listed in `static pages()`. */
function extractPagesOrder(cls: ts.ClassDeclaration): string[] {
    for (const m of cls.members) {
        if (!ts.isMethodDeclaration(m) || !m.name) continue;
        if (m.name.getText() !== "pages") continue;
        if (!m.body) continue;
        const ret = m.body.statements.find(ts.isReturnStatement);
        if (!ret || !ret.expression || !ts.isArrayLiteralExpression(ret.expression)) return [];
        return ret.expression.elements.map((e) => e.getText());
    }
    return [];
}

/** Extract a string-array argument from a call like makePuzzleMoveTree(correct, wrong, w, h). */
function extractStringArray(node: ts.Expression): string[] {
    if (!ts.isArrayLiteralExpression(node)) return [];
    const out: string[] = [];
    for (const el of node.elements) {
        // Skip spread elements or comments — only plain string literals.
        if (ts.isStringLiteral(el)) {
            out.push(el.text);
        } else if (ts.isIdentifier(el) || ts.isPropertyAccessExpression(el)) {
            // ignore dynamic — log later
        }
    }
    return out;
}

interface MoveTreeArgs {
    correct: string[];
    wrong: string[];
    width: number | null;
    height: number | null;
}

/** Parse a `this.makePuzzleMoveTree(correct, wrong, w?, h?)` call into args. */
function extractMakePuzzleMoveTreeArgs(call: ts.CallExpression): MoveTreeArgs | null {
    if (call.arguments.length < 2) return null;
    const correct = extractStringArray(call.arguments[0]);
    const wrong = extractStringArray(call.arguments[1]);
    let width: number | null = null;
    let height: number | null = null;
    if (call.arguments[2]) {
        width = literalNumber(call.arguments[2]);
    }
    if (call.arguments[3]) {
        height = literalNumber(call.arguments[3]);
    }
    return { correct, wrong, width, height };
}

function literalNumber(node: ts.Node): number | null {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    return null;
}

/** Try to read initial_state: { black: "...", white: "..." } from a config object literal. */
function extractInitialState(propValue: ts.Expression): { black: string; white: string } | null {
    if (!ts.isObjectLiteralExpression(propValue)) return null;
    let black = "";
    let white = "";
    for (const p of propValue.properties) {
        if (!ts.isPropertyAssignment(p) || !p.name) continue;
        const key = p.name.getText();
        const v = p.initializer;
        if (key === "black") black = literalString(v) ?? "";
        else if (key === "white") white = literalString(v) ?? "";
    }
    return { black, white };
}

function extractMarks(propValue: ts.Expression): ExtractedMark | null {
    if (!ts.isObjectLiteralExpression(propValue)) return null;
    const out: ExtractedMark = {};
    let any = false;
    for (const p of propValue.properties) {
        if (!ts.isPropertyAssignment(p) || !p.name) continue;
        const key = p.name.getText();
        const v = literalString(p.initializer);
        if (v !== null) {
            out[key] = v;
            any = true;
        }
    }
    return any ? out : null;
}

interface PageExtractionResult {
    page: ExtractedPage;
    hasCustomComplete: boolean;
    hasCustomFailed: boolean;
    hasCustomButton: boolean;
}

function extractPage(
    cls: ts.ClassDeclaration,
    pageIndex: number,
): PageExtractionResult | null {
    let text: string | null = null;
    let textIsReact = false;
    let width: number | null = null;
    let height: number | null = null;
    let initialPlayer: "black" | "white" | null = null;
    let initialState: { black: string; white: string } | null = null;
    let marks: ExtractedMark | null = null;
    let correct: string[] = [];
    let wrong: string[] = [];
    let mode: string | null = null;
    let phase: string | null = null;
    let skip = false;
    let skipReason: string | undefined;

    let hasCustomComplete = false;
    let hasCustomFailed = false;
    let hasCustomButton = false;
    let buttonLabel: string | null = null;
    let multipleChoice: ExtractedMultipleChoice | null = null;
    let endingGame: ExtractedEndingGame | null = null;
    let removalTarget: string | null = null;
    let textMethod: ts.MethodDeclaration | null = null;

    for (const m of cls.members) {
        if (!ts.isMethodDeclaration(m) || !m.name) continue;
        const name = m.name.getText();
        if (name === "text") {
            textMethod = m;
            const r = extractPgettextOrStringReturn(m);
            if (r !== null) text = r;
            else textIsReact = true;
        } else if (name === "complete") hasCustomComplete = true;
        else if (name === "failed") hasCustomFailed = true;
        else if (name === "button") {
            hasCustomButton = true;
            // Extract the first _("...") / pgettext(...) call inside button()
            if (m.body) {
                const scan = (n: ts.Node): string | null => {
                    if (ts.isCallExpression(n)) {
                        const s = extractPgettextCallText(n);
                        if (s) return s;
                    }
                    let found: string | null = null;
                    n.forEachChild((c) => {
                        if (!found) found = scan(c);
                    });
                    return found;
                };
                buttonLabel = scan(m.body);
            }
        } else if (name === "onStoneRemoval") {
            // Find: if (stone_removal_string === "<X>") { this.success = true; ... }
            if (m.body) {
                const src = m.body.getText();
                const mt = src.match(/stone_removal_string\s*===\s*"([^"]+)"/);
                if (mt) removalTarget = mt[1];
            }
        } else if (name === "config") {
            const cfg = m.body?.statements.find(ts.isReturnStatement);
            if (cfg?.expression && ts.isObjectLiteralExpression(cfg.expression)) {
                for (const p of cfg.expression.properties) {
                    if (!ts.isPropertyAssignment(p) || !p.name) continue;
                    const key = p.name.getText();
                    const v = p.initializer;
                    if (key === "width") width = literalNumber(v);
                    else if (key === "height") height = literalNumber(v);
                    else if (key === "mode") mode = literalString(v);
                    else if (key === "phase") phase = literalString(v);
                    else if (key === "initial_player") {
                        const s = literalString(v);
                        if (s === "black" || s === "white") initialPlayer = s;
                    } else if (key === "initial_state") {
                        initialState = extractInitialState(v);
                    } else if (key === "marks") {
                        marks = extractMarks(v);
                    } else if (key === "move_tree") {
                        if (
                            ts.isCallExpression(v) &&
                            v.expression.getText().includes("makePuzzleMoveTree")
                        ) {
                            const args = extractMakePuzzleMoveTreeArgs(v);
                            if (args) {
                                correct = args.correct;
                                wrong = args.wrong;
                                if (args.width !== null) width = args.width;
                                if (args.height !== null) height = args.height;
                            }
                        }
                    }
                }
            }
        }
    }

    // Detect EndingGame tutorial pages.
    if (mode === "play" && phase === "stone removal" && removalTarget) {
        endingGame = { interaction: "stoneRemoval", targetRemoval: removalTarget };
    } else if (hasCustomButton && buttonLabel) {
        const lbl = buttonLabel.toLowerCase();
        if (lbl.includes("pass")) endingGame = { interaction: "pass" };
        else if (lbl.includes("finish")) endingGame = { interaction: "finish" };
    }

    if (textIsReact) {
        // Try to parse MultipleChoice JSX. If successful, override skip.
        const mc = textMethod ? extractMultipleChoice(textMethod) : null;
        if (mc) {
            multipleChoice = mc;
            // Don't skip — we can render this as a multiple-choice level.
            text = mc.question;
        } else {
            skip = true;
            skipReason = "text() returns React element";
        }
    }
    if (multipleChoice) {
        // MC pages legitimately have no move_tree and often custom button/complete.
        // Don't mark them skipped for those reasons.
    } else if (endingGame) {
        // EndingGame pages have custom button/complete and play mode — all expected.
    } else {
        if (mode && mode !== "puzzle") {
            skip = true;
            skipReason = skipReason ?? `unsupported mode: ${mode}`;
        }
        if (hasCustomComplete || hasCustomFailed || hasCustomButton) {
            skip = true;
            skipReason = skipReason ?? "has custom complete/failed/button (UI-driven)";
        }
        if (correct.length === 0 && !skip) {
            skip = true;
            skipReason = skipReason ?? "no correct moves in move_tree";
        }
    }

    return {
        page: {
            pageClassName: cls.name?.getText() ?? `Page${pageIndex + 1}`,
            pageIndex,
            text,
            width: width ?? DEFAULT_WIDTH,
            height: height ?? DEFAULT_HEIGHT,
            initialPlayer,
            initialState,
            marks,
            correct,
            wrong,
            multipleChoice,
            endingGame,
            skip,
            skipReason,
        },
        hasCustomComplete,
        hasCustomFailed,
        hasCustomButton,
    };
}

/**
 * Parse a `text()` method whose body returns a MultipleChoice-style JSX element.
 * Returns null if the structure doesn't match the expected pattern.
 *
 * Expected pattern (CountLiberties-style):
 *   text() {
 *     function MultipleChoice(props) {
 *       const [value, setValue] = React.useState("");
 *       const handleChange = (event) => {
 *         const selectedValue = event.target.value;
 *         setValue(selectedValue);
 *         if (selectedValue === "<CORRECT>") { props.onCorrectAnswer(); }
 *         else if (selectedValue !== "") { props.onWrongAnswer(); }
 *       };
 *       return (<div>
 *         <p>{_("Question text")}</p>
 *         <label><input value="X" .../>X-label</label>
 *         <label><input value="Y" .../>Y-label</label>
 *         ...
 *       </div>);
 *     }
 *     return <MultipleChoice ... />;
 *   }
 *
 * We extract: question text, options [{value, label}], correct value, and
 * whether the config has a board worth showing.
 */
function extractMultipleChoice(m: ts.MethodDeclaration): ExtractedMultipleChoice | null {
    if (!m.body) return null;
    // Find: selectedValue === "<X>"
    let correctValue: string | null = null;
    const sourceText = m.body.getText();
    const correctMatch = sourceText.match(/selectedValue\s*===\s*"([^"]+)"/);
    if (!correctMatch) return null;
    correctValue = correctMatch[1];

    // Find the returned JSX (<div> containing <p> and <label>s).
    // Walk all nodes, find the first JsxElement whose opening tag is <div> and
    // contains at least one <label>.
    let question: string | null = null;
    const options: { value: string; label: string }[] = [];

    function visit(node: ts.Node): void {
        if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "div") {
            // Inside this div, find <p>{...}</p> for question and <label>...</label> for options.
            for (const child of node.children) {
                if (ts.isJsxElement(child) && child.openingElement.tagName.getText() === "p") {
                    if (question === null) question = extractJsxText(child);
                } else if (ts.isJsxElement(child) && child.openingElement.tagName.getText() === "label") {
                    const opt = extractOptionFromLabel(child);
                    if (opt) options.push(opt);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(m.body);

    if (question === null || options.length === 0 || correctValue === null) return null;
    // Sanity: correctValue must match one of the options.
    if (!options.some((o) => o.value === correctValue)) return null;

    return {
        question,
        options,
        correctValue,
        hasBoard: true, // config still has board to display
    };
}

/** Extract the visible text content of a JSX element (e.g. <p>{_("foo")}</p> → "foo"). */
function extractJsxText(el: ts.JsxElement): string {
    const parts: string[] = [];
    for (const child of el.children) {
        if (ts.isJsxText(child)) {
            const t = child.text.trim();
            if (t) parts.push(t);
        } else if (ts.isJsxExpression(child)) {
            // {_("foo")} / {pgettext("ctx", "foo")}
            const e = child.expression;
            if (e) {
                const s = literalString(e) ?? extractPgettextCallText(e);
                if (s) parts.push(s);
            }
        } else if (ts.isJsxElement(child)) {
            // nested element — recurse for its text content
            const nested = extractJsxText(child);
            if (nested) parts.push(nested);
        }
    }
    return parts.join(" ").trim();
}

/** Recognize pgettext("ctx", "str") / _("str") and return the string arg. */
function extractPgettextCallText(e: ts.Expression): string | null {
    if (ts.isCallExpression(e)) {
        const fn = e.expression.getText();
        if (fn === "_" && e.arguments.length >= 1) return literalString(e.arguments[0]);
        if (fn === "pgettext" && e.arguments.length >= 2) return literalString(e.arguments[1]);
    }
    return null;
}

/** Parse `<label><input value="X"/>label-text</label>` → { value, label }. */
function extractOptionFromLabel(labelEl: ts.JsxElement): { value: string; label: string } | null {
    let value: string | null = null;
    let labelText = "";
    for (const child of labelEl.children) {
        if (ts.isJsxSelfClosingElement(child) && child.tagName.getText() === "input") {
            for (const attr of child.attributes.properties) {
                if (ts.isJsxAttribute(attr) && attr.name.getText() === "value") {
                    if (attr.initializer) {
                        const v = literalString(stripJsxExpression(attr.initializer));
                        if (v !== null) value = v;
                    }
                }
            }
        } else if (ts.isJsxText(child)) {
            labelText += child.text;
        } else if (ts.isJsxExpression(child)) {
            if (child.expression) {
                const s = literalString(child.expression) ?? extractPgettextCallText(child.expression);
                if (s) labelText += s;
            }
        }
    }
    if (value === null) return null;
    return { value, label: labelText.trim() };
}

function stripJsxExpression(node: ts.Node): ts.Node {
    // value={X} wraps X in a JsxExpression; literalString wants the inner expression.
    if ("expression" in node && (node as { expression?: unknown }).expression) {
        return (node as { expression: ts.Node }).expression;
    }
    return node;
}

function extractSection(filePath: string): ExtractedSection | null {
    const src = loadSource(filePath);
    const sectionCls = findSectionClass(src);
    if (!sectionCls) return null;
    const meta = extractSectionMeta(sectionCls);
    const pageClasses = findPageClasses(src);
    // Filter to only those listed in pages() — preserves order.
    const order = extractPagesOrder(sectionCls);
    const ordered = order
        .map((name) => pageClasses.find((c) => c.name?.getText() === name))
        .filter((c): c is ts.ClassDeclaration => !isNull(c));
    const pages = ordered.map((cls, i) => extractPage(cls, i)?.page).filter((p): p is ExtractedPage => !!p);

    return {
        sectionClassName: sectionCls.name?.getText() ?? "UnknownSection",
        sectionId: meta.sectionId,
        title: meta.title,
        subtext: meta.subtext,
        sourceFile: filePath,
        pages,
    };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: extract-levels.ts <section-tsx-file>...");
        process.exit(1);
    }
    // Expand glob manually (Node 22+ has fs.glob, but simple '*' expansion is safe).
    const files: string[] = [];
    for (const arg of args) {
        if (arg.includes("*")) {
            const dir = path.dirname(arg);
            const pattern = path.basename(arg).replace(/\./g, "\\.").replace(/\*/g, ".*");
            const re = new RegExp(`^${pattern}$`);
            if (fs.existsSync(dir)) {
                for (const f of fs.readdirSync(dir)) {
                    if (re.test(f)) files.push(path.join(dir, f));
                }
            }
        } else {
            files.push(arg);
        }
    }

    // If sections.ts lives next to the first file, prefer its declared order
    // (Intro, SelfCapture, Eyes, ...) over the alphabetical readdir order.
    let orderedFiles = files;
    if (files.length > 0) {
        const dir = path.dirname(files[0]);
        // sections.ts lives in the LearningHub root, but `dir` may be either
        // LearningHub/Sections/<Chapter>/ (2 levels up) or LearningHub/ (sibling).
        const candidates = [
            path.join(dir, "..", "sections.ts"),
            path.join(dir, "..", "..", "sections.ts"),
        ];
        const sectionsTs = candidates.find((p) => fs.existsSync(p));
        if (sectionsTs) {
            const order = readSectionsOrder(sectionsTs);
            // Map base name (e.g. "Intro.tsx") to import alias-less class name lookup is hard,
            // so instead we read the imports + array literal and resolve to file paths.
            const byClass = indexFilesBySectionClass(files);
            const resolved: string[] = [];
            const used = new Set<string>();
            for (const cls of order) {
                const f = byClass.get(cls);
                if (f && !used.has(f)) {
                    resolved.push(f);
                    used.add(f);
                }
            }
            // Append any files not covered by sections.ts.
            for (const f of files) if (!used.has(f)) resolved.push(f);
            orderedFiles = resolved;
        } else {
            orderedFiles = [...files].sort();
        }
    }

    const sections: ExtractedSection[] = [];
    for (const f of orderedFiles) {
        const s = extractSection(f);
        if (s) sections.push(s);
        else console.warn(`[warn] no section class in ${f}`);
    }

    process.stdout.write(JSON.stringify({ sections }, null, 2));
}

/** Build map of sectionClassName -> source file path. */
function indexFilesBySectionClass(files: string[]): Map<string, string> {
    const out = new Map<string, string>();
    for (const f of files) {
        const src = loadSource(f);
        const cls = findSectionClass(src);
        if (cls && cls.name) out.set(cls.name.getText(), f);
    }
    return out;
}

/** Read sections.ts and pull out the section class names in declaration order.
 *  The file imports each Section under its real name (e.g. `import { Intro }`)
 *  and groups them per chapter in `sections = [["Title", [Intro, SelfCapture, ...]], ...]`.
 *  We don't care about chapter grouping for ordering — we just flatten. */
function readSectionsOrder(sectionsTsPath: string): string[] {
    const src = loadSource(sectionsTsPath);
    const order: string[] = [];
    for (const stmt of src.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (!decl.initializer || !ts.isArrayLiteralExpression(decl.initializer)) continue;
            // Each element is ["Chapter title", [Sec1, Sec2, ...]]
            for (const el of decl.initializer.elements) {
                if (!ts.isArrayLiteralExpression(el)) continue;
                if (el.elements.length < 2) continue;
                const sectionArr = el.elements[1];
                if (!ts.isArrayLiteralExpression(sectionArr)) continue;
                for (const s of sectionArr.elements) {
                    if (ts.isIdentifier(s)) order.push(s.getText());
                }
            }
        }
    }
    return order;
}

main();
