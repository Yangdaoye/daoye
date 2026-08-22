(function () {
  const box = document.getElementById("lan-urls");
  if (!box) return;

  fetch("/lan.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !data.urls || !data.urls.length) {
        box.innerHTML =
          "请在这台已连 WiFi 的电脑上运行 <code>开始局域网.bat</code>（Windows）或 <code>./start-lan.sh</code>，然后把显示的地址发给同一 WiFi 里的其他电脑。";
        return;
      }
      box.innerHTML =
        "<p>同一 WiFi 下，其他电脑或手机打开：</p><ul>" +
        data.urls
          .map((url) => `<li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>`)
          .join("") +
        "</ul>";
    })
    .catch(() => {
      box.textContent = "当前是直接打开文件。要给同一 WiFi 的其他电脑玩，请运行 开始局域网.bat 或 node scripts/serve.js。";
    });
})();
