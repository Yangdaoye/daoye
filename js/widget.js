(function embedSchoolTank() {
  var script = document.currentScript;
  if (!script) return;
  var src = script.getAttribute("src") || "";
  var base = src.replace(/js\/widget\.js(?:\?.*)?$/i, "");
  if (!base) {
    try {
      base = new URL(src, document.baseURI).href.replace(/js\/widget\.js(?:\?.*)?$/i, "");
    } catch (err) {
      base = "";
    }
  }
  var iframe = document.createElement("iframe");
  iframe.src = base + "embed.html";
  iframe.width = script.getAttribute("data-width") || "680";
  iframe.height = script.getAttribute("data-height") || "920";
  iframe.setAttribute("title", "校园坦克大战");
  iframe.setAttribute("allow", "autoplay");
  iframe.setAttribute("loading", "lazy");
  iframe.style.border = "0";
  iframe.style.maxWidth = "100%";
  iframe.style.width = "100%";
  iframe.style.borderRadius = "16px";
  iframe.style.background = "#16201b";
  script.insertAdjacentElement("afterend", iframe);
})();
