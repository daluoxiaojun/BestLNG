import { checkAnswer, type AnswerCheckResult, type AnswerNormalizationOptions } from "./answer";

export interface ClozeBlankInput {
    readonly id: string;
    readonly answer: string;
    readonly acceptedAnswers?: readonly string[];
    readonly hint?: string;
}

export interface ClozeExerciseInput {
    readonly id: string;
    readonly sentence: string;
    readonly translation: string;
    readonly blanks: readonly ClozeBlankInput[];
    readonly sourcePackageId?: string;
    readonly tags?: readonly string[];
}

export interface ClozeBlank extends ClozeBlankInput {
    readonly displayToken: string;
    readonly answerText: string;
}

export interface ClozeExercise {
    readonly id: string;
    readonly sentence: string;
    readonly clozeSentence: string;
    readonly translation: string;
    readonly blanks: readonly ClozeBlank[];
    readonly sourcePackageId?: string;
    readonly tags: readonly string[];
}

export interface ClozeBlankGrade {
    readonly blankId: string;
    readonly submittedAnswer: string;
    readonly isCorrect: boolean;
    readonly check: AnswerCheckResult;
}

export interface ClozeGradeResult {
    readonly exerciseId: string;
    readonly isCorrect: boolean;
    readonly correctCount: number;
    readonly totalCount: number;
    readonly blanks: readonly ClozeBlankGrade[];
}

const clozeMask = "____";

function requireNonEmptyText(value: string, fieldName: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${fieldName} 不能为空。`);
    }
}

function replaceFirstAnswer(sentence: string, answer: string): string {
    const answerIndex = sentence.indexOf(answer);

    if (answerIndex < 0) {
        throw new Error(`句子中找不到挖空答案：${answer}`);
    }

    return `${sentence.slice(0, answerIndex)}${clozeMask}${sentence.slice(
        answerIndex + answer.length,
    )}`;
}

/**
 * 构建句子挖空练习模型。按 blanks 顺序替换首次出现的答案，保证输出稳定可测试。
 */
export function createClozeExercise(input: ClozeExerciseInput): ClozeExercise {
    requireNonEmptyText(input.id, "练习 id");
    requireNonEmptyText(input.sentence, "练习句子");
    requireNonEmptyText(input.translation, "翻译提示");

    if (input.blanks.length === 0) {
        throw new Error("挖空练习至少需要一个空位。");
    }

    let clozeSentence = input.sentence;
    const seenBlankIds = new Set<string>();
    const blanks = input.blanks.map((blank): ClozeBlank => {
        requireNonEmptyText(blank.id, "空位 id");
        requireNonEmptyText(blank.answer, "空位答案");

        if (seenBlankIds.has(blank.id)) {
            throw new Error(`空位 id 重复：${blank.id}`);
        }

        seenBlankIds.add(blank.id);
        clozeSentence = replaceFirstAnswer(clozeSentence, blank.answer);

        return {
            ...blank,
            displayToken: clozeMask,
            answerText: blank.answer,
        };
    });

    return {
        id: input.id,
        sentence: input.sentence,
        clozeSentence,
        translation: input.translation,
        blanks,
        sourcePackageId: input.sourcePackageId,
        tags: input.tags ?? [],
    };
}

/**
 * 对整道挖空题判分；所有空位正确时，整题才算正确。
 */
export function gradeClozeExercise(
    exercise: ClozeExercise,
    submittedAnswers: Readonly<Record<string, string>>,
    options?: Partial<AnswerNormalizationOptions>,
): ClozeGradeResult {
    const blankGrades = exercise.blanks.map((blank): ClozeBlankGrade => {
        const submittedAnswer = submittedAnswers[blank.id] ?? "";
        const expectedAnswers = [blank.answer, ...(blank.acceptedAnswers ?? [])];
        const check = checkAnswer({
            submittedAnswer,
            expectedAnswers,
            options,
        });

        return {
            blankId: blank.id,
            submittedAnswer,
            isCorrect: check.isCorrect,
            check,
        };
    });
    const correctCount = blankGrades.filter((blank) => blank.isCorrect).length;

    return {
        exerciseId: exercise.id,
        isCorrect: correctCount === exercise.blanks.length,
        correctCount,
        totalCount: exercise.blanks.length,
        blanks: blankGrades,
    };
}
