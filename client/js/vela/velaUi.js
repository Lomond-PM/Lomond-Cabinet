(function (root, factory) {
    "use strict";
    if (typeof module === "object" && module.exports && !(root && root.self === root && root["win" + "dow"] === root)) {
        module.exports = Object.freeze(factory());
    } else if (root && !Object.prototype.hasOwnProperty.call(root, "VelaUi")) {
        Object.defineProperty(root, "VelaUi", { configurable: false, enumerable: true, value: Object.freeze(factory()), writable: false });
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function setText(node, text) {
        if (node) { node.textContent = text === null || text === undefined ? "" : String(text); }
    }

    function button(documentRef, label, className) {
        var node = documentRef.createElement("button");
        node.type = "button";
        node.className = className || "panel-button";
        setText(node, label);
        return node;
    }

    function createText(documentRef, tag, className, text) {
        var node = documentRef.createElement(tag);
        if (className) { node.className = className; }
        setText(node, text);
        return node;
    }

    function safeNumber(value) {
        return typeof value === "number" && isFinite(value) ? String(value) : "n/a";
    }

    function manualOpacityValidation(value, touched) {
        var trimmed;
        var numeric;
        if (typeof value !== "string") { return { state: "invalid", opacity: null }; }
        if (value === "") { return { state: touched ? "required" : "pristine", opacity: null }; }
        trimmed = value.trim();
        if (!trimmed || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) { return { state: "invalid", opacity: null }; }
        numeric = Number(trimmed);
        if (!isFinite(numeric) || numeric < 0 || numeric > 100) { return { state: "invalid", opacity: null }; }
        return { state: "valid", opacity: numeric };
    }

    function contextSummary(state, t) {
        if (state && state.state === "ready" && typeof state.contextLayerIndex === "number" && isFinite(state.contextLayerIndex) && Math.floor(state.contextLayerIndex) === state.contextLayerIndex && state.contextLayerIndex >= 1) {
            return t("vela.contextSelectedLayerOpacity", { index: state.contextLayerIndex });
        }
        return state && state.targetSummary ? state.targetSummary : t("vela.targetUnavailable");
    }

    function createVelaUi(options) {
        var root = options && options.root;
        var actionsRoot = options && options.actionsRoot;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onIntent = options && typeof options.onIntent === "function" ? options.onIntent : function () {};
        var documentRef = root && root.ownerDocument;
        var state = { state: "idle" };
        var listeners = [];
        var manualDraft = "";
        var manualDraftContextRevision = null;
        var manualDraftTouched = false;
        var card;
        var contextText;
        var currentOpacity;
        var stateText;
        var input;
        var validation;
        var review;
        var reviewValues;
        var error;
        var refresh;
        var create;
        var approve;
        var reject;
        if (!root || !actionsRoot || !documentRef) { throw new Error("VELA_UI_ROOT_UNAVAILABLE"); }

        function listen(node, eventName, handler) {
            node.addEventListener(eventName, handler);
            listeners.push({ node: node, eventName: eventName, handler: handler });
        }

        function resetManualDraft(nextState) {
            manualDraft = "";
            manualDraftTouched = false;
            manualDraftContextRevision = nextState && typeof nextState.contextRevision === "number" ? nextState.contextRevision : null;
        }

        function currentOpacityText(nextState) {
            return nextState && nextState.state === "ready" && typeof nextState.beforeValue === "number" && isFinite(nextState.beforeValue) ? safeNumber(nextState.beforeValue) + "%" : t("vela.targetUnavailable");
        }

        function hasLegacyConfirmation(nextState) {
            return nextState && nextState.state === "pending-confirmation" && typeof nextState.beforeValue === "number" && isFinite(nextState.beforeValue) && typeof nextState.proposedValue === "number" && isFinite(nextState.proposedValue);
        }

        function updateValidation() {
            var result = manualOpacityValidation(manualDraft, manualDraftTouched);
            var invalid = result.state === "required" || result.state === "invalid";
            var message = result.state === "required" ? t("vela.manualOpacityRequired") : (result.state === "invalid" ? t("vela.manualOpacityInvalid") : "");
            input.value = manualDraft;
            input.setAttribute("aria-invalid", invalid ? "true" : "false");
            validation.className = "vela-manual-opacity-validation" + (invalid ? " is-error" : "");
            setText(validation, message);
            create.disabled = state.state !== "ready" || result.state !== "valid";
            return result;
        }

        function update(nextState) {
            state = nextState || { state: "idle" };
            if (manualDraftContextRevision !== null && manualDraftContextRevision !== state.contextRevision) { resetManualDraft(state); }
            setText(contextText, contextSummary(state, t));
            setText(currentOpacity, currentOpacityText(state));
            setText(stateText, t("vela.stateLabel") + ": " + (state.state || "idle"));
            input.disabled = state.state === "executing";
            var showConfirmation = hasLegacyConfirmation(state);
            review.hidden = !showConfirmation;
            review.setAttribute("aria-hidden", showConfirmation ? "false" : "true");
            setText(reviewValues, showConfirmation ? safeNumber(state.beforeValue) + " -> " + safeNumber(state.proposedValue) : "");
            error.hidden = !state.errorCode;
            setText(error, state.errorCode ? t("vela.errorCode") + ": " + state.errorCode : "");
            approve.disabled = state.state !== "pending-confirmation";
            reject.disabled = state.state !== "pending-confirmation";
            refresh.disabled = state.state === "executing";
            updateValidation();
        }

        function teardown() {
            listeners.forEach(function (item) { item.node.removeEventListener(item.eventName, item.handler); });
            listeners = [];
            if (card.parentNode) { card.parentNode.removeChild(card); }
            [refresh, create, approve, reject].forEach(function (node) { if (node.parentNode) { node.parentNode.removeChild(node); } });
        }

        card = documentRef.createElement("section");
        card.className = "panel-card vela-panel";
        card.appendChild(createText(documentRef, "p", "overline", t("vela.overline")));
        card.appendChild(createText(documentRef, "h3", "registry-title-primary", t("vela.title")));
        card.appendChild(createText(documentRef, "p", "registry-text-body", t("vela.description")));
        var row = documentRef.createElement("div");
        var currentValue = documentRef.createElement("div");
        row.className = "vela-context-summary info-panel";
        row.appendChild(createText(documentRef, "strong", null, t("vela.contextSummary")));
        contextText = createText(documentRef, "span", null, "");
        row.appendChild(contextText);
        currentValue.className = "vela-current-opacity";
        currentValue.appendChild(createText(documentRef, "strong", null, t("vela.currentOpacity")));
        currentOpacity = createText(documentRef, "span", null, "");
        currentValue.appendChild(currentOpacity);
        row.appendChild(currentValue);
        stateText = createText(documentRef, "span", null, "");
        row.appendChild(stateText);
        card.appendChild(row);
        var label = createText(documentRef, "label", "control-label", t("vela.manualOpacityTarget"));
        input = documentRef.createElement("input");
        input.id = "vela-manual-opacity-input";
        input.type = "number";
        input.min = "0";
        input.max = "100";
        input.step = "0.1";
        input.className = "registry-text-input registry-number-input vela-opacity-input";
        input.placeholder = t("vela.manualOpacityPlaceholder");
        input.setAttribute("aria-describedby", "vela-manual-opacity-validation");
        input.setAttribute("aria-invalid", "false");
        label.htmlFor = input.id;
        validation = createText(documentRef, "p", "vela-manual-opacity-validation", "");
        validation.id = "vela-manual-opacity-validation";
        validation.setAttribute("aria-live", "polite");
        card.appendChild(label);
        card.appendChild(input);
        card.appendChild(validation);
        review = documentRef.createElement("div");
        review.className = "vela-review-card panel-card";
        review.appendChild(createText(documentRef, "strong", null, t("vela.confirmation")));
        review.appendChild(createText(documentRef, "span", null, t("vela.riskWrite")));
        reviewValues = createText(documentRef, "span", null, "");
        review.appendChild(reviewValues);
        review.appendChild(createText(documentRef, "span", null, "Vela: Set Opacity"));
        card.appendChild(review);
        error = createText(documentRef, "p", "registry-text-muted", "");
        card.appendChild(error);
        refresh = button(documentRef, t("common.refresh"), "panel-button secondary-action");
        create = button(documentRef, t("vela.reviewAction"), "panel-button primary-action");
        approve = button(documentRef, t("vela.approve"), "panel-button primary-action");
        reject = button(documentRef, t("vela.reject"), "panel-button secondary-action");
        listen(refresh, "click", function () {
            resetManualDraft(state);
            updateValidation();
            onIntent({ type: "refresh" });
        });
        listen(input, "input", function () {
            manualDraft = input.value;
            manualDraftTouched = true;
            manualDraftContextRevision = typeof state.contextRevision === "number" ? state.contextRevision : null;
            updateValidation();
        });
        listen(input, "blur", function () {
            manualDraftTouched = true;
            updateValidation();
        });
        listen(create, "click", function () {
            var result = updateValidation();
            if (state.state !== "ready" || result.state !== "valid") { return; }
            onIntent({ type: "proposal", opacity: result.opacity });
        });
        listen(approve, "click", function () { onIntent({ type: "approve", candidateId: state.candidateId }); });
        listen(reject, "click", function () { onIntent({ type: "reject", candidateId: state.candidateId }); });
        root.appendChild(card);
        actionsRoot.appendChild(refresh);
        actionsRoot.appendChild(create);
        actionsRoot.appendChild(approve);
        actionsRoot.appendChild(reject);

        return Object.freeze({ render: update, resetTransientState: function () { resetManualDraft(state); updateValidation(); }, teardown: teardown, getState: function () { return state; } });
    }

    return Object.freeze({ createVelaUi: createVelaUi });
}));
