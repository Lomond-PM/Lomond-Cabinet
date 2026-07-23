(function (root, factory) {
    "use strict";
    var exported = Object.freeze(factory());
    if (root) { Object.defineProperty(root, "VelaProviderUi", { configurable: false, enumerable: true, value: exported, writable: false }); }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    function setText(node, text) { if (node) { node.textContent = text === null || text === undefined ? "" : String(text); } }
    function createProviderUi(options) {
        var root = options && options.root;
        var t = options && typeof options.t === "function" ? options.t : function (key) { return key; };
        var onIntent = options && typeof options.onIntent === "function" ? options.onIntent : function () {};
        var documentRef = root && root.ownerDocument;
        var host = documentRef ? documentRef.createElement("div") : null;
        var listeners = [];
        var endpoint = "http://127.0.0.1:1234/v1/chat/completions";
        var model = "";
        var state = null;
        function listen(node, type, fn) { node.addEventListener(type, fn); listeners.push({ node: node, type: type, fn: fn }); }
        function teardown() { while (listeners.length) { var item = listeners.pop(); item.node.removeEventListener(item.type, item.fn); } }
        function element(tag, className, text) { var node = documentRef.createElement(tag); if (className) { node.className = className; } setText(node, text); return node; }
        function render(nextState) {
            var card;
            var endpointInput;
            var modelInput;
            var message;
            var send;
            var cancel;
            teardown();
            if (host && host.parentNode !== root) { root.appendChild(host); }
            if (host) { host.textContent = ""; }
            state = nextState || { state: "idle" };
            card = element("section", "panel-card vela-provider-panel");
            card.appendChild(element("h3", "registry-title-primary", t("vela.providerTitle")));
            endpointInput = documentRef.createElement("input"); endpointInput.type = "text"; endpointInput.className = "registry-text-input"; endpointInput.value = endpoint; endpointInput.disabled = state.state === "pending";
            modelInput = documentRef.createElement("input"); modelInput.type = "text"; modelInput.className = "registry-text-input"; modelInput.value = model; modelInput.disabled = state.state === "pending";
            message = documentRef.createElement("textarea"); message.className = "registry-text-input"; message.maxLength = 16384; message.disabled = state.state === "pending";
            card.appendChild(element("label", "control-label", t("vela.providerEndpoint"))); card.appendChild(endpointInput);
            card.appendChild(element("label", "control-label", t("vela.providerModel"))); card.appendChild(modelInput);
            card.appendChild(element("label", "control-label", t("vela.providerMessage"))); card.appendChild(message);
            send = element("button", "panel-button primary-action", t("vela.providerSend")); send.type = "button"; send.disabled = state.state === "pending";
            cancel = element("button", "panel-button secondary-action", t("vela.providerCancel")); cancel.type = "button"; cancel.disabled = state.state !== "pending";
            listen(send, "click", function () { endpoint = endpointInput.value; model = modelInput.value; onIntent({ type: "provider-send", endpoint: endpoint, model: model, message: message.value }); });
            listen(cancel, "click", function () { onIntent({ type: "provider-cancel", requestId: state.requestId }); });
            card.appendChild(send); card.appendChild(cancel);
            card.appendChild(element("p", "registry-text-muted", t("vela.stateLabel") + ": " + (state.state || "idle")));
            if (state.errorCode) { card.appendChild(element("p", "registry-text-muted", t("vela.errorCode") + ": " + state.errorCode)); }
            if (state.text) { card.appendChild(element("pre", "vela-provider-text", state.text)); }
            host.appendChild(card);
        }
        return Object.freeze({ render: render, teardown: teardown });
    }
    return { createProviderUi: createProviderUi };
}));
