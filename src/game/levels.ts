import type { Chapter, Level } from "./types";
import { CHAPTER as FUNDAMENTALS_CHAPTER, LEVELS as FUNDAMENTALS_LEVELS } from "./chapters/fundamentals";
import { CHAPTER as BASIC_PRINCIPLES_CHAPTER, LEVELS as BASIC_PRINCIPLES_LEVELS } from "./chapters/basic-principles";
import { CHAPTER as BASIC_SKILLS_CHAPTER, LEVELS as BASIC_SKILLS_LEVELS } from "./chapters/basic-skills";
import { CHAPTER as BEGINNER_1_CHAPTER, LEVELS as BEGINNER_1_LEVELS } from "./chapters/beginner-level1";
import { CHAPTER as BEGINNER_2_CHAPTER, LEVELS as BEGINNER_2_LEVELS } from "./chapters/beginner-level2";
import { CHAPTER as BEGINNER_3_CHAPTER, LEVELS as BEGINNER_3_LEVELS } from "./chapters/beginner-level3";
import { CHAPTER as BEGINNER_4_CHAPTER, LEVELS as BEGINNER_4_LEVELS } from "./chapters/beginner-level4";
import { CHAPTER as BOSS_CHAPTER, LEVELS as BOSS_LEVELS } from "./chapters/boss";

/**
 * Chapter + level registry. Levels are auto-generated from LearningHub source
 * (see scripts/extract-levels.ts + scripts/generate-chapter.ts). Hand-written
 * entries should not live here — regenerate from source instead.
 */

export const CHAPTERS: Chapter[] = [
    FUNDAMENTALS_CHAPTER,
    BASIC_PRINCIPLES_CHAPTER,
    BASIC_SKILLS_CHAPTER,
    BEGINNER_1_CHAPTER,
    BEGINNER_2_CHAPTER,
    BEGINNER_3_CHAPTER,
    BEGINNER_4_CHAPTER,
    BOSS_CHAPTER,
];

export const LEVELS: Level[] = [
    ...FUNDAMENTALS_LEVELS,
    ...BASIC_PRINCIPLES_LEVELS,
    ...BASIC_SKILLS_LEVELS,
    ...BEGINNER_1_LEVELS,
    ...BEGINNER_2_LEVELS,
    ...BEGINNER_3_LEVELS,
    ...BEGINNER_4_LEVELS,
    ...BOSS_LEVELS,
];

export function getLevel(id: string): Level | undefined {
    return LEVELS.find((l) => l.id === id);
}

export function getNextLevel(id: string): Level | undefined {
    const idx = LEVELS.findIndex((l) => l.id === id);
    return idx >= 0 ? LEVELS[idx + 1] : undefined;
}
