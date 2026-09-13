(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root && !Object.prototype.hasOwnProperty.call(root, "VelaConfirmationView")) {
        Object.defineProperty(root, "VelaConfirmationView", { configurable: false, enumerable: true, value: exported, writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var nextId = 0;
    function create(options) {
        var actionSlot = options && options.actionSlot;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onReview = options && typeof options.onReview === "function" ? options.onReview : function () {};
        var onApprove = options && typeof options.onApprove === "function" ? options.onApprove : function () {};
        var onReject = options && typeof options.onReject === "function" ? options.onReject : function () {};
        var documentRef = actionSlot && actionSlot.ownerDocument;
        var disposed = false, expanded = false, identity = null, lastAction = "send", lastState = null;
        if (!actionSlot || !documentRef) { throw new Error("VelaConfirmationView requires an action slot."); }
        function node(tag, className) { var element = documentRef.createElement(tag); element.className = className; return element; }
        function button(extra) { var element = node("button", "panel-button utility-action vela-surface-action vela-compact-action " + (extra || "")); element.type = "button"; return element; }
        var card = node("section", "vela-review-card"), summary = node("p", "vela-confirmation-summary");
        var target = node("p", "vela-review-target"), scope = node("p", "vela-review-scope"), problem = node("p", "vela-review-problem");
        var toggle = button("vela-review-toggle"), details = node("div", "vela-review-details");
        var beforeLabel = node("p", "vela-review-value-label"), before = node("pre", "vela-review-value");
        var proposedLabel = node("p", "vela-review-value-label"), proposed = node("pre", "vela-review-value");
        var review = button(), approve = button(), reject = button("vela-reject-action");
        details.id = "vela-review-details-" + (++nextId); details.tabIndex = 0;
        details.setAttribute("role", "region"); toggle.setAttribute("aria-controls", details.id); problem.setAttribute("role", "status");
        details.appendChild(beforeLabel); details.appendChild(before); details.appendChild(proposedLabel); details.appendChild(proposed);
        card.appendChild(summary); card.appendChild(target); card.appendChild(scope); card.appendChild(problem); card.appendChild(toggle); card.appendChild(details);
        actionSlot.appendChild(card); actionSlot.appendChild(review); actionSlot.appendChild(approve); actionSlot.appendChild(reject);
        // String notation exposes newline, quotes and edge whitespace without changing the value.
        function displayValue(value, kind) { return kind === "string" && typeof value === "string" ? JSON.stringify(value) : typeof value === "number" && isFinite(value) ? String(value) + "%" : t("vela.reviewUnavailableValue"); }
        function render(actionState, state) {
            if (disposed) { return; }
            var active = actionState === "confirm";
            var key = active && state && typeof state.reviewId === "string" && Number.isInteger(state.revision) ? JSON.stringify([state.reviewId, state.revision]) : null;
            var valid = active && !!key && state.canApprove === true && state.target && typeof state.target.compId === "string" && typeof state.target.layerId === "string" && (state.approvalScope === "current-step" || state.approvalScope === "single-action");
            if (key !== identity || !active) { expanded = false; }
            identity = key; lastAction = actionState; lastState = state || null;
            review.hidden = actionState !== "review"; review.disabled = review.hidden;
            approve.hidden = !active; approve.disabled = !valid;
            reject.hidden = !active; reject.disabled = !active; card.hidden = !active;
            actionSlot.setAttribute("data-review-active", active ? "true" : "false");
            if (actionSlot.parentNode) { actionSlot.parentNode.setAttribute("data-review-active", active ? "true" : "false"); }
            summary.textContent = active ? t(state && state.valueKind === "string" ? "vela.planReviewCapabilitySetLayerName" : "vela.planReviewCapabilitySetOpacity") : "";
            target.textContent = active && state && state.target ? t("vela.reviewTargetIds", { comp: state.target.compId, layer: state.target.layerId }) : "";
            scope.textContent = active ? t("vela.reviewCurrentStepScope", { current: state && state.stepNumber || "?", total: state && state.stepCount || "?" }) : "";
            problem.hidden = !active || valid; problem.textContent = active && !valid ? t("vela.reviewUnavailable") : "";
            before.textContent = active ? displayValue(state && state.beforeValue, state && state.valueKind) : "";
            proposed.textContent = active ? displayValue(state && state.proposedValue, state && state.valueKind) : "";
            details.hidden = !active || !expanded; toggle.hidden = !active;
            toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
            toggle.textContent = t(expanded ? "vela.reviewHideDetails" : "vela.reviewShowDetails");
            beforeLabel.textContent = t("vela.reviewBefore"); proposedLabel.textContent = t("vela.reviewProposed");
            details.setAttribute("aria-label", t("vela.reviewShowDetails"));
        }
        function refreshLocale() {
            if (disposed) { return; }
            review.textContent = t("vela.surfaceReview"); approve.textContent = t("vela.surfaceApprove"); reject.textContent = t("vela.surfaceReject");
            [review, approve, reject].forEach(function (element) { element.setAttribute("aria-label", element.textContent); });
            render(lastAction, lastState);
        }
        function reviewHandler() { if (!disposed && !review.disabled) { onReview(); } }
        function approveHandler() { if (!disposed && !approve.disabled) { onApprove(); } }
        function rejectHandler() { if (!disposed && !reject.disabled) { onReject(); } }
        function toggleHandler() { if (!disposed && !toggle.hidden) { expanded = !expanded; render(lastAction, lastState); } }
        review.addEventListener("click", reviewHandler); approve.addEventListener("click", approveHandler); reject.addEventListener("click", rejectHandler); toggle.addEventListener("click", toggleHandler);
        refreshLocale();
        return Object.freeze({ render: render, refreshLocale: refreshLocale, dispose: function () {
            if (disposed) { return; }
            render("send", null); disposed = true; lastState = null; identity = null;
            review.removeEventListener("click", reviewHandler); approve.removeEventListener("click", approveHandler); reject.removeEventListener("click", rejectHandler); toggle.removeEventListener("click", toggleHandler);
            [card, review, approve, reject].forEach(function (element) { if (element.parentNode === actionSlot) { actionSlot.removeChild(element); } });
        }, getElementsForTest: function () { return { summary: summary, review: review, approve: approve, reject: reject, card: card, target: target, scope: scope, problem: problem, toggle: toggle, details: details, before: before, proposed: proposed }; } });
    }
    return Object.freeze({ create: create });
}));
