/**
 * 우리 둘만의 집 (Couple App MVP) — 로컬/집 Wi-Fi 실시간 동기화 서버
 * 외부 패키지(npm install) 없이 Node.js 기본 모듈만으로 동작합니다.
 *
 * 실행 방법:
 *   node server.cjs
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 4173);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_FILE = path.join(DATA_DIR, "couple-state.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStoredState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch (_) {
    return null;
  }
}

function writeStoredState(data) {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
}

const sseClients = new Set();

function broadcastState(stateObj) {
  const payload = `data: ${JSON.stringify(stateObj)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (_) {
      sseClients.delete(res);
    }
  }
}

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const server = http.createServer(function (req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // 1) SSE 실시간 스트림 (/api/stream)
  if (req.method === "GET" && pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    res.write(": connected\n\n");
    sseClients.add(res);
    req.on("close", function () {
      sseClients.delete(res);
    });
    return;
  }

  // 2) 상태 조회 (/api/state)
  if (req.method === "GET" && pathname === "/api/state") {
    const current = readStoredState() || {};
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(current));
    return;
  }

  // 3) 상태 저장 및 실시간 브로드캐스트 (/api/state)
  if (req.method === "POST" && pathname === "/api/state") {
    let body = "";
    req.on("data", function (chunk) {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", function () {
      try {
        const parsed = JSON.parse(body);
        writeStoredState(parsed);
        broadcastState(parsed);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // 4) 정적 파일 서빙
  let relPath = pathname === "/" ? "/index.html" : pathname;
  relPath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT_DIR, relPath);

  if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "0.0.0.0", function () {
  const lanIp = getLocalLanIp();
  console.log("====================================================");
  console.log(" 🏡 우리 둘만의 집 (부부 전용 웹앱 MVP) 서버 실행됨!");
  console.log(` ▶ PC에서 열기        : http://localhost:${PORT}`);
  console.log(` ▶ 스마트폰(집 Wi-Fi) : http://${lanIp}:${PORT}`);
  console.log("====================================================");
});

