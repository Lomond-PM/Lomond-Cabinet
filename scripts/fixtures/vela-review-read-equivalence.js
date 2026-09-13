"use strict";
const assert = require("assert");
// Reconcile only F's removed current-selection display read. All other Host payloads stay exact.
function reconcile(current, historical) {
    const prior = historical.slice();
    let removed = 0;
    for (let index=0; index<prior.length-1; index++) {
        const a=prior[index], b=prior[index+1];
        if (a.operation === "captureContext" && a.scope.purpose === "binding" && a.scope.selectionOrderMeaningful === false && b.operation === "capturePropertyValues") {
            assert.strictEqual(b.scope.purpose,"binding");
            assert.strictEqual(b.scope.targets.length,1);
            assert.deepStrictEqual(b.scope.targets[0].propertyPath,["named","ADBE Transform Group",0,"named","ADBE Opacity",0]);
            prior.splice(index,2); removed+=2; index--;
        }
    }
    assert.strictEqual(historical.length-current.length,removed,"exactly the obsolete display pair is removed");
    // Opaque entropy allocations move when a request pair is removed; keep every semantic field.
    return [current.map(({requestId,...r})=>r),prior.map(({requestId,...r})=>r)];
}
// Compare opaque request correlations by first occurrence, preserving all alias relationships.
// Only the deterministic fixture's request IDs vary after removal of the display reads.
function normalizeRequestCorrelations(value) {
    const ids = new Map();
    return JSON.stringify(value).replace(/req_[0-9a-f]{32}/g, id => {
        if (!ids.has(id)) ids.set(id, "fixture_request_" + ids.size);
        return ids.get(id);
    });
}
module.exports={reconcile,normalizeRequestCorrelations};
