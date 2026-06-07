import type { ContentPackage } from "./types";

export const sampleContentPackage: ContentPackage = {
    manifest: {
        id: "bestlng-sample-en-zh",
        name: "BestLNG 英中示例内容包",
        version: "0.1.0",
        description: "用于本地自用 v1 的许可证明确示例内容。",
        sourceLanguage: "en",
        targetLanguage: "zh-Hans",
        license: {
            name: "CC0-1.0",
            url: "https://creativecommons.org/publicdomain/zero/1.0/",
            attribution: "BestLNG contributors",
        },
        authors: ["BestLNG contributors"],
    },
    sentences: [
        {
            id: "sample-001",
            text: "I practice English every day.",
            translation: "我每天练习英语。",
            blanks: [
                {
                    id: "sample-001-language",
                    answer: "English",
                    acceptedAnswers: ["english"],
                    hint: "一种语言",
                },
            ],
            tags: ["daily", "language"],
        },
        {
            id: "sample-002",
            text: "Small steps make learning easier.",
            translation: "小步前进会让学习更轻松。",
            blanks: [
                {
                    id: "sample-002-verb",
                    answer: "make",
                    hint: "表示“使得”",
                },
            ],
            tags: ["habit"],
        },
    ],
};
