import type { ContentPackage, GeneratedClozeExerciseInput } from "./types";
import { validateContentPackage } from "./validation";

/**
 * 将内容包句子转换成 core 可消费的挖空练习输入，转换前先确保许可证等元数据合格。
 */
export function createExerciseInputsFromPackage(
    contentPackage: ContentPackage,
): GeneratedClozeExerciseInput[] {
    const validation = validateContentPackage(contentPackage);

    if (!validation.isValid) {
        const issueSummary = validation.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ");

        throw new Error(`内容包校验失败：${issueSummary}`);
    }

    return contentPackage.sentences.map(
        (sentence): GeneratedClozeExerciseInput => ({
            id: `${contentPackage.manifest.id}:${sentence.id}`,
            sentence: sentence.text,
            translation: sentence.translation,
            blanks: sentence.blanks,
            sourcePackageId: contentPackage.manifest.id,
            tags: sentence.tags ?? [],
        }),
    );
}
