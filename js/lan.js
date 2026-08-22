(function () {
  const box = document.getElementById("lan-urls");
  if (!box) return;

  function render(data) {
    const bits = [];
    if (data && data.publicUrl) {
      bits.push(
        `<p><strong>任意电脑现在打开：</strong> <a href="${data.publicUrl}/" target="_blank" rel="noreferrer">${data.publicUrl}/</a></p>`
      );
    }
    if (data && data.urls && data.urls.length) {
      bits.push("<p>家里同一 WiFi 也可以打开：</p><ul>");
      data.urls.forEach((url) => {
        bits.push(`<li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>`);
      });
      bits.push("</ul>");
    }
    bits.push(
      "<p>另一台电脑<strong>不要</strong>输入 <code>127.0.0.1</code>，那是“这台电脑自己”。家里请用 <code>192.168.</code> 开头的地址；现在也可以直接用上面的任意电脑链接。</p>"
    );
    box.innerHTML = bits.join("");
  }

  fetch("/lan.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => render(data || {}))
    .catch(() => render({}));
})();
