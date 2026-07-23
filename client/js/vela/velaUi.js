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

    function clear(node) {
        while (node && node.firstChild) { node.removeChild(node.firstChild); }
    }

    function button(documentRef, label, className, disabled) {
        var node = documentRef.createElement("button");
        node.type = "button";
        node.className = className || "panel-button";
        node.disabled = disabled === true;
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

    function createVelaUi(options) {
        var root = options && options.root;
        var actionsRoot = options && options.actionsRoot;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onIntent = options && typeof options.onIntent === "function" ? options.onIntent : function () {};
        var documentRef = root && root.ownerDocument;
        var state = null;
        var listeners = [];
        if (!root || !actionsRoot || !documentRef) { throw new Error("VELA_UI_ROOT_UNAVAILABLE"); }

        function listen(node, eventName, handler) {
            node.addEventListener(eventName, handler);
            listeners.push({ node: node, eventName: eventName, handler: handler });
        }

        function teardown() {
            listeners.forEach(function (item) { item.node.removeEventListener(item.eventName, item.handler); });
            listeners = [];
            clear(root);
            clear(actionsRoot);
        }

        function render(nextState) {
            var card;
            var input;
            var row;
            var review;
            var approve;
            var reject;
            var create;
            var refresh;
            teardown();
            state = nextState || { state: "idle" };
            card = documentRef.createElement("section");
            card.className = "panel-card vela-panel";
            card.appendChild(createText(documentRef, "p", "overline", t("vela.overline")));
            card.appendChild(createText(documentRef, "h3", "registry-title-primary", t("vela.title")));
            card.appendChild(createText(documentRef, "p", "registry-text-body", t("vela.description")));
            row = documentRef.createElement("div");
            row.className = "vela-context-summary info-panel";
            row.appendChild(createText(documentRef, "strong", null, t("vela.contextSummary")));
            row.appendChild(createText(documentRef, "span", null, state.targetSummary || t("vela.targetUnavailable")));
            row.appendChild(createText(documentRef, "span", null, t("vela.stateLabel") + ": " + (state.state || "idle")));
            card.appendChild(row);
            input = documentRef.createElement("input");
            input.type = "number";
            input.min = "0";
            input.max = "100";
            input.step = "0.1";
            input.className = "registry-text-input registry-number-input vela-opacity-input";
            input.value = state.proposedValue !== null && state.proposedValue !== undefined ? String(state.proposedValue) : "";
            input.disabled = state.state === "executing";
            card.appendChild(createText(documentRef, "label", "control-label", t("vela.opacityLabel")));
            card.appendChild(input);
            review = documentRef.createElement("div");
            review.className = "vela-review-card panel-card";
            review.appendChild(createText(documentRef, "strong", null, t("vela.confirmation")));
            review.appendChild(createText(documentRef, "span", null, t("vela.riskWrite")));
            review.appendChild(createText(documentRef, "span", null, safeNumber(state.beforeValue) + " -> " + safeNumber(state.proposedValue)));
            review.appendChild(createText(documentRef, "span", null, state.undoGroupLabel || "Vela: Set Opacity"));
            if (state.state === "pending-confirmation" || state.state === "executing" || state.state === "consumed" || state.state === "failed" || state.state === "stale" || state.state === "discarded") {
                card.appendChild(review);
            }
            if (state.errorCode) {
                card.appendChild(createText(documentRef, "p", "registry-text-muted", t("vela.errorCode") + ": " + state.errorCode));
            }
            root.appendChild(card);
            refresh = button(documentRef, t("common.refresh"), "panel-button secondary-action", state.state === "executing");
            create = button(documentRef, t("vela.reviewAction"), "panel-button primary-action", state.state === "executing");
            approve = button(documentRef, t("vela.approve"), "panel-button primary-action", state.state !== "pending-confirmation");
            reject = button(documentRef, t("vela.reject"), "panel-button secondary-action", state.state !== "pending-confirmation");
            listen(refresh, "click", function () { onIntent({ type: "refresh" }); });
            listen(create, "click", function () {
                if (input.value === "" || /^\s+$/.test(input.value)) { return; }
                onIntent({ type: "proposal", opacity: Number(input.value) });
            });
            listen(approve, "click", function () { onIntent({ type: "approve", candidateId: state.candidateId }); });
            listen(reject, "click", function () { onIntent({ type: "reject", candidateId: state.candidateId }); });
            actionsRoot.appendChild(refresh);
            actionsRoot.appendChild(create);
            actionsRoot.appendChild(approve);
            actionsRoot.appendChild(reject);
        }

        return Object.freeze({ render: render, teardown: teardown, getState: function () { return state; } });
    }

    return Object.freeze({ createVelaUi: createVelaUi });
}));
