import { aggregateLearningStats, createClozeExercise, gradeClozeExercise } from "@bestlng/core";
import type { AnswerNormalizationOptions, ClozeExercise, PracticeAttempt } from "@bestlng/core";
import Database from "@tauri-apps/plugin-sql";

import { starterContentPackage, starterExerciseInputs } from "./seed";
import type {
    AnswerStrictness,
    ContentPackView,
    LearningWorkspaceState,
    SubmitClozeAnswerInput,
    SubmitClozeAnswerResult,
    UserSettings,
    VocabularyEntryView,
    WeakWordView,
    WeeklyPracticePoint,
} from "./types";

const databaseUrl = "sqlite:bestlng.db";

const defaultSettings: UserSettings = {
    autoAddWrongAnswers: true,
    dailyTarget: 12,
    onlyLicensedContent: true,
    strictness: "standard",
};

type SqlBool = 0 | 1;

interface CountRow {
    readonly count: number;
}

interface SettingRow {
    readonly key: string;
    readonly value: string;
}

interface ContentPackRow {
    readonly description: string;
    readonly id: string;
    readonly is_enabled: SqlBool;
    readonly license_name: string;
    readonly license_url: string;
    readonly source: string;
    readonly title: string;
}

interface SentenceRow {
    readonly id: string;
    readonly pack_id: string;
    readonly tags: string;
    readonly text: string;
    readonly translation: string;
}

interface BlankRow {
    readonly accepted_answers: string;
    readonly answer: string;
    readonly hint: string;
    readonly id: string;
    readonly sentence_id: string;
}

interface VocabularyRow {
    readonly due_count: number;
    readonly id: string;
    readonly meaning: string;
    readonly next_review_at: string;
    readonly status: "learning" | "needs_review" | "mastered";
    readonly term: string;
}

interface AttemptRow {
    readonly answer: string;
    readonly blank_answer: string;
    readonly created_at: string;
    readonly is_correct: SqlBool;
    readonly sentence_id: string;
}

let databasePromise: Promise<Database> | null = null;
let memorySettings = defaultSettings;
let memoryAttempts: AttemptRow[] = [];

function isTauriRuntime(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function getDatabase(): Promise<Database | null> {
    if (!isTauriRuntime()) {
        return null;
    }

    databasePromise ??= Database.load(databaseUrl);

    return databasePromise;
}

function createId(prefix: string): string {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function toSqlBool(value: boolean): SqlBool {
    return value ? 1 : 0;
}

function fromSqlBool(value: SqlBool): boolean {
    return value === 1;
}

function parseStringArray(value: string): string[] {
    try {
        const parsed: unknown = JSON.parse(value);

        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
            return parsed;
        }
    } catch {
        // JSON 来自本地库，解析失败时回退为空数组，避免 UI 因单条坏数据崩溃。
    }

    return [];
}

function getAnswerOptions(strictness: AnswerStrictness): Partial<AnswerNormalizationOptions> {
    if (strictness === "strict") {
        return {
            collapseWhitespace: true,
            ignoreCase: false,
            ignorePunctuation: false,
            normalizeUnicode: true,
            trimWhitespace: true,
        };
    }

    if (strictness === "relaxed") {
        return {
            collapseWhitespace: true,
            ignoreCase: true,
            ignorePunctuation: true,
            normalizeUnicode: true,
            trimWhitespace: true,
        };
    }

    return {};
}

async function seedDatabase(db: Database): Promise<void> {
    const existingRows = await db.select<CountRow[]>("SELECT COUNT(*) AS count FROM content_packs");

    if ((existingRows[0]?.count ?? 0) > 0) {
        return;
    }

    const manifest = starterContentPackage.manifest;

    await db.execute(
        `INSERT INTO content_packs
            (id, title, description, source, license_name, license_url, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            manifest.id,
            manifest.name,
            manifest.description ?? "",
            manifest.authors.join(", "),
            manifest.license?.name ?? "未声明",
            manifest.license?.url ?? "",
            1,
        ],
    );

    for (const exercise of starterExerciseInputs) {
        await db.execute(
            `INSERT INTO sentences
                (id, pack_id, source_lang, target_lang, text, translation, level, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                exercise.id,
                exercise.sourcePackageId,
                manifest.sourceLanguage,
                manifest.targetLanguage,
                exercise.sentence,
                exercise.translation,
                "A1",
                JSON.stringify(exercise.tags),
            ],
        );

        for (const [blankIndex, blank] of exercise.blanks.entries()) {
            await db.execute(
                `INSERT INTO sentence_blanks
                    (id, sentence_id, answer, accepted_answers, hint, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    blank.id,
                    exercise.id,
                    blank.answer,
                    JSON.stringify(blank.acceptedAnswers ?? []),
                    blank.hint ?? "",
                    blankIndex,
                ],
            );

            await db.execute(
                `INSERT OR IGNORE INTO vocabulary_entries
                    (id, term, meaning, lang, status, next_review_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    `vocab-${blank.id}`,
                    blank.answer,
                    blank.hint ?? exercise.translation,
                    manifest.sourceLanguage,
                    "learning",
                    new Date().toISOString(),
                ],
            );
        }
    }

    await saveSettingsToDatabase(db, defaultSettings);
}

