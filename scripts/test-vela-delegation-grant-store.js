#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const planning = require("../client/js/vela/velaPlanningContracts");
const moduleApi = require("../client/js/vela/velaDelegationGrantStore");

let assertions = 0;
let clock = 100;
let ids = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(fn, code, message) { assert.throws(fn, error => error && error.code === code, message); assertions += 1; }
function store() { return moduleApi.createDelegationGrantStore({ now() { return clock; }, idFactory() { ids += 1; return "grant_local_" + ids; } }); }
function spec(overrides) { return Object.assign({ capabilityFamily: "mutation", capabilityId: "set-opacity-v1", operationKind: "mutate", targetScope: { type: "selected-layer", property: "opacity" }, riskCeiling: "write", taskId: "task_1", expiresAt: 200, maxActions: 1, provenance: { source: "local-user", requestId: "request_1", issuedAt: 100 } }, overrides || {}); }

function browserSmoke() {
    const planningSource = fs.readFileSync(require.resolve("../client/js/vela/velaPlanningContracts"), "utf8");
    const source = fs.readFileSync(require.resolve("../client/js/vela/velaDelegationGrantStore"), "utf8");
    const sandbox = { Object, Error, Date, Map, WeakMap, Number, Boolean, String, Array, RegExp, JSON };
    sandbox.self = sandbox; sandbox.window = sandbox;
    vm.runInNewContext(planningSource, sandbox, { filename: "velaPlanningContracts.js" });
    vm.runInNewContext(source, sandbox, { filename: "velaDelegationGrantStore.js" });
    check(typeof sandbox.VelaDelegationGrantStore.createDelegationGrantStore === "function", "CEP-like browser registration works without loader wiring.");
}

