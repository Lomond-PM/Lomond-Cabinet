(function (root, factory) {
    "use strict";
    var api = Object.freeze(factory(root && root.CoreUI));
    if (root && root.document && !root.DesignTuningParameterRegistry) root.DesignTuningParameterRegistry = api;
    if ((!root || !root.document) && typeof module === "object" && module.exports) module.exports = api;
}(typeof self !== "undefined" ? self : this, function (CoreUI) {
    "use strict";
    var definitions = [
        { id: "motion.curve.enter", type: "cubicBezier", domain: "motion", family: "enter", cssProperty: "--motion-curve-enter" },
        { id: "motion.curve.exit", type: "cubicBezier", domain: "motion", family: "exit", cssProperty: "--motion-curve-exit" },
        { id: "motion.curve.standard", type: "cubicBezier", domain: "motion", family: "standard", cssProperty: "--motion-curve-standard" },
        { id: "motion.curve.press", type: "cubicBezier", domain: "motion", family: "press", cssProperty: "--motion-curve-press" },
        { id: "motion.duration.spatialExpand", type: "durationMs", domain: "motion", motionRole: "spatialMorphExpand" },
        { id: "motion.duration.spatialContract", type: "durationMs", domain: "motion", motionRole: "spatialMorphContract" },
        { id: "motion.duration.viewContentEnter", type: "durationMs", domain: "motion", motionRole: "viewContentEnter" },
        { id: "motion.duration.viewContentExit", type: "durationMs", domain: "motion", motionRole: "viewContentExit" },
        { id: "spacing.surface.edge", type: "lengthPx", domain: "spacing", group: "surface", cssProperty: "--space-surface-edge", editing: { min: 8, max: 36, step: 1, unit: "px" } },
        { id: "spacing.card.inset", type: "lengthPx", domain: "spacing", group: "surface", cssProperty: "--space-card-inset", editing: { min: 4, max: 28, step: 1, unit: "px" } },
        { id: "spacing.section.stack", type: "lengthPx", domain: "spacing", group: "section", cssProperty: "--space-section-stack", editing: { min: 4, max: 28, step: 1, unit: "px" } },
        { id: "spacing.section.headerContent", type: "lengthPx", domain: "spacing", group: "section", cssProperty: "--space-section-header-content", editing: { min: 2, max: 24, step: 1, unit: "px" } },
        { id: "spacing.field.copy", type: "lengthPx", domain: "spacing", group: "field", cssProperty: "--space-field-copy", editing: { min: 0, max: 12, step: 1, unit: "px" } },
        { id: "spacing.field.block", type: "lengthPx", domain: "spacing", group: "field", cssProperty: "--space-field-block", editing: { min: 0, max: 20, step: 1, unit: "px" } },
        { id: "spacing.control.inline", type: "lengthPx", domain: "spacing", group: "control", cssProperty: "--space-inline-control", editing: { min: 2, max: 20, step: 1, unit: "px" } },
        { id: "spacing.settings.fieldControl", type: "lengthPx", domain: "spacing", group: "settings", cssProperty: "--space-settings-field-control", editing: { min: 4, max: 28, step: 1, unit: "px" } },
        { id: "spacing.registry.cardInset", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-card-inset", editing: { min: 4, max: 30, step: 1, unit: "px" } },
        { id: "spacing.registry.fieldControl", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-field-control", editing: { min: 4, max: 30, step: 1, unit: "px" } },
        { id: "spacing.home.toolGrid", type: "lengthPx", domain: "spacing", group: "home", cssProperty: "--space-home-tool-grid", editing: { min: 6, max: 32, step: 1, unit: "px" } },
        { id: "spacing.home.majorStack", type: "lengthPx", domain: "spacing", group: "home", cssProperty: "--space-home-major-stack", editing: { min: 6, max: 32, step: 1, unit: "px" } },
        { id: "radius.nestedSurface", type: "lengthPx", domain: "radius", group: "surface", cssProperty: "--radius-nested-surface", editing: { min: 4, max: 28, step: 1, unit: "px" } },
        { id: "radius.editableControl", type: "lengthPx", domain: "radius", group: "control", cssProperty: "--radius-editable-control", editing: { min: 2, max: 20, step: 1, unit: "px" } },
        { id: "radius.sectionCard", type: "lengthPx", domain: "radius", group: "identity", cssProperty: "--radius-section-card", protection: "surface-transition" },
        { id: "radius.homeTile", type: "lengthPx", domain: "radius", group: "identity", cssProperty: "--radius-home-tile", protection: "surface-transition" },
        { id: "radius.homeIcon", type: "percentage", domain: "radius", group: "identity", cssProperty: "--radius-home-icon", protection: "surface-transition" },
        { id: "geometry.control.height", type: "lengthPx", domain: "controls", group: "field", cssProperty: "--control-height", editing: { min: 22, max: 48, step: 1, unit: "px" } },
        { id: "geometry.button.height", type: "lengthPx", domain: "controls", group: "button", cssProperty: "--button-height", editing: { min: 28, max: 56, step: 1, unit: "px" } },
        { id: "geometry.button.horizontalPadding", type: "lengthPx", domain: "controls", group: "button", cssProperty: "--button-pad-x", editing: { min: 6, max: 28, step: 1, unit: "px" } },
        { id: "elevation.surfaceShell", type: "shadow", domain: "elevation", group: "surface", cssProperty: "--elevation-surface-shell" },
        { id: "elevation.primaryAction", type: "shadow", domain: "elevation", group: "action", cssProperty: "--elevation-primary-action" },
        { id: "elevation.floatingSurface", type: "shadow", domain: "elevation", group: "floating", cssProperty: "--elevation-floating-surface" },
        { id: "elevation.floatingPicker", type: "shadow", domain: "elevation", group: "floating", cssProperty: "--elevation-floating-picker" },
        { id: "elevation.actionContainer", type: "shadow", domain: "elevation", group: "action", cssProperty: "--elevation-action-container" }
    ];
    var byId = {};
    var i;
    function clone(value) { return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value; }
    function validBezier(value) {
        if (CoreUI && typeof CoreUI.isValidBezierValue === "function") return CoreUI.isValidBezierValue(value);
        return !!value && [value.x1, value.y1, value.x2, value.y2].every(function (part) { return typeof part === "number" && isFinite(part); }) && value.x1 >= 0 && value.x1 <= 1 && value.x2 >= 0 && value.x2 <= 1;
    }
    for (i = 0; i < definitions.length; i++) {
        definitions[i].consumerScope = /^(spacing\.(settings|registry|home)\.)/.test(definitions[i].id) ? "domain-specific" : "global-common";
        definitions[i].previewGroup = definitions[i].domain === "motion" ? "motion" : (/^spacing\.settings\./.test(definitions[i].id) ? "settings" : (/^spacing\.home\./.test(definitions[i].id) ? "home" : (definitions[i].domain === "elevation" || definitions[i].id === "radius.nestedSurface" ? "surfaces" : "controls")));
        definitions[i].previewTargets = definitions[i].consumerScope === "domain-specific" ? [definitions[i].id.split(".")[1]] : ["settings", "registry", "controlLab"];
        definitions[i].calibrationChromeIsolation = /^(geometry\.(control|button)\.|radius\.editableControl$|spacing\.(control\.inline|field\.|settings\.fieldControl))/.test(definitions[i].id);
        definitions[i].canonicalSource = definitions[i].cssProperty ? "computed-style" : "motion-defaults";
        definitions[i].projection = definitions[i].cssProperty ? (definitions[i].protection ? "read-only" : "root-semantic-property") : "motion-resolver";
        definitions[i].resetScope = definitions[i].domain;
        byId[definitions[i].id] = Object.freeze(definitions[i]);
    }
    function validate(id, value) {
        var parameter = byId[id];
        var number;
        if (!parameter) return { valid: false };
        if (parameter.protection) return { valid: false };
        if (parameter.type === "cubicBezier") return validBezier(value) ? { valid: true, value: clone(value) } : { valid: false };
        if (parameter.type === "shadow") return CoreUI && CoreUI.isValidShadowValue(value) ? { valid: true, value: JSON.parse(JSON.stringify(value)) } : { valid: false };
        number = Number(value);
        if (typeof value === "boolean" || !isFinite(number) || number < 0) return { valid: false };
        if (parameter.editing && (number < parameter.editing.min || number > parameter.editing.max)) return { valid: false };
        return { valid: true, value: number };
    }
    return Object.freeze({ list: function () { return definitions.slice(0); }, get: function (id) { return byId[id] || null; }, validate: validate, cloneValue: clone });
}));
