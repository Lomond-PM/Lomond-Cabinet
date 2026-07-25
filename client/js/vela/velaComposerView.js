(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaComposerView")) {
        Object.defineProperty(root, "VelaComposerView", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function create(options) {
        var composer = options && options.composer;
        var actionSlot = options && options.actionSlot;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onSend = options && typeof options.onSend === "function" ? options.onSend : function () {};
        var onCancel = options && typeof options.onCancel === "function" ? options.onCancel : function () {};
        var documentRef = composer && composer.ownerDocument;
        var send;
        var cancel;
        var state = "idle";
        var disposed = false;
        if (!composer || !actionSlot || !documentRef) { throw new Error("VelaComposerView requires composer elements."); }
        function refreshLocale() {
            composer.setAttribute("placeholder", t("vela.surfaceComposerPlaceholder"));
            send.textContent = t("vela.surfaceSend");
            cancel.textContent = t("vela.surfaceCancel");
            send.setAttribute("aria-label", t("vela.surfaceSend"));
            cancel.setAttribute("aria-label", t("vela.surfaceCancel"));
        }
        function render(nextState) {
            state = nextState === "cancel" || nextState === "pending" ? "cancel" : nextState === "send" || nextState === "idle" || nextState === "completed" || nextState === "failed" || nextState === "cancelled" ? "send" : typeof nextState === "string" ? nextState : "send";
            send.hidden = state !== "send";
            cancel.hidden = state !== "cancel";
            send.disabled = state !== "send";
            cancel.disabled = state !== "cancel";
            composer.readOnly = state === "review" || state === "confirm" || state === "none";
            composer.setAttribute("aria-readonly", composer.readOnly ? "true" : "false");
        }
        function clearSubmittedMessage(message) {
            if (typeof message === "string" && composer.value === message) { composer.value = ""; }
        }
        send = documentRef.createElement("button");
        send.type = "button";
        send.className = "panel-button vela-surface-action vela-compact-action";
        cancel = documentRef.createElement("button");
        cancel.type = "button";
        cancel.className = "panel-button vela-surface-action vela-compact-action";
        send.addEventListener("click", function () { if (!disposed && state === "send") { onSend(composer.value); } });
        cancel.addEventListener("click", function () { if (!disposed && state === "cancel") { onCancel(); } });
        actionSlot.appendChild(send);
        actionSlot.appendChild(cancel);
        refreshLocale();
        render("send");
        return Object.freeze({ render: render, clearSubmittedMessage: clearSubmittedMessage, refreshLocale: refreshLocale, getElementsForTest: function () { return { send: send, cancel: cancel }; }, dispose: function () { disposed = true; } });
    }
    return Object.freeze({ create: create });
}));
