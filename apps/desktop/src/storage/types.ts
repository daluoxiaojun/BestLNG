import type { ClozeExercise, ClozeGradeResult } from "@bestlng/core";

export type AnswerStrictness = "relaxed" | "standard" | "strict";

export interface UserSettings {
    readonly activeContentPackId: string;
    readonly autoAddWrongAnswers: boolean;
    readonly dailyTarget: number;
    readonly onlyLicensedContent: boolean;
    readonly strictness: AnswerStrictness;
}

export interface ContentPackView {
    readonly description: string;
    readonly id: string;
    readonly isEnabled: boolean;
    readonly licenseName: string;
    readonly licenseUrl: string;
    readonly sentenceCount: number;
    readonly source: string;
    readonly title: string;
}

export interface VocabularyEntryView {
    readonly dueCount: number;
    readonly id: string;
    readonly meaning: string;
    readonly nextReviewAt: string;
    readonly status: "learning" | "needs_review" | "mastered";
    readonly term: string;
}

export interface VocabularyReviewResult {
    readonly nextReviewAt: string;
    readonly state: LearningWorkspaceState;
}

export interface SelectContentPackResult {
    readonly activeContentPackId: string;
    readonly state: LearningWorkspaceState;
}

export interface WeeklyPracticePoint {
    readonly day: string;
    readonly value: number;
}

export interface WeakWordView {
    readonly term: string;
    readonly totalCount: number;
    readonly wrongCount: number;
}

export interface LearningWorkspaceState {
    readonly activeExercise: ClozeExercise | null;
    readonly activeContentPackId: string;
    readonly contentPacks: readonly ContentPackView[];
    readonly correctRate: number;
    readonly dueVocabularyCount: number;
    readonly isPersistent: boolean;
    readonly settings: UserSettings;
    readonly streakDays: number;
    readonly todayAttemptCount: number;
    readonly totalAttempts: number;
    readonly totalSentences: number;
    readonly vocabulary: readonly VocabularyEntryView[];
    readonly weakWords: readonly WeakWordView[];
    readonly weeklyPractice: readonly WeeklyPracticePoint[];
}

export interface SubmitClozeAnswerInput {
    readonly exercise: ClozeExercise;
    readonly submittedAnswers: Readonly<Record<string, string>>;
}

export interface SubmitClozeAnswerResult {
    readonly expectedAnswer: string;
    readonly grade: ClozeGradeResult;
    readonly state: LearningWorkspaceState;
}

export interface BackupImportResult {
    readonly importedAt: string;
    readonly state: LearningWorkspaceState;
}

export interface ContentImportResult {
    readonly importedSentenceCount: number;
    readonly packageName: string;
    readonly state: LearningWorkspaceState;
}
