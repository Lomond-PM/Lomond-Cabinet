(function (root, factory) {
    "use strict";

    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProceduralCache = api;
    }
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
    "use strict";

    function normalizeLimit(limit) {
        var numeric = Number(limit);
        if (!isFinite(numeric) || isNaN(numeric) || numeric < 1) {
            return 1;
        }
        return Math.floor(numeric);
    }

    function normalizeRenderScale(value) {
        var numeric = Number(value);
        if (!isFinite(numeric) || isNaN(numeric) || numeric < 1) {
            numeric = 1;
        }
        return Math.max(1, Math.min(2, numeric));
    }

    function createLruCache(limit) {
        var normalizedLimit = normalizeLimit(limit);
        var store = {};
        var order = [];
        var hits = 0;
        var misses = 0;
        var evictions = 0;

        function touch(key) {
            var index = order.indexOf(key);
            if (index >= 0) {
                order.splice(index, 1);
            }
            order.push(key);
        }

        function prune() {
            var oldest;
            while (order.length > normalizedLimit) {
                oldest = order.shift();
                if (Object.prototype.hasOwnProperty.call(store, oldest)) {
                    delete store[oldest];
                    evictions += 1;
                }
            }
        }

        return {
            get: function (key) {
                if (Object.prototype.hasOwnProperty.call(store, key)) {
                    hits += 1;
                    touch(key);
                    return store[key];
                }
                misses += 1;
                return null;
            },
            set: function (key, value) {
                var isNew = !Object.prototype.hasOwnProperty.call(store, key);
                store[key] = value;
                touch(key);
                if (isNew) {
                    prune();
                }
                return value;
            },
            clear: function () {
                var i;
                for (i = 0; i < order.length; i++) {
                    delete store[order[i]];
                }
                order.length = 0;
                hits = 0;
                misses = 0;
                evictions = 0;
            },
            stats: function () {
                return {
                    size: order.length,
                    limit: normalizedLimit,
                    hits: hits,
                    misses: misses,
                    evictions: evictions
                };
            }
        };
    }

    return {
        createLruCache: createLruCache,
        normalizeRenderScale: normalizeRenderScale
    };
}));
