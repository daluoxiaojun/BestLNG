import type { ContentPackage, ContentSentence } from "./types";
import { validateContentPackage } from "./validation";

export interface CsvContentPackageOptions {
    readonly author: string;
    readonly licenseAttribution: string;
    readonly licenseName: string;
    readonly licenseUrl?: string;
    readonly packageDescription?: string;
    readonly packageId: string;
    readonly packageName: string;
    readonly packageVersion?: string;
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
}

function normalizeHeader(value: string): string {
    return value
        .trim()
        .replace(/^\uFEFF/, "")
        .toLowerCase();
}

function createStableId(prefix: string, index: number): string {
    return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let isQuoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"' && isQuoted && nextChar === '"') {
            current += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            isQuoted = !isQuoted;
            continue;
        }

        if (char === "," && !isQuoted) {
            cells.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    cells.push(current.trim());

    return cells;
}

function parseCsv(text: string): Record<string, string>[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        throw new Error("CSV 至少需要表头和一行句子数据。");
    }

    const headers = parseCsvLine(lines[0] ?? "").map(normalizeHeader);

    return lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
            row[header] = cells[index]?.trim() ?? "";
        });

        return row;
    });
}

function splitList(value: string): string[] {
    return value
        .split(/[|;；]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function assertRequiredRowValue(
    row: Record<string, string>,
    key: string,
    rowNumber: number,
): string {
    const value = row[key];

    if (value === undefined || value.trim().length === 0) {
        throw new Error(`CSV 第 ${rowNumber} 行缺少必填字段 ${key}。`);
    }

    return value.trim();
}

function ensureValidPackage(contentPackage: ContentPackage): ContentPackage {
    const validation = validateContentPackage(contentPackage);

    if (!validation.isValid) {
        const summary = validation.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ");

        throw new Error(`内容包校验失败：${summary}`);
    }

    return contentPackage;
}

/**
 * 从完整 JSON 文本读取内容包，适合导入已经按 BestLNG schema 整理好的数据。
 */
export function parseContentPackageJson(text: string): ContentPackage {
    const parsed: unknown = JSON.parse(text);

    return ensureValidPackage(parsed as ContentPackage);
}

/**
 * 从 CSV 文本生成内容包。
 *
 * CSV 必填表头：`text,translation,answer`。
 * 可选表头：`id,hint,accepted_answers,tags`，多值字段使用 `|` 分隔。
 */
export function parseContentPackageCsv(
    text: string,
    options: CsvContentPackageOptions,
): ContentPackage {
    const rows = parseCsv(text);
    const sentences: ContentSentence[] = rows.map((row, index) => {
        const rowNumber = index + 2;
        const sentenceId = row.id?.trim() || createStableId("sentence", index);
        const answer = assertRequiredRowValue(row, "answer", rowNumber);

        return {
            blanks: [
                {
                    acceptedAnswers: splitList(row.accepted_answers ?? ""),
                    answer,
                    hint: row.hint?.trim() || undefined,
                    id: `${sentenceId}-blank-1`,
                },
            ],
            id: sentenceId,
            tags: splitList(row.tags ?? ""),
            text: assertRequiredRowValue(row, "text", rowNumber),
            translation: assertRequiredRowValue(row, "translation", rowNumber),
        };
    });

    return ensureValidPackage({
        manifest: {
            authors: [options.author],
            description: options.packageDescription,
            id: options.packageId,
            license: {
                attribution: options.licenseAttribution,
                name: options.licenseName,
                url: options.licenseUrl,
            },
            name: options.packageName,
            sourceLanguage: options.sourceLanguage,
            targetLanguage: options.targetLanguage,
            version: options.packageVersion ?? "1.0.0",
        },
        sentences,
    });
}
