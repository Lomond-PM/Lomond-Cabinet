#!/usr/bin/env node
"use strict";

/*
 * Developer Mode OFF -> Settings -> Back Home transition continuation regression.
 *
 * The original AE blocker: Developer Mode ON -> open Global Settings ->
 * toggle Developer Mode OFF -> Back Home. The Settings exit animation
 * completed but the Settings -> Home transition continuation never happened;
 * the panel stayed on a blank work-surface "transition carrier".
 *
 * ROOT CAUSE: toggling Developer Mode OFF re-renders the Home tool grid via
 * renderDynamicToolHome(). Every home entry — including the Settings gear,
 * which the catalog marks homeOwnership:"dynamic" — is torn down and rebuilt.
 * The captured ActiveSettingsSourceElement (Settings gear) therefore becomes a
 * DETACHED node. On Back, closeSettingsPanel() used that stale reference as the
 * destination source, so getHomeToolIconRect() returned a zero rect,
 * SurfaceIdentity.snapshot()/composite() returned null, and closeSettingsPanel()
 * aborted (identityOverlay.style / closeIdentityKeyframes null-deref) BEFORE
 * scheduling the transition gate — so finishCloseSettingsTransition() never ran
 * and the app froze on the empty carrier.
 *
 * This suite locks the contract: the Settings -> Home continuation must ALWAYS
 * reach a single Home destination commit, even when the captured source is stale
 * or the destination identity is uncomputable — it must never silently abort the
 * transition after Settings exit begins. Static source-contract assertions are
 * used (the transition needs the browser Web Animations API, so main.js cannot be
 * executed under Node); they pin the correct ownership seam and forbid the Back
 * button hacks (forced renderHome / setTimeout / transition disable).
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "client/js/main.js"), "utf8");
const close = main.slice(main.indexOf("function closeSettingsPanel"), main.indexOf("function bindEvents"));

// A. Settings close must refresh a stale source reference (Home re-render detaches it).
assert.ok(/source = ActiveSettingsSourceElement;[\s\S]*document\.documentElement\.contains\(source\)[\s\S]*HomeLayoutManager\.getButtonByToolId\("settings"\)/.test(close),
    "closeSettingsPanel re-resolves the source when the captured Settings gear is no longer in the document");
assert.ok(/ActiveSettingsSourceElement = source;/.test(close), "closeSettingsPanel refreshes the live source reference");

// B. No live source -> the transition still commits Home (does not abort on a null identity).
assert.ok(/if \(!source\) \{[\s\S]*finishCloseSettingsTransition\(\);[\s\S]*return;/.test(close),
    "no live source falls back to the formal Home commit continuation");

// C. Uncomputable destination identity -> commit Home instead of aborting (this was the stale/detached source case).
assert.ok(/if \(!sourceIdentity \|\| !destinationIdentity\) \{[\s\S]*finishCloseSettingsTransition\(\);[\s\S]*return;/.test(close),
    "uncomputable destination identity falls back to the formal Home commit continuation");
assert.ok(/if \(destinationIdentity\) \{[\s\S]*window\.SurfaceIdentity\.composite\(destinationIdentity/.test(close),
    "destination identity is only composited when a valid snapshot was produced");

// D. The close identity overlay is only accessed when it was actually created (no null-deref abort).
assert.ok(/if \(identityOverlay\) \{[\s\S]*mountCloseIdentityLayer\(identityOverlay\)[\s\S]*identityOverlay\.style\.opacity = "0";/.test(close),
    "close identity overlay is guarded against a null identity source");

// E. A VALID close still runs the real Surface Transition gate and its completion is the Home commit.
assert.ok(/beginSpatialSurfaceMorph\("system:view", backdrop \? 3 : 2, function \(\) \{[\s\S]*finishCloseSettingsTransition\(\);/.test(close),
    "valid Settings close schedules the real spatial-morph gate committing Home");
assert.ok(/getHomeToolIconRect\(source\)/.test(close), "destination geometry is drawn from the live resolved source");

// F. finishCloseSettingsTransition is the single formal Home destination commit: it activates Home and releases the animation lock.
assert.ok(/function finishCloseSettingsTransition[\s\S]*home\.classList\.add\("is-active"\)[\s\S]*home\.classList\.remove\("is-opening"\)[\s\S]*view\.classList\.remove\("is-open", "is-morphing"\)[\s\S]*endAnimation\(\)/.test(main),
    "finishCloseSettingsTransition activates Home as the destination and releases the animation lock");

// G. No Back-button / forced-render hack in the Settings close continuation (fix is at the transition seam).
assert.ok(!/function closeSettingsPanel[\s\S]*setTimeout\(\s*renderHome|renderHome\(\);[\s\S]*function bindEvents/.test(main),
    "Settings close does not patch Home via a forced/timed render");

// H. Home commit does not depend on activeToolId, so a stale developer-only active tool cannot block Home.
assert.ok(!/function finishCloseSettingsTransition[\s\S]{0,600}activeToolId/.test(main),
    "finishCloseSettingsTransition commits Home without requiring a valid activeToolId");

// I. Control path preserved: closeSettingsPanel uses the resolved source for the identity morph (no behavior change when source is live).
assert.ok(/snapshotSurfaceIdentity\(destinationElement, sourceRect\)/.test(close), "source identity is still snapshotted for the morph");

console.log("Developer Mode -> Settings -> Home transition continuation regression tests passed.");
