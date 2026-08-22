const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8765;
const HOST = process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

function lanUrls(port) {
  const urls = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      const family = net.family === 4 ? "IPv4" : net.family;
      if (family === "IPv4" && !net.internal) {
        urls.push(`http://${net.address}:${port}/`);
      }
    }
  }
  return urls;
}

function safeFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url && req.url.startsWith("/lan.json")) {
      send(
        res,
        200,
        JSON.stringify({
          port: PORT,
          urls: lanUrls(PORT),
          hint: "同一 WiFi 下，其他电脑用这些地址打开",
        }),
        TYPES[".json"]
      );
      return;
    }

    const file = safeFile(req.url);
    if (!file) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.stat(file, (err, stat) => {
      const target = !err && stat.isDirectory() ? path.join(file, "index.html") : file;
      fs.readFile(target, (readErr, data) => {
        if (readErr) {
          send(res, 404, "Not found");
          return;
        }
        send(res, 200, data, TYPES[path.extname(target)] || "application/octet-stream");
      });
    });
  });
}

function printBanner() {
  const urls = lanUrls(PORT);
  console.log("");
  console.log("校园坦克大战 · 局域网已打开");
  console.log(`本机：    http://127.0.0.1:${PORT}/`);
  if (urls.length) {
    urls.forEach((url) => console.log(`同一 WiFi：${url}`));
    console.log("其他电脑或手机连上同一个 WiFi，浏览器输入上面的地址即可。");
  } else {
    console.log("没有发现局域网网卡。请确认这台电脑已连上 WiFi，再重新运行。");
  }
  console.log("按 Ctrl+C 停止。");
  console.log("");
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    printBanner();
  });
  server.on("error", (err) => {
    console.error("打不开端口：", err.message);
    process.exit(1);
  });
}

module.exports = { lanUrls, createServer, PORT };
