(function (global) {
    "use strict";

    function finiteRect(rect) {
        return rect && isFinite(rect.left) && isFinite(rect.top) && isFinite(rect.width) && isFinite(rect.height) && rect.width > 0 && rect.height > 0;
    }

    function snapshot(element, view, geometry) {
        var rect;
        var style;
        if (!element || typeof element.getBoundingClientRect !== "function" || !view || typeof view.getComputedStyle !== "function") return null;
        rect = geometry || element.getBoundingClientRect();
        if (!finiteRect(rect)) return null;
        style = view.getComputedStyle(element);
        return Object.freeze({
            element: element,
            geometry: Object.freeze({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }),
            radius: style.borderRadius,
            presentation: Object.freeze({ backgroundColor: style.backgroundColor, borderColor: style.borderColor, boxShadow: style.boxShadow })
        });
    }

    function frame(identity) {
        var geometry = identity.geometry;
        return {
            left: geometry.left + "px",
            top: geometry.top + "px",
            width: geometry.width + "px",
            height: geometry.height + "px",
            borderRadius: identity.radius,
            backgroundColor: identity.presentation.backgroundColor,
            borderColor: identity.presentation.borderColor,
            boxShadow: identity.presentation.boxShadow
        };
    }

    function geometryFrame(identity) {
        var geometry = identity.geometry;
        return {
            left: geometry.left + "px",
            top: geometry.top + "px",
            width: geometry.width + "px",
            height: geometry.height + "px",
            borderRadius: identity.radius
        };
    }

    function composite(frameIdentity, artworkElement, realDestination) {
        if (!frameIdentity || !artworkElement || !realDestination) return null;
        return Object.freeze({
            element: frameIdentity.element,
            geometry: frameIdentity.geometry,
            radius: frameIdentity.radius,
            framePresentation: frameIdentity.presentation,
            artworkProjection: artworkElement,
            realDestination: realDestination
        });
    }

    function compositeFrame(identity) {
        return frame({ geometry: identity.geometry, radius: identity.radius, presentation: identity.framePresentation });
    }

    function choreography(durations) {
        var expand = Math.max(1, durations.spatialMorphExpand);
        var contract = Math.max(1, durations.spatialMorphContract);
        var openStart = Math.max(0, Math.min(1, (expand - durations.viewContentEnter) / expand));
        var closeEnd = Math.max(0, Math.min(1, 1 - openStart));
        return Object.freeze({
            openContent: Object.freeze({ start: openStart, end: 1 }),
            closeContent: Object.freeze({ start: 0, end: closeEnd }),
            closeIdentity: Object.freeze({ recognitionStart: 0, recognitionEstablished: Math.max(closeEnd, Math.min(1, durations.spatialMorphIdentity / contract)), handoff: 1 })
        });
    }

    global.SurfaceIdentity = Object.freeze({ snapshot: snapshot, frame: frame, geometryFrame: geometryFrame, composite: composite, compositeFrame: compositeFrame, choreography: choreography });
}(window));
