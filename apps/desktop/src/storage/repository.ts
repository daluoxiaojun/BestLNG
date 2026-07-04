import {
    aggregateLearningStats,
    createClozeExercise,
    gradeClozeExercise,
    scheduleNextReview,
} from "@bestlng/core";
import type { AnswerNormalizationOptions, ClozeExercise, PracticeAttempt } from "@bestlng/core";
import type { ReviewRating, ReviewState } from "@bestlng/core";
import {
    createExerciseInputsFromPackage,
    parseContentPackageCsv,
    parseContentPackageJson,
} from "@bestlng/content";
import type { ContentPackage } from "@bestlng/content";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";

import { resolveActiveContentPackIdFromPacks } from "./activeContentPack";
import { builtInContentPackages, builtInExerciseInputs } from "./seed";
import type {
    AnswerStrictness,
    BackupImportResult,
    ContentPackView,
    ContentImportResult,
    LearningWorkspaceState,
    SelectContentPackResult,
    SubmitClozeAnswerInput,
    SubmitClozeAnswerResult,
    UserSettings,
    VocabularyEntryView,
    VocabularyReviewResult,
    WeakWordView,
    WeeklyPracticePoint,
} from "./types";

const databaseUrl = "sqlite:bestlng.db";
const backupAppId = "bestlng";
const backupSchemaVersion = 1;

const defaultSettings: UserSettings = {
    activeContentPackId: "",
    autoAddWrongAnswers: true,
    dailyTarget: 12,
    onlyLicensedContent: true,
    strictness: "standard",
};

type SqlBool = 0 | 1;

interface CountRow {
    readonly count: number;
}

interface PackSeedRow {
    readonly description: string;
    readonly sentence_count: number;
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
    readonly sentence_count?: number;
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
    readonly blank_order?: number;
    readonly due_count: number;
    readonly id: string;
    readonly meaning: string;
    readonly next_review_at: string;
    readonly pack_id?: string;
    readonly sentence_id?: string;
    readonly sentence_tags?: string;
    readonly status: "learning" | "needs_review" | "mastered";
    readonly term: string;
}

interface ReviewQueueRow {
    readonly due_at: string;
    readonly ease_factor: number;
    readonly interval_days: number;
    readonly lapses: number;
    readonly repetitions: number;
}

interface AttemptRow {
    readonly answer: string;
    readonly blank_answer: string;
    readonly created_at: string;
    readonly is_correct: SqlBool;
    readonly sentence_id: string;
}

interface BackupContentPackRow extends ContentPackRow {
    readonly created_at: string;
}

interface BackupSentenceRow extends SentenceRow {
    readonly created_at: string;
    readonly level: string;
    readonly source_lang: string;
    readonly target_lang: string;
}

interface BackupBlankRow extends BlankRow {
    readonly display_order: number;
}

interface BackupVocabularyRow extends VocabularyRow {
    readonly created_at: string;
    readonly lang: string;
    readonly updated_at: string;
}

interface BackupPracticeAttemptRow {
    readonly answer: string;
    readonly blank_id: string;
    readonly created_at: string;
    readonly id: string;
    readonly is_correct: SqlBool;
    readonly normalized_answer: string;
    readonly sentence_id: string;
}

interface BackupReviewQueueRow {
    readonly created_at: string;
    readonly due_at: string;
    readonly ease_factor: number;
    readonly id: string;
    readonly interval_days: number;
    readonly lapses: number;
    readonly repetitions: number;
    readonly updated_at: string;
    readonly vocabulary_id: string;
}

interface BackupSettingRow extends SettingRow {
    readonly updated_at: string;
}

