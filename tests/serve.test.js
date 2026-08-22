const http = require("http");
const { lanUrls, createServer } = require("../scripts/serve.js");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(Array.isArray(lanUrls(8765)), "lanUrls 应返回数组");
lanUrls(8765).forEach((url) => {
  assert(/^http:\/\/\d+\.\d+\.\d+\.\d+:8765\/$/.test(url), `非法局域网地址 ${url}`);
});

const server = createServer();
server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  http
    .get(`http://127.0.0.1:${port}/lan.json`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        const data = JSON.parse(body);
        assert(Array.isArray(data.urls), "lan.json 应带 urls");
        http.get(`http://127.0.0.1:${port}/`, (page) => {
          assert(page.statusCode === 200, "首页应能打开");
          server.close();
          console.log("serve.test.js passed");
        }).on("error", (err) => {
          server.close();
          throw err;
        });
      });
    })
    .on("error", (err) => {
      server.close();
      throw err;
    });
});
