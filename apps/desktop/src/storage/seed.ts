import { createExerciseInputsFromPackage } from "@bestlng/content";
import type { ContentPackage } from "@bestlng/content";

import cet4ContentPackage from "../../../../packages/content/packs/exam/bestlng-cet4-en-zh.json";
import cet6ContentPackage from "../../../../packages/content/packs/exam/bestlng-cet6-en-zh.json";
import ieltsContentPackage from "../../../../packages/content/packs/exam/bestlng-ielts-en-zh.json";
import toeflContentPackage from "../../../../packages/content/packs/exam/bestlng-toefl-en-zh.json";

export const starterContentPackage: ContentPackage = {
    manifest: {
        authors: ["BestLNG contributors"],
        description: "本地自用 v1 内置的 CC0 英中示例句库。",
        id: "bestlng-starter-en-zh",
        license: {
            attribution: "BestLNG contributors",
            name: "CC0-1.0",
            url: "https://creativecommons.org/publicdomain/zero/1.0/",
        },
        name: "BestLNG 入门英中内容包",
        sourceLanguage: "en",
        targetLanguage: "zh-Hans",
        version: "0.1.0",
    },
    sentences: [
        {
            blanks: [{ answer: "English", hint: "一种语言", id: "starter-001-language" }],
            id: "starter-001",
            tags: ["daily", "language"],
            text: "I practice English every day.",
            translation: "我每天练习英语。",
        },
        {
            blanks: [{ answer: "make", hint: "表示“使得”", id: "starter-002-verb" }],
            id: "starter-002",
            tags: ["habit"],
            text: "Small steps make learning easier.",
            translation: "小步前进会让学习更轻松。",
        },
        {
            blanks: [{ answer: "offline", hint: "不联网也能使用", id: "starter-003-mode" }],
            id: "starter-003",
            tags: ["desktop", "local-first"],
            text: "You can review words offline.",
            translation: "你可以离线复习单词。",
        },
        {
            blanks: [{ answer: "context", hint: "上下文、语境", id: "starter-004-noun" }],
            id: "starter-004",
            tags: ["reading"],
            text: "The context helps you guess the meaning.",
            translation: "语境会帮助你猜出含义。",
        },
        {
            blanks: [{ answer: "available", hint: "可用的、有空的", id: "starter-005-adjective" }],
            id: "starter-005",
            tags: ["daily"],
            text: "This feature is available on your desktop.",
            translation: "这个功能可以在你的桌面端使用。",
        },
        {
            blanks: [{ answer: "instead", hint: "构成 instead of", id: "starter-006-phrase" }],
            id: "starter-006",
            tags: ["phrase"],
            text: "Try to understand the sentence instead of memorizing it alone.",
            translation: "试着理解句子，而不是单独死记它。",
        },
        {
            blanks: [{ answer: "license", hint: "许可证", id: "starter-007-noun" }],
            id: "starter-007",
            tags: ["content"],
            text: "Every content pack should include a clear license.",
            translation: "每个内容包都应该包含清晰的许可证。",
        },
        {
            blanks: [{ answer: "progress", hint: "进步、进度", id: "starter-008-noun" }],
            id: "starter-008",
            tags: ["stats"],
            text: "Visible progress keeps learners motivated.",
            translation: "可见的进步会让学习者保持动力。",
        },
    ],
};

export const starterExerciseInputs = createExerciseInputsFromPackage(starterContentPackage);

export const builtInContentPackages: readonly ContentPackage[] = [
    starterContentPackage,
    cet4ContentPackage as ContentPackage,
    cet6ContentPackage as ContentPackage,
    ieltsContentPackage as ContentPackage,
    toeflContentPackage as ContentPackage,
];

export const builtInExerciseInputs = builtInContentPackages.flatMap((contentPackage) =>
    createExerciseInputsFromPackage(contentPackage),
);
