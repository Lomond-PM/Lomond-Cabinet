(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaConfirmationView")) {
        Object.defineProperty(root, "VelaConfirmationView", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function create(options) {
        var actionSlot = options && options.actionSlot;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onReview = options && typeof options.onReview === "function" ? options.onReview : function () {};
        var onApprove = options && typeof options.onApprove === "function" ? options.onApprove : function () {};
        var onReject = options && typeof options.onReject === "function" ? options.onReject : function () {};
        var documentRef = actionSlot && actionSlot.ownerDocument;
        var review;
        var approve;
        var reject;
        var summary;
        var disposed = false;
        if (!actionSlot || !documentRef) { throw new Error("VelaConfirmationView requires an action slot."); }
        function refreshLocale() { review.textContent = t("vela.surfaceReview"); approve.textContent = t("vela.surfaceApprove"); reject.textContent = t("vela.surfaceReject"); review.setAttribute("aria-label", t("vela.surfaceReview")); approve.setAttribute("aria-label", t("vela.surfaceApprove")); reject.setAttribute("aria-label", t("vela.surfaceReject")); }
        function render(actionState, state) {
            var showSummary = actionState === "confirm" || actionState === "none";
            review.hidden = actionState !== "review";
            approve.hidden = actionState !== "confirm";
            reject.hidden = actionState !== "confirm";
            review.disabled = actionState !== "review";
            approve.disabled = actionState !== "confirm";
            reject.disabled = actionState !== "confirm";
            summary.hidden = !showSummary;
            if (showSummary) { summary.textContent = t("vela.surfaceConfirmationValue", { before: state && state.beforeValue !== null ? state.beforeValue : "-", proposed: state && state.proposedValue !== null ? state.proposedValue : "-" }); }
        }
        summary = documentRef.createElement("span"); summary.className = "vela-confirmation-summary";
        review = documentRef.createElement("button"); review.type = "button"; review.className = "panel-button utility-action vela-surface-action vela-compact-action";
        approve = documentRef.createElement("button"); approve.type = "button"; approve.className = "panel-button utility-action vela-surface-action vela-compact-action";
        reject = documentRef.createElement("button"); reject.type = "button"; reject.className = "panel-button utility-action vela-surface-action vela-compact-action vela-reject-action";
        function reviewHandler() { if (!disposed && !review.disabled) { onReview(); } }
        function approveHandler() { if (!disposed && !approve.disabled) { onApprove(); } }
        function rejectHandler() { if (!disposed && !reject.disabled) { onReject(); } }
        review.addEventListener("click", reviewHandler);
        approve.addEventListener("click", approveHandler);
        reject.addEventListener("click", rejectHandler);
        actionSlot.appendChild(summary); actionSlot.appendChild(review); actionSlot.appendChild(approve); actionSlot.appendChild(reject);
        refreshLocale(); render("send");
        return Object.freeze({ render: render, refreshLocale: refreshLocale, dispose: function () { if (disposed) { return; } disposed = true; review.removeEventListener("click", reviewHandler); approve.removeEventListener("click", approveHandler); reject.removeEventListener("click", rejectHandler); }, getElementsForTest: function () { return { summary: summary, review: review, approve: approve, reject: reject }; } });
    }
    return Object.freeze({ create: create });
}));
