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
            active = next;
            if (callbacks.open) callbacks.open(next);
            return true;
        }
        function navigate(pageId) {
            var next;
            if (!active) return false;
            next = route(active.surfaceId, pageId, active.sourceElement);
            if (!next) return false;
            active = next;
            if (callbacks.navigate) callbacks.navigate(next);
            return true;
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
            active = null;
            if (callbacks.close) callbacks.close(previous);
            return true;
        }
        return Object.freeze({ open: open, navigate: navigate, back: back, close: close, getActiveRoute: function () { return active; } });
    }
    return { create: create };
}));
