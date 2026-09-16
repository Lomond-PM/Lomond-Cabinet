(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (root && root.self === root && root["win" + "dow"] === root) {
        if (!Object.prototype.hasOwnProperty.call(root, "VelaConversationSwitcher")) { Object.defineProperty(root, "VelaConversationSwitcher", { value: api }); }
    } else if (typeof module === "object" && module.exports) { module.exports = api; }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var MAX_LIVE_CONVERSATIONS = 8;
    var MAX_DRAFT_LENGTH = 8192;
    function create(options) {
        var composition = options.composition, mount = options.mount, t = options.t;
        var metadata = new Map(), serial = 0, disposed = false, creating = false, errorCode = null;
        var displayed = [], doc = mount.ownerDocument;
        var select = doc.createElement("select"), add = doc.createElement("button"), close = doc.createElement("button"), feedback = doc.createElement("span");
        select.className = "vela-conversation-select";
        add.className = close.className = "panel-button utility-action vela-conversation-button";
        add.type = close.type = "button";
        feedback.className = "vela-conversation-feedback"; feedback.setAttribute("role", "status");
        mount.appendChild(select); mount.appendChild(add); mount.appendChild(close); mount.appendChild(feedback);
        function data(record) { if (!metadata.has(record)) { metadata.set(record, { serial: ++serial, draft: "" }); } return metadata.get(record); }
        function fail(code) { errorCode = code; render(); return Object.freeze({ ok: false, code: code }); }
        function render() {
            if (disposed) { return; }
            displayed = composition.getRecords();
            var selected = composition.getSelected(), active = composition.getActiveRecord();
            metadata.forEach(function (_, record) { if (displayed.indexOf(record) < 0) { metadata.delete(record); } });
            while (select.firstChild) { select.removeChild(select.firstChild); }
            displayed.forEach(function (record, index) {
                var option = doc.createElement("option");
                option.textContent = t("vela.conversationLabel").replace("{n}", data(record).serial) + (record === active ? " · " + t("vela.conversationRunning") : "");
                option.value = String(index); option.selected = record === selected; select.appendChild(option);
            });
            select.selectedIndex = displayed.indexOf(selected);
            select.setAttribute("aria-label", t("vela.conversationSelect"));
            add.textContent = "+"; close.textContent = "×";
            add.setAttribute("aria-label", t("vela.conversationNew")); close.setAttribute("aria-label", t("vela.conversationClose"));
            add.disabled = creating || displayed.length >= MAX_LIVE_CONVERSATIONS;
            close.disabled = !selected || selected === active || displayed.length <= 1;
            add.title = t(displayed.length >= MAX_LIVE_CONVERSATIONS ? "vela.conversationLimit" : "vela.conversationNew");
            close.title = t(selected === active ? "vela.conversationActiveClose" : displayed.length <= 1 ? "vela.conversationLastClose" : "vela.conversationClose");
            feedback.textContent = errorCode ? t("vela.conversationOperationFailed") : displayed.length >= MAX_LIVE_CONVERSATIONS ? t("vela.conversationLimit") : "";
            feedback.hidden = !feedback.textContent;
            mount.setAttribute("data-conversation-error", errorCode || "");
            if (options.onChange) { options.onChange(); }
        }
        function newConversation() {
            if (disposed) { return Promise.resolve({ ok: false, code: "CONVERSATION_UI_DISPOSED" }); }
            if (creating) { return Promise.resolve(fail("CONVERSATION_CREATE_PENDING")); }
            if (composition.getRecords().length >= MAX_LIVE_CONVERSATIONS) { return Promise.resolve(fail("CONVERSATION_LIMIT_REACHED")); }
            creating = true; errorCode = null; render();
            return Promise.resolve().then(function () { if (disposed) { throw new Error("disposed"); } return composition.createRecord(); }).then(function (record) {
                if (disposed) { return { ok: false, code: "CONVERSATION_UI_DISPOSED" }; }
                data(record); composition.select(record); return { ok: true, record: record };
            }, function () { return disposed ? { ok: false, code: "CONVERSATION_UI_DISPOSED" } : fail("CONVERSATION_CREATE_FAILED"); }).then(function (result) { creating = false; render(); return result; });
        }
        function choose(record) {
            if (disposed) { return { ok: false, code: "CONVERSATION_UI_DISPOSED" }; }
            if (composition.getRecords().indexOf(record) < 0) { return fail("CONVERSATION_RECORD_STALE"); }
            errorCode = null; composition.select(record); render(); return { ok: true };
        }
        function closeRecord(record) {
            if (disposed) { return { ok: false, code: "CONVERSATION_UI_DISPOSED" }; }
            var records = composition.getRecords(), index = records.indexOf(record);
            if (index < 0) { return fail("CONVERSATION_RECORD_STALE"); }
            if (record === composition.getActiveRecord()) { return fail("CONVERSATION_RECORD_ACTIVE"); }
            if (records.length <= 1) { return fail("CONVERSATION_LAST_RECORD"); }
            try {
                if (record === composition.getSelected()) { composition.select(records[index > 0 ? index - 1 : 1]); }
                composition.disposeRecord(record); metadata.delete(record); errorCode = null; render(); return { ok: true };
            } catch (error) { return fail("CONVERSATION_CLOSE_FAILED"); }
        }
        function change() { var record = displayed[select.selectedIndex]; if (record) { choose(record); } }
        function addClick() { newConversation(); }
        function closeClick() { closeRecord(composition.getSelected()); }
        select.addEventListener("change", change); add.addEventListener("click", addClick); close.addEventListener("click", closeClick);
        var subscription = composition.subscribe(render);
        render();
        return Object.freeze({ newConversation: newConversation, select: choose, closeRecord: closeRecord, refreshLocale: render,
            getDraft: function (record) { return metadata.has(record) ? metadata.get(record).draft : ""; },
            setDraft: function (record, text) { if (!disposed && composition.getRecords().indexOf(record) >= 0) { data(record).draft = typeof text === "string" ? text.slice(0, MAX_DRAFT_LENGTH) : ""; } },
            dispose: function () { if (disposed) { return; } disposed = true; subscription.unsubscribe(); metadata.clear(); displayed = []; select.removeEventListener("change", change); add.removeEventListener("click", addClick); close.removeEventListener("click", closeClick); while (mount.firstChild) { mount.removeChild(mount.firstChild); } }
        });
    }
    return { create: create, MAX_LIVE_CONVERSATIONS: MAX_LIVE_CONVERSATIONS, MAX_DRAFT_LENGTH: MAX_DRAFT_LENGTH };
}));
