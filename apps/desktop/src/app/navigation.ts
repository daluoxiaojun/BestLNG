export type PageId = "today" | "cloze" | "vocabulary" | "packs" | "stats" | "settings";

export interface NavigationItem {
    readonly description: string;
    readonly id: PageId;
    readonly label: string;
}

export const defaultPageId: PageId = "today";

export const navigationItems: readonly NavigationItem[] = [
    {
        description: "计划、进度和待复习",
        id: "today",
        label: "今日练习",
    },
    {
        description: "读句子，补缺词",
        id: "cloze",
        label: "句子填空",
    },
    {
        description: "词义、熟悉度和复习",
        id: "vocabulary",
        label: "单词本",
    },
    {
        description: "选择要学的词书",
        id: "packs",
        label: "词书",
    },
    {
        description: "练习趋势和薄弱词",
        id: "stats",
        label: "统计",
    },
    {
        description: "目标、判题和备份",
        id: "settings",
        label: "设置",
    },
];

const pageIdSet = new Set<PageId>(navigationItems.map((item) => item.id));

export function isPageId(value: string): value is PageId {
    return pageIdSet.has(value as PageId);
}

export function getPageHash(pageId: PageId): string {
    return `#${pageId}`;
}

export function resolvePageIdFromHash(hash: string): PageId {
    const pageId = hash.replace(/^#\/?/, "");

    return isPageId(pageId) ? pageId : defaultPageId;
}
