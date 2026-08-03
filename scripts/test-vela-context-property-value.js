#!/usr/bin/env node
"use strict";

const assert = require("assert");
const vm = require("vm");
const protocolModule = require("../client/js/vela/velaProtocol");
const contextModule = require("../client/js/vela/velaContext");
const runtime = require("./velaNodeRuntime");

const protocol = protocolModule.createProtocol(runtime);
const context = contextModule.createContextApi(protocol);
let assertions = 0;

function check(value, message) { assert.ok(value, message); assertions += 1; }
function expectCode(callback, code, message) { assert.throws(callback, error => error && error.code === code, message); assertions += 1; }

function run() {
    const vectors = [[0, "0"], [1, "1e0"], [-1, "-1e0"], [0.1, "1.0000000000000001e-1"], [-0.1, "-1.0000000000000001e-1"], [1.5, "1.5e0"], [1000000, "1e6"], [0.000001, "9.9999999999999995e-7"]];
    vectors.forEach(([value, expected]) => check(context.canonicalNumberV1(value) === expected, "Canonical number vector must be stable for " + value + "."));
    const digestVectors = [
        ["null", null, "sha256:cf44a989e5a2bf84b89f8d576ad6a8490aa625b485bbb97ed02b95697da96252"],
        ["boolean", true, "sha256:b90bdd2d9f2c0fd9d7778b23f45c4dc27ed8d3fd43ae79c6f3c1e0a6dda77f61"],
        ["boolean", false, "sha256:f0b853b6bb4efd7958e2b39c6309bf622e7de978b28aeddcfd313b5936b54560"],
        ["number", 0, "sha256:5cc2dce0f8175fdddc21847211d6ca1114efb2da3bb3d6ee61add6291d874491"],
        ["number", 0.1, "sha256:256b6f530be16d2db140057b9a7e6a12be6d9203617e9a12f50a8d35dc608e90"],
        ["number", 1000000, "sha256:e78941441847f5332a1e8f9c3bd8ed6bb2f1835795d576cc8b7ea41f7390f7d3"],
        ["number-array", [0, 1], "sha256:873ae9b5e7e8ac19bc8416a34ebbaec606b6268e46ba27e52b7d2aac52bdb47a"],
        ["number-array", [0.1, -0.1, 1.5], "sha256:16702604fbd2b6c5ec2d34f53eeaf7a58e567f342950144299999ceb99dc1aa3"],
        ["string", "", "sha256:3cb265d1c7be37cd24b5ddb7af562d30a4ccb2c556eab6e751b09d73ce09d412"],
        ["string", "A B", "sha256:d73ef58418421315b131c4cbefb023f00220be1142ac32d6b0978e48dc810984"],
        ["string", "line1\nline2", "sha256:ef9d63fa99637bc92b7e8fe2eef03eb6480bdc92f97f1dc5c6a8d91ecff8633a"],
        ["string", "line1\r\nline2", "sha256:972474f22b3bf026ecc9c0522a661597277f2f7c32d915665c55e010e76182ba"],
        ["string", "é", "sha256:7f55781d712c2c44fd954b860d3eb503d5e13b5ce869ef3677673e5aa5821209"],
        ["string", "e\u0301", "sha256:208b76688303922564f81424055a977adb574fe64c596045e9e34204623db483"],
        ["string", "🙂", "sha256:851f5bca9196365adb00b42c4749060f91e9df29f698bcc1d902b9c1bb6b4b84"]
    ];
    digestVectors.forEach(([kind, value, expected]) => check(context.digestPropertyValue(kind, value) === expected, "Property value digest vector must be exact for " + kind + "."));
    const exactPreimageVectors = [
        ["null", null, "null", 4, "76656c612d70726f70657274792d76616c75652d7631006e756c6c0034006e756c6c", "sha256:cf44a989e5a2bf84b89f8d576ad6a8490aa625b485bbb97ed02b95697da96252"],
        ["number", 1, "1e0", 3, "76656c612d70726f70657274792d76616c75652d7631006e756d626572003300316530", "sha256:78b705ccb28aeea603937fca34e5f319565952d1658faf3e3cfa857aa7439f5c"],
        ["number-array", [0, 1], "v1\0" + "2\0" + "1\0" + "0\0" + "3\0" + "1e0", 14, "76656c612d70726f70657274792d76616c75652d7631006e756d6265722d6172726179003134007631003200310030003300316530", "sha256:873ae9b5e7e8ac19bc8416a34ebbaec606b6268e46ba27e52b7d2aac52bdb47a"],
        ["string", "line1\r\nline2", "line1\r\nline2", 12, "76656c612d70726f70657274792d76616c75652d763100737472696e67003132006c696e65310d0a6c696e6532", "sha256:972474f22b3bf026ecc9c0522a661597277f2f7c32d915665c55e010e76182ba"]
    ];
    exactPreimageVectors.forEach(([kind, value, expectedPayload, expectedBytes, expectedHex, expectedDigest]) => {
        const normalized = context.normalizePropertyValue(value);
        const payload = kind === "null" ? "null" : kind === "boolean" ? (normalized.data ? "1" : "0") : kind === "number-array" ? "v1\0" + normalized.data.length + normalized.data.map(item => "\0" + protocol.utf8ByteLength(item) + "\0" + item).join("") : normalized.data;
        const preimage = "vela-property-value-v1\0" + kind + "\0" + protocol.utf8ByteLength(payload) + "\0" + payload;
        const hex = Buffer.from(preimage, "utf8").toString("hex");
        check(payload === expectedPayload && protocol.utf8ByteLength(payload) === expectedBytes && hex === expectedHex && context.digestPropertyValue(kind, value) === expectedDigest, "Fixed preimage vectors must remain compatible with the CEP probe contract.");
    });
    [-0, NaN, Infinity, -Infinity, 1000000.1].forEach(value => expectCode(() => context.canonicalNumberV1(value), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Invalid property number must reject."));
    [null, true, false, 1, "", "A B", "line1\nline2", "line1\r\nline2", "é", "e\u0301", "🙂", [0], [0, 1, 1.5, -0.1]].forEach(value => check(context.normalizePropertyValue(value).kind, "Allowed primitive property value must normalize."));
    expectCode(() => context.normalizePropertyValue([0, 1, 2, 3, 4]), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Five value array items must reject.");
    const sparse = []; sparse[1] = 1;
    expectCode(() => context.normalizePropertyValue(sparse), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Sparse value array must reject.");
    const extra = [1]; extra.extra = true;
    expectCode(() => context.normalizePropertyValue(extra), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Value array with an extra property must reject.");
    expectCode(() => context.normalizePropertyValue([[1]]), protocol.ERROR_CODES.PARAM_OUT_OF_RANGE, "Nested value arrays must reject.");
    expectCode(() => context.normalizePropertyValue({ value: 1 }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Host and plain objects must reject.");
    expectCode(() => context.normalizePropertyValue("\uD800"), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Unpaired string surrogate must reject.");
    check(context.digestPropertyValue("string", "A B") !== context.digestPropertyValue("string", "A  B"), "Property digest must preserve exact spaces.");
    check(context.digestPropertyValue("string", "line1\nline2") !== context.digestPropertyValue("string", "line1\r\nline2"), "Property digest must preserve exact line endings.");
    check(context.digestPropertyValue("string", "é") !== context.digestPropertyValue("string", "e\u0301"), "Property digest must not NFC-normalize strings.");
    check(context.digestPropertyValue("number-array", [0, 1]) !== context.digestPropertyValue("number-array", [0, 1, 0]), "Property digest must bind array length.");
    check(context.digestPropertyValue("number", 1) !== context.digestPropertyValue("string", "1e0"), "Property digest must domain-separate kinds.");
    check(/^sha256:[a-f0-9]{64}$/.test(context.digestPropertyValue("string", "🙂")), "Property digest must use the fixed sha256 format.");
    const browser = vm.createContext({ input: [0, 1, -1, 0.1, -0.1, 1.5, 1000000, 0.000001], output: null });
    vm.runInContext("output=input.map(function(n){return n.toExponential(16);});", browser);
    check(JSON.stringify(browser.output) === JSON.stringify(browser.input.map(n => n.toExponential(16))), "Node and isolated V8 must agree on the frozen exponential vectors.");
    const target = context.normalizePropertyValueTarget({ targetOrdinal: 0, nativeLayerId: 1, layerIndex: 1, propertyPath: ["named", "ADBE Position", 0], propertyMatchName: "ADBE Position", value: { kind: "number", data: 50 } });
    check(Object.isFrozen(target) && target.value.kind === "number", "Normalized property value targets must be frozen and bounded.");
    expectCode(() => context.normalizePropertyValueTarget({ targetOrdinal: 0, nativeLayerId: 1, layerIndex: 1, propertyPath: ["named", "ADBE Position", 0], propertyMatchName: "ADBE Position", value: { kind: "number", data: 1 }, raw: true }), protocol.ERROR_CODES.SCHEMA_VALIDATION_FAILED, "Property value targets must reject unknown fields.");
    console.log("PASS Vela context property value: " + assertions + " assertions.");
}

try { run(); }
catch (error) { console.error("FAIL Vela context property value - " + error.message + "\n" + (error.stack || "")); process.exitCode = 1; }
