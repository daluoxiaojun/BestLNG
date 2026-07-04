import { describe, expect, it } from "vitest";

import { resolveActiveContentPackIdFromPacks } from "./activeContentPack";

describe("当前学习词本选择", () => {
    const contentPacks = [
        { id: "starter", isEnabled: true },
        { id: "cet4", isEnabled: true },
        { id: "toefl", isEnabled: false },
    ];

    it("优先使用用户已选择且启用的词本", () => {
        expect(resolveActiveContentPackIdFromPacks(contentPacks, "cet4")).toBe("cet4");
    });

    it("用户选择不可用时回退到第一个启用词本", () => {
        expect(resolveActiveContentPackIdFromPacks(contentPacks, "toefl")).toBe("starter");
        expect(resolveActiveContentPackIdFromPacks(contentPacks, "missing")).toBe("starter");
    });
});
