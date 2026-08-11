(function (global) {
    "use strict";

    function create(options) {
        var active = {};
        var generation = 0;
        var scheduleFrame = options && options.requestAnimationFrame || global.requestAnimationFrame || function (callback) { return global.setTimeout(callback, 16); };
        var cancelFrame = options && options.cancelAnimationFrame || global.cancelAnimationFrame || global.clearTimeout;
        var shouldReduceMotion = options && options.shouldReduceMotion;

        function run(key, contract) {
            var previous = active[key];
            var cleanups = [];
            var frames = [];
            var settled = false;
            var id = ++generation;
            var resolveFinished;
            var finished = typeof Promise === "function" ? new Promise(function (resolve) { resolveFinished = resolve; }) : null;
            var transaction;

            if (previous) {
                if (contract && contract.startWhileRunning === "reject") { return previous; }
                previous.cancel("replaced");
            }

            function isCurrent() { return active[key] === transaction && transaction.id === id; }
            function cleanup() {
                var fn;
                while (frames.length) { cancelFrame(frames.pop()); }
                while (cleanups.length) {
                    fn = cleanups.pop();
                    try { fn(); } catch (ignored) {}
                }
            }
            function settle(status, reason) {
                if (settled) { return; }
                settled = true;
                cleanup();
                if (active[key] === transaction) { delete active[key]; }
                if (resolveFinished) { resolveFinished({ status: status, reason: reason || null }); }
            }

            transaction = {
                id: id,
                key: key,
                finished: finished,
                isCurrent: isCurrent,
                guard: function (callback) {
                    return function () { if (isCurrent() && !settled) { return callback.apply(null, arguments); } };
                },
                addCleanup: function (callback) { if (typeof callback === "function") { cleanups.push(callback); } return transaction; },
                nextFrame: function (callback) {
                    var frame = scheduleFrame(transaction.guard(callback));
                    frames.push(frame);
                    return frame;
                },
                complete: function () { if (isCurrent()) { settle("completed"); } },
                cancel: function (reason) { settle("cancelled", reason); }
            };
            active[key] = transaction;
            if (contract && typeof shouldReduceMotion === "function" && shouldReduceMotion() && typeof contract.finalizeReducedMotion === "function") {
                contract.finalizeReducedMotion(transaction);
                transaction.complete();
            } else if (contract && typeof contract.run === "function") {
                contract.run(transaction);
            }
            return transaction;
        }

        return Object.freeze({
            run: run,
            cancel: function (key, reason) { if (active[key]) { active[key].cancel(reason); return true; } return false; },
            handleResize: function (key, policy) {
                var transaction = active[key];
                if (!transaction || typeof policy !== "function") { return false; }
                policy(transaction);
                return true;
            },
            current: function (key) { return active[key] || null; }
        });
    }

    global.CoreMotion = Object.freeze({ create: create });
}(window));
