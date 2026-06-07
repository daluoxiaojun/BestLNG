export type PageId = "today" | "cloze" | "vocabulary" | "packs" | "stats" | "settings";

export interface NavigationItem {
    readonly description: string;
    readonly id: PageId;
    readonly label: string;
}

export const defaultPageId: PageId = "today";

export const navigationItems: readonly NavigationItem[] = [
    {
        description: "目标、复习队列和下一组练习",
        id: "today",
        label: "今日练习",
    },
    {
        description: "翻译提示、挖空输入和答案反馈",
        id: "cloze",
        label: "句子填空",
    },
    {
        description: "错词、熟词和复习状态",
        id: "vocabulary",
        label: "单词本",
    },
    {
        description: "本地内容包与许可证信息",
        id: "packs",
        label: "内容包",
    },
    {
        description: "正确率、连续学习和薄弱项",
        id: "stats",
        label: "统计",
    },
    {
        description: "每日目标、判题严格度和数据选项",
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
