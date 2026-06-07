import { describe, expect, it } from "vitest";

import {
    aggregateLearningStats,
    checkAnswer,
    createClozeExercise,
    createInitialReviewState,
    gradeClozeExercise,
    scheduleNextReview,
} from "./index";

describe("答案判定", () => {
    it("接受完全正确的正常答案", () => {
        const result = checkAnswer({
            submittedAnswer: "hello world",
            expectedAnswers: ["hello world"],
        });

        expect(result.isCorrect).toBe(true);
        expect(result.matchedAnswer).toBe("hello world");
    });

    it("归一化大小写、空格和标点差异", () => {
        const result = checkAnswer({
            submittedAnswer: "  HELLO,   world!  ",
            expectedAnswers: ["hello world"],
        });

        expect(result.isCorrect).toBe(true);
        expect(result.submittedNormalized).toBe("hello world");
    });

    it("拒绝错误答案", () => {
        const result = checkAnswer({
            submittedAnswer: "hello moon",
            expectedAnswers: ["hello world"],
        });

        expect(result.isCorrect).toBe(false);
    });
});

describe("句子挖空练习", () => {
    it("创建挖空模型并对整题判分", () => {
        const exercise = createClozeExercise({
            id: "sentence-1",
            sentence: "I practice English every day.",
            translation: "我每天练习英语。",
            blanks: [{ id: "blank-1", answer: "English", hint: "语言" }],
            sourcePackageId: "sample",
            tags: ["daily"],
        });

        expect(exercise.clozeSentence).toBe("I practice ____ every day.");

        const grade = gradeClozeExercise(exercise, {
            "blank-1": "english",
        });

        expect(grade.isCorrect).toBe(true);
        expect(grade.correctCount).toBe(1);
    });
});

describe("复习调度", () => {
    it("根据评分生成下一次复习时间", () => {
        const reviewedAt = new Date("2026-06-06T00:00:00.000Z");
        const initialState = createInitialReviewState(reviewedAt);
        const nextState = scheduleNextReview(initialState, "good", reviewedAt);

        expect(nextState.intervalDays).toBe(1);
        expect(nextState.repetitions).toBe(1);
        expect(nextState.dueAt).toBe("2026-06-07T00:00:00.000Z");

        const lapseState = scheduleNextReview(nextState, "again", reviewedAt);

        expect(lapseState.repetitions).toBe(0);
        expect(lapseState.lapses).toBe(1);
    });
});

describe("学习统计", () => {
    it("聚合正确率、连续天数和薄弱答案", () => {
        const stats = aggregateLearningStats(
            [
                {
                    exerciseId: "a",
                    answeredAt: "2026-06-04T08:00:00.000Z",
                    isCorrect: true,
                    expectedAnswer: "hello",
                    timeSpentSeconds: 10,
                },
                {
                    exerciseId: "b",
                    answeredAt: "2026-06-05T08:00:00.000Z",
                    isCorrect: false,
                    expectedAnswer: "world",
                    timeSpentSeconds: 20,
                },
                {
                    exerciseId: "c",
                    answeredAt: "2026-06-06T08:00:00.000Z",
                    isCorrect: true,
                    expectedAnswer: "world",
                    timeSpentSeconds: 40,
                },
            ],
            new Date("2026-06-06T12:00:00.000Z"),
        );

        expect(stats.totalAttempts).toBe(3);
        expect(stats.correctAttempts).toBe(2);
        expect(stats.accuracy).toBeCloseTo(2 / 3);
        expect(stats.studiedDays).toBe(3);
        expect(stats.currentStreakDays).toBe(3);
        expect(stats.averageTimeSpentSeconds).toBeCloseTo(70 / 3);
        expect(stats.weakAnswers).toEqual([{ answer: "world", wrongCount: 1, totalCount: 2 }]);
    });
});
