(function (root, factory) {
    "use strict";
    var MODULE_NAME = "VelaHostReadSerializer";
    var browserPage = !!(root && root.self === root && root["win" + "dow"] === root);
    var exported = Object.freeze(factory());
    if (browserPage && !Object.prototype.hasOwnProperty.call(root, MODULE_NAME)) {
        Object.defineProperty(root, MODULE_NAME, { configurable: false, enumerable: true, value: exported, writable: false });
    } else if (typeof module === "object" && module.exports) { module.exports = exported; }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";
    var tail = Promise.resolve();
    function enqueue(task, mayStart) {
        var operation = tail.then(function () {
            if (typeof mayStart === "function" && !mayStart()) {
                var error = new Error("CAPABILITY_RESULT_DISCARDED"); error.code = "CAPABILITY_RESULT_DISCARDED"; throw error;
            }
            return task();
        });
        tail = operation.then(function () {}, function () {});
        return operation;
    }
    return Object.freeze({ MODULE_REVISION: "vela-host-read-serializer-0.3.4-v1", enqueue: enqueue });
}));
