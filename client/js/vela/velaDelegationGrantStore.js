(function (root, factory) {
    "use strict";

    var exported;
    if (root && root.self === root && (root["win" + "dow"] === root || !(typeof module === "object" && module.exports))) {
        exported = Object.freeze(factory(root.VelaPlanningContracts));
        if (Object.prototype.hasOwnProperty.call(root, "VelaDelegationGrantStore") || !Object.isExtensible(root)) { throw new Error("MODULE_BOOTSTRAP_CONFLICT"); }
        Object.defineProperty(root, "VelaDelegationGrantStore", { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) {
        module.exports = Object.freeze(factory(require("./velaPlanningContracts")));
    }
}(typeof self !== "undefined" ? self : this, function (planning) {
    "use strict";

    var MODULE_REVISION = "vela-delegation-grant-store-v1";
    var storeSerial = 0;
    var trustedStores = new WeakMap();
    var SPEC_KEYS = Object.freeze(["capabilityFamily", "capabilityId", "operationKind", "targetScope", "riskCeiling", "taskId", "expiresAt", "maxActions", "provenance"]);
    var ERROR_CODES = Object.freeze({
        GRANT_STORE_INVALID_SPEC: "GRANT_STORE_INVALID_SPEC",
        GRANT_STORE_CLOCK_UNAVAILABLE: "GRANT_STORE_CLOCK_UNAVAILABLE",
        GRANT_STORE_ID_COLLISION: "GRANT_STORE_ID_COLLISION",
        GRANT_STORE_UNKNOWN_GRANT: "GRANT_STORE_UNKNOWN_GRANT",
        GRANT_STORE_GRANT_REVOKED: "GRANT_STORE_GRANT_REVOKED",
        GRANT_STORE_GRANT_EXPIRED: "GRANT_STORE_GRANT_EXPIRED",
        GRANT_STORE_BUDGET_EXHAUSTED: "GRANT_STORE_BUDGET_EXHAUSTED",
        GRANT_STORE_INVALID_RESERVATION: "GRANT_STORE_INVALID_RESERVATION",
        GRANT_STORE_STALE_RESERVATION: "GRANT_STORE_STALE_RESERVATION",
        GRANT_STORE_RESERVATION_SETTLED: "GRANT_STORE_RESERVATION_SETTLED",
        GRANT_STORE_DISPOSED: "GRANT_STORE_DISPOSED"
    });

    function GrantStoreError(code, message) {
        this.name = "VelaDelegationGrantStoreError";
        this.code = code;
        this.message = message || code;
        if (Error.captureStackTrace) { Error.captureStackTrace(this, GrantStoreError); }
    }
    GrantStoreError.prototype = Object.create(Error.prototype);
    GrantStoreError.prototype.constructor = GrantStoreError;

    function fail(code, message) { throw new GrantStoreError(code, message); }
    function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
    function isPlainObject(value) { return Boolean(value && Object.prototype.toString.call(value) === "[object Object]" && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)); }

    function createDelegationGrantStore(options) {
        options = options || {};
        if (!planning || typeof planning.createDelegationGrant !== "function" || !isPlainObject(options)) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "DelegationGrantStore dependencies or options are invalid."); }
        Object.keys(options).forEach(function (key) { if (["now", "idFactory"].indexOf(key) === -1) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "DelegationGrantStore options contain an unknown field."); } });
        var now = hasOwn(options, "now") ? options.now : Date.now;
        var idFactory = hasOwn(options, "idFactory") ? options.idFactory : null;
        if (typeof now !== "function" || (idFactory !== null && typeof idFactory !== "function")) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "DelegationGrantStore clock or id factory is invalid."); }

        storeSerial += 1;
        var instanceId = storeSerial;
        var grantSerial = 0;
        var generation = 0;
        var disposed = false;
        var grants = new Map();
        var reservations = new WeakMap();

        function assertUsable() { if (disposed) { fail(ERROR_CODES.GRANT_STORE_DISPOSED, "DelegationGrantStore is disposed."); } }
        function safeNow() {
            var value;
            try { value = now(); } catch (error) { fail(ERROR_CODES.GRANT_STORE_CLOCK_UNAVAILABLE, "DelegationGrantStore clock is unavailable."); }
            if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) { fail(ERROR_CODES.GRANT_STORE_CLOCK_UNAVAILABLE, "DelegationGrantStore clock is unavailable."); }
            return value;
        }
        function nextGrantId() {
            var value;
            grantSerial += 1;
            try { value = idFactory ? idFactory("delegationGrant") : "delegation_grant_" + instanceId + "_" + grantSerial; }
            catch (error) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "DelegationGrantStore ID generation failed."); }
            if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]+$/.test(value) || value.length === 0 || grants.has(value)) { fail(ERROR_CODES.GRANT_STORE_ID_COLLISION, "DelegationGrantStore generated an invalid or duplicate grant ID."); }
            return value;
        }
        function recordSnapshot(record) {
            var remaining = record.grant.maxActions === null ? null : record.grant.maxActions - record.consumed - record.reserved;
            return planning.deepFreeze({
                grant: planning.snapshotDelegationGrant(record.grant),
                status: record.status,
                remainingActions: remaining,
                reservedActions: record.reserved,
                consumedActions: record.consumed,
                generation: record.generation
            });
        }
        function expireIfDue(record) {
            if (record.status === "active" && record.grant.expiresAt !== null && safeNow() >= record.grant.expiresAt) {
                record.status = "expired";
                record.generation += 1;
            }
            return record;
        }
        function recordFor(grantId) {
            assertUsable();
            if (typeof grantId !== "string" || !grants.has(grantId)) { fail(ERROR_CODES.GRANT_STORE_UNKNOWN_GRANT, "Delegation grant was not found."); }
            return expireIfDue(grants.get(grantId));
        }
        function activeRecord(grantId) {
            var record = recordFor(grantId);
            if (record.status === "revoked") { fail(ERROR_CODES.GRANT_STORE_GRANT_REVOKED, "Delegation grant is revoked."); }
            if (record.status === "expired") { fail(ERROR_CODES.GRANT_STORE_GRANT_EXPIRED, "Delegation grant is expired."); }
            if (record.status !== "active") { fail(ERROR_CODES.GRANT_STORE_UNKNOWN_GRANT, "Delegation grant is inactive."); }
            return record;
        }
        function normalizeSpec(spec, grantId) {
            var input = {};
            if (!isPlainObject(spec)) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "Delegation grant spec must be an object."); }
            Object.keys(spec).forEach(function (key) {
                if (SPEC_KEYS.indexOf(key) === -1) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "Delegation grant spec contains an unknown or caller-owned field: " + key); }
                input[key] = spec[key];
            });
            input.grantId = grantId;
            try { return planning.createDelegationGrant(input); }
            catch (error) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "Delegation grant spec does not satisfy the canonical contract."); }
        }
        function issue(spec) {
            assertUsable();
            var grantId = nextGrantId();
            var grant = normalizeSpec(spec, grantId);
            if (grant.expiresAt !== null && safeNow() >= grant.expiresAt) { fail(ERROR_CODES.GRANT_STORE_GRANT_EXPIRED, "Delegation grant cannot be issued after its expiry boundary."); }
            var record = { grant: grant, status: "active", generation: 0, reserved: 0, consumed: 0 };
            grants.set(grantId, record);
            return recordSnapshot(record);
        }
        function lookup(grantId) { return recordSnapshot(activeRecord(grantId)); }
        function listActive() {
            assertUsable();
            var result = [];
            grants.forEach(function (record) { expireIfDue(record); if (record.status === "active") { result.push(recordSnapshot(record)); } });
            return Object.freeze(result);
        }
        function getAuthorityView() {
            assertUsable();
            var evaluationTime = safeNow();
            var result = [];
            grants.forEach(function (record) {
                if (record.status === "active" && (record.grant.expiresAt === null || evaluationTime < record.grant.expiresAt)) { result.push(recordSnapshot(record)); }
            });
            return planning.deepFreeze({ evaluatedAt: evaluationTime, grants: result });
        }
        function revoke(grantId) {
            var record = recordFor(grantId);
            if (record.status === "expired") { fail(ERROR_CODES.GRANT_STORE_GRANT_EXPIRED, "Delegation grant is expired."); }
            if (record.status === "active") { record.status = "revoked"; record.generation += 1; }
            return recordSnapshot(record);
        }
        function reserve(grantId) {
            var record = activeRecord(grantId);
            if (record.grant.maxActions !== null && record.consumed + record.reserved >= record.grant.maxActions) { fail(ERROR_CODES.GRANT_STORE_BUDGET_EXHAUSTED, "Delegation grant action budget is exhausted."); }
            var handle = Object.freeze({});
            record.reserved += 1;
            reservations.set(handle, { grantId: grantId, storeGeneration: generation, grantGeneration: record.generation, status: "pending" });
            return handle;
        }
        function reservationRecord(handle) {
            assertUsable();
            if (!handle || (typeof handle !== "object" && typeof handle !== "function") || !reservations.has(handle)) { fail(ERROR_CODES.GRANT_STORE_INVALID_RESERVATION, "Delegation grant reservation is invalid."); }
            return reservations.get(handle);
        }
        function assertPending(reservation) {
            if (reservation.status !== "pending") { fail(ERROR_CODES.GRANT_STORE_RESERVATION_SETTLED, "Delegation grant reservation is already settled."); }
            if (reservation.storeGeneration !== generation) { fail(ERROR_CODES.GRANT_STORE_STALE_RESERVATION, "Delegation grant reservation belongs to a stale store generation."); }
        }
        function consume(handle) {
            var reservation = reservationRecord(handle);
            assertPending(reservation);
            var record = activeRecord(reservation.grantId);
            if (reservation.grantGeneration !== record.generation) {
                if (record.status === "revoked") { fail(ERROR_CODES.GRANT_STORE_GRANT_REVOKED, "Delegation grant is revoked."); }
                fail(ERROR_CODES.GRANT_STORE_STALE_RESERVATION, "Delegation grant reservation belongs to a stale grant generation.");
            }
            if (record.reserved < 1) { fail(ERROR_CODES.GRANT_STORE_STALE_RESERVATION, "Delegation grant reservation accounting is stale."); }
            record.reserved -= 1;
            record.consumed += 1;
            reservation.status = "consumed";
            return recordSnapshot(record);
        }
        function release(handle) {
            var reservation = reservationRecord(handle);
            assertPending(reservation);
            var record = grants.get(reservation.grantId);
            if (!record || reservation.grantGeneration !== record.generation) { fail(ERROR_CODES.GRANT_STORE_STALE_RESERVATION, "Delegation grant reservation belongs to a stale grant generation."); }
            if (record.reserved < 1) { fail(ERROR_CODES.GRANT_STORE_STALE_RESERVATION, "Delegation grant reservation accounting is stale."); }
            record.reserved -= 1;
            reservation.status = "released";
            return record.status === "active" ? recordSnapshot(record) : null;
        }
        function invalidateAll() {
            generation += 1;
            grants.clear();
        }
        function resetSession() { assertUsable(); invalidateAll(); return true; }
        function suspend() { assertUsable(); invalidateAll(); return true; }
        function dispose() { if (disposed) { return false; } invalidateAll(); disposed = true; return true; }

        var store = Object.freeze({
            dispose: dispose,
            getAuthorityView: getAuthorityView,
            issue: issue,
            listActive: listActive,
            lookup: lookup,
            release: release,
            reserve: reserve,
            resetSession: resetSession,
            revoke: revoke,
            suspend: suspend,
            consume: consume
        });
        trustedStores.set(store, { getEpoch: function () { return generation; } });
        return store;
    }

    return {
        ERROR_CODES: ERROR_CODES,
        GrantStoreError: GrantStoreError,
        MODULE_REVISION: MODULE_REVISION,
        createDelegationGrantStore: createDelegationGrantStore,
        isTrustedDelegationGrantStore: function (store) { return Boolean(store && trustedStores.has(store)); },
        getTrustedDelegationGrantStoreEpoch: function (store) {
            var identity = store && trustedStores.get(store);
            if (!identity) { fail(ERROR_CODES.GRANT_STORE_INVALID_SPEC, "DelegationGrantStore identity is invalid."); }
            return identity.getEpoch();
        }
    };
}));
