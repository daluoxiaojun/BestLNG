import { describe, expect, it } from "vitest";

import {
    createExerciseInputsFromPackage,
    sampleContentPackage,
    validateContentPackage,
    type ContentPackage,
} from "./index";

describe("内容包校验", () => {
    it("示例内容包校验通过", () => {
        const result = validateContentPackage(sampleContentPackage);

        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it("拒绝缺少许可证的内容包", () => {
        const packageWithoutLicense: ContentPackage = {
            manifest: {
                id: "missing-license",
                name: "缺少许可证",
                version: "0.1.0",
                sourceLanguage: "en",
                targetLanguage: "zh-Hans",
                authors: ["BestLNG contributors"],
            },
            sentences: [
                {
                    id: "sentence-1",
                    text: "Hello world.",
                    translation: "你好，世界。",
                    blanks: [{ id: "blank-1", answer: "world" }],
                },
            ],
        };

        const result = validateContentPackage(packageWithoutLicense);

        expect(result.isValid).toBe(false);
        expect(result.issues).toContainEqual({
            path: "manifest.license",
            message: "内容包必须声明许可证信息。",
        });
    });
});

describe("内容包转练习输入", () => {
    it("从内容包生成挖空练习输入", () => {
        const exercises = createExerciseInputsFromPackage(sampleContentPackage);

        expect(exercises).toHaveLength(2);
        expect(exercises[0]).toEqual({
            id: "bestlng-sample-en-zh:sample-001",
            sentence: "I practice English every day.",
            translation: "我每天练习英语。",
            blanks: [
                {
                    id: "sample-001-language",
                    answer: "English",
                    acceptedAnswers: ["english"],
                    hint: "一种语言",
                },
            ],
            sourcePackageId: "bestlng-sample-en-zh",
            tags: ["daily", "language"],
        });
    });
});
