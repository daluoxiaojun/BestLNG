import type {
    ContentBlank,
    ContentPackage,
    ContentValidationIssue,
    ContentValidationResult,
} from "./types";

function isBlank(value: string): boolean {
    return value.trim().length === 0;
}

function pushRequiredStringIssue(
    issues: ContentValidationIssue[],
    path: string,
    value: string | undefined,
): void {
    if (value === undefined || isBlank(value)) {
        issues.push({
            path,
            message: "必填文本字段不能为空。",
        });
    }
}

function validateBlank(blank: ContentBlank, path: string, issues: ContentValidationIssue[]): void {
    pushRequiredStringIssue(issues, `${path}.id`, blank.id);
    pushRequiredStringIssue(issues, `${path}.answer`, blank.answer);
}

/**
 * 校验内容包的最小合法性，重点保证来源与许可证信息可追溯。
 */
export function validateContentPackage(contentPackage: ContentPackage): ContentValidationResult {
    const issues: ContentValidationIssue[] = [];

    pushRequiredStringIssue(issues, "manifest.id", contentPackage.manifest.id);
    pushRequiredStringIssue(issues, "manifest.name", contentPackage.manifest.name);
    pushRequiredStringIssue(issues, "manifest.version", contentPackage.manifest.version);
    pushRequiredStringIssue(
        issues,
        "manifest.sourceLanguage",
        contentPackage.manifest.sourceLanguage,
    );
    pushRequiredStringIssue(
        issues,
        "manifest.targetLanguage",
        contentPackage.manifest.targetLanguage,
    );

    if (contentPackage.manifest.license === undefined) {
        issues.push({
            path: "manifest.license",
            message: "内容包必须声明许可证信息。",
        });
    } else {
        pushRequiredStringIssue(
            issues,
            "manifest.license.name",
            contentPackage.manifest.license.name,
        );
        pushRequiredStringIssue(
            issues,
            "manifest.license.attribution",
            contentPackage.manifest.license.attribution,
        );
    }

    if (contentPackage.manifest.authors.length === 0) {
        issues.push({
            path: "manifest.authors",
            message: "内容包必须至少声明一个作者或整理者。",
        });
    }

    if (contentPackage.sentences.length === 0) {
        issues.push({
            path: "sentences",
            message: "内容包至少需要包含一个句子。",
        });
    }

    contentPackage.sentences.forEach((sentence, sentenceIndex) => {
        const sentencePath = `sentences.${sentenceIndex}`;

        pushRequiredStringIssue(issues, `${sentencePath}.id`, sentence.id);
        pushRequiredStringIssue(issues, `${sentencePath}.text`, sentence.text);
        pushRequiredStringIssue(issues, `${sentencePath}.translation`, sentence.translation);

        if (sentence.blanks.length === 0) {
            issues.push({
                path: `${sentencePath}.blanks`,
                message: "句子至少需要一个挖空配置。",
            });
        }

        sentence.blanks.forEach((blank, blankIndex) =>
            validateBlank(blank, `${sentencePath}.blanks.${blankIndex}`, issues),
        );
    });

    return {
        isValid: issues.length === 0,
        issues,
    };
}
