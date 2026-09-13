(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory());
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root && !root.SystemSurfaceRouter) root.SystemSurfaceRouter = api;
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function create(options) {
        options = options || {};
        var catalog = options.catalog;
        var diagnostics = options.diagnostics || function () {};
        var callbacks = options.callbacks || {};
        var active = null;
        var pending = null;
        var disposed = false;
        function transition(next, kind) {
            if (disposed || pending) return false;
            var previous = active;
            var ticket = {};
            var accepted = false;
            pending = ticket;
            function settle(allowed) {
                if (disposed || pending !== ticket || active !== previous) return;
                pending = null;
                if (allowed !== true) return;
                accepted = true; active = next;
                if (callbacks[kind]) callbacks[kind](next || previous);
            }
            if (previous && typeof options.beforeLeave === "function") {
                try { options.beforeLeave(previous, next, settle); }
                catch (error) { settle(false); diagnostics("SYSTEM_LEAVE_FAILED", String(error.message || error)); }
            } else settle(true);
            return accepted;
        }

        function route(surfaceId, pageId, sourceElement) {
            var entry = catalog && catalog.getSystemSurface(surfaceId);
            var definition = entry && entry.definition;
            var pages = definition && definition.route && definition.route.pages;
            var page = pageId || (definition && definition.route && definition.route.defaultPage) || "root";
            if (!entry) { diagnostics("SYSTEM_SURFACE_UNKNOWN", surfaceId); return null; }
            if (pages && pages.indexOf(page) < 0) { diagnostics("SYSTEM_PAGE_UNKNOWN", surfaceId + ":" + page); return null; }
            return Object.freeze({ kind: "system", surfaceId: surfaceId, entryId: entry.id, pageId: page, sourceElement: sourceElement || null });
        }
        function open(surfaceId, pageId, sourceElement) {
            var next = route(surfaceId, pageId, sourceElement);
            if (!next) return false;
            return transition(next, "open");
        }
        function navigate(pageId) {
            var next;
            if (!active) return false;
            next = route(active.surfaceId, pageId, active.sourceElement);
            if (!next) return false;
            return transition(next, "navigate");
        }
        function back() {
            var definition;
            if (!active) return false;
            definition = catalog.getSystemSurface(active.surfaceId).definition;
            if (active.pageId !== definition.route.defaultPage) return navigate(definition.route.defaultPage);
            return close();
        }
        function close() {
            var previous = active;
            if (!previous) return false;
            return transition(null, "close");
        }
        return Object.freeze({ open: open, navigate: navigate, back: back, close: close, dispose: function () { disposed = true; pending = null; active = null; }, getActiveRoute: function () { return active; } });
    }
    return { create: create };
}));
