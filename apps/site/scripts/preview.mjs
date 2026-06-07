import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const siteRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mimeTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
]);

function resolveRequestPath(requestUrl) {
    const url = new URL(requestUrl, `http://localhost:${port}`);
    const decodedPath = decodeURIComponent(url.pathname);
    const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const requestedPath = normalizedPath === sep ? "index.html" : normalizedPath.slice(1);
    const filePath = resolve(join(siteRoot, requestedPath));

    // 防止构造路径逃出站点目录。
    if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${sep}`)) {
        throw new Error("请求路径超出站点目录");
    }

    return filePath;
}

const server = createServer(async (request, response) => {
    try {
        if (!request.url) {
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Bad request");
            return;
        }

        let filePath = resolveRequestPath(request.url);

        if (!existsSync(filePath)) {
            filePath = join(siteRoot, "index.html");
        }

        const fileStat = await stat(filePath);

        if (fileStat.isDirectory()) {
            filePath = join(filePath, "index.html");
        }

        const contentType = mimeTypes.get(extname(filePath)) ?? "application/octet-stream";
        response.writeHead(200, { "Content-Type": contentType });
        createReadStream(filePath).pipe(response);
    } catch (error) {
        console.error(error);
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Internal server error");
    }
});

server.listen(port, "127.0.0.1", () => {
    console.log(`BestLNG site preview: http://127.0.0.1:${port}`);
});
