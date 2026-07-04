import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    createExerciseInputsFromPackage,
    parseContentPackageCsv,
    parseContentPackageJson,
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

describe("内容包导入", () => {
    it("从 CSV 生成许可证明确的内容包", () => {
        const contentPackage = parseContentPackageCsv(
            [
                "id,text,translation,answer,hint,accepted_answers,tags",
                'greeting-1,"I, really like apples.",我真的喜欢苹果,like,喜欢,"love|enjoy","A1|food"',
            ].join("\n"),
            {
                author: "BestLNG 用户",
                licenseAttribution: "用户自备内容",
                licenseName: "CC0-1.0",
                packageId: "user-pack",
                packageName: "用户导入包",
                sourceLanguage: "en",
                targetLanguage: "zh-CN",
            },
        );

        expect(contentPackage.sentences[0]?.text).toBe("I, really like apples.");
        expect(contentPackage.sentences[0]?.blanks[0]?.acceptedAnswers).toEqual(["love", "enjoy"]);
        expect(validateContentPackage(contentPackage).isValid).toBe(true);
    });

    it("从 JSON 读取完整内容包并执行校验", () => {
        const contentPackage = parseContentPackageJson(JSON.stringify(sampleContentPackage));

        expect(contentPackage.manifest.id).toBe(sampleContentPackage.manifest.id);
        expect(contentPackage.sentences.length).toBeGreaterThan(0);
    });

    it("生成的考试内容包均可导入", () => {
        const packDirectoryUrl = new URL("../packs/exam/", import.meta.url);
        const packFileNames = readdirSync(packDirectoryUrl).filter((fileName) =>
            fileName.endsWith(".json"),
        );

        expect(packFileNames).toEqual([
            "bestlng-cet4-en-zh.json",
            "bestlng-cet6-en-zh.json",
            "bestlng-ielts-en-zh.json",
            "bestlng-toefl-en-zh.json",
        ]);

        for (const packFileName of packFileNames) {
            const contentPackage = parseContentPackageJson(
                readFileSync(new URL(packFileName, packDirectoryUrl), "utf-8"),
            );
            const firstWords = contentPackage.sentences
                .slice(0, 50)
                .map((sentence) => sentence.blanks[0]?.answer.toLowerCase() ?? "");
            const alphabeticFirstWords = [...firstWords].sort((first, second) =>
                first.localeCompare(second),
            );

            expect(contentPackage.sentences.length).toBeGreaterThan(1000);
            expect(contentPackage.manifest.license?.attribution).toContain("ECDICT");
            expect(validateContentPackage(contentPackage).isValid).toBe(true);
            expect(contentPackage.sentences[0]?.tags).toContain("order:00001");
            expect(firstWords).not.toEqual(alphabeticFirstWords);
        }
    });
});