function run() {
    const C = moduleApi.ERROR_CODES;
    browserSmoke();
    clock = 100;
    const empty = store();
    check(moduleApi.isTrustedDelegationGrantStore(empty), "Factory output carries module-private Store identity.");
    check(!moduleApi.isTrustedDelegationGrantStore({ getAuthorityView() { return {}; } }), "A caller-created Store facade is not trusted.");
    check(empty.listActive().length === 0, "A new store is empty.");

    const issued = empty.issue(spec());
    check(planning.isDelegationGrant(issued.grant) && issued.status === "active", "A valid canonical grant is issued active.");
    check(/^grant_local_/.test(issued.grant.grantId), "The store injects the local grant ID.");
    check(Object.isFrozen(issued) && Object.isFrozen(issued.grant) && Object.isFrozen(issued.grant.targetScope), "Public snapshots are deeply immutable.");
    assert.throws(() => { issued.remainingActions = 99; }); assertions += 1;
    check(empty.lookup(issued.grant.grantId).remainingActions === 1, "Caller mutation cannot affect internal state.");
    const authorityView = empty.getAuthorityView();
    check(Object.isFrozen(authorityView) && Object.isFrozen(authorityView.grants) && authorityView.grants[0].grant.grantId === issued.grant.grantId, "Read-only authority view is immutable and Store-derived.");
    expectCode(() => empty.issue(spec({ grantId: "forged" })), C.GRANT_STORE_INVALID_SPEC, "Caller grantId is rejected.");
    expectCode(() => empty.issue(spec({ trusted: true })), C.GRANT_STORE_INVALID_SPEC, "Caller trusted metadata is rejected.");
    expectCode(() => empty.issue(spec({ issuedBy: "model" })), C.GRANT_STORE_INVALID_SPEC, "Caller issuedBy metadata is rejected.");
    check(empty.lookup(issued.grant.grantId).grant.grantId === issued.grant.grantId, "Active lookup resolves store-owned state.");

    const revoked = empty.revoke(issued.grant.grantId);
    check(revoked.status === "revoked", "Revoke immediately terminalizes the grant.");
    check(empty.revoke(issued.grant.grantId).status === "revoked", "Repeated revoke is deterministic and idempotent.");
    expectCode(() => empty.lookup(issued.grant.grantId), C.GRANT_STORE_GRANT_REVOKED, "Revoked grants are absent from active lookup.");
    expectCode(() => empty.reserve(issued.grant.grantId), C.GRANT_STORE_GRANT_REVOKED, "A stale public snapshot cannot reserve revoked authority.");

    const expiring = empty.issue(spec({ expiresAt: 110 }));
    clock = 110;
    expectCode(() => empty.lookup(expiring.grant.grantId), C.GRANT_STORE_GRANT_EXPIRED, "Expiry is closed at the exact clock boundary.");
    check(empty.listActive().every(item => item.grant.grantId !== expiring.grant.grantId), "Expired grants are excluded from authority snapshots.");
    expectCode(() => empty.issue(spec({ expiresAt: 110 })), C.GRANT_STORE_GRANT_EXPIRED, "Already-expired grants cannot be issued.");

    clock = 100;
    const expiryReservationGrant = empty.issue(spec({ expiresAt: 105 }));
    const expiryReservation = empty.reserve(expiryReservationGrant.grant.grantId);
    clock = 105;
    expectCode(() => empty.consume(expiryReservation), C.GRANT_STORE_GRANT_EXPIRED, "A reservation cannot consume after grant expiry.");

    const zero = empty.issue(spec({ expiresAt: 200, maxActions: 0 }));
    expectCode(() => empty.reserve(zero.grant.grantId), C.GRANT_STORE_BUDGET_EXHAUSTED, "A zero budget cannot reserve.");

    const budget = empty.issue(spec({ expiresAt: 200, maxActions: 1 }));
    const reservationA = empty.reserve(budget.grant.grantId);
    check(empty.lookup(budget.grant.grantId).remainingActions === 0, "Reservation atomically removes availability.");
    expectCode(() => empty.reserve(budget.grant.grantId), C.GRANT_STORE_BUDGET_EXHAUSTED, "A competing reservation fails.");
    check(empty.release(reservationA).remainingActions === 1, "Release restores availability.");
    expectCode(() => empty.release(reservationA), C.GRANT_STORE_RESERVATION_SETTLED, "Double release cannot increase budget.");
    const reservationB = empty.reserve(budget.grant.grantId);
    const consumed = empty.consume(reservationB);
    check(consumed.consumedActions === 1 && consumed.remainingActions === 0, "Consume permanently reduces budget.");
    expectCode(() => empty.consume(reservationB), C.GRANT_STORE_RESERVATION_SETTLED, "Double consume is rejected.");
    expectCode(() => empty.release(reservationB), C.GRANT_STORE_RESERVATION_SETTLED, "A consumed reservation cannot be released.");
    expectCode(() => empty.reserve(budget.grant.grantId), C.GRANT_STORE_BUDGET_EXHAUSTED, "Consumed budget cannot become negative.");

    const revokedOutstanding = empty.issue(spec({ maxActions: 2 }));
    const revokedHandle = empty.reserve(revokedOutstanding.grant.grantId);
    empty.revoke(revokedOutstanding.grant.grantId);
    expectCode(() => empty.consume(revokedHandle), C.GRANT_STORE_GRANT_REVOKED, "Outstanding reservations cannot consume after revoke.");

    const resetStore = store();
    const resetGrant = resetStore.issue(spec());
    const resetHandle = resetStore.reserve(resetGrant.grant.grantId);
    resetStore.resetSession();
    expectCode(() => resetStore.consume(resetHandle), C.GRANT_STORE_STALE_RESERVATION, "Reset invalidates outstanding reservation handles.");
    check(resetStore.listActive().length === 0, "Reset clears all active grants.");
    check(resetStore.issue(spec()).status === "active", "Fresh grants may be issued after reset.");

    const suspendedStore = store();
    const suspendedGrant = suspendedStore.issue(spec());
    const suspendedHandle = suspendedStore.reserve(suspendedGrant.grant.grantId);
    suspendedStore.suspend();
    expectCode(() => suspendedStore.consume(suspendedHandle), C.GRANT_STORE_STALE_RESERVATION, "Suspend invalidates outstanding reservation handles.");
    check(suspendedStore.listActive().length === 0 && suspendedStore.issue(spec()).status === "active", "Suspend restores no old grants but permits a fresh authority epoch.");

    const disposedStore = store();
    const disposedGrant = disposedStore.issue(spec());
    const disposedHandle = disposedStore.reserve(disposedGrant.grant.grantId);
    check(disposedStore.dispose() === true && disposedStore.dispose() === false, "Dispose is permanent and idempotent.");
    expectCode(() => disposedStore.consume(disposedHandle), C.GRANT_STORE_DISPOSED, "Reservations cannot be used after dispose.");
    expectCode(() => disposedStore.issue(spec()), C.GRANT_STORE_DISPOSED, "Issue is blocked after dispose.");
    expectCode(() => disposedStore.listActive(), C.GRANT_STORE_DISPOSED, "Lookup is blocked after dispose.");

    const reload = store();
    check(reload.listActive().length === 0, "A new store proves reload has no persisted grants.");
    expectCode(() => reload.lookup(disposedGrant.grant.grantId), C.GRANT_STORE_UNKNOWN_GRANT, "A snapshot from another store has no authority.");
    expectCode(() => reload.consume({}), C.GRANT_STORE_INVALID_RESERVATION, "Caller-created reservation objects are rejected.");

    expectCode(() => reload.issue(null), C.GRANT_STORE_INVALID_SPEC, "Non-object specs are rejected.");
    expectCode(() => reload.issue(spec({ capabilityId: "bad" })), C.GRANT_STORE_INVALID_SPEC, "Malformed canonical contract input is rejected.");
    expectCode(() => moduleApi.createDelegationGrantStore({ now() { return NaN; } }).issue(spec()), C.GRANT_STORE_CLOCK_UNAVAILABLE, "Invalid trusted clocks fail closed.");

    clock = 100;
    const independent = store();
    const first = independent.issue(spec({ maxActions: 1 }));
    const second = independent.issue(spec({ capabilityId: "other-capability-v1", maxActions: 2 }));
    independent.consume(independent.reserve(first.grant.grantId));
    check(independent.lookup(second.grant.grantId).remainingActions === 2, "Multiple grants have independent budgets.");
    check(first.grant.grantId !== second.grant.grantId, "Grant IDs are unique within the store.");

    console.log("PASS Vela DelegationGrantStore: " + assertions + " assertions.");
}

run();
