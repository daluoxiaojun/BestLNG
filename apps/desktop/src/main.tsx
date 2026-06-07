import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const rootElement = document.getElementById("root");

if (rootElement === null) {
    throw new Error("无法找到 BestLNG 桌面端挂载节点。");
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
