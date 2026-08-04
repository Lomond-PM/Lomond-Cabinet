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
            return node;
        }
        function restoreScroll(follow, previousTop, previousHeight, compensateHeight) {
            var nextHeight = Number(rootElement.scrollHeight) || 0;
            if (follow) {
                rootElement.scrollTop = nextHeight;
            } else if (compensateHeight) {
                rootElement.scrollTop = Math.max(0, previousTop + nextHeight - previousHeight);
            } else {
                rootElement.scrollTop = previousTop;
            }
        }
        function rebuild(items) {
            while (list.children.length) { list.removeChild(list.children[0]); }
            itemRefs = [];
            items.forEach(function (item) {
                append(item);
                itemRefs.push(item);
            });
        }
        function render(snapshot) {
            var items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
            var follow;
            var index;
            var previousTop;
            var previousHeight;
            var requiresRebuild = items.length < itemRefs.length;
            if (disposed) { return; }
            introElement.textContent = t("vela.surfaceTranscriptIntro");
            follow = nearBottom();
            previousTop = Number(rootElement.scrollTop) || 0;
            previousHeight = Number(rootElement.scrollHeight) || 0;
            for (index = 0; !requiresRebuild && index < itemRefs.length; index += 1) {
                if (itemRefs[index] !== items[index]) { requiresRebuild = true; }
            }
            if (requiresRebuild) {
                rebuild(items);
            } else {
                for (index = 0; index < itemRefs.length; index += 1) {
                    list.children[index].textContent = messageText(items[index]);
                }
                for (index = itemRefs.length; index < items.length; index += 1) {
                    append(items[index]);
                    itemRefs.push(items[index]);
                }
            }
            restoreScroll(follow, previousTop, previousHeight, requiresRebuild);
        }
        function refreshLocale() {
            var nodes;
            var index;
            var follow;
            var previousTop;
            var previousHeight;
            if (disposed) { return; }
            follow = nearBottom();
            previousTop = Number(rootElement.scrollTop) || 0;
            previousHeight = Number(rootElement.scrollHeight) || 0;
            introElement.textContent = t("vela.surfaceTranscriptIntro");
            nodes = list.children;
            for (index = 0; index < nodes.length; index += 1) {
                nodes[index].textContent = messageText(itemRefs[index]);
            }
            restoreScroll(follow, previousTop, previousHeight, true);
        }
        list = documentRef.createElement("div");
        list.className = "vela-transcript-list";
        rootElement.appendChild(list);
        return Object.freeze({ render: render, refreshLocale: refreshLocale, dispose: function () { disposed = true; } });
    }
    return Object.freeze({ create: create });
}));
