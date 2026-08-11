(function (global) {
    "use strict";

    var durations = Object.freeze({
        actionFeedback: 160,
        actionPress: 120,
        surfaceState: 160,
        structuralCollapse: 260,
        viewContentEnter: 180,
        viewContentExit: 120,
        homeHandoffRecede: 260,
        homeHandoffRestore: 260,
        spatialMorphExpand: 480,
        spatialMorphContract: 360,
        spatialMorphIdentity: 260,
        toolIdentityOpen: 360,
        paletteEnter: 260,
        paletteExit: 160,
        dragSettle: 260
    });
    var curveFamilies = Object.freeze({
        enter: "--motion-curve-enter",
        exit: "--motion-curve-exit",
        standard: "--motion-curve-standard",
        press: "--motion-curve-press"
    });
    var roleCurveFamily = Object.freeze({
        actionFeedback: "standard",
        actionPress: "press",
        surfaceState: "standard",
        structuralCollapse: "enter",
        viewContentEnter: "enter",
        viewContentExit: "exit",
        homeHandoffRecede: "enter",
        homeHandoffRestore: "enter",
        spatialMorphExpand: "enter",
        spatialMorphContract: "exit",
        spatialMorphIdentity: "enter",
        toolIdentityOpen: "enter",
        paletteEnter: "enter",
        paletteExit: "exit",
        dragSettle: "enter"
    });
    var majorViewRoles = Object.freeze({
        viewContentEnter: true,
        viewContentExit: true,
        homeHandoffRecede: true,
        homeHandoffRestore: true,
        spatialMorphExpand: true,
        spatialMorphContract: true,
        spatialMorphIdentity: true,
        toolIdentityOpen: true
    });

    function resolveDuration(role, majorViewScale) {
        var value = durations[role];
        var scale = majorViewRoles[role] ? Number(majorViewScale) : 1;
        if (typeof value !== "number") { throw new Error("UNKNOWN_MOTION_ROLE:" + role); }
        if (!isFinite(scale)) { scale = 1; }
        return Math.max(0, Math.round(value * scale));
    }

    function resolveEasing(role, root) {
        var family = roleCurveFamily[role];
        var propertyName = curveFamilies[family];
        var view = root && root.ownerDocument && root.ownerDocument.defaultView || global;
        var value;
        var match;
        if (!family || !propertyName) { throw new Error("UNKNOWN_MOTION_CURVE_ROLE:" + role); }
        if (!root || !view || typeof view.getComputedStyle !== "function") { throw new Error("MOTION_CURVE_ROOT_UNAVAILABLE:" + role); }
        value = String(view.getComputedStyle(root).getPropertyValue(propertyName) || "").replace(/^\s+|\s+$/g, "");
        match = /^cubic-bezier\(\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*\)$/i.exec(value);
        if (!match || Number(match[1]) < 0 || Number(match[1]) > 1 || Number(match[3]) < 0 || Number(match[3]) > 1) {
            throw new Error("INVALID_MOTION_CURVE:" + role);
        }
        return value;
    }

    function applyCss(root, majorViewScale) {
        if (!root || !root.style) { return; }
        root.style.setProperty("--motion-view-content-enter-duration", resolveDuration("viewContentEnter", majorViewScale) + "ms");
        root.style.setProperty("--motion-view-content-exit-duration", resolveDuration("viewContentExit", majorViewScale) + "ms");
        root.style.setProperty("--motion-home-recede-duration", resolveDuration("homeHandoffRecede", majorViewScale) + "ms");
        root.style.setProperty("--motion-home-restore-duration", resolveDuration("homeHandoffRestore", majorViewScale) + "ms");
    }

    global.MotionDefaults = Object.freeze({
        durations: durations,
        curveFamilies: curveFamilies,
        roleCurveFamily: roleCurveFamily,
        majorViewRoles: majorViewRoles,
        resolveDuration: resolveDuration,
        resolveEasing: resolveEasing,
        applyCss: applyCss
    });
}(window));
