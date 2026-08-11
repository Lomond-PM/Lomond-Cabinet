(function (global) {
    "use strict";

    var durations = Object.freeze({
        actionFeedback: 160,
        actionPress: 120,
        surfaceState: 160,
        structuralCollapse: 260,
        viewContentEnter: 180,
        viewContentExit: 120,
        spatialMorphExpand: 480,
        spatialMorphContract: 360,
        spatialMorphIdentity: 260,
        paletteEnter: 260,
        paletteExit: 160,
        dragSettle: 260
    });
    var easings = Object.freeze({
        actionFeedback: "cubic-bezier(0.22, 1, 0.36, 1)",
        actionPress: "cubic-bezier(0.2, 0, 0, 1)",
        surfaceState: "cubic-bezier(0.22, 1, 0.36, 1)",
        structuralCollapse: "cubic-bezier(0.16, 1, 0.3, 1)",
        viewContentEnter: "cubic-bezier(0.16, 1, 0.3, 1)",
        viewContentExit: "cubic-bezier(0.32, 0, 0.67, 0)",
        spatialMorphExpand: "cubic-bezier(0.16, 1, 0.3, 1)",
        spatialMorphContract: "cubic-bezier(0.32, 0, 0.67, 0)"
    });
    var majorViewRoles = Object.freeze({
        viewContentEnter: true,
        viewContentExit: true,
        spatialMorphExpand: true,
        spatialMorphContract: true,
        spatialMorphIdentity: true
    });

    function resolveDuration(role, majorViewScale) {
        var value = durations[role];
        var scale = majorViewRoles[role] ? Number(majorViewScale) : 1;
        if (typeof value !== "number") { throw new Error("UNKNOWN_MOTION_ROLE:" + role); }
        if (!isFinite(scale)) { scale = 1; }
        return Math.max(0, Math.round(value * scale));
    }

    function applyCss(root, majorViewScale) {
        if (!root || !root.style) { return; }
        root.style.setProperty("--motion-view-content-enter-duration", resolveDuration("viewContentEnter", majorViewScale) + "ms");
        root.style.setProperty("--motion-view-content-exit-duration", resolveDuration("viewContentExit", majorViewScale) + "ms");
    }

    global.MotionDefaults = Object.freeze({
        durations: durations,
        easings: easings,
        majorViewRoles: majorViewRoles,
        resolveDuration: resolveDuration,
        applyCss: applyCss
    });
}(window));
