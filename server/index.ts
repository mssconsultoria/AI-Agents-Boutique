import "dotenv/config";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  executeConnectorRequest,
  getConnectorCatalog,
} from "./connectors.js";
import type { ExecuteConnectorRequest } from "../src/lib/connector-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";

function json(response: import("node:http").ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function text(response: import("node:http").ServerResponse, status: number, payload: string) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(payload);
}

async function readBody(request: import("node:http").IncomingMessage) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath);
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function serveStatic(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
) {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const candidate = path.join(DIST_DIR, relativePath);

  try {
    const info = await stat(candidate);
    if (info.isFile()) {
      response.writeHead(200, {
        "Content-Type": contentTypeFor(candidate),
      });
      response.end(await readFile(candidate));
      return true;
    }
  } catch {
    // Fall through to SPA index.
  }

  try {
    const indexFile = path.join(DIST_DIR, "index.html");
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(await readFile(indexFile));
    return true;
  } catch {
    text(response, 404, "Build output not found. Run `npm run build` first.");
    return true;
  }
}

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (method === "GET" && url.pathname === "/api/connectors") {
    json(response, 200, getConnectorCatalog());
    return;
  }

  if (method === "POST" && url.pathname === "/api/connectors/execute") {
    try {
      const body = (await readBody(request)) as ExecuteConnectorRequest | null;
      if (
        !body ||
        typeof body.connectorId !== "string" ||
        typeof body.mode !== "string" ||
        typeof body.prompt !== "string" ||
        typeof body.cwd !== "string" ||
        typeof body.title !== "string"
      ) {
        json(response, 400, { error: "Invalid connector execution payload." });
        return;
      }

      const result = await executeConnectorRequest(body);
      json(response, 200, result);
      return;
    } catch (error) {
      json(response, 500, {
        error: error instanceof Error ? error.message : "Unknown server error.",
      });
      return;
    }
  }

  if (method === "GET" || method === "HEAD") {
    await serveStatic(request, response);
    return;
  }

  text(response, 405, "Method not allowed.");
});

server.listen(PORT, HOST, () => {
  console.log(`Foundry One local API listening on http://${HOST}:${PORT}`);
});
