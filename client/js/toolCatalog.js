(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ToolCatalog = api;
    }
}(typeof window !== "undefined" ? window : this, function () {
    "use strict";

    function freeze(value) {
        return typeof Object.freeze === "function" ? Object.freeze(value) : value;
    }

    function validId(value) {
        return typeof value === "string" && value.replace(/^\s+|\s+$/g, "") === value && value.length > 0;
    }

    function isArray(value) {
        return Object.prototype.toString.call(value) === "[object Array]";
    }

    function createEntry(kind, definition, homeOwnership) {
        return freeze({
            id: definition.id,
            kind: kind,
            definition: definition,
            homeOwnership: homeOwnership || "none"
        });
    }

    function createCatalog() {
        var registry = {};
        var registryOrder = [];
        var legacy = {};
        var legacyOrder = [];
        var systems = {};
        var systemOrder = [];
        var compatibilityMetadata = {};
        var staticHome = {};
        var staticHomeOrder = [];
        var diagnostics = [];

        function diagnose(code, id) {
            diagnostics[diagnostics.length] = freeze({ code: code, id: String(id || "") });
        }

        function register(target, order, kind, definition) {
            var id = definition && definition.id;
            if (!validId(id)) {
                diagnose("CATALOG_ID_INVALID", id);
                return false;
            }
            if (Object.prototype.hasOwnProperty.call(target, id)) {
                diagnose("CATALOG_ID_DUPLICATE", id);
                return false;
            }
            target[id] = createEntry(kind, definition, "none");
            order[order.length] = id;
            return true;
        }

        function isDeveloperDefinition(definition) {
            return !!definition && (definition.developerOnly === true || definition.debugOnly === true || definition.category === "debug");
        }

        function setRegistryTools(tools, order) {
            var next = {};
            var nextOrder = [];
            var list = isArray(tools) ? tools : null;
            var ids = isArray(order) ? order.slice(0) : [];
            var i;
            var definition;
            var id;

            if (list) {
                ids = [];
                for (i = 0; i < list.length; i++) {
                    definition = list[i];
                    id = definition && definition.id;
                    if (!validId(id) || Object.prototype.hasOwnProperty.call(next, id)) {
                        diagnose(!validId(id) ? "REGISTRY_ID_INVALID" : "REGISTRY_ID_DUPLICATE", id);
                        return false;
                    }
                    next[id] = createEntry("registry", definition, staticHome[id] ? "static" : "dynamic");
                    ids[ids.length] = id;
                }
            } else {
                for (i = 0; i < ids.length; i++) {
                    id = ids[i];
                    definition = tools && tools[id];
                    if (!validId(id) || !definition || definition.id !== id || Object.prototype.hasOwnProperty.call(next, id)) {
                        diagnose(Object.prototype.hasOwnProperty.call(next, id) ? "REGISTRY_ID_DUPLICATE" : "REGISTRY_ID_INVALID", id);
                        return false;
                    }
                    next[id] = createEntry("registry", definition, staticHome[id] ? "static" : "dynamic");
                }
            }
            if (!ids.length) {
                diagnose("REGISTRY_EMPTY", "");
                return false;
            }
            for (i = 0; i < ids.length; i++) {
                nextOrder[nextOrder.length] = ids[i];
            }
            registry = next;
            registryOrder = nextOrder;
            return true;
        }

        function registerStaticHomeEntry(id) {
            if (!validId(id)) {
                diagnose("HOME_ID_INVALID", id);
                return false;
            }
            if (staticHome[id]) {
                diagnose("HOME_ID_DUPLICATE", id);
                return false;
            }
            staticHome[id] = true;
            staticHomeOrder[staticHomeOrder.length] = id;
            return true;
        }

        function getRegistryTool(id) {
            return registry[id] || null;
        }

        function getLegacyFallback(id) {
            return legacy[id] || null;
        }

        function getSystemSurface(id) {
            return systems[id] || null;
        }

        function getTool(id) {
            return getRegistryTool(id) || getLegacyFallback(id);
        }

        function getDisplayMetadata(id) {
            var entry = getTool(id);
            return entry ? entry.definition : compatibilityMetadata[id] || null;
        }

        function getRoute(id) {
            var entry = getRegistryTool(id);
            if (entry) return freeze({ kind: "registry", entry: entry });
            entry = getLegacyFallback(id);
            if (entry) return freeze({ kind: "legacy", entry: entry });
            entry = getSystemSurface(id);
            if (entry) return freeze({ kind: "system", entry: entry });
            return freeze({ kind: "unknown", entry: null });
        }

        function getHomeEntries(options) {
            options = options || {};
            var developerMode = options.developerMode === true;
            var entries = [];
            var seen = {};
            var i;
            var id;
            var entry;

            function append(candidate, ownership) {
                if (!candidate || seen[candidate.id] || candidate.definition.hidden === true || (!developerMode && isDeveloperDefinition(candidate.definition))) return;
                seen[candidate.id] = true;
                entries[entries.length] = freeze({ id: candidate.id, kind: candidate.kind, definition: candidate.definition, homeOwnership: ownership });
            }

            for (i = 0; i < staticHomeOrder.length; i++) {
                id = staticHomeOrder[i];
                entry = getTool(id);
                if (entry) append(entry, entry.kind === "legacy" ? "legacy" : "static");
            }
            for (i = 0; i < registryOrder.length; i++) {
                id = registryOrder[i];
                append(registry[id], staticHome[id] ? "static" : "dynamic");
            }
            for (i = 0; i < legacyOrder.length; i++) {
                id = legacyOrder[i];
                if (!registry[id]) append(legacy[id], staticHome[id] ? "legacy" : "legacy");
            }
            return applyHomeOrder(entries, options.homeOrder || []);
        }

        function applyHomeOrder(entries, order) {
            var byId = {};
            var result = [];
            var i;
            var id;
            for (i = 0; i < entries.length; i++) {
                if (!byId[entries[i].id]) byId[entries[i].id] = entries[i];
            }
            for (i = 0; i < order.length; i++) {
                id = order[i];
                if (byId[id]) {
                    result[result.length] = byId[id];
                    delete byId[id];
                }
            }
            for (i = 0; i < entries.length; i++) {
                id = entries[i].id;
                if (byId[id]) {
                    result[result.length] = byId[id];
                    delete byId[id];
                }
            }
            return freeze(result);
        }

        function getSnapshot() {
            function describe(entry) {
                return freeze({ id: entry.id, kind: entry.kind, homeOwnership: entry.homeOwnership });
            }
            return freeze({
                registryTools: freeze(registryOrder.map(function (id) { return describe(registry[id]); })),
                legacyFallbacks: freeze(legacyOrder.map(function (id) { return describe(legacy[id]); })),
                systemSurfaces: freeze(systemOrder.map(function (id) { return describe(systems[id]); })),
                staticHomeIds: freeze(staticHomeOrder.slice(0)),
                diagnostics: freeze(diagnostics.slice(0))
            });
        }

        return freeze({
            setRegistryTools: setRegistryTools,
            registerLegacyFallback: function (definition) { return register(legacy, legacyOrder, "legacy", definition); },
            registerSystemSurface: function (definition) { return register(systems, systemOrder, "system", definition); },
            registerRegistryCompatibilityMetadata: function (definition) {
                if (!definition || !validId(definition.id) || compatibilityMetadata[definition.id]) {
                    diagnose("COMPATIBILITY_METADATA_INVALID", definition && definition.id);
                    return false;
                }
                compatibilityMetadata[definition.id] = definition;
                return true;
            },
            registerStaticHomeEntry: registerStaticHomeEntry,
            getTool: getTool,
            getRegistryTool: getRegistryTool,
            getLegacyFallback: getLegacyFallback,
            getSystemSurface: getSystemSurface,
            getDisplayMetadata: getDisplayMetadata,
            getRoute: getRoute,
            getHomeEntries: getHomeEntries,
            applyHomeOrder: applyHomeOrder,
            hasTool: function (id) { return !!getTool(id); },
            getSnapshot: getSnapshot
        });
    }

    return freeze({ createCatalog: createCatalog });
}));
