export interface ContentPackSelectionItem {
    readonly id: string;
    readonly isEnabled: boolean;
}

/**
 * 根据用户偏好解析当前学习词本。
 *
 * 优先使用用户已经选择且仍启用的词本；如果没有可用选择，则回退到第一个启用词本。
 */
export function resolveActiveContentPackIdFromPacks(
    contentPacks: readonly ContentPackSelectionItem[],
    preferredContentPackId: string,
): string {
    if (
        preferredContentPackId.length > 0 &&
        contentPacks.some(
            (contentPack) => contentPack.id === preferredContentPackId && contentPack.isEnabled,
        )
    ) {
        return preferredContentPackId;
    }

    return contentPacks.find((contentPack) => contentPack.isEnabled)?.id ?? "";
}
