/* Temporary 0.3.13-B Developer entry. C/D must converge this reference platform. */
(function (root) {
    "use strict";
    var active = null;
    function open() {
        if (active) { active.frame.focus(); return; }
        var doc = root.document, returnFocus = doc.activeElement, ready = false, loader = null;
        var layer = doc.createElement("div"), frame = doc.createElement("iframe"), close = doc.createElement("button");
        var t = function (key) { return root.I18n ? root.I18n.t(key) : key; };
        layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true"); layer.setAttribute("aria-label", t("reference.title"));
        layer.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#101114;display:flex;flex-direction:column;";
        close.type = "button"; close.textContent = t("reference.exit"); close.style.cssText = "flex:none;align-self:flex-end;margin:4px 8px;padding:6px 12px;";
        frame.title = t("reference.title"); frame.setAttribute("sandbox", "allow-scripts");
        frame.style.cssText = "width:100%;flex:1;min-height:0;border:0;background:#101114;";
        layer.appendChild(close); layer.appendChild(frame); doc.body.appendChild(layer);
        function finish() {
            root.removeEventListener("message", message); doc.removeEventListener("focusin", focus, true);
            layer.removeEventListener("keydown", keydown);
            if (loader) { loader.onload = loader.onerror = null; if (loader.parentNode) { loader.parentNode.removeChild(loader); } }
            close.removeEventListener("click", request); layer.parentNode.removeChild(layer); active = null;
            if (returnFocus && doc.documentElement.contains(returnFocus)) { returnFocus.focus(); }
        }
        function request() { if (!ready) { finish(); } else { frame.contentWindow.postMessage({ type: "lomond-reference-request-exit" }, "*"); } }
        function message(event) {
            if (event.source !== frame.contentWindow || !event.data) { return; }
            if (event.data.type === "lomond-reference-ready") { ready = true; }
            if (event.data.type === "lomond-reference-exit") { finish(); }
        }
        function focus(event) { if (!layer.contains(event.target)) { frame.focus(); } }
        function keydown(event) { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); request(); } }
        root.addEventListener("message", message); doc.addEventListener("focusin", focus, true); close.addEventListener("click", request);
        layer.addEventListener("keydown", keydown);
        active = { frame: frame }; frame.focus();
        if (typeof root.UIReferenceArtifact === "string") { frame.srcdoc = root.UIReferenceArtifact; }
        else {
            loader = doc.createElement("script"); loader.charset = "utf-8"; loader.src = "reference/embedded.js?v=20260918-ui-reference-b-f3";
            loader.onload = function () { if (active && active.frame === frame && typeof root.UIReferenceArtifact === "string") { frame.srcdoc = root.UIReferenceArtifact; } if (loader.parentNode) { loader.parentNode.removeChild(loader); } };
            loader.onerror = function () { close.textContent = t("reference.exit") + " (load failed)"; };
            doc.head.appendChild(loader);
        }
    }
    root.UIReferenceLauncher = Object.freeze({ open: open });
}(window));
