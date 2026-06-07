import { useCallback, useEffect, useState } from "react";

import { defaultPageId, getPageHash, resolvePageIdFromHash, type PageId } from "./navigation";

function getCurrentPageId(): PageId {
    if (typeof window === "undefined") {
        return defaultPageId;
    }

    return resolvePageIdFromHash(window.location.hash);
}

/**
 * 桌面端先使用轻量 Hash 路由，保证刷新、复制窗口地址和键盘导航时页面状态稳定。
 */
export function usePageRouter(): readonly [PageId, (pageId: PageId) => void] {
    const [activePageId, setActivePageId] = useState<PageId>(getCurrentPageId);

    useEffect(() => {
        const handleHashChange = (): void => {
            setActivePageId(getCurrentPageId());
        };

        window.addEventListener("hashchange", handleHashChange);

        return () => {
            window.removeEventListener("hashchange", handleHashChange);
        };
    }, []);

    const navigate = useCallback((pageId: PageId): void => {
        const nextHash = getPageHash(pageId);

        if (window.location.hash === nextHash) {
            setActivePageId(pageId);
            return;
        }

        window.location.hash = nextHash;
    }, []);

    return [activePageId, navigate];
}
