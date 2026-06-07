export interface AnswerNormalizationOptions {
    readonly trimWhitespace: boolean;
    readonly collapseWhitespace: boolean;
    readonly ignoreCase: boolean;
    readonly ignorePunctuation: boolean;
    readonly normalizeUnicode: boolean;
}

export interface AnswerCheckInput {
    readonly submittedAnswer: string;
    readonly expectedAnswers: readonly string[];
    readonly options?: Partial<AnswerNormalizationOptions>;
}

export interface AnswerCheckResult {
    readonly isCorrect: boolean;
    readonly submittedNormalized: string;
    readonly expectedNormalized: readonly string[];
    readonly matchedAnswer?: string;
}

export const defaultAnswerNormalizationOptions: AnswerNormalizationOptions = {
    trimWhitespace: true,
    collapseWhitespace: true,
    ignoreCase: true,
    ignorePunctuation: true,
    normalizeUnicode: true,
};

const whitespacePattern = /\s+/gu;
const punctuationPattern = /\p{P}+/gu;

function resolveNormalizationOptions(
    options: Partial<AnswerNormalizationOptions> | undefined,
): AnswerNormalizationOptions {
    return {
        ...defaultAnswerNormalizationOptions,
        ...options,
    };
}

/**
 * 归一化用户答案和标准答案，用于把大小写、空格、标点差异从判题中剥离。
 */
export function normalizeAnswer(
    answer: string,
    options?: Partial<AnswerNormalizationOptions>,
): string {
    const resolvedOptions = resolveNormalizationOptions(options);
    let normalizedAnswer = resolvedOptions.normalizeUnicode ? answer.normalize("NFKC") : answer;

    if (resolvedOptions.trimWhitespace) {
        normalizedAnswer = normalizedAnswer.trim();
    }

    if (resolvedOptions.ignorePunctuation) {
        normalizedAnswer = normalizedAnswer.replace(punctuationPattern, "");
    }

    if (resolvedOptions.ignoreCase) {
        normalizedAnswer = normalizedAnswer.toLocaleLowerCase();
    }

    if (resolvedOptions.collapseWhitespace) {
        normalizedAnswer = normalizedAnswer.replace(whitespacePattern, " ");
    }

    if (resolvedOptions.trimWhitespace) {
        normalizedAnswer = normalizedAnswer.trim();
    }

    return normalizedAnswer;
}

/**
 * 判定单个填空答案；expectedAnswers 支持主答案与可接受答案并列。
 */
export function checkAnswer(input: AnswerCheckInput): AnswerCheckResult {
    if (input.expectedAnswers.length === 0) {
        throw new Error("expectedAnswers 至少需要包含一个答案。");
    }

    const submittedNormalized = normalizeAnswer(input.submittedAnswer, input.options);
    const expectedNormalized = input.expectedAnswers.map((answer) =>
        normalizeAnswer(answer, input.options),
    );
    const matchedIndex = expectedNormalized.findIndex((answer) => answer === submittedNormalized);

    return {
        isCorrect: matchedIndex >= 0,
        submittedNormalized,
        expectedNormalized,
        matchedAnswer: matchedIndex >= 0 ? input.expectedAnswers[matchedIndex] : undefined,
    };
}
