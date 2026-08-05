(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaTranscriptView")) {
        Object.defineProperty(root, "VelaTranscriptView", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var FOLLOW_BOTTOM_THRESHOLD = 24;

    function create(options) {
        var rootElement = options && options.root;
        var introElement = options && options.intro;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var documentRef = rootElement && rootElement.ownerDocument;
        var list = null;
        var itemRefs = [];
        var disposed = false;
        if (!rootElement || !introElement || !documentRef) { throw new Error("VelaTranscriptView requires transcript elements."); }
        function nearBottom() {
            var scrollHeight = Number(rootElement.scrollHeight) || 0;
            var clientHeight = Number(rootElement.clientHeight) || 0;
            var scrollTop = Number(rootElement.scrollTop) || 0;
            return scrollHeight - clientHeight - scrollTop <= FOLLOW_BOTTOM_THRESHOLD;
        }
        function messageText(item) {
            return item && item.displayTextKey ? t(item.displayTextKey) : item && item.text || "";
        }
        function append(item) {
            var node = documentRef.createElement("p");
            node.className = "vela-transcript-message vela-transcript-" + item.kind;
            node.textContent = messageText(item);
            list.appendChild(node);
        }
        function render(snapshot) {
            var items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
            var follow;
            var index;
            if (disposed) { return; }
            introElement.textContent = t("vela.surfaceTranscriptIntro");
            follow = nearBottom();
            while (itemRefs.length && itemRefs[0] !== items[0]) {
                list.removeChild(list.children[0]);
                itemRefs.shift();
            }
            for (index = itemRefs.length; index < items.length; index += 1) {
                append(items[index]);
                itemRefs.push(items[index]);
            }
            if (follow) { rootElement.scrollTop = rootElement.scrollHeight; }
        }
        function refreshLocale() {
            var nodes;
            var index;
            if (disposed) { return; }
            introElement.textContent = t("vela.surfaceTranscriptIntro");
            nodes = list.children;
            for (index = 0; index < nodes.length; index += 1) {
                nodes[index].textContent = messageText(itemRefs[index]);
            }
        }
        list = documentRef.createElement("div");
        list.className = "vela-transcript-list";
        rootElement.appendChild(list);
        return Object.freeze({ render: render, refreshLocale: refreshLocale, dispose: function () { disposed = true; } });
    }
    return Object.freeze({ create: create });
}));