async function saveSettingsToDatabase(db: Database, settings: UserSettings): Promise<void> {
    const settingsEntries: readonly [keyof UserSettings, string][] = [
        ["autoAddWrongAnswers", JSON.stringify(settings.autoAddWrongAnswers)],
        ["dailyTarget", String(settings.dailyTarget)],
        ["onlyLicensedContent", JSON.stringify(settings.onlyLicensedContent)],
        ["strictness", settings.strictness],
    ];

    for (const [key, value] of settingsEntries) {
        await db.execute(
            `INSERT INTO app_settings (key, value, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            [key, value],
        );
    }
}

function settingsFromRows(rows: readonly SettingRow[]): UserSettings {
    const values = new Map(rows.map((row) => [row.key, row.value]));
    const strictness = values.get("strictness");

    return {
        autoAddWrongAnswers: values.get("autoAddWrongAnswers") === "true",
        dailyTarget: Number(values.get("dailyTarget") ?? defaultSettings.dailyTarget),
        onlyLicensedContent: values.get("onlyLicensedContent") !== "false",
        strictness:
            strictness === "relaxed" || strictness === "strict" || strictness === "standard"
                ? strictness
                : defaultSettings.strictness,
    };
}

function buildExercises(
    sentences: readonly SentenceRow[],
    blanks: readonly BlankRow[],
): readonly ClozeExercise[] {
    const blanksBySentence = new Map<string, BlankRow[]>();

    for (const blank of blanks) {
        const current = blanksBySentence.get(blank.sentence_id) ?? [];

        current.push(blank);
        blanksBySentence.set(blank.sentence_id, current);
    }

    return sentences.map((sentence) =>
        createClozeExercise({
            blanks: (blanksBySentence.get(sentence.id) ?? []).map((blank) => ({
                acceptedAnswers: parseStringArray(blank.accepted_answers),
                answer: blank.answer,
                hint: blank.hint,
                id: blank.id,
            })),
            id: sentence.id,
            sentence: sentence.text,
            sourcePackageId: sentence.pack_id,
            tags: parseStringArray(sentence.tags),
            translation: sentence.translation,
        }),
    );
}

function pickActiveExercise(
    exercises: readonly ClozeExercise[],
    attempts: readonly AttemptRow[],
): ClozeExercise | null {
    const attemptedSentenceIds = new Set(attempts.map((attempt) => attempt.sentence_id));

    return (
        exercises.find((exercise) => !attemptedSentenceIds.has(exercise.id)) ?? exercises[0] ?? null
    );
}

function mapContentPacks(rows: readonly ContentPackRow[]): ContentPackView[] {
    return rows.map((row) => ({
        description: row.description,
        id: row.id,
        isEnabled: fromSqlBool(row.is_enabled),
        licenseName: row.license_name,
        licenseUrl: row.license_url,
        source: row.source,
        title: row.title,
    }));
}

function mapVocabulary(rows: readonly VocabularyRow[]): VocabularyEntryView[] {
    return rows.map((row) => ({
        dueCount: row.due_count,
        id: row.id,
        meaning: row.meaning,
        nextReviewAt: row.next_review_at,
        status: row.status,
        term: row.term,
    }));
}

function toPracticeAttempts(rows: readonly AttemptRow[]): PracticeAttempt[] {
    return rows.map((row) => ({
        answeredAt: row.created_at,
        exerciseId: row.sentence_id,
        expectedAnswer: row.blank_answer,
        isCorrect: fromSqlBool(row.is_correct),
    }));
}

function getTodayAttemptCount(attempts: readonly AttemptRow[], today: Date): number {
    const todayKey = today.toISOString().slice(0, 10);

    return attempts.filter((attempt) => attempt.created_at.slice(0, 10) === todayKey).length;
}

function buildWeeklyPractice(attempts: readonly AttemptRow[], today: Date): WeeklyPracticePoint[] {
    const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

    return Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(today);

        date.setDate(today.getDate() - (6 - offset));

        const key = date.toISOString().slice(0, 10);

        return {
            day: dayLabels[date.getDay()] ?? "",
            value: attempts.filter((attempt) => attempt.created_at.slice(0, 10) === key).length,
        };
    });
}

function buildWeakWords(attempts: readonly AttemptRow[]): WeakWordView[] {
    const stats = aggregateLearningStats(toPracticeAttempts(attempts), new Date());

    return stats.weakAnswers.map((weakAnswer) => ({
        term: weakAnswer.answer,
        totalCount: weakAnswer.totalCount,
        wrongCount: weakAnswer.wrongCount,
    }));
}

function buildState(input: {
    readonly attempts: readonly AttemptRow[];
    readonly blanks: readonly BlankRow[];
    readonly contentPacks: readonly ContentPackRow[];
    readonly isPersistent: boolean;
    readonly sentences: readonly SentenceRow[];
    readonly settings: UserSettings;
    readonly vocabulary: readonly VocabularyRow[];
}): LearningWorkspaceState {
    const exercises = buildExercises(input.sentences, input.blanks);
    const today = new Date();
    const stats = aggregateLearningStats(toPracticeAttempts(input.attempts), today);
    const vocabulary = mapVocabulary(input.vocabulary);

    return {
        activeExercise: pickActiveExercise(exercises, input.attempts),
        contentPacks: mapContentPacks(input.contentPacks),
        correctRate: stats.accuracy,
        dueVocabularyCount: vocabulary.filter((entry) => new Date(entry.nextReviewAt) <= today)
            .length,
        isPersistent: input.isPersistent,
        settings: input.settings,
        streakDays: stats.currentStreakDays,
        todayAttemptCount: getTodayAttemptCount(input.attempts, today),
        totalAttempts: stats.totalAttempts,
        totalSentences: input.sentences.length,
        vocabulary,
        weakWords: buildWeakWords(input.attempts),
        weeklyPractice: buildWeeklyPractice(input.attempts, today),
    };
}

async function loadFromDatabase(db: Database): Promise<LearningWorkspaceState> {
    await seedDatabase(db);

    const [contentPacks, sentences, blanks, vocabulary, attempts, settingsRows] = await Promise.all(
        [
            db.select<ContentPackRow[]>("SELECT * FROM content_packs ORDER BY created_at ASC"),
            db.select<SentenceRow[]>("SELECT * FROM sentences ORDER BY created_at ASC"),
            db.select<BlankRow[]>(
                "SELECT * FROM sentence_blanks ORDER BY sentence_id ASC, display_order ASC",
            ),
            db.select<VocabularyRow[]>(
                "SELECT * FROM vocabulary_entries ORDER BY next_review_at ASC, term ASC",
            ),
            db.select<AttemptRow[]>(
                `SELECT practice_attempts.answer,
                        sentence_blanks.answer AS blank_answer,
                        practice_attempts.created_at,
                        practice_attempts.is_correct,
                        practice_attempts.sentence_id
                   FROM practice_attempts
                   JOIN sentence_blanks ON sentence_blanks.id = practice_attempts.blank_id
                  ORDER BY practice_attempts.created_at ASC`,
            ),
            db.select<SettingRow[]>("SELECT key, value FROM app_settings"),
        ],
    );

    return buildState({
        attempts,
        blanks,
        contentPacks,
        isPersistent: true,
        sentences,
        settings: settingsFromRows(settingsRows),
        vocabulary,
    });
}

function getMemoryRows(): {
    readonly blanks: readonly BlankRow[];
    readonly contentPacks: readonly ContentPackRow[];
    readonly sentences: readonly SentenceRow[];
    readonly vocabulary: readonly VocabularyRow[];
} {
    const manifest = starterContentPackage.manifest;
    const contentPacks: ContentPackRow[] = [
        {
            description: manifest.description ?? "",
            id: manifest.id,
            is_enabled: 1,
            license_name: manifest.license?.name ?? "未声明",
            license_url: manifest.license?.url ?? "",
            source: manifest.authors.join(", "),
            title: manifest.name,
        },
    ];
    const sentences: SentenceRow[] = starterExerciseInputs.map((exercise) => ({
        id: exercise.id,
        pack_id: exercise.sourcePackageId,
        tags: JSON.stringify(exercise.tags),
        text: exercise.sentence,
        translation: exercise.translation,
    }));
    const blanks: BlankRow[] = starterExerciseInputs.flatMap((exercise) =>
        exercise.blanks.map((blank) => ({
            accepted_answers: JSON.stringify(blank.acceptedAnswers ?? []),
            answer: blank.answer,
            hint: blank.hint ?? "",
            id: blank.id,
            sentence_id: exercise.id,
        })),
    );
    const vocabulary: VocabularyRow[] = blanks.map((blank) => ({
        due_count: memoryAttempts.filter(
            (attempt) => attempt.blank_answer === blank.answer && attempt.is_correct === 0,
        ).length,
        id: `vocab-${blank.id}`,
        meaning: blank.hint,
        next_review_at: new Date().toISOString(),
        status: "learning",
        term: blank.answer,
    }));

    return { blanks, contentPacks, sentences, vocabulary };
}

function loadFromMemory(): LearningWorkspaceState {
    const rows = getMemoryRows();

    return buildState({
        attempts: memoryAttempts,
        blanks: rows.blanks,
        contentPacks: rows.contentPacks,
        isPersistent: false,
        sentences: rows.sentences,
        settings: memorySettings,
        vocabulary: rows.vocabulary,
    });
}

export async function loadLearningWorkspace(): Promise<LearningWorkspaceState> {
    const db = await getDatabase();

    if (db === null) {
        return loadFromMemory();
    }

    return loadFromDatabase(db);
}

async function updateWrongAnswerQueue(
    db: Database,
    blankId: string,
    expectedAnswer: string,
    hint: string,
): Promise<void> {
    const vocabularyId = `vocab-${blankId}`;
    const now = new Date().toISOString();

    await db.execute(
        `INSERT INTO vocabulary_entries
            (id, term, meaning, lang, status, next_review_at, due_count, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(term) DO UPDATE SET
            status = 'needs_review',
            next_review_at = excluded.next_review_at,
            due_count = due_count + 1,
            updated_at = CURRENT_TIMESTAMP`,
        [vocabularyId, expectedAnswer, hint, "en", "needs_review", now],
    );

    await db.execute(
        `INSERT INTO review_queue
            (id, vocabulary_id, due_at, interval_days, ease_factor, repetitions, lapses, updated_at)
         VALUES ($1, $2, $3, 1, 2.3, 0, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(vocabulary_id) DO UPDATE SET
            due_at = excluded.due_at,
            interval_days = 1,
            lapses = lapses + 1,
            updated_at = CURRENT_TIMESTAMP`,
        [`review-${vocabularyId}`, vocabularyId, now],
    );
}

export async function submitClozeAnswer(
    input: SubmitClozeAnswerInput,
): Promise<SubmitClozeAnswerResult> {
    const currentState = await loadLearningWorkspace();
    const grade = gradeClozeExercise(
        input.exercise,
        input.submittedAnswers,
        getAnswerOptions(currentState.settings.strictness),
    );
    const firstBlankGrade = grade.blanks[0];
    const firstBlank = input.exercise.blanks[0];

    if (firstBlankGrade === undefined || firstBlank === undefined) {
        throw new Error("当前挖空题缺少可判定的空位。");
    }

    const expectedAnswer = firstBlank.answer;
    const db = await getDatabase();

    if (db === null) {
        memoryAttempts = [
            ...memoryAttempts,
            {
                answer: firstBlankGrade.submittedAnswer,
                blank_answer: expectedAnswer,
                created_at: new Date().toISOString(),
                is_correct: toSqlBool(grade.isCorrect),
                sentence_id: input.exercise.id,
            },
        ];

        return {
            expectedAnswer,
            grade,
            state: loadFromMemory(),
        };
    }

    await db.execute(
        `INSERT INTO practice_attempts
            (id, sentence_id, blank_id, answer, normalized_answer, is_correct)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            createId("attempt"),
            input.exercise.id,
            firstBlank.id,
            firstBlankGrade.submittedAnswer,
            firstBlankGrade.check.submittedNormalized,
            toSqlBool(grade.isCorrect),
        ],
    );

    if (!grade.isCorrect && currentState.settings.autoAddWrongAnswers) {
        await updateWrongAnswerQueue(db, firstBlank.id, expectedAnswer, firstBlank.hint ?? "");
    }

    return {
        expectedAnswer,
        grade,
        state: await loadFromDatabase(db),
    };
}

export async function saveUserSettings(settings: UserSettings): Promise<LearningWorkspaceState> {
    const sanitizedSettings: UserSettings = {
        ...settings,
        dailyTarget: Math.max(1, Math.round(settings.dailyTarget)),
    };
    const db = await getDatabase();

    if (db === null) {
        memorySettings = sanitizedSettings;
        return loadFromMemory();
    }

    await saveSettingsToDatabase(db, sanitizedSettings);

    return loadFromDatabase(db);
}
