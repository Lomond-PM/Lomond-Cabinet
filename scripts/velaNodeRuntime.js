"use strict";

const crypto = require("crypto");

module.exports = Object.freeze({
    utf8ByteLength: (text) => Buffer.byteLength(text, "utf8"),
    sha256Hex: (utf8Text) => crypto.createHash("sha256").update(utf8Text, "utf8").digest("hex"),
    randomId: (kind) => String(kind || "") + "_" + crypto.randomBytes(32).toString("hex"),
    now: () => Date.now()
});