interface LearningBackupV1 {
    readonly appId: typeof backupAppId;
    readonly exportedAt: string;
    readonly schemaVersion: typeof backupSchemaVersion;
    readonly tables: {
        readonly appSettings: readonly BackupSettingRow[];
        readonly contentPacks: readonly BackupContentPackRow[];
        readonly practiceAttempts: readonly BackupPracticeAttemptRow[];
        readonly reviewQueue: readonly BackupReviewQueueRow[];
        readonly sentenceBlanks: readonly BackupBlankRow[];
        readonly sentences: readonly BackupSentenceRow[];
        readonly vocabularyEntries: readonly BackupVocabularyRow[];
    };
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

function getLearningOrderFromTags(value: string): number {
    const orderTag = parseStringArray(value).find((tag) => tag.startsWith("order:"));

    if (orderTag === undefined) {
        return Number.MAX_SAFE_INTEGER;
    }

    const order = Number.parseInt(orderTag.slice("order:".length), 10);

    return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertBackupPayload(value: unknown): asserts value is LearningBackupV1 {
    if (!isObject(value)) {
        throw new Error("备份文件不是有效的 JSON 对象。");
    }

    if (value.appId !== backupAppId) {
        throw new Error("备份文件不属于 BestLNG。");
    }

    if (value.schemaVersion !== backupSchemaVersion) {
        throw new Error(`暂不支持该备份版本：${String(value.schemaVersion)}。`);
    }

    if (typeof value.exportedAt !== "string" || !isObject(value.tables)) {
        throw new Error("备份文件缺少必要的版本或数据表信息。");
    }

    const tableNames = [
        "appSettings",
        "contentPacks",
        "practiceAttempts",
        "reviewQueue",
        "sentenceBlanks",
        "sentences",
        "vocabularyEntries",
    ] as const;

    for (const tableName of tableNames) {
        if (!Array.isArray(value.tables[tableName])) {
            throw new Error(`备份文件缺少 ${tableName} 数据表。`);
        }
    }
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

function getFileExtension(path: string): string {
    const extension = path.split(".").pop();

    return extension?.toLowerCase() ?? "";
}

function getFileBaseName(path: string): string {
    const normalizedPath = path.replaceAll("\\", "/");
    const fileName = normalizedPath.split("/").pop() ?? "user-content";

    return fileName.replace(/\.[^.]+$/, "") || "user-content";
}

function createImportedPackageId(filePath: string): string {
    const safeName = getFileBaseName(filePath)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `user-${safeName || "content"}-${Date.now()}`;
}

async function seedDatabase(db: Database): Promise<void> {
    for (const contentPackage of builtInContentPackages) {
        const expectedDescription = contentPackage.manifest.description ?? "";
        const existingRows = await db.select<PackSeedRow[]>(
            `SELECT content_packs.description,
                    COUNT(sentences.id) AS sentence_count
               FROM content_packs
               LEFT JOIN sentences ON sentences.pack_id = content_packs.id
              WHERE content_packs.id = $1
              GROUP BY content_packs.description`,
            [contentPackage.manifest.id],
        );
        const existing = existingRows[0];

        if (
            existing !== undefined &&
            existing.sentence_count >= contentPackage.sentences.length &&
            existing.description === expectedDescription
        ) {
            continue;
        }

        await upsertContentPackage(contentPackage);
    }

    const settingsRows = await db.select<CountRow[]>("SELECT COUNT(*) AS count FROM app_settings");

    if ((settingsRows[0]?.count ?? 0) === 0) {
        await saveSettingsToDatabase(db, defaultSettings);
    }
}

async function upsertContentPackage(contentPackage: ContentPackage): Promise<number> {
    // 先在前端复用 schema 校验；真正的大批量写入交给原生层单事务完成。
    createExerciseInputsFromPackage(contentPackage);

    return invoke<number>("upsert_content_package", { contentPackage });
}

async function saveSettingsToDatabase(db: Database, settings: UserSettings): Promise<void> {
    const settingsEntries: readonly [keyof UserSettings, string][] = [
        ["activeContentPackId", settings.activeContentPackId],
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
        activeContentPackId:
            values.get("activeContentPackId") ?? defaultSettings.activeContentPackId,
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

    return [...sentences]
        .sort(
            (first, second) =>
                getLearningOrderFromTags(first.tags) - getLearningOrderFromTags(second.tags),
        )
        .map((sentence) =>
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
        sentenceCount: row.sentence_count ?? 0,
        source: row.source,
        title: row.title,
    }));
}

function mapVocabulary(rows: readonly VocabularyRow[]): VocabularyEntryView[] {
    return [...rows]
        .sort((first, second) => {
            const orderDelta =
                getLearningOrderFromTags(first.sentence_tags ?? "[]") -
                getLearningOrderFromTags(second.sentence_tags ?? "[]");

            if (orderDelta !== 0) {
                return orderDelta;
            }

            const blankOrderDelta = (first.blank_order ?? 0) - (second.blank_order ?? 0);

            if (blankOrderDelta !== 0) {
                return blankOrderDelta;
            }

            const sentenceIdDelta = (first.sentence_id ?? "").localeCompare(
                second.sentence_id ?? "",
            );

            if (sentenceIdDelta !== 0) {
                return sentenceIdDelta;
            }

            return first.term.localeCompare(second.term);
        })
        .map((row) => ({
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
    const contentPacks = mapContentPacks(input.contentPacks);
    const activeContentPackId = resolveActiveContentPackIdFromPacks(
        contentPacks,
        input.settings.activeContentPackId,
    );
    const settings: UserSettings = {
        ...input.settings,
        activeContentPackId,
    };
    const exercises = buildExercises(input.sentences, input.blanks);
    const today = new Date();
    const stats = aggregateLearningStats(toPracticeAttempts(input.attempts), today);
    const vocabulary = mapVocabulary(input.vocabulary);

    return {
        activeExercise: pickActiveExercise(exercises, input.attempts),
        activeContentPackId,
        contentPacks,
        correctRate: stats.accuracy,
        dueVocabularyCount: vocabulary.filter((entry) => new Date(entry.nextReviewAt) <= today)
            .length,
        isPersistent: input.isPersistent,
        settings,
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
    const settingsRows = await db.select<SettingRow[]>("SELECT key, value FROM app_settings");
    const settings = settingsFromRows(settingsRows);
    const activeContentPackId = await resolveActiveContentPackId(db, settings.activeContentPackId);

    if (activeContentPackId !== settings.activeContentPackId) {
        await saveSettingsToDatabase(db, {
            ...settings,
            activeContentPackId,
        });
    }

    const [contentPacks, sentences, blanks, vocabulary, attempts] = await Promise.all([
        db.select<ContentPackRow[]>(
            `SELECT content_packs.id,
                        content_packs.title,
                        content_packs.description,
                        content_packs.source,
                        content_packs.license_name,
                        content_packs.license_url,
                        content_packs.is_enabled,
                        COUNT(sentences.id) AS sentence_count
                   FROM content_packs
                   LEFT JOIN sentences ON sentences.pack_id = content_packs.id
                  GROUP BY content_packs.id,
                           content_packs.title,
                           content_packs.description,
                           content_packs.source,
                           content_packs.license_name,
                           content_packs.license_url,
                           content_packs.is_enabled,
                           content_packs.created_at
                  ORDER BY content_packs.created_at ASC`,
        ),
        db.select<SentenceRow[]>(
            "SELECT * FROM sentences WHERE pack_id = $1 ORDER BY created_at ASC",
            [activeContentPackId],
        ),
        db.select<BlankRow[]>(
            `SELECT sentence_blanks.id,
                        sentence_blanks.sentence_id,
                        sentence_blanks.answer,
                        sentence_blanks.accepted_answers,
                        sentence_blanks.hint
                   FROM sentence_blanks
                   JOIN sentences ON sentences.id = sentence_blanks.sentence_id
                  WHERE sentences.pack_id = $1
                  ORDER BY sentence_blanks.sentence_id ASC, sentence_blanks.display_order ASC`,
            [activeContentPackId],
        ),
        db.select<VocabularyRow[]>(
            `SELECT sentence_blanks.display_order AS blank_order,
                        COALESCE(vocabulary_entries.id, 'vocab-' || sentence_blanks.id) AS id,
                        sentence_blanks.answer AS term,
                        COALESCE(vocabulary_entries.meaning, sentence_blanks.hint) AS meaning,
                        COALESCE(vocabulary_entries.status, 'learning') AS status,
                        COALESCE(vocabulary_entries.next_review_at, CURRENT_TIMESTAMP) AS next_review_at,
                        COALESCE(vocabulary_entries.due_count, 0) AS due_count,
                        sentences.pack_id AS pack_id,
                        sentences.id AS sentence_id,
                        sentences.tags AS sentence_tags
                   FROM sentence_blanks
                   JOIN sentences ON sentences.id = sentence_blanks.sentence_id
                   LEFT JOIN vocabulary_entries ON vocabulary_entries.term = sentence_blanks.answer
                  WHERE sentences.pack_id = $1
                  ORDER BY sentences.created_at ASC,
                           sentence_blanks.display_order ASC`,
            [activeContentPackId],
        ),
        db.select<AttemptRow[]>(
            `SELECT practice_attempts.answer,
                        sentence_blanks.answer AS blank_answer,
                        practice_attempts.created_at,
                        practice_attempts.is_correct,
                        practice_attempts.sentence_id
                   FROM practice_attempts
                   JOIN sentences ON sentences.id = practice_attempts.sentence_id
                   JOIN sentence_blanks ON sentence_blanks.id = practice_attempts.blank_id
                  WHERE sentences.pack_id = $1
                  ORDER BY practice_attempts.created_at ASC`,
            [activeContentPackId],
        ),
    ]);

    return buildState({
        attempts,
        blanks,
        contentPacks,
        isPersistent: true,
        sentences,
        settings: {
            ...settings,
            activeContentPackId,
        },
        vocabulary,
    });
}

async function resolveActiveContentPackId(db: Database, preferredPackId: string): Promise<string> {
    if (preferredPackId.length > 0) {
        const preferredRows = await db.select<CountRow[]>(
            "SELECT COUNT(*) AS count FROM content_packs WHERE id = $1 AND is_enabled = 1",
            [preferredPackId],
        );

        if ((preferredRows[0]?.count ?? 0) > 0) {
            return preferredPackId;
        }
    }

    const rows = await db.select<Array<Pick<ContentPackRow, "id">>>(
        "SELECT id FROM content_packs WHERE is_enabled = 1 ORDER BY created_at ASC LIMIT 1",
    );

    return rows[0]?.id ?? "";
}

async function createLearningBackup(db: Database): Promise<LearningBackupV1> {
    const [
        appSettings,
        contentPacks,
        practiceAttempts,
        reviewQueue,
        sentenceBlanks,
        sentences,
        vocabularyEntries,
    ] = await Promise.all([
        db.select<BackupSettingRow[]>("SELECT key, value, updated_at FROM app_settings"),
        db.select<BackupContentPackRow[]>(
            `SELECT id, title, description, source, license_name, license_url, is_enabled, created_at
               FROM content_packs
              ORDER BY created_at ASC`,
        ),
        db.select<BackupPracticeAttemptRow[]>(
            `SELECT id, sentence_id, blank_id, answer, normalized_answer, is_correct, created_at
               FROM practice_attempts
              ORDER BY created_at ASC`,
        ),
        db.select<BackupReviewQueueRow[]>(
            `SELECT id, vocabulary_id, due_at, interval_days, ease_factor, repetitions, lapses,
                    created_at, updated_at
               FROM review_queue
              ORDER BY due_at ASC`,
        ),
        db.select<BackupBlankRow[]>(
            `SELECT id, sentence_id, answer, accepted_answers, hint, display_order
               FROM sentence_blanks
              ORDER BY sentence_id ASC, display_order ASC`,
        ),
        db.select<BackupSentenceRow[]>(
            `SELECT id, pack_id, source_lang, target_lang, text, translation, level, tags, created_at
               FROM sentences
              ORDER BY created_at ASC`,
        ),
        db.select<BackupVocabularyRow[]>(
            `SELECT id, term, meaning, lang, status, next_review_at, due_count, created_at, updated_at
               FROM vocabulary_entries
              ORDER BY term ASC`,
        ),
    ]);

    return {
        appId: backupAppId,
        exportedAt: new Date().toISOString(),
        schemaVersion: backupSchemaVersion,
        tables: {
            appSettings,
            contentPacks,
            practiceAttempts,
            reviewQueue,
            sentenceBlanks,
            sentences,
            vocabularyEntries,
        },
    };
}

async function replaceDatabaseFromBackup(db: Database, backup: LearningBackupV1): Promise<void> {
    try {
        // 恢复采用整库替换策略，顺序按外键依赖从子表到父表清空，再从父表到子表写回。
        await db.execute("BEGIN IMMEDIATE TRANSACTION");
        await db.execute("DELETE FROM review_queue");
        await db.execute("DELETE FROM practice_attempts");
        await db.execute("DELETE FROM vocabulary_entries");
        await db.execute("DELETE FROM sentence_blanks");
        await db.execute("DELETE FROM sentences");
        await db.execute("DELETE FROM content_packs");
        await db.execute("DELETE FROM app_settings");

        for (const row of backup.tables.contentPacks) {
            await db.execute(
                `INSERT INTO content_packs
                    (id, title, description, source, license_name, license_url, is_enabled, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    row.id,
                    row.title,
                    row.description,
                    row.source,
                    row.license_name,
                    row.license_url,
                    row.is_enabled,
                    row.created_at,
                ],
            );
        }

        for (const row of backup.tables.sentences) {
            await db.execute(
                `INSERT INTO sentences
                    (id, pack_id, source_lang, target_lang, text, translation, level, tags, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    row.id,
                    row.pack_id,
                    row.source_lang,
                    row.target_lang,
                    row.text,
                    row.translation,
                    row.level,
                    row.tags,
                    row.created_at,
                ],
            );
        }

        for (const row of backup.tables.sentenceBlanks) {
            await db.execute(
                `INSERT INTO sentence_blanks
                    (id, sentence_id, answer, accepted_answers, hint, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    row.id,
                    row.sentence_id,
                    row.answer,
                    row.accepted_answers,
                    row.hint,
                    row.display_order,
                ],
            );
        }

        for (const row of backup.tables.vocabularyEntries) {
            await db.execute(
                `INSERT INTO vocabulary_entries
                    (id, term, meaning, lang, status, next_review_at, due_count, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    row.id,
                    row.term,
                    row.meaning,
                    row.lang,
                    row.status,
                    row.next_review_at,
                    row.due_count,
                    row.created_at,
                    row.updated_at,
                ],
            );
        }

        for (const row of backup.tables.practiceAttempts) {
            await db.execute(
                `INSERT INTO practice_attempts
                    (id, sentence_id, blank_id, answer, normalized_answer, is_correct, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    row.id,
                    row.sentence_id,
                    row.blank_id,
                    row.answer,
                    row.normalized_answer,
                    row.is_correct,
                    row.created_at,
                ],
            );
        }

        for (const row of backup.tables.reviewQueue) {
            await db.execute(
                `INSERT INTO review_queue
                    (id, vocabulary_id, due_at, interval_days, ease_factor, repetitions, lapses,
                     created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    row.id,
                    row.vocabulary_id,
                    row.due_at,
                    row.interval_days,
                    row.ease_factor,
                    row.repetitions,
                    row.lapses,
                    row.created_at,
                    row.updated_at,
                ],
            );
        }

        for (const row of backup.tables.appSettings) {
            await db.execute(
                `INSERT INTO app_settings (key, value, updated_at)
                 VALUES ($1, $2, $3)`,
                [row.key, row.value, row.updated_at],
            );
        }

        await db.execute("COMMIT");
    } catch (error) {
        await db.execute("ROLLBACK");
        throw error;
    }
}

function getMemoryRows(): {
    readonly blanks: readonly BlankRow[];
    readonly contentPacks: readonly ContentPackRow[];
    readonly sentences: readonly SentenceRow[];
    readonly vocabulary: readonly VocabularyRow[];
} {
    const contentPacks: ContentPackRow[] = builtInContentPackages.map((contentPackage) => {
        const manifest = contentPackage.manifest;

        return {
            description: manifest.description ?? "",
            id: manifest.id,
            is_enabled: 1,
            license_name: manifest.license?.name ?? "未声明",
            license_url: manifest.license?.url ?? "",
            sentence_count: contentPackage.sentences.length,
            source: manifest.authors.join(", "),
            title: manifest.name,
        };
    });
    const sentences: SentenceRow[] = builtInExerciseInputs.map((exercise) => ({
        id: exercise.id,
        pack_id: exercise.sourcePackageId,
        tags: JSON.stringify(exercise.tags),
        text: exercise.sentence,
        translation: exercise.translation,
    }));
    const blanks: BlankRow[] = builtInExerciseInputs.flatMap((exercise) =>
        exercise.blanks.map((blank) => ({
            accepted_answers: JSON.stringify(blank.acceptedAnswers ?? []),
            answer: blank.answer,
            hint: blank.hint ?? "",
            id: blank.id,
            sentence_id: exercise.id,
        })),
    );
    const vocabulary: VocabularyRow[] = blanks.map((blank) => ({
        blank_order: 0,
        due_count: memoryAttempts.filter(
            (attempt) => attempt.blank_answer === blank.answer && attempt.is_correct === 0,
        ).length,
        id: `vocab-${blank.id}`,
        meaning: blank.hint,
        next_review_at: new Date().toISOString(),
        sentence_id: blank.sentence_id,
        sentence_tags: sentences.find((sentence) => sentence.id === blank.sentence_id)?.tags,
        status: "learning",
        term: blank.answer,
    }));

    return { blanks, contentPacks, sentences, vocabulary };
}

function loadFromMemory(): LearningWorkspaceState {
    const rows = getMemoryRows();
    const preferredPackId = memorySettings.activeContentPackId;
    const activeContentPackId =
        rows.contentPacks.find((pack) => pack.id === preferredPackId)?.id ??
        rows.contentPacks[0]?.id ??
        "";
    const sentences = rows.sentences.filter((sentence) => sentence.pack_id === activeContentPackId);
    const sentenceIds = new Set(sentences.map((sentence) => sentence.id));
    const blanks = rows.blanks.filter((blank) => sentenceIds.has(blank.sentence_id));
    const blankIds = new Set(blanks.map((blank) => blank.id));
    const vocabulary = rows.vocabulary.filter((entry) => blankIds.has(entry.id.slice(6)));
    const attempts = memoryAttempts.filter((attempt) => sentenceIds.has(attempt.sentence_id));

    return buildState({
        attempts,
        blanks,
        contentPacks: rows.contentPacks,
        isPersistent: false,
        sentences,
        settings: {
            ...memorySettings,
            activeContentPackId,
        },
        vocabulary,
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
    const fallbackVocabularyId = `vocab-${blankId}`;
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
        [fallbackVocabularyId, expectedAnswer, hint, "en", "needs_review", now],
    );

    const vocabularyRows = await db.select<Array<Pick<VocabularyRow, "id">>>(
        "SELECT id FROM vocabulary_entries WHERE term = $1 LIMIT 1",
        [expectedAnswer],
    );
    const vocabularyId = vocabularyRows[0]?.id ?? fallbackVocabularyId;

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

export async function selectContentPack(contentPackId: string): Promise<SelectContentPackResult> {
    const db = await getDatabase();

    if (db === null) {
        memorySettings = {
            ...memorySettings,
            activeContentPackId: contentPackId,
        };

        return {
            activeContentPackId: contentPackId,
            state: loadFromMemory(),
        };
    }

    const packRows = await db.select<CountRow[]>(
        "SELECT COUNT(*) AS count FROM content_packs WHERE id = $1 AND is_enabled = 1",
        [contentPackId],
    );

    if ((packRows[0]?.count ?? 0) === 0) {
        throw new Error("找不到要学习的词本。");
    }

    const settingsRows = await db.select<SettingRow[]>("SELECT key, value FROM app_settings");
    const settings = settingsFromRows(settingsRows);
    const nextSettings: UserSettings = {
        ...settings,
        activeContentPackId: contentPackId,
    };

    await saveSettingsToDatabase(db, nextSettings);

    return {
        activeContentPackId: contentPackId,
        state: await loadFromDatabase(db),
    };
}

/**
 * 将当前 SQLite 学习数据导出为版本化 JSON 备份。
 *
 * @returns 用户选择保存路径时返回文件路径；取消保存时返回 null。
 */
export async function exportLearningBackup(): Promise<string | null> {
    const db = await getDatabase();

    if (db === null) {
        throw new Error("当前处于浏览器预览模式，无法访问桌面端文件系统。");
    }

    await seedDatabase(db);

    const selectedPath = await save({
        defaultPath: `bestlng-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [
            {
                extensions: ["json"],
                name: "BestLNG 备份文件",
            },
        ],
        title: "导出 BestLNG 本地数据",
    });

    if (selectedPath === null) {
        return null;
    }

    const backup = await createLearningBackup(db);

    await writeTextFile(selectedPath, `${JSON.stringify(backup, null, 2)}\n`);

    return selectedPath;
}

/**
 * 从版本化 JSON 备份恢复 SQLite 学习数据。
 *
 * @returns 恢复完成时间和刷新后的工作台状态。
 */
export async function importLearningBackup(): Promise<BackupImportResult | null> {
    const db = await getDatabase();

    if (db === null) {
        throw new Error("当前处于浏览器预览模式，无法访问桌面端文件系统。");
    }

    const selectedPath = await open({
        filters: [
            {
                extensions: ["json"],
                name: "BestLNG 备份文件",
            },
        ],
        multiple: false,
        title: "恢复 BestLNG 本地数据",
    });

    if (selectedPath === null || Array.isArray(selectedPath)) {
        return null;
    }

    const fileContent = await readTextFile(selectedPath);
    const parsed: unknown = JSON.parse(fileContent);

    assertBackupPayload(parsed);
    await replaceDatabaseFromBackup(db, parsed);

    return {
        importedAt: new Date().toISOString(),
        state: await loadFromDatabase(db),
    };
}

/**
 * 从本地 CSV 或 JSON 文件导入内容包。
 *
 * JSON 需要符合 BestLNG `ContentPackage` schema；CSV 至少需要
 * `text,translation,answer` 表头。
 */
export async function importContentPackageFile(): Promise<ContentImportResult | null> {
    const db = await getDatabase();

    if (db === null) {
        throw new Error("当前处于浏览器预览模式，无法访问桌面端文件系统。");
    }

    const selectedPath = await open({
        filters: [
            {
                extensions: ["json", "csv"],
                name: "BestLNG 内容包",
            },
        ],
        multiple: false,
        title: "导入 BestLNG 内容包",
    });

    if (selectedPath === null || Array.isArray(selectedPath)) {
        return null;
    }

    const fileContent = await readTextFile(selectedPath);
    const extension = getFileExtension(selectedPath);
    const contentPackage =
        extension === "csv"
            ? parseContentPackageCsv(fileContent, {
                  author: "BestLNG 用户",
                  licenseAttribution: "用户确认拥有导入内容的使用权。",
                  licenseName: "User Provided",
                  packageDescription: `从 ${getFileBaseName(selectedPath)}.csv 导入的本地内容包。`,
                  packageId: createImportedPackageId(selectedPath),
                  packageName: getFileBaseName(selectedPath),
                  sourceLanguage: "en",
                  targetLanguage: "zh-CN",
              })
            : parseContentPackageJson(fileContent);
    const importedSentenceCount = await upsertContentPackage(contentPackage);

    return {
        importedSentenceCount,
        packageName: contentPackage.manifest.name,
        state: await loadFromDatabase(db),
    };
}

function createFallbackReviewState(entry: VocabularyEntryView): ReviewState {
    return {
        dueAt: entry.nextReviewAt,
        easeFactor: 2.5,
        intervalDays: 0,
        lapses: entry.dueCount,
        repetitions: entry.status === "mastered" ? 2 : 0,
    };
}

/**
 * 记录一次单词复习结果，并计算下一次复习时间。
 */
export async function reviewVocabularyEntry(
    vocabularyEntryId: string,
    rating: ReviewRating,
): Promise<VocabularyReviewResult> {
    const currentState = await loadLearningWorkspace();
    const vocabularyEntry = currentState.vocabulary.find((entry) => entry.id === vocabularyEntryId);

    if (vocabularyEntry === undefined) {
        throw new Error("找不到要复习的词条。");
    }

    const reviewedAt = new Date();
    const db = await getDatabase();

    if (db === null) {
        return {
            nextReviewAt: vocabularyEntry.nextReviewAt,
            state: loadFromMemory(),
        };
    }

    const rows = await db.select<ReviewQueueRow[]>(
        `SELECT due_at, interval_days, ease_factor, repetitions, lapses
           FROM review_queue
          WHERE vocabulary_id = $1
          LIMIT 1`,
        [vocabularyEntryId],
    );
    const reviewState =
        rows[0] === undefined
            ? createFallbackReviewState(vocabularyEntry)
            : {
                  dueAt: rows[0].due_at,
                  easeFactor: rows[0].ease_factor,
                  intervalDays: rows[0].interval_days,
                  lapses: rows[0].lapses,
                  repetitions: rows[0].repetitions,
              };
    const nextReview = scheduleNextReview(reviewState, rating, reviewedAt);
    const nextStatus =
        rating === "again" ? "needs_review" : nextReview.repetitions >= 3 ? "mastered" : "learning";
    const nextDueCount =
        rating === "again" ? vocabularyEntry.dueCount + 1 : vocabularyEntry.dueCount;

    await db.execute(
        `INSERT INTO review_queue
            (id, vocabulary_id, due_at, interval_days, ease_factor, repetitions, lapses, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT(vocabulary_id) DO UPDATE SET
            due_at = excluded.due_at,
            interval_days = excluded.interval_days,
            ease_factor = excluded.ease_factor,
            repetitions = excluded.repetitions,
            lapses = excluded.lapses,
            updated_at = CURRENT_TIMESTAMP`,
        [
            `review-${vocabularyEntryId}`,
            vocabularyEntryId,
            nextReview.dueAt,
            nextReview.intervalDays,
            nextReview.easeFactor,
            nextReview.repetitions,
            nextReview.lapses,
        ],
    );

    await db.execute(
        `UPDATE vocabulary_entries
            SET status = $1,
                next_review_at = $2,
                due_count = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [nextStatus, nextReview.dueAt, nextDueCount, vocabularyEntryId],
    );

    return {
        nextReviewAt: nextReview.dueAt,
        state: await loadFromDatabase(db),
    };
}
