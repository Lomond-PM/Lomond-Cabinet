"use strict";
// Actual panel owner/Surface/Session/Driver/Runtime composition; only Host and network are simulated.
const { prepare, loader, flush } = require("./vela-trajectory-harness");
const { fixture } = require("../test-vela-surface-controller");
function create(options = {}) {
    const load = loader(), bundles = [], associations = new Map();
    const ownership = load("velaConversationOwnership"), presentation = require("../../client/js/vela/velaPresentationModel").VelaPresentationModel;
    let view = null, elements = null, enabled = true;
    const composition = load("velaConversationComposition").createComposition({
        Ownership: ownership, PresentationModel: presentation, fillRandomValues: bytes => bytes.fill(7),
        getConfig: () => ({ endpoint: "http://127.0.0.1:1234", model: "m" }), isProviderEnabled: () => enabled,
        createOwner() { const h = prepare({ ...options, load, sharedState: bundles[0] && bundles[0].state }); bundles.push(h); return h.owner; },
        createRuntime(session) { return bundles.find(h => h.owner.getSessionRuntime() === session).runtime; },
        unbindSurface() { if (view) view.dispose(); view = null; },
        onSelectionChanged(record, association) {
            if (!association) return;
            associations.set(record, association);
            const dom = fixture(); dom.controller.dispose(); elements = dom.elements;
            view = require("../../client/js/vela/velaSurfaceController").VelaSurfaceController.create({
                surface: { getElementsForTest: () => elements }, sourcePort: association.sourcePort,
                provider: association.sourcePort.provider, confirmation: association.sourcePort.confirmation,
                authority: association.sourcePort.authority, presentation: association.presentation,
                agentProjection: association.sourcePort.agentProjection,
                PresentationModel: presentation,
                TranscriptView: require("../../client/js/vela/velaTranscriptView").VelaTranscriptView,
                ComposerView: require("../../client/js/vela/velaComposerView").VelaComposerView,
                ConfirmationView: require("../../client/js/vela/velaConfirmationView").VelaConfirmationView,
                ActivationPolicy: require("../../client/js/vela/velaActivationPolicy").VelaActivationPolicy,
                getConversationAvailability() { const active = composition.getActiveRecord(); return { busy: !!active, other: !!active && active !== composition.getSelected() }; },
                onExperimentalInvalidated() { enabled = false; composition.stopProviderActivity(); },
                onCancelActiveTask() { composition.cancelActiveObjective(); }, t: key => key
            });
            view.mount();
        }
    });
    composition.subscribe(() => { if (view) view.refreshConversationState(); });
    return { composition, bundles, associations, get view() { return view; }, get elements() { return elements; },
        enable() { enabled = true; composition.allowProviderRequests(); }, dispose() { composition.dispose(); } };
}
module.exports = { create, flush };
