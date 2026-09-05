(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaTranscriptView")) {
        Object.defineProperty(root, "VelaTranscriptView", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var FOLLOW_BOTTOM_THRESHOLD = 24;
    function safeText(value) { return typeof value === "string" ? value : ""; }

    function create(options) {
        var rootElement = options && options.root;
        var introElement = options && options.intro;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var documentRef = rootElement && rootElement.ownerDocument;
        var list = null;
        var transientList = null;
        var itemRefs = [];
        var itemNodes = [];
        var transientRefs = Object.create(null);
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
        function positionTransient(ref, entry) {
            var turnId = entry.presentationTurnId;
            var userIndex = -1;
            var terminalNode = null;
            var index;
            for (index = 0; index < itemRefs.length; index += 1) {
                if (itemRefs[index].presentationTurnId === turnId && itemRefs[index].kind === "user") { userIndex = index; break; }
            }
            if (userIndex === -1) { return; }
            if (ref.node.parentNode && ref.node.parentNode !== list) { ref.node.parentNode.removeChild(ref.node); }
            for (index = userIndex + 1; index < itemRefs.length; index += 1) {
                if (itemRefs[index].presentationTurnId !== turnId) { break; }
                if (itemRefs[index].kind !== "user") { terminalNode = itemNodes[index]; break; }
            }
            if (terminalNode && typeof list.insertBefore === "function") { list.insertBefore(ref.node, terminalNode); return; }
            if (typeof list.insertBefore === "function") { list.insertBefore(ref.node, itemNodes[userIndex + 1] || null); return; }
            list.appendChild(ref.node);
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
        function transientTextNode(parent, className) { var node = documentRef.createElement("div"); node.className = className; parent.appendChild(node); return node; }
        function reasoningLabelKey(entry) {
            if (entry.state === "stream-failed") { return "vela.surfaceReasoningFailed"; }
            if (entry.state === "stream-cancelled") { return "vela.surfaceReasoningCancelled"; }
            if (entry.state === "stream-completed") { return "vela.surfaceReasoningCompleted"; }
            return entry.text ? "vela.surfaceReasoningResponse" : "vela.surfaceReasoningActive";
        }
        function updateReasoningHeader(ref, entry) {
            if (!ref.header) { return; }
            ref.labelKey = reasoningLabelKey(entry);
            ref.header.textContent = t(ref.labelKey);
            ref.header.setAttribute("aria-label", t(ref.labelKey));
            ref.header.setAttribute("aria-expanded", ref.expanded ? "true" : "false");
            ref.body.style.display = ref.expanded ? "" : "none";
        }
        function toggleReasoning(ref) {
            var follow = nearBottom();
            var previousTop = Number(rootElement.scrollTop) || 0;
            var previousHeight = Number(rootElement.scrollHeight) || 0;
            ref.expanded = !ref.expanded;
            ref.userToggled = true;
            updateReasoningHeader(ref, ref.entry);
            restoreScroll(follow, previousTop, previousHeight, false);
        }
        function createReasoningShell(segment, entry) {
            var shell = documentRef.createElement("div");
            var header = documentRef.createElement("button");
            var body = documentRef.createElement("div");
            shell.className = "vela-transcript-transient-reasoning";
            header.className = "vela-transcript-transient-reasoning-toggle";
            header.setAttribute("type", "button");
            body.className = "vela-transcript-transient-reasoning-body";
            shell.appendChild(header);
            shell.appendChild(body);
            segment.appendChild(shell);
            return { reasoning: shell, header: header, body: body, expanded: entry.state === "streaming" && !entry.text, userToggled: false };
        }
        function removeTransientNode(id) { var ref = transientRefs[id]; if (ref && ref.node && ref.node.parentNode) { ref.node.parentNode.removeChild(ref.node); } delete transientRefs[id]; }
        function renderTransient(transientSnapshot) {
            var invocations = transientSnapshot && Array.isArray(transientSnapshot.invocations) ? transientSnapshot.invocations : [];
            var activeIds = Object.create(null);
            var index;
            var entry;
            var ref;
            var segment;
            if (!transientSnapshot || !Array.isArray(transientSnapshot.invocations)) { invocations = []; }
            for (index = 0; index < invocations.length; index += 1) {
                entry = invocations[index];
                if (!entry || typeof entry.reasoningInvocationId !== "string" || entry.reconciliation === "closed") { continue; }
                if (!entry.reasoningText && !entry.text) { continue; }
                activeIds[entry.reasoningInvocationId] = true;
                ref = transientRefs[entry.reasoningInvocationId];
                if (!ref) {
                    segment = documentRef.createElement("section");
                    segment.className = "vela-transcript-transient-segment";
                    segment.setAttribute("data-reasoning-invocation-id", entry.reasoningInvocationId);
                    ref = transientRefs[entry.reasoningInvocationId] = { node: segment, reasoning: null, header: null, body: null, text: null, expanded: false, userToggled: false, hasStartedText: false, lastState: entry.state, entry: entry };
                    if (entry.reasoningText) {
                        var shellRef = createReasoningShell(segment, entry);
                        ref.reasoning = shellRef.reasoning;
                        ref.header = shellRef.header;
                        ref.body = shellRef.body;
                        ref.expanded = shellRef.expanded;
                        (function (boundRef) { boundRef.header.addEventListener("click", function () { toggleReasoning(boundRef); }); }(ref));
                    }
                    ref.text = transientTextNode(segment, "vela-transcript-transient-text");
                    transientList.appendChild(segment);
                }
                ref.entry = entry;
                if (entry.text && !ref.hasStartedText && !ref.userToggled) { ref.expanded = false; }
                if (entry.text) { ref.hasStartedText = true; }
                if (entry.state !== "streaming" && entry.state !== ref.lastState && ref.reasoning) { ref.expanded = false; ref.userToggled = false; }
                if (!ref.reasoning && entry.reasoningText) {
                    var lateShellRef = createReasoningShell(segment, entry);
                    ref.reasoning = lateShellRef.reasoning;
                    ref.header = lateShellRef.header;
                    ref.body = lateShellRef.body;
                    ref.expanded = false;
                    (function (boundRef) { boundRef.header.addEventListener("click", function () { toggleReasoning(boundRef); }); }(ref));
                }
                ref.node.setAttribute("data-transient-state", entry.state);
                ref.node.setAttribute("data-transient-active", transientSnapshot.activeInvocationId === entry.reasoningInvocationId ? "true" : "false");
                if (ref.reasoning) {
                    ref.body.textContent = safeText(entry.reasoningText);
                    ref.body.style.display = ref.expanded ? "" : "none";
                    updateReasoningHeader(ref, entry);
                }
                ref.text.textContent = safeText(entry.text);
                ref.text.style.display = entry.text ? "" : "none";
                ref.lastState = entry.state;
                positionTransient(ref, entry);
            }
            Object.keys(transientRefs).forEach(function (id) { if (!activeIds[id]) { removeTransientNode(id); } });
            transientList.setAttribute("data-transient-active-id", transientSnapshot.activeInvocationId || "");
        }
        function rebuild(items) {
            while (list.children.length) { list.removeChild(list.children[0]); }
            itemRefs = [];
            itemNodes = [];
            items.forEach(function (item) {
                itemNodes.push(append(item));
                itemRefs.push(item);
            });
        }
        function renderCommitted(snapshot, restore) {
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
                    itemNodes[index].textContent = messageText(items[index]);
                }
                for (index = itemRefs.length; index < items.length; index += 1) {
                    itemNodes.push(append(items[index]));
                    itemRefs.push(items[index]);
                }
            }
            if (restore !== false) { restoreScroll(follow, previousTop, previousHeight, requiresRebuild); }
        }
        function renderWithTransient(snapshot, transientSnapshot) {
            var follow;
            var previousTop;
            var previousHeight;
            if (disposed) { return; }
            if (transientSnapshot === undefined) { renderCommitted(snapshot, true); return; }
            follow = nearBottom();
            previousTop = Number(rootElement.scrollTop) || 0;
            previousHeight = Number(rootElement.scrollHeight) || 0;
            renderCommitted(snapshot, false);
            renderTransient(transientSnapshot);
            restoreScroll(follow, previousTop, previousHeight, !follow);
        }
        function refreshLocale() {
            var index;
            var follow;
            var previousTop;
            var previousHeight;
            if (disposed) { return; }
            follow = nearBottom();
            previousTop = Number(rootElement.scrollTop) || 0;
            previousHeight = Number(rootElement.scrollHeight) || 0;
            introElement.textContent = t("vela.surfaceTranscriptIntro");
            for (index = 0; index < itemNodes.length; index += 1) {
                itemNodes[index].textContent = messageText(itemRefs[index]);
            }
            Object.keys(transientRefs).forEach(function (id) {
                var ref = transientRefs[id];
                if (ref && ref.entry && ref.header) { updateReasoningHeader(ref, ref.entry); }
            });
            restoreScroll(follow, previousTop, previousHeight, true);
        }
        list = documentRef.createElement("div");
        list.className = "vela-transcript-list";
        rootElement.appendChild(list);
        transientList = documentRef.createElement("div");
        transientList.className = "vela-transcript-transient-list";
        rootElement.appendChild(transientList);
        return Object.freeze({ render: renderWithTransient, refreshLocale: refreshLocale, dispose: function () { disposed = true; } });
    }
    return Object.freeze({ create: create });
}));
