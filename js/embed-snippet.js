(function () {
  const box = document.getElementById("embed-snippet");
  const btn = document.getElementById("btn-copy-embed");
  if (!box) return;

  const embedUrl = new URL("embed.html", window.location.href).href;
  const snippet = `<iframe
  src="${embedUrl}"
  title="校园坦克大战"
  width="680"
  height="920"
  style="border:0;width:100%;max-width:680px;height:920px;background:#16201b"
  allow="autoplay"
></iframe>`;

  box.value = snippet;

  btn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      btn.textContent = "已复制";
    } catch (err) {
      box.select();
      document.execCommand("copy");
      btn.textContent = "已选中，请复制";
    }
  });
})();
