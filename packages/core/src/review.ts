export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewState {
    readonly dueAt: string;
    readonly intervalDays: number;
    readonly easeFactor: number;
    readonly repetitions: number;
    readonly lapses: number;
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;
const minimumEaseFactor = 1.3;
const initialEaseFactor = 2.5;

function clampEaseFactor(easeFactor: number): number {
    return Math.max(minimumEaseFactor, Number(easeFactor.toFixed(2)));
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * dayInMilliseconds);
}

function toIsoString(date: Date): string {
    return date.toISOString();
}

/**
 * 创建新条目的初始复习状态：立即到期，等待首次练习结果推动。
 */
export function createInitialReviewState(createdAt: Date): ReviewState {
    return {
        dueAt: toIsoString(createdAt),
        intervalDays: 0,
        easeFactor: initialEaseFactor,
        repetitions: 0,
        lapses: 0,
    };
}

/**
 * 简化版间隔重复调度。保留易度因子和连续次数，足够支撑本地 v1 的复习队列。
 */
export function scheduleNextReview(
    state: ReviewState,
    rating: ReviewRating,
    reviewedAt: Date,
): ReviewState {
    if (rating === "again") {
        const intervalDays = 1;

        return {
            dueAt: toIsoString(addDays(reviewedAt, intervalDays)),
            intervalDays,
            easeFactor: clampEaseFactor(state.easeFactor - 0.2),
            repetitions: 0,
            lapses: state.lapses + 1,
        };
    }

    if (rating === "hard") {
        const intervalDays = Math.max(1, Math.ceil(state.intervalDays * 1.2));

        return {
            dueAt: toIsoString(addDays(reviewedAt, intervalDays)),
            intervalDays,
            easeFactor: clampEaseFactor(state.easeFactor - 0.1),
            repetitions: state.repetitions + 1,
            lapses: state.lapses,
        };
    }

    if (rating === "easy") {
        const baseInterval =
            state.repetitions === 0 ? 4 : state.intervalDays * state.easeFactor * 1.3;
        const intervalDays = Math.max(4, Math.round(baseInterval));
        const easeFactor = clampEaseFactor(state.easeFactor + 0.15);

        return {
            dueAt: toIsoString(addDays(reviewedAt, intervalDays)),
            intervalDays,
            easeFactor,
            repetitions: state.repetitions + 1,
            lapses: state.lapses,
        };
    }

    const baseInterval =
        state.repetitions === 0
            ? 1
            : state.repetitions === 1
              ? 3
              : state.intervalDays * state.easeFactor;
    const intervalDays = Math.max(1, Math.round(baseInterval));

    return {
        dueAt: toIsoString(addDays(reviewedAt, intervalDays)),
        intervalDays,
        easeFactor: clampEaseFactor(state.easeFactor),
        repetitions: state.repetitions + 1,
        lapses: state.lapses,
    };
}

/**
 * 从复习队列中筛出当前已到期条目，便于 UI 或数据层生成今日复习。
 */
export function getDueReviews<T extends { readonly review: ReviewState }>(
    items: readonly T[],
    now: Date,
): T[] {
    const nowTime = now.getTime();

    return items.filter((item) => new Date(item.review.dueAt).getTime() <= nowTime);
}
