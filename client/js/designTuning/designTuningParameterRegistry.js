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
        { id: "motion.duration.actionFeedback", type: "durationMs", domain: "motion", motionRole: "actionFeedback" },
        { id: "motion.duration.actionPress", type: "durationMs", domain: "motion", motionRole: "actionPress" },
        { id: "motion.duration.surfaceState", type: "durationMs", domain: "motion", motionRole: "surfaceState" },
        { id: "motion.duration.structuralCollapse", type: "durationMs", domain: "motion", motionRole: "structuralCollapse" },
        { id: "motion.duration.homeHandoffRecede", type: "durationMs", domain: "motion", motionRole: "homeHandoffRecede" },
        { id: "motion.duration.homeHandoffRestore", type: "durationMs", domain: "motion", motionRole: "homeHandoffRestore" },
        { id: "motion.duration.spatialIdentity", type: "durationMs", domain: "motion", motionRole: "spatialMorphIdentity" },
        { id: "motion.duration.toolIdentityOpen", type: "durationMs", domain: "motion", motionRole: "toolIdentityOpen" },
        { id: "motion.duration.paletteEnter", type: "durationMs", domain: "motion", motionRole: "paletteEnter" },
        { id: "motion.duration.paletteExit", type: "durationMs", domain: "motion", motionRole: "paletteExit" },
        { id: "motion.duration.dragSettle", type: "durationMs", domain: "motion", motionRole: "dragSettle" },
        { id: "spacing.surface.edge", type: "lengthPx", domain: "spacing", group: "surface", cssProperty: "--space-surface-edge", validity: { min: 0 }, editing: { trackMin: 8, trackMax: 36, step: 1, unit: "px" } },
        { id: "spacing.card.inset", type: "lengthPx", domain: "spacing", group: "surface", cssProperty: "--space-card-inset", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 28, step: 1, unit: "px" } },
        { id: "spacing.section.stack", type: "lengthPx", domain: "spacing", group: "section", cssProperty: "--space-section-stack", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 28, step: 1, unit: "px" } },
        { id: "spacing.section.headerContent", type: "lengthPx", domain: "spacing", group: "section", cssProperty: "--space-section-header-content", validity: { min: 0 }, editing: { trackMin: 2, trackMax: 24, step: 1, unit: "px" } },
        { id: "spacing.field.copy", type: "lengthPx", domain: "spacing", group: "field", cssProperty: "--space-field-copy", validity: { min: 0 }, editing: { trackMin: 0, trackMax: 12, step: 1, unit: "px" } },
        { id: "spacing.field.block", type: "lengthPx", domain: "spacing", group: "field", cssProperty: "--space-field-block", validity: { min: 0 }, editing: { trackMin: 0, trackMax: 20, step: 1, unit: "px" } },
        { id: "spacing.control.inline", type: "lengthPx", domain: "spacing", group: "control", cssProperty: "--space-inline-control", validity: { min: 0 }, editing: { trackMin: 2, trackMax: 20, step: 1, unit: "px" } },
        { id: "spacing.settings.fieldControl", type: "lengthPx", domain: "spacing", group: "settings", cssProperty: "--space-settings-field-control", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 28, step: 1, unit: "px" } },
        { id: "spacing.registry.cardInset", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-card-inset", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 30, step: 1, unit: "px" } },
        { id: "spacing.registry.introContent", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-intro-content", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 30, step: 1, unit: "px" } },
        { id: "spacing.registry.sectionHeaderContent", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-section-header-content", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 30, step: 1, unit: "px" } },
        { id: "spacing.registry.sectionCopy", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-section-copy", validity: { min: 0 }, editing: { trackMin: 0, trackMax: 16, step: 1, unit: "px" } },
        { id: "spacing.registry.fieldCopy", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-field-copy", validity: { min: 0 }, editing: { trackMin: 0, trackMax: 16, step: 1, unit: "px" } },
        { id: "spacing.registry.fieldControl", type: "lengthPx", domain: "spacing", group: "registry", cssProperty: "--space-registry-field-control", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 30, step: 1, unit: "px" } },
        { id: "spacing.palette.fieldControl", type: "lengthPx", domain: "spacing", group: "palette", cssProperty: "--space-palette-field-control", validity: { min: 0 }, editing: { trackMin: 2, trackMax: 24, step: 1, unit: "px" } },
        { id: "spacing.home.toolGrid", type: "lengthPx", domain: "spacing", group: "home", cssProperty: "--space-home-tool-grid", validity: { min: 0 }, editing: { trackMin: 6, trackMax: 32, step: 1, unit: "px" } },
        { id: "spacing.home.majorStack", type: "lengthPx", domain: "spacing", group: "home", cssProperty: "--space-home-major-stack", validity: { min: 0 }, editing: { trackMin: 6, trackMax: 32, step: 1, unit: "px" } },
        { id: "spacing.home.cardTitle", type: "lengthPx", domain: "spacing", group: "home", cssProperty: "--space-home-card-title", validity: { min: 0 }, editing: { trackMin: 2, trackMax: 24, step: 1, unit: "px" } },
        { id: "radius.primaryWorkSurface", type: "lengthPx", domain: "radius", group: "surface", cssProperty: "--radius-primary-work-surface", validity: { min: 0 }, editing: { trackMin: 0, trackMax: 32, step: 1, unit: "px" } },
        { id: "radius.nestedSurface", type: "lengthPx", domain: "radius", group: "surface", cssProperty: "--radius-nested-surface", validity: { min: 0 }, editing: { trackMin: 4, trackMax: 28, step: 1, unit: "px" } },
        { id: "radius.editableControl", type: "lengthPx", domain: "radius", group: "control", cssProperty: "--radius-editable-control", validity: { min: 0 }, editing: { trackMin: 2, trackMax: 20, step: 1, unit: "px" } },
        { id: "radius.sectionCard", type: "lengthPx", domain: "radius", group: "identity", cssProperty: "--radius-section-card", protection: "surface-transition" },
        { id: "radius.homeTile", type: "lengthPx", domain: "radius", group: "identity", cssProperty: "--radius-home-tile", protection: "surface-transition" },
        { id: "radius.homeIcon", type: "percentage", domain: "radius", group: "identity", cssProperty: "--radius-home-icon", protection: "surface-transition" },
        { id: "geometry.control.height", type: "lengthPx", domain: "controls", group: "field", cssProperty: "--control-height", validity: { min: 0 }, editing: { trackMin: 22, trackMax: 48, step: 1, unit: "px" } },
        { id: "geometry.button.height", type: "lengthPx", domain: "controls", group: "button", cssProperty: "--button-height", validity: { min: 0 }, editing: { trackMin: 28, trackMax: 56, step: 1, unit: "px" } },
        { id: "geometry.button.horizontalPadding", type: "lengthPx", domain: "controls", group: "button", cssProperty: "--button-pad-x", validity: { min: 0 }, editing: { trackMin: 6, trackMax: 28, step: 1, unit: "px" } },
        { id: "componentOptics.sliderThumbShadow", type: "shadow", domain: "controls", group: "optics", cssProperty: "--slider-thumb-optical-shadow", presentation: { labelKey: "settings.designTuning.parameter.componentOptics.sliderThumbShadow", descriptionKey: "settings.designTuning.parameter.componentOptics.sliderThumbShadow.description" } },
        { id: "componentOptics.switchThumbShadow", type: "shadow", domain: "controls", group: "optics", cssProperty: "--switch-thumb-optical-shadow", presentation: { labelKey: "settings.designTuning.parameter.componentOptics.switchThumbShadow", descriptionKey: "settings.designTuning.parameter.componentOptics.switchThumbShadow.description" } },
        { id: "elevation.surfaceShell", type: "shadow", domain: "elevation", group: "surface", cssProperty: "--elevation-surface-shell", presentation: { labelKey: "settings.designTuning.parameter.elevation.surfaceShell", descriptionKey: "settings.designTuning.parameter.elevation.surfaceShell.description" } },
        { id: "elevation.informationSurface", type: "shadow", domain: "elevation", group: "surface", cssProperty: "--elevation-information-surface", presentation: { labelKey: "settings.designTuning.parameter.elevation.informationSurface", descriptionKey: "settings.designTuning.parameter.elevation.informationSurface.description" } },
        { id: "elevation.primaryAction", type: "shadow", domain: "elevation", group: "action", cssProperty: "--elevation-primary-action", presentation: { labelKey: "settings.designTuning.parameter.elevation.primaryAction", descriptionKey: "settings.designTuning.parameter.elevation.primaryAction.description" } },
        { id: "elevation.utilityAction", type: "shadow", domain: "elevation", group: "action", cssProperty: "--elevation-utility-action", presentation: { labelKey: "settings.designTuning.parameter.elevation.utilityAction", descriptionKey: "settings.designTuning.parameter.elevation.utilityAction.description" } },
        { id: "elevation.floatingSurface", type: "shadow", domain: "elevation", group: "floating", cssProperty: "--elevation-floating-surface", presentation: { labelKey: "settings.designTuning.parameter.elevation.floatingSurface", descriptionKey: "settings.designTuning.parameter.elevation.floatingSurface.description" } },
        { id: "elevation.floatingPicker", type: "shadow", domain: "elevation", group: "floating", cssProperty: "--elevation-floating-picker", presentation: { labelKey: "settings.designTuning.parameter.elevation.floatingPicker", descriptionKey: "settings.designTuning.parameter.elevation.floatingPicker.description" } },
        { id: "elevation.actionContainer", type: "shadow", domain: "elevation", group: "action", cssProperty: "--elevation-action-container", presentation: { labelKey: "settings.designTuning.parameter.elevation.actionContainer", descriptionKey: "settings.designTuning.parameter.elevation.actionContainer.description" } }
        ,{ id: "text.secondary", type: "colorAlpha", domain: "text", group: "text", cssProperty: "--text-secondary" }
        ,{ id: "text.tertiary", type: "colorAlpha", domain: "text", group: "text", cssProperty: "--text-tertiary" }
        ,{ id: "surface.field", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--field-surface" }
        ,{ id: "surface.registryOption", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--registry-option-surface" }
        ,{ id: "surface.conversation", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--surface-conversation" }
        ,{ id: "surface.utilityChrome", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--surface-utility-chrome" }
        ,{ id: "surface.utilityAction", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--surface-utility-action" }
        ,{ id: "surface.neutralAction", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--action-neutral-surface" }
        ,{ id: "surface.dangerAction", type: "colorAlpha", domain: "surface", group: "surface", cssProperty: "--danger-surface" }
        ,{ id: "border.separator", type: "colorAlpha", domain: "border", group: "border", cssProperty: "--separator" }
        ,{ id: "border.panel", type: "colorAlpha", domain: "border", group: "border", cssProperty: "--panel-border" }
        ,{ id: "border.input", type: "colorAlpha", domain: "border", group: "border", cssProperty: "--input-border" }
    ];
    var coverage = [
        { id: "appearance.base.accent", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Existing top-level Theme control; not a centralized calibration mirror." },
        { id: "appearance.base.canvas", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Existing top-level Background control; not a centralized calibration mirror." },
        { id: "appearance.layout.scale", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Existing dedicated UI Scale control." },
        { id: "appearance.motion.speed", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Existing dedicated Motion Speed control." },
        { id: "border.width", disposition: "UNSUPPORTED_WITH_REASON", reason: "No independent stable semantic border-width authority exists." },
        { id: "elevation.registryPreviewProminence", disposition: "UNSUPPORTED_WITH_REASON", reason: "Canonical shadow uses UI-scale calc() components and cannot be safely round-tripped by the finite single-layer ShadowField grammar." },
        { id: "appearance.action.primary.foreground", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Internal derived contrast authority is not user-adjustable in Appearance." },
        { id: "radius.palettePreview", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "radius.sectionCard", reason: "Forwarding alias follows section-card identity radius." },
        { id: "radius.registryOption", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "radius.nestedSurface", reason: "Forwarding alias follows nested surface radius." },
        { id: "radius.paletteLibraryItem", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "radius.nestedSurface", reason: "Forwarding alias follows nested surface radius." },
        { id: "radius.paletteJsonSection", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "radius.nestedSurface", reason: "Forwarding alias follows nested surface radius." },
        { id: "text.muted", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "text.tertiary", reason: "Forwarding alias follows tertiary text." },
        { id: "border.default", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "border.panel", reason: "Forwarding alias follows panel border." },
        { id: "border.subtle", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "border.separator", reason: "Forwarding alias follows separator." },
        { id: "surface.canvas", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "appearance.base.canvas", reason: "Projection target of the existing top-level Background authority." },
        { id: "spacing.settings.sectionStack", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.section.stack", reason: "Settings forwarding alias." },
        { id: "spacing.settings.sectionHeaderContent", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.section.headerContent", reason: "Settings forwarding alias." },
        { id: "spacing.settings.sectionCopy", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.field.copy", reason: "Settings forwarding alias." },
        { id: "spacing.settings.fieldCopy", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.field.copy", reason: "Settings forwarding alias." },
        { id: "spacing.settings.fieldBlock", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.field.block", reason: "Settings forwarding alias." },
        { id: "spacing.registry.panelStack", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.section.stack", reason: "Registry forwarding alias." },
        { id: "spacing.registry.fieldBlock", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.field.block", reason: "Registry forwarding alias." },
        { id: "spacing.registry.actionStack", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "spacing.registry.fieldControl", reason: "Registry forwarding alias." },
        { id: "radius.pill", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Fixed pill identity invariant rather than a calibratable radius scale role." },
        { id: "typography.nonSizeRoles", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Font family, weight, line-height and letter-spacing remain role contracts; only registered Appearance size multipliers are calibratable." },
        { id: "procedural.appearance", disposition: "INTENTIONALLY_NOT_TUNABLE", reason: "Owned by the Procedural Appearance domain and its dedicated Lab." },
        { id: "vela.domainPresentation", disposition: "INTENTIONALLY_NOT_TUNABLE", derivedFrom: "surface.conversation", reason: "Vela-specific state presentation remains outside shared calibration; its reusable conversation surface delegates to the shared authority." }
    ];
    var appearanceMirrors = ["surface.panel", "text.primary", "select.trigger.surface", "select.menu.surface", "typography.title.size", "typography.sectionTitle.size", "typography.fieldLabel.size", "typography.body.size", "typography.supporting.size", "typography.code.size", "interaction.focus.ring", "interaction.focus.border", "interaction.hover.border", "interaction.hover.surface", "interaction.selected.surface", "interaction.selected.foreground", "interaction.checked.surface", "action.primary.surface", "action.primary.hoverSurface", "selection.indicator.surface"];
    var byId = {};
    var i;
    function clone(value) { return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value; }
    function validBezier(value) {
        if (CoreUI && typeof CoreUI.isValidBezierValue === "function") return CoreUI.isValidBezierValue(value);
        return !!value && [value.x1, value.y1, value.x2, value.y2].every(function (part) { return typeof part === "number" && isFinite(part); }) && value.x1 >= 0 && value.x1 <= 1 && value.x2 >= 0 && value.x2 <= 1;
    }
    for (i = 0; i < definitions.length; i++) {
        if (definitions[i].type === "durationMs" && !definitions[i].editing) { definitions[i].validity = { min: 40, max: 1200 }; definitions[i].editing = { trackMin: 40, trackMax: 1200, step: 10, unit: "ms" }; }
        definitions[i].consumerScope = /^(spacing\.(settings|registry|palette|home)\.)/.test(definitions[i].id) ? "domain-specific" : "global-common";
        definitions[i].previewGroup = definitions[i].domain === "motion" ? "motion" : (/^spacing\.settings\./.test(definitions[i].id) ? "settings" : (/^spacing\.home\./.test(definitions[i].id) ? "home" : (/^spacing\.palette\./.test(definitions[i].id) ? "palette" : (definitions[i].domain === "elevation" || definitions[i].id === "radius.nestedSurface" ? "surfaces" : "controls"))));
        definitions[i].previewTargets = definitions[i].consumerScope === "domain-specific" ? [definitions[i].id.split(".")[1]] : ["settings", "registry", "controlLab"];
        definitions[i].calibrationChromeIsolation = /^(geometry\.(control|button)\.|radius\.editableControl$|spacing\.(control\.inline|field\.|settings\.fieldControl))/.test(definitions[i].id);
        definitions[i].canonicalSource = definitions[i].cssProperty ? "computed-style" : "motion-defaults";
        definitions[i].projection = definitions[i].cssProperty ? (definitions[i].protection ? "read-only" : "root-semantic-property") : "motion-resolver";
        definitions[i].resetScope = definitions[i].domain;
        definitions[i].disposition = definitions[i].protection ? "PROTECTED" : "EDITABLE";
        definitions[i].reason = definitions[i].protection ? "Surface Transition identity handoff remains unresolved." : "";
        byId[definitions[i].id] = Object.freeze(definitions[i]);
        coverage.push(definitions[i]);
    }
    function validColorAlpha(value) { return !!value && typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color) && typeof value.alpha === "number" && isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1; }
    for (i = 0; i < appearanceMirrors.length; i++) coverage.push(Object.freeze({ id: "appearance." + appearanceMirrors[i], appearanceId: appearanceMirrors[i], disposition: "MIRROR_EXISTING_AUTHORITY", canonicalSource: "appearance-parameter-registry", projection: "appearance-resolver", reason: "Calibration delegates preview, commit and reset to the existing Appearance authority." }));
    function validate(id, value) {
        var parameter = byId[id];
        var number;
        if (!parameter) return { valid: false };
        if (parameter.protection) return { valid: false };
        if (parameter.type === "cubicBezier") return validBezier(value) ? { valid: true, value: clone(value) } : { valid: false };
        if (parameter.type === "shadow") return CoreUI && CoreUI.isValidShadowValue(value) ? { valid: true, value: JSON.parse(JSON.stringify(value)) } : { valid: false };
        if (parameter.type === "colorAlpha") return validColorAlpha(value) ? { valid: true, value: CoreUI && CoreUI.normalizeColorAlphaValue ? CoreUI.normalizeColorAlphaValue(value, null) : { color: value.color.toLowerCase(), alpha: Number(value.alpha) } } : { valid: false };
        number = Number(value);
        if (typeof value === "boolean" || !isFinite(number) || number < 0) return { valid: false };
        if (parameter.validity && ((typeof parameter.validity.min === "number" && number < parameter.validity.min) || (typeof parameter.validity.max === "number" && number > parameter.validity.max))) return { valid: false };
        return { valid: true, value: number };
    }
    return Object.freeze({ list: function () { return definitions.slice(0); }, coverage: function () { return coverage.slice(0); }, get: function (id) { return byId[id] || null; }, validate: validate, cloneValue: clone });
}));
