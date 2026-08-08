"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const style = fs.readFileSync(path.join(ROOT, "client", "css", "style.css"), "utf8");
const vela = fs.readFileSync(path.join(ROOT, "client", "css", "velaSurface.css"), "utf8");
const main = fs.readFileSync(path.join(ROOT, "client", "js", "main.js"), "utf8");

let assertions = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
    assertions += 1;
}

function rule(source, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
    return match ? match[1] : "";
}

try {
    assert(/--text-muted:\s*var\(--text-tertiary\);/.test(style), "text-muted must alias the established tertiary text token.");
    assert(/--surface-panel:\s*#0b0a08;/.test(style), "The shared panel surface token must preserve the audited color.");
    assert(/--text-on-accent:\s*#130f08;/.test(style), "The on-accent text token must preserve the audited color.");
    assert(/--action-primary-foreground:\s*var\(--text-on-accent\);/.test(style), "The primary-action foreground semantic must preserve the on-accent compatibility source.");
    assert(/--danger-border:\s*rgba\(255, 107, 95, 0\.34\);/.test(style), "The shared danger border token must preserve its existing value.");
    assert(/--danger-surface:\s*rgba\(255, 107, 95, 0\.06\);/.test(style), "The shared danger surface token must preserve its existing value.");
    assert(/--settings-divider-soft:\s*rgba\(214, 178, 94, 0\.085\);/.test(rule(style, ".settings-view")), "Settings must own its exact soft divider value.");

    [".view-detail", ".settings-view .settings-panel", ".settings-section", ".control-card", ".registry-color-picker-popover"].forEach((selector) => {
        assert(/background:\s*var\(--surface-panel\);/.test(rule(style, selector)), selector + " must consume the shared panel surface.");
    });
    assert(/\.primary-action\s*\{[^}]*color:\s*var\(--action-primary-foreground\);/.test(style), ".primary-action must consume the primary-action foreground semantic.");
    assert(/\.palette-editor-action-bar \.palette-library-action\.is-primary\s*\{[^}]*color:\s*var\(--action-primary-foreground\);/.test(style), "The Palette primary action must consume the primary-action foreground semantic.");
    assert(!/#0b0a08/.test([".view-detail", ".settings-view .settings-panel", ".settings-section", ".control-card", ".registry-color-picker-popover"].map((selector) => rule(style, selector)).join("\n")), "Contracted panel consumers must not repeat the surface literal.");
    assert(!/\.primary-action\s*\{[^}]*#130f08/.test(style) && !/\.palette-editor-action-bar \.palette-library-action\.is-primary\s*\{[^}]*#130f08/.test(style), "Contracted primary actions must not repeat the foreground literal.");

    assert(/\.settings-view\s*\{[\s\S]*?--ui-scale:\s*0\.92;/.test(style), "Settings must retain its fixed UI-scale isolation.");
    assert(/height:\s*var\(--vela-surface-height\);/.test(vela) && /data-layout="compact"/.test(vela) && /data-layout="narrow"/.test(vela), "Vela responsive and runtime geometry contracts must remain present.");
    assert(/\.registry-option-card\s*\{[\s\S]*?border:\s*1px solid var\(--border-default\)/.test(style) && /\.registry-option-card\.is-active\s*\{[\s\S]*?background:\s*var\(--interaction-selected-surface\)/.test(style), "Registry tabs must retain the established resting border and selected-state semantic contracts.");
    assert((main.match(/function applyThemeAccent\s*\(/g) || []).length === 1, "Theme Accent must retain one JS projection owner.");
    assert(!/--surface-panel|--text-on-accent|--text-muted/.test(main), "Static semantic tokens must not create a second JS projection path.");

    console.log("PASS UI token contract: " + assertions + " assertions.");
} catch (error) {
    console.error("FAIL UI token contract - " + error.message);
    process.exitCode = 1;
}
