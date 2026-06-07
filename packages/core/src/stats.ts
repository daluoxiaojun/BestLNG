export interface PracticeAttempt {
    readonly exerciseId: string;
    readonly answeredAt: string;
    readonly isCorrect: boolean;
    readonly expectedAnswer?: string;
    readonly sourcePackageId?: string;
    readonly timeSpentSeconds?: number;
}

export interface WeakAnswerStat {
    readonly answer: string;
    readonly wrongCount: number;
    readonly totalCount: number;
}

export interface LearningStats {
    readonly totalAttempts: number;
    readonly correctAttempts: number;
    readonly wrongAttempts: number;
    readonly accuracy: number;
    readonly studiedDays: number;
    readonly currentStreakDays: number;
    readonly averageTimeSpentSeconds: number;
    readonly weakAnswers: readonly WeakAnswerStat[];
}

interface MutableWeakAnswerStat {
    wrongCount: number;
    totalCount: number;
}

function getUtcDateKey(value: string): string {
    return new Date(value).toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);

    return nextDate;
}

/**
 * 聚合学习记录，输出正确率、连续学习天数和薄弱答案等核心统计。
 */
export function aggregateLearningStats(
    attempts: readonly PracticeAttempt[],
    today: Date,
): LearningStats {
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
    const wrongAttempts = totalAttempts - correctAttempts;
    const accuracy = totalAttempts === 0 ? 0 : correctAttempts / totalAttempts;
    const studiedDayKeys = new Set(attempts.map((attempt) => getUtcDateKey(attempt.answeredAt)));
    const totalTimeSpent = attempts.reduce(
        (sum, attempt) => sum + (attempt.timeSpentSeconds ?? 0),
        0,
    );
    const averageTimeSpentSeconds = totalAttempts === 0 ? 0 : totalTimeSpent / totalAttempts;
    const weakAnswerMap = new Map<string, MutableWeakAnswerStat>();

    for (const attempt of attempts) {
        if (attempt.expectedAnswer === undefined) {
            continue;
        }

        const current = weakAnswerMap.get(attempt.expectedAnswer) ?? {
            wrongCount: 0,
            totalCount: 0,
        };

        current.totalCount += 1;

        if (!attempt.isCorrect) {
            current.wrongCount += 1;
        }

        weakAnswerMap.set(attempt.expectedAnswer, current);
    }

    const weakAnswers = Array.from(weakAnswerMap.entries())
        .filter(([, stat]) => stat.wrongCount > 0)
        .map(
            ([answer, stat]): WeakAnswerStat => ({
                answer,
                wrongCount: stat.wrongCount,
                totalCount: stat.totalCount,
            }),
        )
        .sort((left, right) => {
            if (right.wrongCount !== left.wrongCount) {
                return right.wrongCount - left.wrongCount;
            }

            return right.totalCount - left.totalCount;
        });

    let currentStreakDays = 0;
    let cursor = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    while (studiedDayKeys.has(cursor.toISOString().slice(0, 10))) {
        currentStreakDays += 1;
        cursor = addUtcDays(cursor, -1);
    }

    return {
        totalAttempts,
        correctAttempts,
        wrongAttempts,
        accuracy,
        studiedDays: studiedDayKeys.size,
        currentStreakDays,
        averageTimeSpentSeconds,
        weakAnswers,
    };
}
